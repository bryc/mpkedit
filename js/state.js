(function State() {
    const State = {};

    /* -----------------------------------------------
    function: State.init()
      generate empty MPK data then immediately load it.
    */
    State.init = function() {
        function writeAt(ofs) {for(let i = 0; i < 32; i++) data[ofs + i] = block[i];}

        const data = new Uint8Array(32768), block = new Uint8Array(32);
        
        // generate id block
        block[4]  = 0|Math.random()*256;
        block[5]  = 0|Math.random()*256;
        block[6]  = 0|Math.random()*256;
        block[7]  = block[4] ^ block[5] ^ block[6] ^ 0xFF;
        block[25] = 0x01; // device bit
        block[26] = 0x01; // bank size int (must be exactly '01')

        // calculate pakId checksum
        let sumA = 0, sumB = 0xFFF2;
        for(let i = 0; i < 28; i += 2)
            sumA += (block[i] << 8) + block[i + 1], sumA &= 0xFFFF;
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
        for(let i = 5; i < 128; i++) {
            data[256 + (i * 2) + 1] = 3;
            data[512 + (i * 2) + 1] = 3;
        }
        data[257] = 0x71;
        data[513] = 0x71;

        //for(let i = 0; i < 32; i++) data[i] = i; // write label - needs to be verified
        data[0] = 0x81; // libultra's 81 mark

        MPKEdit.Parser(data, "New.mpk");
    };

    /* -----------------------------------------------
    function: State.erase(id)
      Erase a note at index/id. Note: This does not erase actual save data, just the pointer.
    */
    State.erase = function(id) {
        if(!State.NoteTable[id]) return; // cancel if id doesn't exist in NoteTable
        const tmpData = new Uint8Array(State.data), // operate on tmp copy to run thru parser later
              indexes = State.NoteTable[id].indexes; // get note's indexes sequence to overwrite with 0x03
        // Erase all indexes in IndexTable
        let offset;
        for(let i = 0; i < indexes.length; i++) {
            offset = 0x100 + (indexes[i] * 2) + 1;
            tmpData[offset] = 0x03;
        }
        // Erase NoteEntry in NoteTable - TODO: Just erase gameCode/pubCode/startIndex? Probably.
        for(let i = 0; i < 32; i++) {
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
    State.save = function(event) {
        // Initially we only want to output the MPK data.
        let outputMPK = State.data;

        // Parse Note comments and build MPKMeta block, if needed.
        let hasCmts = false;
        // initialized 16-byte header for MPKMeta
        const cmtHeader = [77,80,75,77,101,116,97,0,0,0,0,0,0,0,0,0],
              notes = Object.keys(MPKEdit.State.NoteTable);
        let MPKCmts = new Uint8Array(cmtHeader), numCmts = 0;
        for(let i = 0; i < notes.length; i++) {
            if(State.NoteTable[notes[i]].comment) { // if NoteTable[i] contains a comment.
                hasCmts = true;
                numCmts++;
                // Gather required info
                const a = 0x300 + (notes[i] * 32), // NoteEntry addr
                      idx = outputMPK[a+7],
                      c0 = outputMPK[a+1], c1 = outputMPK[a+2], c2 = outputMPK[a+3],
                      utfdata = new TextEncoder("utf-8").encode(State.NoteTable[notes[i]].comment),
                      hiSize = utfdata.length >> 8, loSize = utfdata.length & 0xFF,
                      id = idx^c0^c1^c2^0xA5,
                      output = [id, idx, c0, c1, c2, hiSize, loSize];
                MPKCmts = MPKEdit.Uint8Concat(MPKCmts, output, utfdata);
            }
        }
        // If comments found, update header and append MPKMeta block to data.
        if(hasCmts) {
            MPKCmts[15] = numCmts; // Store total number of comments
            const totalHash = MPKEdit.cyrb32(MPKCmts)[0];
            MPKCmts[8]  = totalHash >>> 24 & 0xFF;
            MPKCmts[9]  = totalHash >>> 16 & 0xFF;
            MPKCmts[10] = totalHash >>> 8 & 0xFF;
            MPKCmts[11] = totalHash & 0xFF;
            outputMPK = MPKEdit.Uint8Concat(outputMPK, MPKCmts);
        }
        
        if(event.type === "dragstart") { // Chrome drag-out save method
            const blobURL = URL.createObjectURL(new Blob([outputMPK]));
            event.dataTransfer.setData("DownloadURL", "application/octet-stream:"+State.filename+":"+blobURL);
        }
        else if(MPKEdit.App.usefsys) { // fsys save method. Hold CTRL will force SaveAs mode.
            // TODO Ternary?
            if(State.Entry && !event.ctrlKey) MPKEdit.fsys.saveFile(outputMPK, State.Entry);
            else MPKEdit.fsys.saveFileAs(outputMPK, State.filename);
        }
        else { // browser saveAs method
            const ext = State.filename.slice(-3).toUpperCase() !== "MPK",
                  fn = State.filename + (ext ? ".mpk" : "");
            MPKEdit.saveAs(new Blob([outputMPK]), fn);
        }
    };

    /* -----------------------------------------------
    function: State.saveNote(id, event)
      Save a note at index/id. Supports holding CTRL for raw save.
      Handles browser download and fsys saveAs
    */
    State.saveNote = function(id, event) {
        let outputNote = [];
        const indexes = State.NoteTable[id].indexes,
              gameCode = State.NoteTable[id].serial;

        // Write NoteEntry as header for RAW format.
        for(let i = 0; i < 32; i++) outputNote.push(State.data[0x300 + (id * 32) + i]);
        outputNote[6] = 0xCA, outputNote[7] = 0xFE;

        // Write associated save data.
        for(let i = 0; i < indexes.length; i++) {
            const pageAddress = indexes[i] * 0x100;
            for(let j = 0; j < 0x100; j++)
                outputNote.push(State.data[pageAddress + j]);
        }

        const hash = State.NoteTable[id].cyrb32[0].toString(36)+State.NoteTable[id].cyrb32[1].toString(36);
        let filename = MPKEdit.App.codeDB[gameCode] || gameCode;
        filename = filename + "_" + hash + ".note";

        if (event && event.ctrlKey) { // Hold CTRL for raw save data (no NoteEntry header)
            filename = indexes[0].toString(16).padStart(2,"0");
            filename = `raw-${gameCode}_${filename}.rawnote`;
            outputNote = outputNote.slice(32); // slice off header.
        } else if(State.NoteTable[id].comment) {
            const header = [1,77,80,75,78,111,116,101,0,0,0,0,0,0,0,0],
                  utfdata = new TextEncoder("utf-8").encode(State.NoteTable[id].comment),
                  size = Math.ceil(utfdata.length / 16); // number of rows
            header[15] = size;
            let tS = State.NoteTable[id].timeStamp; // get or generate timestamp
            if(!tS) tS = Math.round(new Date().getTime()/1000) >>> 0;
            header[14] = tS & 0xFF;
            header[13] = tS >>> 8 & 0xFF;
            header[12] = tS >>> 16 & 0xFF;
            header[11] = tS >>> 24 & 0xFF;
            const cmt = new Uint8Array(size * 16);
            cmt.set(utfdata);
            outputNote = MPKEdit.Uint8Concat(header, cmt, outputNote);
        }

        outputNote = new Uint8Array(outputNote);
        if(event.type === "dragstart") { // chrome drag-out save method
            const blobURL = URL.createObjectURL(new Blob([outputNote]));
            event.dataTransfer.setData("DownloadURL", `application/octet-stream:${filename}:${blobURL}`);
        }
        else if(MPKEdit.App.usefsys) MPKEdit.fsys.saveFileAs(outputNote, filename);  // fsys save method
        else MPKEdit.saveAs(new Blob([outputNote]), filename); // browser saveAs method
    };

    MPKEdit.State = State;
    
    console.log("INFO: MPKEdit.State ready");
}());
