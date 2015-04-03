(function(){

"use strict";
var readFilename, $MPK;

function fileHandler(event)
{
    var i, files, reader;
    files = this.files || event.dataTransfer.files;

    // When files.length is 0 (no files), this loop won't occur (0 < 0 === false)
    for(i = 0; i < files.length; i++)
    {
        reader        = new FileReader();
        reader.name   = files[i].name;
        reader.onload = readData; // call readData when data is fully loaded

        // DexDrive support: We read 36928 instead of 32768 bytes
        reader.readAsArrayBuffer(files[i].slice(0, 36928));
    }
    event.preventDefault();
}

function readData(event)
{
    var i, data, data2, newMPK;
    data = new Uint8Array(event.target.result);
    
    // Detect and remove DexDrive header
    if(String.fromCharCode.apply(null, data.subarray(0, 11)) === "123-456-STD")
    {
        data = data.subarray(0x1040);
    }

    if(checkHeader(data) === true)
    {
        readFilename = event.target.name;
        
        data2 = new Uint8Array(32768);
        for(i = 0; i < data.length; i++) {
            data2[i] = data[i];
        }
        data = data2;

        newMPK = parseMPK(data, event.target.name);
        updateMPK(newMPK);
    }
    else if(typeof $MPK !== "undefined" && isNoteFile(data) === true)
    {
        importNote(data, $MPK);
    }
}

function parseMPK(data)
{
    var headrChk, noteTable, indexTable, ErrorReport;

    headrChk    = checkHeader(data);
    if(!headrChk) {return false;}

    noteTable   = parseNoteTable(data);
    indexTable  = parseIndexTable(data, false, noteTable.indexes);

    ErrorReport = {
        "types" : noteTable.error.types.concat(indexTable.error.types),
        "count" : noteTable.error.count + indexTable.error.count
    };

    if(ErrorReport.count > 0)
    {
        console.error(readFilename, ErrorReport.types);
        return false;
    }

    return {
        data: data,
        filename: readFilename,
        Notes: noteTable.noteTable,
        Indexes: indexTable.Indexes,
        usedNotes: noteTable.noteCount,
        usedPages: indexTable.pageCount
    };
}

function importNote(data, MemPak)
{
    var i, j, slotsToUse, newMPK, dest, dest1, dest2, dest3, note, gdata, pageCount;

    note      = data.subarray(0, 32);
    gdata     = data.subarray(32);
    pageCount = gdata.length / 256;

    if(MemPak.usedPages + pageCount <= 123 && MemPak.usedNotes < 16)
    {
        slotsToUse = [];
        for(i = 0xA; i < 0x100; i += 2)
        {
            if(slotsToUse.length === pageCount)
            {
                break;
            }

            if(MemPak.data[0x100 + i + 1] === 3)
            {
                slotsToUse.push(i / 2);
            }
        }

        note[0x06] = 0;
        note[0x07] = slotsToUse[0];

        for(i = 0; i < slotsToUse.length; i++)
        {
            dest1 = 0x100 + (slotsToUse[i] * 2) + 1;
            dest2 = 0x100 * slotsToUse[i];
            dest3 = 0x100 * i;

            if(i === slotsToUse.length - 1)
            {
                MemPak.data[dest1] = 0x01;
            } else {
                MemPak.data[dest1] = slotsToUse[i+1];
            }

            for(j = 0; j < 0x100; j++)
            {
                MemPak.data[dest2+j] = gdata[dest3+j];
            }
        }

        for(i = 0; i < 16; i++)
        {
            if(MemPak.Notes[i] === undefined)
            {
                dest = 0x300 + i * 32;
                for(j = 0; j < 32; j++)
                {
                    MemPak.data[dest+j] = note[j];
                }
                break;
            }
        }

        newMPK = parseMPK(MemPak.data, MemPak.filename);
        updateMPK(newMPK);
    } else {
        alert("Pages: " + MemPak.usedPages +  " / 123, Notes: " + MemPak.usedNotes + " / 16\n" +
              "Requires 1 Note and " + pageCount + " Page(s).");
    }
}

function updateUI(MemPak)
{
    var i, tr, name, gameCode, table;

    table = elem(["table"],
        elem(["tr"],
            elem(["th", "#"]),
            elem(["th", "Note"]),
            elem(["th", "Pages"]),
            elem(["th", ""])
        )
    );

    for(i = 0; i < 16; i++)
    {
        tr = elem(["tr"], elem(["td", i]), elem(["td"]));

        if(MemPak.Notes[i] !== undefined)
        {
            gameCode = MemPak.Notes[i].gameCode;

            if(typeof codeDB !== "undefined" && codeDB[gameCode])
            {
                name = codeDB[gameCode];
            } else {
                name = gameCode;
            }

            tr.appendChild(elem(["td"]));
            tr.childNodes[1].innerHTML   = MemPak.Notes[i].noteName + "<br><i>" + name + "</i>";
            tr.childNodes[2].textContent = MemPak.Indexes[MemPak.Notes[i].initialIndex].length;

            tr.appendChild(elem(["td"],
                elem(["button", {id: i, textContent: "Delete", onclick: deleteNote}]),
                elem(["button", {id: i, textContent: "Export", onclick: exportNote}])
            ));

        } else {
            tr.childNodes[1].textContent = "~";
            tr.childNodes[1].colSpan = 3;
            tr.style.opacity = 0.5;
        }

        table.appendChild(tr);
    }

    document.body = (elem(["body"],
        elem(["h2", MemPak.filename]),
        elem(["span", MemPak.usedPages + " / 123"]),
        elem(["button", {textContent: "Save MPK", onclick: exportMPK}]),
        elem(["input", {type: "file", multiple: true, onchange: fileHandler}]),
        table));
}

function parseIndexTable(data, readBackup, noteTableKeys)
{
    var i, c, p, p2, keyIndexes, indexes, foundEnd, sum,
        a = [], b = [], usedPages = 0, o = 0x100, Parser = {};

    Parser.error     = {types: [], count: 0};
    Parser.indexes   = [];
    Parser.noteCount = 0;
    Parser.pageCount = 0;
    Parser.Indexes   = {};

    // Check IndexTable and find keyIndexes
    for(i = o + 0xA; i < o + 0x100; i += 2)
    {
        p  = data[i + 1];
        p2 = data[i];

        if(p2 !== 0 || p !== 1 && p !== 3 && p < 5 || p > 127)
        {
            addError("IndexTableCorrupt", Parser.error);
        }

        if(p === 1 || p !== 3 && p >= 5 && p <= 127)
        {
            a.push( (i - o) / 2 );
            b.push(p);
            usedPages++;
        }
    }

    keyIndexes = a.filter(function(n)
    {
        return b.indexOf(n) === -1;
    });

    Parser.noteCount = keyIndexes.length;
    Parser.indexes   = keyIndexes;

    // Parse Index Sequences
    for(i = 0, c = 0; i < keyIndexes.length; i++)
    {
        p = keyIndexes[i];
        indexes  = [];
        foundEnd = false;

        // Follow Index Sequence
        while(p === 1 || p >= 5 && p <= 127 && c <= usedPages)
        {
            if(indexes.indexOf(p) !== -1)
            {
                addError("InfiniteLoopInSequence", Parser.error);
                break;
            }

            if(p === 1)
            {
                foundEnd = true;
                break;
            }

            indexes.push(p);

            p = data[(p * 2) + o + 1];
            c++;
        }

        if(foundEnd === true)
        {
            Parser.Indexes[keyIndexes[i]] = indexes;
            Parser.pageCount += indexes.length;
        } else {
            addError("NoEndInSequence", Parser.error);
            break;
        }
    }

    if(usedPages !== Parser.pageCount)
    {
        addError("PageMismatchInSequence", Parser.error);
    }

    // Update the checksum
    for(i = 0x10A, sum = 0; i < 0x200; i++)
    {
        sum += data[i];
    }
    sum &= 0xFF;

    if (data[0x101] !== sum)
    {
        data[0x101] = sum;
        console.log("INFO: Updating checksum... ", readFilename, data[0x101] === sum);
    }

    if(checkKeyIndexes(noteTableKeys, keyIndexes) === false)
    {
        addError("KeyIndexesDoNotMatch", Parser.error);
    }

    if(Parser.error.count > 0 && readBackup !== true)
    {
        console.log("INFO: Woops, restoring backup...", readFilename);

        for(i = 0; i < 0x100; i++)
        {
            data[0x100 + i] = data[0x200 + i];
        }
        return parseIndexTable(data, true, noteTableKeys);
    }
    else if(Parser.error.count === 0)
    {
        // Update backup with valid data
        for(i = 0; i < 0x100; i++)
        {
            data[0x200 + i] = data[0x100 + i];
        }
    }

    return Parser;
}

function parseNoteTable(data)
{
    var i, j, noteName, a, b, c, p, rangeOK, zerosOK, Parser = {}, n64code;

    Parser.error     = {types: [], count: 0};
    Parser.indexes   = [];
    Parser.noteCount = 0;
    Parser.noteTable = {};

    n64code = {0:"",3:"",15:"",16:"0",17:"1",18:"2",19:"3",20:"4",21:"5",22:"6",
    23:"7",24:"8",25:"9",26:"A",27:"B",28:"C",29:"D",30:"E",31:"F",32:"G",33:"H",
    34:"I",35:"J",36:"K",37:"L",38:"M",39:"N",40:"O",41:"P",42:"Q",43:"R",44:"S",
    45:"T",46:"U",47:"V",48:"W",49:"X",50:"Y",51:"Z",52:"!",53:'"',54:"#",55:"'",
    56:"*",57:"+",58:",",59:"-",60:".",61:"/",62:":",63:"=",64:"?",65:"@",66:"。",
    67:"゛",68:"゜",69:"ァ",70:"ィ",71:"ゥ",72:"ェ",73:"ォ",74:"ッ",75:"ャ",76:"ュ",77:"ョ",
    78:"ヲ",79:"ン",80:"ア",81:"イ",82:"ウ",83:"エ",84:"オ",85:"カ",86:"キ",87:"ク",88:"ケ",
    89:"コ",90:"サ",91:"シ",92:"ス",93:"セ",94:"ソ",95:"タ",96:"チ",97:"ツ",98:"テ",99:"ト",
    100:"ナ",101:"ニ",102:"ヌ",103:"ネ",104:"ノ",105:"ハ",106:"ヒ",107:"フ",108:"ヘ",
    109:"ホ",110:"マ",111:"ミ",112:"ム",113:"メ",114:"モ",115:"ヤ",116:"ユ",117:"ヨ",
    118:"ラ",119:"リ",120:"ル",121:"レ",122:"ロ",123:"ワ",124:"ガ",125:"ギ",126:"グ",
    127:"ゲ",128:"ゴ",129:"ザ",130:"ジ",131:"ズ",132:"ゼ",133:"ゾ",134:"ダ",135:"ヂ",
    136:"ヅ",137:"デ",138:"ド",139:"バ",140:"ビ",141:"ブ",142:"ベ",143:"ボ",144:"パ",
    145:"ピ",146:"プ",147:"ペ",148:"ポ"};

    // Loop over NoteTable
    for(i = 0x300; i < 0x500; i += 32)
    {
        p = data[i + 0x07]; a = data[i + 0x06];
        b = data[i + 0x0A]; c = data[i + 0x0B];

        rangeOK = (p >= 5 && p <= 127);
        zerosOK = (a === 0 && b === 0 && c === 0);

        if(zerosOK && rangeOK)
        {
            if((data[i + 0x08] & 0x02) === 0)
            {
                console.log("INFO: Fixing bit 0x08:2(%s) in %s", (i - 0x300) / 32, readFilename);
                data[i + 0x08] |= 0x02;
            }

            if(Parser.indexes.indexOf(p) !== -1)
            {
                addError("DuplicateNoteFound", Parser.error);
            }

            for(j = 0, noteName = ""; j < 16; j++)
            {
                noteName += n64code[data[i + 16 + j]];
            }

            if(data[i + 12] !== 0)
            {
                noteName += "." + n64code[data[i + 12]];
                noteName += n64code[data[i + 13]];
                noteName += n64code[data[i + 14]];
                noteName += n64code[data[i + 15]];
            }

            Parser.indexes.push(p);
            Parser.noteCount++;

            Parser.noteTable[(i - 0x300) / 32] = {
                "initialIndex":  p,
                "noteName":      noteName,
                "gameCode":      String.fromCharCode(data[i],data[i+1],data[i+2],data[i+3]),
                "publisherCode": String.fromCharCode(data[i+4],data[i+5])
            };
        }
    }

    return Parser;
}

function exportNote()
{
    var i, j, pageAddress, name, fn, MemPak, noteID, gameCode,
        indexes, fileOut, el;

    MemPak   = $MPK;
    noteID   = this.id;
    gameCode = MemPak.Notes[noteID].gameCode;
    indexes  = MemPak.Indexes[MemPak.Notes[noteID].initialIndex];
    fileOut  = [];
    el       = document.createElement("a");

    // Get Note Header
    for(i = 0; i < 32; i++)
    {
        fileOut.push(MemPak.data[0x300 + (noteID * 32) + i]);
    }

    fileOut[6] = 0xCA;
    fileOut[7] = 0xFE;

    // Get Page Data
    for(i = 0; i < indexes.length; i++)
    {
        pageAddress = indexes[i] * 0x100;
        for(j = 0; j < 0x100; j++)
        {
            fileOut.push(MemPak.data[pageAddress + j]);
        }
    }

    if(typeof codeDB !== "undefined" && codeDB[gameCode])
    {
        name = codeDB[gameCode];
    } else {
        name = gameCode;
    }

    fn = name + "," + crc32(fileOut) + ".note.bin";

    el.href = "data:application/octet-stream;base64," +
        btoa(String.fromCharCode.apply(null, fileOut));
    el.download = fn;
    el.dispatchEvent(new MouseEvent("click"));
}



function checkHeader(data)
{
    function calculateChecksum(o, data)
    {
        // X,Y = stored checksum | A,B = calculated checksum
        var i, sumX, sumY, sumA = 0, sumB = 0xFFF2;
        sumX  = (data[o + 28] << 8) + data[o + 29];
        sumY  = (data[o + 30] << 8) + data[o + 31];
    
        for(i = 0; i < 28; i += 2)
        {
            sumA += (data[o + i] << 8) + data[o + i + 1];
            sumA &= 0xFFFF;
        }
    
        sumB -= sumA;
    
        // Repair corrupt DexDrive checksums
        if(sumX === sumA && (sumY ^ 0x0C) === sumB)
        {
            sumY ^= 0xC;
            data[o + 31] ^= 0xC;
        }
    
        return (sumX === sumA && sumY === sumB);
    }
    
    var i, j, chk, currentLoc, loc, lastValidLoc;
    lastValidLoc = -1;
    loc  = [0x20, 0x60, 0x80, 0xC0];

    // Quickly check all locations, saving the last valid one.
    for(i = 0; i < loc.length; i++)
    {
        chk = calculateChecksum(loc[i], data);
        if(chk) { lastValidLoc = loc[i]; }
    }

    // Check all locations storing each result.
    for(i = 0; i < loc.length; i++)
    {
        currentLoc = loc[i];
        chk = calculateChecksum(currentLoc, data);

        // Detect and replace invalid locations
        if(lastValidLoc > -1 && chk === false)
        {
            //console.log("INFO: Replacing header_checksum at %s", currentLoc);
            for(j = 0; j < 32; j++)
            {
                data[currentLoc + j] = data[lastValidLoc + j];
            }
            chk = calculateChecksum(currentLoc, data);
        }

        loc[i] = chk;
    }

    return loc[0] && loc[1] && loc[2] && loc[3];
}

function deleteNote()
{
    var i, MemPak, targetIndex, noteID, noteKeyIndex, indexes, newMPK;
    MemPak       = $MPK;
    noteID       = parseInt(this.id, 10);
    noteKeyIndex = MemPak.Notes[noteID].initialIndex;
    indexes      = MemPak.Indexes[noteKeyIndex];

    // Mark Indexes as Free
    for(i = 0; i < indexes.length; i++)
    {
        targetIndex = 0x100 + (indexes[i] * 2) + 1;
        MemPak.data[targetIndex] = 0x03;
    }

    // Delete Note Entry
    for(i = 0; i < 32; i++)
    {
        targetIndex = 0x300 + (noteID * 32) + i;
        MemPak.data[targetIndex] = 0x00;
    }

    newMPK = parseMPK(MemPak.data, MemPak.filename);
    updateMPK(newMPK);
}

function exportMPK()
{
    var MemPak = $MPK,
        fn = (MemPak.filename).replace(".n64", ".mpk"),
        el = document.createElement("a");

    el.download = fn;
    el.href = "data:application/octet-stream;base64," +
        btoa(String.fromCharCode.apply(null, MemPak.data));
    el.dispatchEvent(new MouseEvent("click"));
}

function checkKeyIndexes(noteTableKeys, indexTableKeys)
{
    var i, count;
    
    if(noteTableKeys.length !== indexTableKeys.length) {return false;}

    for(i = 0, count = 0; i < noteTableKeys.length; i++)
    {
        // Check if noteTable and indexTable report the same key indexes
        if(noteTableKeys.indexOf(indexTableKeys[i]) > -1)
        {
             count++;
        }
        else {return false;}
    }

    return true;
}

function isNoteFile(data)
{
    var a = 0 === data[0x0A],
        b = 0 === data[0x0B],
        c = 0xCAFE === data[0x07] + (data[0x06] << 8),
        d = 0 === data.subarray(32).length % 256;

    return a && b && c && d;
}

function addError(errorName, errorReport)
{
    if(errorReport.types.indexOf(errorName) === -1)
    {
        errorReport.types.push(errorName);
    }

    errorReport.count++;
}

function updateMPK(MemPak)
{
    if(MemPak)
    {
        $MPK = MemPak;
        updateUI(MemPak);
    }
}

function crc32(data)
{
    var i, j, tmp, l, crc, table;

    l = data.length;
    crc = -1;
    table = new Uint32Array(256);

    for (i = 256; i--;) {
        for (j = 8, tmp = i; j--;) {
            tmp = tmp & 1 ? 3988292384 ^ tmp >>> 1 : tmp >>> 1;
        }
        table[i] = tmp;
    }

    for (i = 0; i < l; i++) {
        crc = crc >>> 8 ^ table[crc & 255 ^ data[i]];
    }

    return ("00000000"+((crc^-1)>>>0).toString(16)).slice(-8).toUpperCase();
}

function elem()
{
    var i;
    var keys    = {};
    var elmnt   = null;
    var tagName = arguments[0][0]; // Argument 0 -> Index 0 (String)
    var prop    = arguments[0][1]; // Argument 0 -> Index 1 (Object)

    if(typeof tagName === "string")
    {
        elmnt = document.createElement(tagName);
    } else {
        // use a doc fragment if no tag specified
        elmnt = document.createDocumentFragment();
    }

    if(typeof prop === "object")
    {
        keys = Object.keys(prop);
    }
    else if(typeof prop !== "object")
    {
        elmnt.textContent = prop;
    }

    for(i = 0; i < keys.length; i++)
    {
        var key    = keys[i];
        var method = elmnt[key.slice(2)];

        // specify methods with $_
        if(key.indexOf("$_") > -1)
        {
            // run a method with array of arguments
            method.apply(elmnt, prop[key]);
        } else {
            elmnt[key] = prop[key];
        }
    }

    // look for other elements to append
    if(arguments.length > 1)
    {
        for(i = 1; i < arguments.length; i++)
        {
            // check if the argument is an element
            if(arguments[i].nodeType > 0)
            {
                elmnt.appendChild(arguments[i]);
            }
        }
    }

    return elmnt;
}

function init()
{
    window.addEventListener("dragover", function(event) {
        event.preventDefault();
    });
    window.addEventListener("drop", fileHandler);

    var i, EMPTY_DATA, newMPK, initMemPak;
    // Very lazy MPK initializer
    EMPTY_DATA = [
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00,
        0x01, 0x01, 0xFE, 0xF1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x01, 0x00, 0x01, 0x01, 0xFE, 0xF1, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00,
        0x01, 0x01, 0xFE, 0xF1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x01, 0x00, 0x01, 0x01, 0xFE, 0xF1, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x71, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03,
        0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03
    ];

    initMemPak = {data: new Uint8Array(32768)};

    for(i = 0; i < EMPTY_DATA.length; i++)
    {
        initMemPak.data[i] = EMPTY_DATA[i];
    }
    readFilename = "New.mpk";
    newMPK = parseMPK(initMemPak.data);
    updateMPK(newMPK);
}

window.$_MPKEditor = {
    init: init
};

})();

addEventListener("load", function()
{
    $_MPKEditor.init();
});