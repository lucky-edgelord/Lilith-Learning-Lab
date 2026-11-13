/* Lab 6: Mass to dimension. Delta(Delta - d) = m^2 L^2 with d = 4. */
(function () {
  function D(s) { var x = 4 + s.m2; return x < 0 ? NaN : 2 + Math.sqrt(x); }
  var S = {};
  HoloLab({
    title: 'Lab 6: Mass to dimension', intro: 'Every field in the bulk matches one operator on the boundary. The field\'s mass sets the operator\'s scaling dimension Δ through Δ(Δ − 4) = m²L² (for a four-dimensional boundary).',
    levels: [
      { title: 'A massless field', text: 'Slide the mass. A massless bulk field (m² = 0) matches an operator of dimension exactly 4. Find it.', hint: 'Set m²L² to 0.',
        enter: function (s) { s.m2 = 5; }, goals: [{ t: 'm²L² = 0 gives Δ = 4', ok: function (s) { return Math.abs(s.m2) < 0.051; } }], demo: function (s) { s.m2 = 0; } },
      { title: 'The lowest allowed mass', text: 'In AdS a field may even have negative m², down to a limit called the Breitenlohner-Freedman bound. Lower the mass until Δ stops being a real number, then come back to the bound itself.',
        hint: 'Go below −4 to see the warning, then set exactly −4, where Δ = 2.', enter: function (s) { s.m2 = 0; },
        goals: [{ t: 'Below the bound: no real Δ (unstable)', ok: function (s) { return s.m2 < -4.05; } }, { t: 'At the bound: m²L² = −4, Δ = 2', ok: function (s) { return Math.abs(s.m2 + 4) < 0.051; } }],
        demo: function (s, K) { s.m2 = -4.5; K.update(); s.m2 = -4; } },
      { title: 'Heavier means higher dimension', text: 'Find the mass that gives an operator of dimension 6. Then move the probe towards the boundary (small z): the two curves show how the field falls off there. The slow one is the source you control, the fast one is the response you measure.',
        hint: 'Δ = 6 needs m²L² = 6 × 2 = 12. Then slide the probe to 0.1 or less.', enter: function (s) { s.m2 = 3; },
        goals: [{ t: 'Δ = 6', ok: function (s) { return Math.abs(D(s) - 6) < 0.03; } }, { t: 'Probe near the boundary (z at most 0.1)', ok: function (s) { return s.z <= 0.1; } }],
        demo: function (s) { s.m2 = 12; s.z = 0.08; } }
    ],
    reset: function (s) { s.m2 = 5; s.z = 0.6; },
    build: function (K, s) {
      K.slider('mass² (m²L²)', -5, 13, 0.1, 'm2', function (v) { return v.toFixed(1); });
      S.z = K.slider('probe depth z', 0.02, 1, 0.01, 'z', function (v) { return v.toFixed(2); });
      K.canvas(300);
      K.info(function (s) { var d = D(s); if (isNaN(d)) return '<span style="color:#ff7a9a">Below the Breitenlohner-Freedman bound (m²L² &lt; −4): the field is unstable and no operator matches it.</span>'; return 'Δ = <b>' + d.toFixed(2) + '</b> &nbsp; source falls like z^<b>' + (4 - d).toFixed(2) + '</b> &nbsp; response falls like z^<b>' + d.toFixed(2) + '</b><br>Boundary two-point function: ⟨O(x) O(0)⟩ ∝ 1 / x^<b>' + (2 * d).toFixed(2) + '</b>'; });
    },
    show: function (K, s) { S.z.w.style.display = s.level === 2 ? '' : 'none'; },
    draw: function (K, s) {
      K.clear(); var d = D(s);
      K.text('Δ against mass²', 150, 16, '#a99dc7', 12, 'center');
      K.plot({ x0: -5, x1: 13, y0: 0, y1: 6.5, box: [30, 26, 240, 220], curves: [{ f: function (x) { return x < -4 ? NaN : 2 + Math.sqrt(4 + x); }, col: '#b26bff' }], marks: [{ x: s.m2, y: isNaN(d) ? 0 : d }, { x: -4, col: '#ff7a9a', label: 'BF bound' }], xl: 'm²L²', yl: 'Δ' });
      K.text('field against depth z (boundary at left)', 410, 16, '#a99dc7', 12, 'center');
      if (!isNaN(d)) K.plot({ x0: 0, x1: 1, y0: 0, y1: 1.6, box: [300, 26, 240, 220], curves: [{ f: function (z) { return Math.pow(z, 4 - d); }, col: '#ffd27f', label: 'source', dy: 14 }, { f: function (z) { return Math.pow(z, d); }, col: '#7be0a4', label: 'response', dy: 14 }], marks: s.level === 2 ? [{ x: s.z, col: '#ff8fc7', label: 'probe' }] : [], xl: 'z (depth into the bulk)' });
    }
  });
})();
