# -*- coding: utf-8 -*-
"""Original SVG figures for the holography course. Hyperbolic pictures are computed, not traced."""
import os, sys, math, cmath
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from make_images import Svg, BG, PANEL, LINE, TX, DIM, VIO, PINK, BLUE, GRN, AMB, RED  # noqa: E402


def head(s, t):
    s.text(s.w / 2, 26, t, 15, VIO, weight="700")


def circ(s, x, y, r, fill="none", stroke=LINE, sw=1.5, dash=None, op=None):
    s.add('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="%s"%s%s/>' % (x, y, r, fill, stroke, sw, ' stroke-dasharray="%s"' % dash if dash else "", ' fill-opacity="%s"' % op if op else ""))


def path(s, d, stroke=LINE, sw=1.5, fill="none", dash=None, op=None, arrow=False):
    s.add('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"%s%s%s/>' % (d, fill, stroke, sw, ' stroke-dasharray="%s"' % dash if dash else "", ' fill-opacity="%s"' % op if op else "", ' marker-end="url(#ah)"' if arrow else ""))


def poly(pts):
    return "M" + " L".join("%.1f %.1f" % p for p in pts)


# ---- hyperbolic helpers (Poincare disk, complex numbers) ----
def geo_pts(p, q, n=24):
    """points along the geodesic from p to q (complex, inside the unit disk)"""
    det = p.real * q.imag - p.imag * q.real
    if abs(det) < 1e-9:
        return [p + (q - p) * k / n for k in range(n + 1)]
    a, b = (1 + abs(p) ** 2) / 2, (1 + abs(q) ** 2) / 2
    c = complex((a * q.imag - b * p.imag) / det, (b * p.real - a * q.real) / det)
    r = math.sqrt(max(0, abs(c) ** 2 - 1))
    a1, a2 = cmath.phase(p - c), cmath.phase(q - c)
    d = a2 - a1
    while d > math.pi: d -= 2 * math.pi
    while d < -math.pi: d += 2 * math.pi
    return [c + r * cmath.exp(1j * (a1 + d * k / n)) for k in range(n + 1)]


def bgeo(a, b, n=40):
    return geo_pts(0.99999 * cmath.exp(1j * a), 0.99999 * cmath.exp(1j * b), n)


def D(ox, oy, R, pts):
    return poly([(ox + z.real * R, oy + z.imag * R) for z in pts])


def reflect(z, p, q):
    """reflect z across the geodesic through p and q"""
    det = p.real * q.imag - p.imag * q.real
    if abs(det) < 1e-9:
        u = (q - p) / abs(q - p)
        return p + u * ((z - p) / u).conjugate()
    a, b = (1 + abs(p) ** 2) / 2, (1 + abs(q) ** 2) / 2
    c = complex((a * q.imag - b * p.imag) / det, (b * p.real - a * q.real) / det)
    r2 = abs(c) ** 2 - 1
    return c + r2 / (z - c).conjugate()


def tiling(p=5, q=4, depth=3):
    """list of polygons (lists of complex vertices) of the regular {p,q} tiling, by repeated reflection"""
    d = math.sqrt(math.cos(math.pi / p + math.pi / q) / math.cos(math.pi / p - math.pi / q))
    first = [d * cmath.exp(1j * (2 * math.pi * k / p + math.pi / 2)) for k in range(p)]
    polys, seen, frontier = [(first, 0)], {(0, 0)}, [first]
    for lev in range(1, depth + 1):
        nxt = []
        for pg in frontier:
            for k in range(p):
                a, b = pg[k], pg[(k + 1) % p]
                new = [reflect(z, a, b) for z in pg]
                cen = sum(new) / p
                key = (round(cen.real, 3), round(cen.imag, 3))
                if key in seen: continue
                seen.add(key); polys.append((new, lev)); nxt.append(new)
        frontier = nxt
    return polys


def disk_bg(s, ox, oy, R, rings=5):
    circ(s, ox, oy, R, fill="#120d1e", stroke=VIO, sw=2)
    for i in range(1, rings + 1):
        circ(s, ox, oy, R * math.tanh(i / 2), stroke="#2a3f66", sw=0.8)


# ---- chapter 1 ----
def f_area():
    s = Svg(640, 320, "Black hole entropy counts area", "A black hole whose horizon is tiled with Planck-sized patches, one bit of entropy for about every four patches; next to it, a comparison of how entropy would grow with volume against how it does grow with area.")
    head(s, "Entropy lives on the surface")
    cx, cy, R = 170, 175, 105
    circ(s, cx, cy, R, fill="#000", stroke=VIO, sw=2.5)
    n = 150
    for i in range(n):
        a = i * 2.39996; rr = R * math.sqrt((i + 0.5) / n) * 0.97
        s.add('<rect x="%.1f" y="%.1f" width="7" height="7" rx="1.5" fill="%s" fill-opacity="0.85"/>' % (cx + rr * math.cos(a) - 3.5, cy + rr * math.sin(a) - 3.5, AMB if i % 3 else PINK))
    s.text(cx, 302, "horizon area A, in tiny Planck patches", 12, DIM)
    s.rect(330, 60, 280, 62, stroke=AMB, r=10); s.text(470, 86, "S = A / 4G", 20, AMB, weight="700"); s.text(470, 108, "Bekenstein-Hawking entropy (units with ħ = c = k = 1)", 10, DIM)
    for i, (lab, col, f) in enumerate([("if entropy followed volume: ×8", BLUE, 1.0), ("what happens (area): ×4", AMB, 0.5)]):
        y = 160 + i * 62
        s.text(330, y - 8, lab, 12, col, anchor="start"); s.rect(330, y, 280, 22, fill=BG, stroke=LINE, r=5); s.rect(330, y, 280 * f, 22, fill=col, stroke=col, r=5)
    s.text(470, 290, "Double the radius: the entropy only quadruples.", 12, TX)
    return s


def f_hologram():
    s = Svg(640, 300, "The holographic idea", "A world with gravity in a volume, on the left, is fully described by a quantum theory without gravity living on the surface that bounds it, on the right, like a 3D image stored on a flat hologram.")
    head(s, "Two descriptions, one world")
    circ(s, 160, 165, 100, fill="#120d1e", stroke=VIO, sw=2)
    for (x, y, r, c) in [(130, 140, 16, BLUE), (190, 190, 22, PINK), (170, 120, 9, GRN), (120, 200, 12, AMB)]:
        circ(s, x, y, r, fill=c, stroke="none", op=0.75)
    path(s, "M135 150 Q160 170 180 180", stroke=DIM, sw=1, dash="3 3")
    s.text(160, 286, "the bulk: space with gravity, one dimension more", 12, DIM)
    circ(s, 480, 165, 100, fill="none", stroke=AMB, sw=6)
    for k in range(40):
        a = k * 2 * math.pi / 40
        circ(s, 480 + 100 * math.cos(a), 165 + 100 * math.sin(a), 3.2, fill=[BLUE, PINK, GRN][k % 3], stroke="none")
    s.text(480, 160, "nothing needed", 12, DIM); s.text(480, 178, "in here", 12, DIM)
    s.text(480, 286, "the boundary: quantum theory, no gravity", 12, DIM)
    s.text(320, 150, "=", 40, VIO, weight="700"); s.text(320, 180, "same physics", 12, VIO)
    return s


# ---- chapter 2 ----
def f_curv():
    s = Svg(640, 290, "Three kinds of curvature", "Triangles on a sphere, a flat plane and a saddle. Angles add to more than 180 degrees on the sphere, exactly 180 on the plane and less than 180 on the saddle, which is negatively curved like hyperbolic space.")
    head(s, "Curvature shows up in triangles")
    data = [("sphere: positive", "angles add to more than 180°", GRN, 0.35), ("plane: zero", "angles add to exactly 180°", BLUE, 0.0), ("saddle: negative", "angles add to less than 180°", PINK, -0.35)]
    for i, (t, sub, c, k) in enumerate(data):
        cx = 110 + i * 210; cy = 150
        P = [(cx, cy - 70), (cx - 75, cy + 55), (cx + 75, cy + 55)]
        d = ""
        for j in range(3):
            a, b = P[j], P[(j + 1) % 3]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            ox, oy = mx - cx, my - (cy + 13); qx, qy = mx + ox * k * 1.6, my + oy * k * 1.6
            d += ("M%.1f %.1f " % a if j == 0 else "") + "Q%.1f %.1f %.1f %.1f " % (qx, qy, b[0], b[1])
        path(s, d + "Z", stroke=c, sw=2.5, fill=c, op=0.12)
        s.text(cx, 236, t, 13, c, weight="700"); s.text(cx, 256, sub, 11, DIM)
    s.text(320, 280, "Hyperbolic space is a saddle at every point, in every direction.", 12, AMB)
    return s


