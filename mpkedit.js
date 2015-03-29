/* jshint bitwise: false */
window.addEventListener("load", function()
{
    window.addEventListener("dragover", function(evt) {
        evt.preventDefault();
    });
    window.addEventListener("drop", dropHandler);
    
    // Very lazy MPK initializer
    
    var EMPTY_DATA = [
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
    
    $MPK = {data: new Uint8Array(32768)};

    for(var i = 0; i < EMPTY_DATA.length; i++)
    {
        $MPK.data[i] = EMPTY_DATA[i];
    }
    
    var newPak = readMemPak($MPK.data, "MemPak.mpk");
    updateMPK(newPak);
});

function dropHandler(evt)
{
    var files = this.files || evt.dataTransfer.files;

    // If length is zero, there are no files and this loop WON'T occur
    // If only reading one file, checking length is necessary
    for(var i = 0; i < files.length; i++)
    {
        var reader    = new FileReader();
        reader.name   = files[i].name;
        reader.onload = readData;

        // For DexDrive support we must read 36928 instead of 32768
        reader.readAsArrayBuffer(files[i].slice(0, 36928));
    }
    evt.preventDefault();
}

function readData(evt)
{
    var data = new Uint8Array(evt.target.result);
    
    // Detect and remove DexDrive header
    if(String.fromCharCode.apply(null, data.subarray(0, 11)) === "123-456-STD")
    {
        data = data.subarray(0x1040);
    }
    
    if(headerCheck(data) === true)
    {
        var _dat = new Uint8Array(32768);
        for(var i = 0; i < data.length; i++) {_dat[i] = data[i];}
        data = _dat;
        
        var MemPak = readMemPak(data, evt.target.name);
        updateMPK(MemPak);
    }
    else if(typeof $MPK !== "undefined" && isNoteFile(data) === true)
    {
        importNotes(data, $MPK);
    }
}

function readMemPak(data, filename)
{
    var headrChk = headerCheck(data);
    if(!headrChk) { return false; }
    
    var noteTable   = parseNoteTable(data, filename);
    var indexTable  = parseIndexTable(data, false);
    var indexTable2 = parseIndexTable(data, true);
    
    // If main indexTable corrupt but backup is valid, restore it.
    if(indexTable.error.count > 0 && indexTable2.error.count === 0)
    {
        for(var i = 0; i < 0x100; i++)
        {
            data[0x100 + i] = data[0x200 + i];
        }
        indexTable = parseIndexTable(data, false);
    }
    
    // Update the checksum
    for(var i = 0x10A, sum = 0; i < 0x200; i++)
    {
        sum += data[i];
    }

    data[0x101] = sum & 0xFF;
        
    var ErrorReport = {
        "types" : noteTable.error.types.concat(indexTable.error.types),
        "count" : noteTable.error.count + indexTable.error.count
    };
    
    if(indexTable.noteCount !== noteTable.noteCount)
    {
        addError("NoteCountMismatch", ErrorReport);
    }
    
    if(allNotesExist(noteTable.indexes, indexTable.indexes) === false)
    {
        addError("NoteDoesNotExist", ErrorReport);
    }
    
    if(ErrorReport.count > 0)
    {
        console.error(filename, ErrorReport.types);
        return false;
    }

    return {
        data: data,
        filename: filename,
        Notes: noteTable.noteTable,
        Pages: indexTable.Inodes,
        noteCount: noteTable.noteCount,
        pageCount: indexTable.pageCount
    };
}

function importNotes(data, MemPak)
{
    var note  = data.subarray(0, 32);
    var gdata = data.subarray(32);
    var pages = gdata.length / 256;

    if(MemPak.pageCount + pages <= 123 && MemPak.noteCount < 16){
        
        var slotsToUse = [];
        
        for(var i = 0xA; i < 0x100; i += 2)
        {
            if(slotsToUse.length == pages)
            {
                break;
            }

            if(MemPak.data[0x100 + i + 1] === 3)
            {
                slotsToUse.push((i) / 2);
            }
        }
        
        note[6] = 0; note[7] = slotsToUse[0];
        for(var i = 0; i < slotsToUse.length; i++)
        {   
            var dest1 = 0x100 + (slotsToUse[i] * 2) + 1;
            var dest2 = 0x100 * slotsToUse[i];
            var dest3 = 0x100 * i;
            
            if(i === slotsToUse.length-1)
            {
                MemPak.data[dest1] = 0x01;
                
            } else {
                MemPak.data[dest1] = slotsToUse[i+1];
            }
            
            for(var j = 0; j < 0x100; j++)
            {
                MemPak.data[dest2+j] = gdata[dest3+j];
            }
            
        }
        
        for(var i = 0; i < 16; i++)
        {
            if(MemPak.Notes[i] === undefined)
            {
                var dest = 0x300 + i*32;
                for(var j = 0; j < 32; j++)
                {
                    MemPak.data[dest+j] = note[j];
                }
                break;
            }
        }
        
        var newPak = readMemPak(MemPak.data, MemPak.filename);
        updateMPK(newPak);
    } else {
        alert("Requires " + pages + " Pages. There's only " + (123 - MemPak.pageCount) + " left.");
    }
}

function createUI(MemPak)
{
    var table = elem(["table"],
            elem(["tr"],
                elem(["th", "#"]),
                elem(["th", "Note"]),
                elem(["th", "Pages"]),
                elem(["th", ""])
            )
        );

    for(var i = 0; i < 16; i++)
    {
        var tr = elem(["tr"], elem(["td", i]), elem(["td"]));

        if(MemPak.Notes[i] !== undefined)
        {
            var iu = MemPak.Notes[i].gameCode, name;
            
            if(typeof codeDB !== "undefined")
            {
                name = codeDB[iu] ? codeDB[iu] : iu;
            } else {
                name = MemPak.Notes[i].gameCode;
            }

            tr.appendChild(elem(["td"]));
            tr.childNodes[1].innerHTML   = MemPak.Notes[i].noteName + "<br><i>" + name + "</i>";
            tr.childNodes[2].textContent = MemPak.Pages[MemPak.Notes[i].initialIndex].length;

            tr.appendChild(elem(["td"],
                elem(["button", {id: i, textContent: "Delete", onclick: delNote}]),
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
        elem(["span", MemPak.pageCount + " / 123"]),
        elem(["button", {textContent: "Save MPK", onclick: exportPak}]),
        elem(["input", {type: "file", multiple: true, onchange: dropHandler}]),
        table));
}

function parseIndexTable(data, readBackup)
{
    var Parser = {};
        Parser.error     = {types: [], count: 0};
        Parser.indexes   = [];
        Parser.noteCount = 0;
        Parser.pageCount = 0;
        Parser.Inodes    = {};

    // Loop over the IndexTable
    var a = [], b = [], usedPages = 0,
        o = readBackup ? 0x200 : 0x100;

    for(var i = o + 0xA; i < o + 0x100; i += 2)
    {
        var p  = data[i + 1],
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
    
    var keyPages = a.filter(function(n)
    {
        return b.indexOf(n) === -1;
    });
    
    Parser.noteCount = keyPages.length; 
    Parser.indexes   = keyPages;

    // Parse Index Sequences
    for(var i = 0; i < keyPages.length; i++)
    {
        var indexes  = [],
            foundEnd = false,
            p        = keyPages[i],
            c        = 0;
            
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
            Parser.Inodes[keyPages[i]] = indexes;
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
    
    return Parser;
}

function parseNoteTable(data, filename)
{
    var Parser = {};
        Parser.error     = {types: [], count: 0};
        Parser.indexes   = [];
        Parser.noteCount = 0;
        Parser.noteTable = {};

    var n64code = {0:"",3:"",15:"",16:"0",17:"1",18:"2",19:"3",20:"4",21:"5",22:"6",
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
    for(var i = 0x300; i < 0x500; i += 32)
    {
        var p = data[i + 0x07], a = data[i + 0x06],
            b = data[i + 0x0A], c = data[i + 0x0B],

            rangeOK = (p >= 5 && p <= 127),
            zerosOK = (a === 0 && b === 0 && c === 0);
 
        if(zerosOK && rangeOK)
        {
            if((data[i + 0x08] & 0x02) === 0)
            {
                console.log("INFO: Fixing bit 0x08:2(%s) in %s", (i - 0x300) / 32, filename);
                data[i + 0x08] |= 0x02;
            }
            
            if(Parser.indexes.indexOf(p) !== -1)
            {
                addError("DuplicateNoteFound", Parser.error);
            }
            
            for(var k = 0, name = ""; k < 16; k++)
            {
                name += n64code[data[i + 16 + k]];
            }

            if(data[i + 12] !== 0)
            {
                name += "." + n64code[data[i + 12]];
                name += n64code[data[i + 13]];
                name += n64code[data[i + 14]];
                name += n64code[data[i + 15]];
            }
            
            Parser.indexes.push(p);
            Parser.noteCount++;
            
            Parser.noteTable[(i - 0x300) / 32] = {
                "initialIndex":  p,
                "noteName":      name,
                "gameCode":      String.fromCharCode(data[i],data[i+1],data[i+2],data[i+3]),
                "publisherCode": String.fromCharCode(data[i+4],data[i+5])
            };
        }
    }

    return Parser;
}

function exportNote()
{
    var id     = this.id;
    var MemPak = $MPK;

    var file = [], x = MemPak.Pages[MemPak.Notes[id].initialIndex];
    
    // Get Note Header
    for(var i = 0; i < 32; i++)
    {
        file.push(MemPak.data[0x300 + (id * 32) + i]);
    }

    file[6] = 0xCA; file[7] = 0xFE;

    // Get Page Data
    for(i = 0; i < x.length; i++)
    {
        var addr = x[i] * 0x100;
        for(var j = 0; j < 0x100; j++)
        {
            file.push(MemPak.data[addr + j]);
        }
    }

    var iu   = MemPak.Notes[id].gameCode;
    var name = typeof codeDB !== "undefined" && codeDB[iu] ? codeDB[iu] : iu;

    var A = document.createElement("a");
    A.download = name + "_" + crc32(file) + "_note.bin";
    A.href = "data:application/octet-stream;base64," +
            btoa(String.fromCharCode.apply(null, file));
    A.dispatchEvent(new MouseEvent("click"));
}

function check(o, data)
{
    // X,Y = stored checksum -- A,B = calculated checksum
    var sumX  = (data[o + 28] << 8) + data[o + 29],
        sumY  = (data[o + 30] << 8) + data[o + 31],
        sumA  = 0, sumB  = 0xFFF2;
        
    for(var i = 0; i < 28; i += 2)
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

function headerCheck(data)
{
    var loc = [0x20, 0x60, 0x80, 0xC0];
    var loc2 = -1;

    for(var i = 0; i < loc.length; i++)
    {
        var chk = check(loc[i], data);
        if(chk) { loc2 = loc[i]; }
    }
    
    for(var i = 0; i < loc.length; i++)
    {
        var key = loc[i], chk = check(key, data);
        
        // Detect and replace invalid locations
        if(loc2 > -1 && chk === false)
        {
            //console.log("INFO: Replacing header_checksum at %s", key);
            for(var j = 0; j < 32; j++)
            {
                data[key + j] = data[loc2 + j];
            }
            chk = check(key, data);
        }
        
        loc[i] = chk;
    }
    
    return loc[0] && loc[1] && loc[2] && loc[3];
}

function delNote()
{
    var id = parseInt(this.id, 10);

    // Mark Inodes as "Free"
    var YY = $MPK.Notes[id].initialIndex, YB = $MPK.Pages[YY];
    for(var i = 0; i < YB.length; i++)
    {
        var dest1 = 0x100 + (YB[i] * 2) + 1;
        $MPK.data[dest1] = 0x03;
    }

    // Delete Note Entry
    var dest = 0x300 + id * 32;
    for(var j = 0; j < 32; j++)
    {
        $MPK.data[dest+j] = 0x00;
    }

    var pak = readMemPak($MPK.data, $MPK.filename);
    updateMPK(pak);
}

function exportPak()
{
    var MemPak = $MPK;
    var A = document.createElement("a");
    A.download = MemPak.filename.replace(".n64", ".mpk");
    A.href = "data:application/octet-stream;base64," +
            btoa(String.fromCharCode.apply(null, MemPak.data));
    A.dispatchEvent(new MouseEvent("click"));
}

function allNotesExist(fileIndexes, pageIndexes)
{
    // Check if noteTable and inodeTable report the same key nodes
    // TODO: more efficient method?
    var testPassed = false;

    if(fileIndexes.sort().toString() === pageIndexes.sort().toString())
    {   
        testPassed = true;
    }
    
    return testPassed;
}

function isNoteFile(data)
{
    var a = 0 === data[10],
        b = 0 === data[11],
        c = 0xCAFE === data[7] + (data[6] << 8),
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
        createUI(MemPak);
    }
}

function crc32(data)
{
    var table = new Uint32Array(256);var crc= -1;
    for (var i = 256; i--;) {
        for (var k = 8, tmp = i; k--;) {
            tmp = tmp & 1 ? 3988292384 ^ tmp >>> 1 : tmp >>> 1;
        }
        table[i] = tmp;
    }
  
    for (var i = 0, l = data.length; i < l; i++) {
        crc = crc >>> 8 ^ table[crc & 255 ^ data[i]];
    }
  
    return ("00000000"+((crc^-1)>>>0).toString(16).toUpperCase()).slice(-8);
}

function elem()
{
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
 
    for(var i = 0; i < keys.length; i++)
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
        for(var i = 1; i < arguments.length; i++)
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
