# Sliding, crates and building density

Local update only; GitHub and Railway unchanged.

- Movement now projects along the contact surface of walls, diagonal segments, circles and corners. It preserves the normal speed limit and solid collision, while allowing glancing movement to continue alongside objects. Existing embedded-position recovery and the 15ms rapid-door passage fix remain in place.
- All opened crates (basic, gold and ammo) disappear and immediately lose movement and bullet collision. Loot remains, and crates cannot be opened twice. Client snapshot reconciliation applies the same removal flags as the server.
- Building count is reduced by 50%, from 170 to 85. A refreshed deterministic random layout distributes them across dry land with spacing between buildings. Map dimensions and camera zoom are unchanged.

Validation covers sliding at 30/60/144 simulated FPS, circle and corner glances, diagonal and straight walls, backing away from obstacles, absence of penetration/speed boosts, every crate type, authoritative opened/destroyed flags and randomized map generation. The actual client interaction and renderer confirm that a gold crate vanishes while its loot remains. Existing world, client, multiplayer, weapon, visibility, door and cosmetic checks are also run.

Runtime files changed: island/world.js, island/buildings.js, island/render.js, island/client.js, standalone HTML builds, packaged public/index.html. Tests and documentation updated.
