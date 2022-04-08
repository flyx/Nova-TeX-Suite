let langservers = {
	latex: null,
	context: null,
};

function resetLangServer(enabled) {
	if (enabled) {
		if (!langservers[this].enabled) {
			langservers[this].enabled = true;
			langservers[this].start();
		}
	} else if (langservers[this].enabled) {
		langservers[this].enabled = false;
		langservers[this].stop();
	}
}

function enableConfigCallback() {
	resetLangServer.call(this);
	nova.workspace.reloadTasks(TexTaskProvider.identifier);
}

exports.activate = () => {
	console.log("Activating TeX Suite");
	for (const lang of ["latex", "context"]) {
		langservers[lang] = new TexLanguageServer(lang);
		nova.workspace.config.onDidChange(`org.flyx.tex.${lang}.enable`, enableConfigCallback, lang);
		resetLangServer.call(lang, nova.config.get(`org.flyx.tex.${lang}.enable`));
	}
}
exports.deactivate = () => {
	console.log("Deactivating TeX Suite");
	for (const lang of ["latex", "context"]) {
		if (langservers[lang]) {
			langservers[lang].deactivate();
			langservers[lang] = null;
		}
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
nova.commands.register("org.flyx.tex.getFilenameWithoutExt",
	(context) => {
		let editor = TextEditor.isTextEditor(context) ? context : context.activeTextEditor;
		return nova.path.splitext(editor.document.path)[0];
	}
);
nova.commands.register("org.flyx.tex.paths.latexmk.get", (context) => {
	let ws = nova.workspace.config.get("org.flyx.tex.paths.latexmk");
	if (ws == "") ws = nova.config.get("org.flyx.tex.paths.latexmk");
	return ws;
});

nova.commands.register("org.flyx.tex.paths.context.get", (context) => {
	let ws = nova.workspace.config.get("org.flyx.tex.paths.context");
	if (ws == "") ws = nova.config.get("org.flyx.tex.paths.context");
	return ws;
});

function displayLine(pdf) {
	const args = ["${Config:org.flyx.tex.paths.skim}/Contents/SharedSupport/displayline"];
	if (nova.config.get("org.flyx.tex.skim.revert")) {
		args.push("-revert");
	}
	if (nova.config.get("org.flyx.tex.skim.background")) {
		args.push("-background");
	}
	args.push("$LineNumber", pdf, "$File");
	args.push(pdf)
	return new TaskProcessAction("/usr/bin/env", {args: args});
}

class TexTaskProvider {
	static identifier = "org.flyx.tex.tasks";
	
	static latexmkTask(...options) {
		return new TaskProcessAction("/usr/bin/env", {
			args: [
				"${Command:org.flyx.tex.paths.latexmk.get}",
				"-interaction=nonstopmode",
				"-synctex=1",
				"-cd",
				...options
			]
		});
	}
	
	static contextTask(...options) {
		return new TaskProcessAction("/usr/bin/env", {
			args: [
				"${Command:org.flyx.tex.paths.context.get}",
				"--synctex",
				...options
			]
		});
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
	
	constructor() {
		nova.fs.watch("latexmkrc", () => this.reload());
		nova.fs.watch(".latexmkrc", () => this.reload());
	}
	
	reload() {
		nova.workspace.reloadTasks(TexTaskProvider.identifier);
	}
	
	genericLatexmkTask(has_rcfile) {
		const task = new Task("Current LaTeX File");
		if (has_rcfile) {
			task.setAction(Task.Build, TexTaskProvider.latexmkTask("$File"));
			task.setAction(Task.Clean, TexTaskProvider.latexmkTask("-c", "$File"));
		} else {
			task.setAction(Task.Build, TexTaskProvider.latexmkTask(
				"${Config:org.flyx.tex.latex.engine}", "$File"));
			task.setAction(Task.Clean, TexTaskProvider.latexmkTask(
				"${Config:org.flyx.tex.latex.engine}", "-c", "$File"));
		}
		task.setAction(Task.Run, displayLine(
			"$FileDirname/${Command:org.flyx.tex.getFilenameWithoutExt}.pdf"));
		return task;
	}
	
	genericContextTask() {
		const task = new Task("Current ConTeXt File");
		task.setAction(Task.Build, TexTaskProvider.contextTask("$File"));
		task.setAction(Task.Run, displayLine(
			"$FileDirname/${Command:org.flyx.tex.getFilenameWithoutExt}.pdf"));
		return task;
	}
	
	provideTasks() {
		let tasks = [];
		let latex_enabled = nova.workspace.config.get("org.flyx.tex.latex.enable");
		if (latex_enabled) {
			tasks.push(this.genericLatexmkTask());
		}
		if (nova.workspace.config.get("org.flyx.tex.context.enable")) {
			tasks.push(this.genericContextTask());
		}
		
		const rc_file = latex_enabled ? TexTaskProvider.findRcFile() : null;
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
						for (const [key, value] of Object.entries(defined_files)) {
							let task = new Task(value);
							task.setAction(Task.Build, TexTaskProvider.latexmkTask(
								"-r", rc_file, key));
							task.setAction(Task.Clean, TexTaskProvider.latexmkTask(
								"-c", "-r", rc_file, key));
							task.setAction(Task.Run, displayLine(value));
							tasks.push(task);
						}
						resolve(tasks);
					});
					proc.start();
				});
			}
		}
		return tasks;
	}
	
	resolveTaskAction(context) {
		if (context.data == "latex") {
			const mainfile = context.config.get("org.flyx.tex.latex.mainfile");
			const options = context.config.get("org.flyx.tex.latex.latexmk-options");
			if (context.action == Task.Build) {
				return TexTaskProvider.latexmkTask(...options, mainfile);
			} else if (context.action == Task.Run) {
				return displayLine(nova.path.join(nova.path.dirname(mainfile), nova.path.splitext(mainfile)[0]) + ".pdf");
			} else if (context.action == Task.Clean) {
				return TexTaskProvider.latexmkTask("-c", mainfile);
			}
		} else {
			const mainfile = context.config.get("org.flyx.tex.context.mainfile");
			if (context.action == Task.Build) {
				return TexTaskProvider.contextTask("--synctex", mainfile);
			} else if (context.action == Task.Run) {
				return displayLine(nova.path.join(nova.path.dirname(mainfile), nova.path.splitext(mainfile)[0]) + ".pdf");
			}
		}
	}
}

