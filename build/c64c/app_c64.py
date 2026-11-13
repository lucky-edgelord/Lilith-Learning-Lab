"""C64 Lab generator: a webxdc lab with levels on the real c64.wasm core (c64-ready, MIT).
Usage: from app_c64 import make_lab; html = make_lab(cfg, studio=False)
cfg = {title, intro, levels: [{title, intro, tab: basic|asm|c, code, solution, goals: [{t, ...}], hint, pad, test: [...]}]}"""
import base64, gzip, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.join(HERE, "c64lab")
WASM = os.path.join(HERE, "..", "vendor", "c64-ready", "c64.wasm")
_rd = lambda n: open(os.path.join(LAB, n), encoding="utf-8").read()
_cache = {}


def wasm_b64():
    if "w" not in _cache:
        _cache["w"] = base64.b64encode(gzip.compress(open(WASM, "rb").read(), 9)).decode()
    return _cache["w"]


def asm_js():
    return _rd("asm.js")


def studio_js():
    if "s" not in _cache:
        import studio
        _cache["s"] = "var TOOLSB64=\"%s\";\n" % studio.tools_blob() + studio.SHIM + "\nfunction log(t){var e=document.getElementById('log');if(e)e.textContent=t}\n" + \
            "function unpack(u){var o={},p=0,dv=new DataView(u.buffer,u.byteOffset,u.byteLength);while(p<u.length){var pl=dv.getUint16(p,true),dl=dv.getUint32(p+2,true);p+=6;var name=new TextDecoder().decode(u.subarray(p,p+pl));p+=pl;o[name]=u.slice(p,p+dl);p+=dl}return o}\n" + \
            studio.STUDIO_JS + "\nwindow.buildC=buildC;\n"
    return _cache["s"]


def make_lab(cfg, studio=False, out=None):
    cfg = json.loads(json.dumps(cfg))
    for l in cfg["levels"]:
        l.pop("test", None)
        for k in ("code", "solution"):
            if l.get(k):
                l[k] = l[k].strip("\n") + "\n"
    js = "window.C64WASM_B64=\"%s\";\nwindow.C64CFG=%s;\n" % (wasm_b64(), json.dumps(cfg).replace("</", "<\\/"))
    js += _rd("machine.js") + "\n" + _rd("goals.js") + "\n" + asm_js() + "\n"
    js += (studio_js() if studio else "window.buildC=async function(){throw 'C is not part of this lab.'};\n")
    html = ("<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>%s</title><style>%s</style></head>"
            "<body><div id=\"app\"></div><script>\n%s\n</script><script>\n%s\n</script></body></html>") % (cfg["title"], _rd("lab.css"), js, _rd("ui.js"))
    if out:
        open(out, "w", encoding="utf-8").write(html)
    return html
