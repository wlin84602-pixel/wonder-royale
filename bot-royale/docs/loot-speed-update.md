# Sparse loose loot and faster player movement

Local update only; GitHub and Railway unchanged.

- Initial loose gun spawns are replaced by just 16 across the entire island: 14 Common and 2 Uncommon. They are at least 1,000 world units apart and placed in clear outdoor positions.
- Initial loose medkit and shield spawns are removed. Existing ammunition spawns and crate contents remain. Crate locations and identities were preserved.
- Human player ground speed is 307.5 world units/second, 1.5x the previous 205. NPC ground movement is unchanged. Client and server use the shared speed constant.
- Parachute movement is 492 world units/second, twice the previous 246. This is independent of the ground-speed increase. Landing takes 5 seconds normally, or 2.5 seconds with the existing Space boost. Offline/online movement, landing bar and camera progress use the same duration.

Validation: three seeded maps checked for exactly 16 low-tier guns, no initial heals and unchanged ammunition counts. Actual client update measured both movement speeds and fast landing. The authoritative simulation verified ground displacement, normalized diagonal gliding and normal/boosted descent. Existing client integration, crate/forest rules and 72 rapid-door passage cases passed. Original weapon statistics, cosmetics, camera zoom, 85 buildings and 15ms door swings remain unchanged.

Files: island/world.js, island/client.js, island/session.cjs, standalone HTML builds, packaged public/index.html, build helper, tests and documentation.
