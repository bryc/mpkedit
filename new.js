var dragIsFile = false;

window.addEventListener("dragenter", function(e) {
    var types = e.dataTransfer.types;
    for(var i = 0, q = false; i<types.length; i++) {
        if(types[i] == "Files") {q = true;}
    }
    dragIsFile = q;
});

window.addEventListener("dragover", function(e) {
    e.preventDefault();
    if(!dragIsFile) {
        e.dataTransfer.dropEffect = "none";
    }
});

window.addEventListener("drop", function(e) {
    e.preventDefault();
    var fl = e.dataTransfer.files;
    for(var i = 0; i < fl.length; i++) {
        var f = new FileReader();
        f.readAsArrayBuffer(fl[i].slice(0,36928));
        f.name = fl[i].name;
        f.onload = function(e) {
            var d = new Uint8Array(e.target.result);
            for(var i = 0, q = ""; i < 11; i++) {
                q += String.fromCharCode(d[i]);
            }
            if(q == "123-456-STD") {d = d.subarray(4160);}
            // Do the ID Area check here.
            if(isIDValid(0x20, d)){
                ReadMemPak(d, e.target.name);
            }
        };
    }
});

function isIDValid(o, data)
{
    for(var i = 0, sum = 0; i < 28; i += 2, sum &= 0xFFFF)
    {
        sum += (data[o + i] << 8) + data[o + i + 1];
    }
    var sum2 = 0xFFF2 - sum,
        sumA = (data[o + 28] << 8) + data[o + 29],
        sumB = (data[o + 30] << 8) + data[o + 31];
    
    if(sumA == sum && sumB != sum2 && sumB == sum2 ^ 0x0C)
    {
        sum2 ^= 0x0C;
        data[o + 31] ^= 0x0C;
    }
    return (sumA == sum && sumB == sum2);
}

function ReadMemPak(d, _f) {

    var errors = {count: 0};
    
    // FILE TABLE ---------------------------------------
    var fileTable = {}, out=[];
    for(var i = 0x300, _c=0; i < 0x500; i+=32) {
        var p = d[i+7],  a = d[i+6],
            b = d[i+10], c = d[i+11];
        if(p>=5 && p<=127 && a==0 && b==0 && c==0) {
            if (out.indexOf(p) !== -1) {
                errors.DuplicateNoteFound = true;
                errors.count++;
            }
            out.push(p);
            fileTable[(i-0x300)/32] = {
                "initialIndex": p
            };
            _c++;
        }
    }
    fileTable.numUsed = _c;
    
    // INDEX TABLE ---------------------------------------
    var _a=[], _b=[], usedPages = 0;
    for(var i = 0x10A; i < 0x200; i += 2) {
        var p = d[i+1], p2 = d[i];
        if((p2 != 0) || (p != 1 && p != 3 && p < 5 || p > 127)) {
            errors.IndexCorrupt = true;
            errors.count++;
        }
        else if(p!=3 && p>=5 && p<=127 || p==1) {
            _a.push((i - 0x100) / 2);
            _b.push(p);
            usedPages++;
        }
    }
    //startingIndexes
    var start = _a.filter(function(n){return _b.indexOf(n) == -1;});
    
    // FILE TABLE: PARSE SEQUENCES ------------------
    var foundFiles = {}, pageCount = 0;
    for(var i = 0 ; i < start.length; i++) {
        var p = start[i];
        var output = [];
        var foundEnd = false;
        var y = 0;
        while (p==1 || p>=5 && p<=127 && y <= usedPages) {
            if (output.indexOf(p) !== -1) {
                errors.infiniteLoop = true;
                errors.count++; break;
            }
            if(p == 1) {
                foundEnd = true; break;
            }
            output.push(p);
            p = d[ (p * 2) + 0x100 + 1 ];
            y++;
        }
        if(foundEnd === true) {
            foundFiles[start[i]] = output;
            pageCount += foundFiles[start[i]].length;
        }
        else {
                errors.EndNotFound = true;
                errors.count++; break;
        }
    }
    if(usedPages !== pageCount) {
        errors.PageCountMismatch = true;
        errors.count++;
    }
    if(start.length !== fileTable.numUsed) {
        errors.FileCountMismatch = true;
        errors.count++;
    }
    for(var i = 0; i < 16; i++){
        if(fileTable[i] && start.indexOf(fileTable[i].initialIndex) == -1) {
            errors.MissingIndex = true;
            errors.count++;
        }
    }
    
    if(errors.count===0)
    {
        console.log(fileTable, foundFiles, _f);
    }
}
