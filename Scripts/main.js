function makeEditorActive(workspace, editor) {
	const applescript = `
tell application "System Events" to tell process "Nova"
	set frontmost to true
	tell menu "Window" of menu bar 1
		set theSepCount to 0
		set correctWorkspace to false
		set theIndex to 0
		repeat with theItem in every menu item
			set theIndex to theIndex + 1
			if not (exists name of theItem) then
				set theSepCount to theSepCount + 1
				set checkedWorkspace to false
			else if theSepCount >= 5 then
				if not checkedWorkspace then
					set correctWorkspace to (name of theItem = "${nova.path.basename(workspace.path)}")
					set checkedWorkspace to true
				else if correctWorkspace then
					if name of theItem is "${nova.path.basename(editor.document.path)}" then
						click menu item theIndex
						exit repeat
					end if
				end if
			end if
		end repeat
	end tell
end tell
	`;
	let options = {args: [], stdio: "ignore"};
	for (const line of applescript.split("\n")) {
		const trimmed = line.trim();
		if (trimmed != "") options.args.push("-e", trimmed);
	}
	
	let p = new Process("/usr/bin/osascript", options);
	p.start();
}

class MyData {
  constructor() {
    this.skim_preview = null;
    this.issues = new IssueCollection();
  }
  
  dispose() {
    if (this.skim_preview != null) {
      this.skim_preview.navigate.terminate();
    }
  }
  
  previewNotify(title, msg) {
    this.previewNotifyDismiss();
    const req = new NotificationRequest("org.flyx.tex.preview");
    req.title = nova.localize(title);
    req.body = nova.localize(msg);
    nova.notifications.add(req);
  }
  
  previewNotifyDismiss() {
    nova.notifications.cancel("org.flyx.tex.preview");
  }
}

function displaySkimSetup() {
	nova.workspace.showInformativeMessage("This extension allows you to use the Skim PDF viewer to continuously preview your PDF. If you want to use backwards navigation (from PDF to source), you need to tell Skim how to communicate with Nova. To do this, setup Skim's Sync settings as follows:\n\nPreset: Custom\nCommand: /bin/sh\nArguments: \"" + nova.path.join(nova.extension.path, "Scripts", "navigate_source.sh") + "\" \"%file\" %line\n\nHeads up: Nova currently lacks an API for setting the active editor. Therefore, navigation uses AppleScript to do so. The first time you're using this feature, macOS will prompt you to enable Nova.app to use Accessibility features in the Security & Privacy System Preferences. If you don't do this, navigation cannot activate the editor containing the source file to which you want to navigate.\n\nThis message is displayed once when installing TeX Suite or updating to >= v0.3.0, and can later be accessed via the Extensions menu.");
}

var my_data;

exports.activate = function() {
  console.log("Loading TeX Suite");
  my_data = new MyData();
  nova.subscriptions.add(my_data);
	const storage = nova.extension.globalStoragePath;
	if (nova.fs.stat(storage) == null) {
		nova.fs.mkdir(storage);
	}
	const indicator = nova.path.join(storage, "seen_skim_note.ind");
	if (nova.fs.stat(indicator) == null) {
		const file = nova.fs.open(indicator, "w");
		file.close();
		displaySkimSetup();
	}
}

exports.deactivate = function() {
  console.log("Unloading TeX Suite");
  nova.subscriptions.remove(my_data);
}

nova.commands.register("org.flyx.tex.skim-setup", (workspace) => {
	displaySkimSetup();
});

class SkimPreview {
	constructor(tmp_dir, processor, source_path, workspace) {
		this.source_path = source_path;
		this.workspace = workspace;
		this.tmp_dir = tmp_dir;
		this.processor = processor;
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
				});
			} else {
				let range = target_editor.getLineRangeForRange(new Range(0, 0));
				for (let i = 1; i < line_num; ++i) {
					range = target_editor.getLineRangeForRange(new Range(range.end, range.end));
				}
				target_editor.selectedRange = range;
				target_editor.scrollToCursorPosition();
				makeEditorActive(this.workspace, target_editor);
			}
		});
		this.navigate.onStderr((line) => {
			console.log("cb err: " + line.trim());
		});
    this.navigate.onDidExit((status) => {
      my_data.skim_preview = null;
    })
		this.navigate.start();
	}
	
	action() {
		return new TaskProcessAction("/bin/sh", {
			args: [nova.path.join(nova.extension.path, "Scripts", "skim_preview.sh"), this.tmp_dir]
		});
	}
}

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

