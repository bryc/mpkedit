window.addEventListener("load", function()
{
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
        
        function checkInode()
        {
            var dupeData  = 0,
                cksm1     = 0,
                cksm2     = 0,
                freePages = 0;
                
            for(var i = 0x100; i < 0x200; i++)
            {
                if(ref.data[i] === ref.data[i + 0x100]) {
                    dupeData++;
                }
                if(i >= 0x10A) {
                    cksm1 += ref.data[i];
                    cksm2 += ref.data[i + 0x100];
                }
                if(i >= 0x10A && ref.data[i] === 0x03) {
                    freePages++;
                }
            }
            return {
                inodeSame: (dupeData == 256),
                chkValid1: (ref.data[0x101] == (cksm1 & 0xFF) && cksm1 >= 335),
                chkValid2: (ref.data[0x201] == (cksm2 & 0xFF) && cksm2 >= 335),
                freePages: freePages,
                usedPages: (123 - freePages)
            };
        }
        
        this.validID    = isIDValid;
        this.checkInode = checkInode;
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
                    
                    if((mpk.validID(0x20) && mpk.checkInode().chkValid1 && mpk.checkInode().inodeSame))
                    {
                        console.log(e.target.fname, true);
                    }
                }
                f.readAsArrayBuffer(file.slice(0, 36928));
            }
        });
    }
    
    var mpk = new MemPak();
    var drg = new DragHandler();
});
