/* Lab 2: Walk the hyperbolic disk. Distances, straight lines and room near the edge. */
(function () {
  var G = HoloGeo, S = {}, O = { cx: 280, cy: 200, R: 185 }, grab = null;
  function ang(p, q) { var d = Math.abs(Math.atan2(p.y, p.x) - Math.atan2(q.y, q.x)); return d > Math.PI ? 2 * Math.PI - d : d; }
  function rad(p) { return Math.hypot(p.x, p.y); }
  HoloLab({
    title: 'Lab 2: Walk the hyperbolic disk', intro: 'This disk is a map of the whole hyperbolic plane. The rings are equally spaced for someone living inside, even though they bunch up on the map. Drag the two points.',
    levels: [
      { title: 'Steps that look smaller', text: 'P sits at the centre. Drag Q outwards. On the map Q slows down near the edge, but the real (hyperbolic) distance keeps growing. The edge is infinitely far away.',
        hint: 'Drag Q almost to the rim. Distance 5 needs Q at 98.7% of the way out.',
        enter: function (s) { s.P = { x: 0, y: 0 }; s.Q = { x: 0.3, y: 0 }; s.lockP = true; },
        goals: [{ t: 'Q is at hyperbolic distance 3 or more from P', ok: function (s) { return G.dist(s.P, s.Q) >= 3; } }, { t: 'Q is at distance 5 or more', ok: function (s) { return G.dist(s.P, s.Q) >= 5; } }],
        demo: function (s) { s.Q = { x: 0.9875, y: 0 }; } },
      { title: 'Straight lines bend', text: 'The shortest path between two points (a geodesic) is drawn in gold. On the map it is an arc that meets the rim at right angles. First place both points far out and well apart to see it bend inwards. Then put them on opposite sides, so the path runs through the centre.',
        hint: 'Bend: both points beyond 70% of the radius, about a quarter turn apart. Straight: exactly opposite each other.',
        enter: function (s) { s.P = { x: 0.3, y: 0.1 }; s.Q = { x: 0.35, y: -0.2 }; s.lockP = false; },
        goals: [{ t: 'A clearly bent geodesic (both points far out, at least 60 degrees apart, not opposite)', ok: function (s) { var a = ang(s.P, s.Q); return rad(s.P) > 0.7 && rad(s.Q) > 0.7 && a > 1.047 && a < 2.6; } },
                { t: 'A straight geodesic through the centre (points opposite)', ok: function (s) { return rad(s.P) > 0.3 && rad(s.Q) > 0.3 && ang(s.P, s.Q) > 3.05; } }],
        demo: function (s, K) { s.P = { x: 0.8, y: 0 }; s.Q = { x: 0, y: 0.8 }; K.update(); s.Q = { x: -0.8, y: 0 }; } },
      { title: 'Room near the edge', text: 'Draw a circle of hyperbolic radius ρ around the centre. In flat space its circumference is 2πρ. Here it is 2π sinh ρ, which grows exponentially. Find the radius where the hyperbolic circle is at least 10 times longer than the flat one.',
        hint: 'Try ρ around 4.5.',
        enter: function (s) { s.P = { x: 0, y: 0 }; s.Q = { x: 0, y: 0 }; s.lockP = true; s.rho = 1; },
        goals: [{ t: 'Hyperbolic circumference is at least 10 times the flat one', ok: function (s) { return Math.sinh(s.rho) / s.rho >= 10; } }],
        demo: function (s) { s.rho = 4.6; } }
    ],
    reset: function (s) { s.rho = 1; },
    build: function (K, s) {
      S.rho = K.slider('circle radius ρ', 0.5, 5, 0.1, 'rho', function (v) { return v.toFixed(1); });
      K.canvas(400);
      K.onDown = function (x, y) { var p = { x: (x - O.cx) / O.R, y: (y - O.cy) / O.R }, dP = Math.hypot(p.x - s.P.x, p.y - s.P.y), dQ = Math.hypot(p.x - s.Q.x, p.y - s.Q.y); grab = (!s.lockP && dP < dQ) ? 'P' : 'Q'; };
      K.onDrag = function (x, y) { if (s.level === 2) return; var p = { x: (x - O.cx) / O.R, y: (y - O.cy) / O.R }, r = Math.hypot(p.x, p.y); if (r > 0.995) { p.x *= 0.995 / r; p.y *= 0.995 / r; } s[grab || 'Q'] = p; };
      K.info(function (s) {
        if (s.level === 2) return 'ρ = <b>' + s.rho.toFixed(1) + '</b> &nbsp; flat circle: <b>' + (2 * Math.PI * s.rho).toFixed(1) + '</b> &nbsp; hyperbolic circle: <b>' + (2 * Math.PI * Math.sinh(s.rho)).toFixed(1) + '</b> &nbsp; ratio <b>' + (Math.sinh(s.rho) / s.rho).toFixed(1) + '</b>';
        return 'Hyperbolic distance P to Q: <b>' + G.dist(s.P, s.Q).toFixed(2) + '</b> &nbsp; distance on the map: <b>' + Math.hypot(s.P.x - s.Q.x, s.P.y - s.Q.y).toFixed(2) + '</b>';
      });
    },
    show: function (K, s) { S.rho.w.style.display = s.level === 2 ? '' : 'none'; },
    draw: function (K, s) {
      K.clear(); var g = K.g, i;
      g.fillStyle = '#120d1e'; g.beginPath(); g.arc(O.cx, O.cy, O.R, 0, 6.2832); g.fill();
      for (i = 1; i <= 6; i++) K.circle(O.cx, O.cy, O.R * Math.tanh(i / 2), 'rgba(122,184,255,0.35)', 1);
      for (i = 0; i < 12; i++) K.line(O.cx, O.cy, O.cx + O.R * Math.cos(i * Math.PI / 6), O.cy + O.R * Math.sin(i * Math.PI / 6), 'rgba(122,184,255,0.18)', 1);
      K.circle(O.cx, O.cy, O.R, '#b26bff', 2); K.text('rings: 1, 2, 3 ... steps from the centre', O.cx, 396, '#a99dc7', 11, 'center');
      if (s.level === 2) { K.circle(O.cx, O.cy, O.R * Math.tanh(s.rho / 2), '#ffd27f', 3); return; }
      g.strokeStyle = '#ffd27f'; g.lineWidth = 3; G.drawSeg(g, s.P, s.Q, O.cx, O.cy, O.R);
      K.dot(O.cx + s.P.x * O.R, O.cy + s.P.y * O.R, 7, '#7be0a4'); K.text('P', O.cx + s.P.x * O.R + 9, O.cy + s.P.y * O.R - 8, '#7be0a4', 13);
      K.dot(O.cx + s.Q.x * O.R, O.cy + s.Q.y * O.R, 7, '#ff8fc7'); K.text('Q', O.cx + s.Q.x * O.R + 9, O.cy + s.Q.y * O.R - 8, '#ff8fc7', 13);
    }
  });
})();
