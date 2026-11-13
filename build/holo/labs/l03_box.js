/* Lab 3: AdS is a box. Radial motion in global AdS: sin(rho) = A sin(t) for a thrown ball, rho = t for light. */
(function () {
  var S = {}, HP = Math.PI / 2;
  function rho(s, t) { if (s.light) { var u = t % Math.PI; return u < HP ? u : Math.PI - u; } return Math.asin(s.A * Math.sin(t)); }
  HoloLab({
    title: 'Lab 3: AdS is a box', intro: 'Anti-de Sitter space pulls everything back to the middle. The picture shows the centre (middle line), the far-away boundary (left and right edges) and time running upwards.',
    levels: [
      { title: 'What goes out comes back', text: 'Throw a ball outwards from the centre. Choose a hard throw, then move the time slider to follow it out and back.',
        hint: 'Throw strength 0.9 or more, then slide time to π (about 3.14).',
        goals: [{ t: 'The ball gets far out (throw strength 0.9 or more)', ok: function (s) { return !s.light && s.A >= 0.9; } }, { t: 'The ball is back at the centre at time π', ok: function (s) { return !s.light && s.A >= 0.9 && Math.abs(s.t - Math.PI) < 0.06; } }],
        demo: function (s, K) { s.A = 0.95; s.t = 1.5; K.update(); s.t = 3.14; } },
      { title: 'Every throw takes the same time', text: 'Try a gentle throw and a hard throw. Whatever the strength, the ball returns at exactly time π. AdS acts like a perfect spring.',
        hint: 'Set the strength below 0.4 and slide time to π. Then set it above 0.8 and do the same.',
        goals: [{ t: 'A gentle throw (below 0.4) is back at time π', ok: function (s) { return !s.light && s.A < 0.4 && Math.abs(s.t - Math.PI) < 0.06; } }, { t: 'A hard throw (above 0.8) is back at time π', ok: function (s) { return !s.light && s.A > 0.8 && Math.abs(s.t - Math.PI) < 0.06; } }],
        enter: function (s) { s.A = 0.6; },
        demo: function (s, K) { s.A = 0.3; s.t = 3.14; K.update(); s.A = 0.9; } },
      { title: 'Light reaches the edge', text: 'Switch to a flash of light. Light travels to the boundary and back in a finite time, even though the boundary is infinitely far away. Then move the probe: clocks near the boundary run fast compared with the centre.',
        hint: 'Press the light button and slide time to π/2 (about 1.57). Then slide the probe beyond 1.47.',
        goals: [{ t: 'Light is at the boundary at time π/2', ok: function (s) { return s.light && Math.abs(s.t - HP) < 0.06; } }, { t: 'A place where the redshift factor is 10 or more', ok: function (s) { return 1 / Math.cos(s.probe) >= 10; } }],
        demo: function (s, K) { s.light = true; s.t = 1.57; K.update(); s.probe = 1.5; } }
    ],
    reset: function (s) { s.A = 0.5; s.t = 0; s.light = false; s.probe = 0.5; },
    build: function (K, s) {
      S.A = K.slider('throw strength', 0.1, 0.99, 0.01, 'A', function (v) { return v.toFixed(2); });
      S.t = K.slider('time', 0, 6.28, 0.02, 't', function (v) { return v.toFixed(2); });
      S.p = K.slider('probe position', 0, 1.55, 0.01, 'probe', function (v) { return v.toFixed(2); });
      K.row(); S.lb = K.button('Ball / light', function () { s.light = !s.light; }); K.endRow();
      K.canvas(380);
      K.info(function (s) { return (s.light ? 'Light' : 'Ball') + ' at angle-distance <b>' + rho(s, s.t).toFixed(2) + '</b> of 1.57 at time <b>' + s.t.toFixed(2) + '</b>' + (s.level === 2 ? '<br>Redshift factor at the probe (1 / cos ρ): <b>' + (1 / Math.cos(s.probe)).toFixed(1) + '</b>' : '<br><span class="k">Furthest point of this throw: ' + (s.light ? '1.57 (the boundary)' : Math.asin(s.A).toFixed(2)) + '</span>'); });
    },
    show: function (K, s) { S.p.w.style.display = s.level === 2 ? '' : 'none'; S.lb.style.display = s.level === 2 ? '' : 'none'; },
    draw: function (K, s) {
      K.clear(); var g = K.g, L = 60, Rr = 500, T = 20, B = 350, X = function (r) { return (L + Rr) / 2 + r / HP * (Rr - L) / 2; }, Y = function (t) { return B - t / 6.28 * (B - T); };
      g.fillStyle = '#120d1e'; g.fillRect(L, T, Rr - L, B - T); K.line(L, T, L, B, '#b26bff', 3); K.line(Rr, T, Rr, B, '#b26bff', 3); K.line(X(0), T, X(0), B, 'rgba(122,184,255,0.4)', 1);
      K.text('boundary', L, 366, '#b26bff', 11, 'center'); K.text('boundary', Rr, 366, '#b26bff', 11, 'center'); K.text('centre', X(0), 366, '#7ab8ff', 11, 'center'); K.text('time', 30, T + 10, '#a99dc7', 11, 'center');
      [HP, Math.PI, 3 * HP, 2 * Math.PI].forEach(function (t, i) { K.line(L, Y(t), Rr, Y(t), 'rgba(255,255,255,0.08)', 1); K.text(['π/2', 'π', '3π/2', '2π'][i], L - 8, Y(t) + 4, '#a99dc7', 11, 'right'); });
      g.strokeStyle = s.light ? '#ffd27f' : '#7be0a4'; g.lineWidth = 2.5; g.beginPath();
      for (var k = 0; k <= 314; k++) { var t = k * 0.02, r = rho(s, t); if (!s.light && Math.sin(t) < 0) { } var sign = s.light ? 1 : 1; var xx = X(s.light ? r : Math.asin(s.A * Math.sin(t))); if (k) g.lineTo(xx, Y(t)); else g.moveTo(xx, Y(t)); }
      g.stroke();
      var rr = s.light ? rho(s, s.t) : Math.asin(s.A * Math.sin(s.t)); K.dot(X(rr), Y(s.t), 7, '#fff');
      if (s.level === 2) { K.line(X(s.probe), T, X(s.probe), B, '#ff8fc7', 1.5); K.text('probe', X(s.probe), T + 12, '#ff8fc7', 11, 'center'); }
    }
  });
})();
