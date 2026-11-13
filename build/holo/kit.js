/* Holo Lab kit: levels, goals, controls and a canvas for the holography course labs.
   A lab calls HoloLab({title, intro, levels:[{title, text, hint, enter(st), goals:[{t, ok(st)}], demo(st)}], build(K, st), draw(K, st)}). */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (html !== undefined) e.innerHTML = html; return e; }
  window.HoloLab = function (lab) {
    var key = 'hololab:' + lab.title, done = {}, cur = 0, st = { level: 0 }, latched = {}, completed = false;
    try { done = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { }
    document.body.innerHTML = '<div class="card"><h2></h2><div class="k" id="intro"></div></div><div class="chips" id="chips"></div>' +
      '<div class="card"><div id="ltext"></div><ul id="goals"></ul><div id="msg"></div></div><div class="card" id="stage"></div>' +
      '<div class="row"><button class="s" id="hintb">Hint</button><button class="s" id="demob">Show me</button><button class="s" id="resetb">Start over</button></div><div class="card k" id="hint" style="display:none"></div>';
    document.querySelector('h2').textContent = lab.title; $('intro').innerHTML = lab.intro || '';
    var K = { st: st, el: el, $: $ }, sliders = [], infos = [];
    K.stage = $('stage');
    K.slider = function (label, min, max, step, name, fmt) {
      var w = el('div', { 'class': 'sl' }), l = el('label', {}, label), i = el('input', { type: 'range', min: min, max: max, step: step, 'data-n': name }), b = el('b');
      w.appendChild(l); w.appendChild(i); w.appendChild(b); K.stage.appendChild(w);
      var s = { name: name, i: i, b: b, fmt: fmt || function (v) { return String(v); }, w: w };
      i.oninput = function () { st[name] = parseFloat(i.value); K.update(); }; sliders.push(s); return s;
    };
    K.button = function (label, fn, cls) { var b = el('button', { 'class': cls === undefined ? 's' : cls }, label); b.onclick = function () { fn(); K.update(); }; (K._row || K.stage).appendChild(b); return b; };
    K.row = function () { var r = el('div', { 'class': 'row' }); K.stage.appendChild(r); K._row = r; return r; };
    K.endRow = function () { K._row = null; };
    K.info = function (fn) { var d = el('div', { 'class': 'info' }); K.stage.appendChild(d); infos.push({ d: d, fn: fn }); return d; };
    K.canvas = function (h, w) {
      w = w || 560; var c = el('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr; c.style.aspectRatio = w + '/' + h;
      K.stage.appendChild(c); var g = c.getContext('2d'); g.scale(dpr, dpr); K.g = g; K.W = w; K.H = h; K.cv = c;
      function pos(e) { var r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * w / r.width, y: (e.clientY - r.top) * h / r.height }; }
      var down = false;
      c.addEventListener('pointerdown', function (e) { down = true; try { c.setPointerCapture(e.pointerId); } catch (x) { } var p = pos(e); if (K.onDown) K.onDown(p.x, p.y); if (K.onDrag) K.onDrag(p.x, p.y); K.update(); e.preventDefault(); });
      c.addEventListener('pointermove', function (e) { if (!down) return; var p = pos(e); if (K.onDrag) { K.onDrag(p.x, p.y); K.update(); } });
      c.addEventListener('pointerup', function () { down = false; if (K.onUp) { K.onUp(); K.update(); } });
      return g;
    };
    K.clear = function () { K.g.clearRect(0, 0, K.W, K.H); };
    K.text = function (t, x, y, col, size, align) { var g = K.g; g.fillStyle = col || '#f1ebff'; g.font = (size || 12) + 'px Roboto,system-ui,sans-serif'; g.textAlign = align || 'left'; g.fillText(t, x, y); };
    K.line = function (x1, y1, x2, y2, col, w) { var g = K.g; g.strokeStyle = col || '#3a2d55'; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    K.dot = function (x, y, r, col) { var g = K.g; g.fillStyle = col || '#b26bff'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
    K.circle = function (x, y, r, col, w) { var g = K.g; g.strokeStyle = col || '#3a2d55'; g.lineWidth = w || 1; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke(); };
    /* plot y=f(x) curves in a box: K.plot({x0,x1,y0,y1, box:[l,t,w,h], curves:[{f,col,w,dash}], xl, yl, marks:[{x,col,label}]}) */
    K.plot = function (o) {
      var g = K.g, b = o.box, X = function (x) { return b[0] + (x - o.x0) / (o.x1 - o.x0) * b[2]; }, Y = function (y) { return b[1] + b[3] - (y - o.y0) / (o.y1 - o.y0) * b[3]; };
      g.strokeStyle = '#3a2d55'; g.lineWidth = 1; g.strokeRect(b[0], b[1], b[2], b[3]);
      (o.curves || []).forEach(function (c) {
        g.save(); g.beginPath(); g.rect(b[0], b[1], b[2], b[3]); g.clip();
        g.strokeStyle = c.col || '#b26bff'; g.lineWidth = c.w || 2; g.setLineDash(c.dash || []); g.beginPath(); var first = true;
        for (var k = 0; k <= 200; k++) { var x = o.x0 + (o.x1 - o.x0) * k / 200, y = c.f(x); if (!isFinite(y)) { first = true; continue; } y = Math.max(o.y0 - (o.y1 - o.y0), Math.min(o.y1 + (o.y1 - o.y0), y)); if (first) { g.moveTo(X(x), Y(y)); first = false; } else g.lineTo(X(x), Y(y)); }
        g.stroke(); g.restore(); g.setLineDash([]);
        if (c.label) K.text(c.label, b[0] + b[2] - 6, Y(Math.max(o.y0, Math.min(o.y1, c.f(o.x1)))) + (c.dy || -6), c.col, 11, 'right');
      });
      (o.marks || []).forEach(function (m) { K.line(X(m.x), b[1], X(m.x), b[1] + b[3], m.col || '#ffd27f', 1.5); if (m.y !== undefined) K.dot(X(m.x), Y(m.y), 4, m.col || '#ffd27f'); if (m.label) K.text(m.label, X(m.x) + 4, b[1] + 12, m.col || '#ffd27f', 11); });
      if (o.xl) K.text(o.xl, b[0] + b[2] / 2, b[1] + b[3] + 14, '#a99dc7', 11, 'center'); if (o.yl) K.text(o.yl, b[0] + 4, b[1] - 5, '#a99dc7', 11);
      return { X: X, Y: Y };
    };
    function level() { return lab.levels[cur]; }
    function chips() {
      var c = $('chips'); c.innerHTML = ''; c.style.display = lab.levels.length > 1 ? '' : 'none';
      lab.levels.forEach(function (l, i) { var b = el('button', { 'class': 'chip' + (i === cur ? ' on' : '') + (done[i] ? ' done' : ''), 'data-i': i }, (done[i] ? '✓ ' : '') + (i + 1) + '. ' + l.title); b.onclick = function () { enter(i); }; c.appendChild(b); });
    }
    function goals() {
      var l = level(), all = true, ul = $('goals'); ul.innerHTML = '';
      l.goals.forEach(function (g, i) { var ok = false; try { ok = !!g.ok(st); } catch (e) { } if (ok && !g.live) latched[i] = true; if (g.live) latched[i] = ok; if (!latched[i]) all = false; var li = el('li', latched[i] ? { 'class': 'ok' } : {}); li.textContent = (latched[i] ? '✓ ' : '○ ') + g.t; ul.appendChild(li); });
      if (all && !done[cur]) {
        done[cur] = 1; try { localStorage.setItem(key, JSON.stringify(done)); } catch (e) { } chips();
        $('msg').textContent = cur < lab.levels.length - 1 ? 'Level complete! Tap the next level.' : 'Lab complete!';
      }
      if (!completed && lab.levels.every(function (x, i) { return done[i]; })) { completed = true; try { if (window.lilith && window.lilith.complete) window.lilith.complete(); } catch (e) { } }
    }
    K.update = function () {
      sliders.forEach(function (s) { if (document.activeElement !== s.i || parseFloat(s.i.value) !== st[s.name]) s.i.value = st[s.name]; s.b.textContent = s.fmt(st[s.name], st); });
      if (lab.tick) lab.tick(K, st);
      infos.forEach(function (x) { x.d.innerHTML = x.fn(st); });
      if (K.g && lab.draw) lab.draw(K, st);
      goals();
    };
    function enter(i) {
      cur = i; latched = {}; st.level = i; $('msg').textContent = ''; $('hint').style.display = 'none';
      var l = level(); $('ltext').innerHTML = '<b>' + l.title + '.</b> ' + l.text; $('hint').innerHTML = l.hint || '';
      if (lab.reset) lab.reset(st); if (l.enter) l.enter(st);
      if (lab.show) lab.show(K, st);
      chips(); K.update();
    }
    $('hintb').onclick = function () { var h = $('hint'); h.style.display = h.style.display === 'none' ? '' : 'none'; };
    $('demob').onclick = function () { var l = level(); if (l.demo) { l.demo(st, K); K.update(); } };
    $('resetb').onclick = function () { enter(cur); };
    lab.build(K, st);
    var start = 0; for (var i = 0; i < lab.levels.length; i++) if (!done[i]) { start = i; break; }
    enter(start);
    window.__lab = { K: K, st: st, lab: lab, enter: enter, done: done, isDone: function (i) { return !!done[i]; }, completed: function () { return completed; } };
  };
})();
