const tex_suite = require("tex_suite.js");
const applescript = require("applescript.js");
const Latexmk = require("latexmk.js").Latexmk;
const skim = require("skim.js");

exports.activate = () => tex_suite.activate();
exports.deactivate = () => tex_suite.deactivate();

nova.commands.register("org.flyx.tex.skim-setup", (workspace) => tex_suite.displaySkimSetup());

nova.assistants.registerIssueAssistant(["tex", "latex"], {
	provideIssues: function(editor) {
		const skim_preview = tex_suite.getSkimPreview();
		if (skim_preview == null) return [];
		const latexmk = new Latexmk(skim_preview.tmp_dir, skim_preview.processor, skim_preview.source_path);
		latexmk.run(true);
    return [];
	}
}, {event: "onSave"});

nova.assistants.registerTaskAssistant({
	provideTasks: function() {
		let stat = nova.fs.stat(nova.path.join(nova.workspace.path, "latexmkrc"));
		if (stat == null) stat = nova.fs.stat(nova.path.join(nova.workspace.path, ".latexmkrc"));
		if (stat != null) {
			if (stat.isFile()) {
				let task = new Task("latexmkrc");
				
			} else {
				console.error("[.]latexmkrc in workspace is not a file!");
			}
		}
		return null;
	},
	resolveTaskAction: function(context) {
		const processor = context.config.get("tex.latex.processor") || "";
		const mainfile = context.config.get("tex.latex.mainfile") || "";
		if (context.action == "build") {
			let latexmk = new Latexmk(nova.workspace.path, processor, mainfile);
			return latexmk.run(false).then(() => {
				return new TaskProcessAction("/usr/bin/true", {args: []});
			}).catch((log_file) => {
				if (log_file == null) return null; // should never happen
				return new TaskProcessAction("/bin/sh", {
					args: [nova.path.join(nova.extension.path, "Scripts", "dump_and_fail.sh"), log_file]
				});
			});
		} else if (context.action == "run") {
			const my_workspace = nova.workspace;
			return skim.setupTmpDir().then((tmp_dir) => {
				const skim_preview = new skim.Preview(tmp_dir, processor, mainfile, my_workspace);
				const latexmk = new Latexmk(tmp_dir, processor, mainfile);
				latexmk.run(true);
				return skim_preview.action();
			});
		}
	}
}, {identifier: "org.flyx.tex.tasks"});