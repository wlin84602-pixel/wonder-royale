# Rapid E doorway passage fix

Door swing: 15ms. Input remains immediate. Local update only; GitHub and Railway were not changed.

The old clearance chose the side the character was already on. Repeatedly closing while walking through therefore pushed the character back before reaching the other side. Clearance now uses fresh movement intent to choose the exit side when the character overlaps the closing door. Stationary hinge interaction keeps its existing nearest-side clearance. The client reads current movement keys and the server uses authoritative input; closed doors keep their movement and bullet collision.

Validation: 72 walking-and-toggle scenarios across all four orientations, both directions, 30/60/144 simulated FPS, and E intervals of 4/15/50ms; eight authoritative server crossings; the actual client E handler crossed while holding movement and issuing 48 presses. Existing 96 hinge toggles, eight frame-overlap clearances and 2,040 orientation/reversal checks also passed. The packaged build passed the passage suite.

Runtime files: island/world.js, island/client.js, island/session.cjs, both standalone HTML builds and packaged public/index.html. Original artwork, camera and normal movement speed preserved.
