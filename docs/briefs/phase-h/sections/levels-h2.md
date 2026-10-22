# Your Phase H2 job: Levels, far background actors that match the new enemy designs
**Ownership:** your usual Levels paths (`src/level/**`, `config/tuning/level.ts`, maps, `art-src/maps/**`,
`art-src/backgrounds/actors/**`, `sprites/bg/**`, your packs, `docs/teams/level.md`).

**Why:** Phase H rebuilt the Buzzard gunship, the airboat and the gnat (the mech mosquito drone) from Imagegen references, so your far actors
now show old designs. Match the new ones, at far scale, in your house far-actor style (no outlines, atmospheric palette, low
contrast, alive):
1. **`bg_buzzard`** (the `buzzard_circle` moment in 1-2; check for other uses). It should read as the new gunship far away:
   the canopy blob, a long tail boom, a rotor blur and a tail rotor flicker. New sprite: `game/public/assets/sprites/enemies/buzzard.png`
   plus its `.json`. Reference: `game/art-src/refs/buzzard/`.
2. **`bg_airboat`** (the `airboat_race` moment in 2-2): the big fan cage with a spinning blade, two crew bumps and a pennant,
   plus a wake. New sprite: `sprites/enemies/airboat.*`. Reference: `refs/airboat/`.
3. **`bg_skeeter`** (the `skeeter_swarm` moment: mech mosquito drones crossing the moon): match the new **gnat** (`sprites/enemies/gnat.*`, `refs/gnat/`).
   Enemies B is redrawing the MEGA-SKEETER boss right now. If any far actor of yours shows the boss itself, match `refs/skeeter/`.

Keep the sizes about the same as today (they're tuned for the far layers and the screen y 62–110 sky band) unless the new
silhouettes need a few pixels more. Keep the frame budget small.

**Evidence:**
- an old/new contact sheet at 1× and 4×;
- in-context shots of each moment, fired with `__KBE.cheats.bg('<id>')` in its real part: `buzzard_circle`, `airboat_race`, `skeeter_swarm`.

Run `npm --prefix game run audit` at the end.

**"Anything else" (optional, time-boxed to about 20 minutes):** look through your other far actors and background moments in Missions 1–2
for anything that now looks off next to the facelifted enemies, and fix it if it's yours. List what you changed.
