# -*- coding: utf-8 -*-
"""Builds the standalone webxdc lab pages for the holography course: kit + helpers + one lab script."""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
LABS = [("l01_horizon", "Lab 1: Bits on the horizon", 1150), ("l02_disk", "Lab 2: Walk the hyperbolic disk", 1250), ("l03_box", "Lab 3: AdS is a box", 1300), ("l04_entangle", "Lab 4: The entanglement dial", 1150),
        ("l05_largen", "Lab 5: The large N dial", 1150), ("l06_dictionary", "Lab 6: Mass to dimension", 1150), ("l07_rt", "Lab 7: The Ryu-Takayanagi ruler", 1250), ("l08_blackhole", "Lab 8: A black hole in AdS", 1250),
        ("l09_network", "Lab 9: Cut the network", 1300), ("l10_qutrits", "Lab 10: The three-qutrit code", 1300), ("l11_learn", "Lab 11: Learn the geometry", 1250), ("l12_page", "Lab 12: The Page curve", 1200),
        ("l13_universe", "Lab 13: Build a holographic universe", 1450)]


def _rd(*p):
    return open(os.path.join(HERE, *p), encoding="utf-8").read()


def lab_html(name, title):
    js = _rd("kit.js") + "\n" + _rd("geo.js") + "\n" + _rd("net.js") + "\n" + _rd("labs", name + ".js")
    return ('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title><style>%s</style></head>'
            '<body><script>%s</script></body></html>') % (title, _rd("kit.css"), js.replace("</script", "<\\/script"))


def build_all(outdir="/tmp/holo_labs"):
    os.makedirs(outdir, exist_ok=True)
    out = {}
    for name, title, h in LABS:
        html = lab_html(name, title); open(os.path.join(outdir, name + ".html"), "w", encoding="utf-8").write(html); out[name] = (title, h, html)
    return out


if __name__ == "__main__":
    print({k: len(v[2]) for k, v in build_all().items()})
