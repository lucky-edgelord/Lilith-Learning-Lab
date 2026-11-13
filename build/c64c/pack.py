"""Pack files into one gzip blob (path, data records) and base64 it for embedding in webxdc apps."""
import gzip, base64, struct, os
HERE = os.path.dirname(os.path.abspath(__file__))
WASM = os.path.join(HERE, "..", "vendor", "cc65-wasm")
ZIP = os.path.join(HERE, "tc", "zip", "share", "cc65")


def pack(files):
    out = b""
    for p, d in files:
        pb = p.encode()
        out += struct.pack("<HI", len(pb), len(d)) + pb + d
    return base64.b64encode(gzip.compress(out, 9)).decode()


def tools_blob():
    fl = []
    for t in ("cc65", "ca65", "ld65"):
        fl.append((t + ".wasm", open(os.path.join(WASM, t + ".wasm"), "rb").read()))
    for sub in ("include", "cfg"):
        for root, _, fs in os.walk(os.path.join(ZIP, sub)):
            for f in fs:
                p = os.path.join(root, f)
                if sub == "include" and not (f.endswith(".h") or "/sys" in root or "/c64" in root):
                    pass
                fl.append(("share/cc65/" + os.path.relpath(p, ZIP), open(p, "rb").read()))
    fl.append(("share/cc65/lib/c64.lib", open(os.path.join(ZIP, "lib", "c64.lib"), "rb").read()))
    for root, _, fs in os.walk(os.path.join(ZIP, "asminc")):
        for f in fs:
            p = os.path.join(root, f)
            fl.append(("share/cc65/" + os.path.relpath(p, ZIP), open(p, "rb").read()))
    return pack(fl)


if __name__ == "__main__":
    print(len(tools_blob()))
