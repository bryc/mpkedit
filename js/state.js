(function State() {
    var State = {};

    /* -----------------------------------------------
    function: State.init()
      generate empty MPK data then immediately load it.
    */
    State.init = function() {
        function writeAt(ofs) {for(var i = 0; i < 32; i++) data[ofs + i] = block[i];}

        var data = new Uint8Array(32768), block = new Uint8Array(32);
        
        // generate checksum block
        block[0]  = 0xFF;
        block[1]  = 0xFF;
        block[2]  = 0xFF;
        block[3]  = 0xFF;
        block[4]  = 0|Math.random()*256;
        block[5]  = 0|Math.random()*256;
        block[6]  = 0|Math.random()*256;
        block[7]  = block[4] ^ block[5] ^ block[6] ^ 0xFF;
        block[25] = 0x01; // size?
        block[26] = 0x01;

        // calculate pakId checksum
        var sumA = 0, sumB = 0xFFF2;
        for(var i = 0; i < 28; i += 2) {
            sumA += (block[i] << 8) + block[i + 1], sumA &= 0xFFFF;
        }
        sumB -= sumA;
        // store checksums
        block[28] = sumA >> 8;
        block[29] = sumA & 0xFF;
        block[30] = sumB >> 8;
        block[31] = sumB & 0xFF;

        // write checksum block to multiple sections in header page
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

        data[0] = 0x81; // libultra's 81 mark

        MPKEdit.Parser(data, "New.mpk");
    };

    /* -----------------------------------------------
    function: State.erase(id)
      Erase a note at index/id. Note: This does not erase actual save data, just the pointer.
    */
    State.erase = function(id) {
        var tmpData = new Uint8Array(State.data); // operate on tmp copy to run thru parser later
        var indexes = State.NoteTable[id].indexes; // get note's indexes sequence to overwrite with 0x03
        // Erase all indexes in IndexTable
        for(var i = 0, offset; i < indexes.length; i++) {
            offset = 0x100 + (indexes[i] * 2) + 1;
            tmpData[offset] = 0x03;
        }
        // Erase NoteEntry in NoteTable - TODO: Just erase gameCode/pubCode/startIndex? Probably.
        for(var i = 0; i < 32; i++) {
            offset = 0x300 + (id * 32) + i;
            tmpData[offset] = 0x00;
        }
        MPKEdit.Parser(tmpData);
    };

    /* -----------------------------------------------
    function: State.save()
      Save the full MPK output file (Standard RAW MPK file)
      Handles browser download, and fsys SaveAs/Save
    */
    State.save = function() {
        var outputMPK = State.data, notes = Object.keys(MPKEdit.State.NoteTable),
            MPKCmts = new Uint8Array([0,77,80,75,67,109,116,115,0,0,0,0,0,0,0,0]),
            numCmts = 0, hasCmts = false;

        // check for Notes with comments 
        for(var i = 0; i < notes.length; i++) {
            if(State.NoteTable[notes[i]].comment) { // if NoteTable[i] contains a comment.
                hasCmts = true;
                numCmts++;
                var addr = 0x300 + (notes[i] * 32); // NoteEntry addr
                var idx = State.data[addr + 7]; // startIndex
                var crc = MPKEdit.crc8(State.data.subarray(addr, addr + 8));
                var utfdata = new TextEncoder("utf-8").encode(State.NoteTable[notes[i]].comment);
                var hiSize = utfdata.length >> 8, loSize = utfdata.length & 0xFF;
                MPKCmts = MPKEdit.Uint8Concat(MPKCmts, [0xA5, idx, crc, hiSize, loSize], utfdata);
                //console.log(State.NoteTable[notes[i]], idx, State.data.subarray(addr, addr+8) );
            }
        }
        // If comments found, append MPKCmts block to data.
        if(hasCmts) {
            MPKCmts[15] = numCmts; // Store total number of comments
            MPKCmts[0] = MPKEdit.crc8(MPKCmts.subarray(1)); // Store calculated checksum. Do this last.
            outputMPK = MPKEdit.Uint8Concat(State.data, MPKCmts);
        }
        
        if(event.type === "dragstart") { // Chrome drag-out save method
            var blobURL = URL.createObjectURL(new Blob([outputMPK]));
            event.dataTransfer.setData("DownloadURL", "application/octet-stream:"+State.filename+":"+blobURL);
        }
        else if(MPKEdit.App.usefsys) { // fsys save method. Hold CTRL will force SaveAs mode.
            if(State.Entry && !event.ctrlKey) MPKEdit.fsys.saveFile(outputMPK, State.Entry);
            else MPKEdit.fsys.saveFileAs(outputMPK, State.filename);
        }
        else { // browser saveAs method
            var ext = State.filename.slice(-3).toUpperCase() !== "MPK";
            var fn = State.filename + (ext ? ".mpk" : "");
            MPKEdit.saveAs(new Blob([outputMPK]), fn);
        }
    };

    /* -----------------------------------------------
    function: State.saveNote(id, event)
      Save a note at index/id. Supports holding CTRL for raw save.
      Handles browser download and fsys saveAs
    */
    State.saveNote = function(id, event) {
        var outputNote = [];
        var indexes = State.NoteTable[id].indexes;
        var gameCode = State.NoteTable[id].serial;
        var noteName = State.NoteTable[id].noteName;

        // Write NoteEntry as header for RAW format.
        for(var i = 0; i < 32; i++) outputNote.push(State.data[0x300 + (id * 32) + i]);
        outputNote[6] = 0xCA, outputNote[7] = 0xFE;

        // Write associated save data.
        for(var i = 0; i < indexes.length; i++) {
            var pageAddress = indexes[i] * 0x100;
            for(var j = 0; j < 0x100; j++) {
                outputNote.push(State.data[pageAddress + j]);
            }
        }

        var hash = State.NoteTable[id].cyrb32.toString(36);
        var filename = MPKEdit.App.codeDB[gameCode] || gameCode;
        filename = filename + "_" + hash + ".note";

        if (event && event.ctrlKey) { // Hold CTRL for raw save data (no NoteEntry header)
            filename = noteName.replace(/[\\|\/"<>*?:]/g, "-"); // TODO: Not sure why I am using noteName here.
            filename = filename + "_" + hash + "_raw.note";
            outputNote = outputNote.slice(32); // slice off header.
        } else if(State.NoteTable[id].comment) {
            var header = [1,77,80,75,78,111,116,101,0,0,0,0,0,0,0,0];
            var utfdata = new TextEncoder("utf-8").encode(State.NoteTable[id].comment);
            var size = Math.ceil(utfdata.length / 16); // number of rows
            header[15] = size;
            var cmt = new Uint8Array(size * 16);
            cmt.set(utfdata);
            outputNote = MPKEdit.Uint8Concat(header, cmt, outputNote);
        }

        if(event.type === "dragstart") { // chrome drag-out save method
            var blobURL = URL.createObjectURL(new Blob([outputNote]));
            event.dataTransfer.setData("DownloadURL", "application/octet-stream:"+filename+":"+blobURL);
        }
        else if(MPKEdit.App.usefsys) MPKEdit.fsys.saveFileAs(outputNote, filename);  // fsys save method
        else MPKEdit.saveAs(new Blob([outputNote]), filename); // browser saveAs method
    };

    MPKEdit.State = State;
    
    console.log("INFO: MPKEdit.State ready");
}());
