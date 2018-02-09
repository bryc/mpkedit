var MPKEdit = (function MPKEdit() {
    var MPKEdit = {};

    /* -----------------------------------------------
    function: MPKEdit.Uint8Concat(arrays)
      Concat Uint8Arrays
    */
    MPKEdit.Uint8Concat = function(...arrs) {
        var offset = 0, totalLength = 0;
        for (var arr of arrs) {
            totalLength += arr.length;
        }
        var result = new Uint8Array(totalLength);
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
    MPKEdit.cyrb32 = function cyrb32(d) {
        for(var i=0,h=0x41c6ce57,t=d.length; i<t; i++)
            h+=d[i], h+=h<<4, h^=h>>>1;
        return (h^=h<<11, h+=h<<14) >>>0;
    };

    /* -----------------------------------------------
    function: MPKEdit.crc8(data)
      CRC-8 checksum algo.
      CRC-8/ITU: POLY=0x07, INIT=0, REFIN=false, REFOUT=false, XOROUT=0x55
    */
    MPKEdit.crc8 = function(data) {
        var POLY = 0x5A, INIT = 0, XOROUT = 0;
        for(var crc = INIT, i = 0, table = []; i < 256; i++) {
            crc = i;
            for(var j = 0; j < 8; j++) {
                crc = crc & 0x80 ? crc << 1 ^ POLY : crc << 1;
            }
            table[i] = crc & 0xFF;
        }
        return function(data) {
            for(var crc = 0, i = 0; i < data.length; i++) {
                crc = table[data[i] ^ crc & 0xFF] ^ crc << 8;
            }
            return (crc ^ XOROUT) & 0xFF;
        }
    }();

    /* -----------------------------------------------
    function: MPKEdit.elem(options)
      generate a HTMLElement DOM structure from
      supplied array data.
    */
    MPKEdit.elem = function(options) {
        var el = document.createDocumentFragment(),
            tag = options[0], prop = options[1];
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
