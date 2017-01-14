(function fsys() {
    var fsys = {};


    var writeDone = function(Entry, event) {
        if(event.loaded === 32768) {
            MPKEdit.State.Entry = Entry;
            MPKEdit.State.filename = Entry.name;
            MPKEdit.App.updateUI();
        }
    };

    var writeFile = function(data, Entry) {
        if(chrome.runtime.lastError) {return false;}

        Entry.createWriter(function(writer) {
            writer.onwriteend = writeDone.bind(null, Entry);
            writer.write(new Blob([new Uint8Array(data)]));
        });
    };

    fsys.saveFile = function(data, Entry) {
        chrome.fileSystem.getWritableEntry(
            Entry, writeFile.bind(null, data)
        );
    };

    fsys.saveFileAs = function(data, filename) {
        chrome.fileSystem.chooseEntry({
            type: "saveFile",
            suggestedName: filename
        }, writeFile.bind(null, data));
    };

    fsys.loadFile = function() {
        chrome.fileSystem.chooseEntry({}, function(Entry) {
            if(chrome.runtime.lastError) {return false;}

            Entry.file(function(fl) {
                MPKEdit.App.tmpEntry = Entry;
                var reader = new FileReader();
                reader.onload = MPKEdit.Parser.bind(null, fl.name);
                reader.readAsArrayBuffer(fl.slice(0, 36928));
            });
        });
    };

    MPKEdit.fsys = fsys;
    
    console.log("INFO: MPKEdit.fsys ready");
}());
