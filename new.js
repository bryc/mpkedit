(function () {
/* ---- */
function MemPak()
{
    function init()
    {
        var i, data = new Uint8Array(32768);
        function A(a) {for(i=0;i<7;++i) {data[a+i]=[1,1,0,1,1,254,241][i];}}
        A(57);A(121);A(153);A(217);
        for(i=4;i<128;i++) {data[256+i*2+1]=3;data[512+i*2+1]=3;}
        data[257]=113;data[513]=113;
        ref.data = data;
        ref.filename = "MemPak.mpk";
    }
function parse(data)
{
    var i,p,p2,a,b,c,output,noteKeys=[];

    function checkIndexes(o)
    {
        var seq,ends=0,Output={},found={keys:[],values:[],parsed:[]};
        for(i = o + 0xA; i < o + 0x100; i += 2)
        {
            p  = data[i + 1]; p2 = data[i];

            if(p2 !== 0 || p !== 1 && p !== 3 && p < 5 || p > 127)   
            {
                return false;
            }
            else if(p2 === 0 && p === 1 || p !== 3 && p >= 5 && p <= 127)
            {
                if(p === 1) {ends += 1;}

                if(p !== 1 && found.values.indexOf(p) > -1) {
                    return false;
                }
                found.values.push(p);
                found.keys.push((i - o) / 2);
            }
        }
        found.indexes = found.keys.filter(function(n)
        {
            return found.values.indexOf(n) === -1;
        });

        if (noteKeys.length !== ends || noteKeys.length !== found.indexes.length) {
            return false;
        }
        for (i = 0; i < noteKeys.length; i++) {
            if (noteKeys.indexOf(found.indexes[i]) === -1) {
                return false;
            }
        }

        for(i = 0; i < found.indexes.length; i++)
        {
            seq = []; p = found.indexes[i];
            while(p === 1 || p >= 5 && p <= 127)
            {
                if(p === 1)
                {
                    Output[found.indexes[i]] = seq;
                    break;
                }
                seq.push(p);
                found.parsed.push(p);
                p = data[(p * 2) + o + 1];
            }
        }
        if (found.parsed.length !== found.keys.length) {
            return false;
        }
        for (i = 0; i < found.parsed.length; i++) {
            if (found.parsed.indexOf(found.keys[i]) === -1) {
                return false;
            }
        }
        return Output;
    }

    for(i = 0x300; i < 0x500; i += 32)
    {
        p = data[i + 0x07]; a = data[i + 0x06];
        b = data[i + 0x0A]; c = data[i + 0x0B];

        if(p>=5 && p<=127 && a===0 && b===0 && c===0)
        {
            noteKeys.push(p);  
        }
    }

    output = checkIndexes(0x100) || checkIndexes(0x200);
    return output;
}


    var ref   = this;
    ref.init  = init;
    ref.parse = parse; 
};
 
var T = new MemPak();
//T.init(); 
//T.parse();
//console.log(T); 

////////////////////////////////////////////////////////////
window.addEventListener("drop", function(event)
{
    var i, files = event.dataTransfer.files, reader;
    
    for(i = 0; i < files.length; i++)
    {
        reader        = new FileReader();
        reader.name   = files[i].name;
        reader.onload = function(event)
        {
            var data = new Uint8Array(event.target.result);
            if(String.fromCharCode.apply(null, data.subarray(0, 11)) === "123-456-STD") {
                data = data.subarray(0x1040);
            }
            var parsedData = T.parse(data);
            if(parsedData) { console.log(parsedData, event.target.name) } else { console.error("Invalid file: ", event.target.name); }
            //console.log(T.MemPak);
        };
        reader.readAsArrayBuffer(files[i].slice(0, 36928));
    }
    event.preventDefault();
});
window.addEventListener("dragover",function(event){event.preventDefault();});
/* ---- */
}());
