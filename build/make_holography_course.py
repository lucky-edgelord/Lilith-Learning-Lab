#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the Holography course: AdS/CFT from black hole entropy to quantum error correction and deep learning.
13 chapters, 35 computed figures, 13 interactive labs (build/holo). Usage: python3 make_holography_course.py [out.json]"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "holo"))
sys.path.insert(0, os.path.join(HERE, "cd"))
import cmk, hc_a, hc_b, hc_c, figs, maps as hmaps, build as hbuild  # noqa: E402
from clib import T  # noqa: E402

CHS = hc_a.CHS + hc_b.CHS + hc_c.CHS
assert len(CHS) == 13 == len(hbuild.LABS)
LAB_INTRO = ["See why black hole entropy follows area, how much information a region can hold, and what happens when a black hole is fed.",
             "Drag points on a map of hyperbolic space: watch distances, straight lines and the room near the edge.",
             "Throw a ball and a flash of light in anti-de Sitter space and see why it behaves like a box.",
             "Turn a dial from no entanglement to maximal entanglement and measure the entropy of one half.",
             "Turn the two knobs of the gauge theory and see when strings are small and gravity is classical.",
             "Slide the mass of a bulk field and read off the scaling dimension of its boundary operator.",
             "Pick boundary regions and measure their entanglement with minimal curves in the bulk.",
             "Heat the boundary: a horizon appears, the curves wrap around it and the Hawking-Page switch happens.",
             "Select sites on the rim of a tensor network and find the cheapest cut. Compare deep and shallow networks.",
             "Encode a qutrit in three, erase any one, and recover it from the other two. An exact simulation.",
             "Train a network's bond weights by gradient descent to match entanglement data, and watch a geometry emerge.",
             "Evaporate a 12-qubit black hole: the Page curve, the island rule, and when a diary can be read back.",
             "The capstone: one toy universe seen as geometry, as a code, as a trained network, and with a black hole."]
HELP = "Each level lists goals that tick as you reach them. Hint explains, Show me demonstrates, Start over resets the level. "
_labs = hbuild.build_all()
for _c, (_name, _title, _h), _intro in zip(CHS, hbuild.LABS, LAB_INTRO):
    _c["practice"].insert(0, {"type": "webxdc", "title": _title, "intro": HELP + _intro, "height": _h, "html": _labs[_name][2]})

# numbered figures and tables with a pointer in the paragraph before each
ANCHOR = re.compile(r"\s*\(See (Figure|Table) [\d.]+ below\.\)")
NFIG = NTAB = 0
for _ci, _ch in enumerate(CHS):
    _nf = _nt = 0
    _out = []
    for _b in _ch["lesson"]:
        if _b["type"] == "text":
            _b["items"] = [ANCHOR.sub("", it) for it in _b["items"]]
        if _b["type"] in ("figure", "table"):
            if _b["type"] == "figure":
                _nf += 1; _lab = "Figure %d.%d" % (_ci + 1, _nf); _b["caption"] = _lab + ". " + _b["caption"]
            else:
                _nt += 1; _lab = "Table %d.%d" % (_ci + 1, _nt); _b["title"] = _lab + ". " + _b["title"]
            for _p in reversed(_out):
                if _p["type"] == "text":
                    _p["items"][-1] = _p["items"][-1].rstrip() + " (See %s below.)" % _lab
                    break
        _out.append(_b)
    _ch["lesson"] = _out
    assert _nf >= 2 and _nt >= 2, (_ci + 1, _nf, _nt)
    NFIG += _nf; NTAB += _nt

def _split(t, lim=380):
    """keep narration chunks short: split a long paragraph in two at a sentence boundary near the middle"""
    if len(t) <= lim:
        return [t]
    cuts = [m.end() for m in re.finditer(r"[.!?] (?=[A-Z(])", t) if t[:m.end()].count("$") % 2 == 0]
    if not cuts:
        return [t]
    k = min(cuts, key=lambda c: abs(c - len(t) / 2))
    return _split(t[:k].rstrip(), lim) + _split(t[k:], lim)


