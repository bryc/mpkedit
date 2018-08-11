(function MPKApp() {
    var App = {};
    function pad(i,x=2,y=0){return(''+y).repeat(x-(''+i).length)+i;}
    function mhs(i){return pad(State.NoteTable[i].cyrb32[0].toString(16),8)+pad(State.NoteTable[i].cyrb32[1].toString(16),8);}
    /* -----------------------------------------------
    function: pixicon(t, r)
      generate random pixel icon from a hash
    */
    var pixicon = function(t, r) {
        //r=[Math.random()*2**32|0,Math.random()*2**32|0,Math.random()*2**32|0,Math.random()*2**32|0]
        function i(t, r, e, i=0) { // HSL color generator.
            var set = [
                [t%360, r%10, 17+e%50],
                [t%360, 24+r%40, 26+e%40],
                [t%360, 12+r%60, 32+e%40]
            ];
            return "hsl("+ set[i][0] +","+ set[i][1] +"%,"+ set[i][2] +"%)";
        }
        function modHSL(str){
        var arr = str.replace(/[^\d,.%]/g, '').split(',').map(x => Number.parseFloat(x, 10));
        return `hsl(${arr[0]-25},${arr[1]-10}%,${arr[2]-7}%)`;
        }
        function rota(arr, mode, w, h) {
            if(mode===3) return arr.slice().reverse();
            if(mode===0 || mode===1) { // horizontal flip
                for(var i = 0, arr2 = []; i < arr.length; i++)
                    arr2[i] = arr[i-2*(i%w)+w-1];
            }
            if(mode===2 || mode===4) { // rotate 90° CW
                for(var i = 0, arr2 = []; i < arr.length; i++)
                    arr2[i] = arr[0|(h-1)*w-((i%h)*w)+i/h];
            }
            if(mode===1||mode===4) arr2.reverse();
            return arr2;
        }
        var n = 10, q = n*3, l = n*n, a = [], c = t.getContext("2d");
        // Set canvas dimensions if not already set (performance boost).
        if(t.width !== q) {
            t.width = t.height = q;
            t.style.imageRendering = "-moz-crisp-edges";
            t.style.imageRendering = "pixelated";
        }
        c.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation.
        c.clearRect(0, 0, t.width, t.height); // Erase previous context.
        // Set fill color for pixels.
        var A = (r[0]&0x2000000) ? 1:2, B = (r[1]&0x2000000) ? 1:2;
        var color1 = i(r[0]&0x1FF, r[0]&0x7E00>>9, r[0]&0x1F8000>>15, (r[0]&0x1E00000>>21)>16 ? 0:A);
        var color2 = i(r[1]&0x1FF, r[1]&0x7E00>>9, r[1]&0x1F8000>>15, (r[1]&0x1E00000>>21)>16 ? 0:B);
        var color3 = modHSL(color1);
        var color4 = modHSL(color2);
        c.fillStyle = color1;
        // Rotate canvas 90 degrees.
        r[0]&0x4000000 && c.rotate(Math.PI * .5)|c.translate(0, -t.width);
        // Generate pixel array
        for(var word = r[2], i = 0; i < 32; i++) {
            var bit = word & 1;
            a.push(bit); word >>>= 1;
        }
        for(var word = r[3], i = 0; i < 18; i++) {
            var bit = word & 1;
            a.push(bit); word >>>= 1;
        }
        var goodlist0 = [1,2,3,4,7,8,9,13,14,19];
        var pt1 = a.slice(0,25);
        var pt2 = a.slice(25,50);
        var mask0 = pt1.slice();
        var mask1 = pt2.slice();
        for(var i = 0; i < 25; i++) {
            if(!goodlist0.includes(i)) {
                mask0[i] = undefined;
                mask1[i] = undefined;
            }
        }
        pt1 = rota(pt1,2,5,5);
        pt1 = rota(pt1,0,5,5);
        pt2 = rota(pt2,2,5,5);
        pt2 = rota(pt2,0,5,5);
        for(var i = 0; i < 25; i++) {
            if(goodlist0.includes(i)) {
                pt1[i] = mask0[i];
                pt2[i] = mask1[i];
            }
        }
        a = [];
        a = a.concat(pt1);
        a = a.concat(rota(pt1,4,n/2,n/2));
        a = a.concat(rota(pt1,2,n/2,n/2));
        a = a.concat(rota(pt1,3,n/2,n/2));
        // Paint canvas.
        for(var o = t.width/n, Q=d=y=s= 0; s < l; s++, d = s%(n/2)) {
            // Change color at halfway point. NOTE: |0 required for odd sizes.
            (s === (0|l/2)) && (c.fillStyle = color3, Q += q/2, y =- 1);
            (s && !d) && y++; // Increment y axis.
            (a[s]) && c.fillRect(Q+o*d, o*y, o, o); // If pixel exists, fill square on canvas (x, y, w, h).
        }
        var b = [];
        b = b.concat(pt2);
        b = b.concat(rota(pt2,4,n/2,n/2));
        b = b.concat(rota(pt2,2,n/2,n/2));
        b = b.concat(rota(pt2,3,n/2,n/2));
        c.fillStyle = color2;
        for(var o = t.width/n, Q=d=y=s= 0; s < l; s++, d = s%(n/2)) {
            // Change color at halfway point. NOTE: |0 required for odd sizes.
            (s === (0|l/2)) && (c.fillStyle = color4, Q += q/2, y =- 1);
            (s && !d) && y++; // Increment y axis.
            (b[s]) && c.fillRect(Q+o*d, o*y, o, o); // If pixel exists, fill square on canvas (x, y, w, h).
        }
    };

    /* -----------------------------------------------
    function: buildRow(i)
      build HTMLElement row for NoteTable in MPK
    */
    var buildRow = function(i) {
        function fixHTML(str) { // sanitize comments for HTML.
            var rep = '&,amp,<,lt,>,gt,",quot,\',apos'.split(',');
            for(var i=0; i<rep.length; i+=2) str=str.replace(new RegExp(rep[i],'g'),`&${rep[i+1]};`);
            return str;
        }
        // Handle empty rows
        if(!State.NoteTable[i]) {
            var tableRow = elem(["tr",{className:"empty"}],elem(["td",{innerHTML:i+1,"colSpan":16}]));
            return tableRow;
        }

        var cmtIcon = State.NoteTable[i].comment?"<span title='"+fixHTML(State.NoteTable[i].comment)+"' class='fa fa-comment'></span>":"";
        var displayName = State.NoteTable[i].noteName + cmtIcon;

        var tableRow =
        elem(["tr",{className:"note",id:i}],
            // start pixicon display
            App.cfg.identicon ?
            elem([],
                elem(["td",{className:"hash"}],elem(["canvas",{width:32,height:32,id:"hash"}])),
                elem(["td",{className:"divider"}],elem(["div"]))
            ) : "",
            // end pixicon display
            elem(["td",{className:"name",innerHTML:displayName}],
                elem(["div",App.codeDB[State.NoteTable[i].serial] || State.NoteTable[i].serial]) // lookup gameCode in codeDB
            ),
            elem(["td",{className:"divider"}],elem(["div"])),
            elem(["td",{className:"region",innerHTML:State.NoteTable[i].region}]),
            elem(["td",{className:"divider"}],elem(["div"])),
            elem(["td",{className:"pgs",innerHTML:State.NoteTable[i].indexes.length}]),
            elem(["td",{className:"divider"}],elem(["div"])),
            elem(["td",{className:"tool"}],
                elem(["span",{className:"fa fa-info-circle",onclick:App.buildModal}]),
                elem(["span",{className:"fa fa-trash",onclick:State.erase.bind(null,i)}]),
                elem(["span",{
                    className: "fa fa-download",
                    draggable: true,
                    ondragstart: State.saveNote.bind(null, i),
                    onclick: State.saveNote.bind(null, i)
                }])
            )
        );

        if(App.cfg.identicon) { // produce pixicons
            pixicon(tableRow.querySelector("#hash"), State.NoteTable[i].cyrb32);
        }
        return tableRow;
    };

    /* -----------------------------------------------
    function: buildModal(i)
      build a multi-purpose Modal popup window.
    */
    App.buildModal = function(e) {
        //if(e.target.id!=="menu"||e.target.className!=="fa fa-info-circle") return; // only allow execution from specific clickies
        var content = elem(["div",{className:"modalContent"}]);

        var col = ["#713257", "#D9C173", "#5B4DA4", "#3A991B", "#1B696A", "#69532F", "#A52626", "#92C9C0",
                   "#1F4F75", "#D6664D", "#F4AD9B", "#BBF637", "#777564", "#497BA5", "#ED6BB2", "#3D4142"];

        // ################ Modal: Settings ################
        if(e.target.id === "menu") {
            var settings =
            elem([],
                elem(["h1","Settings"]),
                // SETTING 1: Hide Rows
                elem(["div",{className:"modalBlock"}],
                    elem(["span",{className:"state"}],
                        elem(["input",{checked: App.cfg.hideRows,id:"hideRows",onchange:updateSettings,type:"checkbox"}]),
                        elem(["span",{onclick:function(){this.previousSibling.click()},className:"chkb0x"}])
                    ),
                    elem(["div",{className:"text"}],
                    elem(["div",{className:"textLabel",onmousedown:function(e){e.preventDefault()},innerHTML:"Hide empty rows",
                        onclick:function(){this.parentNode.previousSibling.querySelector("input").click()}}]),
                    elem(["div",{className:"textInfo",innerHTML:"Control whether empty rows are displayed."}])
                    )
                ),
                // SETTING 2: Pixicons
                elem(["div",{className:"modalBlock"}],
                    elem(["span",{className:"state"}],
                        elem(["input",{checked:App.cfg.identicon,id:"identicon",onchange:updateSettings,type:"checkbox"}]),
                        elem(["span",{onclick:function(){this.previousSibling.click()},className:"chkb0x"}])
                    ),
                    elem(["div",{className:"text"}],
                    elem(["div",{className:"textLabel",onmousedown:function(e){e.preventDefault()},innerHTML:"Show icons",
                        onclick:function(){this.parentNode.previousSibling.querySelector("input").click()}}]),
                    elem(["div",{className:"textInfo",innerHTML:"Identify unique saves with icons."}])
                    )
                )
            );
            // Generate the IndexTable visualizer display
            var x = elem(["div",{className:"pageContainer"}])
            for(var j = 1; j <= 128; j++) {
                x.appendChild(elem(["span",{className:"b0x"}]))
                if(j%32===0) x.appendChild(elem(["br"]));
            }
            // Populate squares of display based on NoteTable data.
            var x2 = x.querySelectorAll("span.b0x");
            for(var page,y,i = 0; i < 16; i++) {
                if(State.NoteTable[i]) {
                    y = State.NoteTable[i].indexes;
                    for(var j = 0; j < y.length; j++) {
                        page = y[j];
                        x2[page].style.borderColor = col[i];
                        x2[page].style.background = col[i]+"C0";
                    }
                }
            }

            // Append IndexTable display to settings.
            settings.appendChild(x);
            // Append Settings to Content
            content.appendChild(settings);
        }

        // ################ Modal: Note Info ################
        if(e.target.className === "fa fa-info-circle") {
            // Get ID of the selected Note and its memory address.
            var i = e.target.parentElement.parentElement.id;
            var i2 = 0x300 + (32*i);

            // Print raw bytes of NoteEntry
            for(var noteData = "<code>", j = i2; j < i2+32; j++) {
                noteData += pad(State.data[j].toString(16).toUpperCase(),2);
                if(j-i2===15) noteData += "<br>"; else noteData += " ";
            } noteData += "</code>";

            var noteInfo =
            elem([],
                elem(["h1","Note details"]),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Comment",className:"label"}]),
                    elem(["textarea",{maxLength:2048,placeholder:"No comment...",oninput:function() {
                        var encoded = new TextEncoder("utf-8").encode(this.value);
                        if(encoded.length <= 4080) {
                            this.style.color = "", State.NoteTable[i].comment = this.value;
                            App.updateUI();
                        } else this.style.color = "red";
                    },className:"content",value:State.NoteTable[i].comment || ""}])
                    ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Note name",className:"label"}]),
                    elem(["span",{className:"content",innerHTML:State.NoteTable[i].noteName}])
                ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Game name",className:"label"}]),
                    elem(["span",{className:"content",innerHTML:MPKEdit.App.codeDB[State.NoteTable[i].serial]}])
                ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Game code",className:"label"}]),
                    elem(["span",{className:"content fixed",innerHTML:State.NoteTable[i].serial}])
                ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Region",className:"label"}]),
                    elem(["span",{className:"content",innerHTML:State.NoteTable[i].region}])
                ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Publisher",className:"label"}]),
                    elem(["span",{className:"content",innerHTML:MPKEdit.App.pubDB[State.NoteTable[i].publisher]+" (<code>"+State.NoteTable[i].publisher+"</code>)"}])
                ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Hash code",className:"label"}]),
                    elem(["span",{className:"content fixed",innerHTML:mhs(i)}])
                ),
                elem(["div",{className:"modalFlex"}],
                    elem(["span",{innerHTML:"Used pages",className:"label"}]),
                    elem(["span",{className:"content",innerHTML:State.NoteTable[i].indexes.length+" ("+State.NoteTable[i].indexes.length*256+" bytes)"}])
                ),
                elem(["h1","Raw note entry"]),
                elem(["div",{style:"text-align:center;font-size:14px;",innerHTML:noteData}])
            );

            // Append noteInfo block to content.
            content.appendChild(noteInfo);

            // Paint IndexTable display usage for this Note.
            var x = elem(["div",{className:"pageContainer"}])
            for(var sty,j = 0; j < 128; j++) {
                sty = State.NoteTable[i].indexes.indexOf(j)!==-1?` border-color:${col[i]};background:${col[i]}C0`:"";
                x.appendChild(elem(["span",{className:"b0x",style:sty}]));
                if((j+1)%32===0) x.appendChild(elem(["br"]));
            }
            // Append display to content.
            content.appendChild(x);
        }

        // #### Appending content to Modal ####
        var modal = document.getElementById("modal");
        while(modal.firstChild) modal.removeChild(modal.firstChild); // Clear modal contents first.
        modal.appendChild(content); // Append content to modal.
        modal.style.visibility = ""; // Unhide modal.
        modal.style.opacity = 1;
    };

    /* -----------------------------------------------
    function: updateSettings(i)
      Update a localStorage setting individually
    */
    var updateSettings = function() {
        App.cfg[this.id] = this.checked;
        if(MPKEdit.App.usefsys) chrome.storage.local.set({MPKEdit:App.cfg});
        else localStorage.MPKEdit = JSON.stringify(App.cfg);
        App.updateUI();
    };

    /* -----------------------------------------------
    function: App.updateUI()
      update the MPK data display UI. used when loading new files and
      when modifications occur.
    */
    App.updateUI = function() {
        document.getElementById("filename").innerHTML = State.filename;
        // Stats bar dynamic CSS
        var w1 = 100 * (State.usedPages / 123);
        var w2 = 100 * (State.usedNotes / 16);
        w1 = `width:${w1}%;`+(w1===100?"background:#547F96;":"")+(w1>0&&w1<100?"border-right:1px solid rgba(0,0,0,0.15)":"");
        w2 = `width:${w2}%;`+(w2===100?"background:#547F96;":"")+(w2>0&&w2<100?"border-right:1px solid rgba(0,0,0,0.15)":"");
        var status =
        `<span class=statBox>${123-State.usedPages}/123 pages free<div class=outerBar><div style='${w1}' class=innerBar></div></div></span>` +
        `<span class=statBox>${16 -State.usedNotes}/16  notes free<div class=outerBar><div style='${w2}' class=innerBar></div></div></span>`;
        document.getElementById("stats").innerHTML = status;

        var out = document.querySelector("table");
        // remove all elements in the table
        while(out.firstChild) out.removeChild(out.firstChild);

        for(var i = 0; i < 16; i++) {
            // skip if hideRows enabled & Note doesn't exist
            if(App.cfg.hideRows && !State.NoteTable[i]) {continue;}
            var tableRow = buildRow(i);
            out.appendChild(tableRow);
        }
        // display "Empty" msg if hideRows enabled
        if(out.innerHTML==="") out.innerHTML = "<tr><td class=empty>-Empty file-</td></tr>";
    };

    MPKEdit.App = App;
    var elem = MPKEdit.elem;
    var State = MPKEdit.State;

    console.log("INFO: MPKEdit.App ready");
}());
