(function MPKApp() {
    var App = {};
    function pad(a,b,c){return (new Array(b||2).join(c||0)+a).slice(-(b||2))}
    /* -----------------------------------------------
    function: buildRow(i)
      build HTMLElement for note row in MPK
    */
    var buildRow = function(i) {
        function pixicon(canvas, seed) {
            function rand() {
                rstate = rstate * 48271 % 2147483647;
                return rstate / 2147483648;
            }
            function HSL(h, s, l) {
                function rnd(i){return Math.round(i)}
                var H=rnd(h*255*360/96%360), S=rnd(25+s*60%60), L=rnd(30+l*26%26);
                return "hsl("+H+","+S+"%,"+L+"%)";
            }
            var rstate = seed||Math.random()*2147483647;
            var s=8, n=s*s, sc=canvas.width/s;
            var ctx = canvas.getContext("2d");
            ctx.setTransform(1,0,0,1,0,0); //reset rotation
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = HSL(rand(),rand(),rand());
            if(rand()>.5) ctx.rotate(0.5*Math.PI), ctx.translate(0,-canvas.width);
            for(var seq=[],i=0; i<n/2; i++) seq[i] = rand()>.5;
            seq = seq.concat(seq.slice().reverse());

            for(var x=y=i=0; i<n; i++,x=i%s) {
                if(i && !x) y++;
                if(i == (0|n/2)) ctx.fillStyle = HSL(rand(),rand(),rand());
                if(seq[i]) ctx.fillRect(sc*x, sc*y, sc, sc);
            }
        }
        // Handle empty rows
        if(!MPKEdit.State.NoteTable[i]) {
            var tableRow = elem(["tr", {className: "empty"}], elem(["td", {innerHTML: (i+1),"colSpan": 16}]));
            return tableRow;
        }

        var tableRow =
        elem(["tr", {className: "note", id: i}],
            App.cfg.identicon ?
            elem([],elem(["td", {className: "hash"}],
                elem(["canvas", {width: 32, height: 32, id: "hash"}])
            ),MPKEdit.elem(["td",{className:"divider",innerHTML:"<div></div>"}])) : "",
            elem(["td", {className: "name", innerHTML: MPKEdit.State.NoteTable[i].noteName}],
                elem(["div", App.codeDB[MPKEdit.State.NoteTable[i].serial]||MPKEdit.State.NoteTable[i].serial])
            ),
            elem(["td",{className:"divider",innerHTML:"<div></div>"}]),
            elem(["td", {className: "region", innerHTML: MPKEdit.State.NoteTable[i].region}]),
            elem(["td",{className:"divider",innerHTML:"<div></div>"}]),
            elem(["td", {className: "pgs", innerHTML: MPKEdit.State.NoteTable[i].indexes.length}]),
            elem(["td",{className:"divider",innerHTML:"<div></div>"}]),
            elem(["td", {className: "tool"}],
                elem(["span", {className: "fa fa-info-circle", onclick: App.buildModal}]),
                elem(["span", {className: "fa fa-trash", onclick: MPKEdit.State.erase.bind(null, i)}]),
                elem(["span", {
                    className: "fa fa-download",
                    draggable: true,
                    ondragstart: MPKEdit.State.saveNote.bind(null, i),
                    onclick: MPKEdit.State.saveNote.bind(null, i)
                }])
            )
        );

        if(App.cfg.identicon) {
            var hash = MPKEdit.State.NoteTable[i].cyrb32;
            pixicon(tableRow.querySelector("#hash"), hash);
        }
        return tableRow;
    };

    var updateSettings = function() {
        App.cfg[this.id] = this.checked;
        if(MPKEdit.App.usefsys) {
            chrome.storage.local.set({MPKEdit:App.cfg});
        } else {
        localStorage.MPKEdit = JSON.stringify(App.cfg);
        }
          
        App.updateUI();
    };

    App.buildModal = function(e) {
        var modal = document.getElementById("modal");
        if(e.target.id==="modal") {
            modal.style.opacity = "0";
            modal.style.visibility = "hidden";
            return;}

        // wat
        else if(e.target.id==="menu"||e.target.className==="fa fa-info-circle") {

        while(modal.firstChild) {modal.removeChild(modal.firstChild);}
        var content = elem(["div",{className:"modalContent"}]);
        var col = ["#F3E3B2","#CEF696","#8EA4F7","#F2F680","#E8A9CA","#B2968A","#CCA0E7","#E1C89F",
           "#ABE6C7","#92C9C0","#ED6BB2","#A9E49A","#B9B9DA","#91A5D7","#F4AD9B","#A8C7F7"];

        // SETTINGS
        if(e.target.id === "menu") {
            var settings = elem([],
                elem(["h1", "Settings"]),

                elem(["div", {className: "modalBlock"}],
                    elem(["span", {className: "state"}],
                        elem(["input", {checked: App.cfg.hideRows, id: "hideRows", onchange: updateSettings, type:"checkbox"}]),
                        elem(["span", {onclick:function(){this.previousSibling.click()}, className: "chkb0x"}])
                    ),
                    elem(["div",{className: "text"}],
                    elem(["div", {className: "textLabel",onmousedown:function(e){e.preventDefault()}, innerHTML: "Hide empty rows",
                    onclick:function(){this.parentNode.previousSibling.querySelector("input").click()}}]),
                    elem(["div", {className: "textInfo", innerHTML: "Control whether empty rows are displayed."}])
                    )
                ),

                elem(["div", {className: "modalBlock"}],
                    elem(["span", {className: "state"}],
                        elem(["input", {checked: App.cfg.identicon, id: "identicon", onchange: updateSettings, type:"checkbox"}]),
                        elem(["span", {onclick:function(){this.previousSibling.click()}, className: "chkb0x"}])
                    ),
                    elem(["div",{className: "text"}],
                    elem(["div", {className: "textLabel",onmousedown:function(e){e.preventDefault()},
                        onclick:function(){this.parentNode.previousSibling.querySelector("input").click()}, innerHTML: "Show icons"}]),
                    elem(["div", {className: "textInfo", innerHTML: "Identify unique saves with icons."}])
                    )
                )
            );

        var x = elem(["div",{className:"pageContainer"}])
        for(var j = 0; j < 128; j++) {
            x.appendChild(elem(["span",{className:"b0x"}]))
            if((j+1)%32===0) {x.appendChild(elem(["br"]))}
        }

        var x2 = x.querySelectorAll("span.b0x")

        for(var i = 0; i < 16; i++) {
            if(MPKEdit.State.NoteTable[i]) {
                var y = MPKEdit.State.NoteTable[i].indexes;
                for(var j = 0; j < y.length; j++) {
                    var page = y[j];

                    x2[page].style.background = col[i];
;
                    console.log(x2[page]);
                }
            }
        }
            console.log(x);
            settings.appendChild(x)
            content.appendChild(settings)
        }

        if(e.target.className === "fa fa-info-circle") {
            var i = e.target.parentElement.parentElement.id;
            var i2 = (i*32)+0x300;
            var noteData = "<code>";
            for(var j = i2; j < i2+32; j++) {
                noteData += pad(MPKEdit.State.data[j].toString(16).toUpperCase(),2);
                if((j-i2)===15) { noteData += "<br>"} else {noteData += " "}
                
            } noteData += "</code>"
            
            var noteInfo = elem([],
                elem(["h1","Note details"]),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Comment", className:"label"}]),
                    elem(["span", {contentEditable:true,oninput:function(){if(this.innerHTML==="<br>")this.innerHTML="";},className:"content", innerHTML:MPKEdit.State.NoteTable[i].comment || ""}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Note name", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.State.NoteTable[i].noteName}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Game name", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.App.codeDB[MPKEdit.State.NoteTable[i].serial]}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Game code", className:"label"}]),
                    elem(["span", {className:"content fixed", innerHTML:MPKEdit.State.NoteTable[i].serial}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Region", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.State.NoteTable[i].region}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Publisher", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.App.pubDB[MPKEdit.State.NoteTable[i].publisher] + " (<code>"+MPKEdit.State.NoteTable[i].publisher+"</code>)"}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Hash code", className:"label"}]),
                    elem(["span", {className:"content fixed", innerHTML:pad(MPKEdit.State.NoteTable[i].cyrb32.toString(16),8)}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Used pages", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.State.NoteTable[i].indexes.length + " ("+(MPKEdit.State.NoteTable[i].indexes.length * 256)+" bytes)"}])
                    ),

                elem(["h1", "Raw note entry"]),
                elem(["div", {style:"text-align:center;font-size:14px;",innerHTML:noteData}])
            );
            noteInfo.querySelector("[contenteditable=true]").setAttribute("placeholder","No comment...")
            content.appendChild(noteInfo);
                    var x = elem(["div",{className:"pageContainer"}])
        for(var j = 0; j < 128; j++) {
            x.appendChild(elem(["span",{className:"b0x",style:(MPKEdit.State.NoteTable[i].indexes.indexOf(j)!==-1?" background:"+col[i]:"")}]))
            if((j+1)%32===0) {x.appendChild(elem(["br"]))}
        }
        content.appendChild(x);
        }

        modal.appendChild(content);



        modal.style.visibility = "";
        modal.style.opacity = "1";
        }
    };

    /* -----------------------------------------------
    function: App.updateUI()
      update the MPK data display UI. used when loading new files and
      when modifications occur.
    */
    App.updateUI = function() {
        // this status thing could be put to a buildStats(w1,w2)
        document.getElementById("filename").innerHTML = MPKEdit.State.filename;
        var status =
        "<span class=statBox>{text1}/123 pages free<div class=outerBar><div style='{w1}' class=innerBar></div></div></span>" +
        "<span class=statBox>{text2}/16 notes free<div class=outerBar><div style='{w2}' class=innerBar></div></div></span>";

        var w1 = (MPKEdit.State.usedPages / 123) * 100;
        var w2 = (MPKEdit.State.usedNotes / 16) * 100;
        var _W = [
            (w1==100?"background:#547F96;":""), (w1>0&&w1<100?"border-right:1px solid rgba(0,0,0,0.15)":""),
            (w2==100?"background:#547F96;":""), (w2>0&&w2<100?"border-right:1px solid rgba(0,0,0,0.15)":"")
        ];
        status = status.replace("{text1}", 123 - MPKEdit.State.usedPages);
        status = status.replace("{text2}", 16 - MPKEdit.State.usedNotes);
        status = status.replace("{w1}", "width:"+w1+"%;" + _W[0]+_W[1]);
        status = status.replace("{w2}", "width:"+w2+"%;" + _W[2]+_W[2]);
        document.getElementById("stats").innerHTML = status;
        
        var out = document.querySelector("table");
        // remove all elements in the table
        while(out.firstChild) {
            out.removeChild(out.firstChild);
        }

        for(var i = 0; i < 16; i++) {
            // skip if hideRows enabled & Note doesn't exist
            if(App.cfg.hideRows && !MPKEdit.State.NoteTable[i]) {continue;}
            var tableRow = buildRow(i);
            out.appendChild(tableRow);
        }

        if(out.innerHTML === "") {out.innerHTML = "<tr><td class=empty>~ Empty</td></tr>"}
    };

    MPKEdit.App = App;
    var elem = MPKEdit.elem;

    console.log("INFO: MPKEdit.App ready");
}());
