/* Lab 7: The Ryu-Takayanagi ruler. Entanglement entropy of boundary intervals in AdS3 from geodesic lengths. Units: c/3 = 1. */
(function () {
  var G = HoloGeo, O = { cx: 280, cy: 195, R: 170 }, EPS = 0.02, S = {}, grab = 'b';
  function sOf(th) { return Math.log(2 / EPS * Math.sin(Math.max(1e-6, th) / 2)); }               // th in radians
  function width(s) { var w = (s.b - s.a) % (2 * Math.PI); if (w < 0) w += 2 * Math.PI; return w; }
  function two(s) { var al = s.al * Math.PI / 180, gap = Math.PI - al; return { dis: 2 * sOf(al), con: 2 * sOf(gap), al: al, gap: gap }; }
  HoloLab({
    title: 'Lab 7: The Ryu-Takayanagi ruler', intro: 'The disk is a slice of AdS. Pick a region A on the boundary (green). Its entanglement entropy equals the length of the shortest bulk curve that ends on its edges (gold), divided by 4G.',
    levels: [
      { title: 'Bigger region, deeper curve', text: 'Drag the two end points of A around the rim. A bigger region needs a curve that dips deeper into the bulk and is longer. Find the region with the most entropy.',
        hint: 'Make A exactly half the circle (180 degrees).', enter: function (s) { s.a = -0.4; s.b = 0.4; },
        goals: [{ t: 'A covers at least 150 degrees', ok: function (s) { return width(s) >= 2.618; } }, { t: 'A is half the circle (within 5 degrees): the maximum', ok: function (s) { return Math.abs(width(s) - Math.PI) < 0.0873; } }],
        demo: function (s, K) { s.a = 0; s.b = 2.7; K.update(); s.b = Math.PI; } },
      { title: 'A region and its complement', text: 'The whole boundary is in one pure state, so A and the rest of the boundary must have the same entropy. The same curve serves both. Make A bigger than two thirds of the circle and compare the two numbers.',
        hint: 'Stretch A beyond 240 degrees.', enter: function (s) { s.a = 0; s.b = 1.5; },
        goals: [{ t: 'A covers at least 240 degrees, and S(A) still equals S(rest)', ok: function (s) { return width(s) >= 4.189; } }], demo: function (s) { s.a = 0; s.b = 4.4; } },
      { title: 'Two regions: which surface wins?', text: 'Now A is two equal arcs on opposite sides. Two sets of curves could do the job: one curve per arc (pink), or two curves that bridge across (blue). Nature picks the shorter total. Widen the arcs to find where the choice flips, then make the mutual information large.',
        hint: 'The flip is at 90 degrees. Beyond it, the two arcs share mutual information.', enter: function (s) { s.al = 40; },
        goals: [{ t: 'Arc size at the switch-over (87 to 93 degrees)', ok: function (s) { return Math.abs(s.al - 90) <= 3; } }, { t: 'Mutual information between the arcs is more than 1', ok: function (s) { var t = two(s); return t.dis - Math.min(t.dis, t.con) > 1; } }],
        demo: function (s, K) { s.al = 90; K.update(); s.al = 130; } }
    ],
    reset: function (s) { s.a = -0.4; s.b = 0.4; s.al = 40; },
    build: function (K, s) {
      S.al = K.slider('size of each arc', 10, 170, 1, 'al', function (v) { return v + '°'; });
      K.canvas(390);
      K.onDown = function (x, y) { if (s.level === 2) return; var t = Math.atan2(y - O.cy, x - O.cx), da = Math.abs(Math.atan2(Math.sin(t - s.a), Math.cos(t - s.a))), db = Math.abs(Math.atan2(Math.sin(t - s.b), Math.cos(t - s.b))); grab = da < db ? 'a' : 'b'; };
      K.onDrag = function (x, y) { if (s.level === 2) return; s[grab] = Math.atan2(y - O.cy, x - O.cx); };
      K.info(function (s) {
        if (s.level === 2) { var t = two(s), m = Math.min(t.dis, t.con); return 'One curve per arc: <b>' + t.dis.toFixed(2) + '</b> &nbsp; bridging curves: <b>' + t.con.toFixed(2) + '</b> &nbsp; S(A∪B) = <b>' + m.toFixed(2) + '</b><br>Mutual information I(A:B) = <b>' + (t.dis - m).toFixed(2) + '</b> ' + (t.con < t.dis ? '<span style="color:#7ab8ff">(bridging wins: the wedge is connected)</span>' : '<span style="color:#ff8fc7">(separate curves win)</span>'); }
        var w = width(s); return 'Size of A: <b>' + (w * 180 / Math.PI).toFixed(0) + '°</b> &nbsp; S(A) = <b>' + sOf(w).toFixed(2) + '</b> &nbsp; S(rest) = <b>' + sOf(2 * Math.PI - w).toFixed(2) + '</b> <span class="k">(in units of c/3)</span>';
      });
    },
    show: function (K, s) { S.al.w.style.display = s.level === 2 ? '' : 'none'; },
    draw: function (K, s) {
      K.clear(); var g = K.g, i; g.fillStyle = '#120d1e'; g.beginPath(); g.arc(O.cx, O.cy, O.R, 0, 6.2832); g.fill();
      for (i = 1; i <= 5; i++) K.circle(O.cx, O.cy, O.R * Math.tanh(i / 2), 'rgba(122,184,255,0.2)', 1);
      K.circle(O.cx, O.cy, O.R, '#6b5c8f', 2);
      function arc(a, b, col) { g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.arc(O.cx, O.cy, O.R, a, b); g.stroke(); }
      function geo(a, b, col, w) { g.strokeStyle = col; g.lineWidth = w; G.drawBoundary(g, a, b, O.cx, O.cy, O.R); }
      if (s.level === 2) {
        var t = two(s), h = t.al / 2, con = t.con < t.dis; arc(-h, h, '#7be0a4'); arc(Math.PI - h, Math.PI + h, '#7be0a4');
        geo(-h, h, '#ff8fc7', con ? 1.2 : 3.5); geo(Math.PI - h, Math.PI + h, '#ff8fc7', con ? 1.2 : 3.5); geo(h, Math.PI - h, '#7ab8ff', con ? 3.5 : 1.2); geo(Math.PI + h, 2 * Math.PI - h, '#7ab8ff', con ? 3.5 : 1.2);
        K.text('A', O.cx + O.R + 14, O.cy + 4, '#7be0a4', 14, 'center'); K.text('B', O.cx - O.R - 14, O.cy + 4, '#7be0a4', 14, 'center'); return;
      }
      var w = width(s); arc(s.a, s.a + w, '#7be0a4'); geo(s.a, s.a + w, '#ffd27f', 3.5);
      [s.a, s.b].forEach(function (t) { K.dot(O.cx + O.R * Math.cos(t), O.cy + O.R * Math.sin(t), 8, '#fff'); });
      var mid = s.a + w / 2; K.text('A', O.cx + (O.R + 16) * Math.cos(mid), O.cy + (O.R + 16) * Math.sin(mid) + 4, '#7be0a4', 14, 'center');
    }
  });
})();
