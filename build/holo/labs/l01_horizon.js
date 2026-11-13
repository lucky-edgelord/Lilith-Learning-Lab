/* Lab 1: Bits on the horizon. Entropy grows with area, not volume. */
(function () {
  var LP2 = 2.61e-70, LN2 = Math.LN2;                       // Planck length squared in m^2
  function bitsLog10(logR) { return Math.log10(Math.PI / (LP2 * LN2)) + 2 * logR; }
  var S = {};
  HoloLab({
    title: 'Lab 1: Bits on the horizon', intro: 'A black hole\'s entropy counts the area of its horizon in tiny Planck-sized tiles: S = A / 4. See what that means.',
    levels: [
      { title: 'Area, not volume', text: 'The slider sets the radius of a black hole, compared with where it started. Double the radius and watch both bars. Ordinary stuff would follow the volume bar. A black hole follows the area bar.',
        hint: 'Set the radius to 2.0. Area goes up 4 times, volume would go up 8 times.',
        goals: [{ t: 'Radius is doubled (2.0)', ok: function (s) { return Math.abs(s.r - 2) < 0.051; } }, { t: 'Entropy is 4 times bigger, not 8', ok: function (s) { return Math.abs(s.r * s.r - 4) < 0.25; } }],
        demo: function (s) { s.r = 2; } },
      { title: 'How many bits fit?', text: 'The most information any region can hold is the entropy of a black hole that just fills it. Slide the size of the region. Find a region that holds about 10<sup>66</sup> bits, then the whole observable universe.',
        hint: 'A marble (radius about 1 cm, so 10^-2 m) holds about 10^66 bits. The observable universe is about 10^26.6 m.',
        goals: [{ t: 'A region holding about 10^66 bits (within a factor of 3)', ok: function (s) { return Math.abs(bitsLog10(s.logR) - 66) < 0.5; } }, { t: 'A region holding at least 10^122 bits', ok: function (s) { return bitsLog10(s.logR) >= 122; } }],
        demo: function (s, K) { s.logR = -2.1; K.update(); s.logR = 26.6; } },
      { title: 'Feed the black hole', text: 'Throw matter in. The radius grows in step with the mass, so the entropy grows with the mass squared, and the hole gets colder. Double the mass.',
        hint: 'Press the button until the mass reads 2.0.',
        goals: [{ t: 'Mass is at least doubled', ok: function (s) { return s.m >= 1.999; } }, { t: 'Temperature has dropped to half or less', ok: function (s) { return 1 / s.m <= 0.5001; } }],
        demo: function (s) { s.m = 2; } }
    ],
    reset: function (s) { s.r = 1; s.logR = 0; s.m = 1; },
    build: function (K, s) {
      S.r = K.slider('radius (x start)', 1, 4, 0.1, 'r', function (v) { return v.toFixed(1); });
      S.R = K.slider('size of region', -15, 27, 0.1, 'logR', function (v) { return '10^' + v.toFixed(1) + ' m'; });
      K.row(); S.feed = K.button('Throw in matter', function () { s.m = Math.round((s.m + 0.25) * 100) / 100; }, ''); K.endRow();
      K.canvas(300);
      K.info(function (s) {
        if (s.level === 0) return 'Area: <b>' + (s.r * s.r).toFixed(2) + 'x</b> &nbsp; Volume: <b>' + (s.r * s.r * s.r).toFixed(2) + 'x</b> &nbsp; Black hole entropy: <b>' + (s.r * s.r).toFixed(2) + 'x</b>';
        if (s.level === 1) return 'Radius <b>10^' + s.logR.toFixed(1) + ' m</b> &nbsp; Maximum information: <b>10^' + bitsLog10(s.logR).toFixed(1) + ' bits</b><br><span class="k">A phone holds about 10^12 bits.</span>';
        return 'Mass <b>' + s.m.toFixed(2) + 'x</b> &nbsp; Radius <b>' + s.m.toFixed(2) + 'x</b> &nbsp; Entropy <b>' + (s.m * s.m).toFixed(2) + 'x</b> &nbsp; Temperature <b>' + (1 / s.m).toFixed(2) + 'x</b>';
      });
    },
    show: function (K, s) { S.r.w.style.display = s.level === 0 ? '' : 'none'; S.R.w.style.display = s.level === 1 ? '' : 'none'; S.feed.style.display = s.level === 2 ? '' : 'none'; },
    draw: function (K, s) {
      K.clear(); var g = K.g, rad = s.level === 0 ? s.r : s.level === 2 ? s.m : 1 + (s.logR + 15) / 42 * 3, R = 22 * rad, cx = 150, cy = 150;
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill(); K.circle(cx, cy, R, '#b26bff', 2);
      var n = Math.round(10 * rad * rad); for (var i = 0; i < n; i++) { var a = i * 2.39996, rr = R * Math.sqrt((i + 0.5) / n); K.dot(cx + rr * Math.cos(a) * 0.96, cy + rr * Math.sin(a) * 0.96, 1.6, 'rgba(255,210,127,0.8)'); }
      K.text('each dot: a patch of horizon', cx, 290, '#a99dc7', 11, 'center');
      var bars = s.level === 1 ? [['bits (log10)', bitsLog10(s.logR) / 124, '#ffd27f']] : s.level === 0 ? [['area (entropy)', s.r * s.r / 64, '#ffd27f'], ['volume', s.r * s.r * s.r / 64, '#7ab8ff']] : [['entropy', s.m * s.m / 16, '#ffd27f'], ['temperature', 1 / s.m / 1.2, '#ff8fc7']];
      bars.forEach(function (b, k) { var x = 330 + k * 100; g.fillStyle = '#261b3b'; g.fillRect(x, 40, 60, 220); g.fillStyle = b[2]; var h = Math.max(2, Math.min(1, b[1]) * 220); g.fillRect(x, 260 - h, 60, h); K.text(b[0], x + 30, 278, '#a99dc7', 11, 'center'); });
    }
  });
})();
