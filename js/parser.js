(function MPKParser() {
    // temporary globals
    let curfile = undefined;
    let tmpComments = [], isExtended;

    /* -----------------------------------------------
    function: resize(data)
      resize input mpk data to a fixed 32768 bytes.
      mostly for handling truncated input files.
    */
    const resize = function(data) {
        const newdata = new Uint8Array(32768);
        for(let i = 0; i < data.length; i++) newdata[i] = data[i];
        return newdata;
    };

    /* -----------------------------------------------
    function: arrstr(arr, start, end)
      convert an array of bytes to a string and vice versa.
    */
    const arrstr = function(arr, start, end) {
        if(arr.trim) {
            arr = arr.slice(start || 0, end || arr.length);
            return Array.apply(null, Array(arr.length)).map(function(x, i){return arr[i].charCodeAt()});
        } else {
            const output = arr[arr instanceof Array ? "slice" : "subarray"](start || 0, end || arr.length);
            return String.fromCharCode.apply(null, output);
        }
    };

    /* -----------------------------------------------
    object: n64code{}
      a translation table for the N64 font code used
      in note name and note extension.
    */
    const n64code = {
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
    const isNote = function(data) {
        isExtended = arrstr(data, 1, 8) === "MPKNote"; // check for our MPKNote header
        let noteOfs = 0; // noteOfs is the size of the MPKNote block to trim for 0xCAFE.
        if(isExtended) {
            const ver = data[0];
            const len = data[15];
            noteOfs = (ver === 1) ? (16+16*len) : 16+256; // fallback for version 0
        }
        // Rely on noteOfs to find 0xCAFE in extended files.
        const magicCheck = 0xCAFE === data[noteOfs + 0x07] + (data[noteOfs + 0x06] << 8);
        const pageCheck = 0 === data.subarray(noteOfs + 32).length % 256;
        console.log("isNote", isExtended, magicCheck, pageCheck);
        return magicCheck && pageCheck;
    };

    /* -----------------------------------------------
    function: checkBlock(data, o, state)  TODO : rename checkIdBlock?
      check the header checksum in label area at specified
      offset. utility function for checkHeader()
    */
    const checkBlock = function(data, o, state) {
        const sumX = (data[o + 28] << 8) + data[o + 29];
        let sumY = (data[o + 30] << 8) + data[o + 31];

        let sumA = 0, sumB = 0xFFF2;
        for(let i = 0; i < 28; i += 2) {
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
    const checkHeader = function(data) {
        const state = {};
        const loc = [0x20, 0x60, 0x80, 0xC0];
        let firstValid = null;
        // Check all header blocks
        for(let i = 0; i < 4; i++) {
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
            for(let i = 0; i < 0x20; i++) {
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
    const readNotes = function(data, NoteKeys) {
        const NoteTable = {};

        for(let i = 0x300; i < 0x500; i += 32) { // iterate over NoteTable
            const p = data[i + 0x07];
            const validIndex = data[i + 0x06] === 0 && p >= 5 && p <= 127; // firstIndex validation

            if(validIndex) {
                const id = (i - 0x300) / 32;
                NoteKeys.push(p);
                
                let noteName = "";
                for(let j = 0; j < 16; j++) {
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

                const gameCode = arrstr(data, i, i+4).replace(/\0/g,"-");

                let comment = undefined;
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
    const checkIndexes = function(data, o, NoteKeys) {
        try {
            let p, p2;
            let indexEnds = 0;
            const found = {parsed: [], keys: [], values: [], dupes: {}};

            // Iterate over the IndexTable, checking each index.
            for(let i = o + 0xA; i < o + 0x100; i += 2) {
                p = data[i + 1], p2 = data[i];

                if (p2 === 0 && (p !== 3 && p === 1 || p >= 5 && p <= 127)) {
                    if(p === 1) indexEnds++; // count the number of seq ending markers (0x01).
                    if(p !== 1 && found.dupes[p]) { // There shouldn't be any duplicate indexes.
                        throw `IndexTable contains duplicate index (i=${i}, p=${p}).`;
                    }
                    found.values.push(p);         // Think values. List of all valid index sequence values
                    found.keys.push((i - o) / 2); // Think memory addresses. The key/offset location/destination for each value
                    found.dupes[p] = 1;
                }
                else if (p !== 3 || p2 !== 0) { // Only allow p=3 or p2=0
                    throw `IndexTable contains illegal value (i=${i}, p=${p}, p2=${p2}).`;
                }
            }
            // filter out the key indexes (start indexes) which should match the NoteTable.
            const keyIndexes = found.keys.filter(x => !found.values.includes(x));
            // Count note indexes: Check that NoteKeys/indexEnds/keyIndexes counts are the same.
            const nKeysN = NoteKeys.length, nKeysP = keyIndexes.length;
            if (nKeysN !== nKeysP || nKeysN !== indexEnds) {
                throw "Key index totals do not match (" +nKeysN+", "+nKeysP+", "+indexEnds+")";
            }
            // Check that keyIndexes and NoteKeys report the same values
            for (let i = 0; i < nKeysN; i++) {
                if (NoteKeys.indexOf(keyIndexes[i]) === -1) {
                    throw "A key index doesn't exist in the note table ("+keyIndexes[i]+")";
                }
            }
            // Parse the Key Indexes to derive index sequence.
            const noteIndexes = {};
            for(let i = 0; i < nKeysP; i++) {
                const indexes = [];
                p = keyIndexes[i];
                while(p === 1 || p >= 5 && p <= 127) {
                    if(p === 1) {
                        noteIndexes[keyIndexes[i]] = indexes;
                        found.parsed.push(...indexes); // push entire array to found.parsed
                        break;
                    }
                    indexes.push(p);
                    p = data[p*2 + o + 1];
                }
            }
            // Check that parsed indexes and found keys counts are the same.
            // This is to ensure every key found is used in a sequence.
            if(found.parsed.length !== found.keys.length) {
                throw "Number of parsed keys doesn't match found keys. (" +
                found.parsed.length+", "+found.keys.length+")";
            }
            // IndexTable checksum calculate + update.
            // Checksum should NOT be relied on for validation. Valid files may have invalid sums, so validate in other ways.
            let sum = 0;
            for(let i = o+0xA; i < o+0x100; i++, sum &= 0xFF) sum += data[i];
            if (data[o+1] !== sum) {
                console.info(o, "Fixing INODE checksum.", curfile);
                data[o+1] = sum;
            }

            // copy IndexTable to the backup slot (OR copy backup to main, depending on `o`)
            p = (o === 0x100) ? 0x200 : 0x100;
            for(let i = 0; i < 0x100; i++) {
                data[p + i] = data[o + i];
            }
            return noteIndexes;
        }
        catch(error) { // If main IndexTable is invalid, check backup:
            console.error(error);
            if(o !== 0x200) { // allows a single recursive call to checkIndexes to check mirror backup.
                console.log("WOOPS... checking INODE backup:", curfile);
                return checkIndexes(data, 0x200, NoteKeys);
            }
        }
    };

    /* -----------------------------------------------
    function: getDexNotes(data)
      capture DexDrive note comment strings.
    */
    const getDexNotes = function(data) {
        const strs=[];
        let str="";
        for(let j=0, i = 0x40; i < 0x1040; i++ ) {
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
    const parse = function(data) {
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
        const NoteKeys = []; // shared NoteKeys array. Produced by readNotes, used in checkIndexes.
        const NoteTable = readNotes(data, NoteKeys);

        const output = checkIndexes(data, 0x100, NoteKeys);
        if(output) {
            let usedPages = 0;
            let usedNotes = 0;
            for(let i = 0; i < Object.keys(NoteTable).length; i++) { // iterate over notes in NoteTable.
                const _note = NoteTable[Object.keys(NoteTable)[i]]; // get Note object.

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
    const insertNote = function(data) {
        let cmt = "";
        // Check if note to insert is an extended note file (has comments).
        if(isExtended) {
            isExtended = undefined;
            let len = 16;
            const ver = data[0];
            const cmtlen = data[15];
            const tS = data[14] | data[13]<<8 | data[12]<<16 | data[11]<<24;
            if(tS > 0) console.log("Note Timestamp: "+new Date(tS*1000).toString().slice(4,24));

            if(ver === 0) { // allow import of obsolete version0 files.
                len += 256;
                let end = data.subarray(16, len).indexOf(0);
                end = end > -1 ? (16 + end) : len;
                cmt = new TextDecoder("iso-8859-1").decode(data.subarray(16, end));
            }
            else if(ver === 1 && cmtlen > 0) { // allow import of version1 files.
                len += cmtlen * 16;
                let end = data.subarray(16, len).indexOf(0);
                end = end > -1 ? (16 + end) : len;
                cmt = new TextDecoder("utf-8").decode(data.subarray(16, end));
            }
            data = data.subarray(len); // Strip comment data before proceeding.
        }

        const tmpdata = new Uint8Array(MPKEdit.State.data); // create tmp State.data copy to parse later.

        const noteData = data.subarray(0, 32);
        const pageData = data.subarray(32);
        const pageCount = pageData.length / 256;
        const newPages = MPKEdit.State.usedPages + pageCount; // Pre-calc used page count before import (to make sure it fits)

        if(newPages <= 123 && MPKEdit.State.usedNotes < 16) { // if there's enough space..
            const freeIndexes = [];
            for(let i = 0xA; i < 0x100; i += 2) {
                if(freeIndexes.length === pageCount) {
                    break;
                }
                if(tmpdata[0x100 + i + 1] === 3) { // allocate list of free indexes for import destination.
                    freeIndexes.push(i / 2);
                }
            }

            noteData[0x06] = 0; // replace 0xCAFE with first free index.
            noteData[0x07] = freeIndexes[0];

            for(let i = 0; i < freeIndexes.length; i++) {
                const target1 = 0x100 + (2 * freeIndexes[i] + 1);
                const target2 = 0x100 * freeIndexes[i];

                if(i === freeIndexes.length - 1) { // 0x01 for last index in sequence.
                    tmpdata[target1] = 0x01;
                }
                else {
                    tmpdata[target1] = freeIndexes[i + 1]; // write the index sequence in IndexTable
                }

                for(let j = 0; j < 0x100; j++) {
                    tmpdata[target2 + j] = pageData[0x100 * i + j]; // write the page data sequence.
                }
            }

            for(let i = 0; i < 16; i++) { // Write 32-byte NoteEntry to NoteTable.
                if(MPKEdit.State.NoteTable[i] === undefined) {
                    // tmpComments must be used here because saving directly to MPKEdit.State
                    // will cause comments to be lost when MPK data is re-parsed.
                    if(cmt) tmpComments[i] = cmt; // TODO: This is POSSIBLY not needed anymore, due to presence of MPKCmts block in State.data???
                    const target = 0x300 + i * 32;
                    for(let j = 0; j < 32; j++) {
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
    function: parseCmts(result)
      Parse MPKCmts block, inserting any associated data into the state.
    */
    const parseMPKCmts = function(result) {
        const MPKCmts = result.data.subarray(32768);
        const hasCmts = arrstr(MPKCmts, 0, 7) === "MPKMeta";
        const cmtCount = MPKCmts[15]; // header: stored number of comments
        if(0 === cmtCount || false === hasCmts) {
            console.warn("MPKMeta block not found. MPK file size is wrong or MPKMeta block is corrupt.");
            return false;
        }
        // Checksum calculation
        const chk1 = MPKCmts[8]<<24 | MPKCmts[9]<<16 | MPKCmts[10]<<8 | MPKCmts[11];
        MPKCmts[8] = 0, MPKCmts[9] = 0, MPKCmts[10] = 0, MPKCmts[11] = 0;
        const chk2 = MPKEdit.cyrb32(MPKCmts)[0];
        if(chk2 !== chk1>>>0) {
            console.error("Hash check failed. MPKMeta block is invalid.");
            return false;
        }

        console.log(`MPKMeta block found, attempting to parse ${cmtCount} comment(s)...`);
        let foundCount = 0;
        for(let ptr = 16, i = 0; i < cmtCount; i++) {
            const magic = MPKCmts[ptr+0]^0xA5, magic2 = MPKCmts[ptr+1]^MPKCmts[ptr+2]^MPKCmts[ptr+3]^MPKCmts[ptr+4];
            if(magic !== magic2) {
                console.error(`MPKMeta Error: Can't find expected magic (${magic} !== ${magic2}). Aborting load.`);
                break;
            }
            const cmtLen = (MPKCmts[ptr+5]<<8) + MPKCmts[ptr+6];
            if(0 === cmtLen || cmtLen > 4080) {
                console.error(`MPKMeta Error: Invalid comment length (${cmtLen}). Aborting load.`);
                break;
            }

            // Check if comment's specified startIndex/entryPoint exists, and if the CRC-8 is valid.
            let noteOfs = false;
            for(let j = 0; j < 16; j++) {
                const a = 0x300 + j*32;
                const chkIdx=MPKCmts[ptr+1]===result.data[a+7], chkCo0=MPKCmts[ptr+2]===result.data[a+1];
                const chkCo1=MPKCmts[ptr+3]===result.data[a+2], chkCo2=MPKCmts[ptr+4]===result.data[a+3];
                if(chkIdx && chkCo0 && chkCo1 && chkCo2) {
                    noteOfs = j; // Index & gameCode found
                    break;
                }
            }
            if(noteOfs === false) {
                console.error(`MPKMeta Error: Can't find Comment's associated Note. Aborting load.`);
                break;
            }

            console.log(`Comment ${i} points to save note ${noteOfs}`);
            // Insert comment data into NoteTable
            const cmtStr = new TextDecoder("utf-8").decode(MPKCmts.subarray(ptr+7, ptr+7 + cmtLen));
            result.NoteTable[noteOfs].comment = cmtStr;
            foundCount++;
            ptr += 7 + cmtLen;
        }
    };

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
            const result = parse(data); // attempt to parse data as MPK.
            if(!result) {
                console.warn("ERROR: Data in file provided is not valid: " + filename);
                return false;
            }
            // parse and load any MPKCmts data
            if(result.data.length > 32784) parseMPKCmts(result); // gimme those comments 

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
