/* Lab 12: The Page curve. A random pure state of 12 qubits stands in for an evaporating black hole. Renyi-2 entropies, exact. */
(function () {
  var NQ = 12, DIM = 1 << NQ;
  function gauss() { var u = Math.random() || 1e-9, v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); }
  function randState() { var re = new Float64Array(DIM), im = new Float64Array(DIM), n = 0, i; for (i = 0; i < DIM; i++) { re[i] = gauss(); im[i] = gauss(); n += re[i] * re[i] + im[i] * im[i]; } n = Math.sqrt(n); for (i = 0; i < DIM; i++) { re[i] /= n; im[i] /= n; } return { re: re, im: im }; }
  /* M_a is the dA x dB matrix of state a (rows: first k qubits = radiation, columns: the rest).
     purA = Tr[(sum_a M_a M_a^dag / n)^2], purB = Tr[(sum_a M_a^dag M_a / n)^2]. Uses whichever index is smaller. */
  function gramPurity(vecs, k, onA) {
    var dA = 1 << k, dB = DIM >> k, n = onA ? dA : dB, m = onA ? dB : dA, gr = new Float64Array(n * n), gi = new Float64Array(n * n), i, j, x, p = 0, A = vecs.length;
    vecs.forEach(function (v) { for (i = 0; i < n; i++) for (j = i; j < n; j++) { var sr = 0, si = 0; for (x = 0; x < m; x++) { var a = onA ? i * dB + x : x * dB + i, b = onA ? j * dB + x : x * dB + j; sr += v.re[a] * v.re[b] + v.im[a] * v.im[b]; si += v.im[a] * v.re[b] - v.re[a] * v.im[b]; } gr[i * n + j] += sr; gi[i * n + j] += si; } });
    for (i = 0; i < n; i++) for (j = i; j < n; j++) p += (i === j ? 1 : 2) * (gr[i * n + j] * gr[i * n + j] + gi[i * n + j] * gi[i * n + j]);
    return p / (A * A);
  }
  function pairPurity(vecs, k, onA) {           // same quantity through the other index: sum over pairs of states of |M_a^dag M_b|^2 (onA) or |M_a M_b^dag|^2
    var dA = 1 << k, dB = DIM >> k, n = onA ? dB : dA, m = onA ? dA : dB, p = 0, A = vecs.length;
    for (var a1 = 0; a1 < A; a1++) for (var a2 = 0; a2 < A; a2++) { var u = vecs[a1], w = vecs[a2]; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { var sr = 0, si = 0; for (var x = 0; x < m; x++) { var ia = onA ? x * dB + i : i * dB + x, ib = onA ? x * dB + j : j * dB + x; sr += u.re[ia] * w.re[ib] + u.im[ia] * w.im[ib]; si += u.im[ia] * w.re[ib] - u.re[ia] * w.im[ib]; } p += sr * sr + si * si; } }
    return p / (A * A);
  }
  function purA(vecs, k) { return (1 << k) <= (DIM >> k) ? gramPurity(vecs, k, true) : pairPurity(vecs, k, true); }
  function purB(vecs, k) { return (DIM >> k) <= (1 << k) ? gramPurity(vecs, k, false) : pairPurity(vecs, k, false); }
  function compute(s) {
    s.psi = [randState(), randState()]; s.S2 = []; s.I2 = [];
    for (var k = 0; k <= NQ; k++) {
      s.S2.push(k === 0 || k === NQ ? 0 : -Math.log2(purA([s.psi[0]], k)));
      /* diary: a reference qubit R records which of two scrambled states the hole is in. I2(R:rad) = S2(R) + S2(rad) - S2(R + rad),
         and S2(R + rad) = S2(rest of the hole) because the whole thing is pure. */
      var sRad = k === 0 ? 0 : -Math.log2(purA(s.psi, k)), sRest = k === NQ ? 0 : -Math.log2(purB(s.psi, k));
      s.I2.push(Math.max(0, 1 + sRad - sRest));
    }
  }
  window.PageSim = { compute: compute, NQ: NQ, purA: purA, purB: purB };
  function correct(k) { return k <= NQ / 2 ? 'none' : 'island'; }
  HoloLab({
    title: 'Lab 12: The Page curve', intro: 'A black hole of 12 qubits evaporates one qubit at a time. The dots are the real entanglement entropy of the radiation, computed from a random (fully scrambled) quantum state.',
    levels: [
      { title: 'Hawking against Page', text: 'Slide the number of qubits radiated. Hawking\'s calculation says the entropy of the radiation just keeps rising (pink). If the process is ordinary quantum mechanics, it must turn over halfway and return to zero (gold). The measured dots follow the gold curve. Visit the turning point and the end.',
        hint: 'Go to 6 qubits (the Page time), then to 12.', goals: [{ t: 'At the Page time: 6 of 12 qubits radiated', ok: function (s) { return s.k === 6; } }, { t: 'Fully evaporated: the entropy is back to zero', ok: function (s) { return s.k === 12; } }],
        demo: function (s, K) { s.k = 6; K.update(); s.k = 12; } },
      { title: 'The island rule', text: 'The modern formula says: work out the entropy two ways, without an island (rises with the radiation) and with an island inside the black hole (equals what is left of the black hole), and take the smaller. Choose the winning answer before and after the Page time.',
        hint: 'At 3 qubits choose "No island". At 9 qubits choose "Island".', enter: function (s) { s.k = 3; },
        goals: [{ t: 'Right choice at an early time (before 6)', ok: function (s) { return s.right.early; } }, { t: 'Right choice at a late time (after 6)', ok: function (s) { return s.right.late; } }],
        demo: function (s, K) { s.k = 3; s.choice = 'none'; K.update(); s.k = 9; s.choice = 'island'; } },
      { title: 'When can you read the diary?', text: 'Alice drops a one-qubit diary into the black hole. The green curve shows how much the radiation knows about it (2 means everything). Before the Page time: almost nothing. Soon after: almost all of it. Find the earliest moment when the radiation holds at least 1.8.',
        hint: 'Slide forward from 6 until the green readout passes 1.8, and stop at the first such step.', enter: function (s) { s.k = 2; },
        goals: [{ t: 'Earliest step where the radiation knows at least 1.8 of the diary', ok: function (s) { return s.I2[s.k] >= 1.8 && s.I2[s.k - 1] < 1.8; } }],
        demo: function (s) { for (var k = 1; k <= NQ; k++) if (s.I2[k] >= 1.8) { s.k = k; break; } } }
    ],
    reset: function (s) { s.k = 1; s.choice = null; s.right = {}; if (!s.S2) compute(s); },
    tick: function (K, s) { if (s.level === 1 && s.choice && s.choice === correct(s.k) && s.k !== 6) { if (s.k < 6) s.right.early = true; else s.right.late = true; } },
    build: function (K, s) {
      K.slider('qubits radiated', 0, NQ, 1, 'k', function (v) { return v + ' of ' + NQ; });
      K.row(); K.button('No island', function () { s.choice = 'none'; }); K.button('Island', function () { s.choice = 'island'; }); K.button('New random black hole', function () { compute(s); }); K.endRow();
      K.canvas(320);
      K.info(function (s) {
        var t = 'Radiated <b>' + s.k + '</b> &nbsp; Hawking: <b>' + s.k + '</b> &nbsp; Page: <b>' + Math.min(s.k, NQ - s.k) + '</b> &nbsp; measured: <b>' + s.S2[s.k].toFixed(2) + '</b>';
        if (s.level === 1) t += '<br>Without island: <b>' + s.k + '</b> &nbsp; with island: <b>' + (NQ - s.k) + '</b> &nbsp; your choice: <b>' + (s.choice ? (s.choice === 'none' ? 'no island' : 'island') : '?') + '</b> ' + (s.choice ? (s.choice === correct(s.k) || s.k === 6 ? '<span style="color:#7be0a4">smaller, correct</span>' : '<span style="color:#ff7a9a">not the smaller one</span>') : '');
        if (s.level === 2) t += '<br>Radiation knows <b>' + s.I2[s.k].toFixed(2) + '</b> of 2 about the diary';
        return t;
      });
    },
    draw: function (K, s) {
      K.clear(); var pl = K.plot({ x0: 0, x1: NQ, y0: 0, y1: NQ * 0.75, box: [40, 20, 480, 260], curves: [{ f: function (x) { return x; }, col: '#ff8fc7', label: '', w: 2, dash: [5, 4] }, { f: function (x) { return Math.min(x, NQ - x); }, col: '#ffd27f', w: 2 }], marks: [{ x: s.k, col: '#fff' }], xl: 'qubits radiated (time)', yl: 'entropy of the radiation (bits)' });
      K.text('Hawking', pl.X(8.2), pl.Y(8.4), '#ff8fc7', 12); K.text('Page', pl.X(9.2), pl.Y(3.4), '#ffd27f', 12);
      for (var k = 0; k <= NQ; k++) K.dot(pl.X(k), pl.Y(s.S2[k]), 4.5, '#7ab8ff');
      if (s.level === 2) { var g = K.g; g.strokeStyle = '#7be0a4'; g.lineWidth = 2.5; g.beginPath(); for (k = 0; k <= NQ; k++) { var y = pl.Y(s.I2[k] * NQ * 0.75 / 2.2); if (k) g.lineTo(pl.X(k), y); else g.moveTo(pl.X(k), y); } g.stroke(); K.text('diary information (0 to 2)', pl.X(0.3), pl.Y(8.3), '#7be0a4', 12); }
      K.line(pl.X(6), 20, pl.X(6), 280, 'rgba(255,255,255,0.25)', 1); K.text('Page time', pl.X(6), 300, '#a99dc7', 11, 'center');
    }
  });
})();