for _ch in CHS:
    for _b in _ch["lesson"]:
        if _b["type"] == "text":
            _b["items"] = [x for it in _b["items"] for x in _split(it)]

assert len(hmaps.MAPS) == len(CHS)
for _c, _ms in zip(CHS, hmaps.MAPS):
    _c["maps"] = [{"title": _t, "links": _l} for _t, _l in _ms]

for _i in range(1, len(CHS)):
    _prev = CHS[_i - 1]
    CHS[_i]["lesson"].insert(0, T("Quick recap of the last chapter, " + _prev["title"] + ":", *["• " + k for k in _prev["keyPoints"]]))

MNEM = [
 ("A quarter of the area", "Black hole entropy is a Quarter of the Area: S = A/4. Surface, not stuffing."),
 ("Rim is far, depth is scale", "In hyperbolic maps the Rim is infinitely faR, and going Deeper is Zooming out: z is the zoom."),
 ("AdS: A deep Spring", "AdS is A deep Spring: everything thrown out springs back, and light returns on time."),
 ("Pure whole, mixed parts; power, not exponent", "Entangled: Pure whole, Mixed parts. Conformal: Power laws, not exponentials."),
 ("Open for gauge, closed for gravity", "Open strings give gauge theory, Closed strings give gravity; Lambda sets Length, N sets Newton."),
 ("Mass makes dimension, depth makes energy", "The Mass of the field makes the Dimension of the operator; Depth z is one over Energy."),
 ("Smallest surface, a quarter again", "Ryu-Takayanagi: take the Smallest surface and a Quarter of its area, just like a black hole."),
 ("Hot is a hole; entangled is a bridge", "A Hot boundary is a black Hole; two Entangled boundaries share a Bridge (ER = EPR)."),
 ("Count the cut", "In a tensor network, entropy is what you pay to Cut: Count the bonds on the Cheapest Cut."),
 ("Bulk is logical, boundary is physical", "Bulk = Logical, Boundary = Physical, and a region reads its Wedge: BLBP-W."),
 ("Weights are bonds, depth is depth", "Learning bridge: Weights are bond strengths, hidden units are bulk points, network Depth is bulk Depth."),
 ("Up, Page, down; no island, then island", "Radiation entropy goes Up, turns at the Page time, comes Down; no island before, island after."),
 ("GECN: geometry, entanglement, code, network", "Four views, one object: Geometry, Entanglement, Code, Network. 'Great Explorers Carry Notebooks.'"),
]
assert len(MNEM) == len(CHS)
for _c, (_m, _d) in zip(CHS, MNEM):
    _full = _m + ". " + _d
    _c["lesson"].append(T("Memory trick: " + _full))
    _c["cards"].append({"q": "Memory trick for: " + _c["title"] + "?", "a": _full})
IMAGES = figs.build_all()

PRONOUNCE = {
    "AdS": "A D S", "CFT": "C F T", "AdS/CFT": "A D S C F T", "AdS3": "A D S three", "AdS5": "A D S five", "S5": "S five", "RT": "R T", "HRT": "H R T", "QEC": "Q E C", "RG": "R G", "MERA": "meera",
    "HaPPY": "happy", "BTZ": "B T Z", "TFD": "T F D", "UV": "U V", "IR": "I R", "GKPW": "G K P W", "JLMS": "J L M S", "EFL": "E F L", "RTN": "R T N", "QCD": "Q C D", "SU(N)": "S U N",
    "'t Hooft": "et hooft", "Maldacena": "mal da SAY na", "Ryu": "ree yoo", "Takayanagi": "ta ka ya NA gi", "Poincaré": "pwan ka RAY", "Poincare": "pwan ka RAY", "Bekenstein": "BECK en stine",
    "Breitenlohner-Freedman": "BRY ten loaner freed man", "Susskind": "SUSS kinned", "Van Raamsdonk": "van RAHMS donk", "Hashimoto": "ha shi MO to", "artanh": "arc tanch", "sinh": "sinch", "cosh": "cosh",
    "qutrit": "cue trit", "qutrits": "cue trits", "qubit": "cue bit", "qubits": "cue bits", "D3": "D three", "ER": "E R", "EPR": "E P R", "PIRSA": "peer sa", "ELI5": "E L I five", "ℓ": "ell", "λ": "lambda", "Δ": "delta", "ρ": "rho", "χ": "kai", "ξ": "ksi", "ε": "epsilon", "β": "beta",
}

