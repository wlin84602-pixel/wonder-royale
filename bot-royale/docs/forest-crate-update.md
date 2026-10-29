# Trees, hiding bushes and crate tiers

Local update only. Nothing was pushed to GitHub or deployed to Railway.

Trees now have solid collision close to their visible foliage edge, with their original trunk artwork retained. Trees have clear walking gaps, and direct/glancing contact can glide around a tree without penetrating it or increasing normal movement speed. Bushes remain non-solid and their hiding areas are free of trees, obstacles and crate spawns. 120 extra accessible hiding bushes were added. Local foliage becomes translucent while hiding, with a HIDDEN IN BUSH status; firing reveals the player for 1.5 seconds. The server omits hidden opponents from outsiders.

Crate rules:
- Wooden: exactly one random existing gun, medkit or shield. All four existing gun families are eligible, including pistols. Wooden storage boxes follow the same rule.
- Gold: exactly three items, including a gun and a heal.
- Ultimate: a guaranteed Legendary gun, medkit and shield. Exactly three outdoor ultimate crates spawn per island, in seeded random locations. On the checked map that is 3 of 609 crates, about 0.49%. Their black/gold star appearance distinguishes them from wooden plank and gold crown crates.
- Existing ammo crates retain their ammunition drops. All crates vanish and lose collision after opening; repeat opening cannot duplicate loot.

Validation: all 13 functional suites passed, including 12 seeded maps, two actual HTTP/SSE clients, weapon timing, doors, obstacle sliding, crate removal and visibility. The new suite checks 600 crate openings, rare ultimate counts, all four gun families, 9 direct/glancing tree contacts at 30/60/144 simulated FPS, every hiding area, and server conceal/reveal behavior. The main renderer, all original cosmetic images and 1,760 melee poses passed visual/regression checks. New previews use the real crate and character renderers.

85 buildings, current camera zoom, 15ms door swings and original cosmetic artwork remain unchanged.

Runtime files changed: island/world.js, island/render.js, island/client.js, standalone HTML builds and packaged public/index.html; tests and documentation updated.
