let langservers = {
	latex: null,
	context: null,
};

exports.activate = () => {
	console.log("activiting TeX Suite");
	langservers.latex = new TexLanguageServer("latex", "texlab");
	langservers.context = new TexLanguageServer("context", "digestif");
}
exports.deactivate = () => {
	console.log("deactiviting TeX Suite");
	if (langservers.latex) {
		langservers.latex.deactivate();
		langservers.latex = null;
	}
	if (langservers.context) {
		langservers.context.deactivate();
		langservers.context = null;
	}
}

function wrapWith(latex, context) {
	return function(editor) {
		let start = editor.document.syntax == "latex" ? latex : context;
		let selectedRanges = editor.selectedRanges.reverse();
		editor.edit((e) => {
			for (const range of selectedRanges) {
				e.replace(range, start + editor.getTextInRange(range) + "}");
			}
		});
	};
}

nova.commands.register("org.flyx.tex.emph", wrapWith("\\emph{", "{\\em "));
nova.commands.register("org.flyx.tex.bold", wrapWith("\\textbf{", "{\\bf "));
nova.commands.register('org.flyx.tex.getFilenameWithoutExt',
	(workspace) => {
		let path = workspace.activeTextEditor?.document.path;
		if (typeof path === 'string') {
			const lastIndexOfSlash = path.lastIndexOf('/');
			const indexOfExt = path.indexOf('.', lastIndexOfSlash);
			if (indexOfExt > lastIndexOfSlash + 1) {
				path = path.substring(0, indexOfExt);
			}
		}
		return path;
	}
);

function findTool(name, config_name, get_dir) {
	let msg = `searching path for tool ${name} …`;
	return new Promise((resolve, reject) => {
		let path = nova.workspace.config.get(config_name);
		if (path) {
			msg += "found at workspace config: ";
		} else {
			path = nova.config.get(config_name);
			if (path) {
				msg += "found at global config: ";
			} else {
				let p = new Process("/usr/bin/env", {
					args: ["which", name],
					shell: true
				});
				p.start();
				p.onStdout((line) => {
					path = get_dir ? nova.path.dirname(line.trim()) : line.trim();
				});
				p.onDidExit((status) => {
					if (status == 0) {
						console.log(`${msg} found by probing shell: ${path}`);
						resolve(path);
					}
					else reject(`could not find tool '${name}' in your PATH! configure its location in your workspace or global preferences.`);
				});
				return;
			}
		}
		console.log(msg + path);
		resolve(path);
	});
}

function displayLine(path, pdf) {
	const args = [];
	if (nova.config.get("org.flyx.tex.skim.revert")) {
		args.push("-revert");
	}
	if (nova.config.get("org.flyx.tex.skim.background")) {
		args.push("-background");
	}
	args.push("$LineNumber", pdf, "$File");
	args.push(pdf)
	return new TaskProcessAction(path, {args: args});
}

class LatexTaskProvider {
	static identifier = "org.flyx.tex.latex.tasks";
	
	constructor() {
		nova.config.onDidChange("org.flyx.tex.paths.skim", this.reload, this);
		nova.config.onDidChange("org.flyx.tex.paths.latex", this.reload, this);
		nova.fs.watch("latexmkrc", () => this.reload());
		nova.fs.watch(".latexmkrc", () => this.reload());
		this.reload();
	}
	
	reload() {
		const dlpath = nova.path.join(nova.config.get("org.flyx.tex.paths.skim"), "/Contents/SharedSupport/displayline");
		this.displayline = nova.fs.stat(dlpath) ? dlpath : null;
		findTool("latexmk", "org.flyx.tex.paths.latex", false).then((path) => {
			this.latexmk = path;
			nova.workspace.reloadTasks(LatexTaskProvider.identifier);
		});
	}
	
	static latexmkOpts(...additional) {
		return [
			"-interaction=nonstopmode",
			"-synctex=1",
			"-cd",
			...additional
		];
	}
	
	genericLatexmkTask() {
		const task = new Task("Current LaTeX File");
		task.setAction(Task.Build, new TaskProcessAction(this.latexmk, {
			args: LatexTaskProvider.latexmkOpts(
				"$(Config:org.flyx.tex.latex.engine)", "$File"),
		}));
		task.setAction(Task.Clean, new TaskProcessAction(this.latexmk, {
			args: LatexTaskProvider.latexmkOpts(
				"$(Config:org.flyx.tex.latex.engine)", "-c", "$File"),
		}));
		if (this.displayline) {
			task.setAction(Task.Run, displayLine(
				this.displayline, "${Command:org.flyx.tex.getFilenameWithoutExt}.pdf"));
		}
		return task;
	}
	
	static findRcFile() {
		let rc_path = nova.path.join(nova.workspace.path, "latexmkrc");
		let stat = nova.fs.stat(rc_path);
		if (stat == null) {
			rc_path = nova.path.join(nova.workspace.path, ".latexmkrc");
			stat = nova.fs.stat(rc_path);
		}
		if (stat != null) {
			if (!stat.isFile()) {
				console.error("[.]latexmkrc in workspace is not a file!");
				return null;
			}
			return rc_path;
		}
		return null;
	}
	
