(function MPKApp() {
	var elem = MPKEdit.elem;

	var App = {};

    /* -----------------------------------------------
    function: buildRow(i)
      build HTMLElement for note row in MPK
    */
	var buildRow = function(i) {
		if(!MPKEdit.State.NoteTable[i]) { return elem(["tr", {className:"empty"}],elem(["td",{innerHTML:(i+1),"colSpan":5}])); }
		var gameCode = MPKEdit.State.NoteTable[i].serial;
		var gameName = App.codeDB[gameCode] || gameCode;
		var tableRow =
		elem(["tr",{className:"note", id:i}],
			elem(["td", {className:"h4sh"}],
				elem(["canvas",{width:30,height:30,id:"hash"}])
			),
			elem(["td", {className:"name",innerHTML:MPKEdit.State.NoteTable[i].noteName}],
				elem(["div", gameName])
			),

			elem(["td", {className:"region",innerHTML:MPKEdit.State.NoteTable[i].region}]),
			elem(["td", {className:"pgs",innerHTML:MPKEdit.State.NoteTable[i].indexes.length}]),
			elem(["td", {className:"tool"}],
				elem(["span", {
					className: "fa fa-info-circle",
					onclick: App.buildModal
				}]),
				elem(["span", {
					className: "fa fa-trash",draggable: true,
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

		MPKEdit.jdenticon.update(tableRow.querySelector("#hash"), MPKEdit.State.NoteTable[i].xxhash64)
		return tableRow;
	};

	App.buildModal = function(e) {
		function pad(n, width=2, z=0){return(String(z).repeat(width)+String(n)).slice(String(n).length)}

		var modal = document.getElementById("modal");
		if(e.target.id==="modal") {modal.style.display = "none"; return;}

		else if(e.target.id==="menu"||e.target.className==="fa fa-info-circle") {

		while(modal.firstChild) {modal.removeChild(modal.firstChild);}
		var content = elem(["div",{className:"modalContent"}]);
		console.log(1)
		if(e.target.id === "menu") {
			var settings = elem([],
				elem(["h1","Settings"]),
				elem(["div"],
					elem(["span", {innerHTML: "Show empty rows", style:"width:200px", className:"block"}]),
					elem(["input", {type:"checkbox"}])
					),
				elem(["div"],
					elem(["span", {innerHTML: "Show identicons", style:"width:200px", className:"block"}]),
					elem(["input", {type:"checkbox"}])
					)
				);
			content.appendChild(settings)
		}
		if(e.target.className === "fa fa-info-circle") {
			var i = e.target.parentElement.parentElement.id;
			var i2 = (i*32)+0x300;
			var noteData = "<code>";
			for(var j = i2; j < i2+32; j++) {
				if((j-i2)===16) { noteData += "<br>"}
				noteData += pad(MPKEdit.State.data[j].toString(16).toUpperCase()) + " ";
			} noteData += "</code>"
			
			var noteInfo = elem([],
				elem(["h1","Note details"]),
				elem(["div"],
					elem(["span", {innerHTML: "Note Name", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].noteName}])
					),
				elem(["div"],
					elem(["span", {innerHTML: "Game Name", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.App.codeDB[MPKEdit.State.NoteTable[i].serial]}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Game Code", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].serial}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Region", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].region}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Publisher", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.App.pubDB[MPKEdit.State.NoteTable[i].publisher] + " ("+MPKEdit.State.NoteTable[i].publisher+")"}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Data Hash", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].xxhash64 + " (xxHash64)"}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Comment", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].comment || ""}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Note Position", className:"block"}]),
					elem(["span", {innerHTML:i}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Used Pages", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].indexes.length + " ("+(MPKEdit.State.NoteTable[i].indexes.length * 256)+" bytes)"}])
					),
			elem(["div"],
					elem(["span", {innerHTML: "Page Nodes", className:"block"}]),
					elem(["span", {innerHTML:MPKEdit.State.NoteTable[i].indexes}])
					),

			elem(["h1", "Raw note entry"]),
			elem(["div", noteData])
				);

			content.appendChild(noteInfo);
		}
		
		modal.appendChild(content);
		modal.style.display = "block";
	}

	};

    /* -----------------------------------------------
    function: App.updateUI()
      update the MPK data display UI. used when loading new files and
      when modifications occur.
    */
	App.updateUI = function() {
		var out = document.querySelector("table");
		while(out.firstChild) {
			out.removeChild(out.firstChild);
		}

		document.getElementById("filename").innerHTML = MPKEdit.State.filename;

		document.getElementById("stats").innerHTML = 

		"<span class=num>" + (123 - MPKEdit.State.usedPages) + "</span>/123 pages free · <span class=num>" + (16 - MPKEdit.State.usedNotes) + "</span>/16 notes free<br>"
		+ "<span style='height:4px;display:inline-block;border:1px solid;background:#EEE;width:120px'><span style='height:4px;display:block;background:red;width:"+((MPKEdit.State.usedPages / 123) * 100)+"%'></span></span>"
		+ "<span style='margin-left:10px;height:4px;display:inline-block;border:1px solid;background:#EEE;width:100px'><span style='height:4px;display:block;background:orange;width:"+((MPKEdit.State.usedNotes / 16) * 100)+"%'></span></span>";

		for(var i = 0; i < 16; i++) {
			//if(MPKEdit.State.NoteTable[i]) {
				var tableRow = buildRow(i);
				out.appendChild(tableRow);
			//}
		}
	};

	MPKEdit.App = App;

	console.log("INFO: MPKEdit.App ready");
}());