def f_disk():
    s = Svg(640, 400, "The Poincare disk", "The hyperbolic plane drawn as a disk and tiled by identical pentagons. The tiles look smaller towards the rim but are all the same real size. Shortest paths are arcs that meet the rim at right angles.")
    head(s, "The hyperbolic plane on a disk")
    ox, oy, R = 200, 215, 170
    circ(s, ox, oy, R, fill="#120d1e", stroke=VIO, sw=2)
    cols = ["#3b2a66", "#2a3f66", "#33244f", "#243a4f"]
    for pg, lev in tiling(5, 4, 4):
        pts = []
        for k in range(5): pts += geo_pts(pg[k], pg[(k + 1) % 5], 8)[:-1]
        path(s, D(ox, oy, R, pts) + "Z", stroke="#8a7bb0", sw=0.7, fill=cols[lev % 4], op=0.9)
    path(s, D(ox, oy, R, bgeo(-2.5, -0.5)), stroke=AMB, sw=3)
    path(s, D(ox, oy, R, geo_pts(complex(-0.75, 0.3), complex(0.6, 0.55))), stroke=GRN, sw=3)
    s.rect(400, 70, 220, 64, stroke=VIO, r=10); s.text(510, 94, "every pentagon is the", 12, TX); s.text(510, 112, "same size and shape", 12, TX)
    s.rect(400, 150, 220, 64, stroke=AMB, r=10); s.text(510, 174, "gold and green: straight", 12, AMB); s.text(510, 192, "lines (geodesics)", 12, AMB)
    s.rect(400, 230, 220, 84, stroke=BLUE, r=10); s.text(510, 254, "the rim is infinitely", 12, BLUE); s.text(510, 272, "far away: there is always", 12, BLUE); s.text(510, 290, "room for more tiles", 12, BLUE)
    s.text(510, 350, "distance from centre to map radius r:", 11, DIM); s.text(510, 370, "ρ = 2 artanh(r)", 14, TX)
    return s


def f_halfplane():
    s = Svg(640, 320, "The z coordinate", "The same hyperbolic space drawn as an upper half plane with the boundary at z equals zero along the top. Squares of equal real size look larger the deeper they sit, because lengths are divided by z.")
    head(s, "Same space, drawn with a depth coordinate z")
    x0, y0, w = 60, 60, 400
    s.line(x0, y0, x0 + w, y0, AMB, 4); s.text(x0 + w / 2, y0 - 10, "boundary, z = 0", 12, AMB)
    z, size, lev = y0, 12.5, 0
    while z + size <= 270:
        n = int(round(w / size))
        for k in range(n):
            s.add('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" fill-opacity="0.5" stroke="#8a7bb0" stroke-width="0.7"/>' % (x0 + k * size, z, size, size, ["#3b2a66", "#2a3f66"][(k + lev) % 2]))
        z += size; size *= 2; lev += 1
    s.arrow(x0 - 22, y0 + 6, x0 - 22, 262, DIM); s.text(x0 - 30, 170, "z", 14, DIM)
    s.rect(482, 60, 142, 76, stroke=VIO, r=10); s.text(553, 84, "ds² = L² ×", 13, TX); s.text(553, 104, "(dx² + dz²) / z²", 13, TX); s.text(553, 124, "the AdS metric", 10, DIM)
    s.text(553, 170, "Every box is the", 12, DIM); s.text(553, 188, "same real size.", 12, DIM); s.text(553, 222, "Going deeper =", 12, BLUE); s.text(553, 240, "zooming out.", 12, BLUE)
    s.text(320, 302, "Each row down, things are twice as big on the map: depth is a scale.", 12, AMB)
    return s


# ---- chapter 3 ----
def f_cylinder():
    s = Svg(640, 360, "Anti-de Sitter space as a cylinder", "Global AdS drawn as a solid cylinder with time running up. The wall of the cylinder is the boundary. A thrown ball oscillates about the axis; a light ray bounces off the wall and returns in finite time.")
    head(s, "AdS is a can; the boundary is the label")
    cx, top, bot, rx, ry = 200, 70, 300, 120, 28
    s.add('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#120d1e" stroke="%s" stroke-width="2"/>' % (cx, bot, rx, ry, VIO))
    s.rect(cx - rx, top, 2 * rx, bot - top, fill="#120d1e", stroke="none", r=0)
    s.line(cx - rx, top, cx - rx, bot, VIO, 2); s.line(cx + rx, top, cx + rx, bot, VIO, 2)
    s.add('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#1b1429" stroke="%s" stroke-width="2"/>' % (cx, top, rx, ry, VIO))
    s.line(cx, top, cx, bot, "#2a3f66", 1, dash="4 4")
    pts = [(cx + 80 * math.sin(k / 40 * 2 * math.pi * 1.5), bot - (bot - top) * k / 40) for k in range(41)]
    path(s, poly(pts), stroke=GRN, sw=3)
    lp = [(cx, bot), (cx + rx, bot - 76), (cx, bot - 153), (cx - rx, bot - 230 + 0), (cx - rx + 0, bot - 230)]
    path(s, poly([(cx, bot), (cx + rx, bot - 58), (cx - rx, bot - 174), (cx, bot - 230)]), stroke=AMB, sw=2.5, dash="6 4")
    s.arrow(40, 300, 40, 80, DIM); s.text(40, 66, "time", 12, DIM)
    s.text(cx, 340, "each horizontal slice is a hyperbolic disk", 12, DIM)
    s.box(400, 70, 220, 60, "the wall", "boundary: where the CFT lives", VIO)
    s.box(400, 148, 220, 60, "green: a thrown ball", "always falls back, period 2πL", GRN)
    s.box(400, 226, 220, 60, "gold: light", "reaches the wall and returns", AMB)
    return s


def f_slices():
    s = Svg(640, 320, "The Poincare patch", "A stack of flat copies of ordinary spacetime, one for each depth z. Near the boundary the copy is magnified, deep inside it is shrunk. A small object near the boundary and a large one deep inside are the same thing viewed at different scales.")
    head(s, "A stack of flat worlds, one for each scale")
    for i, (z, sc) in enumerate([("small z: boundary", 1.0), ("", 0.72), ("", 0.5), ("large z: deep bulk", 0.32)]):
        y = 70 + i * 58; w = 330 * sc
        pts = [(110, y), (110 + 330, y), (110 + 330 + 60, y + 26), (110 + 60, y + 26)]
        path(s, poly(pts) + "Z", stroke=[AMB, VIO, VIO, BLUE][i], sw=1.6, fill=[AMB, VIO, VIO, BLUE][i], op=0.08)
        g = 8
        for k in range(1, g):
            xa = 110 + 330 * k / g
            s.line(xa, y, xa + 60, y + 26, "#3a2d55", 0.6)
        circ(s, 110 + 195, y + 13, 5 + 20 * (i / 3.0), fill=PINK, stroke="none", op=0.7)
        if z: s.text(512, y + 18, z, 11, [AMB, VIO, VIO, BLUE][i], anchor="start")
    s.arrow(80, 76, 80, 262, DIM); s.text(66, 170, "z", 14, DIM)
    s.text(320, 306, "The pink blob is one object: small and sharp near the boundary, big and blurry deep inside.", 11.5, AMB)
    return s


# ---- chapter 4 ----
def f_entangle():
    s = Svg(640, 300, "Product state against entangled state", "Two qubits. In a product state each has its own definite state. In an entangled state only the pair has a definite state; each qubit alone looks random and has entropy.")
    head(s, "The whole can be certain while the parts are random")
    for i, (t, st, sa, c) in enumerate([("product state", "|0⟩ ⊗ |0⟩", "S(A) = 0", BLUE), ("entangled (Bell) state", "(|00⟩ + |11⟩) / √2", "S(A) = 1 bit", PINK)]):
        x = 40 + i * 300
        s.rect(x, 56, 260, 200, stroke=c, r=12); s.text(x + 130, 82, t, 14, c, weight="700")
        circ(s, x + 80, 150, 30, fill=BG, stroke=c, sw=2); circ(s, x + 180, 150, 30, fill=BG, stroke=c, sw=2)
        s.text(x + 80, 155, "A", 16, TX); s.text(x + 180, 155, "B", 16, TX)
        if i: path(s, "M%d 150 q10 -14 20 0 t20 0" % (x + 110), stroke=AMB, sw=2.5)
        s.text(x + 130, 206, st, 14, TX); s.text(x + 130, 236, sa + "    S(AB) = 0", 12, DIM)
    s.text(320, 284, "Entanglement entropy: how random a part looks because of its links to the rest.", 12, AMB)
    return s


