/* Lab 4: The entanglement dial. Two qubits in cos(theta)|00> + sin(theta)|11>. */
(function () {
  function p(s) { var c = Math.cos(s.th * Math.PI / 180); return c * c; }
  function h(x) { return x <= 0 || x >= 1 ? 0 : -x * Math.log2(x) - (1 - x) * Math.log2(1 - x); }
  function ent(s) { return h(p(s)); }
  HoloLab({
    title: 'Lab 4: The entanglement dial', intro: 'Two qubits, A and B, share the state cos θ |00⟩ + sin θ |11⟩. Turn the dial and watch how much entanglement they share, measured by the entropy of A alone.',
    levels: [
      { title: 'From none to the most', text: 'At θ = 0 the pair is simply |00⟩: no entanglement, and A on its own has zero entropy. Find that, then find the dial setting with the most entanglement: one full bit.',
        hint: '0 degrees, then 45 degrees.', enter: function (s) { s.th = 20; },
        goals: [{ t: 'Entropy of A is 0 (no entanglement)', ok: function (s) { return ent(s) < 0.005; } }, { t: 'Entropy of A is 1 bit (maximal entanglement)', ok: function (s) { return ent(s) > 0.995; } }],
        demo: function (s, K) { s.th = 0; K.update(); s.th = 45; } },
      { title: 'Half a bit', text: 'Entropy is not all-or-nothing. Find a dial setting where A has about half a bit of entropy.',
        hint: 'Near 19 degrees (or near 71).', enter: function (s) { s.th = 45; },
        goals: [{ t: 'Entropy of A is between 0.47 and 0.53 bits', ok: function (s) { return Math.abs(ent(s) - 0.5) < 0.03; } }],
        demo: function (s) { s.th = 19.5; } },
      { title: 'Pure whole, mixed parts', text: 'The pair as a whole is in one definite state, so its entropy is 0. Yet each half looks random. The mutual information, S(A) + S(B) − S(AB), counts what they share. Make it at least 1.5 bits, then measure 20 pairs and compare the results on both sides.',
        hint: 'Mutual information is twice S(A). Set θ near 45 degrees, then press Measure.', enter: function (s) { s.th = 10; },
        goals: [{ t: 'Mutual information is at least 1.5 bits', ok: function (s) { return 2 * ent(s) >= 1.5; } }, { t: 'Measured 20 pairs: A and B always agree', ok: function (s) { return s.meas.length >= 20 && s.meas.every(function (m) { return m[0] === m[1]; }); } }],
        demo: function (s, K) { s.th = 45; K.update(); measure(s); } }
    ],
    reset: function (s) { s.th = 20; s.meas = []; },
    build: function (K, s) {
      K.slider('dial θ (degrees)', 0, 90, 0.5, 'th', function (v) { return v.toFixed(1) + '°'; });
      K.row(); K.button('Measure 20 pairs', function () { measure(s); }, ''); K.endRow();
      K.canvas(300);
      K.info(function (s) { return 'S(A) = S(B) = <b>' + ent(s).toFixed(3) + '</b> bits &nbsp; S(AB) = <b>0</b> &nbsp; mutual information = <b>' + (2 * ent(s)).toFixed(3) + '</b> bits'; });
    },
    draw: function (K, s) {
      K.clear(); var g = K.g, P = p(s), bars = [['|00⟩', P, '#7ab8ff'], ['|01⟩', 0, '#6b5c8f'], ['|10⟩', 0, '#6b5c8f'], ['|11⟩', 1 - P, '#ff8fc7']];
      K.text('chance of each result', 130, 18, '#a99dc7', 12, 'center');
      bars.forEach(function (b, k) { var x = 30 + k * 55; g.fillStyle = '#261b3b'; g.fillRect(x, 30, 40, 150); g.fillStyle = b[2]; g.fillRect(x, 180 - b[1] * 150, 40, b[1] * 150); K.text(b[0], x + 20, 196, '#f1ebff', 12, 'center'); K.text((b[1] * 100).toFixed(0) + '%', x + 20, 26 + (1 - b[1]) * 150 - 0, '#a99dc7', 10, 'center'); });
      K.text('entropy of A (bits)', 400, 18, '#a99dc7', 12, 'center');
      K.plot({ x0: 0, x1: 90, y0: 0, y1: 1.05, box: [290, 30, 240, 150], curves: [{ f: function (x) { var c = Math.cos(x * Math.PI / 180); return h(c * c); }, col: '#b26bff' }], marks: [{ x: s.th, y: ent(s) }], xl: 'θ' });
      K.text('measurements (A over B):', 30, 226, '#a99dc7', 12);
      s.meas.forEach(function (m, i) { var x = 30 + i * 25; g.fillStyle = m[0] ? '#ff8fc7' : '#7ab8ff'; g.fillRect(x, 236, 20, 20); g.fillStyle = m[1] ? '#ff8fc7' : '#7ab8ff'; g.fillRect(x, 260, 20, 20); K.text(String(m[0]), x + 10, 251, '#120d1e', 12, 'center'); K.text(String(m[1]), x + 10, 275, '#120d1e', 12, 'center'); });
    }
  });
  function measure(s) { s.meas = []; for (var i = 0; i < 20; i++) { var b = Math.random() < p(s) ? 0 : 1; s.meas.push([b, b]); } }
})();