	provideTasks() {
		if (!this.latexmk) return null;
		const rc_file = LatexTaskProvider.findRcFile();
		let task = null;
		if (rc_file != null) {
			const content = nova.fs.open(rc_file);
			let line;
			let defines_files = false;
			while (line = content.readline()) {
				if (line.includes("@default_files")) {
					defines_files = true;
					break;
				}
			}
			content.close();
			if (defines_files) {
				return new Promise((resolve, reject) => {
					const proc = new Process("/usr/bin/perl", {
						args: [
							"-e",
							`do '${rc_file}'; foreach (@default_files) { print \"$_ \"; }`
						],
						cwd: nova.workspace.path
					});
					let defined_files = {};
					proc.onStdout((line) => {
						for (const name of line.trim().split(" ")) {
							defined_files[name] = name.replace(/\.tex$/, ".pdf");
						}
					});
					proc.onStderr((line) => console.log("perl error:", line));
					proc.onDidExit((status) => {
						let tasks = [];
						for (const [key, value] of Object.entries(defined_files)) {
							let task = new Task(value);
							task.setAction(Task.Build, new TaskProcessAction(this.latexmk, {
								args: LatexTaskProvider.latexmkOpts("-r", rc_file, key)
							}));
							task.setAction(Task.Clean, new TaskProcessAction(this.latexmk, {
								args: LatexTaskProvider.latexmkOpts("-c", "-r", rc_file, key)
							}));
							if (this.displayline) {
								task.setAction(Task.Run, displayLine(this.displayline, value));
							}
							tasks.push(task);
						}
						resolve(tasks.length > 0 ? tasks : [this.genericLatexmkTask()]);
					});
					proc.start();
				});
			}
		}
		return [this.genericLatexmkTask()];
	}
	
	resolveTaskAction(context) {
		const mainfile = context.config.get("org.flyx.tex.latex.mainfile");
		const options = context.config.get("org.flyx.tex.latex.latexmk-options");
		if (context.action == Task.Build) {
			return new TaskProcessAction(this.latexmk, {
				args: ["-synctex=1", "-cd", ...options, mainfile]
			});
		} else if (context.action == Task.Run) {
			if (this.displayline) {
				return displayLine(this.displayline, nova.path.splitext(mainfile)[0] + ".pdf");
			} else {
				console.error("Cannot go to PDF: Skim not found");
			}
		} else if (context.action == Task.Clean) {
			return new TaskProcessAction(this.latexmk, {
				args: ["-c", mainfile]
			});
		}
	}
}

nova.assistants.registerTaskAssistant(new LatexTaskProvider(), {
	identifier: LatexTaskProvider.identifier
});

class TexLanguageServer {
	constructor(language, default_server) {
		this.identifier = `org.flyx.tex.${language}.server`;
		this.config_name = `org.flyx.tex.paths.${language}.server`;
		this.default_server = default_server;
		this.language = language;
		// Observe the configuration setting for the server's location, and restart the server on change
		nova.config.observe(this.config_name, function(path) {
			this.start(path);
		}, this);
	}
		
	deactivate() {
		this.stop();
	}
		
	start() {
		if (this.languageClient) {
				this.languageClient.stop();
				nova.subscriptions.remove(this.languageClient);
		}
		
		findTool(this.default_server, this.config_name, false).then((path) => {
			// Create the client
			var serverOptions = {
				path: path,
				args: ["-v"]
			};
			var clientOptions = {
				// The set of document syntaxes for which the server is valid
				syntaxes: [this.language]
			};
			var client = new LanguageClient(
				`org.flyx.tex.${this.language}`,
				"LaTeX Language Server",
				serverOptions,
				clientOptions
			);
			
			try {
				console.log(`starting '${this.language}' language server`);
				// Start the client
				client.start();
				
				// Add the client to the subscriptions to be cleaned up
				nova.subscriptions.add(client);
				this.languageClient = client;
			} catch (err) {
				// If the .start() method throws, it's likely because the path to the language server is invalid
				if (nova.inDevMode()) {
						console.error(err);
				}
			}
		});
	}
		
	stop() {
		if (this.languageClient) {
			this.languageClient.stop();
			nova.subscriptions.remove(this.languageClient);
			this.languageClient = null;
		}
	}
}

class ContextTaskProvider {
	static identifier = "org.flyx.tex.context.tasks";
	
	constructor() {
		nova.config.onDidChange("org.flyx.tex.paths.skim", this.reload, this);
		nova.config.onDidChange("org.flyx.tex.paths.context", this.reload, this);
		this.reload();
	}
	
	reload() {
		const dlpath = nova.path.join(nova.config.get("org.flyx.tex.paths.skim"), "/Contents/SharedSupport/displayline");
		this.displayline = nova.fs.stat(dlpath) ? dlpath : null;
		findTool("context", "org.flyx.tex.paths.context", false).then((path) => {
			this.context = path;
			nova.workspace.reloadTasks(ContextTaskProvider.identifier);
		});
	}
	
	genericContextTask() {
		const task = new Task("Current ConTeXt File");
		task.setAction(Task.Build, new TaskProcessAction(this.context, {
			args: ["--synctex", "$File"],
		}));
		if (this.displayline) {
			task.setAction(Task.Run, displayLine(this.displayline, "${Command:org.flyx.tex.getFilenameWithoutExt}.pdf"));
		}
		return task;
	}
	
	provideTasks() {
		if (!this.context) return null;
		return [this.genericContextTask()];
	}
	
	resolveTaskAction(context) {
		const mainfile = context.config.get("org.flyx.tex.context.mainfile");
		if (context.action == Task.Build) {
			return new TaskProcessAction(this.context, {
				args: ["--synctex", mainfile]
			});
		} else if (context.action == Task.Run) {
			if (this.displayline) {
				return displayLine(this.displayline, nova.path.splitext(mainfile)[0] + ".pdf");
			} else {
				console.error("Cannot go to PDF: Skim not found");
			}
		}
	}
}

nova.assistants.registerTaskAssistant(new ContextTaskProvider(), {
	identifier: ContextTaskProvider.identifier
});