/* Lab 10: The three-qutrit code. One logical qutrit hidden in three; any two can recover it. Real amplitudes, exact simulation. */
(function () {
  var Q = {};
  var CODE = [[[0, 0, 0], [1, 1, 1], [2, 2, 2]], [[0, 1, 2], [1, 2, 0], [2, 0, 1]], [[0, 2, 1], [1, 0, 2], [2, 1, 0]]];
  var UMAP = { '00': '00', '11': '01', '22': '02', '01': '12', '12': '10', '20': '11', '02': '21', '10': '22', '21': '20' };
  var INPUTS = [['|0⟩', [1, 0, 0]], ['|1⟩', [0, 1, 0]], ['|2⟩', [0, 0, 1]], ['|0⟩+|1⟩', [0.7071, 0.7071, 0]], ['|0⟩−|2⟩', [0.7071, 0, -0.7071]], ['|0⟩+|1⟩+|2⟩', [0.57735, 0.57735, 0.57735]]];
  function idx(d) { return d[0] * 9 + d[1] * 3 + d[2]; } function digits(i) { return [Math.floor(i / 9), Math.floor(i / 3) % 3, i % 3]; }
  Q.encode = function (v) { var psi = new Array(27).fill(0); for (var l = 0; l < 3; l++) CODE[l].forEach(function (d) { psi[idx(d)] += v[l] / Math.sqrt(3); }); return psi; };
  /* scramble qutrit k with a "random error": a shift and sign flips, different for each basis value */
  Q.scramble = function (psi, k, seed) { var out = new Array(27).fill(0), sh = 1 + (seed % 2), sg = [1, -1, seed % 3 === 0 ? 1 : -1]; for (var i = 0; i < 27; i++) { var d = digits(i), v = d[k]; d[k] = (v + sh) % 3; out[idx(d)] += psi[i] * sg[v]; } return out; };
  /* apply the decoding unitary on the cyclic pair (a, a+1): the logical qutrit lands on qutrit a */
  Q.decode = function (psi, a) { var b = (a + 1) % 3, out = new Array(27).fill(0); for (var i = 0; i < 27; i++) { var d = digits(i), m = UMAP['' + d[a] + d[b]]; d[a] = +m[0]; d[b] = +m[1]; out[idx(d)] += psi[i]; } return out; };
  /* reduced density matrix of qutrit k */
  Q.rho = function (psi, k) { var r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (var i = 0; i < 27; i++) for (var j = 0; j < 27; j++) { var a = digits(i), b = digits(j), same = true; for (var q = 0; q < 3; q++) if (q !== k && a[q] !== b[q]) same = false; if (same) r[a[k]][b[k]] += psi[i] * psi[j]; } return r; };
  Q.fidelity = function (psi, k, v) { var r = Q.rho(psi, k), f = 0; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) f += v[i] * r[i][j] * v[j]; return f; };
  Q.INPUTS = INPUTS; window.Qutrit = Q;
  function fresh(s) { s.psi = Q.encode(INPUTS[s.inp][1]); s.lost = -1; s.fid = null; s.pair = -1; s.look = -1; }
  HoloLab({
    title: 'Lab 10: The three-qutrit code', intro: 'A qutrit is like a qubit with three levels. One logical qutrit is spread over three physical qutrits so that no single one knows anything about it, yet any two together can get it back. This is the smallest model of how the bulk hides in the boundary.',
    levels: [
      { title: 'Hide a qutrit', text: 'Choose a message and encode it. Then look at one physical qutrit on its own. Whatever the message, it looks completely random: equal chances of 0, 1 and 2.',
        hint: 'Press a message button, then one of the Look buttons.', goals: [{ t: 'Looked at a single qutrit of the encoded state', ok: function (s) { return s.look >= 0; } }, { t: 'Tried a second, different message and looked again', ok: function (s) { return Object.keys(s.looked).length >= 2; } }],
        demo: function (s, K) { s.inp = 1; fresh(s); s.look = 0; K.update(); s.inp = 4; fresh(s); s.look = 2; } },
      { title: 'Lose one, recover anyway', text: 'Erase a qutrit (it gets scrambled by an unknown error). Then decode using the other two. The message comes back perfectly, whichever one was lost. Do it for each of the three.',
        hint: 'Erase 1, decode with 2+3. Reset, erase 2, decode with 3+1. Reset, erase 3, decode with 1+2.',
        goals: [0, 1, 2].map(function (k) { return { t: 'Recovered after losing qutrit ' + (k + 1), ok: function (s) { return !!s.rec[k]; } }; }),
        demo: function (s, K) { [0, 1, 2].forEach(function (k) { fresh(s); erase(s, k); decode(s, (k + 1) % 3); K.update(); }); } },
      { title: 'Use a damaged pair', text: 'Now try decoding with a pair that includes the erased qutrit. The recovery fails. The same logical qutrit can be read from qutrits 1+2, or 2+3, or 3+1, but only if that pair is intact. In holography: the same bulk operator can be rebuilt on different boundary regions.',
        hint: 'Erase qutrit 1, then decode with 1+2.', goals: [{ t: 'A failed recovery (fidelity below 0.9)', ok: function (s) { return s.failed; } }, { t: 'A successful one for comparison', ok: function (s) { return s.rec[0] || s.rec[1] || s.rec[2]; } }],
        demo: function (s, K) { fresh(s); erase(s, 0); decode(s, 0); K.update(); fresh(s); erase(s, 0); decode(s, 1); } }
    ],
    reset: function (s) { s.inp = 0; s.rec = {}; s.failed = false; s.looked = {}; s.seed = 1; fresh(s); },
    tick: function (K, s) { if (s.look >= 0) s.looked[s.inp] = 1; if (s.fid !== null) { if (s.fid > 0.99 && s.lost >= 0) s.rec[s.lost] = 1; if (s.fid < 0.9) s.failed = true; } },
    build: function (K, s) {
      K.row(); INPUTS.forEach(function (x, i) { K.button(x[0], function () { s.inp = i; fresh(s); }); }); K.endRow();
      K.row(); [0, 1, 2].forEach(function (k) { K.button('Look at ' + (k + 1), function () { s.look = k; }); }); K.endRow();
      K.row(); [0, 1, 2].forEach(function (k) { K.button('Erase ' + (k + 1), function () { erase(s, k); }); }); K.endRow();
      K.row(); [[0, '1+2'], [1, '2+3'], [2, '3+1']].forEach(function (p) { K.button('Decode with ' + p[1], function () { decode(s, p[0]); }, ''); }); K.button('Reset', function () { fresh(s); }); K.endRow();
      K.canvas(250);
      K.info(function (s) {
        var t = 'Message: <b>' + INPUTS[s.inp][0] + '</b>';
        if (s.look >= 0) { var r = Q.rho(s.psi, s.look); t += '<br>Qutrit ' + (s.look + 1) + ' alone: chance of 0, 1, 2 = <b>' + [0, 1, 2].map(function (i) { return (r[i][i] * 100).toFixed(0) + '%'; }).join(', ') + '</b> (entropy ' + (-[0, 1, 2].reduce(function (a, i) { return a + (r[i][i] > 1e-9 ? r[i][i] * Math.log2(r[i][i]) : 0); }, 0)).toFixed(2) + ' bits of a possible 1.58)'; }
        if (s.fid !== null) t += '<br>Decoded with qutrits ' + ['1+2', '2+3', '3+1'][s.pair] + ': fidelity with the message = <b>' + s.fid.toFixed(3) + '</b> ' + (s.fid > 0.99 ? '<span style="color:#7be0a4">recovered</span>' : '<span style="color:#ff7a9a">lost</span>');
        return t;
      });
    },
    draw: function (K, s) {
      K.clear(); var g = K.g, pts = [[280, 50], [400, 200], [160, 200]];
      K.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#3a2d55', 2); K.line(pts[1][0], pts[1][1], pts[2][0], pts[2][1], '#3a2d55', 2); K.line(pts[2][0], pts[2][1], pts[0][0], pts[0][1], '#3a2d55', 2);
      if (s.pair >= 0) { var a = pts[s.pair], b = pts[(s.pair + 1) % 3]; K.line(a[0], a[1], b[0], b[1], s.fid > 0.99 ? '#7be0a4' : '#ff7a9a', 5); }
      K.dot(280, 150, 16, '#b26bff'); K.text('logical', 280, 178, '#b26bff', 11, 'center'); K.text(INPUTS[s.inp][0], 280, 154, '#120d1e', 10, 'center');
      pts.forEach(function (p, k) { var lost = s.lost === k; K.dot(p[0], p[1], 24, lost ? '#ff7a9a' : '#7ab8ff'); K.text(String(k + 1), p[0], p[1] + 6, '#120d1e', 18, 'center'); K.text(lost ? 'erased' : (s.pair === k && s.fid > 0.99 ? 'message here' : 'physical qutrit'), p[0], p[1] + 42, lost ? '#ff7a9a' : '#a99dc7', 11, 'center'); if (s.look === k) K.circle(p[0], p[1], 29, '#ffd27f', 2); });
    }
  });
  function erase(s, k) { if (s.lost >= 0 || s.fid !== null) fresh(s); s.seed++; s.psi = Q.scramble(s.psi, k, s.seed); s.lost = k; s.look = -1; }
  function decode(s, a) { if (s.fid !== null) return; s.psi = Q.decode(s.psi, a); s.pair = a; s.fid = Q.fidelity(s.psi, a, INPUTS[s.inp][1]); s.look = -1; }
})();
