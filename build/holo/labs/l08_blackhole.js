/* Lab 8: A black hole in AdS (BTZ). Boundary circle of length 2 pi, temperature T, units c/3 = 1. */
(function () {
  var EPS = 0.02, TP = 2 * Math.PI, THP = 1 / TP, O = { cx: 150, cy: 170, R: 120 };
  function direct(T, l) { var be = 1 / T; return Math.log(be / (Math.PI * EPS) * Math.sinh(Math.PI * l / be)); }
  function sbh(T) { return 2 * Math.PI * Math.PI * T; }
  function ent(s) { var l = s.l * Math.PI / 180, d = direct(s.T, l), w = direct(s.T, TP - l) + sbh(s.T); return { d: d, w: w, S: Math.min(d, w), wrapped: w < d, comp: Math.min(direct(s.T, TP - l), d + sbh(s.T)) }; }
  HoloLab({
    title: 'Lab 8: A black hole in AdS', intro: 'Heat the boundary theory and a black hole appears in the bulk. Its horizon (pink) changes which curves measure entanglement.',
    levels: [
      { title: 'Hot means a big horizon', text: 'Raise the temperature. The horizon grows, and its area is the thermal entropy of the boundary theory. Make the black hole entropy at least 20.',
        hint: 'Temperature a little above 1.0.', goals: [{ t: 'Black hole entropy is at least 20', ok: function (s) { return sbh(s.T) >= 20; } }], demo: function (s) { s.T = 1.1; } },
      { title: 'The curve that wraps the horizon', text: 'For a small region the gold curve stays outside the horizon. For a very large region it is cheaper to use the short curve on the other side plus the whole horizon. Then S(A) and S(rest) differ by exactly the black hole entropy. Lower the temperature a little and find such a region.',
        hint: 'Try temperature 0.25 and a region of 340 degrees or more.', enter: function (s) { s.T = 0.3; s.l = 120; },
        goals: [{ t: 'A region whose curve wraps the horizon', ok: function (s) { return s.T >= THP && ent(s).wrapped; } }], demo: function (s) { s.T = 0.25; s.l = 345; } },
      { title: 'The Hawking-Page switch', text: 'Cool the system. Below T = 1/2π (about 0.159) empty AdS filled with warm gas has lower free energy than the black hole, and the black hole is no longer the right geometry. Cross the switch in both directions.',
        hint: 'Go below 0.159, then back above it.', enter: function (s) { s.T = 0.5; s.l = 120; },
        goals: [{ t: 'Below the switch: thermal AdS wins', ok: function (s) { return s.T < THP; } }, { t: 'Above the switch again: the black hole wins', ok: function (s) { return s.T > THP && s.wasCold; } }],
        demo: function (s, K) { s.T = 0.1; K.update(); s.T = 0.4; } }
    ],
    reset: function (s) { s.T = 0.5; s.l = 120; s.wasCold = false; },
    tick: function (K, s) { if (s.T < THP) s.wasCold = true; },
    build: function (K, s) {
      K.slider('temperature T', 0.05, 1.5, 0.01, 'T', function (v) { return v.toFixed(2); });
      K.slider('size of region A', 10, 350, 1, 'l', function (v) { return v + '°'; });
      K.canvas(340);
      K.info(function (s) {
        var cold = s.T < THP, e = ent(s), F1 = -1 / 4, F2 = -Math.PI * Math.PI * s.T * s.T;
        var a = 'Free energy (units of c/3): thermal AdS <b>' + F1.toFixed(2) + '</b> &nbsp; black hole <b>' + F2.toFixed(2) + '</b> &nbsp; ' + (cold ? '<span style="color:#7ab8ff">thermal AdS wins</span>' : '<span style="color:#ff8fc7">black hole wins</span>');
        if (cold) return a + '<br><span class="k">No horizon: entanglement follows the zero-temperature rule.</span>';
        return a + '<br>Black hole entropy <b>' + sbh(s.T).toFixed(1) + '</b> &nbsp; S(A) = <b>' + e.S.toFixed(2) + '</b> &nbsp; S(rest) = <b>' + e.comp.toFixed(2) + '</b>' + (e.wrapped ? ' &nbsp;<span style="color:#ffd27f">wrapping: difference = black hole entropy</span>' : '');
      });
    },
    draw: function (K, s) {
      K.clear(); var g = K.g, cold = s.T < THP, l = s.l * Math.PI / 180, e = ent(s), rh = cold ? 0 : O.R * Math.min(0.85, 0.25 + 0.45 * Math.tanh(s.T * 1.4));
      g.fillStyle = '#120d1e'; g.beginPath(); g.arc(O.cx, O.cy, O.R, 0, 6.2832); g.fill(); K.circle(O.cx, O.cy, O.R, '#6b5c8f', 2);
      if (!cold) { g.fillStyle = '#000'; g.beginPath(); g.arc(O.cx, O.cy, rh, 0, 6.2832); g.fill(); K.circle(O.cx, O.cy, rh, '#ff8fc7', e.wrapped ? 4 : 2); }
      var a0 = -Math.PI / 2 - l / 2, a1 = -Math.PI / 2 + l / 2; g.strokeStyle = '#7be0a4'; g.lineWidth = 7; g.beginPath(); g.arc(O.cx, O.cy, O.R, a0, a1); g.stroke();
      /* schematic curve: an arc hugging the horizon */
      function curve(b0, b1, col) { var span = b1 - b0, depth = Math.max(rh + 6, O.R * (1 - Math.min(1, span / Math.PI) * 0.9)); g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); for (var k = 0; k <= 40; k++) { var u = k / 40, th = b0 + span * u, r = O.R - (O.R - depth) * Math.pow(Math.sin(Math.PI * u), 0.6); if (k) g.lineTo(O.cx + r * Math.cos(th), O.cy + r * Math.sin(th)); else g.moveTo(O.cx + r * Math.cos(th), O.cy + r * Math.sin(th)); } g.stroke(); }
      if (!cold && e.wrapped) curve(a1, a0 + TP, '#ffd27f'); else curve(a0, a1, '#ffd27f');
      K.text('A', O.cx, O.cy - O.R - 10, '#7be0a4', 14, 'center'); K.text(cold ? 'thermal AdS (no horizon)' : 'horizon', O.cx, O.cy + 4, cold ? '#7ab8ff' : '#ff8fc7', 11, 'center');
      K.text('entropy against size of A', 420, 20, '#a99dc7', 12, 'center');
      var T = cold ? null : s.T, f = function (deg) { var x = deg * Math.PI / 180; if (cold) return Math.log(2 / EPS * Math.sin(x / 2)); return Math.min(direct(T, x), direct(T, TP - x) + sbh(T)); };
      var top = cold ? 6 : Math.max(8, f(350) * 1.1); K.plot({ x0: 5, x1: 355, y0: 0, y1: top, box: [300, 30, 240, 260], curves: [{ f: f, col: '#ffd27f' }].concat(cold ? [] : [{ f: function (deg) { return direct(T, deg * Math.PI / 180); }, col: '#6b5c8f', w: 1, dash: [4, 4] }]), marks: [{ x: s.l, y: f(s.l) }], xl: 'size of A (degrees)' });
    }
  });
})();
