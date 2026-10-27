# Bot Royale

An independent game under bot-royale/; the existing Wonder Royale files are untouched.

Run with Node.js 22 or newer: npm start. Open http://localhost:5188/. No dependencies are required.
Run tests with npm test. The server binds HOST (default 0.0.0.0) and PORT (default 5188).

The normal URL joins the multiplayer main room. Use ?room=your-room to play together privately by room name, or ?offline=1 for local bot play.
Rooms support 25 actors total. Human players replace bots. Match state is in memory, so deploy exactly one replica; restarts reset matches. This version has no account or team service.

Controls: WASD move, mouse aim, left click fire/use selected item, E interact, R reload, Space jump then speed descent, M map, 1-6 slots, Escape match menu. Keybinds can be changed from the homepage. Slot 1 is melee only.

Includes a 6000x6000 island, eight named areas, traversable interiors and doors, destructible cover, server-owned loot/combat/zone and plane drops. Melee is held across the character, handle left and head right; in-game melee and backpacks are twice their previous size.

Railway: isolated service root /bot-royale, Dockerfile build, /health health check. Deploy independently of the repository root service. Service configuration is applied through Railway settings; no deprecated railway.json is required.

Testing covers map generation, collision, doors, loot, zones, two real network clients, cooldown/reload overlap, weapon switching and cadence at 30/60/120/144 simulated FPS. Native render and browser visual checks are performed on the source build before packaging.

Existing weapon damage, projectile speeds, reload durations, cosmetic artwork and menus are retained. Weapon timing profiles are approximate reference values, not official ZombsRoyale values.
