/* Lab 9: Cut the network. Entropy of a boundary region = the cheapest cut through a layered tensor network. */
(function () {
  var net = HoloNet.make(32), O = { cx: 280, cy: 200, R: 175 }, paint = true;
  function A(s) { return s.A; } function cnt(s) { return HoloNet.count(s.A); }
  function setShallow(on) { for (var L = 0; L < net.depth; L++) { net.wt[L] = (on && L >= 1) ? 0 : 1; net.wr[L] = L >= 1 ? (on ? (L === 1 ? 0.5 : 0) : 0.3) : 0; } }
  HoloLab({
    title: 'Lab 9: Cut the network', intro: 'Each dot is a small tensor and each line a bond carrying entanglement. The rim is the boundary system; inner rings are coarser and coarser views of it. Tap or drag across rim sites to choose region A (green).',
    levels: [
      { title: 'The cheapest cut', text: 'To separate A from the rest you must cut bonds. The entropy of A is the cost of the cheapest cut (gold). Select 8 neighbouring sites. Cutting all 8 rim bonds would cost 8, but a cut through the bulk is cheaper.',
        hint: 'Drag across 8 sites next to each other.', goals: [{ t: 'A is 8 neighbouring sites', ok: function (s) { return cnt(s) === 8 && HoloNet.contiguous(s.A); } }, { t: 'Its entropy is less than 8', ok: function (s) { return cnt(s) === 8 && HoloNet.contiguous(s.A) && s.res.S < 8; } }],
        demo: function (s) { s.A = net.interval(0, 8); } },
      { title: 'Doubling adds, not multiplies', text: 'Use the buttons to try regions of 2, 4, 8 and 16 sites. Each doubling costs roughly one more layer of bonds, so entropy grows like the logarithm of the size. That is the pattern of a critical (scale-free) system, and of a geodesic in hyperbolic space.',
        hint: 'Press each of the four buttons.', goals: [{ t: 'Measured sizes 2, 4, 8 and 16', ok: function (s) { return s.seen[2] && s.seen[4] && s.seen[8] && s.seen[16]; } }],
        demo: function (s, K) { [2, 4, 8, 16].forEach(function (n) { s.A = net.interval(0, n); K.update(); }); } },
      { title: 'A shallow network', text: 'Press "Shallow network" to delete the deep layers. This is the network of a gapped system, where far-apart sites are not entangled. Measure 4 sites and 16 sites again: the entropy stops growing. That is called an area law.',
        hint: 'Press Shallow network, then the 4 and 16 buttons.', goals: [{ t: 'Shallow network: 4 sites and 16 sites cost the same', ok: function (s) { return s.shallow && s.seenS[4] !== undefined && s.seenS[16] !== undefined && Math.abs(s.seenS[4] - s.seenS[16]) < 0.01; } }],
        demo: function (s, K) { s.shallow = true; s.A = net.interval(0, 4); K.update(); s.A = net.interval(0, 16); } }
    ],
    reset: function (s) { s.A = net.interval(0, 3); s.seen = {}; s.seenS = {}; s.shallow = false; },
    tick: function (K, s) { setShallow(s.shallow); s.res = net.cut(s.A); var n = cnt(s); if (HoloNet.contiguous(s.A)) { if (s.shallow) s.seenS[n] = s.res.S; else s.seen[n] = s.res.S; } },
    build: function (K, s) {
      K.row(); [2, 4, 8, 16].forEach(function (n) { K.button(n + ' sites', function () { s.A = net.interval(0, n); }); }); K.button('Shallow network', function () { s.shallow = !s.shallow; }); K.button('Clear', function () { s.A = net.interval(0, 0); }); K.endRow();
      K.canvas(400);
      K.onDown = function (x, y) { var i = HoloNet.pick(net, O, x, y, false); if (i >= 0) paint = !s.A[i]; };
      K.onDrag = function (x, y) { var i = HoloNet.pick(net, O, x, y, false); if (i >= 0) s.A[i] = paint; };
      K.info(function (s) { var keys = [2, 4, 8, 16], src = s.shallow ? s.seenS : s.seen; return 'Sites in A: <b>' + cnt(s) + '</b> &nbsp; entropy (cut cost): <b>' + s.res.S.toFixed(2) + '</b> &nbsp; bonds cut: <b>' + s.res.cut.length + '</b>' + (s.shallow ? ' &nbsp;<span style="color:#7ab8ff">shallow network</span>' : '') + '<br>' + keys.map(function (k) { return k + ' sites: <b>' + (src[k] === undefined ? '?' : src[k].toFixed(2)) + '</b>'; }).join(' &nbsp; '); });
    },
    draw: function (K, s) { K.clear(); HoloNet.draw(K, net, { cx: O.cx, cy: O.cy, R: O.R, A: s.A, res: s.res, showW: true }); K.text('green dots inside: the part of the bulk that belongs to A', O.cx, 396, '#a99dc7', 11, 'center'); }
  });
})();
