/* 6502 assembler for the C64 Lab: assemble(src) -> {blocks:[{a,b}], labels}. */
var OPS={ADC:{imm:0x69,zp:0x65,zpx:0x75,abs:0x6D,abx:0x7D,aby:0x79,inx:0x61,iny:0x71},AND:{imm:0x29,zp:0x25,zpx:0x35,abs:0x2D,abx:0x3D,aby:0x39,inx:0x21,iny:0x31},
ASL:{acc:0x0A,zp:0x06,zpx:0x16,abs:0x0E,abx:0x1E},BCC:{rel:0x90},BCS:{rel:0xB0},BEQ:{rel:0xF0},BIT:{zp:0x24,abs:0x2C},BMI:{rel:0x30},BNE:{rel:0xD0},BPL:{rel:0x10},BRK:{imp:0x00},BVC:{rel:0x50},BVS:{rel:0x70},
CLC:{imp:0x18},CLD:{imp:0xD8},CLI:{imp:0x58},CLV:{imp:0xB8},CMP:{imm:0xC9,zp:0xC5,zpx:0xD5,abs:0xCD,abx:0xDD,aby:0xD9,inx:0xC1,iny:0xD1},CPX:{imm:0xE0,zp:0xE4,abs:0xEC},CPY:{imm:0xC0,zp:0xC4,abs:0xCC},
DEC:{zp:0xC6,zpx:0xD6,abs:0xCE,abx:0xDE},DEX:{imp:0xCA},DEY:{imp:0x88},EOR:{imm:0x49,zp:0x45,zpx:0x55,abs:0x4D,abx:0x5D,aby:0x59,inx:0x41,iny:0x51},
INC:{zp:0xE6,zpx:0xF6,abs:0xEE,abx:0xFE},INX:{imp:0xE8},INY:{imp:0xC8},JMP:{abs:0x4C,ind:0x6C},JSR:{abs:0x20},
LDA:{imm:0xA9,zp:0xA5,zpx:0xB5,abs:0xAD,abx:0xBD,aby:0xB9,inx:0xA1,iny:0xB1},LDX:{imm:0xA2,zp:0xA6,zpy:0xB6,abs:0xAE,aby:0xBE},LDY:{imm:0xA0,zp:0xA4,zpx:0xB4,abs:0xAC,abx:0xBC},
LSR:{acc:0x4A,zp:0x46,zpx:0x56,abs:0x4E,abx:0x5E},NOP:{imp:0xEA},ORA:{imm:0x09,zp:0x05,zpx:0x15,abs:0x0D,abx:0x1D,aby:0x19,inx:0x01,iny:0x11},
PHA:{imp:0x48},PHP:{imp:0x08},PLA:{imp:0x68},PLP:{imp:0x28},ROL:{acc:0x2A,zp:0x26,zpx:0x36,abs:0x2E,abx:0x3E},ROR:{acc:0x6A,zp:0x66,zpx:0x76,abs:0x6E,abx:0x7E},
RTI:{imp:0x40},RTS:{imp:0x60},SBC:{imm:0xE9,zp:0xE5,zpx:0xF5,abs:0xED,abx:0xFD,aby:0xF9,inx:0xE1,iny:0xF1},SEC:{imp:0x38},SED:{imp:0xF8},SEI:{imp:0x78},
STA:{zp:0x85,zpx:0x95,abs:0x8D,abx:0x9D,aby:0x99,inx:0x81,iny:0x91},STX:{zp:0x86,zpy:0x96,abs:0x8E},STY:{zp:0x84,zpx:0x94,abs:0x8C},
TAX:{imp:0xAA},TAY:{imp:0xA8},TSX:{imp:0xBA},TXA:{imp:0x8A},TXS:{imp:0x9A},TYA:{imp:0x98}};
var SZ={imp:1,acc:1,imm:2,zp:2,zpx:2,zpy:2,abs:3,abx:3,aby:3,ind:3,inx:2,iny:2,rel:2},T={};
for(var mn in OPS)for(var md in OPS[mn])T[OPS[mn][md]]=[mn,md];
function num(t,L,ln,unk){t=t.trim();var m;if(m=/^\$([0-9a-f]+)$/i.exec(t))return parseInt(m[1],16);if(m=/^%([01]+)$/.exec(t))return parseInt(m[1],2);if(/^\d+$/.test(t))return parseInt(t,10);
if(m=/^'(.)'$/.exec(t))return m[1].charCodeAt(0);var k=t.toUpperCase();if(L.hasOwnProperty(k))return L[k];if(unk){unk.v=true;return 0}throw"line "+ln+": unknown name "+t}
function expr(t,L,ln,unk){t=t.trim();var lo=0,hi=0;if(t[0]=="<"){lo=1;t=t.slice(1)}else if(t[0]==">"){hi=1;t=t.slice(1)}
var parts=t.split(/(?=[+-])/),v=0;for(var i=0;i<parts.length;i++){var p=parts[i].trim(),s=1;if(!p)continue;if(p[0]=="+")p=p.slice(1);else if(p[0]=="-"){s=-1;p=p.slice(1)}v+=s*num(p,L,ln,unk)}
if(lo)v&=255;if(hi)v=(v>>8)&255;return v}
function parseOp(s,L,ln,mn,unk){s=s.trim();if(s==="")return{m:"imp"};if(/^a$/i.test(s))return{m:"acc"};if(s[0]=="#")return{m:"imm",v:expr(s.slice(1),L,ln,unk)};
var m;if(m=/^\((.+),\s*x\)$/i.exec(s))return{m:"inx",v:expr(m[1],L,ln,unk)};if(m=/^\((.+)\)\s*,\s*y$/i.exec(s))return{m:"iny",v:expr(m[1],L,ln,unk)};if(m=/^\((.+)\)$/.exec(s))return{m:"ind",v:expr(m[1],L,ln,unk)};
var idx="";if(m=/^(.+),\s*([xy])$/i.exec(s)){s=m[1];idx=m[2].toLowerCase()}var v=expr(s,L,ln,unk);
if(OPS[mn].rel)return{m:"rel",v:v};var zp=(v<256&&!unk.v);
if(idx=="x")return{m:(zp&&OPS[mn].zpx!==undefined)?"zpx":"abx",v:v};if(idx=="y")return{m:(zp&&OPS[mn].zpy!==undefined)?"zpy":"aby",v:v};
return{m:(zp&&OPS[mn].zp!==undefined)?"zp":"abs",v:v}}
function assemble(src){var lines=src.split("\n"),L={},out=[],org=0xC000,pass,errs=null;
for(pass=1;pass<=2;pass++){var pc=org=0xC000;out=[];
for(var i=0;i<lines.length;i++){var ln=i+1,s=lines[i].replace(/;.*$/,""),q=/"[^"]*"/.exec(s);if(q&&lines[i].indexOf(";")>=0&&lines[i].indexOf(";")<lines[i].indexOf(q[0])){s=lines[i].replace(/;.*$/,"")}
s=lines[i];var inq=false,cut=-1;for(var k=0;k<s.length;k++){if(s[k]=='"')inq=!inq;if(s[k]==";"&&!inq){cut=k;break}}if(cut>=0)s=s.slice(0,cut);s=s.trim();if(!s)continue;var m;
if(m=/^\*\s*=\s*(.+)$/.exec(s)){pc=org=expr(m[1],L,ln);continue}
if(m=/^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(s)){L[m[1].toUpperCase()]=expr(m[2],L,ln,{});continue}
if(m=/^([A-Za-z_]\w*):\s*(.*)$/.exec(s)){L[m[1].toUpperCase()]=pc;s=m[2].trim();if(!s)continue}
m=/^(\.?\w+)\s*(.*)$/.exec(s);var mn=m[1].toUpperCase(),arg=m[2],unk={v:false},bytes=[];
if(mn==".BYTE"||mn==".TEXT"){var items=arg.match(/"[^"]*"|[^,]+/g)||[];items.forEach(function(it){it=it.trim();if(it[0]=='"'){it.slice(1,-1).toUpperCase().split("").forEach(function(c){bytes.push(c.charCodeAt(0))})}else bytes.push(expr(it,L,ln,unk)&255)})}
else if(mn==".WORD"){arg.split(",").forEach(function(it){var v=expr(it,L,ln,unk);bytes.push(v&255,(v>>8)&255)})}
else if(mn==".FILL"){var f=arg.split(",");var n=expr(f[0],L,ln),v=f.length>1?expr(f[1],L,ln):0;for(var j=0;j<n;j++)bytes.push(v&255)}
else{if(!OPS[mn])throw"line "+ln+": unknown instruction "+m[1];var o=parseOp(arg,L,ln,mn,unk);var mode=o.m;
if(mode=="abs"&&OPS[mn].rel)mode="rel";if(!OPS[mn][mode]&&OPS[mn].acc&&mode=="imp")mode="acc";
if(!OPS[mn][mode])throw"line "+ln+": "+mn+" cannot use that addressing mode ("+mode+")";var op=OPS[mn][mode];bytes.push(op);
if(mode=="rel"){var off=o.v-(pc+2);if(pass==2&&(off<-128||off>127))throw"line "+ln+": branch too far ("+off+")";bytes.push(off&255)}
else if(SZ[mode]==2)bytes.push(o.v&255);else if(SZ[mode]==3)bytes.push(o.v&255,(o.v>>8)&255)}
if(pass==2)out.push({a:pc,b:bytes});pc+=bytes.length}}
return{blocks:out,labels:L}}
