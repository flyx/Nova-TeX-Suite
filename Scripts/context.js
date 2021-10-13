// this module implements calls to context for
// building ConTeXt documents.

const applescript = require("applescript.js");
const tex_suite = require("tex_suite.js");
const ProcWrapper = require("helpers.js").ProcWrapper;

class Context {
	constructor(working_dir, source_file) {
		this.working_dir = working_dir;
		this.source_file = nova.path.isAbsolute(source_file) ? source_file : nova.path.join(nova.workspace.path, source_file);
		console.log(`Context("${working_dir}", "${source_file}")`);
	}
	
	run(environment) {
		tex_suite.issues.clear();
		return new Promise((resolve, reject) => {
			const preview_mode = environment != "workspace";
			const skim_preview = tex_suite.getSkimPreview();
			if (preview_mode) {
				if (skim_preview.opened) {
					tex_suite.previewNotify("updating document with context…", "I'll notify you when I'm ready");
				} else {
					tex_suite.previewNotify("creating document with context…", "Document will open when ready, please wait…");
				}
			}
			let context_proc = new ProcWrapper("/bin/sh", {
				args: [nova.path.join(nova.extension.path, "Scripts", "run_context.sh"), this.working_dir,
							 environment, this.source_file],
				cwd: nova.workspace.path
			});
			let issues = {};
			context_proc.onStdout((line) => {
				if (line.startsWith("tex error")) {
					const content = line.substr(line.indexOf(">") + 1).trim();
					const found = content.match(/^tex error on line (\d+) in file ([^:]+):\s+(.*)$/);
					if (found != null) {
						let cur_issue = new Issue();
						cur_issue.message = found[3];
						cur_issue.severity = IssueSeverity.Error;
						cur_issue.line = parseInt(found[1], 10);
						cur_issue.column = 1;
						let cur_issue_path = nova.path.normalize(found[2]);
						if (cur_issue_path in issues) {
							issues[cur_issue_path].push(cur_issue);
						} else {
							issues[cur_issue_path] = [cur_issue];
						}
					}
				}
			});
			context_proc.onStderr((line) => console.log(line));
			context_proc.onDidExit((status) => {
				nova.subscriptions.remove(context_proc);
				if (status == 0) {
					if (preview_mode) {
						if (!skim_preview.opened) {
							applescript.activateApp("Skim");
							skim_preview.opened = true;
							tex_suite.previewNotifyDismiss();
						} else {
							tex_suite.previewNotify("Document ready", "context updated the document");
						}
					}
					console.log("context successful!");
					resolve(null);
				} else {
					console.warn("context failed.");
					for (const [path, issue_list] of Object.entries(issues)) {
						console.log("issues exist for " + path);
						if (nova.path.isAbsolute(path)) {
							tex_suite.issues.set(encodeURI(`file://${path}`), issue_list);
						} else if (preview_mode) {
							tex_suite.issues.set(encodeURI(`file://${nova.path.join(tex_suite.getSkimPreview().workspace.path, path)}`), issue_list);
						} else {
							tex_suite.issues.set(encodeURI(`file://${nova.path.join(this.working_dir, path)}`), issue_list);
						}
					}
					tex_suite.previewNotify("context failed", "see Issues Sidebar for problems");
					reject(nova.path.join(this.working_dir, nova.path.splitext(nova.path.basename(this.source_file))[0] + ".log"));
				}
			});
			context_proc.start();
			// ensure latexmk_proc is not garbage collected before it ends
			nova.subscriptions.add(context_proc);
		});
	}
}

exports.Context = Context;