def f_scaling():
    s = Svg(640, 300, "Scale invariance and power laws", "A scale-invariant pattern looks the same at every zoom level. Its correlations fall as a power of the distance, set by the scaling dimension, instead of dying off exponentially.")
    head(s, "A conformal field theory looks the same at every zoom")
    def tri(x, y, sz, d):
        if d == 0:
            path(s, "M%.1f %.1f L%.1f %.1f L%.1f %.1f Z" % (x, y, x + sz, y, x + sz / 2, y - sz * 0.866), stroke="none", fill=VIO, op=0.8); return
        tri(x, y, sz / 2, d - 1); tri(x + sz / 2, y, sz / 2, d - 1); tri(x + sz / 4, y - sz * 0.433, sz / 2, d - 1)
    tri(40, 250, 220, 4)
    s.rect(95, 196, 55, 55, fill="none", stroke=AMB, r=2); s.text(150, 274, "zoom into any corner: same picture", 11, DIM)
    x0, y0, w, h = 330, 60, 270, 180
    s.rect(x0, y0, w, h, fill=BG, stroke=LINE, r=4)
    p1 = [(x0 + w * k / 60, y0 + h - h * min(1, 0.09 / ((k / 60 + 0.03) ** 1.0) / 3.2)) for k in range(61)]
    p2 = [(x0 + w * k / 60, y0 + h - h * 0.95 * math.exp(-(k / 60) * 9)) for k in range(61)]
    path(s, poly(p1), stroke=AMB, sw=2.5); path(s, poly(p2), stroke=BLUE, sw=2, dash="5 4")
    s.text(x0 + 150, y0 + 60, "power law 1 / x^(2Δ): CFT", 12, AMB); s.text(x0 + 150, y0 + 150, "exponential: a gapped system", 12, BLUE)
    s.text(x0 + w / 2, y0 + h + 18, "distance x", 11, DIM); s.text(x0 + w / 2, y0 - 8, "correlation between two points", 11, DIM)
    return s


def f_laws():
    s = Svg(640, 290, "How entropy grows with region size", "Three behaviours of the entanglement entropy of a block of length l in a one-dimensional system: constant for a gapped state (area law), logarithmic for a critical state, and proportional to l for a hot or random state (volume law).")
    head(s, "Three ways entanglement entropy can grow")
    for k in range(24):
        c = GRN if 8 <= k < 16 else "#6b5c8f"
        circ(s, 50 + k * 23.5, 70, 7, fill=c, stroke="none")
    s.text(320, 100, "region A of length ℓ (green) inside a long chain", 11.5, DIM)
    x0, y0, w, h = 60, 120, 320, 140
    s.rect(x0, y0, w, h, fill=BG, stroke=LINE, r=4)
    path(s, poly([(x0 + w * k / 50, y0 + h - h * 0.95 * k / 50) for k in range(51)]), stroke=PINK, sw=2.5)
    path(s, poly([(x0 + w * k / 50, y0 + h - h * 0.2 * math.log(1 + 14 * k / 50)) for k in range(51)]), stroke=AMB, sw=2.5)
    path(s, poly([(x0 + w * k / 50, y0 + h - h * 0.18 * (1 - math.exp(-k / 3))) for k in range(51)]), stroke=BLUE, sw=2.5)
    s.text(x0 + w / 2, y0 + h + 18, "ℓ", 12, DIM)
    for i, (t, d, c) in enumerate([("volume law: S ∝ ℓ", "hot or random states", PINK), ("log law: S = (c/3) ln ℓ", "critical states, 1+1 CFT", AMB), ("area law: S = constant", "gapped ground states", BLUE)]):
        s.box(410, 122 + i * 48, 210, 40, t, d, c)
    return s


# ---- chapter 5 ----
def f_strings():
    s = Svg(640, 290, "Open and closed strings", "Open strings have two ends stuck to a D-brane and behave like the gluons of a gauge theory. Closed strings are loops that can leave the brane; one of their vibrations is the graviton.")
    head(s, "Two kinds of string, two kinds of physics")
    path(s, "M60 230 L300 230 L360 150 L120 150 Z", stroke=VIO, sw=2, fill=VIO, op=0.12)
    s.text(150, 250, "a D-brane: a sheet where strings can end", 11.5, VIO, anchor="start")
    for (x1, x2, hh) in [(150, 220, 60), (200, 290, 80), (120, 170, 40)]:
        path(s, "M%d 195 C%d %d %d %d %d 195" % (x1, x1, 195 - hh, x2, 195 - hh, x2), stroke=AMB, sw=2.5)
        circ(s, x1, 195, 4, fill=AMB, stroke="none"); circ(s, x2, 195, 4, fill=AMB, stroke="none")
    for (x, y, r) in [(450, 110, 26), (540, 170, 20), (470, 210, 14)]:
        path(s, "M%d %d m-%d 0 c0 -%d %d -%d %d 0 c0 %d -%d %d -%d 0" % (x, y, r, r * 1.2, 2 * r, r * 1.2, 2 * r, r * 0.9, 2 * r, r * 0.9, 2 * r), stroke=GRN, sw=2.5)
    s.box(40, 50, 250, 50, "open strings", "ends on the brane: gauge fields (gluons)", AMB)
    s.box(380, 230, 240, 50, "closed strings", "free loops: gravity (gravitons)", GRN)
    return s


