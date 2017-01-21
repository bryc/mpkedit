window.addEventListener("load", function() {
    /* -----------------------------------------------
    function: readFiles(event)
      read files from a drop event or a browse file input, and proceeds to
      parse/check the file (only reads 36928 bytes).
    */
    var readFiles = function(event) {
        /* To give [reader.onload] access to [i], we need to pull some strings.
        // It can be done using an IIFE or modifying [reader] obj, but I've chosen to 
        // use a named function, which is easier to read and arguably faster. */
        var readFile = function(i) {
            var reader = new FileReader();
            reader.onload = function(e) {
                MPKEdit.Parser(new Uint8Array(e.target.result), files[i].name)
            };
            if(MPKEdit.App.usefsys) {
                MPKEdit.App.tmpEntry = event.dataTransfer.items[i].webkitGetAsEntry();
            }
            reader.readAsArrayBuffer(files[i].slice(0, 36928));
        }

        // Support both <input type=file> AND drag and drop
        var files = event.target.files || event.dataTransfer.files;
        // Do the loop.
        for(var i = 0; i < files.length; i++) {
            readFile(i);
        }

        event.preventDefault();
    };

    /* -----------------------------------------------
    function: setDragEffects()
      sets up events for the visual effect when dragging a file over.
    */
    var setDragEffects = function setDragEffects() {
        function isFile(event) {
            var dt = event.dataTransfer;
            for (var i = 0; i < dt.types.length; i++) {
                if (dt.types[i] === "Files") {
                    return true;
                }
            }
            return false;
        }

        var dropzone = document.getElementById("dropzone");
        var lastTarget = null;

        window.addEventListener("dragenter", function (event) {
            if (isFile(event)) {
                lastTarget = event.target;
                dropzone.style.visibility = "";
                dropzone.style.opacity = 1;
            }
        });

        window.addEventListener("dragleave", function (event) {
            event.preventDefault();
            if (event.target === lastTarget) {
                dropzone.style.visibility = "hidden";
                dropzone.style.opacity = 0;
            }
        });

        window.addEventListener("drop", function(event) {
            dropzone.style.visibility = "hidden";
            dropzone.style.opacity = 0;
            event.preventDefault();
        });
    }

    /* -----------------------------------------------
    function: init()
      initialize MPKEdit app.
        - setup events: file drag handlers, GUI and other events
        - initialize MPK state (empty file)
    */
    var init = function() {
        function changeExportColor(event) {
            var target = document.querySelectorAll(".fa-download");
            for(var i = 0; i < target.length; i++) {
                target[i].style.color = event.ctrlKey ? "#c00" : "";
            }
        }
        function browse() {
            if(MPKEdit.App.usefsys) {MPKEdit.fsys.loadFile();}
            else {
                var selectFile = document.getElementById("fileOpen");
                selectFile.onchange = readFiles;
                selectFile.click();
            }
        }

        MPKEdit.App.usefsys = location.protocol === "chrome-extension:";

        MPKEdit.App.cfg = {
            "#!version" : 0.1,
            "identicon" : false,
            "hideRows"  : true
        };

        if(MPKEdit.App.usefsys) {
            chrome.storage.local.get(function(e){
                if(e.MPKEdit) {
                    // Annoying ass async API. Must update UI again.
                    MPKEdit.App.cfg = e.MPKEdit;
                    MPKEdit.App.updateUI();
                }
            });
        } else if(!MPKEdit.App.usefsys && localStorage.MPKEdit) { 
            MPKEdit.App.cfg = JSON.parse(localStorage.MPKEdit); 
        }

        // Load file button
        document.getElementById("fileOpen").onchange = readFiles;
        document.getElementById("loadButton").onclick = browse;
        // Drag files
        window.addEventListener("dragover", function(e) {e.preventDefault();});
        window.addEventListener("drop", readFiles);
        setDragEffects();
        // Save file
        document.getElementById("save").onclick = MPKEdit.State.save;
        // Allows dragging the save icon to save
        document.getElementById("save").addEventListener("dragstart", function(event) {
            var blobURL = URL.createObjectURL(new Blob([MPKEdit.State.data]));
            event.dataTransfer.setData("DownloadURL",
                "application/octet-stream:" + MPKEdit.State.filename + ":" + blobURL
            );
        });
        window.addEventListener("keydown", changeExportColor);
        window.addEventListener("keyup", changeExportColor);
        window.addEventListener("blur", changeExportColor);
        // Modal
        document.getElementById("menu").onclick = MPKEdit.App.buildModal;
        document.getElementById("modal").onclick = MPKEdit.App.buildModal;
        
        MPKEdit.State.init();
    };

    init();
    console.log("INFO: Application initialized");
});
