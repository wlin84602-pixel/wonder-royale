# Door hinge clearance fix

Local update only; no GitHub push or Railway deployment.

E now measures reach from the hinge and the closed/open panel, rather than only the door centre. A hinge you are touching takes priority over a nearby panel. Repeated presses retain the 90-degree away-from-opener target and smooth reversal.

Closing a door gently separates overlapping characters into nearby clear space instead of rejecting every occupied doorway. Positions are resolved before the closed collision activates. Already embedded solid-overlap positions also recover locally, with a small correction rather than a distant teleport. Player radius, movement speed, camera and original artwork are unchanged. The server performs the same clearance and publishes the corrected positions.

Tests: 96 repeated hinge toggles beyond the old centre-distance limit, both sides of all four orientations; eight screenshot-style frame overlaps closed safely and allowed movement afterward; authoritative server clearance matched snapshots. Existing collision, two HTTP/SSE clients, all-sided opening, weapon cooldown, visibility and cosmetic checks pass. The actual game renderer reproduced the overlap and captured the corrected close-up in hinge-clearance-comparison.png.

Files changed: island/world.js and island/client.js, standalone HTML builds and packaged public/index.html; tests and documentation updated.
