/*
 We need to implement note export/import!

 Also would be nice to generate empty MPK
 from scratch.
-----
Once file is loaded and valid, we should copy
valid header checksum to other slots.
-----
Look into functions: 
parseNoteTable, parseIndexTable
--------
It will be important that the program can recreate INODE and NOTE tables, from
the parsed data. Being able to wipe it, or initialize it may also be important.
-------
When performing a modification or saving
    1. Update inodeTable checksum
    2. Update backup
    3. Resize file to 32768
*/

function cancelEventAction(evt)
{
    evt.preventDefault();
};

function dropHandler(evt)
{
    // If length is zero, there are no files and this loop WON'T occur
    // If only reading one file, checking length is necessary
    for(var i = 0; i < evt.dataTransfer.files.length; i++)
    {
        var reader    = new FileReader();
        reader.name   = evt.dataTransfer.files[i].name;
        reader.onload = readData;
        // For DexDrive support we must read 36928 instead of 32768
        reader.readAsArrayBuffer(evt.dataTransfer.files[i].slice(0, 36928));
    }
    evt.preventDefault();
};

function readData(evt)
{
    var data = new Uint8Array(evt.target.result);
    
    // Detect and remove DexDrive headers
    if("123-456-STD" === String.fromCharCode.apply(null, data.subarray(0, 11)))
    {
        data = data.subarray(0x1040);
    }
    
    if(typeof MPK !== 'undefined' && data.subarray(32).length % 256 === 0 && 0xCAFE === (data[6]<<8) + data[7] && data[10] === 0 && data[11] === 0)
    {
        var note  = data.subarray(0, 32);
        var gdata = data.subarray(32);
        var pages = gdata.length / 256;
        
        if(MPK.Pages.pageCount + pages <= 123 && MPK.Notes.noteCount < 16){
            
            var slotsToUse = [];
            
            for(var i = 0xA; i < 0x100; i += 2)
            {
                if(slotsToUse.length == pages)
                {
                    break;
                }
                if(MPK.data[0x100 + i + 1] === 3)
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
                    MPK.data[dest1] = 0x01;
                    
                } else {
                    MPK.data[dest1] = slotsToUse[i+1];
                }
                
                for(var j = 0; j < 0x100; j++)
                {
                    MPK.data[dest2+j] = gdata[dest3+j];
                }
                
            }
            
            for(var i = 0; i < 16; i++)
            {
                if(MPK.Notes[i] === undefined)
                {
                    var dest = 0x300 + i*32;
                    for(var j = 0; j < 32; j++)
                    {
                        MPK.data[dest+j] = note[j];
                    }
                    break;
                }
            }
            
            for(var i = 0x10A, sum = 0; i < 0x200; i++)
            {
                sum += MPK.data[i];
            }
            MPK.data[0x101] = sum & 0xFF;
            
            var MemPak = readMemPak(MPK.data, MPK.filename);
            if(MemPak) {
                window.MPK = MemPak;
                doit(MemPak);
                console.log(MemPak);
            }
        } else { console.log("Not enough space!");}
    }
    else if(checksumValid(0x20, data))
    {
        var MemPak = readMemPak(data, evt.target.name);
        if(MemPak) {
            window.MPK = MemPak;
            doit(MemPak);
            console.log(MemPak);
        }
    }
};

function doit(MemPak)
{
    var str = "<b style='border-bottom:1px solid'>"+MemPak.filename+"</b>";
    for(var i = 0; i < 16; i++)
    {
           str += "<div></div>";
        if(MemPak.Notes[i] !== undefined)
        {
            str += "<div>"+i+" "+MemPak.Notes[i].gameCode+"</div>";
            
        } else
        {
            str += "<div>"+i+"</div>";
        }
    }
    document.body.innerHTML = str+"<hr><br>";
}

function exportNote(id, MemPak)
{
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
        file[6] = 0xCA; file[7] = 0xFE;
    var A = document.createElement('a');
        A.download = MemPak.Notes[id].gameCode+"_out.bin";
        A.href = "data:application/octet-stream;base64," +
                btoa(String.fromCharCode.apply(null, file));
        A.dispatchEvent(new MouseEvent('click'));
}

function exportPak(MemPak)
{
    var A = document.createElement('a');
        A.download = "out.mpk";
        A.href = "data:application/octet-stream;base64," +
                btoa(String.fromCharCode.apply(null, MemPak.data));
        A.dispatchEvent(new MouseEvent('click'));
}

function readMemPak(data, filename)
{
    var noteTable   = parseNoteTable(data);
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
    
    if(indexTable.noteCount !== noteTable.noteTable.noteCount)
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
        Pages: indexTable.Inodes
    };
};

function parseIndexTable(data, readBackup)
{
    var Parser = {
            "error": {
                "types":[],
                "count": 0
            },
            "indexes": [],
            "noteCount": 0,
            "Inodes": {"pageCount" : 0}
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
            Parser.Inodes.pageCount += indexes.length;
        }
        else
        {
            addError("NoEndInSequence", Parser.error);
            break;
        }
    }
    
    if(usedPages !== Parser.Inodes.pageCount)
    {
        addError("PageMismatchInSequence", Parser.error);
    }
    
    return Parser;
};

function parseNoteTable(data)
{
    var Parser = {
            "error": {
                "types":[],
                "count": 0
            },
            "indexes": [],
            "noteTable": {"noteCount": 0}
    };
        
    // Loop over NoteTable
    for(var i = 0x300; i < 0x500; i += 32)
    {
        var p = data[i + 0x07], a = data[i + 0x06],
            b = data[i + 0x0A], c = data[i + 0x0B];
            
        if(p >= 5 && p <= 127 && a === 0 && b === 0 && c === 0)
        {
            if(Parser.indexes.indexOf(p) !== -1)
            {
                addError("DuplicateFileFound", Parser.error);
            }
            
            Parser.indexes.push(p);
            Parser.noteTable.noteCount++;
            
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

window.addEventListener("dragover", cancelEventAction);
window.addEventListener("drop",     dropHandler);