function latexmkWithPreview(tmp_dir, processor, source_file, first) {
  if (my_data.skim_preview.opened) {
    my_data.previewNotify("updating document with latexmk…", "I'll notify you when I'm ready");
  } else {
    my_data.previewNotify("creating document with latexmk…", "Document will open when ready, please wait…");
  }
	let latexmk_proc = new ProcWrapper("/bin/sh", {
		args: [nova.path.join(nova.extension.path, "Scripts", "run_latexmk.sh"), tmp_dir, processor, source_file]
	});
  let refer_to_path = null;
	latexmk_proc.onStderr((line) => {
    let str = line.trim();
    if (str.startsWith("Refer to '")) {
      refer_to_path = str.substr(10, str.lastIndexOf("'") - 10);
    }
  });
	latexmk_proc.onDidExit((status) => {
		if (status == 0) {
			if (!my_data.skim_preview.opened) {
				let activate = new Process("/usr/bin/osascript", {
					args: ["-e", 'tell application "Skim" to activate']
				});
				activate.start();
				my_data.skim_preview.opened = true;
        my_data.previewNotifyDismiss();
			} else {
        my_data.previewNotify("Document ready", "Latexmk updated the document");
      }
      console.log("latexmk successful!");
		} else if (refer_to_path != null) {
      console.log("latexmk failed, see log " + refer_to_path);
      const log = nova.fs.open(refer_to_path);
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
      my_data.issues.clear();
      for (const [path, issue_list] of Object.entries(issues)) {
				console.log("issues exist for " + path);
				if (nova.path.isAbsolute(path)) {
          my_data.issues.set(encodeURI(`file://${path}`), issue_list);
				} else {
					my_data.issues.set(encodeURI(`file://${nova.path.join(my_data.skim_preview.workspace.path, path)}`), issue_list);
				}
      }
      my_data.previewNotify("Latexmk encountered problems", "See the Issues Sidebar for the list of errors");
		} else {
      console.warn("latexmk failed, but gave no path to a log file!");
      my_data.previewNotify("Latexmk failed unexpectedly", "no error log available (this should not happen)");
    }
	});
	latexmk_proc.start();
	// ensure latexmk_proc is not garbage collected before it ends
	nova.subscriptions.add(latexmk_proc);
}

nova.assistants.registerIssueAssistant(["tex", "latex"], {
	provideIssues: function(editor) {
		if (my_data.skim_preview == null) return [];
		const skim_preview = my_data.skim_preview;
		latexmkWithPreview(skim_preview.tmp_dir, skim_preview.processor, skim_preview.source_path,
                       skim_preview.opened);
    return [];
	}
}, {event: "onSave"});

function setupTmpDir() {
	return new Promise((resolve, reject) => {
		let setup = new Process("/bin/sh", {
			args: [nova.path.join(nova.extension.path, "Scripts", "tmp_setup.sh")]
		});
		let tmp_dir = null;
		setup.onStdout((line) => {
			if (tmp_dir == null) {
				tmp_dir = line.trim();
				console.log("running latexmk preview in tmp dir: " + tmp_dir);
			}
		});
		setup.onDidExit((status) => {
			if (status == 0 && tmp_dir != null) resolve(tmp_dir);
			else reject("unable to create temporary directory");
		});
		setup.start();
	});
}

nova.assistants.registerTaskAssistant({
	provideTasks: function() { return null; },
	resolveTaskAction: function(context) {		
		if (context.action == "run") {
			const processor = context.config.get("tex.latex.processor") || "";
			const mainfile = context.config.get("tex.latex.mainfile") || "";
			const my_workspace = nova.workspace;
			return setupTmpDir().then((tmp_dir) => {
				my_data.skim_preview = new SkimPreview(tmp_dir, processor, mainfile, my_workspace);
        latexmkWithPreview(my_data.skim_preview.tmp_dir, my_data.skim_preview.processor, my_data.skim_preview.source_path,
           my_data.skim_preview.opened);
				return my_data.skim_preview.action();
			});
		}
	}
}, {identifier: "org.flyx.tex.tasks"});