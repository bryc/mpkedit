window.addEventListener("load", function()
{
var n64code = {
    0:  "", // null character
    3:  "",  // found in incorrect emulated files
    15: " ",
    16: "0",
    17: "1",
    18: "2",
    19: "3",
    20: "4",
    21: "5",
    22: "6",
    23: "7",
    24: "8",
    25: "9",
    26: "A",
    27: "B",
    28: "C",
    29: "D",
    30: "E",
    31: "F",
    32: "G",
    33: "H",
    34: "I",
    35: "J",
    36: "K",
    37: "L",
    38: "M",
    39: "N",
    40: "O",
    41: "P",
    42: "Q",
    43: "R",
    44: "S",
    45: "T",
    46: "U",
    47: "V",
    48: "W",
    49: "X",
    50: "Y",
    51: "Z",
    52: "!",
    53: '"',
    54: "#",
    55: "'",
    56: "*",
    57: "+",
    58: ",",
    59: "-",
    60: ".",
    61: "/",
    62: ":",
    63: "=",
    64: "?",
    65: "@",
    66: "。",
    67: "゛",
    68: "゜",
    69: "ァ",
    70: "ィ",
    71: "ゥ",
    72: "ェ",
    73: "ォ",
    74: "ッ",
    75: "ャ",
    76: "ュ",
    77: "ョ",
    78: "ヲ",
    79: "ン",
    80: "ア",
    81: "イ",
    82: "ウ",
    83: "エ",
    84: "オ",
    85: "カ",
    86: "キ",
    87: "ク",
    88: "ケ",
    89: "コ",
    90: "サ",
    91: "シ",
    92: "ス",
    93: "セ",
    94: "ソ",
    95: "タ",
    96: "チ",
    97: "ツ",
    98: "テ",
    99: "ト",
    100: "ナ",
    101: "ニ",
    102: "ヌ",
    103: "ネ",
    104: "ノ",
    105: "ハ",
    106: "ヒ",
    107: "フ",
    108: "ヘ",
    109: "ホ",
    110: "マ",
    111: "ミ",
    112: "ム",
    113: "メ",
    114: "モ",
    115: "ヤ",
    116: "ユ",
    117: "ヨ",
    118: "ラ",
    119: "リ",
    120: "ル",
    121: "レ",
    122: "ロ",
    123: "ワ",
    124: "ガ",
    125: "ギ",
    126: "グ",
    127: "ゲ",
    128: "ゴ",
    129: "ザ",
    130: "ジ",
    131: "ズ",
    132: "ゼ",
    133: "ゾ",
    134: "ダ",
    135: "ヂ",
    136: "ヅ",
    137: "デ",
    138: "ド",
    139: "バ",
    140: "ビ",
    141: "ブ",
    142: "ベ",
    143: "ボ",
    144: "パ",
    145: "ピ",
    146: "プ",
    147: "ペ",
    148: "ポ"
};
    function MemPak()
    {
        var ref = this;

        function isIDValid(ind)
        {
            /* sum1, sum2: get stored checksums */
            var sum1 = (ref.data[ind + 28] << 8) + ref.data[ind + 29],
                sum2 = (ref.data[ind + 30] << 8) + ref.data[ind + 31];
                
            /* calculate new checksum */
            for(var i = 0, sum = 0; i < 28; i += 2, sum &= 0xFFFF) {
                sum += (ref.data[ind + i] << 8) + ref.data[ind + i + 1];
            }
            /* dexdrive header repair */
            if((sum == sum1) && ((0xFFF2 - sum) != sum2) && ((0xFFF2 - sum) == sum2 ^ 0x0C)) {
                ref.data[ind + 31] ^= 0x0C;
                sum2 = (ref.data[ind + 30] << 8) + ref.data[ind + 31];
            }
                return ((sum == sum1) && ((0xFFF2 - sum) == sum2));
        }

        function readNotes(e)
        {
            var notes = [];
            var usedNotes = 0;
           
            for(var i = 0x300, u = 0; i < 0x500; i+=32, u++)
            {
                var inode = ref.data[i+7];
                var b1 = ref.data[i + 0x0A];
                var b2 = ref.data[i + 0x0B];
                var b3 = ref.data[i + 6];
                var b4 = ref.data[i + 8] & 0x02;
                 var data = [];
                
                if(
                (inode >= 5 && inode <= 127 && b1 === 0x00 &&
                b2 === 0x00 && b3 === 0x00) && 
                ref.inodes.files[inode] !== undefined
                )
                {
                    usedNotes++;
                    var name   = "";
                    
                    var game_id = String.fromCharCode(ref.data[i + 0], ref.data[i + 1], ref.data[i + 2]);
                    var region  = String.fromCharCode(ref.data[i + 3]);
                    var vendor  = String.fromCharCode(ref.data[i + 4], ref.data[i + 5]);
                    
                    var k;
                    for(var inode2 in ref.inodes.files[inode])
                    {
                        var dataOffset = 256 * ref.inodes.files[inode][inode2];
                        for(k = 0; k < 256; k++)
                        {
                            data.push(ref.data[dataOffset + k]);
                        }
                    }
                    
                    for(k = 0; k < 16; k++)
                    {
                        name += n64code[ ref.data[i + 16 + k] ];
                    }
                    if(ref.data[i + 12] !== 0)
                    {
                        name += "." + n64code[ref.data[i + 12]];
                    }
                    console.log(name, game_id, region, vendor, data.length, e);
                    notes.push({
                        name : name,
                        offset: i,
                        game_id : game_id,
                        region : region,
                        vendor : vendor,
                        data : data,
                        size : data.length,
                        inodes : ref.inodes.files
                    });
                    
                }
                 ref.notes = notes;
            }
            ref.inodes.validNotes = (usedNotes === ref.inodes.notes);
        }
        
        function readInodes(o)
        {
            var usedPages = 0, inodes = {}, keyNodes = {}, errors = 0,
                dupeData = 0, cksm1 = 0, cksm2 = 0;
            
            for(var i = o; i < o + 0x100; i++)
            {
                if(o == 0x100 && ref.data[i] === ref.data[i + 0x100]) {
                    dupeData++;
                } else if(o == 0x200 && ref.data[i] === ref.data[i - 0x100]) {
                    dupeData++;
                }
                if(i >= o + 0xA) {
                    cksm1 += ref.data[i];
                    cksm2 += ref.data[i + o];
                }
                if(i >= o + 0xA && i % 2 == 0)
                {
                    var a = (i-o)/2, p = ref.data[i+1];
                    if (((p>=0x05&&p<=0x7F) || p==0x01 || p==0x03) == false) {
                        errors++; // Invalid INODE value
                    } else if(((p>=0x05&&p<=0x7F) || p==0x01) && p !== 3)
                    {
                        inodes[a]   = p;
                        keyNodes[a] = p;
                        usedPages++;
                    }
                }
            }
            
            for(key in inodes) {
                delete keyNodes[inodes[key]];
            }
            
            var foundFiles = {};
            var pgCnt = 0;
            for(key in keyNodes)
            {
                var ptr = keyNodes[key], y = 0, z = [+key],
                    foundEnd = false;
                
                while(((ptr>=0x05&&ptr<=0x7F)||ptr==0x01) && y <= usedPages) {
                    if(z.indexOf(ptr) !== -1) { //Infinite loop
                        errors++; break;
                    }
                    if(ptr == 1) {foundEnd = true; break;}
                    z.push(ptr);
                    ptr = inodes[ptr];
                    y++;
                }
                
                if(foundEnd == true) {
                    foundFiles[key] = z;
                    pgCnt += foundFiles[key].length;
                }
                else {
                   errors++; //Terminator not found
                }
            }
            
            this.inodes = {
                validPgs : usedPages === pgCnt && errors === 0,
                used     : usedPages,
                same     : (dupeData == 256),
                validChk : (ref.data[o + 1] == (cksm1 & 0xFF) && cksm1 >= 335),
                files    : foundFiles,
                notes    : Object.keys(foundFiles).length
            };
        }
        
        this.readInodes = readInodes;
        this.validID    = isIDValid;
        this.readNotes  = readNotes;
    }

    function DragHandler()
    {
        var isFile = false;
        
        function dragIsFile(types) {
            for(var i = 0; i < types.length; i++) {
                if(types[i] === "Files") {
                    return true;
                }
            }
            return false;
        }
        
        window.addEventListener("dragenter", function(e) {
            isFile = dragIsFile(e.dataTransfer.types);
        });
        
        window.addEventListener("dragover", function(e) {
            e.preventDefault();
            if(isFile === false) {
                e.dataTransfer.dropEffect = "none";
            }
        });
        
        window.addEventListener("drop", function(e)
        {
            e.preventDefault();
            var y = e.dataTransfer.files.length;
            for(var q = 0; q < y; q++)
            { 
                var file = e.dataTransfer.files[q],
                    f    = new FileReader();
                    f.fname = file.name;
                f.onload = function(e)
                {
                    var dat = new Uint8Array(e.target.result);
                    for (var i = 0, dex = ""; i < 11; i++) {
                        dex += String.fromCharCode(dat[i]);
                    }
                    if (dex === "123-456-STD") {
                        dat = dat.subarray(0x1040);
                    }
                    mpk.data = new Uint8Array(32768);
                    for(i = 0; i < 32768; i++) {
                        mpk.data[i] = dat[i];
                    }
                    
                    if(mpk.validID(0x20))
                    {
                        mpk.readInodes(0x100);
                        mpk.readNotes(e.target.fname);
                    } else {
                        console.log("INVALID FILE");
                    }
                }
                f.readAsArrayBuffer(file.slice(0, 36928));
            }
        });
    }
    
    var mpk = new MemPak();
    var drg = new DragHandler();
    
    window.mpk = mpk;
});
