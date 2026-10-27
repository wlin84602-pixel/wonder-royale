# Bot Royale

An independent game under bot-royale/; the existing Wonder Royale files are untouched.

Run with Node.js 22 or newer: npm start. Open http://localhost:5188/. No dependencies are required.
Run tests with npm test. The server binds HOST (default 0.0.0.0) and PORT (default 5188).

The normal URL joins the multiplayer main room. Use ?room=your-room to play together privately by room name, or ?offline=1 for local bot play.
Rooms support 25 actors total. Human players replace bots. Match state is in memory, so deploy exactly one replica; restarts reset matches. This version has no account or team service.

Controls: WASD move, mouse aim, left click fire/use selected item, E interact, R reload, Space jump then speed descent, M map, 1-6 slots, Escape match menu. Keybinds can be changed from the homepage. Slot 1 is melee only.

Includes a 6000x6000 island, eight named areas, traversable interiors and doors, destructible cover, server-owned loot/combat/zone and plane drops. Cosmetics use original visible artwork bounds with individual backpack sizes, weapon lengths and attachment points. Backpacks sit behind the unchanged outfit; melee is held clear of its face. Local and remote actors share one renderer.

Railway: isolated service root /bot-royale, Dockerfile build, /health health check. Deploy independently of the repository root service.

Testing covers map generation, collision, doors, loot, zones, two real network clients, cooldown/reload overlap, weapon switching and cadence at 30/60/120/144 simulated FPS. Native render and browser visual checks are performed on the source build before packaging.

Existing weapon damage, projectile speeds, reload durations, cosmetic artwork and menus are retained. Weapon timing profiles are approximate reference values, not official ZombsRoyale values.

Cosmetic QA: original artwork is measured using cached alpha bounds. Per-design visible sizes and grip/rear attachments are centralized in island/cosmetics.js. The player remains at its existing 66px outfit scale and 26px collision radius. See docs/cosmetics.md for eight-set comparisons.

For the optional visual test install @napi-rs/canvas, then run npm run test:cosmetics. Normal npm test and the running server do not require it.
