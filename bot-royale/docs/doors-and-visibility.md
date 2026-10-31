# Doors and building visibility

Local update only; GitHub and Railway were not changed.

- Each new interaction press immediately toggles the nearest door, including while previous requests are pending. No artificial manual cooldown. Nearby doors take priority over pickups.
- Reversals animate smoothly around the hinge over 15ms. Recent manual control prevents bots instantly reopening a closed door. Overlapping characters are gently moved clear before the door closes.
- Outside buildings have opaque roofs. Interiors reveal only while inside or within 52 world units of an exterior door/window (about a character radius beyond touching distance). Moving away covers them immediately.
- Closed doors and windows block swept projectiles. Window visibility does not change bullet collision.
- Indoor opponents and loot are omitted from distant outside clients. Server validation, ordered desired door states, and snapshot reconciliation keep rapid input consistent.

Validation: seven functional suites passed, including two real HTTP/SSE clients; four presses before the first HTTP reply all toggle correctly, 24 consecutive same-time manual toggles succeed, mid-swing reversal has no angle jump, and closed/reclosed doors block shots. Three roof comparison frames verify outside/near-window/inside states. Existing map, combat, weapon cooldown, cosmetic and native rendering checks pass. In the real browser, the same door was opened and closed again beside the revealed interior; a farther building stayed covered.

Runtime files changed: island/world.js, island/client.js, island/render.js, island/session.cjs, both standalone HTML builds, packaged public/index.html. Tests and documentation updated. Original cosmetic artwork, character size, map size and camera zoom retained.

All-sided swing verification: the shared doorSwingAway() function calculates the opener side using the closed panel direction and always targets the opposite side. doorPose() derives the exact fixed-hinge pose used by the renderer. All 680 exterior doors passed 2,040 openings/reversals, including outside → inside → outside opener changes. Two HTTP/SSE clients verified both directions for north/east/south/west doors with identical swing, turnFrom, changedAt and open fields.

Hinge clearance update: see HINGE-FIX.md (or docs/hinge-fix.md). Interaction covers the hinge and panel, and overlapping characters can close the door without becoming embedded.
