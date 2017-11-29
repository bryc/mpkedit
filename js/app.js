(function MPKApp() {
    var App = {};
    function pad(a,b,c){return (new Array(b||2).join(c||0)+a).slice(-(b||2))}
    /* -----------------------------------------------
    function: buildRow(i)
      build HTMLElement for note row in MPK
    */
    var buildRow = function(i) {
        function pixicon(t,e) {
            function n(t,e,n,i=0){
                var r=[[999*t%360,24+80*e%40,26+70*n%40],[999*t%360,9*e%10,15+36*n%50],[999*t%360,14*e%40,37+36*n%40]];
                return"hsl("+~~r[i][0]+","+~~r[i][1]+"%,"+~~r[i][2]+"%)"
            }
            var i=[],r=new function(){this.next=function(){return(this.r=48271*this.r%2147483647)/2147483648},this.r=e},
            a=t.getContext("2d");
            30!==t.width&&(t.width=t.height=30,t.style.imageRendering="-moz-crisp-edges",t.style.imageRendering="pixelated"),
            a.setTransform(1,0,0,1,0,0),a.clearRect(0,0,t.width,t.height);
            var h=n(r.next(),r.next(),r.next(),r.next()>=.9?1:0),
                l=n(r.next(),r.next(),r.next(),r.next()>=.8?2:0);
                a.fillStyle=h,r.next()>.5&&(a.rotate(.5*Math.PI),a.translate(0,-t.width));
            for(var x=0|.125*(2*(e=r.next())*100+8*e+100),s=0;s<x;s++)i[s]=1;
            for(var o,s=50;s;)o=0|r.next()*s--,[i[s],i[o]]=[i[o],i[s]];
            i=i.concat(i.slice().reverse());
            for(var c=t.width/10,f=y=s=0;s<100;s++,f=s%10)
                50===s&&(a.fillStyle=l),
                s&&!f&&y++,
                i[s]&&a.fillRect(c*f,c*y,c,c)
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
            elem(["td", {className: "name", innerHTML: MPKEdit.State.NoteTable[i].noteName+(MPKEdit.State.NoteTable[i].comment?"<span title='"+MPKEdit.State.NoteTable[i].comment.replace("&","&amp;").replace('"',"&quot;").replace('<',"&lt;").replace('>',"&gt;").replace("'","&apos;") + "' class='fa fa-comment'></span>":"")}],
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
                    elem(["textarea", {maxLength: 2048, placeholder: "No comment...", oninput: function() {
                        var encoded = new TextEncoder("utf-8").encode(this.value);
                        if(encoded.length <= 4080) {
                            this.style.color = "";
                            MPKEdit.State.NoteTable[i].comment = this.value;
                            App.updateUI();
                        } else {this.style.color = "red";}                        
                    }, className:"content", value: MPKEdit.State.NoteTable[i].comment || ""}])
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
        status = status.replace("{w2}", "width:"+w2+"%;" + _W[2]+_W[3]);
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
