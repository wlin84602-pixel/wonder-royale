# Multiplayer waiting island

The hosted game enters a shared waiting island before battle. Players use their configured movement controls and equipped cosmetics. The battle clock, gas and plane remain paused indefinitely. The first human is host; only that player's authenticated token can start. Departing hosts pass control to the next connected human. Firing, damage, inventory drops and early jumping are disabled while waiting.

Use New Room for a separate room code, then Multiplayer to join. Copy Link shares that exact room with friends. The host presses Start Match whenever ready. All connected humans enter the same seeded island and plane route together; existing bots fill available places up to 25. Running custom matches reject late entrants. Public matchmaking puts new arrivals in another waiting room when the current public match has started.

The game uses authoritative 30Hz simulation, HTTP input/actions and 15Hz SSE snapshots. Rooms live in memory and reset on server restart; the deployment uses one replica. There is no automatic countdown, account service, durable rooms or team mode.

Validation: shared waiting movement, frozen clocks, blocked combat, host authorization, host transfer, joint plane start and late-join rules are tested with two real HTTP/SSE clients. The actual generated client has lobby/host/UI/movement/transition tests and a native Canvas render check. Existing inventory and combat suites remain part of npm test.

## Resort island expansion

The waiting island now has exactly 10 times its previous map area: 1400√10 per side (about 4,427 units). A follow camera keeps characters readable. A minimap and overview toggle show the whole resort. Activity buttons travel to fixed safe destinations; travel cancels an active race.

Arrival Plaza has a fountain confetti interaction. Coastal Circuit times four-checkpoint laps and retains a personal best. Target Arcade uses the Fire binding to hit targets and count points; its practice effects cannot damage players or consume battle ammunition. Seaside Football has a shared ball, dribbling, aimed kicks with Interact and synchronized goals. Sunset Social has an interactive dance floor and bounce pad.

The server owns scores, race checkpoints, practice cadence, travel destinations and football movement. All activity actions stop when battle starts. The normal battle map, character scale, hitboxes, weapon values and movement speed are unchanged.
