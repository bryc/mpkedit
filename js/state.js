/* 
State: functions which manipulate the current State of the opened MPK file, post-parse.
*/

(function State() {
    var State = {};

    /* -----------------------------------------------
    function: State.init()
      generate empty MPK data then immediately load it.
    */
    State.init = function() {
        var data = new Uint8Array(32768), block = new Uint8Array(32);
        data[0] = 0x81;
        
        // generate checksummed blocks
        block[0]=0xFF;
        block[1]=0xFF;
        block[2]=0xFF;
        block[3]=0xFF;
        block[4]=Math.floor(Math.random()*256);
        block[5]=Math.floor(Math.random()*256);
        block[6]=Math.floor(Math.random()*256);
        block[7]=block[4]^block[5]^block[6]^0xFF;
        block[25]=0x01;
        block[26]=0x01;

        var sumA = 0, sumB = 0xFFF2;
        for(var i = 0; i < 28; i += 2) {
            sumA += (block[i] << 8) + block[i + 1];
            sumA &= 0xFFFF;
        }
        sumB -= sumA;

        block[28]=sumA >> 8;
        block[29]=sumA & 0xFF;
        block[30]=sumB >> 8;
        block[31]=sumB & 0xFF;

        function writeAt(ofs) {for(var i=0; i<32; i++) data[ofs+i] = block[i];}
        writeAt(32);
        writeAt(96);
        writeAt(128);
        writeAt(192);

        // init IndexTable and backup (plus checksums)
        for(var i = 5; i < 128; i++) {
            data[256 + (i * 2) + 1] = 3;
            data[512 + (i * 2) + 1] = 3;
        }
        data[257] = 0x71;
        data[513] = 0x71;

        MPKEdit.Parser(data, "New.mpk");
    };

    /* -----------------------------------------------
    function: State.erase(id)
      Erase a note at index/id.
    */
    State.erase = function(id) {
        var tmpdata = new Uint8Array(State.data);
        var indexes = State.NoteTable[id].indexes;

        for(var i = 0, offset; i < indexes.length; i++) {
            offset = 0x100 + (indexes[i] * 2) + 1;
            tmpdata[offset] = 0x03;
        }

        for(var i = 0; i < 32; i++) {
            offset = 0x300 + (id * 32) + i;
            tmpdata[offset] = 0x00;
        }
        MPKEdit.Parser(tmpdata);
    };


    /* -----------------------------------------------
    function: State.save()
      Save the full MPK output file (Standard RAW MPK file)
      Handles browser download, and fsys SaveAs/Save
    */
    State.save = function() {
        var outputData = State.data;

        var s = Object.keys(MPKEdit.State.NoteTable);
        var cmtBl0c = new Uint8Array([0,77,80,75,67,109,116,115,0,0,0,0,0,0,0,0]);
        var hasCmts = false;
        var numCmts = 0;

        for(var i = 0; i < s.length; i++) {
            if(State.NoteTable[s[i]].comment) {
                hasCmts = true;
                numCmts++;
                var addr = (0x300 + (s[i] * 32));

                var idx = State.data[addr + 7];
                var crc = MPKEdit.crc8(State.data.subarray(addr, addr+8));
                var utfdata = new TextEncoder("utf-8").encode(State.NoteTable[s[i]].comment);
                var hiSize = utfdata.length >> 8;
                var loSize = utfdata.length & 0xFF;

                cmtBl0c = MPKEdit.Uint8Concat(cmtBl0c, [0xA5, idx, crc, hiSize, loSize], utfdata);
                console.log(State.NoteTable[s[i]], idx, State.data.subarray(addr, addr+8) );
            }
        }

        if(hasCmts) {
            // add number of comments to header
            cmtBl0c[15] = numCmts;
            cmtBl0c[0] = MPKEdit.crc8(cmtBl0c.subarray(1));
            outputData = MPKEdit.Uint8Concat(State.data, cmtBl0c);
        }
        
        if(event.type === "dragstart") {
            var blobURL = URL.createObjectURL(new Blob([outputData]));
            event.dataTransfer.setData("DownloadURL",
                "application/octet-stream:" + State.filename + ":" + blobURL
            );
        }
        else if(MPKEdit.App.usefsys) {
            if(State.Entry && !event.ctrlKey) {
                MPKEdit.fsys.saveFile(outputData, State.Entry);
            }
            else {
                MPKEdit.fsys.saveFileAs(outputData, State.filename);
            }
        }
        else {
            var ext = State.filename.slice(-3).toUpperCase() !== "MPK";
            var fn = State.filename + (ext ? ".mpk" : "");
            MPKEdit.saveAs(new Blob([outputData]), fn);
        }
    };

    /* -----------------------------------------------
    function: State.saveNote(id, event)
      Save a note at index/id. Supports holding CTRL for raw save.
      Handles browser download and fsys saveAs
    */
    State.saveNote = function(id, event) {
        var fileOut = [];
        var indexes = State.NoteTable[id].indexes;
        var gameCode = State.NoteTable[id].serial;
        var noteName = State.NoteTable[id].noteName;

        for(var i = 0; i < 32; i++) {
            fileOut.push(State.data[0x300 + (id * 32) + i]);
        }

        fileOut[6] = 0xCA;
        fileOut[7] = 0xFE;

        for(var i = 0; i < indexes.length; i++) {
            var pageAddress = indexes[i] * 0x100;
            for(var j = 0; j < 0x100; j++) {
                fileOut.push(State.data[pageAddress + j]);
            }
        }

        var cksm = State.NoteTable[id].cyrb32.toString(36);
        var filename = MPKEdit.App.codeDB[gameCode] || gameCode;
        filename = filename + "_" + cksm + ".note";

        if (event && event.ctrlKey) {
            filename = noteName.replace(/[\\|\/"<>*?:]/g, "-");
            filename = filename + "_" + cksm + "_raw.note";
            fileOut = fileOut.slice(32);
        } else if(State.NoteTable[id].comment) {
            var header = [1, 77, 80, 75, 78, 111, 116, 101, 0,0,0,0,0,0,0,0];
            var utfdata = new TextEncoder("utf-8").encode(State.NoteTable[id].comment);
            var size = Math.ceil(utfdata.length / 16);
            header[15] = size;
            var cmt = new Uint8Array(size * 16);
            cmt.set(utfdata);
            fileOut = header.concat(Array.from(cmt), fileOut);
        }

        fileOut = new Uint8Array(fileOut);

        if(event.type === "dragstart") {
            var blobURL = URL.createObjectURL(new Blob([fileOut]));
            event.dataTransfer.setData("DownloadURL",
                "application/octet-stream:" + filename + ":" + blobURL
            );
        }
        else if(MPKEdit.App.usefsys) {
            MPKEdit.fsys.saveFileAs(fileOut, filename);
        }
        else {
            MPKEdit.saveAs(new Blob([fileOut]), filename);
        }
    };

    MPKEdit.State = State;
    
    console.log("INFO: MPKEdit.State ready");
}());
