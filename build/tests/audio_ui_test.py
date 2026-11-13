#!/usr/bin/env python3
"""Audio robustness UI test: plays a real lecture against hostile speech engines.
  A. A browser speechSynthesis that behaves like Chrome (cancel then speak within 80 ms is dropped, cancel fires 'canceled' errors late, voices empty until voiceschanged).
  B. A fake Android bridge that delays, drops, duplicates and fails events, then dies and recovers.
Checks: never two voices at once, the chapter advances, a dead engine stops with a message instead of racing to the end.
Usage: python3 tests/audio_ui_test.py <web dir> <courses dir>"""
import sys, os, json
from playwright.sync_api import sync_playwright
web, courses = sys.argv[1], sys.argv[2]
fails = []
def check(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

WEB_MOCK = """
(() => {
  window.__spoken = []; window.__max = 0; window.__overlap = 0; window.__active = 0; let lastCancel = 0, cur = null, timers = [];
  let voices = []; setTimeout(() => { voices = [{name:'Google US English', lang:'en-US'}]; window.speechSynthesis.dispatchEvent && window.speechSynthesis.dispatchEvent(new Event('voiceschanged')); }, 300);
  class U { constructor(t){ this.text=t; } }
  const et = new EventTarget();
  const syn = { speaking:false, paused:false, addEventListener:(a,b)=>et.addEventListener(a,b), dispatchEvent:e=>et.dispatchEvent(e), getVoices(){ return voices; },
    pause(){}, resume(){},
    cancel(){ lastCancel = performance.now(); const u = cur; timers.forEach(clearTimeout); timers = []; if (cur) { window.__active = 0; cur = null; setTimeout(() => u.onerror && u.onerror({error:'canceled'}), 30); } },
    speak(u){
      if (performance.now() - lastCancel < 60) return;       // dropped, like Chrome
      if (cur) window.__overlap++;
      cur = u; window.__active = 1; window.__spoken.push(u.text);
      timers.push(setTimeout(() => { u.onstart && u.onstart(); u.onboundary && u.onboundary(); }, 5));
      timers.push(setTimeout(() => { if (cur === u) { cur = null; window.__active = 0; u.onend && u.onend(); } }, 60));
    } };
  Object.defineProperty(window, 'speechSynthesis', { value: syn, configurable: true });
  window.SpeechSynthesisUtterance = U;
})();
"""

BRIDGE_MOCK = """
(() => {
  window.__spoken = []; window.__overlap = 0; window.__active = 0; window.__mode = 'flaky'; let n = 0, cur = null, timers = [];
  const ev = (id, t, c) => window.__ttsEvent && window.__ttsEvent(id, t, c);
  window.AndroidTTS = {
    isReady(){ return window.__mode !== 'dead'; },
    restartEngine(){ window.__restarted = (window.__restarted||0) + 1; },
    stop(){ timers.forEach(clearTimeout); timers = []; window.__active = 0; cur = null; },
    speak(text, rate, id){
      window.__spoken.push(text);
      if (window.__mode === 'dead') { setTimeout(() => ev(id, 'error', 'notready'), 10); return; }
      if (window.__active) window.__overlap++;
      window.__active = 1; cur = id;
      const r = Math.random();
      if (window.__mode === 'flaky' && r < 0.08) { window.__active = 0; setTimeout(() => ev(id, 'error', '-1'), 10); return; }
      if (window.__mode === 'flaky' && r < 0.14) { timers.push(setTimeout(() => ev(id, 'start'), 10)); timers.push(setTimeout(() => { window.__active = 0; ev(id, 'done'); ev(id, 'done'); }, 70)); return; }
      timers.push(setTimeout(() => ev(id, 'start'), 15));
      timers.push(setTimeout(() => ev(id, 'range'), 30));
      timers.push(setTimeout(() => { window.__active = 0; ev(id, 'done'); }, 70));
    }
  };
})();
"""

WEB_NOVOICE = WEB_MOCK.replace("voices = [{name:'Google US English', lang:'en-US'}];", "")

def open_lecture(page):
    page.goto('file://' + os.path.join(web, 'index.html')); page.wait_for_selector('#main')
    page.set_input_files('input[type=file]', os.path.join(courses, 'everyday-percentages.course.json')) if page.query_selector('input[type=file]') else None
    page.wait_for_timeout(800)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--allow-file-access-from-files'])
    for name, mock in (('web speech engine', WEB_MOCK), ('web, no voices ever', WEB_NOVOICE), ('android bridge (flaky)', BRIDGE_MOCK)):
        ctx = b.new_context(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True)
        ctx.add_init_script(mock)
        page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto('file://' + os.path.join(web, 'index.html')); page.wait_for_selector('#main')
        # import a course through the library file input
        with page.expect_file_chooser() as fc:
            page.click('#imp')
        fc.value.set_files([os.path.join(courses, 'jetson-agx-xavier.course.json')])
        page.wait_for_selector('#modal[open]'); page.wait_for_timeout(600); page.click('#ml'); page.wait_for_timeout(300)
        page.click('#libbtn'); page.click('[data-open="jetson-agx-xavier"]'); page.wait_for_selector('#lgo')
        page.click('[data-lec="10"]')
        page.wait_for_selector('#slide'); page.wait_for_timeout(4500)
        spoken = page.evaluate('window.__spoken.length'); i1 = page.evaluate('__app.NAR.state.i')
        check(spoken >= 6, name + ': lecture speaks several chunks (%d)' % spoken)
        check(i1 >= 4, name + ': narrator advanced (chunk %d)' % i1)
        check(page.evaluate('window.__overlap') == 0, name + ': never two voices at once (%s)' % page.evaluate('window.__overlap'))
        # hammer the controls
        for _ in range(12):
            page.evaluate("__app.NAR.next()"); page.evaluate("__app.NAR.setRate(1.5)"); page.evaluate("__app.NAR.prev()"); page.evaluate("__app.NAR.play()"); page.wait_for_timeout(40)
        page.wait_for_timeout(1500)
        check(page.evaluate('window.__overlap') == 0, name + ': no overlap after control hammering (%s)' % page.evaluate('window.__overlap'))
        stt = page.evaluate('({p:__app.NAR.state.playing,h:__app.NAR.state.held,i:__app.NAR.state.i,n:__app.NAR.state.chunks.length})')
        check(stt['p'] or stt['h'] or stt['i'] >= stt['n'] - 2, name + ': still playing or finished the chapter (%s)' % stt)
        # tab hidden pauses
        page.evaluate("__app.NAR.jump(2); __app.NAR.play()"); page.wait_for_timeout(100)
        page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))")
        page.wait_for_timeout(200)
        check(page.evaluate('__app.NAR.state.playing') is False, name + ': pauses when the page is hidden')
        page.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))")
        if 'android' in name:
            page.evaluate("__app.NAR.play()"); page.wait_for_timeout(300)
            page.evaluate("window.__ttsEvent(0,'focusloss')"); page.wait_for_timeout(100)
            check(page.evaluate('__app.NAR.state.playing') is False, name + ': focus loss pauses the Teacher')
            page.evaluate("window.__ttsEvent(0,'pause')"); page.evaluate("__app.NAR.play()"); page.wait_for_timeout(200)
            # engine dies: must stop with a message, not run to the end
            page.evaluate("window.__mode='dead'; __app.NAR.stop(); __app.NAR.play()"); page.wait_for_timeout(6000)
            st = page.evaluate('({p:__app.NAR.state.playing, i:__app.NAR.state.i})')
            check(st['p'] is False and st['i'] <= 4, name + ': dead engine stops early with a message (playing=%s, chunk %s)' % (st['p'], st['i']))
            check(page.evaluate('window.__restarted||0') >= 1, name + ': engine restart requested')
            page.evaluate("window.__mode='ok'; __app.NAR.play()"); page.wait_for_timeout(1500)
            check(page.evaluate('__app.NAR.state.playing') is True and page.evaluate('__app.NAR.state.i') >= 1, name + ': recovers after the engine returns')
        log = page.evaluate("__app.N.diagText()") if page.evaluate("typeof __app.N") != 'undefined' else ''
        check(not errs, name + ': no page errors ' + ' | '.join(errs[:2]))
        ctx.close()
    b.close()
print('AUDIO UI TESTS ' + ('PASSED' if not fails else 'FAILED: %d' % len(fails))); sys.exit(1 if fails else 0)
