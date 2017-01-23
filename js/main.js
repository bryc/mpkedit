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

    MPKEdit.MurmurHash3 = function(data, seed) {
        function mul32(m, n) {
            var nlo = n & 0xffff;
            var nhi = n - nlo;
            return ((nhi * m | 0) + (nlo * m | 0)) | 0;
        }

        var c1 = 0xcc9e2d51;
        var c2 = 0x1b873593;
        var h1 = seed || 0;
        var len = data.length;
        var roundedEnd = len & ~0x3;

        for (var i = 0; i < roundedEnd; i += 4) {
            var k1 = (data[i] & 0xff) |
                ((data[i + 1] & 0xff) << 8) |
                ((data[i + 2] & 0xff) << 16) |
                ((data[i + 3] & 0xff) << 24);

            k1 = mul32(k1, c1);
            k1 = ((k1 & 0x1ffff) << 15) | (k1 >>> 17);
            k1 = mul32(k1, c2);
            h1 ^= k1;
            h1 = ((h1 & 0x7ffff) << 13) | (h1 >>> 19);
            h1 = (h1 * 5 + 0xe6546b64) | 0;
        }

        k1 = 0;

        switch (len % 4) {
            case 3:
                k1 = (data[roundedEnd + 2] & 0xff) << 16;
            case 2:
                k1 |= (data[roundedEnd + 1] & 0xff) << 8;
            case 1:
                k1 |= (data[roundedEnd] & 0xff);
                k1 = mul32(k1, c1);
                k1 = ((k1 & 0x1ffff) << 15) | (k1 >>> 17);
                k1 = mul32(k1, c2);
                h1 ^= k1;
        }

        h1 ^= len;
        h1 ^= h1 >>> 16;
        h1 = mul32(h1, 0x85ebca6b);
        h1 ^= h1 >>> 13;
        h1 = mul32(h1, 0xc2b2ae35);
        h1 ^= h1 >>> 16;

        return h1>>>0;
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