SANDBOX = cmk.terminal("Holography cheat sheet", "holo>", "A scripted lookup, not a calculator. Try: entropy, disk, ads, cft, branes, dictionary, rt, btz, hp, tfd, network, code, wedge, learn, page, island", [
    ("entropy", ["S = A / 4G  (Bekenstein-Hawking)", "entropy follows area, not volume", "a black hole is the most entropy a region can hold"]),
    ("disk", ["Poincare disk: ds^2 = 4(dx^2+dy^2)/(1-r^2)^2", "distance to centre = 2 artanh r; rim is infinitely far", "circle of radius rho has circumference 2 pi sinh rho"]),
    ("ads", ["Poincare AdS: ds^2 = (L^2/z^2)(-dt^2 + dx^2 + dz^2), boundary z = 0", "light reaches the boundary in time pi L/2; matter falls back", "symmetries SO(d,2) = conformal group of the boundary"]),
    ("cft", ["scale invariant quantum field theory", "<O(x)O(0)> = 1/|x|^(2 Delta)", "1+1 CFT interval: S = (c/3) ln(l/eps)"]),
    ("branes", ["N D3-branes: SU(N) N=4 super Yang-Mills  =  strings on AdS5 x S5", "L^4/ls^4 = lambda = g^2 N", "L^3/G = 2 N^2/pi"]),
    ("dictionary", ["Z_CFT[phi0] = Z_gravity[phi -> phi0]", "Delta(Delta - d) = m^2 L^2; BF bound m^2 L^2 >= -d^2/4", "phi ~ phi0 z^(d-Delta) + <O> z^Delta; energy ~ 1/z"]),
    ("rt", ["S(A) = Area(gamma_A)/4G, gamma_A the minimal surface anchored on A", "AdS3: S = (c/3) ln(l/eps), c = 3L/2G", "quantum: S = Area/4G + S_bulk; extremise the sum"]),
    ("btz", ["ds^2 = -(r^2-rh^2)/L^2 dt^2 + L^2 dr^2/(r^2-rh^2) + r^2 dphi^2", "T = rh/(2 pi L^2), S = 2 pi rh/4G", "S(l) = (c/3) ln( beta/(pi eps) sinh(pi l/beta) )"]),
    ("hp", ["Hawking-Page: thermal AdS below T = 1/(2 pi L), black hole above", "boundary meaning: confinement to deconfinement"]),
    ("tfd", ["|TFD> = sum_n e^(-beta E_n/2) |n>_L |n>_R / sqrt(Z)", "dual: two-sided eternal black hole; ER = EPR"]),
    ("network", ["S(A) <= bonds cut x log chi", "MERA: cut ~ log l; random or perfect tensors: S = min cut", "HaPPY: perfect tensors on a pentagon tiling"]),
    ("code", ["three qutrits: |0~> = (|000>+|111>+|222>)/sqrt3 ...", "Knill-Laflamme: P E_i^dag E_j P = lambda_ij P", "bulk = logical, boundary = physical, H_code inside H_CFT"]),
    ("wedge", ["entanglement wedge of A: bulk between A and its RT surface", "operators there can be reconstructed on A", "criterion: [O, X_complement] P = 0"]),
    ("learn", ["gradient descent: w <- w - eta dL/dw", "random tensor network entropies = Ising free energy = Boltzmann machine", "critical data -> hyperbolic learned geometry; AdS/DL: metric = weights"]),
    ("page", ["S(radiation) ~ min(radiated, black hole left)", "Page time: about halfway", "Hayden-Preskill: old black holes return information fast"]),
    ("island", ["S(R) = min ext [ Area(dI)/4G + S_bulk(R u I) ]", "no island before the Page time, island after", "island is in the radiation's entanglement wedge"]),
])

