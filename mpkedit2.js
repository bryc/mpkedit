// TODO: Look at Patchedit's fileHandler function, see if it is suitable

var MPKEdit = (function MPKEdit() {

	function MPKEdit() {}
	MPKEdit.prototype.elem = function elem(d) {
		console.log(new Date());
	};

    return new MPKEdit();
}());

(function MPKParser(MPKEdit) {
	function resize(b){for(var c=new Uint8Array(32768),a=0;a<b.length;a++)c[a]=b[a];return c};
	function arrstr(b,a,c){b=b||[];c=c||b.length;var d="";for(a=a||0;a<c;a++)d+=String.fromCharCode(b[a]);return d};
	var n64code = {0:"",15:" ",16:"0",17:"1",18:"2",19:"3",20:"4",21:"5",22:"6",23:"7",24:"8",25:"9",26:"A",27:"B",28:"C",29:"D",30:"E",31:"F",32:"G",33:"H",34:"I",35:"J",36:"K",37:"L",38:"M",39:"N",40:"O",41:"P",42:"Q",43:"R",44:"S",45:"T",46:"U",47:"V",48:"W",49:"X",50:"Y",51:"Z",52:"!",53:'"',54:"#",55:"'",56:"*",57:"+",58:",",59:"-",60:".",61:"/",62:":",63:"=",64:"?",65:"@",66:"。",67:"゛",68:"゜",69:"ァ",70:"ィ",71:"ゥ",72:"ェ",73:"ォ",74:"ッ",75:"ャ",76:"ュ",77:"ョ",78:"ヲ",79:"ン",80:"ア",81:"イ",82:"ウ",83:"エ",84:"オ",85:"カ",86:"キ",87:"ク",88:"ケ",89:"コ",90:"サ",91:"シ",92:"ス",93:"セ",94:"ソ",95:"タ",96:"チ",97:"ツ",98:"テ",99:"ト",100:"ナ",101:"ニ",102:"ヌ",103:"ネ",104:"ノ",105:"ハ",106:"ヒ",107:"フ",108:"ヘ",109:"ホ",110:"マ",111:"ミ",112:"ム",113:"メ",114:"モ",115:"ヤ",116:"ユ",117:"ヨ",118:"ラ",119:"リ",120:"ル",121:"レ",122:"ロ",123:"ワ",124:"ガ",125:"ギ",126:"グ",127:"ゲ",128:"ゴ",129:"ザ",130:"ジ",131:"ズ",132:"ゼ",133:"ゾ",134:"ダ",135:"ヂ",136:"ヅ",137:"デ",138:"ド",139:"バ",140:"ビ",141:"ブ",142:"ベ",143:"ボ",144:"パ",145:"ピ",146:"プ",147:"ペ",148:"ポ"};
	
	function isNote(a){var b=51966===a[7]+(a[6]<<8);a=0===a.subarray(32).length%256;return b&&a}
	function sumIsValid(a,b){var d=0,c,f=(a[b+28]<<8)+a[b+29],e=(a[b+30]<<8)+a[b+31];if(0===(a[b+25]&1)||0===(a[b+26]&1))return!1;for(c=0;28>c;c+=2)d+=(a[b+c]<<8)+a[b+c+1],d&=65535;c=65522-d;f===d&&(e^12)===c&&(e^=12,a[b+31]^=12);return f===d&&e===c}
	function checkHeader(d){for(var a=[32,96,128,192],e=-1,c=0,b;c<a.length;c++)(b=sumIsValid(d,a[c]))&&(e=a[c]);for(c=0;c<a.length;c++){var f=a[c];b=sumIsValid(d,f);if(-1<e&&!1===b){for(b=0;32>b;b++)d[f+b]=d[e+b];b=sumIsValid(d,f)}a[c]=b}return a[0]&&a[1]&&a[2]&&a[3]};
	
	var NoteKeys, result = {};
	function checkNotes(b){var f={},c=[];NoteKeys=[];for(var a=768;1280>a;a+=32){var e=b[a+7],d=5<=e&&127>=e&&0===b[a+6];if(d)for(d=0;32>d;d++)c.push(b[a+d])}for(a=768;1280>a;a++)b[a]=c[a-768];for(a=768;1280>a;a+=32)if(e=b[a+7],d=5<=e&&127>=e&&0===b[a+6]){NoteKeys.push(e);0===(b[a+8]&2)&&(b[a+8]|=2);d=0;for(c="";16>d;d++)c+=n64code[b[a+16+d]]||"";0!==b[a+12]&&(c+=".",c+=n64code[b[a+12]]||"",c+=n64code[b[a+13]]||"",c+=n64code[b[a+14]]||"",c+=n64code[b[a+15]]||"");f[(a-768)/32]={indexes:e,serial:arrstr(b,a,a+4).replace(/\0/g,"-"),publisher:arrstr(b,a+4,a+6).replace(/\0/g,"-"),noteName:c}}return f};
	function checkIndexes(e,d){try{for(var b,f,g=0,c=[],h=[],m=[],a=d+10;a<d+256;a+=2)if(b=e[a+1],f=e[a],0===f&&1===b||5<=b&&127>=b&&3!==b){1===b&&(g+=1);if(1!==b&&-1<m.indexOf(b))throw"IndexTable contains duplicate index (p="+b+").";m.push(b);h.push((a-d)/2)}else if(0!==f||1!==b&&3!==b&&5>b||127<b)throw"IndexTable contains illegal value(p="+b+", "+f+").";var k=h.filter(function(a){return-1===m.indexOf(a)}),l=NoteKeys.length,n=k.length;if(l!==n||l!==g)throw"Key index totals do not match ("+l+", "+n+", "+g+")";for(a=0;a<l;a++)if(-1===NoteKeys.indexOf(k[a]))throw"A key index doesn't exist in the note table ("+k[a]+")";f={};for(a=0;a<n;a++)for(g=[],b=k[a];1===b||5<=b&&127>=b;){if(1===b){f[k[a]]=g;break}g.push(b);c.push(b);b=e[2*b+d+1]}if(c.length!==h.length)throw"Number of parsed keys doesn't match found keys. ("+c.length+", "+h.length+")";for(a=0;a<c.length;a++)if(-1===c.indexOf(h[a]))throw"A key doesn't exist in the parsed keys. ("+h[a];a=d+10;for(c=0;a<d+256;a++)c+=e[a];c&=255;e[d+1]!==c&&(e[d+1]=c);b=256===d?512:256;for(a=0;256>a;a++)e[b+a]=e[d+a];return f}catch(p){if(512!==d)return checkIndexes(e,512)}};
	function parse(a){a=new Uint8Array(a);"123-456-STD"===arrstr(a,0,11)&&(a=a.subarray(4160));if(!a||!1===checkHeader(a))return!1;var b=checkNotes(a),f=checkIndexes(a,256);if(f){for(var c=0,g=0,d=0;d<Object.keys(b).length;d++){var e=b[Object.keys(b)[d]];e.indexes=f[e.indexes];c+=e.indexes.length;g++}result.NoteTable=b;result.usedPages=c;result.usedNotes=g;result.data=a;return!0}return!1};
	console.log("INFO: MPKEdit.Parser initialised");

    MPKEdit.Parser = function(data, filename) {

    	console.log(this.elem)
		if(this.State.data && isNote(data)) {
			this.State.import(data);
		} else if(parse(data)) {
			this.State.data = result.data !== 32768 ? resize(result.data) : result.data;
			this.State.NoteTable = result.NoteTable;
			this.State.usedNotes = result.usedNotes;
			this.State.usedPages = result.usedPages;
			this.State.filename = filename || this.State.filename;
			console.log(this.State);
		} else {
			console.warn("ERROR: Data invalid: " + filename, this.State.$ || '');
		}
    };
    
}(MPKEdit));

