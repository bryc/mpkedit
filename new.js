var MPK = false;

function readData(evt)
{
    var data = new Uint8Array(evt.target.result);
    
    // Detect and remove DexDrive headers
    if("123-456-STD" === String.fromCharCode.apply(null, data.subarray(0, 11)))
    {
        data = data.subarray(0x1040);
    }
    
    if(checksumValid(0x20, data))
    {
        var MemPak = readMemPak(data, evt.target.name);
        updateMPK(MemPak);
        
    }
    else if(MPK !== false && isNote(data))
    {
        importNotes(data, MPK);
    }
};

function readMemPak(data, filename)
{
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
        filename: filename,
        data: data,
        Notes: noteTable.noteTable,
        Pages: indexTable.Inodes,
        noteCount: noteTable.noteCount,
        pageCount: indexTable.pageCount
    };
};

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
        
        for(var i = 0x10A, sum = 0; i < 0x200; i++)
        {
            sum += MemPak.data[i];
        }
        MemPak.data[0x101] = sum & 0xFF;
        
        var pak = readMemPak(MemPak.data, MemPak.filename);
        updateMPK(pak);

    } else {
        alert("Requires "+pages+" Pages.")
        console.log("Not enough space!");
    }
}

function updateMPK(MemPak)
{
    if(MemPak)
    {
        MPK = MemPak;
        doit(MemPak);
        //console.log(MemPak);
    }
}

function delNote()
{
    var iu = parseInt(this.id,10);

    var YY = MPK.Notes[iu].initialIndex;
    var YB = MPK.Pages[YY];
    for(var i = 0; i < YB.length; i++)
    {
        var dest1 = 0x100 + (YB[i] * 2) + 1;
        MPK.data[dest1] = 0x03;
    }

    var dest = 0x300 + iu*32;
    for(var j = 0; j < 32; j++)
    {
        MPK.data[dest+j] = 0x00;
    }
    var pak = readMemPak(MPK.data, MPK.filename);
    updateMPK(pak);
}

function doit(MemPak)
{

    var table =  elem(["table"],
            elem(["tr"],
                elem(["th","#"]),
                elem(["th","Note"]),
                elem(["th","Pages"]),
                elem(["th",""])
                )
        );

    for(var i = 0; i < 16; i++)
    {
        var tr = elem(["tr"], elem(["td",i]), elem(["td"]))
        if(MemPak.Notes[i] !== undefined)
        {
            var iu = MemPak.Notes[i].gameCode;
            tr.appendChild(elem(["td"]));
            tr.childNodes[1].textContent = codes[iu] || iu;
            tr.childNodes[2].textContent = MemPak.Pages[MemPak.Notes[i].initialIndex].length;

            tr.appendChild(elem(["td"],
                elem(["button",{id:i, innerHTML:"Delete", onclick: delNote}]),
                elem(["button",{id:i, innerHTML:"Export", onclick: exportNote}])
                ));
            
        } else
        {
            tr.childNodes[1].textContent = "~";
            tr.childNodes[1].colSpan = 3;
            tr.style.opacity = 0.5;
        }
        tr.app

        table.appendChild(tr);
    }
    document.body =(elem(["body"], 
        elem(["h2",MemPak.filename]),
        elem(["span",MemPak.pageCount + " / 123"]),
        elem(["button",{innerHTML:"Save MPK", onclick: exportPak}]),
        elem(["input",{type:"file", multiple:true, onchange: dropHandler}]),
        table));
}

function crc32(data)
{
    var table = new Uint32Array(256);var crc= -1;
    for (var i = 256; i--;)
    {
        var tmp = i;
        for (var k = 8; k--;)
        {
            tmp = tmp & 1 ? 3988292384 ^ tmp >>> 1 : tmp >>> 1;
        }
        table[i] = tmp;
    }
  
    for (var i = 0, l = data.length; i < l; i++)
    {
        crc = crc >>> 8 ^ table[crc & 255 ^ data[i]];
    }
  
    return ("00000000"+((crc ^ -1) >>> 0).toString(16).toUpperCase()).slice(-8);
}

function parseIndexTable(data, readBackup)
{
    var Parser = {
            "error": {
                "types":[],
                "count": 0
            },
            "indexes": [],
            "noteCount": 0,
            "pageCount" : 0,
            "Inodes": {}
    };
    
    var o = readBackup ? 0x200 : 0x100,
        a = [],
        b = [],
        usedPages = 0;
    
    // Loop over the IndexTable
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
    
    // Parse Index Sequences
    Parser.noteCount = keyPages.length, 
    Parser.indexes   = keyPages;
    
    for(var i = 0; i < keyPages.length; i++)
    {
        var indexes  = [],
            foundEnd = false,
            c        = 0,
            p        = keyPages[i];
            
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
            
            p = data[ (p * 2) + o + 1 ];
            c++;
        }
        
        if(foundEnd === true)
        {
            Parser.Inodes[keyPages[i]] = indexes;
            Parser.pageCount += indexes.length;
        }
        else
        {
            addError("NoEndInSequence", Parser.error);
            break;
        }
    }
    
    if(usedPages !== Parser.pageCount)
    {
        addError("PageMismatchInSequence", Parser.error);
    }
    
    return Parser;
};

