{
/* -----------------------------------------------
function: readFiles(evt, callee, types, maxlen, multi)
  read file(s) from a drop event or a browse file input, and proceed to parse/check the data with a callback.
 
  `types` should be a lowercase string of an allowed file extension, or an array of multiple strings.
  if undefined, all extensions are allowed.
  
  `maxlen` defines the maximum allowed file size. if undefined, there is no limit.
*/
// Relevant MPK sizes: RawMPK = 32768, DexDrive = 36928, MaxMPKCmt = 98144, M64PNX = 296960, MultiMax = 2097152
const readFiles = function(evt, callee = initParse, types, maxlen = 2097152, multi = true) {
    if(typeof callee == "undefined") throw new Error("No callee function assigned.");
    const readFile = function(file) {
        if(types?.length && !types.includes(file.name.split('.').pop().toLowerCase()))
            return console.warn(`Skipped input file. File extension not allowed (${file.name})`);
        if(file.size > maxlen)
            return console.warn(`Skipped input file. Size (${file.size}) is too large (${file.name})`);
        const reader = new FileReader();
        reader.onload = e => callee(e, file);
        reader.readAsArrayBuffer(file.slice(0, maxlen)); // if maxlen is undefined, no size limit.
    };
    const files = evt.target.files || evt.dataTransfer.files; // support <input type=file> and drag/drop.
    if(!multi && files.length > 1) return console.warn(`Only one file allowed (${files.length} specified).`);
    for(let i = 0; i < files.length; i++) readFile(files[i]);
    evt.preventDefault();
};

const initParse = function(evt, file) {
    MPKEdit.Parser(new Uint8Array(evt.target.result), file.name, file.lastModified, file.size);
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
        function isFile(evt) {
            const dt = evt.dataTransfer;
            for (let i = 0; i < dt.types.length; i++) {
                if (dt.types[i] === "Files") return true;
            }
            return false;
        }
        let lastTarget = null;
        const dropzone = document.getElementById("dropzone");
        window.addEventListener("dragenter", function (evt) {
            if (isFile(evt)) {
                lastTarget = evt.target;
                dropzone.style.opacity = 1, dropzone.style.visibility = "";
            }
        });
        window.addEventListener("dragleave", function (evt) {
            if (evt.target === lastTarget || evt.target === document) {
                dropzone.style.opacity = 0, dropzone.style.visibility = "hidden";
            }
            evt.preventDefault();
        });
        window.addEventListener("drop", function(evt) {
            dropzone.style.opacity = 0, dropzone.style.visibility = "hidden";
            evt.preventDefault();
        });
    };

    /* -----------------------------------------------
      initialize MPKEdit app.
        - setup events: file drag handlers, GUI and other events
        - initialize MPK state (empty file)
    */
    function changeExportColor(evt) {
        const trg = document.querySelectorAll(".fa-download");
        for(let i = 0; i < trg.length; i++) {
            trg[i].style.color = evt.ctrlKey ? "#c00" : "";
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
