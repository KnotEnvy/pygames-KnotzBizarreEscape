# Your Phase H job: Enemies A, the Buzzard gunship and the attack hound (Mission 1's newer enemies)
**Ownership this phase (Enemies is split again; B is doing the Mission 2 small enemies at the same time):**
- `src/entities/enemies/AssaultEnemy.ts` (hound and Buzzard).
- `art-src/enemies/buzzard*`, `art-src/enemies/hound*` (new Lua files are welcome).
- The **hound and Buzzard sections of `art-src/enemies/phase-e.lua`**. They're built there today (lines about 170–194).
  **If you move them to new files, delete them from phase-e.lua**: `build-art.sh` runs every Lua, and the last one to write wins.
- `public/assets/sprites/enemies/buzzard.*` and `hound.*`.
- Only the `hound` and `buzzard` entries in `src/config/tuning/enemies.ts`. B edits other lines of that file, so re-read it
  before each edit and keep patches minimal.
- Your notes: append to `docs/teams/enemies-gatorgeddon.md` (your file) under "Phase H (Enemies A)".
- Everything else under Enemies' paths is B's this phase (BayouEnemy.ts, Enemy.ts, index.ts, phase-g.lua, the bosses and so on). GATORGEDDON stays yours, but there's no GATORGEDDON work until H2.

**References:** Imagegen is painting them now under `game/art-src/refs/<kind>/` (concept, a game-scale `pixel.png`, poses and
parts) and marks each kind ready in `game/art-src/refs/manifest.json`. The Buzzard is third in its queue and the hound sixth.
- **Start without them:**
  - read the current code and art;
  - plan the new tag set, frame counts and canvas;
  - build the Lua rig scaffolding and the procedural motion pieces (rotor blur, tail rotor, run cycle timing).
- Then poll the manifest every 2–3 minutes (`sleep 150`), for up to about 40 minutes per kind. If a reference still isn't
  there, build from the PHASE-H design direction and say so in your report.

**Build:**
1. **Buzzard (Regime gunship).** Fully redraw and reanimate it from the reference and the PHASE-H direction. Flown in 1-2 (x about 2104, 3368, 4872), 2-1 (x about 4968) and 2-2 (x about 2440).
   - **Rotor:** a real main-rotor cycle with 4+ frames of blade positions and sparse motion-blur arcs, plus a spinning tail rotor.
     Add a slight hull bob, and exhaust shimmer or puffs.
   - **Strafe:** a nose-down tilt drawn as art. The chin turret visibly swings down during aim.
     Muzzle flash frames on each burst, and play the new **`buzzard_gun`** sound.
   - **At ≤ 50% HP:** damaged frames (holes, sparking ports), and emit **`smoke_trail`** about every 150 ms.
   - **Rotor wash:** when it's within about 90 px of the ground or water, emit **`rotor_wash`** about every 120 ms at the surface
     below it, with the right material (snow in Mission 1, water on the 2-2 river, mud or dirt in 2-1).
   - **Death (≥ 8 frames over its current 1200 ms):** the tail snaps, it spins out smoking, and the rotor bends. On impact:
     `explosion` size `l`, **`mech_pop`** at scale 1.5 and **`heli_crash`**. Keep the crash inside the locked view.
   - **Altitude:** keep the cruising hull in screen **y 62–110** and the rotor tip below the radio strip (screen y ≥ 56).
     Strafing dips can go lower. Check each placement above in context.
2. **Attack hound.** An armoured dog, not a robot: keep `flesh`.
   - **Run:** a real articulated 8-frame gallop.
   - **Pounce:** a crouch cue with the haunches loaded, a stretched leap, and a land squash with `dust_land`.
   - **Hurt:** a flinch.
   - **Death (≥ 8 frames):** comic. The antler helmet flies off and the dog tumbles out. No gore.
   - Placed in 1-3 at x about 600–1768. Check it in context.

**Keep the gameplay** as PHASE-H says:
- hurtboxes within about ±4 px, realigned to the new art (check them with `debug=1`);
- the same timings, HP and damage.

`npm --prefix game run audit` must pass for 1-2, 1-3, 2-1 and 2-2.

**Evidence:**
- a contact sheet per kind with every tag and frame at 4×, beside a grunt and Knotz;
- before/after shots in context (production-like: `?debug=1&scene=Game&fast=1&mute=1&god=1&part=…&x=…`);
- a strafe-pass sequence, and a damaged and a death sequence for the Buzzard;
- the hound pounce sequence.
