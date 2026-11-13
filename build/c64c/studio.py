"""In-app C compiler for the C64 labs: cc65, ca65 and ld65 (zlib licence) compiled to WebAssembly by 8bitworkshop,
packed with the cc65 C64 headers, config and library from tc/zip. STUDIO_JS defines buildC(src) -> PRG bytes."""
import os
from pack import tools_blob
HERE = os.path.dirname(os.path.abspath(__file__))
SHIM = open(os.path.join(HERE, "tc", "shim_inline.js"), encoding="utf-8").read()

STUDIO_JS = r"""
var TL=null,SHARE=null;
async function loadTools(){if(TL)return;log("Loading the C toolchain (once)...");TL=unpack(await gunzip(unb64(TOOLSB64)));SHARE=new WASIMemoryFilesystem();
 Object.keys(TL).forEach(function(k){if(k.indexOf("share/")==0){var d=k.split("/");for(var i=1;i<d.length;i++)SHARE.putDirectory(d.slice(0,i).join("/"));SHARE.putFile("./"+k,TL[k])}})}
function tool(name,args,files){var w=new WASIRunner();w.fs.setParent(SHARE);w.initSync(new WebAssembly.Module(TL[name+".wasm"]));
 Object.keys(files).forEach(function(k){w.fs.putFile("./"+k,files[k])});w.addPreopenDirectory(".");w.setArgs([name].concat(args));var e=w.run();
 var err=w.fds[2].getBytesAsString().split("\n").filter(function(l){return l&&!/Warning/.test(l)}).join("\n");return {w:w,e:e,err:err}}
async function buildC(src){await loadTools();var enc=new TextEncoder();
 var r=tool("cc65",["-t","c64","-I","share/cc65/include","-I",".","-Oirs","main.c","-o","main.s"],{"main.c":enc.encode(src)});if(r.e){throw "cc65: "+r.err}
 var s=r.w.fs.getFile("main.s").getBytes();r=tool("ca65",["-t","c64","-I","share/cc65/asminc","-o","main.o","main.s"],{"main.s":s});if(r.e)throw "ca65: "+r.err;
 var o=r.w.fs.getFile("main.o").getBytes();r=tool("ld65",["-t","c64","--cfg-path","share/cc65/cfg","--lib-path","share/cc65/lib","-o","main","main.o","c64.lib"],{"main.o":o});if(r.e)throw "ld65: "+r.err;
 var p=r.w.fs.getFile("main").getBytes().slice();log("Compiled: "+p.length+" bytes.");return p}
"""

