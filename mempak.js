var code64 = {
    0: "",
    3: "",
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

var mp   = {}, file = {};

function extract(noteID)
{
    var A = document.createElement('a');
    A.download = file.name + "_" + noteID + "_out.bin";
    A.href = "data:application/octet-stream;base64," +
             btoa(String.fromCharCode.apply(null, mp.notes[noteID].data));
    A.dispatchEvent(new MouseEvent('click'));
}

function extractMPK()
{
    var A = document.createElement('a');
    A.download = file.name + "_" + "full" + "_out.mpk";
    A.href = "data:application/octet-stream;base64," +
             btoa(String.fromCharCode.apply(null, mp.data));
    A.dispatchEvent(new MouseEvent('click'));
}

function deleteNote(noteID)
{
    var noteOffset  = 0x300 + (32 * noteID);
    var inodes = mp.notes[noteID].inodes;
    console.log(inodes);
    
    for (var i = 0; i < inodes.length; i++)
    {
        var inodeOffset = 0x100 + (2 * inodes[i] + 1);
        mp.data[inodeOffset] = 0x03;
        console.log(inodeOffset, mp.data[inodeOffset]);
    }
    mp.data[noteOffset + 7] = 0x00;
    console.log(mp.data[noteOffset + 7]);
    
    for(i = 0x100, chk = 0; i < 0x200; i++, chk &= 0xFF)
    {
        if(i >= 0x10A) { chk += mp.data[i]; }
    }
    mp.data[0x100 + 1] = chk;
}

function checkID(offset)
{
    var sum1 = (mp.data[offset + 28] << 8) + mp.data[offset + 29];
    var sum2 = (mp.data[offset + 30] << 8) + mp.data[offset + 31];
    for(var i = 0, sum = 0; i < 28; i += 2, sum &= 0xFFFF)
    {
        sum += (mp.data[offset + i] << 8) + mp.data[offset + i + 1];
    }
    
    if((sum == sum1) && ((0xFFF2 - sum) != sum2) && ((0xFFF2 - sum) == sum2 ^ 0x0C))
    {
        mp.data[offset + 31] ^= 0x0C;
        sum2 = (mp.data[offset + 30] << 8) + mp.data[offset + 31];
    }
        return ((sum == sum1) && ((0xFFF2 - sum) == sum2));
}

function readMemPak()
{
    console.clear();
    console.log("%cReading file: " + file.name, "font:900 14px verdana");
    
    mp.notes     = [];
    mp.inodes    = [];
    mp.freePages = 0;
    mp.usedNotes = 0;
    
    var checkHeader = checkID(0x20);
    var ch0 = checkID(0x60);
    var ch1 = checkID(0x80);
    var ch2 = checkID(0xC0);
    
    if (checkHeader === false) {
        console.log("Not a valid Controller Pak file.");
        return false;
    } else {
        console.log("Header checksum valid  : ", checkHeader);
        console.log("Other header checksums : ", ch0, ch1, ch2);
    }
    
    for(var i = 0x100, chk = 0, chk2 = 0, cnt = 0; i < 0x200; i++)
    {
        if(mp.data[i] === mp.data[i + 0x100]) { cnt++; }
        if(i >= 0x10A) { chk += mp.data[i]; }
        if(i >= 0x10A) { chk2 += mp.data[i + 0x100]; }
        if(i >= 0x10A && mp.data[i] === 0x03) { mp.freePages++; }
        if((i & 0x01) === 1) { mp.inodes.push(mp.data[i]); }
    }
    mp.usedPages = (123 - mp.freePages);
    mp.inodeIsIdentical = (cnt === 256);
    
    mp.inodeChecksumCorrect  = (mp.data[0x101] === (chk  & 0xFF)) && chk  !== 0;
    mp.inodeChecksumCorrect2 = (mp.data[0x201] === (chk2 & 0xFF)) && chk2 !== 0;
    
    console.log("Inode tables identical : ", mp.inodeIsIdentical);
    console.log("Inode checksum correct : ", mp.inodeChecksumCorrect);
    console.log("Inode checksum2 correct: ", mp.inodeChecksumCorrect2);
    console.log("Number of used pages   : ", mp.usedPages);
    console.log("Number of free pages   : ", mp.freePages,"\n");
  
  if((mp.inodeIsIdentical && mp.inodeChecksumCorrect && mp.inodeChecksumCorrect2 ) === false)
    {
      console.warn("Warning: Problems found with INODE data. It may be corrupt or invalid.","\n-----\n\n\n");
    }
    
    for(i = 0x300, j = 0; i < 0x500; i += 32, j++)
    {
        var b = mp.data[i + 7];
        var b1 = mp.data[i + 0x0A];
        var b2 = mp.data[i + 0x0B];
        var b3 = mp.data[i + 6];
        var b4 = mp.data[i + 8] & 0x02;
        
        if(b >= 5 && b <= 127 && b1 === 0x00 && b2 === 0x00 && b3 === 0x00)
        {
            mp.usedNotes++;
            
            var gameNote    = {};
            gameNote.inodes = [b];
            gameNote.pages  = 1;
            gameNote.data   = [];
            gameNote.name   = "";
            
            gameNote.game_id = String.fromCharCode(mp.data[i + 0], mp.data[i + 1], mp.data[i + 2]);
            gameNote.region  = String.fromCharCode(mp.data[i + 3]);
            gameNote.vendor  = String.fromCharCode(mp.data[i + 4], mp.data[i + 5]);
            
            var nextInode = mp.inodes[b];
            while(nextInode >= 5 && nextInode <= 127)
            {
                if(gameNote.inodes.indexOf(nextInode) > -1 ){break;}
                gameNote.inodes.push(nextInode);
                nextInode = mp.inodes[nextInode];
                gameNote.pages++;
            }
            var k;
            for(var inode in gameNote.inodes)
            {
                var dataOffset = 256 * gameNote.inodes[inode];
                for(k = 0; k < 256; k++)
                {
                    gameNote.data.push(mp.data[dataOffset + k]);
                }
            }
            
            for(k = 0; k < 16; k++)
            {
                gameNote.name += code64[ mp.data[i + 16 + k] ];
            }
            if(mp.data[i + 12] !== 0)
            {
                gameNote.name += "." + code64[ mp.data[i + 12] ];
            }
            
            console.log(
                j, gameNote.name, gameNote.game_id + gameNote.region, gameNote.vendor,
                "Pages: " + gameNote.pages + " (" + gameNote.data.length + " bytes)"
                );
            console.log("\t" + gameNote.inodes + "\n");
                
            mp.notes.push(gameNote);
        }
    }
    
    mp.freeNotes = (16 - mp.usedNotes);
    console.log("Number of used notes   : ", mp.usedNotes);
    console.log("Number of free notes   : ", mp.freeNotes);
}

document.ondragover = function() {return false;};

document.ondrop = function (e)
{
    var filez = e.dataTransfer.files[0];
    var f = new FileReader();
    f.filez = filez;
    f.readAsArrayBuffer( filez.slice(0, 36928) );
    f.onload = function (evt)
    {
        var _data = new Uint8Array(evt.target.result);
        
        for (var i = 0, dex = ""; i < 0x0B; i++)
        {
            dex += String.fromCharCode( _data[i] );
        }
        if (dex === "123-456-STD")
        {
            _data = _data.subarray(0x1040);
        }
        mp.data = new Uint8Array(32768);
        for(i = 0; i < 32768; i++)
        {
            mp.data[i] = _data[i];
        }
        file.name = evt.target.filez.name;
        readMemPak();
    };
    return false;
};
