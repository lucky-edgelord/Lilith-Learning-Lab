/* Lab 11: Learn the geometry. Entanglement feature learning on a toy network: fit bond weights to entanglement data by gradient descent. */
(function () {
  var net = HoloNet.make(32), O = { cx: 150, cy: 165, R: 125 }, timer = null, S = {};
  function target(s) { return s.data === 'critical' ? HoloNet.critical(32) : HoloNet.gapped(s.xi, 2); }
  function depth() { var d = 0; while (d < 5 && net.wt[d] > 0.1) d++; return d; }
  function resetNet(s) { for (var L = 0; L < net.depth; L++) { net.wt[L] = 1; net.wr[L] = L >= 1 ? 0.3 : 0; } net._adam = null; s.steps = 0; s.loss = net.loss(target(s)); }
  function trainSync(s, n) { var k = s.data + s.xi; if (s.tkey !== k) { resetNet(s); s.tkey = k; } var t = target(s); for (var i = 0; i < n; i++) s.loss = net.train(t, 0.05); s.steps += n; }
  HoloLab({
    title: 'Lab 11: Learn the geometry', intro: 'Here the network is a learning machine. Its bond weights start out all equal. Training nudges them, by gradient descent, until the cut costs match the entanglement entropies measured in a quantum state. The geometry is not put in by hand: it is learned from the data.',
    levels: [
      { title: 'Data from a critical state', text: 'The data are entropies of a critical (scale-free) system, which grow like the logarithm of the region size. Train until the loss is small. Look at the learned bonds: every layer stays switched on, all the way to the centre. The learned space is deep, like hyperbolic space.',
        hint: 'Press Train and wait for it to finish (200 steps).', enter: function (s) { s.data = 'critical'; resetNet(s); },
        goals: [{ t: 'Loss below 0.15', ok: function (s) { return s.data === 'critical' && s.steps >= 100 && s.loss < 0.15; } }, { t: 'Bonds survive in all four outer layers (deep geometry)', ok: function (s) { return s.data === 'critical' && s.steps >= 100 && depth() >= 4; } }],
        demo: function (s) { s.data = 'critical'; resetNet(s); trainSync(s, 200); } },
      { title: 'Data from a gapped state', text: 'Now the data come from a gapped system, where entropy stops growing after a short distance (an area law). Reset and train again. The deep bonds fade to nothing: the learned space is only a thin shell.',
        hint: 'Press the gapped data button, then Train.', enter: function (s) { s.data = 'gapped'; s.xi = 1.5; resetNet(s); },
        goals: [{ t: 'Loss below 0.12 on gapped data', ok: function (s) { return s.data === 'gapped' && s.steps >= 100 && s.loss < 0.12; } }, { t: 'The learned geometry is shallow (2 layers or fewer)', ok: function (s) { return s.data === 'gapped' && s.steps >= 100 && depth() <= 2; } }],
        demo: function (s) { s.data = 'gapped'; s.xi = 1.5; resetNet(s); trainSync(s, 200); } },
      { title: 'Depth follows correlation length', text: 'The slider sets the correlation length ξ of the state: how far entanglement reaches. Train once with a short ξ (1.5 or less) and once with a long ξ (6 or more). The learned depth of the bulk tracks ξ. As ξ grows without limit you get back the critical case.',
        hint: 'Set ξ = 1, Train. Then set ξ = 7, Train again.', enter: function (s) { s.data = 'gapped'; s.xi = 3; resetNet(s); },
        goals: [{ t: 'Trained with ξ at most 1.5', ok: function (s) { return s.dShort !== undefined; } }, { t: 'Trained with ξ at least 6: the bulk is deeper', ok: function (s) { return s.dShort !== undefined && s.dLong !== undefined && s.dLong > s.dShort; } }],
        demo: function (s, K) { s.xi = 1; resetNet(s); trainSync(s, 200); K.update(); s.xi = 7; resetNet(s); trainSync(s, 200); } }
    ],
    reset: function (s) { if (timer) { clearInterval(timer); timer = null; } s.data = 'critical'; s.xi = 1.5; s.dShort = undefined; s.dLong = undefined; s.tkey = null; resetNet(s); },
    tick: function (K, s) { if (s.xi !== s._xi || s.data !== s._data) { s._xi = s.xi; s._data = s.data; s.loss = net.loss(target(s)); } if (s.data === 'gapped' && s.steps >= 150 && s.tkey === s.data + s.xi) { if (s.xi <= 1.5) s.dShort = depth(); if (s.xi >= 6) s.dLong = depth(); } },
    build: function (K, s) {
      S.xi = K.slider('correlation length ξ', 1, 8, 0.5, 'xi', function (v) { return v.toFixed(1); });
      K.row();
      K.button('Train', function () { if (timer) return; var left = 200; timer = setInterval(function () { trainSync(s, 5); left -= 5; if (left <= 0) { clearInterval(timer); timer = null; } K.update(); }, 30); }, '');
      K.button('Reset weights', function () { if (timer) { clearInterval(timer); timer = null; } resetNet(s); });
      S.bc = K.button('Critical data', function () { s.data = 'critical'; resetNet(s); }); S.bg = K.button('Gapped data', function () { s.data = 'gapped'; resetNet(s); });
      K.endRow();
      K.canvas(330);
      K.info(function (s) { return 'Data: <b>' + s.data + (s.data === 'gapped' ? ' (ξ = ' + s.xi.toFixed(1) + ')' : '') + '</b> &nbsp; training steps: <b>' + s.steps + '</b> &nbsp; loss: <b>' + s.loss.toFixed(3) + '</b> &nbsp; learned depth: <b>' + depth() + '</b> layers'; });
    },
    show: function (K, s) { S.xi.w.style.display = s.level === 2 ? '' : 'none'; S.bc.style.display = S.bg.style.display = s.level === 2 ? 'none' : ''; },
    draw: function (K, s) {
      K.clear(); var g = K.g, t = target(s);
      HoloNet.draw(K, net, { cx: O.cx, cy: O.cy, R: O.R, showW: true }); K.text('line thickness = bond weight', O.cx, 318, '#a99dc7', 11, 'center');
      K.text('entropy against region size', 425, 16, '#a99dc7', 12, 'center');
      var model = []; for (var l = 1; l <= 16; l++) { var sum = 0; for (var st = 0; st < 32; st += 4) sum += net.entropy(net.interval(st, l)); model.push(sum / 8); }
      var pl = K.plot({ x0: 0, x1: 17, y0: 0, y1: 5, box: [310, 26, 230, 150], curves: [{ f: function (x) { return x < 1 ? NaN : t(x); }, col: '#ffd27f', label: 'data', dy: 14 }], xl: 'sites in region' });
      model.forEach(function (m, i) { K.dot(pl.X(i + 1), pl.Y(Math.min(5, m)), 3.5, '#7be0a4'); }); K.text('network', 318, 40, '#7be0a4', 11);
      K.text('bond weight by layer (rim to centre)', 425, 212, '#a99dc7', 12, 'center');
      for (var L = 0; L < 5; L++) { var x = 320 + L * 44, h = Math.min(1.3, net.wt[L]) / 1.3 * 80; g.fillStyle = '#261b3b'; g.fillRect(x, 222, 32, 80); g.fillStyle = net.wt[L] > 0.1 ? '#b26bff' : '#6b5c8f'; g.fillRect(x, 302 - h, 32, h); K.text(String(L + 1), x + 16, 316, '#a99dc7', 11, 'center'); }
    }
  });
})();
