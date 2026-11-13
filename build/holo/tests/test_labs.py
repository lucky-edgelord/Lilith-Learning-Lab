"""Playwright check of every holography lab: each level starts unsolved, its demo solves it, and the lab reports completion."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import build
from playwright.sync_api import sync_playwright
out = build.build_all(); bad = 0; shots = sys.argv[1] if len(sys.argv) > 1 else None
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (title, h, html) in out.items():
        pg = b.new_page(viewport={'width': 400, 'height': 1000}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script("window.lilith={complete:function(){window.__done=true}}")
        pg.goto('file:///tmp/holo_labs/%s.html' % name); pg.wait_for_function('window.__lab')
        n = pg.evaluate('__lab.lab.levels.length'); res = []
        for i in range(n):
            pg.evaluate('i => __lab.enter(i)', i)
            pre = pg.evaluate('i => __lab.isDone(i)', i)
            goals0 = pg.inner_text('#goals').count('✓')
            pg.click('#demob'); pg.wait_for_timeout(60)
            ok = pg.evaluate('i => __lab.isDone(i)', i)
            res.append((pre, goals0, ok, pg.inner_text('#goals').replace('\n', ' | ')))
            if shots and i == n - 1: pg.screenshot(path=os.path.join(shots, name + '.png'), full_page=True)
        done = pg.evaluate('!!window.__done')
        good = all((not pre) and g0 == 0 and ok for pre, g0, ok, _ in res) and done and not errs
        if not good: bad += 1
        print(('ok  ' if good else 'BAD ') + name, n, 'levels', 'complete' if done else 'NOT complete', errs[:2] if errs else '')
        if not good:
            for r in res: print('    ', r)
        pg.close()
    b.close()
print('HOLO LABS', 'PASSED' if not bad else 'FAILED %d' % bad); sys.exit(1 if bad else 0)
