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

nova.assistants.registerIssueAssistant(["tex", "latex", "context"], {
	provideIssues: function(editor) {
		const skim_preview = tex_suite.getSkimPreview();
		if (skim_preview == null) return [];
		skim_preview.regenerate();
    return [];
	}
}, {event: "onSave"});

function findRcFile() {
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
	provideTasks: function() {
		const rc_file = findRcFile();
		if (rc_file != null) {
			let task = new Task("latexmkrc");
			task.setAction(Task.Build, new TaskResolvableAction({data: "latexmkrc"}));
			task.setAction(Task.Run, new TaskResolvableAction({data: "latexmkrc"}));
			task.setAction(Task.Clean, Latexmk.cleanProcess());
			return [task];
		}
		return null;
	},
	resolveTaskAction: function(context) {
		const processor = context.config ? (context.config.get("tex.latex.processor") || "") : "";
		const mainfile = context.config ? (context.config.get("tex.latex.mainfile") || "") : "";
		console.log("processor=" + processor + ", mainfile=" + mainfile + ", context=");
		console.log(context.config);
		if (context.action == Task.Build) {
			let latexmk = new Latexmk(nova.workspace.path, processor, mainfile);
			return latexmk.run("workspace").then(() => {
				return new TaskProcessAction("/usr/bin/true", {args: []});
			}).catch((msg) => handleError(msg));
		} else if (context.action == Task.Run) {
			const my_workspace = nova.workspace;
			return skim.setupTmpDir().then((tmp_dir) => {
				const skim_preview = new skim.Preview(tmp_dir, new Latexmk(tmp_dir, processor, mainfile), my_workspace);
				skim_preview.regenerate();
				return skim_preview.action();
			});
		} else if (context.action == Task.Clean) {
			return Latexmk.cleanProcess();
		}
	}
}, {identifier: "org.flyx.tex.tasks.latexmk"});

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