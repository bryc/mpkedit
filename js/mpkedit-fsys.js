(function fsys(MPKEdit) {
	function fsys() {}
	MPKEdit.fsys = new fsys();

	var writeDone = function(Entry, event) {
		if(event.loaded === 32768) {
			State.Entry = Entry;
			State.filename = Entry.name;
			App.updateUI();
			console.log(1213535)
		}
	};

	var writeFile = function(data, Entry) {
		if(chrome.runtime.lastError) {
			return false;
		}
		Entry.createWriter(function(writer) {
			writer.onwriteend = writeDone.bind(this, Entry);
			writer.write(new Blob([new Uint8Array(data)]));
		});
	};

	fsys.prototype.saveFile = function(data, Entry) {
		chrome.fileSystem.getWritableEntry(
			Entry, writeFile.bind(this, data)
		);
	};

	fsys.prototype.saveFileAs = function(data, filename) {
		chrome.fileSystem.chooseEntry({
			type: "saveFile",
			suggestedName: filename
		}, writeFile.bind(this, data));
	};

	fsys.prototype.loadFile = function() {
		chrome.fileSystem.chooseEntry({
			type: "openFile"
		}, function(Entry) {
			if(chrome.runtime.lastError) {
				return false;
			}

			Entry.file(function(fl) {
				var reader = new FileReader();
				MPKEdit.App.tmpEntry = Entry;
				reader.onload = MPKEdit.Parser.bind(this, fl.name);
				reader.readAsArrayBuffer(fl.slice(0, 36928));
			});
		});
	};

	console.log("INFO: MPKEdit.fsys ready");
}(MPKEdit));
