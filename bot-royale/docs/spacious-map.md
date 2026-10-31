# Bot Royale: spacious map update

This update is local. Nothing has been pushed to GitHub or deployed to Railway.

- 170 buildings instead of 340: a 50% reduction.
- Buildings are scattered using seeded random placement across dry land, with a minimum 200-unit separating gap. Every new match can use a different layout.
- All 12 building styles have floor dimensions expanded 1.4x: approximately 96% more floor area. Furniture, character dimensions, movement, hitboxes and cosmetic artwork retain their previous sizes.
- The ground camera shows five times the former area: about 2.236x the width and height. Online actor, loot, bullet and door updates now cover the wider view. The minimap and descent transition accommodate it.
- Doors respond immediately through local prediction, finish their opening animation in 45ms, and accept every new press immediately. The server still validates distance, occupied doorways and repeated actions. Older snapshots cannot undo an outstanding press, and rejected interactions restore the authoritative state.
- The previously requested 10x total map area and unpublished melee corrections are retained.

Validation completed:

- 12 seeded worlds: 8,160 exterior entrance/exit checks, plus all eight region connections, collision, loot, bridges, landings and zone checks.
- 100 interior rooms checked for player-sized walking space.
- Two real HTTP/SSE clients: movement authority, door agreement, occupied-door and replay rejection, loot duplication prevention, visibility and combat checks.
- Delayed-network client test: instant door prediction, stale-update protection, acknowledgement, rollback, distant-door rejection and the exact 100ms boundary.
- Camera area checked at exactly 5x; camera edge bounds checked at three viewport sizes.
- Weapon cooldown/reload/switching regression checks at 30, 60, 120 and 144 simulated FPS.
- All 12 architecture styles rendered; 22 melee designs checked across 1,760 poses with identical local and remote assembly. Original artwork, cosmetic rig and combat rules verified unchanged.
- Actual local online match opened in the browser: landed, moved, opened a door and walked into the larger interior. Screenshots saved alongside this report.

Files: `island/buildings.js`, `world.js`, `render.js`, `client.js`, `session.cjs`, standalone HTML builds, packaged `public/index.html`, test files and documentation.

Open `circle-storm-updated.html` for the standalone bot game. For multiplayer, use the `bot-royale` folder, run `npm start`, and open the local address shown. `npm test` runs functional tests; optional native visual tests require `@napi-rs/canvas` and run with `npm run test:visual`.

Door visibility update: manual presses can alternate open/closed without waiting for an earlier server reply. Bots respect recent manual door control. Opaque roofs hide outside interiors; entering or standing within 52 world units of an exterior window/door reveals them. The server also hides indoor opponents and loot from distant outside viewers. Closed doors continue to block bullets. See docs/doors-and-visibility.md.
