## Your item: Levels
1. **Lead note:** the new far `bg_airboat` racers (`airboat_race`, 2-2) are bright olive and red and run at about the player's head height
   (`/tmp/kbe-levels/after/ab_b.png`), so they compete with the gameplay layer (LESSONS §5: background lower contrast than enemies).
   - Fix: push them back atmospherically, for example a darker and cooler river-haze palette shift on the hull and fan, or a lower alpha or
     tint at runtime, so they read clearly as far away while keeping the new silhouette.
   - Do the same check for `bg_buzzard` over the 1-2 sky. It looked fine to the Lead; change it only if needed.
2. **Optional:** if Enemies B's H3 gnat wing change lands while you work (`sprites/enemies/gnat.*`), match it in `bg_skeeter`. If not, leave it.

**Evidence:** before/after in-context shots of `airboat_race` fired with `__KBE.cheats.bg('airboat_race')` in 2-2.