def f_branes():
    s = Svg(640, 340, "Two descriptions of a stack of D3-branes", "At weak coupling, N D3-branes are sheets with open strings on them: a gauge theory. At strong coupling they are replaced by curved space with a deep throat: gravity in AdS5 times a five-sphere. Low energies in both pictures describe the same physics.")
    head(s, "One stack of branes, two pictures")
    for k in range(4):
        path(s, "M50 %d L230 %d L270 %d L90 %d Z" % (200 - k * 10, 200 - k * 10, 160 - k * 10, 160 - k * 10), stroke=VIO, sw=1.5, fill=VIO, op=0.15)
    path(s, "M110 160 C110 110 180 110 180 160", stroke=AMB, sw=2.5); path(s, "M150 172 C150 132 220 132 220 172", stroke=AMB, sw=2.5)
    s.text(160, 232, "N branes + open strings", 12, TX); s.text(160, 252, "= SU(N) gauge theory", 12, AMB); s.text(160, 272, "(N = 4 super Yang-Mills)", 11, DIM)
    s.text(160, 76, "weak coupling picture", 13, VIO, weight="700")
    L, Rr = 380, 610
    path(s, "M%d 120 C460 122 478 150 482 290" % L, stroke=GRN, sw=2.5); path(s, "M%d 120 C530 122 512 150 508 290" % Rr, stroke=GRN, sw=2.5)
    for y, w in [(140, 62), (180, 22), (220, 16), (260, 14)]:
        s.add('<ellipse cx="495" cy="%d" rx="%d" ry="%d" fill="none" stroke="#4fae7c" stroke-width="1"/>' % (y, w, max(3, w // 5)))
    s.text(495, 76, "strong coupling picture", 13, GRN, weight="700")
    s.text(590, 215, "the throat:", 11, DIM, anchor="end"); s.text(590, 231, "AdS₅ × S⁵", 13, GRN, anchor="end")
    s.text(495, 312, "curved space, closed strings = gravity", 12, TX)
    s.text(325, 180, "=", 36, AMB, weight="700"); s.text(325, 206, "Maldacena 1997", 10.5, DIM)
    return s


def f_regimes():
    s = Svg(640, 335, "When each side is easy", "A map with the 't Hooft coupling lambda on the horizontal axis and the number of colours N on the vertical axis. Small lambda: ordinary gauge theory methods work. Large lambda and large N: classical gravity works.")
    head(s, "Each side is easy exactly where the other is hard")
    x0, y0, w, h = 90, 50, 500, 220
    s.rect(x0, y0, w, h, fill=BG, stroke=LINE, r=4)
    s.rect(x0, y0, 150, h, fill=BLUE, stroke="none", r=0); s.add('<rect x="%d" y="%d" width="150" height="%d" fill="%s" fill-opacity="0.75"/>' % (x0, y0, h, BG))
    s.add('<rect x="%d" y="%d" width="190" height="110" fill="%s" fill-opacity="0.25"/>' % (x0 + 310, y0, GRN))
    s.add('<rect x="%d" y="%d" width="190" height="110" fill="%s" fill-opacity="0.15"/>' % (x0 + 310, y0 + 110, AMB))
    s.text(x0 + 75, y0 + 90, "gauge theory", 13, BLUE, weight="700"); s.text(x0 + 75, y0 + 110, "calculations work", 11, BLUE); s.text(x0 + 75, y0 + 130, "(λ ≪ 1)", 11, DIM)
    s.text(x0 + 405, y0 + 44, "classical gravity", 13, GRN, weight="700"); s.text(x0 + 405, y0 + 64, "(λ ≫ 1 and N ≫ 1)", 11, DIM)
    s.text(x0 + 405, y0 + 160, "strings small, but", 11, AMB); s.text(x0 + 405, y0 + 176, "gravity still quantum", 11, AMB)
    s.text(x0 + 230, y0 + 110, "hard for both", 12, PINK)
    s.text(x0 + w / 2, y0 + h + 22, "'t Hooft coupling  λ = g²N   →", 12, DIM); s.text(x0 - 30, y0 + h / 2, "N", 14, DIM); s.arrow(x0 - 30, y0 + h / 2 - 16, x0 - 30, y0 + 20, DIM)
    s.text(320, 322, "L / ℓ_string = λ^(1/4)        Newton's constant G ∝ 1 / N²", 12, AMB)
    return s


# ---- chapter 6 ----
def f_dictionary():
    s = Svg(640, 340, "The holographic dictionary", "A two-column picture pairing bulk quantities with boundary quantities: a field with an operator, its mass with the scaling dimension, the metric with the stress tensor, a gauge field with a conserved current, the radial direction with energy scale, and a black hole with a thermal state.")
    head(s, "The dictionary: every bulk thing has a boundary partner")
    rows = [("field φ in the bulk", "operator O on the boundary"), ("mass m of the field", "scaling dimension Δ"), ("metric g (gravity)", "stress tensor T"), ("gauge field A", "conserved current J"), ("depth z", "energy scale 1/z"), ("black hole", "hot (thermal) state")]
    s.text(170, 56, "BULK (gravity, d+1 dimensions)", 12, GRN, weight="700"); s.text(470, 56, "BOUNDARY (CFT, d dimensions)", 12, AMB, weight="700")
    for i, (a, b) in enumerate(rows):
        y = 68 + i * 43
        s.rect(40, y, 260, 34, stroke=GRN, r=8); s.text(170, y + 22, a, 12.5, TX)
        s.rect(340, y, 260, 34, stroke=AMB, r=8); s.text(470, y + 22, b, 12.5, TX)
        s.line(300, y + 17, 340, y + 17, VIO, 2)
        circ(s, 320, y + 17, 4, fill=VIO, stroke="none")
    return s


def f_witten():
    s = Svg(640, 300, "Witten diagrams", "Three disks standing for AdS. Boundary points are joined through the bulk: a single line for a two-point function, three lines meeting at a bulk point for a three-point function, and an exchange diagram for a four-point function.")
    head(s, "Boundary correlators are computed by bulk paths")
    labs = ["two points", "three points", "four points (exchange)"]
    for i in range(3):
        cx, cy, R = 115 + i * 205, 160, 85
        disk_bg(s, cx, cy, R, 3)
        if i == 0:
            path(s, D(cx, cy, R, bgeo(2.6, 0.5)), stroke=AMB, sw=2.5); ends = [2.6, 0.5]
        elif i == 1:
            ends = [math.pi / 2 + k * 2 * math.pi / 3 for k in range(3)]
            for a in ends: path(s, D(cx, cy, R, geo_pts(0.99999 * cmath.exp(1j * a), 0j)), stroke=AMB, sw=2.5)
            circ(s, cx, cy, 5, fill=PINK, stroke="none")
        else:
            ends = [2.3, 3.98, 0.84, -0.84]; v1, v2 = complex(-0.35, 0), complex(0.35, 0)
            for a, v in zip(ends, [v1, v1, v2, v2]): path(s, D(cx, cy, R, geo_pts(0.99999 * cmath.exp(1j * a), v)), stroke=AMB, sw=2.5)
            path(s, D(cx, cy, R, geo_pts(v1, v2)), stroke=GRN, sw=2.5, dash="5 3")
            circ(s, cx + v1.real * R, cy, 5, fill=PINK, stroke="none"); circ(s, cx + v2.real * R, cy, 5, fill=PINK, stroke="none")
        for a in ends: circ(s, cx + R * math.cos(a), cy + R * math.sin(a), 5, fill=TX, stroke="none")
        s.text(cx, 268, labs[i], 12, DIM)
    s.text(320, 292, "White dots: operators on the boundary. Pink dots: interactions in the bulk, summed over all positions.", 11, AMB)
    return s


def f_rgdepth():
    s = Svg(640, 310, "Depth is energy scale", "A vertical slice of AdS with the boundary at the top. Short-distance, high-energy physics of the boundary theory sits near the boundary; long-distance, low-energy physics sits deep in the bulk. Moving inward is a renormalization group flow.")
    head(s, "The extra dimension is the zoom level")
    x0, y0, w, h = 60, 56, 340, 210
    s.rect(x0, y0, w, h, fill="#120d1e", stroke=LINE, r=4); s.line(x0, y0, x0 + w, y0, AMB, 4)
    for i in range(5):
        y = y0 + 20 + i * 44; lam = 12 + i * 22; pts = []
        for k in range(121):
            x = x0 + 10 + (w - 20) * k / 120; pts.append((x, y + 7 * math.sin((x - x0) / lam * 2 * math.pi)))
        path(s, poly(pts), stroke=[AMB, AMB, VIO, BLUE, BLUE][i], sw=1.8)
    s.text(x0 + w / 2, y0 - 10, "boundary (z = 0): UV, short distances, high energy", 11.5, AMB)
    s.text(x0 + w / 2, y0 + h + 18, "deep bulk (large z): IR, long distances, low energy", 11.5, BLUE)
    s.arrow(430, 70, 430, 256, VIO); s.text(445, 120, "renormalization", 12, VIO, anchor="start"); s.text(445, 138, "group flow:", 12, VIO, anchor="start"); s.text(445, 156, "blur out the details,", 11, DIM, anchor="start"); s.text(445, 172, "keep the big picture", 11, DIM, anchor="start")
    s.text(445, 220, "energy ~ 1 / z", 14, TX, anchor="start")
    return s


# ---- chapter 7 ----
def f_rt():
    s = Svg(640, 360, "The Ryu-Takayanagi formula", "A slice of AdS as a disk. A boundary region A is joined by the minimal bulk curve gamma A. The entanglement entropy of A equals the length of that curve divided by 4G. Larger regions have curves that reach deeper.")
    head(s, "Entanglement entropy = area of a minimal surface")
    ox, oy, R = 190, 195, 150
    disk_bg(s, ox, oy, R)
    for (a, b, c, sw) in [(-0.35, 0.35, "#8a6a2a", 1.5), (-0.8, 0.8, "#b8902f", 1.8), (-1.35, 1.35, AMB, 3.2)]:
        path(s, D(ox, oy, R, bgeo(a, b)), stroke=c, sw=sw)
    pts = [(ox + R * math.cos(t), oy + R * math.sin(t)) for t in [(-1.35 + 2.7 * k / 40) for k in range(41)]]
    path(s, poly(pts), stroke=GRN, sw=7)
    s.text(ox + R + 16, oy + 5, "A", 16, GRN, weight="700"); s.text(ox - 2, oy - 40, "γ_A", 14, AMB, anchor="end")
    s.rect(380, 70, 240, 70, stroke=AMB, r=12); s.text(500, 100, "S(A) = Area(γ_A) / 4G", 16, AMB, weight="700"); s.text(500, 124, "Ryu and Takayanagi, 2006", 10.5, DIM)
    s.text(500, 176, "In AdS₃ the 'area' is a length:", 12, TX); s.text(500, 204, "S = (c/3) ln( ℓ / ε )", 15, TX); s.text(500, 228, "with c = 3L / 2G", 12, DIM)
    s.text(500, 270, "ℓ: size of A      ε: short-distance cutoff", 11, DIM); s.text(500, 300, "Same form as black hole entropy,", 11.5, VIO); s.text(500, 318, "but for any region.", 11.5, VIO)
    return s


def f_twointervals():
    s = Svg(640, 320, "Two intervals, two candidate surfaces", "Two disks. On the left two small far-apart regions: the minimal surfaces are separate and the regions share no mutual information at leading order. On the right two large regions: the bridging surfaces are shorter and the entanglement wedge is connected.")
    head(s, "The minimal surface can jump")
    for i, (al, t1, t2) in enumerate([(0.5, "small arcs: separate curves win", "I(A:B) = 0, wedges disconnected"), (1.25, "large arcs: bridging curves win", "I(A:B) > 0, wedge connected")]):
        ox, oy, R = 165 + i * 310, 165, 110
        disk_bg(s, ox, oy, R, 4)
        con = i == 1
        if con:
            band = bgeo(al, math.pi - al) + bgeo(math.pi + al, 2 * math.pi - al)
            path(s, D(ox, oy, R, bgeo(al, math.pi - al) + [cmath.exp(1j * (math.pi - al + (2 * al) * k / 20)) for k in range(21)] + bgeo(math.pi + al, 2 * math.pi - al) + [cmath.exp(1j * (-al + (2 * al) * k / 20)) for k in range(21)]) + "Z", stroke="none", fill=GRN, op=0.18)
        else:
            for c in (0, math.pi):
                path(s, D(ox, oy, R, bgeo(c - al, c + al) + [cmath.exp(1j * (c + al - 2 * al * k / 20)) for k in range(21)]) + "Z", stroke="none", fill=GRN, op=0.18)
        for c in (0, math.pi):
            path(s, D(ox, oy, R, [cmath.exp(1j * (c - al + 2 * al * k / 20)) for k in range(21)]), stroke=GRN, sw=6)
            path(s, D(ox, oy, R, bgeo(c - al, c + al)), stroke=PINK, sw=1 if con else 3, dash="4 3" if con else None)
        path(s, D(ox, oy, R, bgeo(al, math.pi - al)), stroke=BLUE, sw=3 if con else 1, dash=None if con else "4 3")
        path(s, D(ox, oy, R, bgeo(math.pi + al, 2 * math.pi - al)), stroke=BLUE, sw=3 if con else 1, dash=None if con else "4 3")
        s.text(ox + R + 14, oy + 5, "A", 14, GRN); s.text(ox - R - 14, oy + 5, "B", 14, GRN)
        s.text(ox, 296, t1, 12, TX); s.text(ox, 313, t2, 11, DIM)
    return s


def f_pinch():
    s = Svg(640, 290, "Disentangling pulls space apart", "Three shapes from left to right: one connected blob of space, the same blob with a thinning neck as the entanglement between the two halves is reduced, and two separate blobs when the entanglement is gone.")
    head(s, "Remove the entanglement and space falls apart")
    for i, (neck, lab) in enumerate([(52, "lots of entanglement"), (16, "less entanglement"), (0, "none: two separate spaces")]):
        cx = 115 + i * 205; cy = 150
        if neck:
            d = "M%d %d C%d %d %d %d %d %d C%d %d %d %d %d %d C%d %d %d %d %d %d C%d %d %d %d %d %d Z" % (
                cx - 80, cy, cx - 80, cy - 70, cx - 30, cy - 70, cx, cy - neck / 2, cx + 30, cy - 70, cx + 80, cy - 70, cx + 80, cy,
                cx + 80, cy + 70, cx + 30, cy + 70, cx, cy + neck / 2, cx - 30, cy + 70, cx - 80, cy + 70, cx - 80, cy)
            path(s, d, stroke=VIO, sw=2, fill=VIO, op=0.15)
        else:
            circ(s, cx - 46, cy, 40, fill=VIO, stroke=VIO, sw=2, op=0.15); circ(s, cx + 46, cy, 40, fill=VIO, stroke=VIO, sw=2, op=0.15)
        n = [7, 3, 0][i]
        for k in range(n):
            y = cy - (n - 1) * 5 + k * 10
            s.line(cx - 40, y, cx + 40, y, AMB, 1.2, dash="3 3")
        s.text(cx - 46, cy + 70, "A", 13, DIM); s.text(cx + 46, cy + 70, "B", 13, DIM); s.text(cx, 250, lab, 12, TX)
    s.text(320, 278, "Gold threads: entanglement between the two halves of the boundary theory (Van Raamsdonk, 2010).", 11, AMB)
    return s


# ---- chapter 8 ----
def f_btz():
    s = Svg(640, 340, "Entanglement around a black hole", "A disk with a black hole horizon in the middle. For a small boundary region the minimal curve stays outside the horizon. For a large region the minimal surface is the short curve on the far side plus the horizon itself, so the entropies of a region and its complement differ by the black hole entropy.")
    head(s, "A horizon gets in the way of the minimal curves")
    for i, big in enumerate([False, True]):
        ox, oy, R, rh = 165 + i * 310, 170, 115, 44
        disk_bg(s, ox, oy, R, 4)
        circ(s, ox, oy, rh, fill="#000", stroke=PINK, sw=4 if big else 2)
        half = 2.75 if big else 0.9
        path(s, D(ox, oy, R, [cmath.exp(1j * (-math.pi / 2 - half + 2 * half * k / 40)) for k in range(41)]), stroke=GRN, sw=6)
        def hug(a0, a1, col):
            pts = []
            for k in range(41):
                u = k / 40; th = a0 + (a1 - a0) * u; span = abs(a1 - a0)
                depth = max(rh + 8, R * (1 - min(1, span / math.pi) * 0.9)); r = R - (R - depth) * math.sin(math.pi * u) ** 0.6
                pts.append((ox + r * math.cos(th), oy + r * math.sin(th)))
            path(s, poly(pts), stroke=col, sw=3)
        if big: hug(-math.pi / 2 + half, -math.pi / 2 - half + 2 * math.pi, AMB)
        else: hug(-math.pi / 2 - half, -math.pi / 2 + half, AMB)
        s.text(ox, oy - R - 10 if not big else oy + R + 22, "A", 14, GRN)
        s.text(ox, 316, "small region: curve avoids the horizon" if not big else "large region: short curve + whole horizon", 12, TX)
    s.text(320, 334, "S(A) − S(rest) = black hole entropy, for large A", 11.5, AMB)
    return s


def f_tfd():
    s = Svg(640, 300, "The thermofield double and the wormhole", "Two separate boundary systems, left and right, in an entangled state. In the bulk they are the two outsides of one black hole, joined through the interior by an Einstein-Rosen bridge. The entanglement is the bridge.")
    head(s, "Two entangled systems = two sides of one black hole")
    path(s, "M90 70 C200 110 200 190 90 230", stroke=AMB, sw=4); path(s, "M550 70 C440 110 440 190 550 230", stroke=AMB, sw=4)
    path(s, "M90 70 C240 120 400 120 550 70", stroke=VIO, sw=1.5); path(s, "M90 230 C240 180 400 180 550 230", stroke=VIO, sw=1.5)
    path(s, "M90 70 C240 120 400 120 550 70 L550 230 C400 180 240 180 90 230 Z", stroke="none", fill=VIO, op=0.1)
    s.add('<ellipse cx="320" cy="150" rx="14" ry="42" fill="none" stroke="%s" stroke-width="2.5"/>' % PINK)
    s.text(320, 212, "horizon", 11, PINK); s.text(320, 96, "the bridge (wormhole)", 12, VIO)
    s.text(70, 155, "L", 18, AMB, weight="700"); s.text(570, 155, "R", 18, AMB, weight="700")
    for k in range(5):
        y = 110 + k * 20
        s.line(120 + abs(k - 2) * 8, y, 520 - abs(k - 2) * 8, y, AMB, 0.8, dash="2 5")
    s.text(320, 262, "|TFD⟩ = Σ e^(−βE/2) |E⟩_L |E⟩_R", 15, TX)
    s.text(320, 286, "Each side alone looks thermal. Together they are one pure state. (Maldacena 2001; ER = EPR 2013)", 11, DIM)
    return s


def f_hp():
    s = Svg(640, 300, "The Hawking-Page transition", "Free energy against temperature for two candidate geometries. Below the transition temperature, empty AdS filled with thermal gas has the lower free energy. Above it the black hole wins. In the boundary theory this is deconfinement.")
    head(s, "Which geometry wins depends on temperature")
    x0, y0, w, h = 70, 50, 330, 200
    s.rect(x0, y0, w, h, fill=BG, stroke=LINE, r=4)
    yA = y0 + 70; s.line(x0, yA, x0 + w, yA, BLUE, 2.5)
    pts = [(x0 + w * k / 60, yA - 55 + (k / 60 * 1.6) ** 2 * 55 * 1.0) for k in range(61)]
    path(s, poly([p for p in pts if p[1] < y0 + h]), stroke=PINK, sw=2.5)
    xc = x0 + w / 1.6; s.line(xc, y0, xc, y0 + h, AMB, 1.2, dash="4 4"); s.text(xc, y0 + h + 16, "T = 1 / 2πL", 11, AMB)
    s.text(x0 + 270, yA - 8, "thermal AdS", 12, BLUE); s.text(x0 + 60, yA - 34, "black hole", 12, PINK)
    s.text(x0 + w / 2, y0 + h + 34, "temperature →", 11, DIM); s.text(x0 - 26, y0 + 20, "F", 14, DIM)
    s.box(430, 60, 190, 60, "cold: thermal AdS", "few degrees of freedom (confined)", BLUE)
    s.box(430, 140, 190, 60, "hot: black hole", "entropy ∝ N² (deconfined)", PINK)
    s.text(525, 232, "lowest free energy wins", 12, AMB)
    return s


# ---- chapter 9 ----
def f_blocks():
    s = Svg(640, 320, "Coarse-graining builds a tree", "Rows of sites. Each row is a blurred summary of the row below, with half as many sites. Stacked up, the rows form a tree whose height is the logarithm of the system size, with the fine-grained system along one edge.")
    head(s, "Blur, summarise, repeat: a new direction appears")
    y0 = 262
    n, x0, w = 32, 40, 420
    for lev in range(5):
        m = n >> lev; y = y0 - lev * 46
        for k in range(m):
            x = x0 + (k + 0.5) * w / m
            if lev < 4: s.line(x, y, x0 + ((k >> 1) + 0.5) * w / (m >> 1), y - 46, "#6b5c8f", 1)
            circ(s, x, y, 4.5 if lev else 4, fill=[AMB, VIO, VIO, BLUE, BLUE][lev], stroke="none")
    s.text(x0 + w / 2, y0 + 26, "the quantum system itself (finest detail)", 11.5, AMB)
    s.arrow(486, y0, 486, y0 - 180, VIO); s.text(500, y0 - 150, "coarser,", 12, VIO, anchor="start"); s.text(500, y0 - 132, "lower energy", 12, VIO, anchor="start")
    s.text(500, y0 - 90, "32 sites need", 12, TX, anchor="start"); s.text(500, y0 - 72, "log₂ 32 = 5 steps", 12, TX, anchor="start")
    s.text(500, y0 - 30, "This direction is", 11.5, DIM, anchor="start"); s.text(500, y0 - 14, "the bulk's depth.", 11.5, DIM, anchor="start")
    return s


def f_mera():
    s = Svg(640, 340, "A tensor network and its minimal cut", "A layered tensor network (MERA-like) with the physical sites along the bottom. To separate a block of sites from the rest, the cheapest cut goes up and over through the sparse upper layers, cutting a number of bonds that grows only like the logarithm of the block size.")
    head(s, "Entropy is bounded by the cheapest cut")
    n, x0, w, y0 = 32, 40, 560, 280
    A0, A1 = 8, 20
    for lev in range(5):
        m = n >> lev; y = y0 - lev * 50
        for k in range(m):
            x = x0 + (k + 0.5) * w / m
            if lev < 4: s.line(x, y, x0 + ((k >> 1) + 0.5) * w / (m >> 1), y - 50, "#6b5c8f", 1.1)
            if lev >= 1 and k < m - 1: s.line(x, y, x0 + (k + 1.5) * w / m, y, "#3f5f8f", 1)
        for k in range(m):
            x = x0 + (k + 0.5) * w / m
            inA = lev == 0 and A0 <= k < A1
            if lev == 0: circ(s, x, y, 4.5, fill=GRN if inA else "#6b5c8f", stroke="none")
            else: s.add('<rect x="%.1f" y="%.1f" width="10" height="10" rx="2" fill="%s"/>' % (x - 5, y - 5, VIO if lev % 2 else BLUE))
    xa, xb = x0 + A0 * w / n - 2, x0 + A1 * w / n + 2
    path(s, "M%.1f %d C%.1f %d %.1f %d %.1f %d" % (xa, y0 + 14, xa - 6, y0 - 190, xb + 6, y0 - 190, xb, y0 + 14), stroke=AMB, sw=3, dash="7 4")
    s.text((xa + xb) / 2, y0 + 30, "region A", 12, GRN); s.text((xa + xb) / 2, y0 - 168, "cheapest cut", 12, AMB)
    s.text(320, 328, "bonds cut ∝ log(size of A): the same law as a geodesic in hyperbolic space", 12, TX)
    return s


def f_happy():
    s = Svg(640, 400, "A holographic code from perfect tensors", "The hyperbolic plane tiled with pentagons. A six-leg perfect tensor sits on every pentagon: five legs join neighbours, one dangling leg in the middle is a bulk logical qubit. The legs left open at the rim are the physical boundary qubits.")
    head(s, "The HaPPY code: a tiling made of error-correcting tensors")
    ox, oy, R = 200, 215, 170
    circ(s, ox, oy, R, fill="#120d1e", stroke=VIO, sw=2)
    T = tiling(5, 4, 3); cens = {}
    for pg, lev in T:
        pts = []
        for k in range(5): pts += geo_pts(pg[k], pg[(k + 1) % 5], 6)[:-1]
        path(s, D(ox, oy, R, pts) + "Z", stroke="#5a4c80", sw=0.7, fill=["#2c2050", "#22304f", "#2a2146", "#1f2c44"][lev])
    cs = [(sum(pg) / 5, lev) for pg, lev in T]
    for i, (c1, l1) in enumerate(cs):
        for j, (c2, l2) in enumerate(cs):
            if j > i and math.acosh(1 + 2 * abs(c1 - c2) ** 2 / ((1 - abs(c1) ** 2) * (1 - abs(c2) ** 2))) < 2.2:
                path(s, D(ox, oy, R, geo_pts(c1, c2, 6)), stroke=AMB, sw=1.1)
    for c, lev in cs:
        if lev == 3:
            u = c / abs(c); s.line(ox + c.real * R, oy + c.imag * R, ox + u.real * R, oy + u.imag * R, GRN, 1)
        r = 6 if lev == 0 else 4.5 if lev == 1 else 3 if lev == 2 else 1.8
        circ(s, ox + c.real * R, oy + c.imag * R, r, fill=PINK, stroke="none")
    s.box(400, 64, 222, 58, "pink dots", "bulk logical qubits (one per tile)", PINK)
    s.box(400, 136, 222, 58, "gold links", "contracted legs: entanglement", AMB)
    s.box(400, 208, 222, 58, "green legs at the rim", "physical boundary qubits", GRN)
    s.text(511, 300, "Perfect tensor: any 3 of its 6 legs", 11.5, TX); s.text(511, 318, "are maximally entangled with the", 11.5, TX); s.text(511, 336, "other 3. That makes RT exact here.", 11.5, TX)
    s.text(511, 372, "Pastawski, Yoshida, Harlow, Preskill 2015", 10, DIM)
    return s


# ---- chapter 10 ----
def f_qutrit():
    s = Svg(640, 320, "The three-qutrit code", "One logical qutrit is encoded in three physical qutrits at the corners of a triangle. No single corner holds any information. Any side of the triangle, two qutrits together, can recover the logical qutrit.")
    head(s, "A secret shared by three, readable by any two")
    P = [(200, 70), (310, 250), (90, 250)]
    for i in range(3):
        a, b = P[i], P[(i + 1) % 3]; s.line(a[0], a[1], b[0], b[1], [GRN, BLUE, AMB][i], 4)
    circ(s, 200, 185, 22, fill=VIO, stroke="none"); s.text(200, 190, "ψ", 18, "#120d1e", weight="700"); s.text(200, 224, "logical qutrit", 10.5, VIO)
    for i, p in enumerate(P):
        circ(s, p[0], p[1], 24, fill="#1b1429", stroke=TX, sw=2); s.text(p[0], p[1] + 6, str(i + 1), 18, TX, weight="700")
    x = 370
    s.text(x, 74, "|0̃⟩ = ( |000⟩ + |111⟩ + |222⟩ ) / √3", 12.5, TX, anchor="start")
    s.text(x, 98, "|1̃⟩ = ( |012⟩ + |120⟩ + |201⟩ ) / √3", 12.5, TX, anchor="start")
    s.text(x, 122, "|2̃⟩ = ( |021⟩ + |102⟩ + |210⟩ ) / √3", 12.5, TX, anchor="start")
    s.box(x, 150, 250, 46, "one qutrit alone", "completely random: learns nothing", PINK)
    s.box(x, 206, 250, 46, "any two qutrits", "recover ψ exactly", GRN)
    s.text(x + 125, 282, "Same logical operator, three different", 11.5, AMB); s.text(x + 125, 300, "physical homes: sides 12, 23 and 31.", 11.5, AMB)
    return s


def f_wedges():
    s = Svg(640, 360, "Bulk reconstruction and entanglement wedges", "A disk whose boundary is split into three arcs A, B and C. A bulk point at the centre lies outside the wedge of each single arc but inside the wedge of any two arcs together. A point near the rim lies in the wedge of a single small arc.")
    head(s, "Which boundary region can read a bulk point?")
    ox, oy, R = 190, 188, 136
    disk_bg(s, ox, oy, R)
    cols = [GRN, BLUE, AMB]
    for k in range(3):
        a0 = -math.pi / 2 + k * 2 * math.pi / 3; a1 = a0 + 2 * math.pi / 3
        arc = [cmath.exp(1j * (a0 + (a1 - a0) * t / 30)) for t in range(31)]
        path(s, D(ox, oy, R, arc + bgeo(a1, a0)) + "Z", stroke="none", fill=cols[k], op=0.14)
        path(s, D(ox, oy, R, arc), stroke=cols[k], sw=6); path(s, D(ox, oy, R, bgeo(a0, a1)), stroke=cols[k], sw=2)
        m = (a0 + a1) / 2; s.text(ox + (R + 18) * math.cos(m), oy + (R + 18) * math.sin(m) + 5, "ABC"[k], 16, cols[k], weight="700")
    circ(s, ox, oy, 7, fill=PINK, stroke=TX, sw=1.5); s.text(ox + 14, oy - 8, "x", 14, PINK)
    px, py = ox + 0.84 * R * math.cos(-0.52), oy + 0.84 * R * math.sin(-0.52)
    circ(s, px, py, 6, fill=TX, stroke="none"); s.text(px - 12, py - 8, "y", 14, TX)
    s.box(382, 60, 240, 56, "centre point x", "not in the wedge of A, B or C alone", PINK)
    s.box(382, 128, 240, 56, "but x is readable from", "A∪B, or B∪C, or C∪A", VIO)
    s.box(382, 196, 240, 56, "point y near the rim", "readable from the small arc beside it", TX)
    s.text(502, 286, "Exactly the three-qutrit pattern:", 12, AMB); s.text(502, 304, "lose any one arc, and x survives.", 12, AMB)
    s.text(502, 334, "Almheiri, Dong, Harlow 2014", 10, DIM)
    return s


def f_codespace():
    s = Svg(640, 320, "The code subspace", "A large box, the full Hilbert space of the boundary theory, contains a small region, the code subspace of states that look like quantum fields on a smooth bulk geometry. Bulk operators are logical operators; boundary operators that act the same way on the code subspace are their physical representatives.")
    head(s, "The bulk is a small protected corner of the boundary theory")
    s.rect(40, 54, 330, 230, stroke=AMB, r=14); s.text(205, 78, "all states of the CFT (physical space)", 12, AMB)
    s.add('<ellipse cx="205" cy="185" rx="92" ry="62" fill="%s" fill-opacity="0.2" stroke="%s" stroke-width="2"/>' % (GRN, GRN))
    s.text(205, 176, "code subspace", 13, GRN, weight="700"); s.text(205, 196, "smooth bulk + a few particles", 10.5, TX)
    for (x, y) in [(80, 120), (330, 250), (320, 110), (70, 250)]:
        circ(s, x, y, 3, fill=DIM, stroke="none")
    s.text(310, 268, "black holes, messy states ...", 10, DIM, anchor="end")
    rows = [("logical qubits", "bulk fields", GRN), ("logical operator", "bulk operator φ(x)", GRN), ("physical qubits", "boundary degrees of freedom", AMB), ("erasure of qubits", "losing a boundary region", PINK), ("recovery", "reconstruction on what is left", VIO)]
    for i, (a, b, c) in enumerate(rows):
        y = 60 + i * 46
        s.rect(396, y, 226, 38, stroke=c, r=8); s.text(509, y + 16, a, 12, c, weight="700"); s.text(509, y + 31, b, 10.5, TX)
    return s


# ---- chapter 11 ----
def f_ladders():
    s = Svg(640, 340, "Three ladders that look alike", "Three columns side by side: a deep neural network with layers from raw input to abstract features; a renormalization group flow from microscopic detail to long-distance physics; and the radial direction of AdS from the boundary into the bulk.")
    head(s, "Layers, scales and depth")
    cols = [("deep network", ["input: raw pixels", "edges", "shapes", "objects", "output: 'cat'"], BLUE), ("renormalization", ["microscopic spins", "blocks", "bigger blocks", "long-distance", "fixed point"], VIO), ("AdS bulk", ["boundary z = 0", "shallow bulk", "deeper", "deep bulk", "centre / horizon"], GRN)]
    for i, (t, rows, c) in enumerate(cols):
        x = 40 + i * 200
        s.text(x + 80, 60, t, 14, c, weight="700")
        for k, r in enumerate(rows):
            y = 74 + k * 46; w = 160 - k * 18
            s.rect(x + 80 - w / 2, y, w, 30, stroke=c, r=8); s.text(x + 80, y + 20, r, 11, TX)
            if k < 4: s.arrow(x + 80, y + 30, x + 80, y + 46, c)
    s.text(320, 322, "Each step keeps what matters at the next scale and forgets the rest.", 12, AMB)
    return s


def f_efl():
    s = Svg(640, 340, "Entanglement feature learning", "A pipeline. A quantum state gives entanglement entropies for many regions. A random tensor network maps to a Boltzmann machine whose couplings are the bond strengths. Training adjusts the couplings until the model reproduces the entropies. The trained network's shape is the emergent geometry: hyperbolic for a critical state.")
    head(s, "Learning a geometry from entanglement data")
    s.box(24, 60, 130, 70, "quantum state", "e.g. free fermions", AMB)
    s.box(24, 190, 130, 70, "data", "S(A) of many regions", AMB)
    s.arrow(89, 130, 89, 190, AMB)
    s.rect(196, 60, 220, 200, stroke=VIO, r=12); s.text(306, 82, "random tensor network", 12.5, VIO, weight="700"); s.text(306, 98, "= Boltzmann machine (Ising model)", 10.5, DIM)
    import random; rnd = random.Random(4)
    L = [[(226 + k * (160 / (n - 1)) if n > 1 else 306, 236 - li * 38) for k in range(n)] for li, n in enumerate([8, 6, 4, 2])]
    for li in range(3):
        for a in L[li]:
            for b in L[li + 1]:
                if abs(a[0] - b[0]) < 60: s.line(a[0], a[1], b[0], b[1], "#8a7bb0", 0.5 + rnd.random() * 2.2)
    for li, row in enumerate(L):
        for p in row: circ(s, p[0], p[1], 5, fill=GRN if li == 0 else PINK, stroke="none")
    s.text(306, 254, "visible layer = boundary sites", 9.5, GRN)
    s.arrow(154, 225, 196, 225, AMB); s.text(175, 216, "train", 10, AMB)
    s.arrow(416, 160, 456, 160, VIO)
    ox, oy, R = 540, 150, 76
    disk_bg(s, ox, oy, R, 4)
    for a, b in [(-0.4, 0.4), (0.9, 2.2), (2.6, 3.7), (4.1, 5.2), (-1.2, 1.6)]:
        path(s, D(ox, oy, R, bgeo(a, b)), stroke=AMB, sw=1.3)
    s.text(540, 250, "learned bond strengths", 11.5, TX); s.text(540, 268, "= emergent geometry", 11.5, TX)
    s.text(320, 300, "Critical state in → hyperbolic (AdS-like) network out.", 12.5, AMB)
    s.text(320, 322, "You, Yang and Qi, 2017 (PIRSA talk 17110111)", 10.5, DIM)
    return s


def f_adsdl():
    s = Svg(640, 320, "The bulk as a deep network", "The radial direction of AdS is cut into slices. Each slice is a layer of a neural network: the field and its radial derivative at one slice are computed from the previous slice, with the metric function playing the role of the weights. Input: boundary data. Output: a condition at the horizon.")
    head(s, "AdS/CFT as a deep neural network")
    xs = [80 + k * 80 for k in range(6)]
    for k, x in enumerate(xs):
        s.line(x, 80, x, 220, "#2a3f66", 1, dash="3 4")
        for j, (y, lab) in enumerate([(120, "φ"), (180, "π")]):
            if k < 5:
                for y2 in (120, 180): s.line(x, y, xs[k + 1], y2, VIO if y == y2 else "#8a7bb0", 2.2 if y == y2 else 1)
            circ(s, x, y, 13, fill="#1b1429", stroke=GRN if k == 0 else PINK if k == 5 else BLUE, sw=2); s.text(x, y + 4, lab, 11, TX)
        if k < 5: s.text(x + 40, 244, "h(η%d)" % (k + 1), 10, VIO)
    s.text(80, 66, "boundary", 12, GRN, weight="700"); s.text(480, 66, "horizon", 12, PINK, weight="700")
    s.arrow(120, 270, 440, 270, DIM); s.text(280, 288, "radial coordinate η: one network layer per slice", 11.5, DIM)
    s.box(530, 90, 96, 56, "input", "boundary data", GRN); s.box(530, 160, 96, 56, "weights", "the metric h(η)", VIO)
    s.text(320, 310, "Train on boundary measurements; read the emergent metric from the weights. (Hashimoto et al., 2018)", 10.5, AMB)
    return s


# ---- chapter 12 ----
def f_page():
    s = Svg(640, 320, "The Page curve", "Entropy of the Hawking radiation against time. Hawking's calculation rises forever. If evaporation is unitary the entropy must follow the Page curve: rise until the Page time, then fall to zero as the black hole disappears.")
    head(s, "The entropy of the radiation must come back down")
    x0, y0, w, h = 70, 50, 380, 210
    s.rect(x0, y0, w, h, fill=BG, stroke=LINE, r=4)
    s.line(x0, y0 + h, x0 + w * 0.92, y0 + h - h * 0.92, PINK, 2.5, dash="6 4")
    path(s, poly([(x0, y0 + h), (x0 + w / 2, y0 + h / 2), (x0 + w, y0 + h)]), stroke=AMB, sw=3)
    path(s, poly([(x0, y0 + 8), (x0 + w, y0 + h)]), stroke=BLUE, sw=1.5, dash="2 4")
    s.line(x0 + w / 2, y0, x0 + w / 2, y0 + h, DIM, 1, dash="4 4"); s.text(x0 + w / 2, y0 + h + 16, "Page time", 11, DIM)
    s.text(x0 + w * 0.66, y0 + 44, "Hawking", 12, PINK); s.text(x0 + w * 0.8, y0 + h * 0.62, "Page", 12, AMB); s.text(x0 + 100, y0 + 26, "black hole entropy", 10.5, BLUE)
    s.text(x0 + w / 2, y0 + h + 36, "time (fraction evaporated) →", 11, DIM)
    s.box(470, 60, 150, 62, "before", "radiation entropy rises", PINK); s.box(470, 136, 150, 62, "after", "limited by what is left", AMB)
    s.text(545, 232, "S = min of the two", 12.5, TX)
    return s


def f_island():
    s = Svg(640, 350, "The island", "After the Page time the entanglement wedge of the radiation includes a region inside the black hole called the island, bounded by a quantum extremal surface. The interior is then encoded in the radiation, and the entropy is given by the island's boundary area plus bulk entropy.")
    head(s, "After the Page time, part of the inside belongs to the radiation")
    circ(s, 180, 165, 90, fill="#000", stroke=PINK, sw=2.5)
    circ(s, 180, 165, 58, fill=GRN, stroke=GRN, sw=2, dash="5 4", op=0.25)
    s.text(180, 160, "island", 14, GRN, weight="700"); s.text(180, 180, "(inside)", 10.5, GRN); s.text(180, 276, "black hole", 12, PINK)
    for k in range(9):
        a = -0.9 + k * 0.22; x = 330 + k * 30; y = 165 + 70 * math.sin(a * 2.2)
        path(s, "M%.1f %.1f q8 -8 16 0 t16 0" % (x, y), stroke=AMB, sw=1.8)
    s.rect(320, 78, 300, 176, fill="none", stroke=AMB, r=12, dash="6 5"); s.text(470, 72, "Hawking radiation R (far away)", 12, AMB)
    path(s, "M238 150 C280 110 300 110 330 130", stroke=GRN, sw=1.5, dash="4 4")
    s.text(320, 312, "S(R) = min over islands I of [ Area(∂I) / 4G + S_bulk(R ∪ I) ]", 13.5, TX)
    s.text(320, 334, "No island: Hawking's rising answer.  With island: the falling part of the Page curve.", 11, DIM)
    return s


# ---- chapter 13 ----
def f_unify():
    s = Svg(640, 380, "One object, four faces", "A diagram with the holographic state at the centre and four linked views around it: geometry, entanglement, error-correcting code and neural network, joined by the results that connect them.")
    head(s, "One object, four ways of seeing it")
    cx, cy = 320, 200
    circ(s, cx, cy, 52, fill=VIO, stroke=VIO, sw=2, op=0.2); s.text(cx, cy - 4, "holographic", 13, TX, weight="700"); s.text(cx, cy + 14, "state", 13, TX, weight="700")
    nodes = [(cx, 78, "GEOMETRY", "curved bulk space, minimal surfaces", GRN), (cx + 215, cy, "ENTANGLEMENT", "entropies of boundary regions", AMB), (cx, 322, "CODE", "bulk = logical, boundary = physical", PINK), (cx - 215, cy, "NETWORK", "layers, weights, learning", BLUE)]
    for (x, y, t, sub, c) in nodes:
        s.rect(x - 100, y - 26, 200, 52, stroke=c, r=12); s.text(x, y - 4, t, 13, c, weight="700"); s.text(x, y + 14, sub, 10, TX)
    links = [((cx + 100, 90), (cx + 190, 172), "Ryu-Takayanagi"), ((cx + 190, 228), (cx + 100, 310), "entanglement wedge"), ((cx - 100, 310), (cx - 190, 228), "tensor network codes"), ((cx - 190, 172), (cx - 100, 90), "depth = scale (RG)")]
    for (a, b, t) in links:
        s.line(a[0], a[1], b[0], b[1], DIM, 1.6)
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        s.text(mx + (46 if mx > cx else -46), my + (0 if abs(my - cy) < 5 else (-6 if my < cy else 14)), t, 10.5, DIM)
    for (x, y, t, sub, c) in nodes:
        dx, dy = x - cx, y - cy; d = math.hypot(dx, dy)
        s.line(cx + dx / d * 54, cy + dy / d * 54, x - dx / d * (102 if dx else 28), y - dy / d * (102 if dx else 28), c, 2)
    return s


def f_timeline():
    s = Svg(640, 300, "A timeline of the ideas", "Milestones from 1973 to 2019: black hole entropy, the holographic principle, the AdS/CFT correspondence, the Ryu-Takayanagi formula, building spacetime from entanglement, holographic error-correcting codes, deep-learning approaches, and the island derivation of the Page curve.")
    head(s, "Fifty years in one line")
    ev = [(1973, "black hole entropy", AMB), (1993, "holographic principle", VIO), (1997, "AdS/CFT", GRN), (2006, "RT formula", AMB), (2010, "space from entanglement", BLUE), (2014, "error correction", PINK), (2017, "deep learning links", BLUE), (2019, "islands, Page curve", GRN)]
    x0, x1, y = 60, 580, 150
    s.line(x0 - 20, y, x1 + 20, y, LINE, 3)
    for i, (yr, t, c) in enumerate(ev):
        x = x0 + (x1 - x0) * i / (len(ev) - 1); up = i % 2 == 0
        circ(s, x, y, 6, fill=c, stroke="none"); s.line(x, y, x, y - 46 if up else y + 46, c, 1.2)
        s.text(x, y - 86 if up else y + 64, str(yr), 12.5, c, weight="700")
        words = t.split(" "); half = (len(words) + 1) // 2 if len(t) > 14 else len(words)
        lines = [" ".join(words[:half])] + ([" ".join(words[half:])] if half < len(words) else [])
        for li, ln in enumerate(lines): s.text(x, (y - 56 if up else y + 80) + li * 13 - (13 * (len(lines) - 1) if up else 0), ln, 10.5, TX)
    s.text(320, 280, "Each step turned a puzzle about black holes into a statement about quantum information.", 11.5, AMB)
    return s


ALL = {"holo-area.svg": f_area, "holo-hologram.svg": f_hologram, "holo-curvature.svg": f_curv, "holo-disk.svg": f_disk, "holo-halfplane.svg": f_halfplane, "holo-cylinder.svg": f_cylinder,
       "holo-slices.svg": f_slices, "holo-entangle.svg": f_entangle, "holo-scaling.svg": f_scaling, "holo-laws.svg": f_laws, "holo-strings.svg": f_strings, "holo-branes.svg": f_branes,
       "holo-regimes.svg": f_regimes, "holo-dictionary.svg": f_dictionary, "holo-witten.svg": f_witten, "holo-rgdepth.svg": f_rgdepth, "holo-rt.svg": f_rt, "holo-twointervals.svg": f_twointervals,
       "holo-pinch.svg": f_pinch, "holo-btz.svg": f_btz, "holo-tfd.svg": f_tfd, "holo-hp.svg": f_hp, "holo-blocks.svg": f_blocks, "holo-mera.svg": f_mera, "holo-happy.svg": f_happy,
       "holo-qutrit.svg": f_qutrit, "holo-wedges.svg": f_wedges, "holo-codespace.svg": f_codespace, "holo-ladders.svg": f_ladders, "holo-efl.svg": f_efl, "holo-adsdl.svg": f_adsdl,
       "holo-page.svg": f_page, "holo-island.svg": f_island, "holo-unify.svg": f_unify, "holo-timeline.svg": f_timeline}


def build_all(outdir="/tmp/holo_figs"):
    os.makedirs(outdir, exist_ok=True)
    res = {}
    for fn, f in ALL.items():
        svg = f().render(); open(os.path.join(outdir, fn), "w", encoding="utf-8").write(svg); res[fn] = svg
    return res


if __name__ == "__main__":
    r = build_all(); print(len(r), "figures", sum(len(v) for v in r.values()) // 1024, "KB")