nova.assistants.registerTaskAssistant(new TexTaskProvider(), {
	identifier: TexTaskProvider.identifier,
	name: "Tex Suite",
});

class TexLanguageServer {
	constructor(language) {
		this.identifier = `org.flyx.tex.${language}.server`;
		this.config_name = `org.flyx.tex.paths.${language}.server`;
		this.language = language;
		this.enabled = false;
		// Observe the configuration setting for the server's location, and restart the server on change
		nova.config.onDidChange(this.config_name, function(path) {
			if (this.enabled) this.start();
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
		const path = nova.config.get(this.config_name);
		const proc = new Process("/usr/bin/which", {
			args: [path]
		});
		let abs_path = null;
		proc.onStdout((line) => {
			abs_path = line.trim();
		});
		proc.onDidExit((status) => {
			if (status == 0) {
				var serverOptions = {
					path: abs_path,
					args: [],
				};
				var clientOptions = {
					// The set of document syntaxes for which the server is valid
					syntaxes: [this.language]
				};
				var client = new LanguageClient(
					`org.flyx.tex.${this.language}`,
					path,
					serverOptions,
					clientOptions
				);
				
				try {
					client.start();
					if (nova.inDevMode()) console.log(`[${this.language}] started language server`);
					
					// Add the client to the subscriptions to be cleaned up
					nova.subscriptions.add(client);
					this.languageClient = client;
				} catch (err) {
					console.error(`[${this.language}] while trying to start ${abs_path}:`, err)
				}
			} else {
				console.warn(`[${this.language}] unable to find language server in PATH:`, path);
			}
		});
		proc.start();
	}
		
	stop() {
		if (this.languageClient) {
			this.languageClient.stop();
			nova.subscriptions.remove(this.languageClient);
			this.languageClient = null;
			if (nova.inDevMode()) console.log(`[${this.language}] stopped language server`);
		}
	}
}