(function MPKState(MPKEdit) {
	function MPKState() {}
	MPKState.prototype.import = function importNote(d){var e=new Uint8Array(this.data),f=d.subarray(0,32);d=d.subarray(32);var b=d.length/256;if(123>=this.usedPages+b&&16>this.usedNotes){for(var c=[],a=10;256>a&&c.length!==b;a+=2)3===e[256+a+1]&&c.push(a/2);f[6]=0;f[7]=c[0];for(a=0;a<c.length;a++){var g=256*c[a];e[256+(2*c[a]+1)]=a===c.length-1?1:c[a+1];for(b=0;256>b;b++)e[g+b]=d[256*a+b]}for(a=0;16>a;a++)if(void 0===this.NoteTable[a]){d=768+32*a;for(b=0;32>b;b++)e[d+b]=f[b];break}MPKEdit.Parser(e)}};

    MPKEdit.State = new MPKState();
	console.log("INFO: MPKEdit.State initialised");
}(MPKEdit));


window.ondragover=function(){return false}

window.ondrop = function(e) {
	var files = e.dataTransfer.files;

	for(var i = 0; i < files.length; i++) {
		var reader = new FileReader();
		reader.filename = files[i].name;
		reader.onload = function(e) {
			MPKEdit.Parser(new Uint8Array(e.target.result), e.target.filename);
		};
		reader.readAsArrayBuffer(files[i].slice(0,36928));
	}

	return false;
}
