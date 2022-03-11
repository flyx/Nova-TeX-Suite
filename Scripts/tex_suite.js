// this module is the data singleton of the TeX Suite extension.

module.exports = {
	activate: function() {
		console.log("Activating TeX Suite");
		nova.config.onDidChange('org.flyx.tex.paths.context', this.reload, this);
		this.reload();
	},
	deactivate: function() {
		console.log("Unloading TeX Suite");
	},
	
	findTool: function(name, config_name, get_dir) {
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
	},
	
	reload: function() {
		this.findTool("context", "org.flyx.tex.paths.context", true).then((path) => {
			this.context = path;
		});
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
}