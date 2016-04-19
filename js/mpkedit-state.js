(function MPKState() {
	var MPKState = function() {};
	var State = new MPKState();
	MPKEdit.State = State;

	MPKState.prototype.init = function() {
		function writeAt(offset) {
			for(var i = 0; i < 7; i++) {
				data[offset + i] = bytes[i];
			}
		}

		var data = new Uint8Array(32768);

		var bytes = [1, 1, 0, 1, 1, 254, 241];	
		writeAt(57);
		writeAt(121);
		writeAt(153);
		writeAt(217);

		for(var i = 5; i < 128; i++) {
			data[256 + i * 2 + 1] = 3;
			data[512 + i * 2 + 1] = 3;
		}

		data[257] = 113;
		data[513] = 113;

		MPKEdit.Parser(data, "New.mpk");
	};

	MPKState.prototype.insert = function(data) {
		var tmpdata = new Uint8Array(State.data);

		var noteData = data.subarray(0, 32);
		var pageData = data.subarray(32);
		var pageCount = pageData.length / 256;
		var newPages = State.usedPages + pageCount;
	
		if(newPages <= 123 && State.usedNotes < 16){
			var freeIndexes = [];
			for(var i = 0xA; i < 0x100; i += 2) {
				if(freeIndexes.length === pageCount) {
					break;
				}
				if(tmpdata[0x100 + i + 1] === 3) {
					freeIndexes.push(i / 2);
				}
			}
	
			noteData[0x06] = 0;
			noteData[0x07] = freeIndexes[0];
	
			for(var i = 0; i < freeIndexes.length; i++) {
				var target1 = 0x100 + (2 * freeIndexes[i] + 1);
				var target2 = 0x100 * freeIndexes[i];
	
				if(i === freeIndexes.length - 1) {
					tmpdata[target1] = 0x01;
				}
				else {
					tmpdata[target1] = freeIndexes[i + 1];
				}
	
				for(var j = 0; j < 0x100; j++) {
					tmpdata[target2 + j] = pageData[0x100 * i + j];
				}
			}
	
			for(var i = 0; i < 16; i++) {
				if(State.NoteTable[i] === undefined) {
					var target = 0x300 + i * 32;
					for(var j = 0; j < 32; j++) {
						tmpdata[target + j] = noteData[j];
					}
					break;
				}
			}
	
			MPKEdit.Parser(tmpdata);
		}
	};

	MPKState.prototype.erase = function(id) {
		var tmpdata = new Uint8Array(State.data);
		var indexes = State.NoteTable[id].indexes;

		for(var i = 0, offset; i < indexes.length; i++) {
			offset = 0x100 + (indexes[i] * 2) + 1;
			tmpdata[offset] = 0x03;
		}

		for(var i = 0; i < 32; i++) {
			offset = 0x300 + (id * 32) + i;
			tmpdata[offset] = 0x00;
		}

		MPKEdit.Parser(tmpdata);
	};

	MPKState.prototype.save = function() {
		if(MPKEdit.App.usefsys) {
			if(State.Entry && !event.ctrlKey) {
				MPKEdit.fsys.saveFile(State.data, State.Entry);
			}
			else {
				MPKEdit.fsys.saveFileAs(State.data, State.filename);
			}
		}
		else {
			// TODO: clean up this filename mess
			var ext = State.filename.slice(-3);
			ext = ext.toUpperCase() === "MPK";
			var fn = State.filename + (ext ? "" : ".mpk");
			MPKEdit.saveAs(new Blob([State.data]), fn);
		}
	};

	MPKState.prototype.saveNote = function(id, event) {
		var fileOut = [];
		var indexes = State.NoteTable[id].indexes;
		var gameCode = State.NoteTable[id].serial;
		var noteName = State.NoteTable[id].noteName;

		for(var i = 0; i < 32; i++) {
			fileOut.push(State.data[0x300 + (id * 32) + i]);
		}

		fileOut[6] = 0xCA;
		fileOut[7] = 0xFE;

		for(var i = 0; i < indexes.length; i++) {
			var pageAddress = indexes[i] * 0x100;
			for(var j = 0; j < 0x100; j++) {
				fileOut.push(State.data[pageAddress + j]);
			}
		}

		var CRC = MPKEdit.crc32(fileOut);
		var filename = MPKEdit.App.codeDB[gameCode] || gameCode;
		filename = filename + "_" + CRC + ".note";

		if (event && event.ctrlKey) {
			filename = noteName.replace(/[\\|\/"<>*?:]/g, "-");
			filename = filename + "_" + CRC + "_raw.note";
			fileOut = fileOut.slice(32);
		}

		fileOut = new Uint8Array(fileOut);

		if(event.type === "dragstart") {
			var blobURL = URL.createObjectURL(new Blob([fileOut]));
			event.dataTransfer.setData("DownloadURL",
				"application/octet-stream:" + filename + ":" + blobURL
			);
		}
		else if(MPKEdit.App.usefsys) {
			MPKEdit.fsys.saveFileAs(fileOut, filename);
		}
		else {
			MPKEdit.saveAs(new Blob([fileOut]), filename);
		}
	};

	console.log("INFO: MPKEdit.State ready");
}());
