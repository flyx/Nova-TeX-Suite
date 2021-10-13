// this module implements things via AppleScript that cannot be done via Nova's API.

function run(source) {
	let options = {args: [], stdio: "ignore"};
	for (const line of source.split("\n")) {
		const trimmed = line.trim();
		if (trimmed != "") options.args.push("-e", trimmed);
	}
	
	return new Promise((resolve, reject) => {
		let p = new Process("/usr/bin/osascript", options);
		p.start();
		p.onDidExit((status) => {
			if (status == 0) resolve(null);
			else reject(null);
		});
	});
}

// Nova's API does not provide a function to make an editor active.
// this AppleScript implements this by going through the Window menu
// and clicking the appropriate entry.
exports.makeEditorActive = function(workspace, editor) {
	return run(`
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
end tell`);
}

exports.openIssues = function() {
	return run(`
tell application "System Events" to tell process "Nova"
	click menu item "Show Issues Sidebar" of menu 1 of menu item "Sidebars" of menu "View" of menu bar 1
end tell
`);
}

// bring the given app to the foreground.
exports.activateApp = function(name) {
	return run(`tell application "${name}" to activate`);
}