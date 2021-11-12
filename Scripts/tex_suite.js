// this module is the data singleton of the TeX Suite extension.

const state = {
	skim_preview: null,
	
	dispose: function() {
		if (this.skim_preview != null) {
			this.skim_preview.navigate.terminate();
		}
	}
};

function findTool(name, config_name, get_dir) {
	return new Promise((resolve, reject) => {
		let path = nova.workspace.config[config_name];
		if (!path) {
			path = nova.config[config_name];
			if (!path) {
				let p = new Process("/bin/bash", {
					args: [nova.path.join(nova.extension.path, "Scripts", "find_tool.sh"), name]
				});
				p.start();
				p.onStdout((line) => {
					path = get_dir ? nova.path.dirname(line.trim()) : line.trim();
				});
				p.onDidExit((status) => {
					if (status == 0) resolve(path);
					else reject("could not find tool `" + name + "` in your PATH! configure its location in your workspace or global preferences.");
				});
				return;
			}
		}
		resolve(path);
	});
}

module.exports = {
	displaySkimSetup: function() {
		nova.workspace.showInformativeMessage(`
This extension allows you to use the Skim PDF viewer to continuously preview \
your PDF. If you want to use backwards navigation (from PDF to source), you \
need to tell Skim how to communicate with Nova. To do this, setup Skim's Sync \
settings as follows:

Preset: Custom
Command: /bin/sh
Arguments: "${nova.path.join(nova.extension.path, "Scripts", "navigate_source.sh")}" "%file" %line

Heads up: Nova currently lacks an API for setting the active editor. \
Therefore, navigation uses AppleScript to do so. The first time you're using \
this feature, macOS will prompt you to enable Nova.app to use Accessibility \
features in the Security & Privacy System Preferences. If you don't do this, \
navigation cannot activate the editor containing the source file to which you \
want to navigate.

This message is displayed once when installing TeX Suite \
or updating to >= v0.3.0, and can later be accessed via the Extensions menu.`);
	},
	
	activate: function() {
		console.log("Activating TeX Suite");
		nova.subscriptions.add(state);
		const storage = nova.extension.globalStoragePath;
		if (nova.fs.stat(storage) == null) {
			nova.fs.mkdir(storage);
		}
		const indicator = nova.path.join(storage, "seen_skim_note.ind");
		if (nova.fs.stat(indicator) == null) {
			const file = nova.fs.open(indicator, "w");
			file.close();
			this.displaySkimSetup();
		}
	},
	deactivate: function() {
		console.log("Unloading TeX Suite");
		nova.subscriptions.remove(state);
	},
	
	latexPath: function() {
		return findTool("latexmk", "org.flyx.tex.paths.latex", true);
	},
	
	contextPath: function() {
		return findTool("context", "org.flyx.tex.paths.context", false);
	},
	
	previewNotify: function(title, msg) {
		this.previewNotifyDismiss();
		const req = new NotificationRequest("org.flyx.tex.preview");
		req.title = nova.localize(title);
		req.body = nova.localize(msg);
		nova.notifications.add(req);
	},
	
	previewNotifyDismiss: function() {
		nova.notifications.cancel("org.flyx.tex.preview");
	},
	
	setSkimPreview: function(value) {
		state.skim_preview = value;
	},
	
	getSkimPreview: function() {
		return state.skim_preview;
	},
	
	issues: new IssueCollection()
}