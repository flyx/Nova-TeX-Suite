// this modules implements common helpers.

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

exports.ProcWrapper = ProcWrapper;