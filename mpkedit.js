/* jshint -W004, bitwise: false */
/* global chrome */

var MPKEdit = (function() {
	"use strict";

	var $cfg = {
		codeDB : {},
		chromeApp: false,
		newFileName: "New.mpk",
		emptyText: "~ empty"
	};

	var $MPK = {};

	function arrstr(arr, a, b) {
		var y = a+b? arr.subarray(a,b):arr;
		return String.fromCharCode.apply(null, y);
	}

	function crc32(data) {
		var table = [];
		for (var i = 256, crc; i--;) {
			crc = i;
			for (var j = 8; j--;) {
				if(crc & 1) {
					crc = crc >>> 1 ^ 3988292384;
				}
				else {
					crc = crc >>> 1;
				}
			}
			table[i] = crc;
		}
		crc = -1;
		for (var i = 0; i < data.length; i++) {
			var ptr = crc & 255 ^ data[i];
			crc = crc >>> 8 ^ table[ptr];
		}
		crc = ((crc ^ -1) >>> 0).toString(16);
		return ("00000000" + crc).slice(-8);
	}

	var ChromeApp = (function () {
		function writeDone(Entry, event) {
			if(event.loaded === 32768) {
				$MPK.Entry = Entry;
				$MPK.filename = Entry.name;
				UIHandler.updateUI();
			}
		}

		function doSave(data, Entry) {
			if(chrome.runtime.lastError) {
				return false;
			}
			Entry.createWriter(function(writer) {
				writer.onwriteend = writeDone.bind(this, Entry);
				writer.write(new Blob([new Uint8Array(data)]));
			});
		}

		function saveFile(data, Entry) {
			chrome.fileSystem.getWritableEntry(Entry, doSave.bind(this,data));
		}

		function saveAsFile(data, filename) {
			chrome.fileSystem.chooseEntry({
				type:"saveFile",
				suggestedName: filename
			}, doSave.bind(this,data));
		}

		function loadFile() {
			chrome.fileSystem.chooseEntry({
				type: "openFile"
			}, function(Entry) {
				if(chrome.runtime.lastError) {
					return false;
				}

				Entry.file(function(fl) {
					var reader = new FileReader();
					$MPK.tmpEntry = Entry;
					reader.onload = MPKHandler.loadData.bind(this,fl.name);
					reader.readAsArrayBuffer(fl.slice(0, 36928));
				});
			});
		}

		return {
			saveFile: saveFile,
			saveAsFile: saveAsFile,
			loadFile: loadFile
		};
	}());

	var UIHandler = (function () {
		function elem() {
			var elmnt;
			var keys = {};
			var tagName = arguments[0][0];
			var prop = arguments[0][1];
	
			if(typeof tagName === "string") {
				elmnt = document.createElement(tagName);
			}
			else {
				elmnt = document.createDocumentFragment();
			}
			if(typeof prop === "object") {
				keys = Object.keys(prop);
			}
			else if(prop && typeof prop !== "object") {
				elmnt.innerHTML = prop;
			}
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				elmnt[key] = prop[key];
			}
			if(arguments.length > 1) {
				for(var i = 1; i < arguments.length; i++) {
					if(arguments[i].nodeType > 0) {
						elmnt.appendChild(arguments[i]);
					}
				}
			}
			return elmnt;
		}

		function doBrowse() {
			if($cfg.chromeApp) {
				ChromeApp.loadFile();
			}
			else {
				var selectFile = document.getElementById("fileOpen");
				selectFile.onchange = fileHandler;
				selectFile.click();

				selectFile.parentElement.replaceChild(elem(["input", {
					id: "fileOpen",
					type: "file",
					multiple: true
				}]), selectFile);
			}
		}

		function initApp() {
			function changeExportColor(event) {
				var target = document.querySelectorAll(".fa-download");

				for(var i = 0; i < target.length; i++) {
					target[i].style.color = event.ctrlKey ? "#c00" : "";
				}
			}

			function isFile(event) {
				var dt = event.dataTransfer;
				for (var i = 0; i < dt.types.length; i++) {
					if (dt.types[i] === "Files") {
						return true;
					}
				}
				return false;
			}

			$cfg.chromeApp = location.protocol === "chrome-extension:";

			document.getElementById("fileOpen").onchange = fileHandler;
			document.getElementById("loadButton").onclick = doBrowse;
			document.getElementById("save").onclick = MPKHandler.saveMPK;

			window.addEventListener("drop", fileHandler);
			MPKHandler.updateMPK(MPKHandler.initMPK(), $cfg.newFileName);

			window.addEventListener("dragover", function(event) {
				event.preventDefault();
			});
			var lastTarget = null;
			var dropzone = document.getElementById("dropzone");

			window.addEventListener("dragenter", function (event) {
				if (isFile(event)) {
					lastTarget = event.target;
					dropzone.style.visibility = "";
					dropzone.style.opacity = 1;
				}
			});

			window.addEventListener("dragleave", function (event) {
				event.preventDefault();
				if (event.target === lastTarget) {
					dropzone.style.visibility = "hidden";
					dropzone.style.opacity = 0;
				}
			});

			window.addEventListener("drop", function(event) {
				dropzone.style.visibility = "hidden";
				dropzone.style.opacity = 0;
				event.preventDefault();
			});

			window.addEventListener("keydown", changeExportColor);
			window.addEventListener("keyup", changeExportColor);
			window.addEventListener("blur", changeExportColor);
		}

		function fileHandler(event) {
			var files = event.target.files || event.dataTransfer.files;

			for(var i = 0; i < files.length; i++) {
				var reader = new FileReader();
				reader.onload = MPKHandler.loadData.bind(this,files[i].name);

				if($cfg.chromeApp) {
					$MPK.tmpEntry = event.dataTransfer.items[i].webkitGetAsEntry();
				}
				reader.readAsArrayBuffer(files[i].slice(0, 36928));
			}
			event.preventDefault();
		}

		function buildRow(i) {
			var gameCode = $MPK.gameNotes[i].serial;
			var gameName = $cfg.codeDB[gameCode] || gameCode;

			var tableRow =
			elem(["tr"],
				elem(["td", $MPK.gameNotes[i].noteName],
					elem(["div", gameName])
				),
				elem(["td", $MPK.gameNotes[i].indexes.length]),
				elem(["td"],
					elem(["span", {
						className: "fa fa-trash",
						onclick: MPKHandler.deleteNote.bind(this,i)
					}]),
					elem(["span", {
						className: "fa fa-download",
						onclick: MPKHandler.exportNote.bind(this,i)
					}])
				)
			);

			return tableRow;
		}

		function updateUI() {
			var out = document.querySelector("table");
			while(out.firstChild) {
				out.removeChild(out.firstChild);
			}

			document.getElementById("filename").innerHTML = $MPK.filename;
			document.title = (123-$MPK.usedPages)+", "+(16-$MPK.usedNotes)+
				", "+$MPK.filename;

			for(var i = 0; i < 16; i++) {
				if($MPK.gameNotes[i]) {
					var tableRow = buildRow(i);
					out.appendChild(tableRow);
				}
			}

			if(Object.keys($MPK.gameNotes).length === 0) {
				var empty =
				elem(["tr"],
					elem(["td"],elem(["div", {
						id: "emptyFile",
						innerHTML: $cfg.emptyText
					}]))
				);
				out.appendChild(empty);
			} 
		}

		return {
			initApp: initApp,
			updateUI: updateUI
		};
	}());

	var MPKHandler = (function () {
		function loadData(filename, event) {
			function isNoteFile(data) {
				var a = 0xCAFE === data[0x07] + (data[0x06] << 8);
				var b = 0 === data.subarray(32).length % 256;
				return a && b;
			}

			var data = new Uint8Array(event.target.result);

			if(isNoteFile(data)) {
				importNote(data);
			}
			else {
				if(arrstr(data, 0, 11) === "123-456-STD") {
					data = data.subarray(0x1040);
				}
				var data2 = new Uint8Array(32768);
				for(var i = 0; i < data.length; i++) {
					data2[i] = data[i];
				}

				updateMPK(data2, filename);
			}
		}

		function updateMPK(data, filename) {
			console.log(this, arguments);
			$MPK.tmpName = filename;
			var gameNotes = pub.parse(data);

			if(gameNotes) {
				$MPK.filename = filename || $MPK.filename;
				$MPK.data = data;
				$MPK.gameNotes = gameNotes;
				UIHandler.updateUI();

				if($cfg.chromeApp && filename) {
					$MPK.Entry = $MPK.tmpEntry;
				}
			}
			else {
				console.warn("File is invalid: " + filename);
			}
		}

		function importNote(data) {
			var noteData = data.subarray(0, 32);
			var pageData = data.subarray(32);
			var pageCount = pageData.length / 256;

			if($MPK.usedPages + pageCount <= 123 && $MPK.usedNotes < 16) {
				var freeIndexes = [];
				for(var i = 0xA; i < 0x100; i += 2) {
					if(freeIndexes.length === pageCount) {
						break;
					}
					if($MPK.data[0x100 + i + 1] === 3) {
						freeIndexes.push(i / 2);
					}
				}

				noteData[0x06] = 0;
				noteData[0x07] = freeIndexes[0];

				for(var i = 0; i < freeIndexes.length; i++) {
					var target1 = 0x100 + (2 * freeIndexes[i] + 1);
					var target2 = 0x100 * freeIndexes[i];

					if(i === freeIndexes.length - 1) {
						$MPK.data[target1] = 0x01;
					} else {
						$MPK.data[target1] = freeIndexes[i + 1];
					}

					for(var j = 0; j < 0x100; j++) {
						$MPK.data[target2 + j] = pageData[0x100 * i + j];
					}
				}

				for(var i = 0; i < 16; i++) {
					if($MPK.gameNotes[i] === undefined) {
						var target = 0x300 + i * 32;
						for(var j = 0; j < 32; j++) {
							$MPK.data[target + j] = noteData[j];
						}
						break;
					}
				}

				updateMPK($MPK.data);
			}
		}

		function deleteNote(noteID) {
			var indexes = $MPK.gameNotes[noteID].indexes;

			for(var i = 0, offset; i < indexes.length; i++) {
				offset = 0x100 + (indexes[i] * 2) + 1;
				$MPK.data[offset] = 0x03;
			}

			for(var i = 0; i < 32; i++) {
				offset = 0x300 + (noteID * 32) + i;
				$MPK.data[offset] = 0x00;
			}

			updateMPK($MPK.data);
		}

		function exportNote(noteID, event) {
			var fileOut = [];
			var indexes = $MPK.gameNotes[noteID].indexes;
			var gameCode = $MPK.gameNotes[noteID].serial;
			var noteName = $MPK.gameNotes[noteID].noteName;

			for(var i = 0; i < 32; i++) {
				fileOut.push($MPK.data[0x300 + (noteID * 32) + i]);
			}

			fileOut[6] = 0xCA;
			fileOut[7] = 0xFE;

			for(var i = 0; i < indexes.length; i++) {
				var pageAddress = indexes[i] * 0x100;
				for(var j = 0; j < 0x100; j++) {
					fileOut.push($MPK.data[pageAddress + j]);
				}
			}

			var filename = $cfg.codeDB[gameCode] || gameCode;
			filename = filename + "_" + crc32(fileOut) + ".note";

			if (event.ctrlKey) {
				filename = noteName.replace(/[\\|\/"<>*?:]/g, "-");
				filename = filename + "_" + crc32(fileOut) + "_raw.note";
				fileOut = fileOut.slice(32);
			}

			if($cfg.chromeApp) {
				ChromeApp.saveAsFile(fileOut, filename);
			}
			else {
				var el = document.createElement("a");
				el.href = "data:MPK;base64," + btoa(arrstr(fileOut));
				el.download = filename;
				el.dispatchEvent(new MouseEvent("click"));
			}
		}

		function saveMPK() {
			if($cfg.chromeApp) {
				if($MPK.Entry && !event.ctrlKey) {
					ChromeApp.saveFile($MPK.data, $MPK.Entry);
				}
				else {
					ChromeApp.saveAsFile($MPK.data, $MPK.filename);
				}
			}
			else {
				var el = document.createElement("a");
				var fn = $MPK.filename;
				var ext = fn.slice(-3).toUpperCase() === "MPK";
				el.download = fn + (ext ? "" : ".mpk");
				el.href = "data:MPK;base64," + btoa(arrstr($MPK.data));
				el.dispatchEvent(new MouseEvent("click"));
			}
		}

		function initMPK() {
			function writeAt(offset) {
				var bytes = [1, 1, 0, 1, 1, 254, 241];
				for(var i = 0; i < 7; i++) {
					data[offset + i] = bytes[i];
				}
			}

			var data = new Uint8Array(32768);

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

			return data;
		}

		var pub = {
			deleteNote: deleteNote,
			saveMPK: saveMPK,
			exportNote: exportNote,
			initMPK: initMPK,
			updateMPK: updateMPK,
			loadData: loadData
		};
		return pub;
	}());

	var MPKHandler = (function(pub) {
		function validateChecksum(data, o) {
			var sumA = 0;
			var sumB = 0xFFF2;
			var sumX = (data[o + 28] << 8) + data[o + 29];
			var sumY = (data[o + 30] << 8) + data[o + 31];

			if((data[o + 25] & 1) === 0 || (data[o + 26] & 1) === 0) {
				return false;
			}

			for(var i = 0; i < 28; i += 2) {
				sumA += (data[o + i] << 8) + data[o + i + 1];
				sumA &= 0xFFFF;
			}
			sumB -= sumA;

			if(sumX === sumA && (sumY ^ 0x0C) === sumB) {
				sumY ^= 0xC;
				data[o + 31] ^= 0xC;
			}

			return (sumX === sumA && sumY === sumB);
		}

		function checkHeader(data) {
			var loc = [0x20, 0x60, 0x80, 0xC0];
			var lastValidLoc = -1;

			for(var i = 0, chk; i < loc.length; i++) {
				chk = validateChecksum(data, loc[i]);
				if(chk) {
					lastValidLoc = loc[i];
				}
			}

			for(var i = 0; i < loc.length; i++) {
				var currentLoc = loc[i];
				chk = validateChecksum(data, currentLoc);

				if(lastValidLoc > -1 && chk === false) {
					for(var j = 0; j < 32; j++) {
						data[currentLoc + j] = data[lastValidLoc + j];
					}
					chk = validateChecksum(data, currentLoc);
				}
				loc[i] = chk;
			}

			return loc[0] && loc[1] && loc[2] && loc[3];
		}

		function readNoteTable(data, NoteKeys) {
			var n64code = {
				  0:  "",  15: " ",  16: "0",
				 17: "1",  18: "2",  19: "3",  20: "4",
				 21: "5",  22: "6",  23: "7", 24: "8",
				 25: "9",  26: "A",  27: "B",  28: "C",
				 29: "D",  30: "E",  31: "F", 32: "G",
				 33: "H",  34: "I",  35: "J",  36: "K",
				 37: "L",  38: "M",  39: "N", 40: "O",
				 41: "P",  42: "Q",  43: "R",  44: "S",
				 45: "T",  46: "U",  47: "V", 48: "W",
				 49: "X",  50: "Y",  51: "Z",  52: "!",
				 53: '"',  54: "#",  55: "'", 56: "*",
				 57: "+",  58: ",",  59: "-",  60: ".",
				 61: "/",  62: ":",  63: "=", 64: "?",
				 65: "@",  66: "。",  67: "゛",  68: "゜",
				 69: "ァ",  70: "ィ",  71: "ゥ",  72: "ェ",
				 73: "ォ",  74: "ッ",  75: "ャ",  76: "ュ",
				 77: "ョ",  78: "ヲ",  79: "ン",  80: "ア",
				 81: "イ",  82: "ウ",  83: "エ",  84: "オ",
				 85: "カ",  86: "キ",  87: "ク",  88: "ケ",
				 89: "コ",  90: "サ",  91: "シ",  92: "ス",
				 93: "セ",  94: "ソ",  95: "タ",  96: "チ",
				 97: "ツ",  98: "テ",  99: "ト", 100: "ナ",
				101: "ニ", 102: "ヌ", 103: "ネ", 104: "ノ",
				105: "ハ", 106: "ヒ", 107: "フ", 108: "ヘ",
				109: "ホ", 110: "マ", 111: "ミ", 112: "ム",
				113: "メ", 114: "モ", 115: "ヤ", 116: "ユ",
				117: "ヨ", 118: "ラ", 119: "リ", 120: "ル",
				121: "レ", 122: "ロ", 123: "ワ", 124: "ガ",
				125: "ギ", 126: "グ", 127: "ゲ", 128: "ゴ",
				129: "ザ", 130: "ジ", 131: "ズ", 132: "ゼ",
				133: "ゾ", 134: "ダ", 135: "ヂ", 136: "ヅ",
				137: "デ", 138: "ド", 139: "バ", 140: "ビ",
				141: "ブ", 142: "ベ", 143: "ボ", 144: "パ",
				145: "ピ", 146: "プ", 147: "ペ", 148: "ポ"
			};

			var NoteTable = {};
			for(var i = 0x300; i < 0x500; i += 32) {
				var p = data[i + 0x07];
				var validIndex = p>=5 && p<=127 && data[i + 0x06]===0;

				if(validIndex) {
					NoteKeys.push(p);

					if((data[i + 0x08] & 0x02) === 0) {
						data[i + 0x08] |= 0x02;
					}

					for(var j = 0, noteName = ""; j < 16; j++) {
						noteName += n64code[data[i + 16 + j]] || "";
					}

					if(data[i + 12] !== 0) {
						noteName += ".";
						noteName += n64code[data[i + 12]] || "";
						noteName += n64code[data[i + 13]] || "";
						noteName += n64code[data[i + 14]] || "";
						noteName += n64code[data[i + 15]] || "";
					}

					NoteTable[(i - 0x300) / 32] = {
						indexes: p,
						serial: arrstr(data, i, i+4).replace(/\0/g,"-"),
						publisher: arrstr(data, i+4, i+6).replace(/\0/g,"-"),
						noteName: noteName
					};

				}
			}
			return NoteTable;
		}

		function checkIndexes(data, o, NoteKeys) {
			try {
				var p, p2;
				var indexEnds = 0;
				var found = {parsed: [], keys: [], values: []};

				for(var i = o + 0xA; i < o + 0x100; i += 2) {
					p = data[i + 1];
					p2 = data[i];

					if (p2===0 && p===1 || p>=5 && p<=127 && p!==3) {
						if(p === 1) { indexEnds += 1; }
						if(p !== 1 && found.values.indexOf(p) > -1) {
							throw "IndexTable contains duplicate index " +
								"(p="+p+").";
						}
						found.values.push(p);
						found.keys.push((i - o) / 2);
					}
					else if (p2!==0 || p!==1 && p!==3 && p<5 || p>127) {
						throw "IndexTable contains illegal value" +
							"(p="+p+", "+p2+").";
					}
				}

				var keyIndexes = found.keys.filter(function(n) {
					return found.values.indexOf(n) === -1;
				});

				var nKeysN = NoteKeys.length;
				var nKeysP = keyIndexes.length;
				if (nKeysN !== nKeysP || nKeysN !== indexEnds) {
					throw "Key index totals do not match (" +
						nKeysN+", "+nKeysP+", "+indexEnds+")";
				}

				for (var i = 0; i < nKeysN; i++) {
					if (NoteKeys.indexOf(keyIndexes[i]) === -1) {
						throw "A key index doesn't exist in the note table ("+
							keyIndexes[i]+")";
					}
				}

				var noteIndexes = {};
				for(var i = 0; i < nKeysP; i++) {
					var indexes = [];
					p = keyIndexes[i];

					while(p === 1 || p >= 5 && p <= 127) {
						if(p === 1) {
							noteIndexes[keyIndexes[i]] = indexes;
							break;
						}
						indexes.push(p);
						found.parsed.push(p);
						p = data[p*2 + o + 1];
					}
				}

				if(found.parsed.length !== found.keys.length) {
					throw "Number of parsed keys doesn't match found keys. (" +
					found.parsed.length+", "+found.keys.length+")";
				}
				for (var i = 0; i < found.parsed.length; i++) {
					if (found.parsed.indexOf(found.keys[i]) === -1) {
						throw "A key doesn't exist in the parsed keys. (" +
							found.keys[i];
					}
				}

				for(var i = o+0xA, sum = 0; i < o+0x100; i++) {
					sum += data[i];
				}
				sum &= 0xFF;
				if (data[o+1] !== sum) {
					data[o+1] = sum;
				}

				p = (o === 0x100) ? 0x200 : 0x100;
				for(i = 0; i < 0x100; i++) {
					data[p + i] = data[o + i];
				}
				return noteIndexes; 
			}
			catch(error) {
				console.warn("checkIndexes:"+$MPK.tmpName, o/256, error);
				if(o !== 0x200) {
					return checkIndexes(data, 0x200, NoteKeys);
				}
			} 
		}

		function parseMPK(data) {
			if(checkHeader(data) === false) {
				return false;
			}
			var NoteKeys = [];
			var NoteTable = readNoteTable(data, NoteKeys);

			var output = checkIndexes(data, 0x100, NoteKeys);
			if(output) {
				$MPK.usedPages = 0;
				$MPK.usedNotes = 0;
				for(var i = 0; i < Object.keys(NoteTable).length; i++) {
					var _note = NoteTable[Object.keys(NoteTable)[i]];
					_note.indexes = output[_note.indexes];

					$MPK.usedPages += _note.indexes.length;
					$MPK.usedNotes++;
				}
				return NoteTable;
			}
			else {
				return false;
			}
		}

		console.log(pub.parse, pub);
		pub.parse = parseMPK;

		return pub;
		//return parseMPK(data);
	}(MPKHandler));

	console.log(MPKHandler);

	$cfg.codeDB = {
		"\x3B\xAD\xD1\xE5": "Cartridge Save (Gameshark, Action Replay)",
		"\xDE\xAD\xBE\xEF": "Cartridge Save (BlackBag's Memory Manager)",
		"NO7P": "007 - The World is Not Enough (E)",
		"NO7E": "007 - The World is Not Enough (U)",
		"NTEP": "1080 Snowboarding (E)",
		"NTEA": "1080 Snowboarding (JU)",
		"NTWJ": "64 de Hakken!! Tamagotchi Minna de Tamagotchi World (J)",
		"NNiJ": "Virtual Pro Wrestling 64 (J)",
		"NHFJ": "64 Hanafuda - Tenshi no Yakusoku (J)",
		"NOSJ": "64 Oozumou (J)",
		"NO2J": "64 Oozumou 2 (J)",
		"NTCJ": "64 Trump Collection - Alice no Wakuwaku Trump World (J)",
		"NSAP": "AeroFighters Assault (E)",
		"NERE": "AeroFighters Assault (U)",
		"NSAJ": "Sonic Wings Assault (J)",
		"NAGP": "AeroGauge (E)",
		"NAGJ": "AeroGauge (J)",
		"NAGE": "AeroGauge (U)",
		"NS3J": "AI Shougi 3 (J)",
		"NAYP": "Aidyn Chronicles - The First Mage (E)",
		"NAYE": "Aidyn Chronicles - The First Mage (U)",
		"NABP": "Airboarder 64 (E)",
		"NABJ": "Airboarder 64 (J)",
		"NTNP": "All Star Tennis '99 (E)",
		"NTNE": "All Star Tennis '99 (U)",
		"NBSP": "All-Star Baseball '99 (E)",
		"NBSE": "All-Star Baseball '99 (U)",
		"NBEP": "All-Star Baseball 2000 (E)",
		"NBEE": "All-Star Baseball 2000 (U)",
		"NASE": "All-Star Baseball 2001 (U)",
		"NARP": "Armorines - Project S.W.A.R.M. (E)",
		"NARD": "Armorines - Project S.W.A.R.M. (G)",
		"NARE": "Armorines - Project S.W.A.R.M. (U)",
		"NACE": "Army Men - Air Combat (U)",
		"NAMP": "Army Men - Sarge's Heroes (E)",
		"NAME": "Army Men - Sarge's Heroes (U)",
		"N32E": "Army Men - Sarge's Heroes 2 (U)",
		"NAHE": "Asteroids Hyper 64 (U)",
		"NLCP": "Automobili Lamborghini (E)",
		"NLCE": "Automobili Lamborghini (U)",
		"NLCJ": "Super Speed Race 64 (J)",
		"NBNJ": "Bakuretsu Muteki Bangai-O (J)",
		"NBJJ": "Bakushou Jinsei 64 - Mezase! Resort Ou (J)",
		"NBKJ": "Banjo to Kazooie no Daibouken (J)",
		"NBKP": "Banjo-Kazooie (E)",
		"NBKE": "Banjo-Kazooie (U)",
		"NB7J": "Banjo to Kazooie no Daibouken 2 (J)",
		"NB7U": "Banjo-Tooie (A)",
		"NB7P": "Banjo-Tooie (E)",
		"NB7E": "Banjo-Tooie (U)",
		"NVBJ": "Bass Rush - ECOGEAR PowerWorm Championship (J)",
		"NB4E": "Bassmasters 2000 (U)",
		"NJQE": "Batman Beyond - Return of the Joker (U)",
		"NJQP": "Batman of the Future - Return of the Joker (E)",
		"NBXE": "BattleTanx (U)",
		"NBQP": "BattleTanx - Global Assault (E)",
		"NBQE": "BattleTanx - Global Assault (U)",
		"NZOE": "Battlezone - Rise of the Black Dogs (U)",
		"NNSP": "Beetle Adventure Racing! (E)",
		"NB8J": "Beetle Adventure Racing! (J)",
		"NNSE": "Beetle Adventure Racing! (U)",
		"NNSX": "HSV Adventure Racing (A)",
		"NMUE": "Big Mountain 2000 (U)",
		"NSNJ": "Snow Speeder (J)",
		"NBFP": "Bio F.R.E.A.K.S. (E)",
		"NBFE": "Bio F.R.E.A.K.S. (U)",
		"NBCP": "Blast Corps (E)",
		"NBCE": "Blast Corps (U)",
		"NBCJ": "Blast Dozer (J)",
		"NBPP": "Blues Brothers 2000 (E)",
		"NBPE": "Blues Brothers 2000 (U)",
		"NBHP": "Body Harvest (E)",
		"NBHE": "Body Harvest (U)",
		"NBMJ": "Baku Bomberman (J)",
		"NBMP": "Bomberman 64 (E)",
		"NBME": "Bomberman 64 (U)",
		"NHAJ": "Bomberman 64 - Arcade Edition (J)",
		"NBVJ": "Baku Bomberman 2 (J)",
		"NBVE": "Bomberman 64 - The Second Attack! (U)",
		"NBDP": "Bomberman Hero (E)",
		"NBDE": "Bomberman Hero (U)",
		"NBDJ": "Bomberman Hero - Mirian Oujo wo Sukue! (J)",
		"NBOE": "Bottom of the 9th (U)",
		"NOWE": "Brunswick Circuit Pro Bowling (U)",
		"NBLP": "Buck Bumble (E)",
		"NBLJ": "Buck Bumble (J)",
		"NBLE": "Buck Bumble (U)",
		"NBYP": "Bug's Life, A (E)",
		"NBYF": "Bug's Life, A (F)",
		"NBYD": "Bug's Life, A (G)",
		"NBYI": "Bug's Life, A (I)",
		"NBYE": "Bug's Life, A (U)",
		"NB3E": "Bust-A-Move '99 (U)",
		"NB3P": "Bust-A-Move 3 DX (E)",
		"NPBJ": "Puzzle Bobble 64 (J)",
		"NBUP": "Bust-A-Move 2 - Arcade Edition (E)",
		"NBUE": "Bust-A-Move 2 - Arcade Edition (U)",
		"NCLE": "California Speed (U)",
		"NCDX": "Carmageddon 64 (E)",
		"NCDY": "Carmageddon 64 (E)",
		"NCDE": "Carmageddon 64 (U)",
		"ND3J": "Akumajou Dracula Mokushiroku - Real Action Adventure (J)",
		"ND3P": "Castlevania (E)",
		"ND3E": "Castlevania (U)",
		"ND4J": "Akumajou Dracula Mokushiroku Gaiden - Legend of Cornell (J)",
		"ND4P": "Castlevania - Legacy of Darkness (E)",
		"ND4E": "Castlevania - Legacy of Darkness (U)",
		"NTSP": "Centre Court Tennis (E)",
		"NTSJ": "Let's Smash Tennis (J)",
		"NCTP": "Chameleon Twist (E)",
		"NCTJ": "Chameleon Twist (J)",
		"NCTE": "Chameleon Twist (U)",
		"N2VP": "Chameleon Twist 2 (E)",
		"NV2J": "Chameleon Twist 2 (J)",
		"N2VE": "Chameleon Twist 2 (U)",
		"NCBP": "Charlie Blast's Territory (E)",
		"NCBE": "Charlie Blast's Territory (U)",
		"NCHP": "Chopper Attack (E)",
		"NCHE": "Chopper Attack (U)",
		"NWCJ": "Wild Choppers (J)",
		"NCGJ": "Choro Q 64 II - Hacha Mecha Grand Prix Race (J)",
		"NPKJ": "Chou Kuukan Night Pro Yakyuu King (J)",
		"NP2J": "Chou Kuukan Night Pro Yakyuu King 2 (J)",
		"NC2E": "Clay Fighter - Sculptor's Cut (U)",
		"NCFE": "Clay Fighter 63 1-3 (U)",
		"NCFP": "Clay Fighter 63 1-3 (E)",
		"NCCP": "Command & Conquer (E)",
		"NCCD": "Command & Conquer (G)",
		"NCCE": "Command & Conquer (U)",
		"NFUP": "Conker's Bad Fur Day (E)",
		"NFUE": "Conker's Bad Fur Day (U)",
		"NXOE": "Cruis'n Exotica (U)",
		"NCUP": "Cruis'n USA (E)",
		"NCUE": "Cruis'n USA (U)",
		"NCWP": "Cruis'n World (E)",
		"NCWE": "Cruis'n World (U)",
		"NCXJ": "Custom Robo (J)",
		"NCZJ": "Custom Robo V2 (J)",
		"NT4P": "CyberTiger (E)",
		"NT4E": "CyberTiger (U)",
		"NDFJ": "Dance Dance Revolution - Disney Dancing Museum (J)",
		"NDKP": "Dark Rift (E)",
		"NDKE": "Dark Rift (U)",
		"NDKJ": "Space Dynamites (J)",
		"NGAE": "Deadly Arts (U)",
		"NGAP": "G.A.S.P!! Fighter's NEXTream (E)",
		"NGAJ": "G.A.S.P!! Fighter's NEXTream (J)",
		"ND6J": "Densha de Go! 64 (J)",
		"NDAJ": "Derby Stallion 64 (J)",
		"NDEP": "Destruction Derby 64 (E)",
		"NDEE": "Destruction Derby 64 (U)",
		"CDZJ": "Dezaemon 3D (J)",
		"NDYP": "Diddy Kong Racing (E)",
		"NDYJ": "Diddy Kong Racing (J)",
		"NDYE": "Diddy Kong Racing (U)",
		"NDQE": "Disney's Donald Duck - Goin' Quackers (U)",
		"NDQP": "Donald Duck - Quack Attack (E)",
		"NTAP": "Disney's Tarzan (E)",
		"NTAF": "Disney's Tarzan (F)",
		"NTAD": "Disney's Tarzan (G)",
		"NTAE": "Disney's Tarzan (U)",
		"NDOP": "Donkey Kong 64 (E)",
		"NDOJ": "Donkey Kong 64 (J)",
		"NDPE": "Donkey Kong 64 (U)",
		"NDOE": "Donkey Kong 64 (U)",
		"NDMP": "Doom 64 (E)",
		"NDMJ": "Doom 64 (J)",
		"NDME": "Doom 64 (U)",
		"NDRJ": "Doraemon - Nobita to 3tsu no Seireiseki (J)",
		"ND2J": "Doraemon 2 - Nobita to Hikari no Shinden (J)",
		"N3DJ": "Doraemon 3 - Nobita no Machi SOS! (J)",
		"NAFJ": "Doubutsu no Mori (J)",
		"NN6E": "Dr. Mario 64 (U)",
		"NDHP": "Dual Heroes (E)",
		"NDHJ": "Dual Heroes (J)",
		"NDHE": "Dual Heroes (U)",
		"NDUE": "Duck Dodgers Starring Daffy Duck (U)",
		"NDUP": "Looney Tunes - Duck Dodgers (E)",
		"NDZP": "Duke Nukem - ZER0 H0UR (E)",
		"NDZF": "Duke Nukem - ZER0 H0UR (F)",
		"NDZE": "Duke Nukem - ZER0 H0UR (U)",
		"NDNP": "Duke Nukem 64 (E)",
		"NDNF": "Duke Nukem 64 (F)",
		"NDNE": "Duke Nukem 64 (U)",
		"NJMP": "Earthworm Jim 3D (E)",
		"NJME": "Earthworm Jim 3D (U)",
		"NWIP": "ECW Hardcore Revolution (E)",
		"NWIE": "ECW Hardcore Revolution (U)",
		"NSTJ": "Eikou no Saint Andrews (J)",
		"NELE": "Elmo's Letter Adventure (U)",
		"NENE": "Elmo's Number Journey (U)",
		"NMXP": "Excitebike 64 (E)",
		"NMXJ": "Excitebike 64 (J)",
		"NNXE": "Excitebike 64 (U)",
		"NMXE": "Excitebike 64 (U)",
		"NEGP": "Extreme-G (E)",
		"NEGJ": "Extreme-G (J)",
		"NEGE": "Extreme-G (U)",
		"NNiE": "Turok - Dinosaur Hunter (U)",
		"NG2P": "Extreme-G XG2 (E)",
		"NG2J": "Extreme-G XG2 (J)",
		"NG2E": "Extreme-G XG2 (U)",
		"NHGP": "F-1 Pole Position 64 (E)",
		"NHGE": "F-1 Pole Position 64 (U)",
		"NHGJ": "Human Grand Prix - New Generation (J)",
		"NFWP": "F-1 World Grand Prix (E)",
		"NFWF": "F-1 World Grand Prix (F)",
		"NFWD": "F-1 World Grand Prix (G)",
		"NFWJ": "F-1 World Grand Prix (J)",
		"NFWE": "F-1 World Grand Prix (U)",
		"NF2P": "F-1 World Grand Prix II (E)",
		"NFZP": "F-ZERO X (E)",
		"CFZJ": "F-ZERO X (J)",
		"CFZE": "F-ZERO X (U)",
		"NFRP": "F1 Racing Championship (E)",
		"NFSJ": "Famista 64 (J)",
		"N8IP": "FIFA - Road to World Cup 98 (E)",
		"N8IE": "FIFA - Road to World Cup 98 (U)",
		"N8IJ": "FIFA - Road to World Cup 98 - World Cup heno Michi (J)",
		"N9FP": "FIFA 99 (U)",
		"N9FE": "FIFA 99 (U)",
		"N7IP": "FIFA Soccer 64 (E)",
		"N7IE": "FIFA Soccer 64 (U)",
		"NFGE": "Fighter Destiny 2 (U)",
		"NFYJ": "Kakutou Denshou - F-Cup Maniax (J)",
		"NKAP": "Fighter's Destiny (E)",
		"NKAF": "Fighter's Destiny (F)",
		"NKAD": "Fighter's Destiny (G)",
		"NKAE": "Fighter's Destiny (U)",
		"NKAJ": "Fighting Cup (J)",
		"NFFP": "Fighting Force 64 (E)",
		"NFFE": "Fighting Force 64 (U)",
		"NFDP": "Flying Dragon (E)",
		"NFDE": "Flying Dragon (U)",
		"NHKJ": "Hiryuu no Ken Twin (J)",
		"NFOP": "Forsaken 64 (E)",
		"NFOD": "Forsaken 64 (G)",
		"NFOE": "Forsaken 64 (U)",
		"NF9E": "Fox Sports College Hoops '99 (U)",
		"NGVE": "Glover (U)",
		"NSIJ": "Fushigi no Dungeon - Fuurai no Shiren 2 - Oni Shuurai! Shiren Jou! (J)",
		"NGBE": "Top Gear Hyper Bike (U)",
		"NGBP": "Top Gear Hyper Bike (E)",
		"NGPJ": "Ganbare Goemon - Mononoke Sugoroku (J)",
		"NGXP": "Gauntlet Legends (E)",
		"NGDJ": "Gauntlet Legends (J)",
		"NGXE": "Gauntlet Legends (U)",
		"NGLJ": "Getter Love!! (J)",
		"NX3X": "Gex 3 - Deep Cover Gecko (E)",
		"NX3P": "Gex 3 - Deep Cover Gecko (E)",
		"NX3E": "Gex 3 - Deep Cover Gecko (U)",
		"NX2P": "Gex 64 - Enter the Gecko (E)",
		"NX2E": "Gex 64 - Enter the Gecko (U)",
		"NGVP": "Glover (E)",
		"NG6J": "Ganbare Goemon - Derodero Douchuu Obake Tenkomori (J)",
		"NGME": "Goemon's Great Adventure (U)",
		"NGMP": "Mystical Ninja 2 Starring Goemon (E)",
		"NGNE": "Golden Nugget 64 (U)",
		"NGEP": "GoldenEye 007 (E)",
		"NGEJ": "GoldenEye 007 (J)",
		"NGEE": "GoldenEye 007 (U)",
		"NGTJ": "City-Tour GP - Zennihon GT Senshuken (J)",
		"NGCP": "GT 64 - Championship Edition (E)",
		"NGCE": "GT 64 - Championship Edition (U)",
		"NHSJ": "Hamster Monogatari 64 (J)",
		"NYWJ": "Bokujou Monogatari 2 (J)",
		"NYWE": "Harvest Moon 64 (U)",
		"NHPJ": "Heiwa Pachinko World 64 (J)",
		"NHCP": "Hercules - The Legendary Journeys (E)",
		"NHCE": "Hercules - The Legendary Journeys (U)",
		"NHXP": "Hexen (E)",
		"NHXF": "Hexen (F)",
		"NHXD": "Hexen (G)",
		"NHXJ": "Hexen (J)",
		"NHXE": "Hexen (U)",
		"NPGE": "Hey You, Pikachu! (U)",
		"NPGJ": "Pikachu Genki Dechu (J)",
		"NHWP": "Hot Wheels Turbo Racing (E)",
		"NHWE": "Hot Wheels Turbo Racing (U)",
		"NHVP": "Hybrid Heaven (E)",
		"NHYJ": "Hybrid Heaven (J)",
		"NHVE": "Hybrid Heaven (U)",
		"NHTP": "Hydro Thunder (E)",
		"NHTF": "Hydro Thunder (F)",
		"NHTE": "Hydro Thunder (U)",
		"NIMJ": "Ide Yosuke no Mahjong Juku (J)",
		"NWBP": "Iggy's Reckin' Balls (E)",
		"NWBE": "Iggy's Reckin' Balls (U)",
		"NWBJ": "Iggy-kun no Bura Bura Poyon (J)",
		"NFHP": "Bass Hunter 64 (E)",
		"NFHE": "In-Fisherman Bass Hunter 64 (U)",
		"NIJE": "Indiana Jones and the Infernal Machine (U)",
		"NICE": "Indy Racing 2000 (U)",
		"NWSP": "International Superstar Soccer '98 (E)",
		"NWSE": "International Superstar Soccer '98 (U)",
		"NWSJ": "Jikkyou World Soccer - World Cup France '98 (J)",
		"NISX": "International Superstar Soccer 2000 (E)",
		"NISY": "International Superstar Soccer 2000 (E)",
		"NISE": "International Superstar Soccer 2000 (U)",
		"NPSJ": "Jikkyou J.League 1999 - Perfect Striker 2 (J)",
		"NJPP": "International Superstar Soccer 64 (E)",
		"NJPE": "International Superstar Soccer 64 (U)",
		"NJ3J": "Jikkyou World Soccer 3 (J)",
		"N3HJ": "Ganbare Nippon! Olympics 2000 (J)",
		"N3HE": "International Track & Field 2000 (U)",
		"N3HP": "International Track & Field Summer Games (E)",
		"NDSJ": "J.League Dynamite Soccer 64 (J)",
		"NJEJ": "J.League Eleven Beat 1997 (J)",
		"NJLJ": "J.League Live 64 (J)",
		"NSJJ": "J.League Tactics Soccer (J)",
		"NMAJ": "Jangou Simulation Mahjong Do 64 (J)",
		"NJOE": "Jeopardy! (U)",
		"NCOP": "Jeremy McGrath Supercross 2000 (E)",
		"NCOE": "Jeremy McGrath Supercross 2000 (U)",
		"NJFP": "Jet Force Gemini (E)",
		"NJDE": "Jet Force Gemini (U)",
		"NJFE": "Jet Force Gemini (U)",
		"NJFJ": "Star Twins (J)",
		"NGSJ": "Jikkyou G1 Stable (J)",
		"NJPJ": "Jikkyou J.League Perfect Striker (J)",
		"NPEJ": "Jikkyou Powerful Pro Yakyuu - Basic Han 2001 (J)",
		"NPAJ": "Jikkyou Powerful Pro Yakyuu 2000 (J)",
		"NP4J": "Jikkyou Powerful Pro Yakyuu 4 (J)",
		"NJ5J": "Jikkyou Powerful Pro Yakyuu 5 (J)",
		"NP6J": "Jikkyou Powerful Pro Yakyuu 6 (J)",
		"NJGJ": "Jinsei Game 64 (J)",
		"NDWP": "John Romero's Daikatana (E)",
		"NDWJ": "John Romero's Daikatana (J)",
		"NDWE": "John Romero's Daikatana (U)",
		"NKJE": "Ken Griffey Jr.'s Slugfest (U)",
		"NKIP": "Killer Instinct Gold (E)",
		"NKIE": "Killer Instinct Gold (U)",
		"N64J": "Kira to Kaiketsu! 64 Tanteidan (J)",
		"NK4J": "Kirby 64 - The Crystal Shards (U)",
		"NK4P": "Kirby 64 - The Crystal Shards (E)",
		"NK4E": "Kirby 64 - The Crystal Shards (U)",
		"NKEP": "Knife Edge - Nose Gunner (E)",
		"NKEJ": "Knife Edge - Nose Gunner (J)",
		"NKEE": "Knife Edge - Nose Gunner (U)",
		"NKKP": "Knockout Kings 2000 (E)",
		"NKKE": "Knockout Kings 2000 (U)",
		"NNBP": "Kobe Bryant in NBA Courtside (E)",
		"NNBE": "Kobe Bryant's NBA Courtside (U)",
		"NLLJ": "Last Legion UX (J)",
		"NZSP": "Legend of Zelda, The - Majora's Mask - Collector's Edition (E)",
		"NZSE": "Legend of Zelda, The - Majora's Mask (U)",
		"NDLE": "Legend of Zelda, The - Majora's Mask - Preview Demo (U)",
		"NZSJ": "Zelda no Densetsu - Mujura no Kamen (J)",
		"NZLP": "Legend of Zelda, The - Ocarina of Time (E)",
		"CZLE": "Legend of Zelda, The - Ocarina of Time (U)",
		"CZGE": "Legend of Zelda, The - Ocarina of Time (U)",
		"NZLE": "Legend of Zelda, The - Ocarina of Time (U)",
		"CZLJ": "Zelda no Densetsu - Toki no Ocarina GC URA (J)",
		"NLGP": "LEGO Racers (E)",
		"NLGE": "LEGO Racers (U)",
		"NLRP": "Lode Runner 3-D (E)",
		"NLRJ": "Lode Runner 3-D (J)",
		"NLRE": "Lode Runner 3-D (U)",
		"NMEP": "Mace - The Dark Age (E)",
		"NMEE": "Mace - The Dark Age (U)",
		"N8MP": "Madden Football 64 (E)",
		"N8ME": "Madden Football 64 (U)",
		"NMDE": "Madden NFL 2000 (U)",
		"NFLE": "Madden NFL 2001 (U)",
		"N2ME": "Madden NFL 2002 (U)",
		"N9MP": "Madden NFL 99 (E)",
		"N9ME": "Madden NFL 99 (U)",
		"NMTF": "Defi au Tetris Magique (F)",
		"NMTP": "Magical Tetris Challenge (E)",
		"NMTD": "Magical Tetris Challenge (G)",
		"NMTE": "Magical Tetris Challenge (U)",
		"NMTJ": "Magical Tetris Challenge Featuring Mickey (J)",
		"ZCAJ": "Magical Tetris Challenge Featuring Mickey (J)",
		"NMJJ": "Mahjong 64 (J)",
		"NMHJ": "Mahjong Hourouki Classic (J)",
		"NMMJ": "Mahjong Master (J)",
		"NKGP": "Major League Baseball Featuring Ken Griffey Jr. (E)",
		"NKGE": "Major League Baseball Featuring Ken Griffey Jr. (U)",
		"NMFP": "Mario Golf (E)",
		"NMFE": "Mario Golf (U)",
		"NMFJ": "Mario Golf 64 (J)",
		"NHHP": "Mario Kart 64 (E)",
		"NKTP": "Mario Kart 64 (E)",
		"NKTJ": "Mario Kart 64 (J)",
		"NHHE": "Mario Kart 64 (U)",
		"NKTE": "Mario Kart 64 (U)",
		"NMPJ": "Mario no Photopie (J)",
		"NLBP": "Mario Party (E)",
		"CLBJ": "Mario Party (J)",
		"CLBE": "Mario Party (U)",
		"NMWP": "Mario Party 2 (E)",
		"NMWJ": "Mario Party 2 (J)",
		"NMWE": "Mario Party 2 (U)",
		"NMVP": "Mario Party 3 (E)",
		"NMVJ": "Mario Party 3 (J)",
		"NMVE": "Mario Party 3 (U)",
		"NM8P": "Mario Tennis (E)",
		"NM8E": "Mario Tennis (U)",
		"NM8J": "Mario Tennis 64 (J)",
		"NM6E": "Mega Man 64 (U)",
		"NRHJ": "Rockman Dash (J)",
		"NHME": "Mia Hamm Soccer 64 (U)",
		"NWKX": "Michael Owens WLS 2000 (E)",
		"NWKD": "RTL World League Soccer 2000 (G)",
		"NWKF": "Telefoot Soccer 2000 (F)",
		"NMLJ": "Mickey no Racing Challenge USA (J)",
		"NMLP": "Mickey's Speedway USA (E)",
		"NMLE": "Mickey's Speedway USA (U)",
		"NV3P": "Micro Machines 64 Turbo (E)",
		"NV3E": "Micro Machines 64 Turbo (U)",
		"NAIE": "Midway's Greatest Arcade Hits Volume 1 (U)",
		"NMBE": "Mike Piazza's Strike Zone (U)",
		"NBRP": "Milo's Astro Lanes (E)",
		"NBRE": "Milo's Astro Lanes (U)",
		"NTMP": "Mischief Makers (E)",
		"NTME": "Mischief Makers (U)",
		"NTMJ": "Yuke Yuke!! Trouble Makers (J)",
		"NMIP": "Mission Impossible (E)",
		"NMIF": "Mission Impossible (F)",
		"NMID": "Mission Impossible (G)",
		"NMII": "Mission Impossible (I)",
		"NMIS": "Mission Impossible (S)",
		"NMIE": "Mission Impossible (U)",
		"NMGE": "Monaco Grand Prix (U)",
		"NMGP": "Monaco Grand Prix - Racing Simulation 2 (E)",
		"NMGD": "Racing Simulation 2 (G)",
		"NMOE": "Monopoly (U)",
		"NM3P": "Monster Truck Madness 64 (E)",
		"NM3E": "Monster Truck Madness 64 (U)",
		"NMSJ": "Morita Shougi 64 (J)",
		"NM4P": "Mortal Kombat 4 (E)",
		"NM4E": "Mortal Kombat 4 (U)",
		"NMYP": "Mortal Kombat Mythologies - Sub-Zero (E)",
		"NMYE": "Mortal Kombat Mythologies - Sub-Zero (U)",
		"NMKP": "Mortal Kombat Trilogy (E)",
		"NMKE": "Rape Kombat Trilogy Beta1 (Mortal Kombat Hack)",
		"NMRP": "MRC - Multi Racing Championship (E)",
		"NMRJ": "MRC - Multi Racing Championship (J)",
		"NMRE": "MRC - Multi Racing Championship (U)",
		"NP9E": "Ms. Pac-Man - Maze Madness (U)",
		"NG5J": "Ganbare Goemon - Neo Momoyama Bakufu no Odori (J)",
		"NG5P": "Mystical Ninja Starring Goemon (E)",
		"NG5E": "Mystical Ninja Starring Goemon (U)",
		"NH5J": "Hyper Olympics Nagano 64 (J)",
		"NH5P": "Nagano Winter Olympics '98 (E)",
		"NH5E": "Nagano Winter Olympics '98 (U)",
		"NNME": "Namco Museum 64 (U)",
		"NN2E": "NASCAR 2000 (U)",
		"N9CP": "NASCAR 99 (E)",
		"N9CE": "NASCAR 99 (U)",
		"NCKE": "NBA Courtside 2 - Featuring Kobe Bryant (U)",
		"NXGP": "NBA Hangtime (E)",
		"NXGE": "NBA Hangtime (U)",
		"NBAJ": "NBA In the Zone '98 (U)",
		"NBAE": "NBA In the Zone '98 (U)",
		"NBAP": "NBA Pro 98 (E)",
		"NB2E": "NBA In the Zone '99 (U)",
		"NB2J": "NBA In the Zone 2 (J)",
		"NB2P": "NBA Pro 99 (E)",
		"NWZP": "NBA In the Zone 2000 (E)",
		"NWZE": "NBA In the Zone 2000 (U)",
		"NJAP": "NBA Jam 2000 (E)",
		"NJAE": "NBA Jam 2000 (U)",
		"NB9P": "NBA Jam 99 (E)",
		"NB9E": "NBA Jam 99 (U)",
		"NNLP": "NBA Live 2000 (E)",
		"NNLE": "NBA Live 2000 (U)",
		"N9BP": "NBA Live 99 (E)",
		"N9BE": "NBA Live 99 (U)",
		"NSOE": "NBA Showtime - NBA on NBC (U)",
		"NEVJ": "Neon Genesis Evangelion (J)",
		"NRIP": "New Tetris, The (E)",
		"NRIE": "New Tetris, The (U)",
		"NT6J": "Tetris 64 (J)",
		"NBZE": "NFL Blitz (U)",
		"NSZE": "NFL Blitz - Special Edition (U)",
		"NBIE": "NFL Blitz 2000 (U)",
		"NFBE": "NFL Blitz 2001 (U)",
		"NQBP": "NFL Quarterback Club 2000 (E)",
		"NQBE": "NFL Quarterback Club 2000 (U)",
		"NQCE": "NFL Quarterback Club 2001 (U)",
		"NQ8P": "NFL Quarterback Club 98 (E)",
		"NQ8E": "NFL Quarterback Club 98 (U)",
		"NQ9P": "NFL Quarterback Club 99 (E)",
		"NQ9E": "NFL Quarterback Club 99 (U)",
		"N9HP": "NHL 99 (E)",
		"N9HE": "NHL 99 (U)",
		"NHOE": "NHL Blades of Steel '99 (U)",
		"NHOP": "NHL Pro 99 (E)",
		"NHLP": "NHL Breakaway 98 (E)",
		"NHLE": "NHL Breakaway 98 (U)",
		"NH9P": "NHL Breakaway 99 (E)",
		"NH9E": "NHL Breakaway 99 (U)",
		"NNCE": "Nightmare Creatures (U)",
		"NHBJ": "Nintama Rantarou 64 Game Gallery (J)",
		"NCEP": "Nuclear Strike 64 (E)",
		"NCED": "Nuclear Strike 64 (G)",
		"NCEE": "Nuclear Strike 64 (U)",
		"NUTJ": "Nushi Tsuri 64 (J)",
		"NUMJ": "Nushi Tsuri 64 - Shiokaze ni Notte (J)",
		"NTDP": "O.D.T. (E)",
		"NTDE": "O.D.T. (U)",
		"NOFP": "Off Road Challenge (E)",
		"ROAD": "Off Road Challenge (E)",
		"NOFE": "Off Road Challenge (U)",
		"NOBJ": "Ogre Battle 64 - Person of Lordly Caliber (J)",
		"NOBE": "Ogre Battle 64 - Person of Lordly Caliber (U)",
		"NHNP": "Olympic Hockey Nagano '98 (E)",
		"NHNJ": "Olympic Hockey Nagano '98 (J)",
		"NHNE": "Olympic Hockey Nagano '98 (U)",
		"NOMJ": "Onegai Monsters (J)",
		"NPCJ": "Pachinko 365 Nichi (J)",
		"NMQJ": "Mario Story (J)",
		"NMQP": "Paper Mario (E)",
		"NMQE": "Paper Mario (U)",
		"NYPP": "Paperboy (E)",
		"NYPE": "Paperboy (U)",
		"NPPJ": "Parlor! Pro 64 - Pachinko Jikki Simulation Game (J)",
		"NUBJ": "PD Ultraman Battle Collection 64 (J)",
		"NCRJ": "Choro Q 64 (J)",
		"NCRP": "Penny Racers (E)",
		"NCRE": "Penny Racers (U)",
		"NPDP": "Perfect Dark (E)",
		"NPDJ": "Perfect Dark (J)",
		"NPDE": "Perfect Dark (U)",
		"NEAP": "PGA European Tour (E)",
		"NEAE": "PGA European Tour (U)",
		"NPWP": "Pilotwings 64 (E)",
		"NPWJ": "Pilotwings 64 (J)",
		"NPWE": "Pilotwings 64 (U)",
		"CPSJ": "Pocket Monsters Stadium (J)",
		"NPNP": "Pokemon Puzzle League (E)",
		"NPNF": "Pokemon Puzzle League (F)",
		"NPND": "Pokemon Puzzle League (G)",
		"NPNE": "Pokemon Puzzle League (U)",
		"NPFJ": "Pocket Monsters Snap (J)",
		"NPFU": "Pokemon Snap (A)",
		"NPFP": "Pokemon Snap (E)",
		"NPFF": "Pokemon Snap (F)",
		"NPFD": "Pokemon Snap (G)",
		"NPFI": "Pokemon Snap (I)",
		"NPFS": "Pokemon Snap (S)",
		"NPFE": "Pokemon Snap (U)",
		"NPHE": "Pokemon Snap Station (U)",
		"CP2J": "Pocket Monsters Stadium 2 (J)",
		"NPOP": "Pokemon Stadium (E)",
		"NPOF": "Pokemon Stadium (F)",
		"NPOD": "Pokemon Stadium (G)",
		"NPOI": "Pokemon Stadium (I)",
		"NPOS": "Pokemon Stadium (S)",
		"NPOE": "Pokemon Stadium (U)",
		"NP3J": "Pocket Monsters Stadium Kin Gin (J)",
		"NP3P": "Pokemon Stadium 2 (E)",
		"NP3F": "Pokemon Stadium 2 (F)",
		"NP3D": "Pokemon Stadium 2 (G)",
		"NP3I": "Pokemon Stadium 2 (I)",
		"NP3S": "Pokemon Stadium 2 (S)",
		"NP3E": "Pokemon Stadium 2 (U)",
		"NPXE": "Polaris SnoCross (U)",
		"NPLJ": "Power League Baseball 64 (J)",
		"NPUP": "Power Rangers - Lightspeed Rescue (E)",
		"NPUE": "Power Rangers - Lightspeed Rescue (U)",
		"NPMP": "Premier Manager 64 (E)",
		"NKMJ": "Pro Mahjong Kiwame 64 (J)",
		"NNRJ": "Pro Mahjong Tsuwamono 64 - Jansou Battle ni Chousen (J)",
		"NSME": "Super Mario 64 (U)",
		"NRXE": "Robotron 64 (U)",
		"NPTJ": "Puyo Puyo 4 - Puyo Puyo Party (J)",
		"NPYJ": "Puyo Puyo Sun 64 (J)",
		"NQKP": "Quake 64 (E)",
		"NQKE": "Quake 64 (U)",
		"NQ2P": "Quake II (E)",
		"NQ2E": "Quake II (U)",
		"NETJ": "Eltale Monsters (J)",
		"NETP": "Holy Magic Century (E)",
		"NETF": "Holy Magic Century (F)",
		"NETD": "Holy Magic Century (G)",
		"NETE": "Quest 64 (U)",
		"NKRP": "Rakuga Kids (E)",
		"NKRJ": "Rakuga Kids (J)",
		"NRAJ": "Rally '99 (J)",
		"NWQE": "Rally Challenge 2000 (U)",
		"NRPP": "Rampage - World Tour (E)",
		"NRPE": "Rampage - World Tour (U)",
		"N2PP": "Rampage 2 - Universal Tour (E)",
		"N2PE": "Rampage 2 - Universal Tour (U)",
		"NRTP": "Rat Attack (E)",
		"NRTE": "Rat Attack (U)",
		"NY2P": "Rayman 2 - The Great Escape (E)",
		"NY2E": "Rayman 2 - The Great Escape (U)",
		"NFQE": "Razor Freestyle Scooter (U)",
		"NRVP": "Re-Volt (E)",
		"NRVE": "Re-Volt (U)",
		"NRDP": "Ready 2 Rumble Boxing (E)",
		"NRDE": "Ready 2 Rumble Boxing (U)",
		"N22E": "Ready 2 Rumble Boxing - Round 2 (U)",
		"NB5J": "Biohazard 2 (J)",
		"NREP": "Resident Evil 2 (E)",
		"NREE": "Resident Evil 2 (U)",
		"NROP": "Road Rash 64 (E)",
		"NROE": "Road Rash 64 (U)",
		"NRRP": "Roadsters Trophy (E)",
		"NRRE": "Roadsters Trophy (U)",
		"NR7J": "Robot Ponkotsu 64 - 7tsu no Umi no Caramel (J)",
		"NRXP": "Robotron 64 (E)",
		"NSUP": "Rocket - Robot on Wheels (E)",
		"NSUE": "Rocket - Robot on Wheels (U)",
		"NRZP": "RR64 - Ridge Racer 64 (E)",
		"NRZE": "RR64 - Ridge Racer 64 (U)",
		"NRGF": "Les Razmoket - La Chasse Aux Tresors (F)",
		"NRGD": "Rugrats - Die grosse Schatzsuche (G)",
		"NRGE": "Rugrats - Scavenger Hunt (U)",
		"NRGP": "Rugrats - Treasure Hunt (E)",
		"NRKP": "Rugrats in Paris - The Movie (E)",
		"NRKE": "Rugrats in Paris - The Movie (U)",
		"NR2P": "Rush 2 - Extreme Racing USA (E)",
		"NR2E": "Rush 2 - Extreme Racing USA (U)",
		"NCSP": "S.C.A.R.S. (E)",
		"NCSE": "S.C.A.R.S. (U)",
		"NSHJ": "Saikyou Habu Shougi (J)",
		"NSFP": "San Francisco Rush - Extreme Racing (E)",
		"NSFE": "San Francisco Rush - Extreme Racing (U)",
		"NRUP": "San Francisco Rush 2049 (E)",
		"NRUE": "San Francisco Rush 2049 (U)",
		"NSYP": "Scooby-Doo! - Classic Creep Capers (E)",
		"NSYE": "Scooby-Doo! - Classic Creep Capers (U)",
		"NDCJ": "SD Hiryuu no Ken Densetsu (J)",
		"NSDP": "Shadow Man (E)",
		"NSDF": "Shadow Man (F)",
		"NSDD": "Shadow Man (G)",
		"NSDE": "Shadow Man (U)",
		"NSGY": "Shadowgate 64 - Trials Of The Four Towers (E)",
		"NSGX": "Shadowgate 64 - Trials Of The Four Towers (E)",
		"NSGP": "Shadowgate 64 - Trials Of The Four Towers (E)",
		"NSGJ": "Shadowgate 64 - Trials Of The Four Towers (J)",
		"NSGE": "Shadowgate 64 - Trials Of The Four Towers (U)",
		"NIBJ": "Shigesato Itoi's No. 1 Bass Fishing! Definitive Edition (J)",
		"NTOJ": "Shin Nihon Pro Wrestling - Toukon Road - Brave Spirits (J)",
		"NT3J": "Shin Nihon Pro Wrestling - Toukon Road 2 - The Next Generation (J)",
		"NS2J": "Sim City 2000 (J)",
		"NSKJ": "Snobow Kids (J)",
		"NSKP": "Snowboard Kids (E)",
		"NSKE": "Snowboard Kids (U)",
		"NK2J": "Chou Snobow Kids (J)",
		"NK2P": "Snowboard Kids 2 (E)",
		"NK2E": "Snowboard Kids 2 (U)",
		"NDTP": "South Park (E)",
		"NDTD": "South Park (G)",
		"NDTE": "South Park (U)",
		"NCYP": "South Park - Chef's Luv Shack (E)",
		"NCYE": "South Park - Chef's Luv Shack (U)",
		"NPRP": "South Park Rally (E)",
		"NPRE": "South Park Rally (U)",
		"NIVE": "Space Invaders (U)",
		"NSVP": "Space Station Silicon Valley (U)",
		"NSVJ": "Space Station Silicon Valley (J)",
		"NSVE": "Space Station Silicon Valley (U)",
		"NSLE": "Spider-Man (U)",
		"NFXU": "Lylat Wars (A)",
		"NFXP": "Lylat Wars (E)",
		"NFXJ": "Star Fox 64 (J)",
		"NFXE": "Star Fox 64 (U)",
		"NS6J": "Star Soldier - Vanishing Earth (J)",
		"NS6E": "Star Soldier - Vanishing Earth (U)",
		"NRSP": "Star Wars - Rogue Squadron (E)",
		"NRSE": "Star Wars - Rogue Squadron (U)",
		"NRSJ": "Star Wars - Shutsugeki! Rogue Chuutai (J)",
		"NSWP": "Star Wars - Shadows of the Empire (E)",
		"NSWE": "Star Wars - Shadows of the Empire (U)",
		"NSWJ": "Star Wars - Teikoku no Kage (J)",
		"NNAP": "Star Wars Episode I - Battle for Naboo (E)",
		"NNAE": "Star Wars Episode I - Battle for Naboo (U)",
		"NEPP": "Star Wars Episode I - Racer (E)",
		"NEPJ": "Star Wars Episode I - Racer (J)",
		"NEPE": "Star Wars Episode I - Racer (U)",
		"NSQP": "StarCraft 64 (E)",
		"NSQE": "StarCraft 64 (U)",
		"NSCP": "Starshot - Space Circus Fever (E)",
		"NSCE": "Starshot - Space Circus Fever (U)",
		"NR3E": "Stunt Racer 64 (U)",
		"NB6J": "Super B-Daman - Battle Phoenix 64 (J)",
		"NBWJ": "Super Bowling (J)",
		"NBWE": "Super Bowling 64 (U)",
		"NSMP": "Super Mario 64 (E)",
		"NSMJ": "Super Mario 64 (J)",
		"NSSJ": "Super Robot Spirits (J)",
		"NS4J": "Super Robot Taisen 64 (J)",
		"NALJ": "Nintendo All-Star! Dairantou Smash Brothers (J)",
		"NALU": "Super Smash Bros. (A)",
		"NALP": "Super Smash Bros. (E)",
		"NALE": "Super Smash Bros. (U)",
		"NSXP": "Supercross 2000 (E)",
		"NSXE": "Supercross 2000 (U)",
		"NSPP": "Superman (E)",
		"NSPE": "Superman (U)",
		"NPZJ": "Susume! Taisen Puzzle Dama Toukon! Marumata Chou (J)",
		"NTXP": "Taz Express (E)",
		"NTPP": "Tetrisphere (E)",
		"NTPE": "Tetrisphere (U)",
		"NT9P": "Tigger's Honey Hunt (E)",
		"NT9E": "Tigger's Honey Hunt (U)",
		"NTJP": "Tom and Jerry in Fists of Furry (E)",
		"NTJE": "Tom and Jerry in Fists of Furry (U)",
		"NR6P": "Tom Clancy's Rainbow Six (E)",
		"NR6F": "Tom Clancy's Rainbow Six (F)",
		"NR6D": "Tom Clancy's Rainbow Six (G)",
		"NR6E": "Tom Clancy's Rainbow Six (U)",
		"NTTP": "Tonic Trouble (E)",
		"NTTE": "Tonic Trouble (U)",
		"NTFP": "Tony Hawk's Pro Skater (E)",
		"NTFE": "Tony Hawk's Pro Skater (U)",
		"NTQP": "Tony Hawk's Pro Skater 2 (E)",
		"NTQE": "Tony Hawk's Pro Skater 2 (U)",
		"N3TE": "Tony Hawk's Pro Skater 3 (U)",
		"NGBJ": "Top Gear Hyper Bike (J)",
		"NRCP": "Top Gear Overdrive (E)",
		"NRCJ": "Top Gear Overdrive (J)",
		"NRCE": "Top Gear Overdrive (U)",
		"NTRP": "Top Gear Rally (E)",
		"NTRJ": "Top Gear Rally (J)",
		"NGRE": "Top Gear Rally (U)",
		"NL2X": "TG Rally 2 (E)",
		"NL2P": "Top Gear Rally 2 (E)",
		"NL2J": "Top Gear Rally 2 (J)",
		"NL2E": "Top Gear Rally 2 (U)",
		"NTHP": "Toy Story 2 (E)",
		"NTHF": "Toy Story 2 (F)",
		"NTHD": "Toy Story 2 (G)",
		"NTHE": "Toy Story 2 (U)",
		"NTBJ": "Transformers - Beast Wars Metals 64 (J)",
		"NOHE": "Transformers - Beast Wars Transmetal (U)",
		"N3PE": "Triple Play 2000 (U)",
		"NGUJ": "Tsumi to Batsu - Hoshi no Keishousha (J)",
		"NTUJ": "Tokisora Senshi Turok (J)",
		"NTUP": "Turok - Dinosaur Hunter (E)",
		"NTUD": "Turok - Dinosaur Hunter (G)",
		"NTUE": "Turok - Dinosaur Hunter (U)",
		"NRWD": "Turok - Legenden des Verlorenen Landes (G)",
		"NRWX": "Turok - Rage Wars (E)",
		"NRWP": "Turok - Rage Wars (E)",
		"NRWE": "Turok - Rage Wars (U)",
		"NTYP": "Turok 2 - Seeds of Evil (E)",
		"NT2X": "Turok 2 - Seeds of Evil (E)",
		"NT2P": "Turok 2 - Seeds of Evil (E)",
		"NT2D": "Turok 2 - Seeds of Evil (G)",
		"NTYE": "Turok 2 - Seeds of Evil (U)",
		"NT2E": "Turok 2 - Seeds of Evil (U)",
		"NT2J": "Violence Killer - Turok New Generation (J)",
		"NTKP": "Turok 3 - Shadow of Oblivion (E)",
		"NSED": "Turok 3 - Shadow of Oblivion (G)",
		"NTKE": "Turok 3 - Shadow of Oblivion (U)",
		"NSBJ": "King Hill 64 - Extreme Snowboarding (J)",
		"NSBP": "Twisted Edge Extreme Snowboarding (E)",
		"NSBE": "Twisted Edge Extreme Snowboarding (U)",
		"NIRJ": "Uchhannanchan no Hono no Challenger - Denryu IraIra Bou (J)",
		"NVLP": "V-Rally Edition 99 (E)",
		"NVYJ": "V-Rally Edition 99 (J)",
		"NVLE": "V-Rally Edition 99 (U)",
		"NV8P": "Vigilante 8 (E)",
		"NV8F": "Vigilante 8 (F)",
		"NV8D": "Vigilante 8 (G)",
		"NV8E": "Vigilante 8 (U)",
		"NVGP": "Vigilante 8 - 2nd Offence (E)",
		"NVGE": "Vigilante 8 - 2nd Offense (U)",
		"NVCP": "Virtual Chess 64 (E)",
		"NVCE": "Virtual Chess 64 (U)",
		"NVRP": "Virtual Pool 64 (E)",
		"NVRE": "Virtual Pool 64 (U)",
		"NVPJ": "Virtual Pro Wrestling 64 (J)",
		"NM9J": "Harukanaru Augusta Masters 98 (J)",
		"NWLP": "Waialae Country Club - True Golf Classics (E)",
		"NWLE": "Waialae Country Club - True Golf Classics (U)",
		"NWAP": "War Gods (E)",
		"NWAE": "War Gods (U)",
		"NWRP": "Wave Race 64 (E)",
		"NWRJ": "Wave Race 64 (J)",
		"NWRE": "Wave Race 64 (U)",
		"NWGP": "Wayne Gretzky's 3D Hockey (E)",
		"NWGJ": "Wayne Gretzky's 3D Hockey (J)",
		"NWGE": "Wayne Gretzky's 3D Hockey (U)",
		"NW8P": "Wayne Gretzky's 3D Hockey '98 (E)",
		"NW8E": "Wayne Gretzky's 3D Hockey '98 (U)",
		"NWVE": "WCW Backstage Assault (U)",
		"NWMP": "WCW Mayhem (E)",
		"NWME": "WCW Mayhem (U)",
		"NW3E": "WCW Nitro (U)",
		"NWNP": "WCW vs. nWo - World Tour (E)",
		"NWNE": "WCW vs. nWo - World Tour (U)",
		"NW2P": "WCW-nWo Revenge (E)",
		"NW2E": "WCW-nWo Revenge (U)",
		"NWTP": "Wetrix (E)",
		"NWTJ": "Wetrix (J)",
		"NWTE": "Wetrix (U)",
		"NWFE": "Wheel of Fortune (U)",
		"NWDP": "Operation WinBack (E)",
		"NWDJ": "WinBack (J)",
		"NWDE": "WinBack - Covert Operations (U)",
		"NWPP": "Wipeout 64 (E)",
		"NWPE": "Wipeout 64 (U)",
		"NJ2J": "Wonder Project J2 - Koruro no Mori no Jozet (J)",
		"N8WP": "World Cup 98 (E)",
		"N8WE": "World Cup 98 (U)",
		"NWOP": "World Driver Championship (E)",
		"NWOE": "World Driver Championship (U)",
		"NWUP": "Worms - Armageddon (E)",
		"NADE": "Worms - Armageddon (U)",
		"NWWP": "WWF - War Zone (E)",
		"NWWE": "WWF - War Zone (U)",
		"NTIP": "WWF Attitude (E)",
		"NTID": "WWF Attitude (G)",
		"NTIE": "WWF Attitude (U)",
		"NW4P": "WWF No Mercy (E)",
		"NW4E": "WWF No Mercy (U)",
		"NA2J": "Virtual Pro Wrestling 2 - Oudou Keishou (J)",
		"NWXP": "WWF WrestleMania 2000 (E)",
		"NWXJ": "WWF WrestleMania 2000 (J)",
		"NWXE": "WWF WrestleMania 2000 (U)",
		"NXFP": "Xena Warrior Princess - The Talisman of Fate (E)",
		"NXFE": "Xena Warrior Princess - The Talisman of Fate (U)",
		"NYKJ": "Yakouchuu II - Satsujin Kouru (J)",
		"NYSJ": "Yoshi Story (J)",
		"NYSE": "Yoshi's Story (U)",
		"NYSP": "Yoshi's Story (U)",
		"NMZJ": "Zool - Majou Tsukai Densetsu (J)"
	};

	var pub = {
		init: UIHandler.initApp
	};
	return pub;
}());


	window.addEventListener("load", function() {
		MPKEdit.init();
	});
