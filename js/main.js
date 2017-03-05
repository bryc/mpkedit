var MPKEdit = (function MPKEdit() {
    var MPKEdit = {};

    /* -----------------------------------------------
    function: MPKEdit.cyrb32(data)
      checksum algo. this is not final.
    */
    MPKEdit.cyrb32 = function cyrb32(data) {
        var len = data.length;
        var sum = 0xcadb07c5;
        for(var i = 0; i < len; i++) {
            sum += (sum << 1) + data[i];
        }
        var tmp = sum >>> 0;
        while(tmp > 0) {
            if(tmp & 1) {
                sum += tmp;
                sum ^= sum << 1;
            }
            tmp >>= 1;
        }
        return sum >>> 0;
    };

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
