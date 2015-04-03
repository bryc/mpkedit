function MemPak () {}

// Initialises an empty MPK file
MemPak.prototype.init = function()
{
    function A(a) {for(i=0;i<7;++i) {data[a+i]=[1,1,0,1,1,254,241][i];}}
    var i, data = new Uint8Array(32768);
    
    A(57);A(121);A(153);A(217);
    
    for(i=4;i<128;++i) {data[256+i*2+1]=3;data[512+i*2+1]=3;}
    data[257]=113;data[513]=113;

    this.data = data;
}

var MORON = new MemPak();

    
MORON.init();
console.log(MORON);
