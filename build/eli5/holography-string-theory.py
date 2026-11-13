# -*- coding: utf-8 -*-
"""Expanded ELI5 blocks for the holography course (one per chapter)."""


import re


def _split(t, lim=380):
    if len(t) <= lim:
        return [t]
    cuts = [m.end() for m in re.finditer(r"[.!?] (?=[A-Z(])", t)]
    if not cuts:
        return [t]
    k = min(cuts, key=lambda c: abs(c - len(t) / 2))
    return _split(t[:k].rstrip(), lim) + _split(t[k:], lim)


def E(pic, words, tryit, keep):
    return ("\n\n".join(_split(pic) + _split("Now the real words. " + words) + ["Try it. " + tryit, "If you remember one thing: " + keep]), "")


FEY = [
 E("Imagine a toy box. You would think the number of toys it can hold depends on how big the inside is. Now imagine a magic box where the number of toys depends only on how much wrapping paper covers the outside. That is strange, and it is how black holes behave.",
   "A black hole's entropy, its amount of hidden information, is a quarter of the area of its horizon measured in tiny Planck squares: S = A/4G. No region can hold more than a black hole that fills it. So the information in a world with gravity fits on its surface. The holographic principle says the inside (the bulk) and a theory on the surface (the boundary) are two descriptions of the same thing. AdS/CFT is the first exact example.",
   "In the lab, double the black hole's radius and watch the entropy go up four times, not eight.",
   "with gravity, information counts by area, so the surface can describe the inside."),
 E("Imagine a map of a magical land drawn on a round plate. Near the edge of the plate everything is drawn smaller and smaller, so a traveller walking towards the edge never gets there. The land is infinite, but the whole map fits on the plate.",
   "The rule for measuring real distance is called the metric. Hyperbolic space has negative curvature: triangles have angles adding to less than 180 degrees and circles have far more room around them than in flat space. The Poincaré disk is its map on a plate. A second map, the half-plane, has a depth coordinate z, with real lengths divided by z. Stretching the map and going deeper are the same thing: depth is zoom.",
   "In the lab, drag a point towards the rim and watch the real distance grow without limit while the dot barely moves.",
   "the metric makes the shape, and in hyperbolic space going deeper means zooming out."),
 E("Imagine a huge bowl with sides that get steeper and steeper. Roll a marble from the middle as hard as you like: it always rolls back, and oddly it always takes the same time. Shine a torch and the light reaches the far-off rim and bounces back.",
   "Anti-de Sitter space, AdS, is hyperbolic space with time added. Its metric is ds² = (L²/z²)(−dt² + dx² + dz²) and its boundary is at z = 0, infinitely far away, yet light gets there and back in a finite time. Everything is pulled towards the middle, so AdS is like a box. Its symmetries are exactly those of a theory on the boundary that looks the same at every zoom, a conformal field theory.",
   "In the lab, throw the ball gently, then hard, and see that it returns at the same moment.",
   "AdS is a box with a far-away wall, and its symmetries match a scale-free theory on that wall."),
 E("Imagine two magic coins. Each one alone lands heads or tails at random. But they always land the same way as each other, however far apart they are. The pair has a secret that neither coin has alone. And imagine a pattern, like a snowflake curve, that looks the same however much you zoom in.",
   "The coins are entangled qubits. The randomness of one part of an entangled system is measured by entanglement entropy, S = −Tr ρ log ρ. If the whole is in one definite state, a part and the rest have equal entropy. A conformal field theory is a quantum theory that looks the same at every scale; its correlations fall off as power laws set by scaling dimensions. In a critical one-dimensional system the entropy of a block grows like (c/3) ln ℓ.",
   "In the lab, turn the dial to 45 degrees and measure 20 pairs: each side looks random, but they always agree.",
   "entanglement means the whole is certain while the parts are random, and its amount is an entropy."),
 E("Imagine tiny rubber bands. Some are loops that float anywhere, and some are opened out with their two ends stuck to a sheet of glass. Stack many sheets together. You can describe the stack by what the stuck bands do on the glass, or by how the heavy stack bends the room around it. Two stories, one stack.",
   "In string theory closed strings give gravity and open strings, ending on D-branes, give gauge theory. A stack of N D3-branes is either a gauge theory with N colours (N = 4 super Yang-Mills) or a curved throat, AdS5 × S5. Maldacena argued these are the same theory. The gauge coupling λ = g²N sets the size of the space in string lengths, and N sets how classical gravity is.",
   "In the lab, raise N and the coupling until the readout says classical gravity works.",
   "the same branes are a gauge theory or a curved space, and each story is easy exactly where the other is hard."),
 E("Imagine two people who speak different languages describing the same film. To check they mean the same thing you need a dictionary. And imagine looking at a painting: with your nose on it you see brush strokes, from across the room you see the picture.",
   "The dictionary says the two theories have equal partition functions when the boundary values of bulk fields are the sources of boundary operators. Each bulk field matches one operator, and its mass fixes the operator's scaling dimension through Δ(Δ − d) = m²L². The depth z of the bulk is the zoom level of the boundary theory: near the boundary is fine detail and high energy, deep inside is the big picture and low energy.",
   "In the lab, set the mass to zero and read off dimension 4, then push it down to the lowest allowed value.",
   "every bulk field has a boundary partner, and depth is energy scale."),
 E("Imagine a soap film stretched across a wire loop. It pulls itself into the smallest possible surface. Now imagine that the size of that film tells you how strongly the part of a puzzle inside the loop is linked to the part outside.",
   "The Ryu-Takayanagi formula says the entanglement entropy of a boundary region equals the area of the smallest bulk surface ending on it, divided by 4G. In AdS3 the surface is a curve, and its length gives exactly the (c/3) ln ℓ law of conformal field theory. Remove the entanglement between two halves of the boundary and the bulk between them pinches off: space is held together by entanglement.",
   "In the lab, drag the ends of a region and watch the gold curve dip deeper as the region grows.",
   "entanglement is measured by area, so geometry is made of entanglement."),
 E("Imagine heating a pan of soup. From outside, all you know is how hot it is; the details are hidden. In the bulk world, heating the edge makes a black hole appear in the middle. And imagine two walkie-talkies that are secretly linked: in the bulk world, that secret link is a tunnel.",
   "A black hole in the bulk is a thermal state of the boundary theory; the horizon area over 4G is the thermal entropy. Below the Hawking-Page temperature the bulk is just warm empty AdS, and above it a black hole wins, which the boundary sees as deconfinement. Two copies of the boundary theory entangled in the thermofield double state are the two outsides of one black hole joined by a wormhole: ER = EPR.",
   "In the lab, cool the system below 0.159 and watch the black hole stop being the winner.",
   "hot means a horizon, and entanglement between two systems is a bridge between two spaces."),
 E("Imagine describing a huge crowd. First you group people into families, then families into streets, then streets into towns. Each step gives a smaller, blurrier picture. Stack the pictures up and you get a pyramid. To separate one neighbourhood from the rest, the cheapest place to cut the pyramid is higher up, where there are fewer links.",
   "A tensor network builds a quantum state from small tensors joined by bonds. The entropy of a region is limited by the bonds you must cut to separate it. Coarse-graining adds a direction, scale, and for a critical state the network has the shape of hyperbolic space, with the cheapest cut playing the role of the Ryu-Takayanagi surface. With perfect or random tensors the limit becomes exact.",
   "In the lab, select 2, 4, 8 and 16 sites and see the cut cost go up by about the same amount each time.",
   "count the bonds on the cheapest cut: that is the entropy, and that is the minimal surface."),
 E("Imagine three friends who each hold a piece of a treasure map. No single piece shows anything. Any two friends can put theirs together and find the treasure. Lose one friend and the secret is still safe.",
   "That is the three-qutrit code, a quantum error-correcting code. Holography works the same way: the bulk is the protected, logical information, and the boundary is the physical hardware. A boundary region can rebuild exactly the bulk points in its entanglement wedge. The same bulk point can be rebuilt from different regions, but the different versions agree only on the code subspace of smooth-bulk states, so nothing is copied. Deeper points survive bigger losses.",
   "In the lab, erase each qutrit in turn and recover the message from the other two.",
   "the bulk is a secret shared across the boundary, and depth is protection."),
 E("Imagine a guessing machine made of dials. You show it examples, it checks how wrong it is, and it turns every dial a tiny bit to be less wrong. After many rounds the dials hold what it has learned. Now imagine the dials are the strengths of the links in our pyramid of blurry pictures.",
   "A neural network learns by gradient descent on a loss. A random tensor network's entropies are the free energies of an Ising model, which is a Boltzmann machine, so the network can be trained on a quantum state's entanglement entropies. The trained couplings are a geometry nobody put in, and for a critical state it is hyperbolic. In another approach the radial direction of AdS is the layers of a network and the metric is the weights.",
   "In the lab, press Train on critical data and watch every layer stay switched on; then try gapped data and watch the deep layers fade.",
   "the geometry can be learned from entanglement, with bond strengths as the weights."),
 E("Imagine burning a diary. The smoke and ash look like a mess, but in principle every word is still in there, scrambled. A black hole that slowly evaporates is like a very slow fire. The question is whether the words really are in the smoke.",
   "Hawking's calculation says the radiation's entropy rises forever, which would destroy information. Quantum mechanics requires the Page curve: up until the Page time, then down to zero. In 2019 this was derived from gravity with the island formula. After the Page time a region inside the black hole, the island, belongs to the radiation's entanglement wedge, so the interior is encoded in the radiation like an error-correcting code.",
   "In the lab, slide to 6 of 12 qubits to find the Page time, then see how soon after it the diary becomes readable.",
   "the entropy goes up, turns at the Page time and comes back down, and the inside is encoded in what came out."),
 E("Imagine four people describing an elephant in the dark. One feels the shape, one feels how the parts are joined, one notices that it still works if a bit is hidden, and one notices it is built in layers. They are all describing one animal.",
   "Geometry, entanglement, error correction and layered networks are four descriptions of how a boundary quantum system encodes a bulk world. Minimal surfaces are entropies; a region's entanglement wedge is what it can reconstruct; tensor networks are explicit codes; and network depth is scale, with weights that can be learned. Open questions remain about time, black hole interiors and universes that are not AdS.",
   "In the final lab, do all four in one toy universe: cut it, read it, train it, and put a black hole in it.",
   "one object, four views: geometry, entanglement, code, network."),
]
