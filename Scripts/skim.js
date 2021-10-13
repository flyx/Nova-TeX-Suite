// this module implements running Skim as PDF preview tool.
// it implements navigating from Skim back into the source code via SyncTeX.

const applescript = require("applescript.js");
const tex_suite = require("tex_suite.js");

function gotoLine(editor, line) {
	let range = editor.getLineRangeForRange(new Range(0, 0));
	for (let i = 1; i < line; ++i) {
		range = editor.getLineRangeForRange(new Range(range.end, range.end));
	}
	editor.selectedRange = range;
	editor.scrollToCursorPosition();
}

class Preview {
	constructor(tmp_dir, generator, workspace) {
		this.generator = generator;
		this.workspace = workspace;
		this.tmp_dir = tmp_dir;
		this.opened = false;
		this.navigate = new Process("/bin/cat", {
			args: [nova.path.join(tmp_dir, "nova_in.fifo")]
		});
		this.navigate.onStdout((line) => {
			const [path, line_str] = line.split(" ");
			const normalized_path = nova.path.normalize(path);
			const line_num = parseInt(line_str, 10);
			console.log("navigating to file " + normalized_path + ", line " + line_str);
			let target_editor = null;
			for (const editor of this.workspace.textEditors) {
				if (editor.document.path == normalized_path) {
					target_editor = editor;
					break;
				}
			}
			if (target_editor == null) {
				this.workspace.openFile(path, {"line": line_num}).then((editor) => {
					if (editor != null) {
						editor.selectedRange = editor.getLineRangeForRange(editor.selectedRange);
					}
					applescript.activateApp("Nova");
				});
			} else {
				if (this.workspace.activeTextEditor == target_editor) {
					gotoLine(target_editor, line_num);
					applescript.activateApp("Nova");
				} else {
					applescript.makeEditorActive(this.workspace, target_editor).then(() => {
						gotoLine(target_editor, line_num);
					});
				}
			}
		});
		this.navigate.onStderr((line) => {
			console.log("cb err: " + line.trim());
		});
		this.navigate.onDidExit((status) => {
			tex_suite.setSkimPreview(null);
		})
		this.navigate.start();
		tex_suite.setSkimPreview(this);
	}
	
	action() {
		return new TaskProcessAction("/bin/sh", {
			args: [nova.path.join(nova.extension.path, "Scripts", "skim_preview.sh"), this.tmp_dir]
		});
	}
	
	regenerate() {
		this.generator.run("preview");
	}
}

exports.Preview = Preview;

exports.setupTmpDir = function() {
	return new Promise((resolve, reject) => {
		let setup = new Process("/bin/sh", {
			args: [nova.path.join(nova.extension.path, "Scripts", "tmp_setup.sh")]
		});
		let tmp_dir = null;
		setup.onStdout((line) => {
			if (tmp_dir == null) {
				tmp_dir = line.trim();
				console.log("running preview in tmp dir: " + tmp_dir);
			}
		});
		setup.onDidExit((status) => {
			if (status == 0 && tmp_dir != null) resolve(tmp_dir);
			else reject("unable to create temporary directory");
		});
		setup.start();
	});
}