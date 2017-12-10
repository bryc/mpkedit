(function fsys() {
    var fsys = {};

    var writeDone = function(Entry,  event) {
        if(event.loaded === event.currentTarget.position) {
            event.currentTarget.truncate(event.currentTarget.position); // truncate data to correct size.
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
        chrome.fileSystem.chooseEntry({acceptsMultiple: true}, function(Entry) {
            if(chrome.runtime.lastError) {return false;}

            for(var i = 0; i < Entry.length; i++) {
                Entry[i].file(function(i, fl) {
                    // set tmpEntry only if .MPK file.
                    if("MPK" === fl.name.split('.').pop().toUpperCase()) {
                        MPKEdit.App.tmpEntry = Entry[i];
                    }
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        MPKEdit.Parser(new Uint8Array(e.target.result), fl.name);
                    }
                    reader.readAsArrayBuffer(fl.slice(0, 98144));
                }.bind(null, i));
            }
        });
    };

    MPKEdit.fsys = fsys;
    
    console.log("INFO: MPKEdit.fsys ready");
}());
