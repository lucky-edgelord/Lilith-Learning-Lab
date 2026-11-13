/* Lab 13: Build a holographic universe. One toy model, four views: geometry from entanglement, an error-correcting code,
   a network trained by gradient descent, and a black hole. */
(function () {
  var net = HoloNet.make(32), O = { cx: 280, cy: 205, R: 180 }, timer = null, paint = true, S = {}, CEN = net.layers[5][0];
  function cnt(s) { return HoloNet.count(s.A); }
  function comp(A) { return A.map(function (x) { return !x; }); }
  function key(A) { return A.map(function (x) { return x ? 1 : 0; }).join(''); }
  function ham(a, b) { var d = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; }
  function resetNet(s) { for (var L = 0; L < net.depth; L++) { net.wt[L] = 1; net.wr[L] = L >= 1 ? 0.3 : 0; } net._adam = null; s.steps = 0; }
  function trainSync(s, n) { var t = HoloNet.critical(32); for (var i = 0; i < n; i++) s.loss = net.train(t, 0.05); s.steps += n; }
  function scramble(s) { for (var L = 0; L < net.depth - 1; L++) { net.wt[L] = 0.15 + 1.6 * ((L * 37 + 11) % 7) / 7; if (L >= 1) net.wr[L] = 0.05 + 0.8 * ((L * 53 + 5) % 5) / 5; } net._adam = null; s.steps = 0; s.loss = net.loss(HoloNet.critical(32)); }
  HoloLab({
    title: 'Lab 13: Build a holographic universe', intro: 'Everything in the course, in one toy universe. The rim is the boundary quantum system. The inside is the emergent bulk. Tap or drag rim sites to choose region A (green). Tap an inner dot to choose a bulk point.',
    levels: [
      { title: 'Geometry from entanglement', text: 'Choose a region of at least 10 neighbouring sites. The gold bonds are the minimal cut: the Ryu-Takayanagi surface of this universe. Its cost is the entropy of A. Then press Complement: the rest of the boundary has the same surface and the same entropy, because the whole state is pure.',
        hint: 'Drag across 10 or more sites, then press Complement.',
        goals: [{ t: 'A region of at least 10 neighbouring sites', ok: function (s) { return cnt(s) >= 10 && cnt(s) < 32 && HoloNet.contiguous(s.A); } }, { t: 'Complement taken: the entropy did not change', ok: function (s) { return s.compOK; } }],
        demo: function (s, K) { s.A = net.interval(0, 12); K.update(); doComp(s); } },
      { title: 'The bulk is a code', text: 'The green inner dots are the entanglement wedge of A: the bulk points that A can read. Tap the centre dot. (1) Find a region that can read it. (2) Find a clearly different region that also can: the same bulk information lives in many places on the boundary. (3) Then tap a dot in the ring next to the rim and find a region that reads the centre but not that dot. Deep points are protected against losing a few sites; shallow points are not.',
        hint: '(1) More than half the rim reads the centre. (2) Use a different half. (3) Select an outer dot, select all sites, then switch off the two rim sites below that dot.',
        enter: function (s) { s.sel = CEN; s.A = net.interval(0, 6); },
        goals: [{ t: 'A region that can read the centre', ok: function (s) { return s.readers.length >= 1; } },
                { t: 'A second region, different in at least 8 sites, that also reads it', ok: function (s) { for (var i = 0; i < s.readers.length; i++) for (var j = i + 1; j < s.readers.length; j++) if (ham(s.readers[i], s.readers[j]) >= 8) return true; return false; } },
                { t: 'An outer bulk point is lost while the centre is still readable', ok: function (s) { var l = net.nodes[s.sel].layer; return (l === 1 || l === 2) && !s.res.side[s.sel] && s.res.side[CEN]; } }],
        demo: function (s, K) { s.sel = CEN; s.A = net.interval(0, 20); K.update(); s.A = net.interval(12, 20); K.update(); s.sel = net.layers[1][0]; s.A = net.interval(2, 30); } },
      { title: 'Learn the universe from data', text: 'Now you are only given data: the entanglement entropies of a critical quantum system. The bonds start out wrong. Press Train: gradient descent adjusts the bonds, exactly as in training a neural network, until the cuts reproduce the data. A deep, hyperbolic-like bulk emerges by itself.',
        hint: 'Press Train and wait until the loss stops falling.', enter: function (s) { scramble(s); s.A = net.interval(0, 8); },
        goals: [{ t: 'Trained: loss below 0.15', ok: function (s) { return s.steps >= 100 && s.loss < 0.15; } }, { t: 'With 16 neighbouring sites selected, the network entropy is within 1 of the data (3.3)', ok: function (s) { return s.steps >= 100 && s.loss < 0.15 && cnt(s) === 16 && HoloNet.contiguous(s.A) && Math.abs(s.res.S - 3.32) < 1; } }],
        demo: function (s, K) { trainSync(s, 250); K.update(); s.A = net.interval(1, 16); } },
      { title: 'Add a black hole', text: 'Heat the boundary and the centre of the bulk is replaced by a horizon (pink). (1) Select the whole rim: its entropy is no longer zero, it is the black hole entropy, the cost of the horizon bonds. (2) Find a region whose entropy differs from that of its complement by at least 1. (3) Tap a bulk point outside the horizon and find a region that can still read it. Points behind the horizon cannot be read from the boundary alone.',
        hint: 'Press All sites. Then choose about 20 sites and compare S(A) with S(rest). Then tap an outer dot and select the sites beneath it.',
        enter: function (s) { s.hole = true; s.h = 0.6; s.sel = -1; s.A = net.interval(0, 0); },
        goals: [{ t: 'Whole boundary selected: entropy equals the black hole entropy', ok: function (s) { return s.hole && cnt(s) === 32 && s.res.S > 0.5; } },
                { t: 'A region with S(A) and S(rest) differing by at least 1', ok: function (s) { return s.hole && cnt(s) < 32 && cnt(s) > 0 && Math.abs(s.res.S - s.resC.S) >= 1; } },
                { t: 'A bulk point outside the horizon that A can read', ok: function (s) { return s.hole && s.sel >= 0 && !net.inHole(s.sel) && net.nodes[s.sel].layer > 0 && s.res.side[s.sel] && cnt(s) < 32; } }],
        demo: function (s, K) { s.A = net.interval(0, 32); K.update(); s.A = net.interval(0, 22); K.update(); s.sel = net.layers[1][2]; s.A = net.interval(2, 8); } }
    ],
    reset: function (s) { if (timer) { clearInterval(timer); timer = null; } resetNet(s); s.A = net.interval(0, 5); s.sel = -1; s.hole = false; s.h = 0.6; s.compOK = false; s.readers = []; s.loss = 0; },
    tick: function (K, s) {
      net.setHole(s.hole ? 3 : 0, s.h); if (s.sel >= 0 && net.inHole(s.sel)) s.sel = -1;
      s.res = net.cut(s.A); s.resC = net.cut(comp(s.A));
      if (s.level === 1 && s.sel === CEN && s.res.side[CEN]) { var k = key(s.A); if (s.readers.indexOf(k) < 0) { s.readers.push(k); if (s.readers.length > 40) s.readers.shift(); } }
    },
    build: function (K, s) {
      S.h = K.slider('horizon bond strength', 0.1, 1.5, 0.05, 'h', function (v) { return v.toFixed(2); });
      K.row(); K.button('Complement', function () { doComp(s); }); K.button('All sites', function () { s.A = net.interval(0, 32); }); K.button('Clear', function () { s.A = net.interval(0, 0); });
      S.tr = K.button('Train', function () { if (timer) return; var left = 250; timer = setInterval(function () { trainSync(s, 5); left -= 5; if (left <= 0) { clearInterval(timer); timer = null; } K.update(); }, 30); }, '');
      K.endRow();
      K.canvas(410);
      K.onDown = function (x, y) { var i = HoloNet.pick(net, O, x, y); if (i < 0) return; if (net.nodes[i].layer === 0) { paint = !s.A[i]; s.A[i] = paint; s.compOK = s.compOK && false; } else s.sel = i; };
      K.onDrag = function (x, y) { var i = HoloNet.pick(net, O, x, y, false); if (i >= 0) s.A[i] = paint; };
      K.info(function (s) {
        var t = 'Sites in A: <b>' + cnt(s) + '</b> &nbsp; S(A) = <b>' + s.res.S.toFixed(2) + '</b> &nbsp; S(rest) = <b>' + s.resC.S.toFixed(2) + '</b>';
        if (s.hole) t += ' &nbsp; black hole entropy = <b>' + (8 * s.h).toFixed(2) + '</b>';
        if (s.level === 2) t += '<br>Training steps: <b>' + s.steps + '</b> &nbsp; loss: <b>' + s.loss.toFixed(3) + '</b>';
        if (s.sel >= 0) t += '<br>Selected bulk point (layer ' + net.nodes[s.sel].layer + '): ' + (s.res.side[s.sel] ? '<span style="color:#7be0a4">A can read it</span>' : '<span style="color:#ff7a9a">A cannot read it</span>');
        if (s.level === 1) t += ' &nbsp; centre: ' + (s.res.side[CEN] ? '<span style="color:#7be0a4">readable</span>' : '<span style="color:#ff7a9a">not readable</span>') + ' &nbsp; regions found that read the centre: <b>' + s.readers.length + '</b>';
        return t;
      });
    },
    show: function (K, s) { S.h.w.style.display = s.level === 3 ? '' : 'none'; S.tr.style.display = s.level === 2 ? '' : 'none'; },
    draw: function (K, s) { K.clear(); HoloNet.draw(K, net, { cx: O.cx, cy: O.cy, R: O.R, A: s.A, res: s.res, sel: s.sel, showW: true }); K.text('gold: minimal cut (RT surface)   green inside: entanglement wedge of A', O.cx, 404, '#a99dc7', 11, 'center'); }
  });
  function doComp(s) { var before = net.cut(s.A).S; s.A = comp(s.A); var after = net.cut(s.A).S; s.compOK = !s.hole && Math.abs(before - after) < 1e-9 && HoloNet.count(s.A) > 0 && HoloNet.count(s.A) < 32; }
})();
