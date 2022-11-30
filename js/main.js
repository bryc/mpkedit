const MPKEdit = (function MPKEdit() {
    const MPKEdit = {};

    /* -----------------------------------------------
    function: MPKEdit.SaveAs(data, fname)
      Initiates a download of a given Blob.
    */
    MPKEdit.saveAs = function(data, fname) {
        let a = document.createElement("a"), b = window.URL.createObjectURL(data);
        a.download = fname, a.href = b, a.dispatchEvent(new MouseEvent("click"));
        setTimeout(() => window.URL.revokeObjectURL(b), 1e1);
    };

    /* -----------------------------------------------
    function: MPKEdit.Uint8Concat(arrays)
      Concat Uint8Arrays
    */
    MPKEdit.Uint8Concat = function(...arrs) {
        let offset = 0, totalLength = 0;
        for (let arr of arrs) {
            totalLength += arr.length;
        }
        const result = new Uint8Array(totalLength);
        for (let arr of arrs) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    };

    /* -----------------------------------------------
    function: MPKEdit.cyrb32(data)
      128-bit MurmurHash3.
    */
    MPKEdit.cyrb32 = function(key, seed = 0) {
        function fmix32(h) {
            h ^= h >>> 16; h = Math.imul(h, 2246822507);
            h ^= h >>> 13; h = Math.imul(h, 3266489909);
            h ^= h >>> 16;
            return h;
        }

        let k;
        const p1 = 597399067, p2 = 2869860233, p3 = 951274213, p4 = 2716044179;

        let h1 = seed ^ p1,
            h2 = seed ^ p2,
            h3 = seed ^ p3,
            h4 = seed ^ p4,
            i;
        
        for(i = 0, b = key.length & -16; i < b;) {
            k1 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
            k1 = Math.imul(k1, p1); k1 = k1 << 15 | k1 >>> 17;
            h1 ^= Math.imul(k1, p2); h1 = h1 << 19 | h1 >>> 13; h1 += h2;
            h1 = Math.imul(h1, 5) + 1444728091 | 0; // |0 = prevent float
            i += 4;
            k2 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
            k2 = Math.imul(k2, p2); k2 = k2 << 16 | k2 >>> 16;
            h2 ^= Math.imul(k2, p3); h2 = h2 << 17 | h2 >>> 15; h2 += h3;
            h2 = Math.imul(h2, 5) + 197830471 | 0;
            i += 4;
            k3 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
            k3 = Math.imul(k3, p3); k3 = k3 << 17 | k3 >>> 15;
            h3 ^= Math.imul(k3, p4); h3 = h3 << 15 | h3 >>> 17; h3 += h4;
            h3 = Math.imul(h3, 5) + 2530024501 | 0;
            i += 4;
            k4 = key[i+3] << 24 | key[i+2] << 16 | key[i+1] << 8 | key[i];
            k4 = Math.imul(k4, p4); k4 = k4 << 18 | k4 >>> 14;
            h4 ^= Math.imul(k4, p1); h4 = h4 << 13 | h4 >>> 19; h4 += h1;
            h4 = Math.imul(h4, 5) + 850148119 | 0;
            i += 4;
        }

        k1 = 0, k2 = 0, k3 = 0, k4 = 0;
        switch (key.length & 15) {
            case 15: k4 ^= key[i+14] << 16;
            case 14: k4 ^= key[i+13] << 8;
            case 13: k4 ^= key[i+12];
                     k4 = Math.imul(k4, p4); k4 = k4 << 18 | k4 >>> 14;
                     h4 ^= Math.imul(k4, p1);
            case 12: k3 ^= key[i+11] << 24;
            case 11: k3 ^= key[i+10] << 16;
            case 10: k3 ^= key[i+9] << 8;
            case  9: k3 ^= key[i+8];
                     k3 = Math.imul(k3, p3); k3 = k3 << 17 | k3 >>> 15;
                     h3 ^= Math.imul(k3, p4);
            case  8: k2 ^= key[i+7] << 24;
            case  7: k2 ^= key[i+6] << 16;
            case  6: k2 ^= key[i+5] << 8;
            case  5: k2 ^= key[i+4];
                     k2 = Math.imul(k2, p2); k2 = k2 << 16 | k2 >>> 16;
                     h2 ^= Math.imul(k2, p3);
            case  4: k1 ^= key[i+3] << 24;
            case  3: k1 ^= key[i+2] << 16;
            case  2: k1 ^= key[i+1] << 8;
            case  1: k1 ^= key[i];
                     k1 = Math.imul(k1, p1); k1 = k1 << 15 | k1 >>> 17;
                     h1 ^= Math.imul(k1, p2);
        }

        h1 ^= key.length; h2 ^= key.length; h3 ^= key.length; h4 ^= key.length;

        h1 += h2; h1 += h3; h1 += h4;
        h2 += h1; h3 += h1; h4 += h1;

        h1 = fmix32(h1);
        h2 = fmix32(h2);
        h3 = fmix32(h3);
        h4 = fmix32(h4);

        h1 += h2; h1 += h3; h1 += h4;
        h2 += h1; h3 += h1; h4 += h1;

        return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
    };
    /* -----------------------------------------------
    function: MPKEdit.elem(options)
      generate a HTMLElement DOM structure from
      supplied array data.
    */
    MPKEdit.elem = function(options) {
        let el = document.createDocumentFragment();
        const tag = options[0], prop = options[1];
        
        if(typeof tag === "string") el = document.createElement(tag);
        
        if(typeof prop === "object")
            for(let item in prop) el[item] = prop[item];
        else if(prop) el.innerHTML = prop;
        
        for(let i = 1; i < arguments.length; i++)
            if(arguments[i].nodeType > 0) el.appendChild(arguments[i]);
        
        return el;
    };

    console.log("INFO: MPKEdit ready");
    return MPKEdit;
}());
