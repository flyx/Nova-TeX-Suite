// this module implements calls to the latexmk utility.

const applescript = require("applescript.js");
const tex_suite = require("tex_suite.js");

class ProcWrapper {
	constructor(name, options) {
		this.proc = new Process(name, options);
	}
	start() {this.proc.start();}
	onStdout(f) {this.proc.onStdout(f);}
	onStderr(f) {this.proc.onStderr(f);}
	onDidExit(f) {this.proc.onDidExit(f);}
	dispose() {this.proc.terminate();}
}

// parse LaTeX issues from the LaTeX output given at log_path.
function parseIssues(log_path, working_dir, preview_mode) {
	if (!nova.path.isAbsolute(log_path)) log_path = nova.path.join(working_dir, log_path);
	const log = nova.fs.open(log_path);
	const regex = /^([^\s:]+):(\d+):\s+(.*)$/;
	let cur_issue = null;
	let cur_issue_path = null;
	let cur_issue_prefix = null;
	let cur_issue_empty_lines = 0;
	let issues = {};
	let line;
	while (line = log.readline()) {
		if (cur_issue == null) {
			const found = line.trim().match(regex);
			if (found != null) {
				cur_issue = new Issue();
				cur_issue.message = found[3];
				cur_issue.severity = IssueSeverity.Error;
				cur_issue.line = parseInt(found[2], 10);
				cur_issue.column = 1;
				cur_issue_path = nova.path.normalize(found[1]);
				cur_issue_prefix = `(${nova.path.splitext(nova.path.basename(found[1]))[0]})`;
				cur_issue_empty_lines = 0;
			}
		} else if (line.startsWith(cur_issue_prefix)) {
			const content = line.substr(cur_issue_prefix.length).trim();
			if (content.length == 0) cur_issue_empty_lines++;
			else {
				if (cur_issue_empty_lines == 0) {
					cur_issue.message = cur_issue.message.concat(" ", content);
				} else {
					cur_issue.message = cur_issue.message.concat("\n".repeat(cur_issue_empty_lines), content);
				}
				cur_issue_empty_lines = 0;
			}
		} else {
			if (cur_issue_path in issues) {
				issues[cur_issue_path].push(cur_issue);
			} else {
				issues[cur_issue_path] = [cur_issue];
			}
			cur_issue = null;
		}
	}
	log.close();
	for (const [path, issue_list] of Object.entries(issues)) {
		console.log("issues exist for " + path);
		if (nova.path.isAbsolute(path)) {
			tex_suite.issues.set(encodeURI(`file://${path}`), issue_list);
		} else if (preview_mode) {
			tex_suite.issues.set(encodeURI(`file://${nova.path.join(tex_suite.getSkimPreview().workspace.path, path)}`), issue_list);
		} else {
			tex_suite.issues.set(encodeURI(`file://${nova.path.join(working_dir, path)}`), issue_list);
		}
	}
}

class Latexmk {
	constructor(working_dir, processor, source_file) {
		this.working_dir = working_dir;
		this.processor = processor;
		this.source_file = source_file;
	}
	
	// environment must be either "workspace", "preview" or a path to the RC file to inject.
	run(environment) {
		tex_suite.issues.clear();
		return new Promise((resolve, reject) => {
			const preview_mode = environment != "workspace";
			const skim_preview = tex_suite.getSkimPreview();
			if (preview_mode) {
				if (skim_preview.opened) {
					tex_suite.previewNotify("updating document with latexmk…", "I'll notify you when I'm ready");
				} else {
					tex_suite.previewNotify("creating document with latexmk…", "Document will open when ready, please wait…");
				}
			}
			let latexmk_proc = new ProcWrapper("/bin/sh", {
				args: [nova.path.join(nova.extension.path, "Scripts", "run_latexmk.sh"), this.working_dir,
				       environment, this.processor, this.source_file],
				cwd: nova.workspace.path
			});
			let refer_to_path = null;
			latexmk_proc.onStderr((line) => {
				let str = line.trim();
				if (str.startsWith("Refer to '")) {
					refer_to_path = str.substr(10, str.lastIndexOf("'") - 10);
				}
			});
			latexmk_proc.onDidExit((status) => {
				nova.subscriptions.remove(latexmk_proc);
				if (status == 0) {
					if (preview_mode) {
						if (!skim_preview.opened) {
							applescript.activateApp("Skim");
							skim_preview.opened = true;
							tex_suite.previewNotifyDismiss();
						} else {
							tex_suite.previewNotify("Document ready", "Latexmk updated the document");
						}
					}
					console.log("latexmk successful!");
					resolve(null);
				} else if (refer_to_path != null) {
					console.log("latexmk failed, see log " + refer_to_path);
					parseIssues(refer_to_path, this.working_dir, preview_mode);
					tex_suite.previewNotify("Latexmk encountered problems", "See the Issues Sidebar for the list of errors");
					reject(refer_to_path);
				} else {
					console.warn("latexmk failed, but gave no path to a log file!");
					tex_suite.previewNotify("Latexmk failed unexpectedly", "no error log available (this should not happen)");
					reject(null);
				}
			});
			latexmk_proc.start();
			// ensure latexmk_proc is not garbage collected before it ends
			nova.subscriptions.add(latexmk_proc);
		});
	}
}

exports.Latexmk = Latexmk;