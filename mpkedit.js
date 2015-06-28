(function () {
/* ---------------------------------------------------------- */
function _MPKEditor()
{
    var ref = this;

    function doUpdate(_data, _fname)
    {
        function isNoteFile(data)
        {
            var a = 0 === data[0x0A],
                b = 0 === data[0x0B],
                c = 0xCAFE === data[0x07] + (data[0x06] << 8),
                d = 0 === data.subarray(32).length % 256;
        
            return a && b && c && d;
        }

        if(!_data && !_fname)
        {
            window.addEventListener("drop", fileHandler);
            window.addEventListener("dragover",function(event){event.preventDefault();});
            _data = init();
            _fname = "New MemPak.mpk";
        }

        var _data2 = new Uint8Array(32768), parsedData;

        for(i = 0; i < _data.length; i++) {
            _data2[i] = _data[i];
        }

        parsedData = parse(_data2);

        if(parsedData) {
            ref.filename   = _fname;
            ref.data       = _data2;
            ref.parsedData = parsedData;
            display(ref.parsedData, ref.filename);
        } else if(isNoteFile(_data)) {
            importNote(_data);
        } else {
            console.error("Invalid file: ", event.target.name);
        }
    }

    function init()
    {
        function A(a){for(i=0;i<7;++i){data[a+i]=[1,1,0,1,1,254,241][i];}}
        var i, data = new Uint8Array(32768);
        A(57);A(121);A(153);A(217);
        for(i=5;i<128;i++){data[256+i*2+1]=3;data[512+i*2+1]=3;}
        data[257]=113;data[513]=113;

        return data;
    }

    function exportMPK()
    {
        var f = ref.filename.replace(".n64", ".mpk").replace(".N64", ".mpk"),
            el = document.createElement("a");
    
        el.download = f;
        el.href = "data:application/octet-stream;base64," +
            btoa(String.fromCharCode.apply(null, ref.data));
        el.dispatchEvent(new MouseEvent("click"));
    }

    function importNote(data)
    {
        var i, j, slotsToUse, newMPK, 
        dest, dest1, dest2, dest3, 
        note, gdata, pageCount, usedPages = 0, usedNotes = 0;
    
        note      = data.subarray(0, 32);
        gdata     = data.subarray(32);
        pageCount = gdata.length / 256;
        
        for(i = 0; i < Object.keys(ref.parsedData).length; i++)
        {
            if(ref.parsedData[i])
            {
                usedPages += ref.parsedData[i].indexes.length;    
            }
            
            usedNotes++;
        }

        if(usedPages + pageCount <= 123 && usedNotes < 16)
        {
            slotsToUse = [];
            for(i = 0xA; i < 0x100; i += 2)
            {
                if(slotsToUse.length === pageCount)
                {
                    break;
                }
    
                if(ref.data[0x100 + i + 1] === 3)
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
                    ref.data[dest1] = 0x01;
                } else {
                    ref.data[dest1] = slotsToUse[i+1];
                }
    
                for(j = 0; j < 0x100; j++)
                {
                    ref.data[dest2+j] = gdata[dest3+j];
                }
            }
    
            for(i = 0; i < 16; i++)
            {
                if(ref.parsedData[i] === undefined)
                {
                    dest = 0x300 + i * 32;
                    for(j = 0; j < 32; j++)
                    {
                        ref.data[dest+j] = note[j];
                    }
                    break;
                }
            }

            ref.doUpdate(ref.data, ref.filename);
        } else {
            alert("Pages: " + usedPages +  " / 123, Notes: " + usedNotes + " / 16\n" +
                  "Requires 1 Note and " + pageCount + " Page(s).");
        }
    }

    function exportNote(event)
    {

        var i, j, pageAddress, name, fn, noteID, gameCode,
            indexes, fileOut, el, shft;
    
        noteID   = this.id;
        gameCode = ref.parsedData[noteID].serial;
        noteName = ref.parsedData[noteID].noteName;
        indexes  = ref.parsedData[noteID].indexes;
        fileOut  = [];
        el       = document.createElement("a");




        // Get Note Header
        for(i = 0; i < 32; i++)
        {
            fileOut.push(ref.data[0x300 + (noteID * 32) + i]);
        }
    
        fileOut[6] = 0xCA;
        fileOut[7] = 0xFE;
    
        // Get Page Data
        for(i = 0; i < indexes.length; i++)
        {
            pageAddress = indexes[i] * 0x100;
            for(j = 0; j < 0x100; j++)
            {
                fileOut.push(ref.data[pageAddress + j]);
            }
        }
        
        if(ref.codeDB !== undefined && ref.codeDB[gameCode])
        {
            name = ref.codeDB[gameCode];
        } else {
            name = noteName;
        }
    
        fn = name + "," + crc32(fileOut) + ".note.bin";
    
 if (event.ctrlKey)
            { 
                fn = noteName + "," + crc32(fileOut) + ".sav";
                fileOut = fileOut.splice(32);
                
            }


        el.href = "data:application/octet-stream;base64," +
            btoa(String.fromCharCode.apply(null, fileOut));
        el.download = fn;
        el.dispatchEvent(new MouseEvent("click"));

 
        
    }

    function deleteNote()
    {
        var i, targetIndex, noteID, noteKeyIndex, indexes, newMPK;
        noteID       = parseInt(this.id, 10);
        noteKeyIndex = ref.parsedData[noteID].indexes[0];
        indexes      = ref.parsedData[noteID].indexes;
    
        // Mark Indexes as Free
        for(i = 0; i < indexes.length; i++)
        {
            targetIndex = 0x100 + (indexes[i] * 2) + 1;
            ref.data[targetIndex] = 0x03;
        }
    
        // Delete Note Entry
        for(i = 0; i < 32; i++)
        {
            targetIndex = 0x300 + (noteID * 32) + i;
            ref.data[targetIndex] = 0x00;
        }

        ref.doUpdate(ref.data, ref.filename);
    }

    function parse(data)
    {
        var i, j, IndexKeys, NoteKeys=[], Notes={}, noteName, n64code, p, p2, a, b, c;
        
        function calculateChecksum(o)
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
            // Detect unset bits.. if they're not set, game gets mad.
            if((data[o + 25] & 1) === 0 || (data[o + 26] & 1) === 0)
            {
                return false;
            }
            return (sumX === sumA && sumY === sumB);
        }
        
        function checkIndexes(o) {
            var Output={}, sum, seq, ends = 0, found = {parsed:[], keys:[], vals:[]};
            
            for(i = o + 0xA; i < o + 0x100; i += 2) {
                p  = data[i + 1]; p2 = data[i];
                // Capture all non-empty indexes
                if (p2 === 0 && p === 1 || p >= 5 && p <= 127 && p !== 3) {
                
                    if(p === 1) {ends += 1;}
                    // Return false if duplicate values found
                    if(p !== 1 && found.vals.indexOf(p) > -1) {
                        return false;
                    }
                    found.vals.push(p);
                    found.keys.push((i - o) / 2);
                    
                } else if (p2 !== 0 || p !== 1 && p !== 3 && p < 5 || p > 127) {
                    return false;
                }
            }
            // Filter out the key indexes
            IndexKeys = found.keys.filter(function(n) {
                return found.vals.indexOf(n) === -1;
            });
            
            // Check the length of NoteKeys, IndexKeys and ends
            if (NoteKeys.length !== IndexKeys.length || NoteKeys.length !== ends) {
                return false;
            }
            // Check that all NoteKeys exist in the list of IndexKeys
            for (i = 0; i < NoteKeys.length; i++) {
                if (NoteKeys.indexOf(IndexKeys[i]) === -1) {
                    return false;
                }
            }
            
            for(i = 0; i < IndexKeys.length; i++) {
                p = IndexKeys[i]; seq = [];
                while(p === 1 || p >= 5 && p <= 127) {
                    if(p === 1) {
                        Output[IndexKeys[i]] = seq;
                        break;
                    }
                    seq.push(p);
                    found.parsed.push(p);
                    p = data[p*2 + o + 1];
                }
            }
            
            // Check parsed indexes against original list
            if(found.parsed.length !== found.keys.length)
            {
                return false;
            }
            for (i = 0; i < found.parsed.length; i++) {
                if (found.parsed.indexOf(found.keys[i]) === -1) {
                    return false;
                }
            }
            
            // Check IndexTable checksum
            for(i = o+0xA, sum = 0; i < o+0x100; i++)
            {
                sum += data[i];
            }
            sum &= 0xFF;
            if (data[o+1] !== sum)
            {
                data[o+1] = sum;
            }
            // Backup or Restore the valid table
            p = (o === 0x100) ? 0x200 : 0x100;
            for(i = 0; i < 0x100; i++)
            {
                data[p + i] = data[o + i];
            }
            
            return Output;
        }
        
        // Check Header ------------------------------------
        var chk, currentLoc, loc, lastValidLoc;
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
                for(j = 0; j < 32; j++)
                {
                    data[currentLoc + j] = data[lastValidLoc + j];
                }
                chk = calculateChecksum(currentLoc, data);
            }
        
            loc[i] = chk;
        }
        
        // Check if all checksums are correct
        if(true !== (loc[0] && loc[1] && loc[2] && loc[3]))
        {
            return false;
        }
         n64code = {
              0:  "",   3:  "",  15: " ", 16: "0",  17: "1",  18: "2",  19: "3",  20: "4",
             21: "5",  22: "6",  23: "7", 24: "8",  25: "9",  26: "A",  27: "B",  28: "C",
             29: "D",  30: "E",  31: "F", 32: "G",  33: "H",  34: "I",  35: "J",  36: "K",
             37: "L",  38: "M",  39: "N", 40: "O",  41: "P",  42: "Q",  43: "R",  44: "S",
             45: "T",  46: "U",  47: "V", 48: "W",  49: "X",  50: "Y",  51: "Z",  52: "!",
             53: '"',  54: "#",  55: "'", 56: "*",  57: "+",  58: ",",  59: "-",  60: ".",
             61: "/",  62: ":",  63: "=", 64: "?",  65: "@",  66: "。",  67: "゛",  68: "゜",
             69: "ァ",  70: "ィ",  71: "ゥ",  72: "ェ",  73: "ォ",  74: "ッ",  75: "ャ",  76: "ュ",
             77: "ョ",  78: "ヲ",  79: "ン",  80: "ア",  81: "イ",  82: "ウ",  83: "エ",  84: "オ",
             85: "カ",  86: "キ",  87: "ク",  88: "ケ",  89: "コ",  90: "サ",  91: "シ",  92: "ス",
             93: "セ",  94: "ソ",  95: "タ",  96: "チ",  97: "ツ",  98: "テ",  99: "ト", 100: "ナ",
            101: "ニ", 102: "ヌ", 103: "ネ", 104: "ノ", 105: "ハ", 106: "ヒ", 107: "フ", 108: "ヘ",
            109: "ホ", 110: "マ", 111: "ミ", 112: "ム", 113: "メ", 114: "モ", 115: "ヤ", 116: "ユ",
            117: "ヨ", 118: "ラ", 119: "リ", 120: "ル", 121: "レ", 122: "ロ", 123: "ワ", 124: "ガ",
            125: "ギ", 126: "グ", 127: "ゲ", 128: "ゴ", 129: "ザ", 130: "ジ", 131: "ズ", 132: "ゼ",
            133: "ゾ", 134: "ダ", 135: "ヂ", 136: "ヅ", 137: "デ", 138: "ド", 139: "バ", 140: "ビ",
            141: "ブ", 142: "ベ", 143: "ボ", 144: "パ", 145: "ピ", 146: "プ", 147: "ペ", 148: "ポ", 178: ""
        };
        // Parse NoteTable
        for(i = 0x300; i < 0x500; i += 32)
        {
            p  = data[i + 0x07];
            
            a = data[i]+data[i+1]+data[i+2]+data[i+3]>0 && data[i+4]+data[i+5]>0;
            b = p>=5 && p<=127 && data[i + 0x06] === 0;
            c = data[i + 0x0A]===0 && data[i + 0x0B]===0;
            
            if(a && b && c)
            {
                // Repair 0x08:2 bit thing.
                if((data[i + 0x08] & 0x02) === 0)
                {
                    data[i + 0x08] |= 0x02;
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
                NoteKeys.push(p);
                Notes[(i - 0x300) / 32] = {
                    indexes: p,
                    serial: String.fromCharCode(data[i],data[i+1],data[i+2],data[i+3]),
                    publisher: String.fromCharCode(data[i+4],data[i+5]),
                    noteName: noteName
                };
            }
        }
        
        output = checkIndexes(0x100) || checkIndexes(0x200);
        
        if(output)
        {
            for(i = 0; i < Object.keys(Notes).length; i++)
            {
                Notes[Object.keys(Notes)[i]].indexes = output[Notes[Object.keys(Notes)[i]].indexes];
            }
            return Notes;
        } else { return false; }
    }

    ref.deleteNote = deleteNote; 
    ref.exportNote = exportNote; 
    ref.exportMPK  = exportMPK;
    ref.doUpdate   = doUpdate;
}



