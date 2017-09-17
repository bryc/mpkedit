var MPKEdit = (function MPKEdit() {
    var MPKEdit = {};

    /* -----------------------------------------------
    function: MPKEdit.Uint8Concat(arrays)
      Concat Uint8Arrays
    */
    MPKEdit.Uint8Concat = function(...arrs) {
        var totalLength = 0;
        for (var arr of arrs) {
            totalLength += arr.length;
        }
        var result = new Uint8Array(totalLength);
        var offset = 0;
        for (var arr of arrs) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    };

    /* -----------------------------------------------
    function: MPKEdit.cyrb32(data)
      CYRB-32 checksum algo.
    */
    MPKEdit.cyrb32 = function cyrb32(data) {
        var i, tmp, sum = 0x9CB85729, len = data.length;
        for(i = 0; i < len; i++) {
            sum = sum + data[i];
            sum = sum + (sum << ((sum & 7)+1));
        } 
        for(tmp = sum >>> 0; tmp > 0; tmp >>>= 1) {
            if(tmp & 1) sum = sum + (sum << ((sum & 7)+1)) + tmp;
        }
        return sum >>> 0;
    };

    /* -----------------------------------------------
    function: MPKEdit.crc8(data)
      CRC-8 checksum algo.
      POLY=0x5A, INIT=0, REFIN=false, REFOUT=false, XOROUT=0
    */
    MPKEdit.crc8 = function(data) {
        for(var i=256, tbl=[], crc, j; i--; tbl[i] = crc&0xFF) {
            j=8; for(crc=i; j--;) {
                crc = crc&128 ? (crc<<1)^0x5A : crc<<1;
            }
        }
        return function(data) {
            for(var i=0, crc=0; i<data.length; ++i)
                crc = tbl[(crc^data[i])%256];
            return crc;
        }
    }();

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
