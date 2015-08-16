(function MPKParser(MPKEdit) {
	var resize = function(data) {
		var newdata = new Uint8Array(32768);
		for(var i = 0; i < data.length; i++) {
			newdata[i] = data[i];
		}
		return newdata;
	};

	var arrstr = function(arr, start, end) {
    	arr = arr || [];
    	start = start || 0;
    	end = end || arr.length;
	
    	for(var str = "", i = start; i < end; i++) {
    	    var p = arr[i];
    	    str += String.fromCharCode(p);
    	}
	
    	return str;
	};

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

	var isNote = function(data) {
		var a = 0xCAFE === data[0x07] + (data[0x06] << 8);
		var b = 0 === data.subarray(32).length % 256;
		return a && b;
	};

	var sumIsValid = function(data, o) {
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
	};

	var checkHeader = function(data) {
		var loc = [0x20, 0x60, 0x80, 0xC0];
		var lastValidLoc = -1;
	
		for(var i = 0, chk; i < loc.length; i++) {
			chk = sumIsValid(data, loc[i]);
			if(chk) {
				lastValidLoc = loc[i];
			}
		}
	
		for(var i = 0; i < loc.length; i++) {
			var currentLoc = loc[i];
			chk = sumIsValid(data, currentLoc);
	
			if(lastValidLoc > -1 && chk === false) {
				for(var j = 0; j < 32; j++) {
					data[currentLoc + j] = data[lastValidLoc + j];
				}
				chk = sumIsValid(data, currentLoc);
			}
			loc[i] = chk;
		}
	
		return loc[0] && loc[1] && loc[2] && loc[3];
	};

	var NoteKeys, result = {};

	var readNotes = function(data, NoteKeys) {
		var NoteTable = {};
		var gaplessData = [];

		for(var i = 0x300; i < 0x500; i += 32) {
			var p = data[i + 0x07];
			var validIndex = p>=5 && p<=127 && data[i + 0x06]===0;
	
			if(validIndex) {
				for(var j = 0; j < 32; j++) {
					gaplessData.push(data[i+j]);
				}
			}
		}

		for(var i = 0x300; i < 0x500; i++) {
			data[i] = gaplessData[i-0x300];
		}

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
	};

	var checkIndexes = function(data, o, NoteKeys) {
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
			if(o !== 0x200) {
				return checkIndexes(data, 0x200, NoteKeys);
			}
		}
	};

	var parse = function(data) {
		data = new Uint8Array(data);

		if(arrstr(data, 0, 11) === "123-456-STD") {
			data = data.subarray(0x1040);
		}
		if(!data || checkHeader(data) === false) {
			return false;
		}
		var NoteKeys = [];
		var NoteTable = readNotes(data, NoteKeys);
	
		var output = checkIndexes(data, 0x100, NoteKeys);

		if(output) {
			var usedPages = 0;
			var usedNotes = 0;
			for(var i = 0; i < Object.keys(NoteTable).length; i++) {
				var _note = NoteTable[Object.keys(NoteTable)[i]];
				_note.indexes = output[_note.indexes];
	
				usedPages += _note.indexes.length;
				usedNotes++;
			}
	
			result.NoteTable = NoteTable;
			result.usedPages = usedPages;
			result.usedNotes = usedNotes;
			result.data = data;
			return true;
		}
		else {
			return false;
		}
	};

	console.log("INFO: MPKEdit.Parser ready");

	MPKEdit.Parser = function(data, filename) {
		if(typeof data === "string" && typeof filename === "object") {	
			MPKEdit.Parser(new Uint8Array(filename.target.result), data);
			return;
		}
		
		if(this.State.data && isNote(data)) {
			this.State.insert(data);
		} else if(parse(data)) {
			this.State.data = result.data !== 32768 ? resize(result.data) : result.data;
			this.State.NoteTable = result.NoteTable;
			this.State.usedNotes = result.usedNotes;
			this.State.usedPages = result.usedPages;
			this.State.filename = filename || this.State.filename;

			if(this.App.usefsys && filename) {
				this.State.Entry = this.App.tmpEntry;
			}

			this.App.updateUI();
			//console.log(this.State);
		} else {
			console.warn("ERROR: Data invalid: " + filename, this.State.$ || "");
		}
	};
	
}(MPKEdit));