EXAM = [
 ("A black hole's entropy is proportional to...", ["its horizon area", "its volume", "its age", "its charge only"], 0, "S = A/4G."),
 ("The holographic principle says a region with gravity is described by...", ["a theory on its boundary", "a theory in more dimensions", "nothing", "classical physics"], 0, "One dimension fewer."),
 ("Triangle angles sum to less than 180 degrees in...", ["hyperbolic space", "flat space", "a sphere", "none"], 0, "Negative curvature."),
 ("In the Poincare disk, the rim is...", ["infinitely far away", "at distance 1", "at distance pi", "the centre"], 0, "2 artanh r diverges."),
 ("In ds² = L²(dx² + dz²)/z², depth z acts as...", ["a scale", "a time", "a temperature", "a charge"], 0, "Zoom = depth."),
 ("The boundary of Poincare AdS is at...", ["z = 0", "z = infinity", "t = 0", "x = L"], 0, "Where the metric blows up."),
 ("In AdS, a thrown ball...", ["always returns", "escapes", "stops at the boundary", "vanishes"], 0, "AdS is a box."),
 ("The isometries of AdS in d+1 dimensions match...", ["the conformal group in d dimensions", "rotations only", "nothing", "the Lorentz group only"], 0, "SO(d,2)."),
 ("In a Bell pair, one qubit alone has entropy...", ["one bit", "zero", "two bits", "undefined"], 0, "Maximally mixed."),
 ("For a pure total state, S(A) equals...", ["S of the complement", "zero", "the volume", "2 S(complement)"], 0, "Shared entanglement."),
 ("CFT two-point functions fall as...", ["a power law", "an exponential", "a constant", "a sine"], 0, "1/|x|^(2Δ)."),
 ("Interval entropy in a 1+1 CFT ground state is...", ["(c/3) ln(ℓ/ε)", "ℓ", "constant", "ℓ²"], 0, "Log law."),
 ("Closed strings give...", ["gravity", "gauge theory only", "nothing", "D-branes"], 0, "The graviton."),
 ("N D3-branes at low energy carry...", ["N = 4 super Yang-Mills with SU(N)", "general relativity", "a free boson", "QCD exactly"], 0, "Open strings."),
 ("L⁴/ℓs⁴ equals...", ["the 't Hooft coupling λ", "N²", "1/N", "G"], 0, "λ = g²N."),
 ("Classical gravity is valid when...", ["N and λ are both large", "λ is small", "N = 2", "never"], 0, "Weak quantum, small strings."),
 ("The GKPW rule equates...", ["partition functions", "temperatures", "masses", "dimensions of space"], 0, "With sources as boundary values."),
 ("A massless scalar with d = 4 is dual to an operator of dimension...", ["4", "2", "0", "6"], 0, "Δ(Δ−4) = 0."),
 ("The metric is dual to...", ["the stress tensor", "a current", "a scalar", "the entropy"], 0, "Gravity ↔ energy-momentum."),
 ("High-energy boundary physics lives...", ["near the boundary", "deep in the bulk", "at the horizon", "nowhere"], 0, "E ~ 1/z."),
 ("The RT formula is...", ["S(A) = Area(γ_A)/4G", "S = A·4G", "S = ln 2", "S = c"], 0, "Minimal surface."),
 ("In AdS3 the central charge is...", ["3L/2G", "L/G", "1", "N"], 0, "Brown-Henneaux."),
 ("For two growing intervals the minimal surface...", ["jumps to a connected configuration", "never changes", "vanishes", "becomes a horizon"], 0, "Phase transition."),
 ("Removing entanglement between two halves of the boundary...", ["pinches the bulk apart", "does nothing", "creates a black hole", "adds dimensions"], 0, "Van Raamsdonk."),
 ("A bulk black hole is dual to...", ["a thermal state", "the vacuum", "one particle", "a pure product state"], 0, "Hot matter."),
 ("Below the Hawking-Page temperature the dominant geometry is...", ["thermal AdS", "a large black hole", "flat space", "de Sitter"], 0, "Lower free energy."),
 ("The thermofield double is dual to...", ["a two-sided black hole", "empty AdS", "a single-sided star", "nothing"], 0, "With a wormhole."),
 ("A bond of dimension χ carries at most...", ["log χ of entanglement", "χ² bits", "nothing", "infinite entanglement"], 0, "Cut bound."),
 ("The cheapest cut around ℓ sites in a MERA scales as...", ["log ℓ", "ℓ", "ℓ²", "1/ℓ"], 0, "Climbs the layers."),
 ("The HaPPY code is built from...", ["perfect tensors on a hyperbolic tiling", "random numbers on a line", "strings", "black holes"], 0, "Pentagons."),
 ("In the three-qutrit code, how many qutrits are needed to recover?", ["Any two", "All three", "Any one", "None"], 0, "Single erasure correctable."),
 ("In holography the logical information is...", ["the bulk", "the boundary", "the cutoff", "the horizon"], 0, "Boundary is the hardware."),
 ("Region A can reconstruct bulk operators in...", ["its entanglement wedge", "the whole bulk", "the complement's wedge", "no region"], 0, "Bounded by the RT surface."),
 ("Different reconstructions of one bulk operator agree...", ["only on the code subspace", "on all states", "never", "only at the boundary"], 0, "So nothing is cloned."),
 ("Random tensor network entropies map onto...", ["an Ising model", "a harmonic oscillator", "a free string", "nothing"], 0, "A Boltzmann machine."),
 ("Entanglement feature learning trains on...", ["entanglement entropies", "images", "masses", "times"], 0, "Features of the state."),
 ("A critical 1D state yields a learned geometry that is...", ["hyperbolic", "flat", "a point", "spherical"], 0, "AdS3-like."),
 ("In the AdS/DL network the weights are...", ["the bulk metric", "the sources", "the horizon area", "the temperature"], 0, "Learned from data."),
 ("The Page curve turns over at...", ["about half-way through evaporation", "the start", "never", "after the end"], 0, "The Page time."),
 ("After the Page time the radiation's entanglement wedge includes...", ["an island inside the black hole", "nothing new", "the whole universe", "only the horizon"], 0, "Interior encoded in radiation."),
]

