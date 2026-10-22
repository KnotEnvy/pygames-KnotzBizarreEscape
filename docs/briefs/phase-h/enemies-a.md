# Phase H brief: Enemies A (Buzzard and hound)

# Context (read carefully)
You are the **Enemies A (Buzzard and hound)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now.
- **Status:** Missions 1 and 2 are built, and the owner loves them. **Phase H** is a visual polish pass. It brings the newer
  enemies up to (or above) the quality of the rest of the game's art before Mission 3 starts.

**Read first, in this order:**
1. `docs/PHASE-H.md`: the owner's ask, the Lead's survey, the phase rules and the shared contract. Read all of it.
2. `docs/ART-STYLE.md`: the house pixel style. `docs/LESSONS.md`: the definition of done.
3. `docs/ARCHITECTURE.md` (ownership, events, debug hooks) and `docs/PHASER4-RULES.md` (Phaser 4 API rules).
4. Your own notes in `docs/teams/<your team>.md`. Reuse your pipelines, helpers and tools.

**The Lead's survey images** are in `/tmp/kbe-lead/polish/` (read-only for you):
- `hopper.png`, `airboat.png`, `buzzard.png`, `small.png`: the current sprites per tag.
- `ref.png`: grunt, shield and lurker, which are the bar for the soldiers.
- `bosses1.png` and `bosses2.png`.
- In-game shots: `ctx_*.png`, `e_*.png`, `b_*.png`.

# Rules
- **Edit only the paths your team owns** (ARCHITECTURE.md, plus anything this brief grants). Need something else? List it
  under **"Requests for other teams"** in your report.
- **No git commands that change state:** no commit, add, checkout, stash, reset or restore. The Lead commits.
- **Don't touch the repo-root `playtest/` folder.** The Lead refreshes it.
- **Other teams' work in progress:**
  - Transient typecheck errors in their files are expected; don't touch their files.
  - At the end, run `npm --prefix game run check` and make sure **your** files are clean. Report foreign errors briefly.
- **Testing (the owner's hard rule): NO real-time bot playthroughs.**
  - Use `npm --prefix game run check`, `npm --prefix game run audit`, `npm --prefix game run selftest`,
    `?enemytest=<kind>` fixtures, `__KBE.sim.advance(ms)` (fixed-step turbo), `__KBE.cheats.*`, and targeted
    `game/tools/shot.mjs` screenshots and contact sheets.
  - **Open and look at** every image you cite.
  - **Time-box each verification attempt to about 10 minutes.** If a check won't converge, stop and report it.
  - SwiftShader is slow when several browsers run at once. Run your captures **one at a time** (one browser, many pages)
    rather than many shot.mjs processes in parallel. If a shot shows a loading screen, wait longer instead of retrying in parallel.
- **Scratch output:** `/tmp/kbe-enemies-a/`.
- **Shell:**
  - `cd` is aliased by fnm and errors. Use `builtin cd`, absolute paths, or `npm --prefix game ...`.
  - **Never** use `pkill -f` or `killall` with patterns. Kill by PID.
  - Stop every dev server or browser you start before you finish.
  - If a local server start is refused ("approval reviewer at capacity"), wait 30–60 s and retry once, then fall back to `shot.mjs` or report it.
- **Browser:** `game/tools/shot.mjs` already sets up Chromium (`LD_LIBRARY_PATH=/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu`, SwiftShader). Shot tips:
  - wrap `scene.start` evals in `(…, 1)`;
  - use unique shot names;
  - allow about 1.2 s of boot, longer for Mission 2 (it loads its packs on demand).
  - URL pattern: `?debug=1&scene=Game&fast=1&mute=1&god=1&part=2-1&x=2640` (part and world x). `debug=1` also draws hurtboxes.
- **Python** (Pillow/numpy): `UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python3 -I <script>`.
- **Pixel art:**
  - Aseprite is at `/home/knotz2/.local/bin/aseprite` (guide: `/home/knotz2/.local/opt/pixel-tools/PIXEL-TOOLS.md`).
  - Master palette only (`docs/palette.gpl`, `K.PAL` in `game/tools/aseprite/kbe.lua`), binary alpha.
  - **Aseprite tags are global animation keys:** prefix every tag with its sprite key and check for duplicates.
  - Build with `bash game/tools/build-art.sh <lua>`.
- **Quality bar:** it has to look like Metal Slug. Silhouettes read at 1×, there's life in every idle, telegraphs are fair,
  impacts are juicy, and it holds 60 FPS on SwiftShader. Reduced-flash and screen-shake settings are respected.
- **When done:**
  - Append a **Phase H** section to your team notes file: what you built (paths), how to see it (exact URLs or commands), decisions and known issues.
  - Your **final reply** is a concise report:
    - what you built;
    - the verification evidence (paths of the images you inspected, and the check, audit and selftest results);
    - known issues;
    - **Requests for other teams**.

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
