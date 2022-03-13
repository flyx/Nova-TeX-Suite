exports.activate = () => {
	console.log("activiting TeX Suite");
}
exports.deactivate = () => {
	console.log("deactiviting TeX Suite");
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
nova.commands.register('org.flyx.tex.getFilenameWithoutExt', (workspace) => nova.path.splitext(workspace.activeTextEditor.document.path)[0]);

function findTool(name, config_name, get_dir) {
	let msg = "searching path for tool " + name + "… ";
	return new Promise((resolve, reject) => {
		let path = nova.workspace.config.get(config_name);
		if (path) {
			msg += "found at workspace config: ";
		} else {
			path = nova.config.get(config_name);
			if (path) {
				msg += "found at global config: ";
			} else {
				let p = new Process("/bin/bash", {
					args: [nova.path.join(nova.extension.path, "Scripts", "find_tool.sh"), name]
				});
				p.start();
				p.onStdout((line) => {
					path = get_dir ? nova.path.dirname(line.trim()) : line.trim();
				});
				p.onDidExit((status) => {
					if (status == 0) {
						console.log(msg + "found by probing shell: " + path);
						resolve(path);
					}
					else reject("could not find tool `" + name + "` in your PATH! configure its location in your workspace or global preferences.");
				});
				return;
			}
		}
		console.log(msg + path);
		resolve(path);
	});
}

class LatexTaskProvider {
	static identifier = "org.flyx.tex.latex.tasks";
	
	static reload() {
		nova.workspace.reloadTasks(this.identifier);
	}
	
	constructor() {
		nova.config.onDidChange("org.flyx.tex.paths.skim", LatexTaskProvider.reload, this);
		nova.config.onDidChange("org.flyx.tex.paths.latex", LatexTaskProvider.reload, this);
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
			args: LatexTaskProvider.latexmkOpts("$(Config:org.flyx.tex.latex.engine)", "$File"),
		}));
		task.setAction(Task.Clean, new TaskProcessAction(this.latexmk, {
			args: LatexTaskProvider.latexmkOpts("$(Config:org.flyx.tex.latex.engine)", "-c", "$File"),
		}));
		if (this.displayline) {
			task.setAction(Task.Run, new TaskProcessAction(this.displayline, {
				args: [
					"$LineNumber",
					"$FileDirname/${Command:org.flyx.tex.getFilenameWithoutExt}.pdf",
					"$File"
				],
			}));
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
							"do '" + rc_file + "'; foreach (@default_files) { print \"$_ \"; }"
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
								task.setAction(Task.Run, new TaskProcessAction(this.displayline, {
									args: [
										"$LineNumber",
										value,
										key
									]
								}));
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
				return new TaskProcessAction(this.displayline, {
					args: [
						"$LineNumber",
						nova.path.splitext(mainfile)[0] + ".pdf",
						"$File"
					],
				});
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

class ContextTaskProvider {
	static identifier = "org.flyx.tex.context.tasks";
		
	static reload() {
		nova.workspace.reloadTasks(this.identifier);
	}
	
	constructor() {
		nova.config.onDidChange("org.flyx.tex.paths.skim", ContextTaskProvider.reload, this);
		nova.config.onDidChange("org.flyx.tex.paths.context", ContextTaskProvider.reload, this);
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
			task.setAction(Task.Run, new TaskProcessAction(this.displayline, {
				args: [
					"$LineNumber",
					"$FileDirname/${Command:org.flyx.tex.getFilenameWithoutExt}.pdf",
					"$File"
				],
			}));
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
				return new TaskProcessAction(this.displayline, {
					args: [
						"$LineNumber",
						nova.path.splitext(mainfile)[0] + ".pdf",
						"$File"
					],
				});
			} else {
				console.error("Cannot go to PDF: Skim not found");
			}
		}
	}
}

nova.assistants.registerTaskAssistant(new ContextTaskProvider(), {
	identifier: ContextTaskProvider.identifier
});