/* Lab 5: The large N dial. lambda = g^2 N, L/ls = lambda^(1/4), gravity strength ~ 1/N^2. */
(function () {
  function N(s) { return Math.round(Math.pow(10, s.lN)); } function lam(s) { return Math.pow(10, s.lg) * N(s); }
  function regime(s) { var l = lam(s), n = N(s); if (l >= 100 && n >= 100) return ['Classical gravity works', '#7be0a4']; if (l <= 0.1) return ['Ordinary gauge theory maths works', '#7ab8ff']; if (l >= 100) return ['Strings are small, but gravity is still quantum (N too small)', '#ffd27f']; return ['The hard middle: neither side is easy', '#ff8fc7']; }
  HoloLab({
    title: 'Lab 5: The large N dial', intro: 'The gauge theory has two knobs: the number of colours N and the coupling g². Together they set the size of the curved space, measured in string lengths, and how quantum gravity is.',
    levels: [
      { title: 'Make the strings small', text: 'The curved space has radius L. Measured in string lengths, L/ℓ<sub>s</sub> = λ<sup>1/4</sup>, where λ = g²N is the \'t Hooft coupling. Make λ at least 100 so the space is much bigger than a string.',
        hint: 'Raise g² and N until λ = g²N passes 100.',
        goals: [{ t: "'t Hooft coupling λ is at least 100", ok: function (s) { return lam(s) >= 100; } }], demo: function (s) { s.lN = 2; s.lg = 0.2; } },
      { title: 'Make gravity classical', text: 'Quantum wobbles of space are controlled by 1/N². Push N up to at least 100 while keeping λ at least 100. Then Einstein\'s ordinary gravity describes the bulk.',
        hint: 'N = 100 or more, and g² big enough that g²N is 100 or more.',
        goals: [{ t: 'N is at least 100 and λ is at least 100', ok: function (s) { return lam(s) >= 100 && N(s) >= 100; } }], demo: function (s) { s.lN = 2.5; s.lg = 0; } },
      { title: 'The easy corners never overlap', text: 'Now make the gauge theory easy instead: λ at most 0.1. Look at the size of the space: smaller than a string, so gravity is no use there. Visit both corners. The duality is powerful because each side is easy exactly where the other is hard.',
        hint: 'Lower g² until λ is below 0.1. Then go back to N and λ both above 100.',
        goals: [{ t: 'Weak coupling corner: λ at most 0.1', ok: function (s) { return lam(s) <= 0.1; } }, { t: 'Gravity corner: N and λ both at least 100', ok: function (s) { return lam(s) >= 100 && N(s) >= 100; } }],
        demo: function (s, K) { s.lN = 1; s.lg = -2.5; K.update(); s.lN = 2.5; s.lg = 0; } }
    ],
    reset: function (s) { s.lN = 0.5; s.lg = -1; },
    build: function (K, s) {
      K.slider('colours N', 0.3, 3, 0.02, 'lN', function (v, s) { return String(N(s)); });
      K.slider('coupling g²', -3, 1, 0.02, 'lg', function (v) { return Math.pow(10, v).toPrecision(2); });
      K.canvas(300);
      K.info(function (s) { var r = regime(s); return 'λ = g²N = <b>' + lam(s).toPrecision(3) + '</b> &nbsp; L/ℓ<sub>s</sub> = <b>' + Math.pow(lam(s), 0.25).toFixed(2) + '</b> &nbsp; quantum gravity effects ~ 1/N² = <b>' + (1 / (N(s) * N(s))).toPrecision(2) + '</b><br><span style="color:' + r[1] + '">' + r[0] + '</span>'; });
    },
    draw: function (K, s) {
      K.clear(); var g = K.g, b = [70, 20, 440, 240], X = function (ll) { return b[0] + (ll + 3) / 7 * b[2]; }, Y = function (ln) { return b[1] + b[3] - (ln - 0.3) / 2.7 * b[3]; };
      g.fillStyle = '#120d1e'; g.fillRect(b[0], b[1], b[2], b[3]);
      g.fillStyle = 'rgba(122,184,255,0.18)'; g.fillRect(b[0], b[1], X(-1) - b[0], b[3]); g.fillStyle = 'rgba(123,224,164,0.22)'; g.fillRect(X(2), b[1], b[0] + b[2] - X(2), Y(2) - b[1]);
      g.fillStyle = 'rgba(255,210,127,0.12)'; g.fillRect(X(2), Y(2), b[0] + b[2] - X(2), b[1] + b[3] - Y(2));
      K.text('gauge theory', X(-2), b[1] + 20, '#7ab8ff', 12, 'center'); K.text('easy', X(-2), b[1] + 36, '#7ab8ff', 12, 'center'); K.text('classical gravity easy', X(3), b[1] + 20, '#7be0a4', 12, 'center'); K.text('hard for both', X(0.5), b[1] + 120, '#ff8fc7', 12, 'center');
      g.strokeStyle = '#3a2d55'; g.strokeRect(b[0], b[1], b[2], b[3]);
      K.text("'t Hooft coupling λ (log scale)", b[0] + b[2] / 2, 284, '#a99dc7', 11, 'center'); K.text('N', 40, b[1] + b[3] / 2, '#a99dc7', 12, 'center');
      [-3, -1, 0, 2, 4].forEach(function (v) { K.text('10^' + v, X(v), 272, '#a99dc7', 10, 'center'); }); [1, 2, 3].forEach(function (v) { K.text('10^' + v, 62, Y(v) + 4, '#a99dc7', 10, 'right'); });
      var ll = Math.max(-3, Math.min(4, Math.log10(lam(s)))); K.dot(X(ll), Y(s.lN), 8, '#fff'); K.circle(X(ll), Y(s.lN), 12, '#b26bff', 2);
    }
  });
})();