function display(t)
{
    var out =  document.querySelector("body"), name;
    var list =  elem(["table"]);



    for(var i = 0; i < 16; i++)
    {   

        if(t[i])
        {
        if(MPKEditor.codeDB !== undefined && MPKEditor.codeDB[t[i].serial])
        {
            name = MPKEditor.codeDB[t[i].serial];
        } else {
            name = t[i].serial;
        }
            list.appendChild(
                elem(["tr", {className:"item"}],
                    elem(["td",{innerHTML:"<div>"+t[i].noteName+"</div><div class='code'>"+name+"</div>"}]),
                    elem(["td",{className:"pgs",innerHTML:t[i].indexes.length}]),
                    elem(["td",{className:"pgs2"}],
                       
                            elem(["i",{id:i,onclick:MPKEditor.deleteNote,className:"fa fa-trash"}]),
                            elem(["i",{id:i,onclick:MPKEditor.exportNote,className:"fa fa-download"}])
                        )
                )
            )
        }
    }
    
    while(out.firstChild){
        out.removeChild(out.firstChild);
    }

    function browse()
    {
        document.getElementById("fopen").click();
    }

    var line = elem(["div",{className:"line"}],
            elem(["input",{type:"file",id:"fopen",multiple:"multiple",onchange:fileHandler}]),
            elem(["span",{className:"load",onclick:browse}],
                elem(["i",{className:"fa fa-folder-open"}]),
                elem(["span",{innerHTML:MPKEditor.filename}])
                ),
            elem(["i",{onclick:MPKEditor.exportMPK,className:"fa fa-floppy-o"}])
        );
        
    if(Object.keys(t).length === 0) {
        out.appendChild(elem([],
            line,
            elem(["div",{className:"empty",innerHTML:"~ empty"}])
            ));
            
    } else {
    out.appendChild(elem([],line,list));
    }
}

