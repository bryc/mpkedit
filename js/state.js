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
        function writeAt(offset) {
            for(var i = 0; i < 7; i++) {
                data[offset + i] = bytes[i];
            }
        }

        var data = new Uint8Array(32768);

        var bytes = [1, 1, 0, 1, 1, 254, 241];  
        writeAt(57);
        writeAt(121);
        writeAt(153);
        writeAt(217);

        for(var i = 5; i < 128; i++) {
            data[256 + i * 2 + 1] = 3;
            data[512 + i * 2 + 1] = 3;
        }

        data[257] = 113;
        data[513] = 113;

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
        if(MPKEdit.dexnotes)MPKEdit.dexnotes[id] = undefined;
        MPKEdit.Parser(tmpdata);
    };


    /* -----------------------------------------------
    function: State.save()
      Save the full MPK output file (Standard RAW MPK file)
      Handles browser download, and fsys SaveAs/Save
    */
    State.save = function() {
        if(MPKEdit.App.usefsys) {
            if(State.Entry && !event.ctrlKey) {
                MPKEdit.fsys.saveFile(State.data, State.Entry);
            }
            else {
                MPKEdit.fsys.saveFileAs(State.data, State.filename);
            }
        }
        else {
            var ext = State.filename.slice(-3).toUpperCase() !== "MPK";
            var fn = State.filename + (ext ? ".mpk" : "");
            MPKEdit.saveAs(new Blob([State.data]), fn);
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

        var CRC = MPKEdit.crc32(fileOut);
        var filename = MPKEdit.App.codeDB[gameCode] || gameCode;
        filename = filename + "_" + CRC + ".note";

        if (event && event.ctrlKey) {
            filename = noteName.replace(/[\\|\/"<>*?:]/g, "-");
            filename = filename + "_" + CRC + "_raw.note";
            fileOut = fileOut.slice(32);
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
