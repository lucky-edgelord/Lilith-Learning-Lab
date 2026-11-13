/* HoloNet: a small holographic tensor-network toy. Boundary sites on the rim of a disk, coarser layers toward the centre.
   Entropy of a boundary region = weight of the minimal cut (the discrete Ryu-Takayanagi surface). Optional black hole (purifier). */
(function (root) {
  'use strict';
  function make(nB) {
    nB = nB || 32; var layers = [], nodes = [], edges = [], n = nB, L = 0;
    while (n >= 1) { var ids = []; for (var i = 0; i < n; i++) { ids.push(nodes.length); nodes.push({ layer: L, i: i, n: n }); } layers.push(ids); if (n === 1) break; n = n / 2; L++; }
    var depth = layers.length;                                    // 32,16,8,4,2,1 -> 6 layers
    for (L = 0; L < depth - 1; L++) for (i = 0; i < layers[L].length; i++) edges.push({ a: layers[L][i], b: layers[L + 1][i >> 1], kind: 't', layer: L });
    for (L = 1; L < depth - 1; L++) { var m = layers[L].length; if (m === 2) edges.push({ a: layers[L][0], b: layers[L][1], kind: 'r', layer: L }); else for (i = 0; i < m; i++) edges.push({ a: layers[L][i], b: layers[L][(i + 1) % m], kind: 'r', layer: L }); }
    var net = { nB: nB, nodes: nodes, edges: edges, layers: layers, depth: depth, wt: [], wr: [], hole: null };
    for (L = 0; L < depth; L++) { net.wt.push(1); net.wr.push(L >= 1 ? 0.3 : 0); }
    net.weight = function (e) { if (e.w !== undefined) return e.w; return e.kind === 't' ? net.wt[e.layer] : net.wr[e.layer]; };
    /* positions on a unit disk */
    net.pos = function (id) { var nd = nodes[id], r = nd.n === 1 ? 0 : 1 - nd.layer / (depth - 0.4) * 0.98, th = (nd.i + 0.5) / nd.n * 2 * Math.PI - Math.PI / 2; return { x: r * Math.cos(th), y: r * Math.sin(th), r: r, th: th }; };
    /* black hole: nodes of layer >= L0 are replaced by a horizon; each layer-(L0-1) tree edge ends on the purifier with weight h */
    net.setHole = function (L0, h) { net.hole = L0 ? { L: L0, h: h } : null; };
    net.inHole = function (id) { return !!net.hole && nodes[id].layer >= net.hole.L; };
    /* min cut between boundary set A (array of booleans) and the rest (+ purifier). Returns {S, side:[bool per node], cut:[edge indices], holeSide} */
    net.cut = function (A) {
      var N = nodes.length, S = N, T = N + 1, P = N + 2, M = N + 3, adj = [], cap = [], to = [], i, e;
      for (i = 0; i < M; i++) adj.push([]);
      function add(u, v, c, id) { adj[u].push(to.length); to.push(v); cap.push(c); adj[v].push(to.length); to.push(u); cap.push(c); return id; }
      var eidx = [];
      for (i = 0; i < edges.length; i++) {
        e = edges[i]; var ha = net.inHole(e.a), hb = net.inHole(e.b);
        if (ha && hb) { eidx.push(-1); continue; }
        eidx.push(to.length);
        if (hb) add(e.a, P, net.hole.h); else if (ha) add(e.b, P, net.hole.h); else add(e.a, e.b, net.weight(e));
      }
      var BIG = 1e9; for (i = 0; i < net.nB; i++) { if (A[i]) add(S, i, BIG); else add(i, T, BIG); }
      if (net.hole) add(P, T, BIG);
      var flow = 0, prev = new Int32Array(M), q = new Int32Array(M);
      for (; ;) {
        for (i = 0; i < M; i++) prev[i] = -1; prev[S] = -2; var h = 0, t = 0; q[t++] = S;
        while (h < t && prev[T] === -1) { var u = q[h++]; for (var k = 0; k < adj[u].length; k++) { var id = adj[u][k]; if (cap[id] > 1e-12 && prev[to[id]] === -1) { prev[to[id]] = id; q[t++] = to[id]; } } }
        if (prev[T] === -1) break;
        var f = Infinity, v = T; while (v !== S) { id = prev[v]; f = Math.min(f, cap[id]); v = to[id ^ 1]; }
        v = T; while (v !== S) { id = prev[v]; cap[id] -= f; cap[id ^ 1] += f; v = to[id ^ 1]; }
        flow += f;
      }
      var nA = 0; for (i = 0; i < net.nB; i++) if (A[i]) nA++;
      var reach = []; for (i = 0; i < M; i++) reach.push(prev[i] !== -1);
      if (nA > net.nB / 2) {                                        // large regions take the larger of the tied wedges
        var seen = []; for (i = 0; i < M; i++) seen.push(false); seen[T] = true; h = 0; t = 0; q[t++] = T;
        while (h < t) { u = q[h++]; for (k = 0; k < adj[u].length; k++) { id = adj[u][k]; if (cap[id ^ 1] > 1e-12 && !seen[to[id]]) { seen[to[id]] = true; q[t++] = to[id]; } } }
        for (i = 0; i < M; i++) reach[i] = !seen[i];
      }
      var side = []; for (i = 0; i < N; i++) side.push(net.inHole(i) ? false : reach[i]);
      var cut = []; for (i = 0; i < edges.length; i++) { if (eidx[i] < 0) continue; e = edges[i]; var sa = net.inHole(e.a) ? reach[P] : reach[e.a], sb = net.inHole(e.b) ? reach[P] : reach[e.b]; if (sa !== sb) cut.push(i); }
      return { S: flow, side: side, cut: cut };
    };
    net.interval = function (start, len) { var A = []; for (var i = 0; i < net.nB; i++) A.push(((i - start) % net.nB + net.nB) % net.nB < len); return A; };
    net.entropy = function (A) { return net.cut(A).S; };
    /* can boundary region A reconstruct bulk node id? (is it inside the entanglement wedge) */
    net.inWedge = function (A, id) { if (net.inHole(id)) return false; return net.cut(A).side[id]; };
    /* one epoch of entanglement feature learning: fit the per-layer weights to target entropies of intervals. target(len) -> S */
    net.train = function (target, lr, opts) {
      opts = opts || {}; var gt = net.wt.map(function () { return 0; }), gr = net.wr.map(function () { return 0; }), gh = 0, loss = 0, cnt = 0;
      for (var len = 1; len <= (opts.maxLen || net.nB / 2); len++) for (var s = 0; s < net.nB; s += (opts.stride || 1)) {
        var st = s, c = net.cut(net.interval(st, len)), err = c.S - target(len); loss += err * err; cnt++;
        for (var k = 0; k < c.cut.length; k++) { var e = edges[c.cut[k]]; if (net.hole && (net.inHole(e.a) || net.inHole(e.b))) gh += err; else if (e.kind === 't') gt[e.layer] += err; else gr[e.layer] += err; }
      }
      var A = net._adam || (net._adam = { m: {}, v: {}, t: 0 }); A.t++;
      function step(key, w, g) { g = g / cnt; var m = A.m[key] = 0.9 * (A.m[key] || 0) + 0.1 * g, v = A.v[key] = 0.99 * (A.v[key] || 0) + 0.01 * g * g; return Math.max(0, w - lr * (m / (1 - Math.pow(0.9, A.t))) / (Math.sqrt(v / (1 - Math.pow(0.99, A.t))) + 1e-6)); }
      for (var L = 0; L < net.depth - 1; L++) { net.wt[L] = step('t' + L, net.wt[L], gt[L]); if (L >= 1) net.wr[L] = step('r' + L, net.wr[L], gr[L]); }
      if (net.hole && opts.learnHole) net.hole.h = step('h', net.hole.h, gh);
      return loss / cnt;
    };
    net.loss = function (target, opts) { opts = opts || {}; var loss = 0, cnt = 0; for (var len = 1; len <= (opts.maxLen || net.nB / 2); len++) for (var s = 0; s < net.nB; s += 1) { var err = net.entropy(net.interval(s, len)) - target(len); loss += err * err; cnt++; } return loss / cnt; };
    return net;
  }
  var api = { make: make,
    critical: function (N, c) { c = c || 3; return function (l) { return c / 3 * Math.log(N / Math.PI * Math.sin(Math.PI * l / N)) + 1; }; },
    gapped: function (xi, s) { return function (l) { return (s || 2) * (1 - Math.exp(-l / (xi || 1.5))); }; },
    thermal: function (N, beta, c) { c = c || 3; return function (l) { return c / 3 * Math.log(beta / Math.PI * Math.sinh(Math.PI * l / beta)) + 1; }; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; root.HoloNet = api;
})(typeof window !== 'undefined' ? window : globalThis);
/* drawing and picking helpers for the labs (browser only) */
(function (root) {
  'use strict';
  var H = root.HoloNet; if (!H) return;
  /* o: {cx, cy, R, A:[bool], res: cut result, sel: node id, showW: bool} */
  H.draw = function (K, net, o) {
    var g = K.g, i, P = function (id) { var p = net.pos(id); return { x: o.cx + p.x * o.R, y: o.cy + p.y * o.R }; };
    K.circle(o.cx, o.cy, o.R + 9, '#3a2d55', 1);
    var inCut = {}; if (o.res) o.res.cut.forEach(function (k) { inCut[k] = 1; });
    var hr = 0;
    if (net.hole) { var pp = net.pos(net.layers[net.hole.L - 1][0]); hr = pp.r * o.R * 0.62; g.fillStyle = '#000'; g.beginPath(); g.arc(o.cx, o.cy, hr, 0, 6.2832); g.fill(); K.circle(o.cx, o.cy, hr, '#ff8fc7', 2); }
    for (i = 0; i < net.edges.length; i++) {
      var e = net.edges[i], ha = net.inHole(e.a), hb = net.inHole(e.b); if (ha && hb) continue;
      var a = P(e.a), b = P(e.b), w = (ha || hb) ? net.hole.h : net.weight(e);
      if (hb) { var d = Math.hypot(a.x - o.cx, a.y - o.cy); b = { x: o.cx + (a.x - o.cx) * hr / d, y: o.cy + (a.y - o.cy) * hr / d }; }
      if (inCut[i]) K.line(a.x, a.y, b.x, b.y, '#ffd27f', 3.2);
      else if (w > 0.02) K.line(a.x, a.y, b.x, b.y, e.kind === 't' ? 'rgba(178,107,255,' + Math.min(1, 0.25 + w * 0.6) + ')' : 'rgba(122,184,255,' + Math.min(1, 0.2 + w * 0.6) + ')', o.showW ? 0.6 + 2.6 * Math.min(1.5, w) : 1.3);
      else K.line(a.x, a.y, b.x, b.y, 'rgba(90,80,120,0.25)', 0.6);
    }
    for (i = 0; i < net.nodes.length; i++) {
      if (net.inHole(i)) continue; var p = P(i), nd = net.nodes[i], inW = o.res && o.res.side[i];
      if (nd.layer === 0) K.dot(p.x, p.y, 4.6, o.A && o.A[i] ? '#7be0a4' : (o.erased && o.erased[i] ? '#ff7a9a' : '#6b5c8f'));
      else K.dot(p.x, p.y, o.sel === i ? 6.5 : 3.6, o.sel === i ? (inW ? '#7be0a4' : '#ff7a9a') : (inW ? '#4fae7c' : '#8a7bb0'));
      if (o.sel === i) K.circle(p.x, p.y, 9, '#fff', 1.5);
    }
  };
  H.pick = function (net, o, x, y, bulkOnly) {
    var best = -1, bd = 18 * 18;
    for (var i = 0; i < net.nodes.length; i++) { if (net.inHole(i)) continue; if (bulkOnly === true && net.nodes[i].layer === 0) continue; if (bulkOnly === false && net.nodes[i].layer !== 0) continue; var p = net.pos(i), dx = o.cx + p.x * o.R - x, dy = o.cy + p.y * o.R - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  H.count = function (A) { var n = 0; for (var i = 0; i < A.length; i++) if (A[i]) n++; return n; };
  H.contiguous = function (A) { var n = A.length, ch = 0; for (var i = 0; i < n; i++) if (A[i] !== A[(i + 1) % n]) ch++; return ch <= 2; };
})(typeof window !== 'undefined' ? window : globalThis);
