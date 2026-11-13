/* C64 Lab UI: levels, a real C64 screen, keyboard, joystick pad, BASIC / assembly / C editor, goals. */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function gunzip(u) { var r = new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))); return new Uint8Array(await r.arrayBuffer()); }
  window.unb64 = unb64; window.gunzip = gunzip;
  var CFG = window.C64CFG, LV = CFG.levels, cur = 0, solved = {}, latched = {}, M = null, ran = false, codes = LV.map(function (l) { return l.code || ''; });
  var store = null, KEY = 'c64lab:' + CFG.title; try { store = window.localStorage; solved = JSON.parse(store.getItem(KEY) || '{}'); } catch (e) { }
  var TABN = { basic: 'BASIC', asm: 'Assembly', c: 'C (cc65)' };
  document.getElementById('app').innerHTML =
    '<div class="card"><h2>' + esc(CFG.title) + '</h2><div class="k">' + (CFG.intro || '') + '</div></div><div class="chips" id="chips"></div>' +
    '<div class="card"><div id="lt"></div><ul id="goals"></ul></div>' +
    '<canvas id="scr" width="384" height="272" tabindex="0"></canvas>' +
    '<div class="row"><button id="rst" class="s">Reset</button><button id="stp" class="s">RUN/STOP</button><button id="ret" class="s">RETURN</button><input type="text" id="typ" placeholder="type here, then press Type" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"><button id="send" class="s">Type</button></div>' +
    '<div class="row pad" id="pad"><button id="jp" class="s" title="Switch the joystick port">Port 2</button><button id="jl" class="s">&larr;</button><button id="ju" class="s">&uarr;</button><button id="jd" class="s">&darr;</button><button id="jr" class="s">&rarr;</button><button id="jf" class="s">FIRE</button></div>' +
    '<div class="card"><div class="row"><b id="lang"></b><span style="flex:1"></span><button id="go">&#9654; Run on the C64</button></div><textarea id="src" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"></textarea>' +
    '<div class="row"><button id="rs" class="s">Start over</button><button id="hint" class="s">Hint</button><button id="sol" class="s">Solution</button></div><div id="log" class="k"></div></div>';
  var cv = $('scr'), cx = cv.getContext('2d'), img = cx.createImageData(384, 272);
  function log(t, bad) { var e = $('log'); e.textContent = t || ''; e.className = bad ? 'bad' : 'k'; }
  function chips() {
    var h = ''; LV.forEach(function (l, i) { h += '<button class="chip' + (i === cur ? ' on' : '') + (solved[i] ? ' done' : '') + '" data-i="' + i + '">' + (solved[i] ? '&#10003; ' : '') + esc(l.title) + '</button>'; });
    $('chips').innerHTML = LV.length > 1 ? h : '';
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) { b.onclick = function () { codes[cur] = $('src').value; cur = +b.getAttribute('data-i'); load(); }; });
  }
  function load() {
    var l = LV[cur]; $('src').value = codes[cur]; $('lt').innerHTML = '<b>' + esc(l.title) + '.</b> ' + (l.intro || ''); $('lang').textContent = TABN[l.tab || 'basic'];
    $('hint').style.display = l.hint ? '' : 'none'; $('sol').style.display = l.solution ? '' : 'none'; $('pad').style.display = l.pad ? '' : 'none';
    latched = {}; ran = false; log(''); chips(); goals();
  }
  function goals() {
    var l = LV[cur], G = l.goals || [], all = G.length > 0, h = '';
    G.forEach(function (g, i) {
      var ok = false;
      if (M && ran) { try { ok = C64Goals.evalGoal(M, g, $('src').value); } catch (e) { } if (ok && !g.live) latched[i] = true; ok = ok || !!latched[i]; }
      if (!ok) all = false; h += '<li class="' + (ok ? 'ok' : '') + '">' + (ok ? '&#10003; ' : '&#9744; ') + g.t + '</li>';
    });
    $('goals').innerHTML = h;
    if (all && !solved[cur]) { solved[cur] = true; try { store.setItem(KEY, JSON.stringify(solved)); } catch (e) { } chips(); log('Level complete!'); if (LV.every(function (_, i) { return solved[i]; })) { try { if (window.lilith) window.lilith.complete(); } catch (e) { } } }
  }
  /* audio */
  var actx = null, queue = [], qpos = 0;
  function startAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)(); var proc = actx.createScriptProcessor(2048, 0, 1), ratio = 44100 / actx.sampleRate;
      proc.onaudioprocess = function (e) { var o = e.outputBuffer.getChannelData(0); for (var i = 0; i < o.length; i++) { var k = Math.floor(qpos); if (k < queue.length) { o[i] = queue[k]; qpos += ratio; } else o[i] = 0; } var d = Math.floor(qpos); if (d > 0) { queue.splice(0, d); qpos -= d; } };
      proc.connect(actx.destination);
    } catch (e) { }
  }
  /* emulation loop: 50 frames a second of C64 time */
  var last = 0, acc = 0, fr = 0;
  function tick(ts) {
    requestAnimationFrame(tick);
    if (!M || document.hidden) { last = ts; return; }
    acc += Math.min(100, ts - (last || ts)); last = ts;
    var n = 0; while (acc >= 20 && n < 4) { M.step(); acc -= 20; n++; fr++; }
    if (n) { img.data.set(M.pixels()); cx.putImageData(img, 0, 0); if (fr % 10 < n) goals(); }
  }
  /* keyboard: the real key matrix */
  var SPECIAL = { Enter: 'RETURN', Backspace: 'DEL', Escape: 'STOP', Home: 'HOME', F1: 'F1', F3: 'F3', F5: 'F5', F7: 'F7' };
  var CURS = { ArrowDown: ['CRSR_UD', 0], ArrowUp: ['CRSR_UD', 1], ArrowRight: ['CRSR_LR', 0], ArrowLeft: ['CRSR_LR', 1] };
  function keyEv(e, down) {
    if (document.activeElement !== cv || !M) return;
    var k = e.key, done = false;
    if (SPECIAL[k]) { M.key(SPECIAL[k], down); done = true; }
    else if (CURS[k]) { if (CURS[k][1]) M.key('LSHIFT', down); M.key(CURS[k][0], down); done = true; }
    else if (k.length === 1) done = M.keyChar(k, down);
    if (done) e.preventDefault();
  }
  document.addEventListener('keydown', function (e) { keyEv(e, true); }); document.addEventListener('keyup', function (e) { keyEv(e, false); });
  cv.addEventListener('click', function () { cv.focus(); startAudio(); });
  var joy = 0, jport = 2; $('jp').onclick = function () { if (M) M.joy(0, jport); joy = 0; jport = jport === 2 ? 1 : 2; this.textContent = 'Port ' + jport; };
  function pad(id, bit) { var b = $(id), dn = function (e) { joy |= bit; if (M) M.joy(joy, jport); e.preventDefault(); }, up = function (e) { joy &= ~bit; if (M) M.joy(joy, jport); e.preventDefault(); }; b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); }
  pad('ju', 1); pad('jd', 2); pad('jl', 4); pad('jr', 8); pad('jf', 16);
  $('send').onclick = function () { var t = $('typ').value; if (!M) return; startAudio(); M.type(t + '\n'); $('typ').value = ''; };
  $('typ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('send').onclick(); } });
  $('ret').onclick = function () { if (M) M.type('\n'); };
  $('stp').onclick = function () { if (M) { M.key('STOP', true); setTimeout(function () { M.key('STOP', false); }, 120); } };
  $('rst').onclick = function () { if (M) { M.reset(); latched = {}; ran = false; log('The C64 was reset.'); goals(); } };
  $('rs').onclick = function () { codes[cur] = LV[cur].code || ''; $('src').value = codes[cur]; log(''); };
  $('hint').onclick = function () { log('Hint: ' + LV[cur].hint); };
  $('sol').onclick = function () { $('src').value = LV[cur].solution; codes[cur] = $('src').value; log('Solution loaded. Press Run, and read it line by line.'); };
  function asmBuild(src) {
    var r = assemble(src), lo = 65535, hi = 0; r.blocks.forEach(function (b) { if (b.b.length) { if (b.a < lo) lo = b.a; if (b.a + b.b.length > hi) hi = b.a + b.b.length; } });
    if (hi <= lo) throw 'Nothing was assembled.';
    var d = new Uint8Array(hi - lo + 2); d[0] = lo & 255; d[1] = lo >> 8; r.blocks.forEach(function (b) { b.b.forEach(function (v, i) { d[2 + b.a - lo + i] = v; }); }); return d;
  }
  window.c64AsmBuild = asmBuild;
  $('go').onclick = async function () {
    if (!M) return; startAudio(); var l = LV[cur], src = $('src').value, tab = l.tab || 'basic'; codes[cur] = src; log('Loading into the C64...');
    await new Promise(function (r) { setTimeout(r, 30); });
    try {
      latched = {}; ran = false;
      if (tab === 'basic') { var bad = M.checkBasic(src); if (bad.length) { log(bad[0], 1); return; } M.loadBasic(src); log('Typed your program into the C64 and ran it.'); }
      else if (tab === 'asm') { var prg = asmBuild(src); var a = M.loadPRG(prg); log('Assembled ' + (prg.length - 2) + ' bytes at ' + a + ' and started it with SYS ' + a + '.'); }
      else { var p = await window.buildC(src); M.loadPRG(p); log('Compiled ' + p.length + ' bytes and ran it.'); }
      ran = true; if (l.focus !== false) cv.focus();
    } catch (e) { log(String(e && e.message || e), 1); }
  };
  window.__lab = { get M() { return M; }, load: load, state: function () { return { cur: cur, solved: solved }; } };
  gunzip(unb64(window.C64WASM_B64)).then(function (b) { return C64M.boot(b); }).then(function (m) {
    M = m; m.onAudio = function (f) { if (actx && queue.length < 30000) for (var i = 0; i < f.length; i++) queue.push(f[i]); };
    m.reset(); load(); requestAnimationFrame(tick);
  }).catch(function (e) { log('Could not start the C64: ' + e, 1); });
  load();
})();
