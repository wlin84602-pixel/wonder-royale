# Loadout and wall-side crate update

The local game now has six 57px square equipment slots at the bottom-right (responsive on narrow screens), with four 38px ammo tiles immediately above them. Slot 1 remains melee-only. Drag an occupied equipment slot onto another slot to swap it; drag upward above the row to drop it. Medkits occupy and stack in a free equipment slot, and use the existing Fire control when selected. The old separate medkit button is hidden.

Ammo tiles have fixed positions. Clicking one or dragging it upward drops 10% of that displayed reserve, rounded to the nearest whole round, with a minimum of one. Sideways dragging does nothing. Magazine ammunition is not included in the reserve display. Loose ammunition is collected automatically within 52 world units when unobstructed. Opening an ammo box credits both ammo packs directly. Dropped ammo is placed in front of the player; moving away clears its owner pickup guard.

Each island has exactly 30 small ammo boxes. Crates occupy exterior wall-side positions with at least 180 world units between crates and from exterior door centers. There are at most four per building, below the requested six-crate limit. Existing wooden/gold/ultimate loot rules remain; three ultimate crates per map are retained. The brown door threshold strip has been removed. Door hinge movement and collision remain intact.

Shared inventory rules validate swaps, drops, medkit use and ammo quantities on the server. Actions preserve weapon ammunition, firing deadlines and active reload deadlines. Replayed actions are rejected. Client predictions reconcile with authoritative snapshots without reverting newer drags.

Validation includes inventory rules, actual generated-client pointer handlers, delayed multiplayer replies, two real HTTP/SSE clients, and the existing map, door, movement, ammo and firing suites. Native Canvas rendering checks original artwork and the small ammo-box design. The browser tool blocks file:// inspection, so this update does not claim a browser screenshot or visual confirmation of the HTML HUD layout.

Local files only. No GitHub push or Railway deployment.
