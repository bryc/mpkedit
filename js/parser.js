{
const {State, App} = MPKEdit;
// temporary variables
let curfile = undefined, tmpComments = [], tmpStamp = [], isExtended, mupenNX = false;

/* -----------------------------------------------
function: resize(data)
  resize input mpk data to expected size, mostly for truncated inputs (also for MPKMeta).
*/
const resize = function(data) {
    const newdata = new Uint8Array(MPKEdit.State.banks * 32768);
    for(let i = 0; i < data.length; i++) newdata[i] = data[i];
    return newdata;
};

/* -----------------------------------------------
function: SaveAs(data, fname)
  Initiates a download of a given Blob.
*/
const saveAs = function (data, fname) {
    let a = document.createElement("a"), b = URL.createObjectURL(data);
    a.download = fname, a.href = b, a.dispatchEvent(new MouseEvent("click"));
    setTimeout(() => URL.revokeObjectURL(b), 3e3);
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
function: Uint8Concat(...arrs)
  Concat Uint8Arrays
*/
const Uint8Concat = function(...arrs) {
    let offset = 0, totalLength = 0;
    for (let arr of arrs) {
        totalLength += arr.length;
    }
    const result = new Uint8Array(totalLength);
    for (let arr of arrs) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};

/* -----------------------------------------------
function: getDexNotes(data)
  capture DexDrive note comment strings.
*/
const getDexNotes = function(data) {
    const strs = [];
    for(let i = 0x40, j = 0, str = ""; i < 0x1040; i++ ) {
        // Parse DexDrive comments as 7-bit ASCII. 8th bit is sometimes incorrectly set. 
        if(data[i] !== 0x00) { str += String.fromCharCode(data[i] & 127); j++ }
        else {
            strs.push(str === "" ? undefined : str);
            str = "";
            i -= j;
            j = 0;
            i += 255;
        }
    }
    return strs;
};

/* -----------------------------------------------
function: hash128(key, seed)
  Outputs a 128-bit MurmurHash3 digest from a given byte array.
*/
const hash128 = function(key, seed = 0) {
    function fmix32(h) {
        h ^= h >>> 16; h = Math.imul(h, 2246822507);
        h ^= h >>> 13; h = Math.imul(h, 3266489909);
        h ^= h >>> 16;
        return h;
    }
    
    let p1 = 597399067, p2 = 2869860233, p3 = 951274213, p4 = 2716044179, i = 0;

    let k1, h1 = seed ^ p1,
        k2, h2 = seed ^ p2,
        k3, h3 = seed ^ p3,
        k4, h4 = seed ^ p4;

    for(let b = key.length & -16; i < b;) {
        k1 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
        k1 = Math.imul(k1, p1); k1 = k1 << 15 | k1 >>> 17;
        h1 ^= Math.imul(k1, p2); h1 = h1 << 19 | h1 >>> 13; h1 += h2;
        h1 = Math.imul(h1, 5) + 1444728091 | 0; // |0 = prevent float
        i += 4;
        k2 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
        k2 = Math.imul(k2, p2); k2 = k2 << 16 | k2 >>> 16;
        h2 ^= Math.imul(k2, p3); h2 = h2 << 17 | h2 >>> 15; h2 += h3;
        h2 = Math.imul(h2, 5) + 197830471 | 0;
        i += 4;
        k3 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
        k3 = Math.imul(k3, p3); k3 = k3 << 17 | k3 >>> 15;
        h3 ^= Math.imul(k3, p4); h3 = h3 << 15 | h3 >>> 17; h3 += h4;
        h3 = Math.imul(h3, 5) + 2530024501 | 0;
        i += 4;
        k4 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
        k4 = Math.imul(k4, p4); k4 = k4 << 18 | k4 >>> 14;
        h4 ^= Math.imul(k4, p1); h4 = h4 << 13 | h4 >>> 19; h4 += h1;
        h4 = Math.imul(h4, 5) + 850148119 | 0;
        i += 4;
    }

    k1 = 0, k2 = 0, k3 = 0, k4 = 0;
    switch (key.length & 15) {
        case 15: k4 ^= key[i+14] << 16;
        case 14: k4 ^= key[i+13] << 8;
        case 13: k4 ^= key[i+12];
                 k4 = Math.imul(k4, p4); k4 = k4 << 18 | k4 >>> 14;
                 h4 ^= Math.imul(k4, p1);
        case 12: k3 ^= key[i+11] << 24;
        case 11: k3 ^= key[i+10] << 16;
        case 10: k3 ^= key[i+9] << 8;
        case  9: k3 ^= key[i+8];
                 k3 = Math.imul(k3, p3); k3 = k3 << 17 | k3 >>> 15;
                 h3 ^= Math.imul(k3, p4);
        case  8: k2 ^= key[i+7] << 24;
        case  7: k2 ^= key[i+6] << 16;
        case  6: k2 ^= key[i+5] << 8;
        case  5: k2 ^= key[i+4];
                 k2 = Math.imul(k2, p2); k2 = k2 << 16 | k2 >>> 16;
                 h2 ^= Math.imul(k2, p3);
        case  4: k1 ^= key[i+3] << 24;
        case  3: k1 ^= key[i+2] << 16;
        case  2: k1 ^= key[i+1] << 8;
        case  1: k1 ^= key[i];
                 k1 = Math.imul(k1, p1); k1 = k1 << 15 | k1 >>> 17;
                 h1 ^= Math.imul(k1, p2);
    }

    h1 ^= key.length; h2 ^= key.length; h3 ^= key.length; h4 ^= key.length;

    h1 += h2; h1 += h3; h1 += h4;
    h2 += h1; h3 += h1; h4 += h1;

    h1 = fmix32(h1);
    h2 = fmix32(h2);
    h3 = fmix32(h3);
    h4 = fmix32(h4);

    h1 += h2; h1 += h3; h1 += h4;
    h2 += h1; h3 += h1; h4 += h1;

    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/* -----------------------------------------------
function: initMPK()
  generate empty MPK data then immediately load it.
*/
const initMPK = function(banks = 1) {
    function writeAt(ofs) {for(let i = 0; i < 32; i++) data[ofs + i] = block[i];}
    // calculate IndexTable checksum at specific offset
    function iTableSum(ofs) {
        let sum = 0, start = ofs + 2;
        if(ofs == 0x100) start = ofs + ((banks * 2) + 3) * 2;
        for(let i = start; i < ofs+0x100; i++, sum &= 0xFF) sum += data[i];
        return sum;
    }

    const data = new Uint8Array(banks * 32768), block = new Uint8Array(32);
    
    // generate id block
    block[1]  = 0 | Math.random() * 256 & 0x3F;
    block[5]  = 0 | Math.random() * 256 & 0x7;
    block[6]  = 0 | Math.random() * 256;
    block[7]  = 0 | Math.random() * 256;
    block[8]  = 0 | Math.random() * 256 & 0xF;
    block[9]  = 0 | Math.random() * 256;
    block[10] = 0 | Math.random() * 256;
    block[11] = 0 | Math.random() * 256;
    block[25] = 0x01; // device bit
    block[26] = banks; // bank size int

    // calculate pakId checksum
    let sumA = 0, sumB = 0xFFF2;
    for(let i = 0; i < 28; i += 2)
        sumA += (block[i] << 8) + block[i + 1], sumA &= 0xFFFF;
    sumB -= sumA;
    // store checksums
    block[28] = sumA >> 8;
    block[29] = sumA & 0xFF;
    block[30] = sumB >> 8;
    block[31] = sumB & 0xFF;

    // write checksum block to multiple sections in header page
    writeAt(32);
    writeAt(96);
    writeAt(128);
    writeAt(192);

    // init IndexTable and backup (plus checksums)
    for(let i = 3 + (banks * 2); i < (banks * 128); i++) {
        data[256 + (i * 2) + 1] = 3;
        data[256 + (banks * 256) + (i * 2) + 1] = 3;
    }
    // calculate checksums of the IndexTable
    for(let i = 1; i <= banks; i++) {
        // Primary
        data[(i * 256)    ] = i - 1;
        data[(i * 256) + 1] = iTableSum( i * 256 );
        // Backup
        data[(i * 256) + (banks * 256)    ] = i - 1;
        data[(i * 256) + (banks * 256) + 1] = iTableSum( (i * 256) + (banks * 256) );
    }

    //for(let i = 0; i < 32; i++) data[i] = i; // write label - needs to be verified
    //data[0] = 0x81; // libultra's 81 mark

    Parser(data, "New.mpk");
};

/* -----------------------------------------------
function: eraseNote(id)
  Erase a note at index/id. Note: This does not erase actual save data, just the pointer.
*/
const eraseNote = function(id) {
    let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
    if(!State.NoteTable[id]) return; // cancel if id doesn't exist in NoteTable
    const tmpData = new Uint8Array(State.data), // operate on tmp copy to run thru parser later
          indexes = State.NoteTable[id].indexes; // get note's indexes sequence to overwrite with 0x03
    // Erase all indexes in IndexTable for given note
    let offset;
    for(let i = 0; i < indexes.length; i++) {
        offset = 0x100 + (indexes[i] & 0xFF00) + (indexes[i] & 0xFF)*2;
        tmpData[offset  ] = 0x00;
        tmpData[offset+1] = 0x03;
    }
    // Erase full NoteEntry in NoteTable.
    // TODO: should we do a minimal erase like libultra? is there value in keeping junk data? probably.
    for(let i = 0; i < 32; i++) {
        offset = (0x300 + nAD) + (id * 32) + i;
        tmpData[offset] = 0x00;
    }
    Parser(tmpData);
};

/* -----------------------------------------------
function: isNote(data)
  determine whether the file loaded is a note file.
*/
const isNote = function(data) {
    isExtended = arrstr(data, 1, 8) === "MPKNote"; // check for our MPKNote header
    let noteOfs = 0; // noteOfs is the size of the MPKNote block to trim for 0xCAFE.
    if(isExtended) {
        const ver = data[0], len = data[15];
        noteOfs = (ver === 1) ? (16+16*len) : 16+256; // fallback for version 0
    }
    else if (0 === data.length%256 && curfile && /^(raw-N[0-9A-Z]{3}_[0-9A-F]{2}$)+/.test(curfile.slice(0,11))) {
        let foundKey = false,
            gameCode = curfile.substr(4,4),
            startIdx = parseInt(curfile.substr(9,2), 16),
            nTbl = State.NoteTable;
        for (let key in nTbl) {
            if(nTbl[key].serial === gameCode && nTbl[key].indexes[0] === startIdx && data.length === 256 * nTbl[key].indexes.length) {
                foundKey = key; break;
            }
        }
        if(foundKey !== false) {
            let doIt = confirm(`Overwrite save data at table index ${startIdx}?\n${App.codeDB[gameCode]}`)
            if(doIt) {
                for(let i = 0; i < nTbl[foundKey].indexes.length; i++) {
                    for(let j = 0; j < 0x100; j++) State.data[0x100 * nTbl[foundKey].indexes[i] + j] = data[0x100 * i + j];
                }
                console.warn("Existing data was overwritten. Say your prayers.");
                Parser(State.data);
                document.querySelectorAll("tr")[foundKey].querySelector("td.name").innerHTML += "<b style='cursor:pointer;color:crimson' onclick='this.parentNode.removeChild(this)'>Notice: The data for this note has been overwritten.<br>Click to dismiss.</div>";
            }
        }
    }
    // Rely on noteOfs to find 0xCAFE in extended files.
    const magicCheck = 0xCAFE === data[noteOfs + 0x07] + (data[noteOfs + 0x06] << 8),
          pageCheck = 0 === data.subarray(noteOfs + 32).length % 256;
    console.log("isNote", isExtended, magicCheck, pageCheck);
    return magicCheck && pageCheck;
};

/* -----------------------------------------------
function: checkIdBlock(data, o, state)
  check the header checksum in id area at specified
  offset. utility function for checkHeader()
  TODO: incorporate deviceid bit check, and '01' bank check.
*/
const checkIdBlock = function(data, o, state) {
    let sumA = 0, sumB = 0xFFF2;
    for(let i = 0; i < 28; i += 2) {
        sumA += (data[o + i] << 8) + data[o + i + 1];
        sumA &= 0xFFFF;
    }
    sumB -= sumA;

    // many checksums in DexDrive files are incorrect.
    // this detects and fixes the specific issue.
    state[o] = {};
    const sumX = (data[o + 28] << 8) + data[o + 29];
    let sumY = (data[o + 30] << 8) + data[o + 31];
    if(sumY !== sumB && (sumY ^ 0x0C) === sumB && sumX === sumA) {
       sumY ^= 0xC;
       data[o + 31] ^= 0xC;
       state[o].dexdriveFix = true;
    }
    state[o].repaired = data[o]+data[o+1]+data[o+2]+data[o+3] == 1020;
    state[o].device = data[o+24]<<8 | data[o+25];
    state[o].banks = data[o+26];
    state[o].ver = data[o+27];
    state[o].valid = (sumX === sumA && sumY === sumB);
    return (sumX === sumA && sumY === sumB); // this return statement is not used.
};

/* -----------------------------------------------
function: checkHeader(data)
  checks all four checksum sections in header.
  if this fails, perform a sanity check on the filesystem.
  TODO: As a final step, gently repair any corrupt backups individually.
*/
const checkHeader = function(data) {
    const state = {}, loc = [0x20, 0x60, 0x80, 0xC0];
    let firstValid = null;
    // Check all header blocks
    for(let i = 0, bl0x = []; i < 4; i++) {
        checkIdBlock(data, loc[i], state);
        if(state[loc[i]].valid === true && firstValid === null) firstValid = i; // get only first valid
        if(state[loc[i]].dexdriveFix) console.log(`Header ID ${(i+1)}: DexDrive checksum repaired`);
        bl0x.push(state[loc[i]].valid); if(i === 3) console.log("ID Blocks:", bl0x);
    }
    // Check if FIRST id block is valid
    if(state[0x20].valid === true) {
        MPKEdit.State.banks = state[0x20].banks;
        return true;
    }
    // Check if a valid backup was found as firstValid, copy to Main
    else if(firstValid !== null) {
        console.info(`Using Backup ${firstValid}`);
        for(let i = 0; i < 0x20; i++)
            data[loc[0] + i] = data[loc[firstValid] + i];
        return true;
    } else { // All checksums failed. Verify IndexTable integrity
        // Check for common values of the 8 'reserved' bytes.
        let u1 = (data[0x102]<<24 | data[0x103]<<16 | data[0x104]<<8 | data[0x105]) >>> 0,
            u2 = (data[0x106]<<24 | data[0x107]<<16 | data[0x108]<<8 | data[0x109]) >>> 0;
        if ( (0x00000000 !== u1 || 0x00000000 !== u2) &&
             (0x0013803F !== u1 || 0x75400000 !== u2) &&
             (0x00030003 !== u1 || 0x00030003 !== u2) ) {
            console.error(`Filesystem marker not found.`);
            return false;
        }
        
        // TODO: Fix Multi-bank support for this "quick n dirty" FS checker.
        console.error(`No valid ID block found. Checking filesystem...`);
        let sum = 0, x;
        for(let i = 0x10A, a, b, D = {}; i < (0x100 + MPKEdit.State.banks * 0x100); i += 2, sum += a+b) {
            a = data[i], b = data[i + 1];
            if(a !== data[0x100 + i] || b !== data[0x101 + i]) return false;
            if(0 === a && (5 <= b && 127 >= b || 1 === b)) {
                if(b !== 1 && D[b]) return false;
                D[b] = 1;
            } else if(a !== 0 || b !== 3) return false;
        }

        sum &= 0xFF;
        if(data[0x101] !== sum) { // enforce checksum
            console.error(`Primary IndexTable checksum invalid. Checking backup...`);
            x = data[0x101] ^ sum;
            // Ensures at least 7 bits are correct, or if backup is valid.
            if(!!(x&x-1) && data[0x201] !== sum) return false;
        } 
        console.warn(`Filesystem is valid. Proceeding.`);
        return true;
    }
};

/* -----------------------------------------------
function: readNotes(data, o, NoteKeys, NoteTable)
  Parses the Note Table.
*/
const readNotes = function(data, o, NoteKeys, NoteTable) {
    let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
    for(let i = (0x300 + nAD); i < (0x500 + nAD); i += 32) { // iterate over NoteTable
        const p = data[i + 7], b = data[i + 6],
              p2 = data[((b + 1) * o) + p*2 + 1],
              // First check if firstIndex range is valid.
              validIndex = p >= 1 && p <= 127,
              // For stricter parsing, these conditions can be used as well.
              validSum   = data[i + 10] === 0 || data[i + 11] === 0,
              // Check if the actual index exists.
              entryCheck = p2 >= 1 && p2 <= 127;

        // Check game/pub code and perform a fix if needed.
        let gSum = data[i] + data[i + 1] + data[i + 2] + data[i + 3],
            pSum = data[i + 4] + data[i + 5];
        if(validIndex && entryCheck && validSum) {
            let r = 0;
            if(!gSum) gSum = data[i+3] |= 1, r++;
            if(!pSum) pSum = data[i+5] |= 1, r++;
            if(r) console.error(`ERROR: A note was found but ${r} values are corrupt. Manual repair required.`, curfile)
        }
        const validCode = gSum !== 0 && pSum !== 0;

        if(validIndex && entryCheck && validSum && validCode) {
            if(validIndex && !entryCheck) console.error("WTF", curfile)
            // DEBUG
            //arrhex=a=>{return[].map.call(a,x=>x.toString(16).padStart(2,0)).join(" ").toUpperCase()}
            //if(typeof shit !== 'undefined')
            //shit += arrhex(data.subarray(i, i+32)) + `: ${curfile}\n`
            //console.log(arrhex(data.subarray(0, 0+32)) + `: ${curfile}\n`)
            // DEBUG

            const id = (i - (0x300 + nAD)) / 32;
            NoteKeys.push(p | (b << 8));
            
            let noteName = "", n64code = App.n64code;
            for(let j = 0; j < 16; j++)
                noteName += n64code[data[i + 16 + j]] || "";

            if(data[i + 12] !== 0) { // extension code
                noteName += ".";
                noteName += n64code[data[i + 12]] || "";
                noteName += n64code[data[i + 13]] || "";
                noteName += n64code[data[i + 14]] || "";
                noteName += n64code[data[i + 15]] || "";
            }

            if((data[i + 8] & 0x02) === 0) {
                console.info(id, `Fixing required bit 8:2 in note: ${noteName}, ${curfile}`);
                data[i + 8] |= 0x02;
            }

            if (data[i + 10] | data[i + 11])
                console.info(`Unused bytes (0x0A-0x0B) are not empty: ${noteName}`);
            if (data[i + 13] | data[i + 14] | data[i + 15])
                console.info(`Note Extension contains data in reserved characters: ${noteName}`);

            const gameCode = arrstr(data, i, i+4).replace(/\0/g,"-");

            let comment = undefined, timeStamp = undefined;
            // Load any temporary comments (DexDrive or insertNote)
            if(tmpComments[id]) {
                comment = tmpComments[id] || undefined;
            } else if(!curfile) {
                // Salvage pre-existing comments in NoteTable.
                comment = (State.NoteTable[id]||{}).comment || undefined;
            }
            // Load any timestamp
            if(tmpStamp[id]) {
                timeStamp = tmpStamp[id] || undefined;
            } else if(!curfile) {
                // Salvage pre-existing comments in NoteTable.
                timeStamp = (State.NoteTable[id]||{}).timeStamp || undefined;
            }
            NoteTable[id] = {
                indexes: p | (b << 8),
                serial: gameCode,
                publisher: arrstr(data, i+4, i+6).replace(/\0/g,"-"),
                noteName: noteName,
                region: App.region[gameCode[3]] || "Unknown",
                media: App.media[gameCode[0]],
                comment: comment,
                timeStamp: timeStamp
            };
        }
    }
    tmpComments = [], tmpStamp = []; // We must clear, otherwise garbage data will persist.
    return NoteTable;
};

/* -----------------------------------------------
function: checkIndexes(data, o, NoteKeys, NoteTable)
  parse and validate the indexTable. compares with NoteKeys array constructed from noteTable.
  argument o (offset) is used to specify backup data offset location in single recursive call.
*/
const checkIndexes = function(data, o, NoteKeys, NoteTable) {
    let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
    let firstIdx = ((MPKEdit.State.banks * 2) + 3) * 2;
    let finalIdx = MPKEdit.State.banks * 0x100;
    try {
        let p, p2, indexEnds = 0, repairAttempt = false;
        const found = {parsed: [], keys: [], values: [], dupes: {}};

        // Iterate over the IndexTable, checking each index.
        for(let i = o + firstIdx; i < o + finalIdx; i += 2) {
            p = data[i + 1], p2 = data[i];
            if((i & 0xFF) === 0) continue; // skip itbl checksum

            if (!(p === 3 && p2 === 0) && (p >= 1 && p <= 127)) {
                if(p === 1 && p2 === 0) indexEnds++; // count the number of seq ending markers (0x01).
                if(p !== 1 && found.dupes[ p + (p2 << 8) ]) { // There shouldn't be any duplicate indexes.
                    throw `IndexTable contains duplicate index (i=${i}, p=${p}).`;
                }
                found.values.push(p | (p2 << 8));         // Think values. List of all valid index sequence values
                found.keys.push(((i & 0xFF) >> 1) + (i - o & 0xFF00)); // Think memory addresses. The key/offset location/destination for each value
                found.dupes[p | (p2 << 8)] = 1;
            }
            else if (!(p === 3 && p2 === 0)) { // Only allow p=3 or p2=0
                throw `IndexTable contains illegal value (i=${i}, p=${p}, p2=${p2}).`;
            }
        }
        // filter out the key indexes (start indexes) which should match the NoteTable.
        const keyIndexes = found.keys.filter(x => !found.values.includes(x)),
              nKeysN = NoteKeys.length, nKeysP = keyIndexes.length,
              invalidKeys = [], validKeys = [];
        // Check that keyIndexes and NoteKeys report the same values
        for (let i = 0; i < nKeysP; i++) {
            if (NoteKeys.indexOf(keyIndexes[i]) === -1) {
                console.error(`Found a key index that isn't in NoteTable (${keyIndexes[i]}).`);
                invalidKeys.push(keyIndexes[i]);
            } else {
                validKeys.push(keyIndexes[i]);
            }
        }
        // Parse the Key Indexes to derive index sequence.
        const noteIndexes = {};
        for(let i = 0, foundEnd, tmp; i < nKeysP; i++) {
            const indexes = [];
            p = keyIndexes[i] & 0xFF, p2 = keyIndexes[i] >> 8, foundEnd = false;
            while(p >= 1 && p <= 127) {
                if(p2 === 0 && p === 1) {
                    foundEnd = true;
                    noteIndexes[keyIndexes[i]] = indexes;
                    found.parsed.push(...indexes); // push entire array to found.parsed
                    break;
                }
                indexes.push(p | (p2 << 8));
                tmp = p;
                p  = data[o + (p2 << 8) + (tmp * 2) + 1];
                p2 = data[o + (p2 << 8) + (tmp * 2)    ];
            }
            // When checking backup; free any orphaned indexes.
            if(o === (0x100 + MPKEdit.State.banks * 0x100) && invalidKeys.indexOf(keyIndexes[i]) !== -1) {
                for(let i = 0; i < indexes.length; i++) {
                    console.warn(`Value ${data[o + indexes[i]*2+1]} at index ${indexes[i]} is being erased in IndexTable backup.`);
                    data[o + indexes[i] * 2 + 1] = 0x03;
                }
                repairAttempt = true;
            }
            // When checking backup; erase a note which has no end marker.
            if(o === (0x100 + MPKEdit.State.banks * 0x100) && !foundEnd) {
                for(let j = 0x300 + nAD; j < 0x500 + nAD; j += 32) { // iterate NoteTable
                    if(data[j + 7] === keyIndexes[i]) {
                        console.warn(`Note Key ${data[j + 7]} is being erased in NoteTable.`);
                        data[j + 0] = 0x00; // gameCode
                        data[j + 1] = 0x00;
                        data[j + 2] = 0x00;
                        data[j + 3] = 0x00;
                        data[j + 4] = 0x00; // pubCode
                        data[j + 5] = 0x00;
                        data[j + 6] = 0x00; // startIndex
                        data[j + 7] = 0x00;
                    }
                }
                for(let i = 0; i < indexes.length; i++) {
                    console.warn(`Value ${data[o + indexes[i]*2+1]} at index ${indexes[i]} is being erased in IndexTable backup.`);
                    data[o + indexes[i] * 2 + 1] = 0x03;
                }
                repairAttempt = true;
            }
        }
        if(repairAttempt) {
            NoteKeys.length = 0; // clear NoteKeys
            Object.keys(NoteTable).forEach(key => {delete NoteTable[key];});
            readNotes(data, o, NoteKeys, NoteTable); // must rebuild NoteTable
            return checkIndexes(data, o, NoteKeys, NoteTable); // rerun checkIndexes
        }
        // Count note indexes: Check that NoteKeys/indexEnds/keyIndexes counts are the same.
        if (nKeysN !== nKeysP || nKeysN !== indexEnds) {
            throw `Key index totals do not match (${nKeysN}, ${nKeysP}, ${indexEnds})`;
        }
        // Check that parsed indexes and found keys counts are the same.
        // This is to ensure every key found is used in a sequence.
        if(found.parsed.length !== found.keys.length) {
            throw `Number of parsed keys doesn't match found keys. (${found.parsed.length}, ${found.keys.length})`;
        }
        // IndexTable checksum calculate + update.
        // Checksum should NOT be relied on for validation. Valid files may have invalid sums, so validate in other ways.
        for(let i = 0; i < MPKEdit.State.banks; i++) {
            let sum = 0;
            let addrS = (i === 0) ? o + ((5 + ((MPKEdit.State.banks - 1) * 2)) * 2) : o + (1 * 2);
            let addrB = i * 0x100;

            for(let j = addrS + addrB; j < o + addrB + 0x100; j++, sum &= 0xFF) sum += data[j];

            if (data[(o + addrB) + 1] !== sum) {
                console.info(o, `Fixing Bank ${i+1} IndexTable checksum.`, curfile);
                data[(o + addrB) + 1] = sum;
            }
        }

        // copy IndexTable to the backup slot (OR copy backup to main, depending on `o`)
        p = (o === 0x100) ? (0x100 + MPKEdit.State.banks * 0x100) : 0x100;
        for(let i = 0; i < MPKEdit.State.banks * 0x100; i++) {
            data[p + i] = data[o + i];
        }
        return noteIndexes;
    }
    catch(error) { // If main IndexTable is invalid, check backup:
        console.error(error, curfile);
        if(o !== (0x100 + MPKEdit.State.banks * 0x100)) { // allows a single recursive call to checkIndexes to check mirror backup.
            console.warn(`Error in Primary IndexTable. Now checking backup... \nFile: ${curfile}`);
            return checkIndexes(data, (0x100 + MPKEdit.State.banks * 0x100), NoteKeys, NoteTable);
        }
    }
};

/* -----------------------------------------------
function: parse(data)
  master parse function. handle DexDrive data, and performs parsing routine.
*/
const parse = function(data) {
    data = new Uint8Array(data); // should create a copy of the data?
    // Detect DexDrive file
    if(arrstr(data, 0, 12) === "123-456-STD\x00") {
        console.info("DexDrive file detected. Saving notes and stripping header.");
        tmpComments = getDexNotes(data);
        data = data.subarray(0x1040);
    }
    if(!data || checkHeader(data) === false) {
        // Stop here if no data or header/sanity check fails
        return false;
    }
    const NoteKeys = [], // shared NoteKeys array. Produced by readNotes, used in checkIndexes.
          NoteTable = {};

    readNotes(data, 0x100, NoteKeys, NoteTable);
    const output = checkIndexes(data, 0x100, NoteKeys, NoteTable);
    if(output) {
        let usedPages = 0, usedNotes = 0;
        for(let i = 0; i < Object.keys(NoteTable).length; i++) { // iterate over notes in NoteTable.
            const _note = NoteTable[Object.keys(NoteTable)[i]]; // get Note object.

            _note.indexes = output[_note.indexes]; // assign the index sequence to obj.

            // Calculate hash of raw data. Gather all page data into array (fileOut).
            const fileOut = [];
            for(let w = 0; w < _note.indexes.length; w++) {
                const pageAddress = (_note.indexes[w] & 0xFF) * 0x100 + (_note.indexes[w] >> 8) * 0x8000;
                for(let j = 0; j < 0x100; j++) {
                    fileOut.push(data[pageAddress + j]);
                }
            }
            _note.hash128  = hash128(fileOut);

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
function: saveMPK(evt)
  Save the full MPK output file (Standard RAW MPK file)
*/
const saveMPK = function(evt) {
    let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
    // Initially we only want to output the MPK data.
    let outputMPK = State.data;

    // Parse Note comments and build MPKMeta block, if needed.
    let hasCmts = false;
    // initialized 16-byte header for MPKMeta
    const cmtHeader = [77,80,75,77,101,116,97,0,0,0,0,0,0,0,0,0],
          notes = Object.keys(State.NoteTable);
    let MPKMeta = new Uint8Array(cmtHeader), numCmts = 0;
    for(let i = 0; i < notes.length; i++) {
        if(State.NoteTable[notes[i]].comment) { // if NoteTable[i] contains a comment.
            hasCmts = true;
            numCmts++;
            // Gather required info
            const a = (0x300 + nAD) + (notes[i] * 32), // NoteEntry addr
                  idx = outputMPK[a+7],
                  c0 = outputMPK[a+1], c1 = outputMPK[a+2], c2 = outputMPK[a+3],
                  utfdata = new TextEncoder("utf-8").encode(State.NoteTable[notes[i]].comment),
                  hiSize = utfdata.length >> 8, loSize = utfdata.length & 0xFF,
                  id = idx^c0^c1^c2^0xA5,
                  output = [id, idx, c0, c1, c2, hiSize, loSize];
            MPKMeta = Uint8Concat(MPKMeta, output, utfdata);
        }
    }
    // If comments found, update header and append MPKMeta block to data.
    if(hasCmts) {
        
        MPKMeta[15] = numCmts; // Store total number of comments
        const totalHash = hash128(MPKMeta)[0];
        MPKMeta[8]  = totalHash >>> 24 & 0xFF;
        MPKMeta[9]  = totalHash >>> 16 & 0xFF;
        MPKMeta[10] = totalHash >>> 8 & 0xFF;
        MPKMeta[11] = totalHash & 0xFF;
        outputMPK = Uint8Concat(outputMPK, MPKMeta);
    }
    if(mupenNX) outputMPK = Uint8Concat(new Uint8Array(2048),outputMPK); // Padding for mupenNX

    if(evt.type === "dragstart") { // Chrome drag-out save method
        const blobURL = URL.createObjectURL(new Blob([outputMPK]));
        evt.dataTransfer.setData("DownloadURL", "application/octet-stream:"+State.filename+":"+blobURL);
    }
    else { // browser saveAs method
        let ext = State.filename.slice(-3).toUpperCase() !== "MPK",
              fn = State.filename + (ext ? ".mpk" : "");
              if(mupenNX) fn = fn.slice(0,-4); // fix mupenNX extension
        saveAs(new Blob([outputMPK]), fn);
    }
};

/* -----------------------------------------------
function: saveNote(evt, id)
  Save a note at index/id. Supports holding CTRL for raw save.
*/
const saveNote = function(evt, id) {
    let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
    let outputNote = [];
    const indexes = State.NoteTable[id].indexes,
          gameCode = State.NoteTable[id].serial;

    // Write NoteEntry as header for RAW format.
    for(let i = 0; i < 32; i++) outputNote.push(State.data[(0x300 + nAD) + (id * 32) + i]);
    outputNote[6] = 0xCA, outputNote[7] = 0xFE;

    // Write associated save data.
    for(let i = 0; i < indexes.length; i++) {
        const pageAddress = (indexes[i] & 0xFF) * 0x100 + (indexes[i] >> 8) * 0x8000;
        for(let j = 0; j < 0x100; j++)
            outputNote.push(State.data[pageAddress + j]);
    }

    const hash = State.NoteTable[id].hash128[0].toString(36).slice(1, 6) + State.NoteTable[id].hash128[1].toString(36).slice(1, 6);
    let filename = App.codeDB[gameCode] || gameCode;
    filename = filename + "_" + hash + ".note";

    if (evt && evt.ctrlKey) { // Hold CTRL for raw save data (no NoteEntry header)
        filename = indexes[0].toString(16).padStart(2,"0");
        filename = `raw-${gameCode}_${filename}.rawnote`;
        outputNote = outputNote.slice(32); // slice off header.
    } else {
        const header = [1,77,80,75,78,111,116,101,0,0,0,0,0,0,0,0],
              utfdata = new TextEncoder("utf-8").encode(State.NoteTable[id].comment),
              size = Math.ceil(utfdata.length / 16); // number of rows
        header[15] = size;
        let tS = State.NoteTable[id].timeStamp; // get or generate timestamp
        if(!tS) tS = Math.round(State.fileDate/1000) || Math.round(new Date().getTime()/1000);
        header[14] = tS & 0xFF;
        header[13] = tS >>> 8 & 0xFF;
        header[12] = tS >>> 16 & 0xFF;
        header[11] = tS >>> 24 & 0xFF;
        const cmt = new Uint8Array(size * 16);
        cmt.set(utfdata);
        outputNote = Uint8Concat(header, cmt, outputNote);
    }

    outputNote = new Uint8Array(outputNote);
    if(evt && evt.type === "dragstart") { // chrome drag-out save method
        const blobURL = URL.createObjectURL(new Blob([outputNote]));
        evt.dataTransfer.setData("DownloadURL", `application/octet-stream:${filename}:${blobURL}`);
    }
    else saveAs(new Blob([outputNote]), filename); // browser saveAs method
};

/* -----------------------------------------------
function: insertNote(data, fileDate)
  insert note data into currently opened MPK file.
*/
const insertNote = function(data, fileDate) {
    let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
    let cmt = "", tS;
    // Check if note to insert is an extended note file (has comments).
    if(isExtended) {
        isExtended = undefined;
        let len = 16;
        const ver = data[0], cmtlen = data[15]; 
              tS = (data[14] | data[13]<<8 | data[12]<<16 | data[11]<<24)>>>0;
        if(tS > 0) console.log(`Note Timestamp: ${new Date(tS*1000).toString().slice(4,24)}`);

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

    const tmpdata = new Uint8Array(State.data); // create tmp State.data copy to parse later.

    const noteData = data.subarray(0, 32), 
          pageData = data.subarray(32),
          pageCount = pageData.length / 256,
          newPages = State.usedPages + pageCount; // Pre-calc used page count before import (to make sure it fits)

    if(newPages <= (State.banks * 125 - 2) && State.usedNotes < 16) { // if there's enough space..
        const freeIndexes = [];
        let firstIdx = ((MPKEdit.State.banks * 2) + 3) * 2;
        let finalIdx = MPKEdit.State.banks * 0x100;
        for(let i = firstIdx; i < finalIdx; i += 2) {
            if(freeIndexes.length === pageCount) break;
            if((i & 0xFF) === 0) continue; // skip itbl checksum
            // allocate list of free indexes for import destination.
            if(tmpdata[0x100 + i] === 0 && tmpdata[0x100 + i + 1] === 3) {
                freeIndexes.push(((i & 0xFF) >> 1) + (i & 0xFF00));
            }
        }

        noteData[0x06] = freeIndexes[0] >> 8; // replace 0xCAFE with first free index.
        noteData[0x07] = freeIndexes[0] & 0xFF;

        for(let i = 0; i < freeIndexes.length; i++) {
            const target1 = 0x100 + (freeIndexes[i] & 0xFF00) + (freeIndexes[i] & 0xFF) * 2,
                  target2 = (freeIndexes[i] & 0xFF) * 0x100 + (freeIndexes[i] >> 8) * 0x8000;
            
            // write the index sequence in IndexTable. 0x01 for last index in sequence.
            tmpdata[target1  ] = (i===freeIndexes.length-1) ? 0x00 : freeIndexes[i+1] >> 8;
            tmpdata[target1+1] = (i===freeIndexes.length-1) ? 0x01 : freeIndexes[i+1] & 0xFF;

            // write the page data sequence.
            const pageAddress = (freeIndexes[i] & 0xFF) * 0x100 + (freeIndexes[i] >> 8) * 0x8000;
            for(let j = 0; j < 0x100; j++)
                tmpdata[target2 + j] = pageData[0x100 * i + j];
        }

        for(let i = 0; i < 16; i++) { // Write 32-byte NoteEntry to NoteTable.
            if(State.NoteTable[i] === undefined) {
                // tmpComments/tmpStamp is used here because saving directly to State
                // will cause comments to be lost when MPK data is re-parsed.
                if(cmt) tmpComments[i] = cmt;
                tmpStamp[i] = tS || Math.round(fileDate/1000);
                const target = (0x300 + nAD) + i * 32;
                for(let j = 0; j < 32; j++) tmpdata[target + j] = noteData[j];
                break;
            }
        }

        Parser(tmpdata);
    } else {
        if(State.usedNotes >= 16)
            console.warn("No note slots available to insert note.");
        if(newPages > (State.banks * 125 - 2))
            console.warn("Not enough pages left to insert note.");
    }
};

/* -----------------------------------------------
function: parseMPKMeta(result)
  Parse MPKMeta block, inserting any associated data into the state.
*/
const parseMPKMeta = function(result) {
    const MPKMeta = result.data.subarray(MPKEdit.State.banks * 32768),
          hasCmts = arrstr(MPKMeta, 0, 7) === "MPKMeta",
          cmtCount = MPKMeta[15]; // header: stored number of entries
    if(hasCmts === false || cmtCount > 16 || cmtCount === 0) {
        console.error("MPKMeta block not found. Either a bug in the code, or a corrupt MPKMeta block.");
        return false;
    }

    // Parse entries
    console.log(`MPKMeta block found, attempting to parse ${cmtCount} entrie(s)...`);
    var results = {}, ptr = 16;
    for(let i = 0; i < cmtCount; i++) {
        const magic = MPKMeta[ptr+0]^0xA5, magic2 = MPKMeta[ptr+1]^MPKMeta[ptr+2]^MPKMeta[ptr+3]^MPKMeta[ptr+4];
        if(magic !== magic2) {
            console.error(`MPKMeta Error: Can't find expected magic (${magic} !== ${magic2}). Aborting load.`);
            break;
        }
        const cmtLen = (MPKMeta[ptr+5]<<8) + MPKMeta[ptr+6];
        if(cmtLen > 4080 || cmtLen === 0) {
            console.error(`MPKMeta Error: Invalid comment length (${cmtLen}). Aborting load.`);
            break;
        }

        // Check if entry's specified index and gameCode exists.
        let noteOfs = false;
        let nAD = (MPKEdit.State.banks * 0x200) - 0x200;
        for(let j = 0; j < 16; j++) {
            const a = (0x300 + nAD) + j*32,
                  chkIdx = MPKMeta[ptr+1] === result.data[a+7], 
                  chkCo0 = MPKMeta[ptr+2] === result.data[a+1],
                  chkCo1 = MPKMeta[ptr+3] === result.data[a+2],
                  chkCo2 = MPKMeta[ptr+4] === result.data[a+3];
            if(chkIdx && chkCo0 && chkCo1 && chkCo2) {
                noteOfs = j; // Index & gameCode found
                break;
            }
        }
        if(noteOfs === false) {
            console.error(`MPKMeta Error: Can't find Comment's associated Note. Aborting load.`);
            break;
        }

        // Insert comment data into NoteTable
        const cmtStr = new TextDecoder("utf-8").decode(MPKMeta.subarray(ptr+7, ptr+7 + cmtLen));
        //result.NoteTable[noteOfs].comment = cmtStr;
        console.log(`MPKMeta: Comment ${i} points to save note ${noteOfs}`);
        results[noteOfs] = {comment: cmtStr};
        ptr += 7 + cmtLen;
    }
    
    // Checksum calculation - also verifies length
    const chk1 = MPKMeta[8]<<24 | MPKMeta[9]<<16 | MPKMeta[10]<<8 | MPKMeta[11];
    MPKMeta[8] = 0, MPKMeta[9] = 0, MPKMeta[10] = 0, MPKMeta[11] = 0;
    const chk2 = hash128(MPKMeta.slice(0,ptr))[0];
    if(chk2 !== chk1>>>0) {
        console.error("Hash check failed. MPKMeta block may be invalid. Investigate.");
        return false;
    }
    
    console.log(`MPKMeta: All checks passed, inserting data into state.`)
    // All checks passed, ready to insert data
    for(let noteOfs in results) {
        result.NoteTable[noteOfs].comment = results[noteOfs].comment;
    }
};

/* -----------------------------------------------
function: Parser(data, filename, fileDate, origsize)
  exposed interface to the parser. data array and filename provided.
*/
const Parser = function(data, filename, fileDate, origsize) {

    console.log(`Loading file %c${filename}... \n(file date: ${fileDate?new Date(fileDate).toString().substr(4,17):"N/A"})`, "font-weight:bold");
    curfile = filename;

    if(State.data && isNote(data)) { // check if data opened is a note file to be imported
        insertNote(data, fileDate);
    } else {
        // If .rawnote, skip
        if(filename&&filename.split('.').pop().toLowerCase()==="rawnote")
            return false;
        // Detect MupenNX .SRM file.
        if(filename&&filename.split('.').pop().toLowerCase()==="srm")
            data = data.slice(2048), mupenNX = true;
        
        const result = parse(data); // attempt to parse data as MPK.
        if(!result) {
            console.error(`ERROR: Data in file provided is not valid: ${filename}`);
            return false;
        }
        // parse and load any MPKMeta data
        if(result.data.length > 32784 && arrstr(result.data, MPKEdit.State.banks * 32768, MPKEdit.State.banks * 32768 + 7) === "MPKMeta")
            parseMPKMeta(result); // gimme those comments 

        // If result.data size is unexpected, resize it
        State.data = result.data !== (MPKEdit.State.banks * 32768) ? resize(result.data) : result.data;
        State.NoteTable = result.NoteTable;
        State.usedNotes = result.usedNotes;
        State.usedPages = result.usedPages;
        State.filename = filename || State.filename;
        State.fileDate = fileDate || State.fileDate;
        
        App.updateUI();
    }
};

MPKEdit.Parser = Parser;
App.eraseNote = eraseNote;
App.saveNote = saveNote;
App.saveMPK = saveMPK;
App.initMPK = initMPK;
}
