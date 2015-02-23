var dropEventHandler = function(evt)
{
    for(var i = 0; i < evt.dataTransfer.files.length; i++)
    {
        loadData(evt.dataTransfer.files[i]);
    }
    evt.preventDefault();
};

var cancelEventAction = function(evt)
{
    evt.preventDefault();
};

window.addEventListener("dragover", cancelEventAction);
window.addEventListener("drop", dropEventHandler);

var ErrorReport = {};

var readData = function(evt)
{
    var data = new Uint8Array(evt.target.result);
    for(str = "", i = 0; i < 11; i++)
    {
        str += String.fromCharCode(data[i]);
    }
    if(str == "123-456-STD")
    {
        data = data.subarray(0x1040);
    }
    
    if(checksumValid(0x20, data))
    {
        ErrorReport.Count = 0;
        var MemPak = readMemPak(data);
        
        if(ErrorReport.Count)
        {
            console.log(ErrorReport, evt.target.name);
        } else
        {
            console.log(MemPak);
        }
    }
};

var loadData = function(file)
{
    var reader    = new FileReader();
    reader.name   = file.name;
    reader.onload = readData;
    reader.readAsArrayBuffer(file.slice(0, 36928));
};

var checksumValid = function(o, data)
{
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

var readMemPak = function(data)
{
    // File Table ******************************************************
    
    var fileTable = {"numUsed": 0},
        indexes   = [];
    
    for(var i = 0x300; i < 0x500; i += 32)
    {
        var p = data[i + 0x07], a = data[i + 0x06],
            b = data[i + 0x0A], c = data[i + 0x0B];
            
        if(p >= 5 && p <= 127 && a === 0 && b === 0 && c === 0)
        {
            if (indexes.indexOf(p) !== -1)
            {
                ErrorReport.Count++;
                ErrorReport.DuplicateFileFound = true;
            }
            
            indexes.push(p);
            
            fileTable[(i - 0x300) / 32] = {
                "initialIndex": p
            };
            fileTable.numUsed++;
        }
    }
    
    // Index Table *****************************************************
    // TODO: Make into it's own function with offset
    
    var a = [],
        b = [],
        usedPages = 0;
    
    for(var i = 0x10A; i < 0x200; i += 2)
    {
        var p  = data[i + 1],
            p2 = data[i];
            
        if(p2 !== 0 || p !== 1 && p !== 3 && p < 5 || p > 127)
        {
            ErrorReport.IndexCorrupt = true;
            ErrorReport.Count++;
        }
        else if(p === 1 || p !== 3 && p >= 5 && p <= 127)
        {
            a.push((i - 0x100) / 2);
            b.push(p);
            usedPages++;
        }
    }
    
    var keyPages = a.filter(function(n)
    {
        return b.indexOf(n) === -1;
    });

    // Parse Index Sequences
    
    var foundFiles = {},
        pageCount  = 0;
    
    for(var i = 0; i < keyPages.length; i++)
    {
        var p        = keyPages[i],
            indexes  = [],
            foundEnd = false;
            c        = 0;
        
        while (p === 1 || p >= 5 && p <= 127 && c <= usedPages)
        {
            if (indexes.indexOf(p) !== -1)
            {
                ErrorReport.infiniteLoop = true;
                ErrorReport.Count++;
                break;
            }
            if(p === 1)
            {
                foundEnd = true;
                break;
            }
            indexes.push(p);
            
            p = data[ (p * 2) + 0x100 + 1 ];
            c++;
        }
        
        if(foundEnd === true)
        {
            foundFiles[keyPages[i]] = indexes;
            pageCount += foundFiles[keyPages[i]].length;
        }
        else
        {
            ErrorReport.EndNotFound = true;
            ErrorReport.Count++;
            break;
        }
    }
    
    // Check if the pageCount matches the calculated usedPages
    if(usedPages !== pageCount)
    {
        ErrorReport.PageCountMismatch = true;
        ErrorReport.Count++;
    }
    else
    {
        foundFiles.numUsed = pageCount;
    }
    
    // Check if the number of notes are the same
    if(keyPages.length !== fileTable.numUsed)
    {
        ErrorReport.FileCountMismatch = true;
        ErrorReport.Count++;
    }
    
    // Check if Note indexes exist in keyPages
    for(var i = 0; i < 16; i++)
    {
        if(fileTable[i] && keyPages.indexOf(fileTable[i].initialIndex) === -1)
        {
            ErrorReport.MissingNoteIndex = true;
            ErrorReport.Count++;
        }
    }
    
    return {
        "Notes": fileTable,
        "Pages": foundFiles
    };
}