CFG = dict(id="holography-string-theory", title="Holography: From Black Holes to Quantum Codes and Deep Learning",
    subtitle="An intuitive, visual course on the AdS/CFT correspondence: the maths you need, the string theory origin, entanglement as geometry, and the bridges to quantum error correction and deep learning",
    description="Holography says that a world with gravity can be described by a quantum theory on its boundary. This course builds the idea from the ground up in 13 chapters: black hole entropy, the geometry of hyperbolic and anti-de Sitter space, entanglement and conformal field theory, "
    "strings, D-branes and Maldacena's duality, the holographic dictionary, the Ryu-Takayanagi formula, black holes and wormholes, tensor networks, quantum error correction, the bridge to deep learning, the Page curve and islands, and a final chapter that ties it all together. "
    "The maths is introduced with pictures and worked formulas: 35 numbered figures (hyperbolic tilings and geodesics are computed, not sketched), numbered tables, a recap, a memory trick, an expanded ELI5 and a concept map in every chapter. "
    "13 interactive labs with 40 levels: walk the hyperbolic disk, measure entanglement with minimal curves, heat AdS until a black hole forms, cut tensor networks, run an exact three-qutrit code, train a network's geometry from entanglement data by gradient descent, "
    "evaporate a 12-qubit black hole, and in the capstone build a toy holographic universe that is at once a geometry, a code, a trained network and a black hole. "
    "Sources and credits: chapter 10 follows the outline of the Quantum Error Correction lesson of the open AdS/CFT course at adscft.org; chapter 11 presents Yi-Zhuang You's Perimeter Institute talk 'Tensor Network Holography and Deep Learning' (PIRSA:17110111) and the work of Hashimoto and collaborators. "
    "The text, figures and labs are original and written for beginners; the labs are toy models that illustrate the mechanisms, not full AdS/CFT.",
    pronounce=PRONOUNCE, sandbox=SANDBOX, exam=EXAM, images=IMAGES)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "courses", "holography-string-theory.course.json")
    cmk.main(CFG, CHS, [sys.argv[0], out])
    print("figures", NFIG, "tables", NTAB)
