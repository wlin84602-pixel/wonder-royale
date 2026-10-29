# Bot Royale multiplayer lobby update

The Multiplayer button opens a walkable waiting island. Create or enter a room code and invite friends with Copy Link. The host chooses when to Start Match. See docs/multiplayer-lobby.md. Historical local-update notes below describe earlier work.

# Bot Royale

An independent game under bot-royale/; the existing Wonder Royale files are untouched.

Run with Node.js 22 or newer: npm start. Open http://localhost:5188/. No dependencies are required.
Run tests with npm test. The server binds HOST (default 0.0.0.0) and PORT (default 5188).

The normal URL joins the multiplayer main room. Use ?room=your-room to play together privately by room name, or ?offline=1 for local bot play.
Rooms support 25 actors total. Human players replace bots. Match state is in memory, so deploy exactly one replica; restarts reset matches. This version has no account or team service.

Controls: WASD move, mouse aim, left click fire/use selected item, E interact, R reload, Space jump then speed descent, M map, 1-6 slots, Escape match menu. Keybinds can be changed from the homepage. Slot 1 is melee only.

Includes a 18,973.666 x 18,973.666 island (10x the original total area), eight named areas, traversable interiors and doors, destructible cover, server-owned loot/combat/zone and plane drops. Cosmetics use original visible artwork bounds with individual backpack sizes, weapon lengths and attachment points. Backpacks sit behind the unchanged outfit; melee is held clear of its face. Local and remote actors share one renderer.

Railway: isolated service root /bot-royale, Dockerfile build, /health health check. Deploy independently of the repository root service.

Testing covers map generation, collision, doors, loot, zones, two real network clients, cooldown/reload overlap, weapon switching and cadence at 30/60/120/144 simulated FPS. Native render and browser visual checks are performed on the source build before packaging.

Existing weapon damage, projectile speeds, reload durations, cosmetic artwork and menus are retained. Weapon timing profiles are approximate reference values, not official ZombsRoyale values.

Cosmetic QA: original artwork is measured using cached alpha bounds. Per-design visible sizes and grip/rear attachments are centralized in island/cosmetics.js. The player remains at its existing 66px outfit scale and 26px collision radius. See docs/cosmetics.md for eight-set comparisons.

For the optional visual test install @napi-rs/canvas, then run npm run test:cosmetics. Normal npm test and the running server do not require it.

Local map update: 85 seeded, scattered buildings replace the previous 170. Floor dimensions are 1.4x (1.96x floor area), while furniture and player dimensions are unchanged. Building spacing is at least 200 world units along a separating axis. Ground view covers 5x the former area (zoom 1/sqrt(5)). Doors predict locally, remain server validated, have no manual toggle cooldown and a 15ms reversible animation. Original cosmetics and melee correction remain intact.

This package has not been pushed or deployed. The existing Railway URL still serves the previous deployment.

Optional native visual checks require @napi-rs/canvas; run npm run test:visual after installing it. See docs/spacious-map.md for validation results.

Door visibility update: manual presses can alternate open/closed without waiting for an earlier server reply. Bots respect recent manual door control. Opaque roofs hide outside interiors; entering or standing within 52 world units of an exterior window/door reveals them. The server also hides indoor opponents and loot from distant outside viewers. Closed doors continue to block bullets. See docs/doors-and-visibility.md.

Movement update: characters project their movement along obstacle contact surfaces to slide past glancing contacts. Opened crates of all three types disappear immediately and stop blocking movement and bullets. The map now has 85 newly scattered buildings. See docs/movement-crates-map.md.

Latest update: solid tree foliage footprints and smooth tree gliding; accessible hiding bushes; wooden crates drop one heal/gun, gold crates three items, and three rare ultimate crates per island guarantee a Legendary gun plus medkit and shield. See docs/forest-crate-update.md.

Latest movement/loot update: 16 loose Common/Uncommon guns, no loose heal spawns, ground speed 1.5x, parachute movement 2x and landing in 5s (2.5s with Space). Existing ammo and crate drops remain. See docs/loot-speed-update.md.

Loadout update: compact bottom-right slots, drag-to-swap/drop, slotted medkits, rounded 10% ammo drops, automatic ammo pickup, exactly 30 small ammo boxes and spaced exterior wall-side crates (maximum four per building). See docs/loadout-update.md. No deployment.
