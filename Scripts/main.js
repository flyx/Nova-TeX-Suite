const tex_suite = require("tex_suite.js");
const applescript = require("applescript.js");
const Latexmk = require("latexmk.js").Latexmk;
const Context = require("context.js").Context;
const skim = require("skim.js");

exports.activate = () => tex_suite.activate();
exports.deactivate = () => tex_suite.deactivate();

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

nova.commands.register("org.flyx.tex.skim-setup", (workspace) => tex_suite.displaySkimSetup());
nova.commands.register("org.flyx.tex.emph", wrapWith("\\emph{", "{\\em "));
nova.commands.register("org.flyx.tex.bold", wrapWith("\\textbf{", "{\\bf "));

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
		tex_suite.findTool("latexmk", "org.flyx.tex.paths.latex", false).then((path) => {
			console.log("setting latexmk to " + path);
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
}

nova.assistants.registerTaskAssistant(new LatexTaskProvider(), {
	identifier: LatexTaskProvider.identifier
});

nova.commands.register('org.flyx.tex.getFilenameWithoutExt', (workspace) => nova.path.splitext(workspace.activeTextEditor.document.path)[0]);

function handleError(msg) {
	if (msg == null) return null; // should never happen
	args = [nova.path.join(nova.extension.path, "Scripts", "dump_and_fail.sh"), msg];
	if (msg.endsWith(".log")) {
		args.push("print_log");
	}
	return new TaskProcessAction("/bin/sh", {
		args: args
	});
}

nova.assistants.registerTaskAssistant({
	provideTasks: function() { return null; },
	resolveTaskAction: function(context) {
		const mainfile = context.config.get("tex.context.mainfile") || "";
		if (context.action == Task.Build) {
			let contextGenerator = new Context(nova.workspace.path, mainfile);
			return contextGenerator.run("workspace").then(() => {
				return new TaskProcessAction("/usr/bin/true", {args: []});
			}).catch((msg) => handleError(msg));
		} else if (context.action == Task.Run) {
			const my_workspace = nova.workspace;
			return skim.setupTmpDir().then((tmp_dir) => {
				const skim_preview = new skim.Preview(tmp_dir, new Context(tmp_dir, mainfile), my_workspace);
				skim_preview.regenerate();
				return skim_preview.action();
			});
		} else if (context.action == Task.Clean) {
			return Context.cleanProcess();
		}
	}
}, {identifier: "org.flyx.tex.tasks.context"});