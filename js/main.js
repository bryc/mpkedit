var MPKEdit = (function MPKEdit() {
    var MPKEdit = {};

    /* -----------------------------------------------
    function: MPKEdit.cyrb32(data)
      checksum algo. this is not final.
    */
    MPKEdit.cyrb32 = function cyrb32(data) {
        var i, tmp, sum = 0x9CB85729, len = data.length;
        for(i = 0; i < len; i++) {
            sum = sum + data[i];
            sum = sum + (sum << ((sum & 7)+1));
        } 
        for(tmp = sum >>> 0; tmp > 0; tmp >>>= 1) {
            if(tmp & 1) sum = sum + (sum << (sum & 7)) + tmp;
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
