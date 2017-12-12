(function MPKParser() {
    // temporary globals
    var curfile = undefined;
    var tmpComments = [], isExtended;

    /* -----------------------------------------------
    function: resize(data)
      resize input mpk data to a fixed 32768 bytes.
      mostly for handling truncated input files.
    */
    var resize = function(data) {
        var newdata = new Uint8Array(32768);
        for(var i = 0; i < data.length; i++) newdata[i] = data[i];
        return newdata;
    };

    /* -----------------------------------------------
    function: arrstr(arr, start, end)
      convert an array of bytes to a string and vice versa.
    */
    var arrstr = function(arr, start, end) {
        if(arr.trim) {
            arr = arr.slice(start || 0, end || arr.length);
            return Array.apply(null, Array(arr.length)).map(function(x, i){return arr[i].charCodeAt()});
        } else {
            var output = arr[arr instanceof Array ? "slice" : "subarray"](start || 0, end || arr.length);
            return String.fromCharCode.apply(null, output);
        }
    };

    /* -----------------------------------------------
    object: n64code{}
      a translation table for the N64 font code used
      in note name and note extension.
    */
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

    /* -----------------------------------------------
    function: isNote(data)
      determine whether the file loaded is a note file.
    */
    var isNote = function(data) {
        isExtended = arrstr(data, 1, 8) === "MPKNote"; // check for our MPKNote header
        var noteOfs = 0; // noteOfs is the size of the MPKNote block to trim for 0xCAFE.
        if(isExtended) {
            var ver = data[0];
            var len = data[15];
            noteOfs = (ver === 1) ? (16+16*len) : 16+256; // fallback for version 0
        }
        // Rely on noteOfs to find 0xCAFE in extended files.
        var magicCheck = 0xCAFE === data[noteOfs + 0x07] + (data[noteOfs + 0x06] << 8);
        var pageCheck = 0 === data.subarray(noteOfs + 32).length % 256;
        console.log("isNote", isExtended, magicCheck, pageCheck);
        return magicCheck && pageCheck;
    };

    /* -----------------------------------------------
    function: checkBlock(data, o, state)  TODO : rename checkIdBlock?
      check the header checksum in label area at specified
      offset. utility function for checkHeader()
    */
    var checkBlock = function(data, o, state) {
        var sumX = (data[o + 28] << 8) + data[o + 29];
        var sumY = (data[o + 30] << 8) + data[o + 31];

        var sumA = 0, sumB = 0xFFF2;
        for(var i = 0; i < 28; i += 2) {
            sumA += (data[o + i] << 8) + data[o + i + 1];
            sumA &= 0xFFFF;
        }
        sumB -= sumA;
    
        // many checksums in DexDrive files are incorrect.
        // this detects and fixes the specific issue.
        state[o] = {};
        if(sumY !== sumB && (sumY ^ 0x0C) === sumB && sumX === sumA) {
           sumY ^= 0xC;
           data[o + 31] ^= 0xC;
           state[o].dexdriveFix = true;
        }
        
        state[o].valid = (sumX === sumA && sumY === sumB);
        return (sumX === sumA && sumY === sumB); // this return statement is not used.
    };

    /* -----------------------------------------------
    function: checkHeader(data)
      checks all four checksum sections in header.
      Note: Currently will not overwrite/repair backup slots. Just validates first one and loads first valid backup found, if required.
      AFAIK this is correct libultra behavior. Will have to check... it might be better to just repair any corrupt slots.
    */
    var checkHeader = function(data) {
        var state = {};
        var loc   = [0x20, 0x60, 0x80, 0xC0];
        var firstValid = null;
        // Check all header blocks
        for(var i = 0; i < 4; i++) {
            checkBlock(data, loc[i], state);
            if(state[loc[i]].valid === true && firstValid === null) firstValid = i; // get only first valid
            console.log("Block:", i+1, state[loc[i]].valid);
            if(state[loc[i]].dexdriveFix) console.log("\tDexDrive checksum repaired");
        }
        // Check if FIRST id block is valid
        if(state[0x20].valid === true) return true;
        // Check if a valid backup was found as firstValid, copy to Main
        else if(firstValid !== null) {
            console.info("Using Backup " + firstValid);
            for(var i = 0; i < 0x20; i++) {
                data[loc[0] + i] = data[loc[firstValid] + i];
            }
            return true;
        }
        return false;
    };

    /* -----------------------------------------------
    function: readNotes(data, NoteKeys)
      parses the Note Table. note validity is determined by validIndex condition (5 - 127 range for pointers and
      previous byte must be 0). other methods are inaccurate. pointers are stored in NoteKeys for comparing
      in indexTable parser.
    */
    var readNotes = function(data, NoteKeys) {
        var NoteTable = {};

        for(var i = 0x300; i < 0x500; i += 32) { // iterate over NoteTable
            var p = data[i + 0x07];
            var validIndex = data[i + 0x06] === 0 && p >= 5 && p <= 127; // firstIndex validation
    
            if(validIndex) {
                var id = (i - 0x300) / 32;
                NoteKeys.push(p);
    
                for(var j = 0, noteName = ""; j < 16; j++) {
                    noteName += n64code[data[i + 16 + j]] || "";
                }

                if(data[i + 12] !== 0) { // extension code
                    noteName += ".";
                    noteName += n64code[data[i + 12]] || "";
                    noteName += n64code[data[i + 13]] || "";
                    noteName += n64code[data[i + 14]] || "";
                    noteName += n64code[data[i + 15]] || "";
                }

                if((data[i + 0x08] & 0x02) === 0) {
                    console.info(id, "Fixing required bit 8:2 in note: " + noteName);
                    data[i + 0x08] |= 0x02;
                }

                if (data[i + 10] | data[i + 11]) {
                    console.info("Unused bytes (0x0A-0x0B) are not empty:" + noteName);
                }
                if (data[i + 13] | data[i + 14] | data[i + 15]) {
                    console.info("Note Extension contains data in reserved characters: " + noteName);
                }

                var gameCode = arrstr(data, i, i+4).replace(/\0/g,"-");

                var comment = undefined;
                // Load any temporary comments (DexDrive or insertNote)
                if(tmpComments[id]) {
                    comment = tmpComments[id] || undefined;
                } else if(!curfile) {
                    // Salvage pre-existing comments in NoteTable.
                    comment = (MPKEdit.State.NoteTable[id]||{}).comment || undefined;
                }
                NoteTable[id] = {
                    indexes: p,
                    serial: gameCode,
                    publisher: arrstr(data, i+4, i+6).replace(/\0/g,"-"),
                    noteName: noteName,
                    region: MPKEdit.App.region[gameCode[3]] || "Unknown",
                    media: MPKEdit.App.media[gameCode[0]],
                    comment: comment
                };
            }
        }
        tmpComments = [];
        return NoteTable;
    };

    /* -----------------------------------------------
    function: checkIndexes(data, o, NoteKeys)
      parse and validate the indexTable. compares with NoteKeys array constructed from noteTable.
      argument o (offset) is used to specify backup data offset location in single recursive call.
    */
    var checkIndexes = function(data, o, NoteKeys) {
        try {
            var p, p2;
            var indexEnds = 0;
            var found = {parsed: [], keys: [], values: []};
    
            // Iterate over the IndexTable, checking each index.
            for(var i = o + 0xA; i < o + 0x100; i += 2) {
                p = data[i + 1], p2 = data[i];
    
                if (p2 === 0 && p === 1 || p >= 5 && p <= 127 && p !== 3) { // TODO: Make this condition more readable with brackets?
                    if(p === 1) indexEnds++; // count the number of seq ending markers (0x01).
                    if(p !== 1 && found.values.indexOf(p) > -1) { // There shouldn't be any duplicate indexes.
                        throw "IndexTable contains duplicate index " + "(p="+p+").";
                    }
                    found.values.push(p);         // Think values. List of all valid index sequence values
                    found.keys.push((i - o) / 2); // Think memory addresses. The key/offset location/destination for each value
                }
                else if (p2 !== 0 || p !== 1 && p !== 3 && p < 5 || p > 127) { // TODO: Make this condition more readable with brackets?
                    throw "IndexTable contains illegal value" + "(p="+p+", "+p2+").";
                }
            }
            // filter out the key indexes (start indexes) which should match the NoteTable.
            var keyIndexes = found.keys.filter(function(n) {
                return found.values.indexOf(n) === -1;
            });
            // Count note indexes: Check that NoteKeys/indexEnds/keyIndexes counts are the same.
            var nKeysN = NoteKeys.length, nKeysP = keyIndexes.length;
            if (nKeysN !== nKeysP || nKeysN !== indexEnds) {
                throw "Key index totals do not match (" +nKeysN+", "+nKeysP+", "+indexEnds+")";
            }
            // Check that keyIndexes and NoteKeys report the same values
            for (var i = 0; i < nKeysN; i++) {
                if (NoteKeys.indexOf(keyIndexes[i]) === -1) {
                    throw "A key index doesn't exist in the note table ("+keyIndexes[i]+")";
                }
            }
            // Parse the Key Indexes to derive index sequence.
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
            // Check that parsed indexes and found keys counts are the same.
            // This is to ensure every key found is used in a sequence.
            if(found.parsed.length !== found.keys.length) {
                throw "Number of parsed keys doesn't match found keys. (" +
                found.parsed.length+", "+found.keys.length+")";
            }
            // Check that each found key exists in the parsed list, individually.
            for (var i = 0; i < found.parsed.length; i++) {
                if (found.parsed.indexOf(found.keys[i]) === -1) {
                    throw "A key doesn't exist in the parsed keys. (" +
                        found.keys[i];
                }
            }
            // IndexTable checksum calculate + update.
            // Checksum should NOT be relied on for validation. Valid files may have invalid sums, so validate in other ways.
            for(var i = o+0xA, sum = 0; i < o+0x100; i++, sum &= 0xFF) sum += data[i];
            if (data[o+1] !== sum) {
                console.info(o, "Fixing INODE checksum.", curfile);
                data[o+1] = sum;
            }
    
            // copy IndexTable to the backup slot (OR copy backup to main, depending on `o`)
            p = (o === 0x100) ? 0x200 : 0x100;
            for(i = 0; i < 0x100; i++) {
                data[p + i] = data[o + i];
            }
            return noteIndexes;
        }
        catch(error) { // If main IndexTable is invalid, check backup:
            if(o !== 0x200) { // allows a single recursive call to checkIndexes to check mirror backup.
                console.log("WOOPS... checking INODE backup", curfile);
                return checkIndexes(data, 0x200, NoteKeys);
            }
        }
    };

    /* -----------------------------------------------
    function: getDexNotes(data)
      capture DexDrive note comment strings.
    */
    var getDexNotes = function(data) {
        var strs=[], str="";
        for(var j=0,i = 0x40; i < 0x1040; i++ ) {
            // fix arrstr to support this -- TODO: support WHAT exactly?
            if(data[i] !== 0x00) { str += String.fromCharCode(data[i]); j++ }
            else {
                if(str==="") { strs.push(undefined); } else { strs.push(str); }
                str = "";
                i -= j;
                j = 0;
                i += 255;
            }
        }
        return strs;
    };
    /* -----------------------------------------------
    function: parse(data)
      master parse function. handle DexDrive data, and performs parsing routine.
    */
    var parse = function(data) {
        data = new Uint8Array(data); // should create a copy of the data?
        // Detect DexDrive file
        if(arrstr(data, 0, 11) === "123-456-STD") {
            console.info("DexDrive file detected. Saving notes and stripping header.");
            tmpComments = getDexNotes(data);
            data = data.subarray(0x1040);
        }
        if(!data || checkHeader(data) === false) {
            // cancel if data doesn't exist or header is invalid.
            // in the future perhaps we can ignore header and check for any valid data anyway.
            return false;
        }
        var NoteKeys = []; // shared NoteKeys array. Produced by readNotes, used in checkIndexes.
        var NoteTable = readNotes(data, NoteKeys);
    
        var output = checkIndexes(data, 0x100, NoteKeys);
        if(output) {
            var usedPages = 0;
            var usedNotes = 0;
            for(var i = 0; i < Object.keys(NoteTable).length; i++) { // iterate over notes in NoteTable.
                var _note = NoteTable[Object.keys(NoteTable)[i]]; // get Note object.

                _note.indexes = output[_note.indexes]; // assign the index sequence to obj.

                // Calculate hash of raw data. Gather all page data into array (fileOut).
                for(var w = 0, fileOut = []; w < _note.indexes.length; w++) {
                    var pageAddress = _note.indexes[w] * 0x100;
                    for(var j = 0; j < 0x100; j++) {
                        fileOut.push(data[pageAddress + j]);
                    }
                }
                _note.cyrb32  = MPKEdit.cyrb32(fileOut);

                usedPages += _note.indexes.length;
                usedNotes++;
            }
    
            return {
                NoteTable: NoteTable,
                usedPages: usedPages,
                usedNotes: usedNotes,
                data: data
            };
        }
        else {
            return false;
        }
    };

    /* -----------------------------------------------
    function: insertNote(data)
      insert note data into currently opened MPK file.
    */
    var insertNote = function(data) {
        // Check if note to insert is an extended note file (has comments).
        if(isExtended) {
            isExtended = undefined;
            var len = 16;
            var cmt = "";
            var ver = data[0];
            var cmtlen = data[15];

            if(ver === 0) { // allow import of obsolete version0 files.
                len += 256;
                var end = data.subarray(16, len).indexOf(0);
                end = end > -1 ? (16 + end) : len;
                cmt = new TextDecoder("iso-8859-1").decode(data.subarray(16, end));
            }
            else if(ver === 1 && cmtlen > 0) { // allow import of version1 files.
                len += cmtlen * 16;
                var end = data.subarray(16, len).indexOf(0);
                end = end > -1 ? (16 + end) : len;
                cmt = new TextDecoder("utf-8").decode(data.subarray(16, end));
            }
            data = data.subarray(len); // Strip comment data before proceeding.
        }

        var tmpdata = new Uint8Array(MPKEdit.State.data); // create tmp State.data copy to parse later.

        var noteData = data.subarray(0, 32);
        var pageData = data.subarray(32);
        var pageCount = pageData.length / 256;
        var newPages = MPKEdit.State.usedPages + pageCount; // Pre-calc used page count before import (to make sure it fits)
    
        if(newPages <= 123 && MPKEdit.State.usedNotes < 16) { // if there's enough space..
            var freeIndexes = [];
            for(var i = 0xA; i < 0x100; i += 2) {
                if(freeIndexes.length === pageCount) {
                    break;
                }
                if(tmpdata[0x100 + i + 1] === 3) { // allocate list of free indexes for import destination.
                    freeIndexes.push(i / 2); 
                }
            }
    
            noteData[0x06] = 0; // replace 0xCAFE with first free index.
            noteData[0x07] = freeIndexes[0];
    
            for(var i = 0; i < freeIndexes.length; i++) {
                var target1 = 0x100 + (2 * freeIndexes[i] + 1);
                var target2 = 0x100 * freeIndexes[i];
    
                if(i === freeIndexes.length - 1) { // 0x01 for last index in sequence.
                    tmpdata[target1] = 0x01; 
                }
                else {
                    tmpdata[target1] = freeIndexes[i + 1]; // write the index sequence in IndexTable
                }
    
                for(var j = 0; j < 0x100; j++) {
                    tmpdata[target2 + j] = pageData[0x100 * i + j]; // write the page data sequence.
                }
            }
    
            for(var i = 0; i < 16; i++) { // Write 32-byte NoteEntry to NoteTable.
                if(MPKEdit.State.NoteTable[i] === undefined) {
                    // tmpComments must be used here because saving directly to MPKEdit.State
                    // will cause comments to be lost when MPK data is re-parsed.
                    if(cmt) tmpComments[i] = cmt; // TODO: This is POSSIBLY not needed anymore, due to presence of MPKCmts block in State.data???
                    var target = 0x300 + i * 32;
                    for(var j = 0; j < 32; j++) {
                        tmpdata[target + j] = noteData[j];
                    }
                    break;
                }
            }
    
            MPKEdit.Parser(tmpdata);
        } else {
            if(MPKEdit.State.usedNotes >= 16) {
                console.warn("No note slots available to insert note.");
            }
            if(newPages > 123) {
                console.warn("Not enough pages left to insert note.");
            }
        }
    };

    console.log("INFO: MPKEdit.Parser ready");

    /* -----------------------------------------------
    function: MPKEdit.Parser(data, filename)
      exposed interface to the parser. data array and
      filename provided.
    */
    MPKEdit.Parser = function(data, filename) {
        console.log("Loading file %c"+filename+"...", "font-weight:bold");
        curfile = filename;

        if(MPKEdit.State.data && isNote(data)) { // check if data opened is a note file to be imported
            insertNote(data);
        } else {
            var result = parse(data); // attempt to parse data as MPK.
            if(!result) {
                console.warn("ERROR: Data in file provided is not valid: " + filename);
                return false;
            }
            // This is all MPKCmts stuff? -- TODO: Add comments (should this even be here? seperate function?)
            if(result.data.length > 32768) {
                var bl0c = result.data.subarray(32768);
                var hasCmts = arrstr(bl0c, 1, 8) === "MPKCmts";
                var cmtCount = bl0c[15];
                var crc8_1 = bl0c[0];
                var crc8_2 = MPKEdit.crc8(result.data.subarray(32768+1));
                var isValid = hasCmts && (crc8_1===crc8_2);

                if(isValid) {
                    console.log(`MPKCmts block found, attempting to parse ${cmtCount} comment(s)...`);
                    var foundCount = 0;
                    // parsing the cmt block
                    for(var ptr = 16, i = 0; i < cmtCount; i++) {
                        var magic  = bl0c[ptr + 0];
                        if(magic !== 0xA5) {
                            console.error(`MPKCmts Error: Can't find 0xA5 magic (${magic}). Aborting load.`);
                            break;
                        }
                        foundCount++;
                        var node   = bl0c[ptr + 1];
                        var crc8   = bl0c[ptr + 2];
                        var cmtLen = (bl0c[ptr + 3] << 8) + bl0c[ptr+4];
                        if(cmtLen > 4080 || cmtLen === 0) {
                            console.error(`MPKCmts Error: Invalid comment length (${cmtLen}). Aborting load.`);
                            break;
                        }
                        var cmtStr = new TextDecoder("utf-8").decode(bl0c.subarray(ptr + 5, ptr + 5 + cmtLen));
                        ptr += 5 + cmtLen;

                        // Check if comment's specified node exists, and if the CRC-8 is valid.
                        var nodeFound = false, noteOfs;
                        for(var j = 0; j < 16; j++) {
                            var addr = 0x300 + j*32;
                            var node2 = result.data[addr+7];
                            var crc8arr = MPKEdit.crc8(result.data.subarray(addr, addr+8));
                            if(node === node2 && crc8 === crc8arr) {
                                nodeFound = true; noteOfs = j;
                                break;
                            }
                        }
                        if(nodeFound) {
                            console.log(`Comment ${i} points to save note ${noteOfs} (index ${node})`);
                            result.NoteTable[noteOfs].comment = cmtStr;
                        } else {
                            console.warn(`Hmm, Comment ${i} exists, but has no associated Node.`);
                        }
                    }
                    if(foundCount !== cmtCount) {
                        console.error(`MPKCmts Error: The number of found comments doesn't match stored amount value. (${foundCount} vs ${cmtCount})`);
                    }
                }
                else if(hasCmts) {
                    console.error(`MPKCmts Error: MPKCmts block is invalid or has wrong size.`);
                }
            }

            // If result.data is NOT 32KB, resize it to 32KB. Could this interfere with the MPKCmts block?
            MPKEdit.State.data = result.data !== 32768 ? resize(result.data) : result.data;
            MPKEdit.State.NoteTable = result.NoteTable;
            MPKEdit.State.usedNotes = result.usedNotes;
            MPKEdit.State.usedPages = result.usedPages;
            MPKEdit.State.filename = filename || MPKEdit.State.filename;

            // Update State.Entry with fsys tmpEntry. Occurs only when loading .MPK via fsys.
            if(MPKEdit.App.usefsys && filename) {
                MPKEdit.State.Entry = MPKEdit.App.tmpEntry;
            }

            MPKEdit.App.updateUI();
        }
    };
}());