function parseNoteTable(data,f)
{
    var Parser = {
            "error": {
                "types":[],
                "count": 0
            },
            "indexes": [],
            "noteCount": 0,
            "noteTable": {}
    };
        
    // Loop over NoteTable
    for(var i = 0x300; i < 0x500; i += 32)
    {
        var p = data[i + 0x07], a = data[i + 0x06],
            b = data[i + 0x0A], c = data[i + 0x0B];
        var _pp = data[i + 0] + data[i + 1] + data[i + 2] + data[i + 3];
        var _pq = data[i + 4] + data[i + 5];

        var rangeOK = (p >= 5 && p <= 127);
        var zerosOK = (a === 0 && b === 0 && c === 0);
        var codesOK = true;

 
        if(zerosOK && rangeOK && codesOK)
        {
            if(_pq === 0)
            {
                console.log("Fixing companyCode");
                data[i + 0x05] = 0x01;
            }
            data[i + 0x08] |= 0x02;

            if(Parser.indexes.indexOf(p) !== -1)
            {
                addError("DuplicateFileFound", Parser.error);
            }
            
            Parser.indexes.push(p);
            Parser.noteCount++;
            
            Parser.noteTable[(i - 0x300) / 32] = {
                "initialIndex": p,
                "gameCode": String.fromCharCode(data[i],data[i+1],data[i+2],data[i+3])
            };
        }
    }

    return Parser;
};

function checksumValid(o, data)
{
    // X,Y = stored checksum -- A,B = calculated checksum
    var sumX  = (data[o + 28] << 8) + data[o + 29],
        sumY  = (data[o + 30] << 8) + data[o + 31],
        sumA  = 0,
        sumB  = 0xFFF2;
        
    for(var i = 0; i < 28; i += 2)
    {
        sumA += (data[o + i] << 8) + data[o + i + 1];
        sumA &= 0xFFFF;
    }
    
    sumB -= sumA;
    
    // Repair corrupt DexDrive checksums
    if(sumX === sumA && sumY !== sumB)
    {
        sumY ^= 0xC;
        data[o + 31] ^= 0xC;
    }
    
    return (sumX === sumA && sumY === sumB);
};

function exportNote(id, MemPak)
{
        id = this.id || id;
        MemPak = MPK || MemPak;

        if(MemPak.Notes[id] == undefined)
        {
            return false;
        }
        var file = [], x = MemPak.Pages[MemPak.Notes[id].initialIndex];
        
        for(var i = 0; i < 32; i++)
        {
            file.push(MemPak.data[0x300 + (id * 32) + i]);
        }
        
        for(i = 0; i < x.length; i++)
        {
            var addr = x[i] * 0x100;
            for(var j = 0; j < 0x100; j++)
            {
                file.push(MemPak.data[addr + j]);
            }
        }
        var iu = MemPak.Notes[id].gameCode;
        var jjj = codes[iu] ? codes[iu] : iu;
        
        file[6] = 0xCA; file[7] = 0xFE;
    var A = document.createElement('a');
        A.download = jjj+"_"+crc32(file)+"_note.bin";
        A.href = "data:application/octet-stream;base64," +
                btoa(String.fromCharCode.apply(null, file));
        A.dispatchEvent(new MouseEvent('click'));
}

function exportPak(MemPak)
{
    MemPak = MPK || MemPak;
    var A = document.createElement('a');
        A.download = MPK.filename+".mpk";
        A.href = "data:application/octet-stream;base64," +
                btoa(String.fromCharCode.apply(null, MemPak.data));
        A.dispatchEvent(new MouseEvent('click'));
}

function allNotesExist(fileIndexes, pageIndexes)
{
    // Check if fileIndexes and pageIndexes are equal
    for(var i = 0, testPassed = false; i < 16; i++)
    {
        if(fileIndexes.sort().toString() === pageIndexes.sort().toString())
        {
            testPassed = true;
        }
    }
    
    return testPassed;
};

function addError(errorName, errorReport)
{
    if(errorReport.types.indexOf(errorName) === -1)
    {
        errorReport.types.push(errorName);
    }

    errorReport.count++;
};

function cancelEventAction(evt)
{
    evt.preventDefault();
};

function dropHandler(evt)
{
    // If length is zero, there are no files and this loop WON'T occur
    // If only reading one file, checking length is necessary
    var files = this.files || evt.dataTransfer.files;
    
    for(var i = 0; i < files.length; i++)
    {
        var reader    = new FileReader();
        reader.name   = files[i].name;
        reader.onload = readData;
        // For DexDrive support we must read 36928 instead of 32768
        reader.readAsArrayBuffer(files[i].slice(0, 36928));
    }
    evt.preventDefault();
};

function isNote(data)
{
    var a = 0 === data[10],
        b = 0 === data[11],
        c = 0xCAFE === data[7] + (data[6]<<8),
        d = 0 === data.subarray(32).length % 256;

    return a && b && c && d;
}

var elem = function()
{
    var keys    = {};
    var elmnt   = null;
    var tagName = arguments[0][0]; // Argument 0 -> Index 0 (String)
    var prop    = arguments[0][1]; // Argument 0 -> Index 1 (Object)
 
    if(typeof tagName === "string")
    {
        elmnt = document.createElement(tagName);
    }
    else
    {
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
        }
        else
        {
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
};

window.addEventListener("dragover", cancelEventAction);
window.addEventListener("drop",     dropHandler);

// Very lazy MPK initializer

var empty = [
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

MPK = {
    data: new Uint8Array(32768)
};

for(var i = 0; i < empty.length; i++)
{
    MPK.data[i] = empty[i];
}

var pak = readMemPak(MPK.data, "MemPak.mpk");
updateMPK(pak);
