"""Playwright check of the C (cc65) levels: the solution compiles in the page and meets its goals; the starter does not."""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import labs_new, app_c64
from playwright.sync_api import sync_playwright
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for key in ("c1", "c2"):
        lab = labs_new.LABS[key]; path = "/tmp/ct/%s.html" % key; app_c64.make_lab(lab, studio=True, out=path)
        print(key, os.path.getsize(path) // 1024, "KB")
        pg = b.new_page(viewport={'width': 420, 'height': 1000}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + path); pg.wait_for_function('window.__lab && window.__lab.M', timeout=30000); pg.wait_for_timeout(300)
        for i, l in enumerate(lab["levels"]):
            res = {}
            for which in ("code", "solution"):
                if len(lab["levels"]) > 1: pg.click('.chip[data-i="%d"]' % i)
                pg.evaluate('s => document.getElementById("src").value = s', l[which])
                pg.evaluate('document.getElementById("log").textContent = ""')
                pg.click('#go')
                pg.wait_for_function('(t => t && !/^Loading/.test(t))(document.getElementById("log").textContent)', timeout=90000)
                logt = pg.inner_text('#log')
                if l.get("pad"): pg.wait_for_timeout(1500); pg.evaluate('__lab.M.joy(8)'); pg.wait_for_timeout(3000); pg.evaluate('__lab.M.joy(0)')
                pg.wait_for_timeout(2500)
                g = pg.inner_text('#goals'); res[which] = (g.count('✓') == len(l["goals"]), logt, g.replace("\n", " / "))
            ok = res["solution"][0] and not res["code"][0]
            if not ok: bad += 1
            print(("ok  " if ok else "BAD ") + key, i + 1, l["title"], "| sol:", res["solution"][1], res["solution"][2], "| start:", res["code"][2], flush=True)
            if not res["solution"][0]: print("   screen:", [r for r in pg.evaluate('__lab.M.screenRows()') if r.strip()][:6])
        if errs: print("page errors", errs); bad += 1
        pg.close()
    b.close()
print("C LEVELS", "PASSED" if not bad else "FAILED %d" % bad)
sys.exit(1 if bad else 0)
