# -*- coding: utf-8 -*-
"""One hierarchical concept map per chapter of the holography course."""


def M(title, text):
    return (title, [ln.strip() for ln in text.strip().split("\n") if ln.strip()])


STRUCT = [
M("Holography", """
Holography | starts from | Black hole entropy
Holography | states | Holographic principle
Holography | made exact by | AdS/CFT
Black hole entropy | equals | Area / 4G
Black hole entropy | not | Volume
Holographic principle | relates | Bulk
Holographic principle | relates | Boundary
Bulk | has | Gravity
Boundary | has | One dimension fewer
AdS/CFT | found by | Maldacena 1997
"""),
M("Curved space", """
Curved space | defined by | Metric
Curved space | comes in | Three curvatures
Metric | gives | Geodesics
Metric | gives | Distances
Three curvatures | positive | Sphere
Three curvatures | zero | Plane
Three curvatures | negative | Hyperbolic plane
Hyperbolic plane | drawn as | Poincaré disk
Hyperbolic plane | drawn as | Half-plane
Half-plane | has | Depth z
Depth z | acts as | Scale
"""),
M("AdS", """
AdS | is | Hyperbolic space plus time
AdS | has | Boundary
AdS | drawn as | Poincaré patch
AdS | drawn as | Global cylinder
AdS | acts like | A box
A box | light | Returns in finite time
A box | matter | Falls back
AdS | has | Symmetries
Symmetries | equal | Conformal group
Boundary | sits at | z = 0
"""),
M("Quantum toolkit", """
Quantum toolkit | needs | Entanglement
Quantum toolkit | needs | Conformal field theory
Entanglement | measured by | Entropy
Entropy | formula | −Tr ρ log ρ
Entropy | shared | Mutual information
Conformal field theory | has | Scale invariance
Conformal field theory | has | Operators
Operators | labelled by | Dimension Δ
Scale invariance | gives | Power laws
Entropy | grows as | Area, log or volume law
"""),
M("String origin", """
String origin | uses | Strings
String origin | uses | D-branes
Strings | closed | Gravity
Strings | open | Gauge theory
D-branes | stack of N | Two descriptions
Two descriptions | weak coupling | N = 4 super Yang-Mills
Two descriptions | strong coupling | AdS5 × S5
Two descriptions | equated by | Maldacena
String origin | parameters | λ and N
λ and N | λ sets | L / string length
λ and N | N sets | 1 / G
"""),
M("Dictionary", """
Dictionary | master rule | GKPW
Dictionary | pairs | Field and operator
Dictionary | reads depth as | Energy scale
GKPW | equates | Partition functions
Field and operator | mass gives | Dimension Δ
Field and operator | boundary value | Source
Field and operator | fall-off | Response
Dictionary | computed with | Witten diagrams
Energy scale | boundary | UV
Energy scale | deep bulk | IR
"""),
M("Entanglement", """
Entanglement | measured by | RT formula
RT formula | uses | Minimal surface
RT formula | equals | Area / 4G
Minimal surface | in AdS3 | Geodesic
Geodesic | gives | (c/3) ln ℓ
Minimal surface | can | Jump
RT formula | corrected by | Bulk entropy
Bulk entropy | leads to | Quantum extremal surface
Entanglement | builds | Geometry
Geometry | without entanglement | Disconnects
"""),
M("Black holes", """
Black holes | dual to | Thermal state
Black holes | example | BTZ
Thermal state | entropy | Horizon area / 4G
Black holes | compete with | Thermal AdS
Thermal AdS | switch at | Hawking-Page
Hawking-Page | boundary meaning | Deconfinement
Black holes | change | RT surfaces
RT surfaces | give | Volume law
Black holes | two-sided | Thermofield double
Thermofield double | joined by | Wormhole
"""),
M("Tensor networks", """
Tensor networks | made of | Tensors and bonds
Tensor networks | built by | Coarse-graining
Tensors and bonds | bound | Entropy by cuts
Coarse-graining | adds | Scale direction
Tensor networks | examples | MERA
Tensor networks | examples | HaPPY code
Tensor networks | examples | Random networks
MERA | gives | Log law
HaPPY code | uses | Perfect tensors
Random networks | map to | Ising model
Entropy by cuts | equals | Discrete RT
"""),
M("Error correction", """
Error correction | stores | Logical in physical
Error correction | toy example | Three-qutrit code
Error correction | test | Knill-Laflamme
Logical in physical | bulk is | Logical
Logical in physical | boundary is | Physical
Error correction | lives in | Code subspace
Error correction | answers | Which region reads what
Which region reads what | answer | Entanglement wedge
Entanglement wedge | respects | No cloning
Error correction | explains | RT area term
"""),
M("Deep learning", """
Deep learning | shares | Layered structure
Layered structure | with | Renormalization
Layered structure | with | AdS depth
Deep learning | trains by | Gradient descent
Deep learning | bridge one | Entanglement feature learning
Deep learning | bridge two | AdS/CFT as a network
Entanglement feature learning | uses | Boltzmann machine
Entanglement feature learning | data | Entropies
Entanglement feature learning | output | Emergent geometry
AdS/CFT as a network | weights | Metric
"""),
M("Information", """
Information | puzzle | Hawking radiation
Information | requires | Unitarity
Unitarity | predicts | Page curve
Page curve | turns at | Page time
Information | solved by | Island formula
Island formula | uses | Quantum extremal surface
Island formula | before Page time | No island
Island formula | after Page time | Island
Island | means | Interior encoded in radiation
Information | thrown in | Hayden-Preskill
"""),
M("Synthesis", """
Synthesis | view | Geometry
Synthesis | view | Entanglement
Synthesis | view | Code
Synthesis | view | Network
Geometry | linked by RT to | Entanglement
Entanglement | linked by wedge to | Code
Code | realised as | Network
Network | depth gives | Geometry
Network | trained by | Learning
Synthesis | leaves | Open problems
"""),
]
MAPS = [[a] for a in STRUCT]
