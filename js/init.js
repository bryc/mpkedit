{
/* -----------------------------------------------
function: readFiles(event)
  read files from a drop event or a browse file input, and proceeds to
  parse/check the file (only reads 36928 bytes).
*/
const readFiles = function(event) {
    /* To give [reader.onload] access to [i], we need to pull some strings.
    // It can be done using an IIFE or modifying [reader] obj, but I've chosen to 
    // use a named function, which is easier to read and arguably faster. */
    const readFile = function(i) {
        const reader = new FileReader();
        reader.onload = function(e) {
            MPKEdit.Parser(new Uint8Array(e.target.result), files[i].name, files[i].lastModified, files[i].size);
        };
        // Read bytes from file with upper size limit
        // RawMPK=32768, DexDrive=36928, MaxMPKCmt=98144
        reader.readAsArrayBuffer(files[i].slice(0, 98144));
    };
    // Support both <input type=file> AND drag and drop
    const files = event.target.files || event.dataTransfer.files;
    // Do the loop.
    for(let i = 0; i < files.length; i++) readFile(i);
    event.preventDefault();
};

window.addEventListener("load", function() {
    // Init Local Storage config
    MPKEdit.App.cfg = {
        "#!version" : 0.1,    // app config version (increase when introducing config changes)
        "identicon" : false,  // true = display identicons for notes
        "hideRows"  : true,   // true = hide empty rows 
        "reorder"   : false,  // true = enable reorder function 
        "theme"     : null,   // CSS color scheme
    };

    // Load config from storage
    if(localStorage.MPKEdit) MPKEdit.App.cfg = JSON.parse(localStorage.MPKEdit);
    if(MPKEdit.App.cfg["theme"]) MPKEdit.App.changeTheme(MPKEdit.App.cfg["theme"]);
	
    /* -----------------------------------------------
    function: setDragEffects()
      sets up events for the visual effect when dragging a file over.
    */
    const setDragEffects = function setDragEffects() {
        function isFile(event) {
            const dt = event.dataTransfer;
            for (let i = 0; i < dt.types.length; i++) {
                if (dt.types[i] === "Files") return true;
            }
            return false;
        }
        let lastTarget = null;
        const dropzone = document.getElementById("dropzone");
        window.addEventListener("dragenter", function (event) {
            if (isFile(event)) {
                lastTarget = event.target;
                dropzone.style.opacity = 1, dropzone.style.visibility = "";
            }
        });
        window.addEventListener("dragleave", function (event) {
            if (event.target === lastTarget || event.target === document) {
                dropzone.style.opacity = 0, dropzone.style.visibility = "hidden";
            }
            event.preventDefault();
        });
        window.addEventListener("drop", function(event) {
            dropzone.style.opacity = 0, dropzone.style.visibility = "hidden";
            event.preventDefault();
        });
    };

    /* -----------------------------------------------
      initialize MPKEdit app.
        - setup events: file drag handlers, GUI and other events
        - initialize MPK state (empty file)
    */
    function changeExportColor(event) {
        const trg = document.querySelectorAll(".fa-download");
        for(let i = 0; i < trg.length; i++) {
            trg[i].style.color = event.ctrlKey ? "#c00" : "";
        }
    }
    function browse() {
        const selectFile = document.getElementById("fileOpen");
        if(selectFile.value) selectFile.value = "";
        selectFile.onchange = readFiles, selectFile.click();
    }
    // #### Assign event handlers ####
    // Load file button
    document.getElementById("fileOpen").onchange = readFiles;
    document.getElementById("loadButton").onclick = browse;
    // Drag files
    window.addEventListener("dragover", function(e) {e.preventDefault();});
    window.addEventListener("drop", readFiles);
    setDragEffects();
    // Save file
    document.getElementById("save").onclick = MPKEdit.App.saveMPK;
    // Allows dragging the save icon to save
    document.getElementById("save").ondragstart = MPKEdit.App.saveMPK;
    window.addEventListener("keydown", changeExportColor);
    window.addEventListener("keyup",   changeExportColor);
    window.addEventListener("blur",    changeExportColor);
    // Modal
    document.getElementById("menu").onclick = MPKEdit.App.buildModal;
	// Hide modal when clicking off.
    document.getElementById("modal").onclick = function(e) {
        if(e.target.id === "modal") modal.style.opacity = 0, modal.style.visibility = "hidden";
    };
    // Hide modal when pressing ESC key.
    window.onkeydown = function(e) {
        if(e.keyCode === 27) modal.style.opacity = 0, modal.style.visibility = "hidden";
    };

    MPKEdit.App.initMPK();
});
}