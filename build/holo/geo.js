/* Hyperbolic geometry helpers for the Poincare disk (unit disk coordinates). */
(function (root) {
  'use strict';
  var G = {};
  G.dist = function (p, q) { var d2 = (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y), a = 1 - p.x * p.x - p.y * p.y, b = 1 - q.x * q.x - q.y * q.y; return Math.acosh(1 + 2 * d2 / Math.max(1e-12, a * b)); };
  /* geodesic through p and q: returns {line:true} or {cx, cy, r} of the circle orthogonal to the unit circle */
  G.geodesic = function (p, q) {
    var det = p.x * q.y - p.y * q.x; if (Math.abs(det) < 1e-6) return { line: true };
    var a = (1 + p.x * p.x + p.y * p.y) / 2, b = (1 + q.x * q.x + q.y * q.y) / 2, cx = (a * q.y - b * p.y) / det, cy = (b * p.x - a * q.x) / det;
    return { cx: cx, cy: cy, r: Math.sqrt(Math.max(0, cx * cx + cy * cy - 1)) };
  };
  /* draw the geodesic segment between p and q on canvas context g; disk centre (ox, oy), radius R */
  G.drawSeg = function (g, p, q, ox, oy, R) {
    var c = G.geodesic(p, q); g.beginPath();
    if (c.line) { g.moveTo(ox + p.x * R, oy + p.y * R); g.lineTo(ox + q.x * R, oy + q.y * R); }
    else { var a1 = Math.atan2(p.y - c.cy, p.x - c.cx), a2 = Math.atan2(q.y - c.cy, q.x - c.cx), d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; g.arc(ox + c.cx * R, oy + c.cy * R, c.r * R, a1, a1 + d, d < 0); }
    g.stroke();
  };
  /* geodesic between two boundary points at angles a and b */
  G.drawBoundary = function (g, a, b, ox, oy, R) { G.drawSeg(g, { x: Math.cos(a) * 0.99999, y: Math.sin(a) * 0.99999 }, { x: Math.cos(b) * 0.99999, y: Math.sin(b) * 0.99999 }, ox, oy, R); };
  if (typeof module !== 'undefined' && module.exports) module.exports = G; root.HoloGeo = G;
})(typeof window !== 'undefined' ? window : globalThis);
