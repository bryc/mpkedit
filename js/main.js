var MPKEdit = (function MPKEdit() {
    var MPKEdit = {};

    /* -----------------------------------------------
    function: MPKEdit.crc32(data)
      calculate crc32 checksum. the lookup table is
      precalculated when app starts.
    */
    MPKEdit.crc32 = (function(data) {
        var table = [];
        for (var i = 256, crc; i--;) {
            crc = i;
            for (var j = 8; j--;) {
                if(crc & 1) {
                    crc = crc >>> 1 ^ 3988292384;
                }
                else {crc = crc >>> 1;}
            }
            table[i] = crc;
        }

        return function (data) {
            crc = -1;
            for (var i = 0; i < data.length; i++) {
                var ptr = crc & 255 ^ data[i];
                crc = crc >>> 8 ^ table[ptr];
            }
            crc = ((crc ^ -1) >>> 0).toString(16).toUpperCase();
            return ("00000000" + crc).slice(-8);
        }
    }());

    /* -----------------------------------------------
    function: MPKEdit.elem(options)
      generate a HTMLElement DOM structure from
      supplied array data.
    */
    MPKEdit.elem = function(options) {
        var el = document.createDocumentFragment();
        var tag = options[0];
        var prop = options[1];
    
        if(typeof tag === "string") {
            el = document.createElement(tag);
        }
    
        if(typeof prop === "object") {
            for (var item in prop) {
                el[item] = prop[item];
            }
        } else if(prop) {
            el.innerHTML = prop;
        }
    
        for(var i = 1; i < arguments.length; i++) {
            if(arguments[i].nodeType > 0) {
                el.appendChild(arguments[i]);
            }
        }
    
        return el;
    };

    console.log("INFO: MPKEdit ready");
    return MPKEdit;
}());
