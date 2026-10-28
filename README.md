# Wonder Royale: online

Top-down battle royale for 2–6 players per room. Node + Express + Socket.IO server runs the real game rules;
the browser client keeps all the original rendering, art and UI.

```
client/   index.html, game.js (original game + net layer), config.js   (static files)
server/   index.js (Express + Socket.IO), src/rooms.js (rooms), src/sim.js (match host), game/sim-core.js (game rules)
src/      source of truth that tools/build.js bundles into client/game.js and server/game/sim-core.js
```
After editing anything in `src/`, run `npm run build`.

## Run locally
```
npm install --prefix server     # or: npm install   (root package.json lists the same deps)
npm start                       # http://localhost:3000  (serves client/ too)
```
Open it in two browser tabs and press the big **SOLO** button in both: you land in a public lobby of real players only (no bots) and the match starts by itself 30 s after the 2nd player arrives (10 s once 6 are in).
While the lobby counts down, players stand on a big green **waiting field** (no obstacles), walk around, see each other, and play two mini games run by the server: **Coin Rush** (collect coins) and **kick the ball into a goal**. The countdown is a small pill at the top. Left click punches (also hits the ball), **Enter** opens a chat box and the message floats over your character. When the timer ends everyone drops into the real map.
Friends-only rooms: **Play with friends** → Create room → the other tab joins with the 5-letter code → host presses Start.

### Admin (pause / resume / Start instantly)
Set a variable `ADMIN_KEY` on the server (Railway → Variables, any long secret). In a lobby press **Admin login** and type that key (the browser remembers it). The admin sees **Pause countdown / Resume countdown**, **Start instantly** (works even alone, for testing) and the map/storm/loot options. In friends rooms the host gets the same buttons without a key.

## Deploy on Railway
1. Push to GitHub:
   ```
   git init && git add . && git commit -m "Wonder Royale online"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Railway → New Project → Deploy from GitHub repo → pick the repo. (Root `package.json` + `railway.json` are used: start = `npm start`, health check = `/health`.)
3. Variables: `ADMIN_KEY` = your secret admin key (needed for the admin buttons). `FRONTEND_URL` = your site's origin (e.g. `https://wonder-royale.up.railway.app`; comma-separate several). Leave unset to allow `*`. Do **not** set `PORT`; Railway provides it and the server binds `0.0.0.0`.
4. Settings → Networking → Generate Domain. Open it; `/health` should return `{"ok":true}`.
5. Optional, client hosted elsewhere: put the Railway URL in `client/config.js` (`server: 'https://…'`) or open the page with `?server=https://…`, and set `FRONTEND_URL` to that page's origin.
One instance only: rooms live in server memory, so don't scale replicas above 1.

## Railway checklist (all implemented)
`process.env.PORT` + `0.0.0.0` · `GET /health` 200 · CORS from `FRONTEND_URL` (`*` in dev) · client `transports:['polling','websocket']`, `reconnection:true` · reconnect restores the seat (code + token kept in sessionStorage; server holds the seat 20 s in lobby / 45 s in a match).

## Who owns what
| Server (authoritative) | Client |
|---|---|
| positions, velocity, plane/parachute phase, landing | draws everything; predicts own ground movement (server validates speed, corrects with a `c` flag) |
| hp, shield, alive, kills, placement, winner | HUD from snapshots |
| inventory, ammo, reload, selected slot, heal/use timers | shows `m` messages; sends `sel/use/reload/swap/drop/ammo` |
| bullets, hits, damage, melee, explosions | spawns cosmetic bullets/effects from `shot`/`hit` events |
| ground loot, crates, airdrops, trees, doors (open/closed) | applies `l+ l- l~ c c+ c- t d` events |
| storm/zone schedule, storm damage | draws zone from snapshot |
| rooms, host, roster, countdown, match clock, results | lobby/end UI |

Protocol: `room:create|solo|join|rejoin|leave|start|opts|ctl` and `admin:auth` (acks) · `in` 30 Hz input · `act` actions · server → `lobby`, `match:start`, `s` snapshot+events, `m` private state, `match:over`, `match:error`.

## Tests
`npm test` (33 room/match checks + 22 lobby/admin checks, in-memory Socket.IO stand-in) and `PLAYWRIGHT_PATH=… node server/test/browser.js` (38 checks, two real Chromium pages).


## Skin only, bigger characters, Midas M4
- **Skin only** toggle (Home and Locker): hides the melee weapon and backpack in matches (fists only); other players see it too.
- Characters are slightly bigger (radius 22 -> 25).
- **Midas M4** (black and gold, 44 dmg, very fast, wide view, gold/black animated bullets): found in about a third of airdrops, or from the admin panel (Golden M4 button / weapon list).

- Polish: floating damage numbers, low-health pulse, press/fade transitions, mobile viewport + favicon + meta tags.
- Polish 2: loading screen, victory screen with confetti and count-up, HP bar colour tiers, feed/gun animations, lobby slot and countdown animations, feed moved below the banner.
- Buildings: per-type roofs (gable, hip, sawtooth, tent, dome, thatch, parapet), floor patterns, stone/plank walls, framed windows, chimney smoke, stone paths and lamps at doors (visual only).
- Doors: 45 ms toggle cooldown, reach 74, client-side prediction in multiplayer (server confirms), eased 0.1 s swing, new sprites (painted wood, riveted iron, banded oak), jambs and a swing-area shadow.
- Admin panel: available in practice and in every online match. Unlock it from the in-game Menu (or the admin key) with the passcode. Practice checks it on the device; online the server checks it (it is the ADMIN_KEY variable, set to the passcode) and runs the cheats, so they work for the admin only.