function fileHandler(event)
{
    var i, files = event.target.files || event.dataTransfer.files, reader;
    for(i = 0; i < files.length; i++)
    {
        reader        = new FileReader();
        reader.name   = files[i].name;
        reader.onload = function(event)
        {
            var data  = new Uint8Array(event.target.result),
                data2 = new Uint8Array(32768);
        
            // DexDrive support - Remove DexDrive header
            if(String.fromCharCode.apply(null, data.subarray(0, 11)) === "123-456-STD") {
                data = data.subarray(0x1040);
            }
            
            MPKEditor.doUpdate(data, event.target.name);
        };
        reader.readAsArrayBuffer(files[i].slice(0, 36928));
    }
    event.preventDefault();
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
 
    if(typeof tagName === "string"){
        elmnt = document.createElement(tagName);
    } else {
        // use a doc fragment if no tag specified
        elmnt = document.createDocumentFragment();
    }
    if(typeof prop === "object"){
        keys = Object.keys(prop);
    }
    else if(typeof prop !== "object"){
        elmnt.textContent = prop;
    }
    for(i = 0; i < keys.length; i++){
        var key    = keys[i];
        var method = elmnt[key.slice(2)];
 
        // specify methods with $_
        if(key.indexOf("$_") > -1){
            // run a method with array of arguments
            method.apply(elmnt, prop[key]);
        } else {
            elmnt[key] = prop[key]; 
        } 
    }
    // look for other elements to append
    if(arguments.length > 1){
        for(i = 1; i < arguments.length; i++){
            // check if the argument is an element
            if(arguments[i].nodeType > 0){
                elmnt.appendChild(arguments[i]);
            }
        }
    }
    return elmnt;
}



//var Mempak = new MemPak();

window.MPKEditor = new _MPKEditor();

/* ---------------------------------------------------------- */
}());