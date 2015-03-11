/*
MAR.11.15 - I guess I lost some recent changes to
the code.

readMemPak
 * Restore valid backup Inodes
 * Repair Inode checksums
 * Replace indexTable with indexTable2.
 * Recheck everything before continuing.

 That should be the LAST validation task.

 From then on, we can work on the "file loaded"
 state. We need to implement note export/import!

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
    1. Update indexTable checksum
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
        // For DexDrive we have to read more than 32768 bytes
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
    
    // Don't do anything unless checksum is valid
    if(checksumValid(0x20, data))
    {
        var MemPak = readMemPak(data, evt.target.name);
        if(MemPak){console.log(MemPak)}
    }
};

function readMemPak(data, filename)
{
    var noteTable   = parseNoteTable(data);
    var indexTable  = parseIndexTable(data, false);
    var indexTable2 = parseIndexTable(data, true); // TODO: Check Backup...
    
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
        Notes: noteTable.noteTable,
        Pages: indexTable.Inodes
    };
};

function parseIndexTable(data, readBackup)
{
    var o = readBackup ? 0x200 : 0x100,
        a = [],
        b = [],
        usedPages = 0,
        Parser = {
            "noteCount": 0,
            "error": {
                "types":[],
                "count": 0
                },
            "indexes": [],
            "Inodes": {"pageCount" : 0}
        };
        
    // Check the IndexTable
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
            
        while (p === 1 || p >= 5 && p <= 127 && c <= usedPages)
        {
            if (indexes.indexOf(p) !== -1)
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
            if (Parser.indexes.indexOf(p) !== -1)
            {
                addError("DuplicateFileFound", Parser.error);
            }
            
            Parser.indexes.push(p);
            Parser.noteTable.noteCount++;
            
            Parser.noteTable[(i - 0x300) / 32] = {
                "initialIndex": p
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
    // Check if Note indexes exist in indexTable
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
