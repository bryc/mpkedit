var cancelEventAction = function(evt)
{
    evt.preventDefault();
};

var dropEventHandler = function(evt)
{
    // If length is zero, there are no files and this loop won't occur
    // If only reading one file, checking length is necessary
    for(var i = 0; i < evt.dataTransfer.files.length; i++)
    {
        loadData(evt.dataTransfer.files[i]);
    }
    evt.preventDefault();
};

window.addEventListener("dragover", cancelEventAction);
window.addEventListener("drop", dropEventHandler);

var loadData = function(file)
{
    var reader    = new FileReader();
    reader.name   = file.name;
    reader.onload = readData;
    // For DexDrive we have to read more than 32768 bytes
    reader.readAsArrayBuffer(file.slice(0, 36928));
};

var readData = function(evt)
{
    var data = new Uint8Array(evt.target.result);
    
    // Detect and remove DexDrive headers
    if(String.fromCharCode.apply(null, data.subarray(0,11)) === "123-456-STD")
    {
        data = data.subarray(0x1040);
    }
    
    // Don't do anything unless checksum is valid
    if(checksumValid(0x20, data))
    {
        var MemPak = readMemPak(data, evt.target.name);
    }
};

var readMemPak = function(data, f)
{
    /*
    When loading a file
        1. If primary is invalid, check and restore from backup
    
    When performing a modification or saving
        1. Update indexTable checksum
        2. Update backup
        3. Resize file to 32768
    */
    
    var noteTable   = parseNoteTable(data);
    var indexTable  = readIndexTable(data, false);
    var indexTable2 = readIndexTable(data, true);
    
    if(indexTable.error.count > 0 && indexTable2.error.count === 0)
    {
        /*
            indexTable_1 is invalid, but indexTable_2 is valid.
            TODO: Restore the backup data, and proceed.
        */
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
        console.log("Error: ", f, ErrorReport.types);
    }
    
    console.log("Success - what should be returned?");
    return {
        "Notes": noteTable,
        "Pages": indexTable
    };
};

var addError = function(errorName, errorReport)
{
    if(errorReport.types.indexOf(errorName) === -1)
    {
        errorReport.types.push(errorName);
    }
    errorReport.count++;
};

var checksumValid = function(o, data)
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

var allNotesExist = function(fileIndexes, pageIndexes)
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

var parseNoteTable = function(data)
{
    var Parser = {
        "noteCount": 0,
        "error": {
            "types":[],
            "count": 0
            },
        "indexes": [],
        "noteTable": {}
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
            Parser.noteCount++;
            
            Parser.noteTable[(i - 0x300) / 32] = {
                "initialIndex": p
            };
        }
    }
    return Parser;
};

var readIndexTable = function(data, readBackup)
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
