(function MPKApp() {
	var App = {};

	App.usefsys = location.protocol === "chrome-extension:";
	App.codeDB = {};

	var elem = MPKEdit.elem;
	var origin;
	var out = undefined;

	var enter = function(event) {
		if(!origin || origin.nodeName !== "TR") {return false;}
		var u = event.target;
		while(true) {
			if(u.parentNode.nodeName === "TR") {
				var dest = u.parentNode;
				break;
			} else {u = u.parentNode;}
		}
		if(origin.previousSibling === dest) {
			origin.parentNode.insertBefore(origin, dest);
		} else  {
			origin.parentNode.insertBefore(origin, dest.nextSibling);
		}
	}

	var start = function(event) {
		window.getSelection().removeAllRanges();
		origin = event.target;
		origin.style.background = "#EEE";
		event.dataTransfer.setData("text","null");
		var trs = document.querySelectorAll("tr");
		for(var arr = [], i = 0; i < trs.length; i++) {
			arr.push(trs[i].id);
		}
		out = arr;
	}

	var end = function() {
		origin.style.background = "";
		origin.style.cursor = "";
		origin = undefined;
		var trs = document.querySelectorAll("tr");
		for(var arr = [], i = 0; i < trs.length; i++) {
			arr.push(trs[i].id);
		}
		for (var i = 0,d=0; i < out.length; i++) {
			if (out[i] === arr[i]) { d++;}
		}
		if(out.length === d) {return false;}
		var tmp = new Uint8Array(MPKEdit.State.data);
		for(var i = 0x300; i < 0x500; i += 32) {
			var p = 0x300+(32*arr[(i-0x300)/32]);
			for(var j = 0; j < 32; j++) {
				tmp[i+j] = MPKEdit.State.data[p+j];
			}
		}
		MPKEdit.Parser(tmp);
	}

	var browse = function() {
		if(App.usefsys) {
			MPKEdit.fsys.loadFile();
		}
		else {
			var selectFile = document.getElementById("fileOpen");
			selectFile.onchange = readFiles;
			selectFile.click();

			selectFile.parentElement.replaceChild(elem(["input", {
				id: "fileOpen",
				type: "file",
				multiple: true
			}]), selectFile);
		}
	};

	var readFiles = function(event) {
		var files = event.target.files || event.dataTransfer.files;

		for(var i = 0; i < files.length; i++) {
			var reader = new FileReader();
			reader.onload = MPKEdit.Parser.bind(null, files[i].name);

			if(App.usefsys) {
				App.tmpEntry = event.dataTransfer.items[i].webkitGetAsEntry();
			}
			reader.readAsArrayBuffer(files[i].slice(0, 36928));
		}
		event.preventDefault();
	};

	var buildRow = function(i) {
		var gameCode = MPKEdit.State.NoteTable[i].serial;
		var gameName = App.codeDB[gameCode] || gameCode;

		var tableRow =
		elem(["tr",{id:i, draggable: true,  ondragenter:enter, ondragstart:start, ondragend:end}],
			elem(["td", MPKEdit.State.NoteTable[i].noteName],
				elem(["div", gameName])
			),
			elem(["td", MPKEdit.State.NoteTable[i].indexes.length]),
			elem(["td"],
				elem(["span", {
					className: "fa fa-trash",
					onclick: MPKEdit.State.erase.bind(null, i)
				}]),
				elem(["span", {
					className: "fa fa-download",
					draggable: true,
					ondragstart: MPKEdit.State.saveNote.bind(null, i),
					onclick: MPKEdit.State.saveNote.bind(null, i)
				}])
			)
		);

		return tableRow;
	};

	App.init = function() {
		function changeExportColor(event) {
			var target = document.querySelectorAll(".fa-download");
			for(var i = 0; i < target.length; i++) {
				target[i].style.color = event.ctrlKey ? "#c00" : "";
			}
		}

		function setDragFX() {
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

		MPKEdit.State.init();

		window.addEventListener("dragover", function(event) {
			event.preventDefault();
		});
		window.addEventListener("drop", readFiles);
	
		document.getElementById("fileOpen").onchange = readFiles;
		document.getElementById("loadButton").onclick = browse;

		document.getElementById("save").addEventListener("dragstart", function(event) {
			var blobURL = URL.createObjectURL(new Blob([MPKEdit.State.data]));
			event.dataTransfer.setData("DownloadURL",
				"application/octet-stream:" + MPKEdit.State.filename + ":" + blobURL
			);
		});

		document.getElementById("save").onclick = MPKEdit.State.save;

		window.addEventListener("keydown", changeExportColor);
		window.addEventListener("keyup", changeExportColor);
		window.addEventListener("blur", changeExportColor);
		setDragFX();
	};

	App.updateUI = function() {
		var out = document.querySelector("table");
		while(out.firstChild) {
			out.removeChild(out.firstChild);
		}

		document.getElementById("filename").innerHTML = MPKEdit.State.filename;

		document.getElementById("stats").innerHTML = 
		"<span class=num>" +
		MPKEdit.State.usedPages + "</span> / 123 pages, <span class=num>" + 
		MPKEdit.State.usedNotes + "</span> / 16 notes";

		for(var i = 0; i < 16; i++) {
			if(MPKEdit.State.NoteTable[i]) {
				var tableRow = buildRow(i);
				out.appendChild(tableRow);
			}
		}

		if(Object.keys(MPKEdit.State.NoteTable).length === 0) {
			var empty =
			elem(["tr"],
				elem(["td"], elem(["div", {
					id: "emptyFile",
					innerHTML: "~ empty"
				}]))
			);
			out.appendChild(empty);
		}
	};

	MPKEdit.App = App;

	console.log("INFO: MPKEdit.App ready");
}());
