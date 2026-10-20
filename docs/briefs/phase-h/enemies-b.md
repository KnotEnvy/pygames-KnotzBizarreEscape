# Phase H brief: Enemies B (Mission 2 roster)

# Context (read carefully)
You are the **Enemies B (Mission 2 roster)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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
- **Scratch output:** `/tmp/kbe-enemies-b/`.
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

# Your Phase H job: Enemies B, the Mission 2 small enemies facelift
**Ownership:** everything under Enemies' paths except Enemies A's Phase H files. A has:
- `AssaultEnemy.ts`;
- the buzzard and hound art, including their section of `phase-e.lua`;
- the `hound` and `buzzard` lines of `tuning/enemies.ts`;
- all of GATORGEDDON.

A edits other lines of `tuning/enemies.ts` at the same time, so re-read it before each edit and keep patches minimal.
Your files include `BayouEnemy.ts`, `Enemy.ts`, `index.ts`, `art-src/enemies/phase-g.lua` and its preview, the sprites, and `docs/teams/enemies.md`.

**References:** Imagegen is painting them now under `game/art-src/refs/<kind>/` (concept, a game-scale `pixel.png`, poses and
parts) and marks each kind ready in `game/art-src/refs/manifest.json`. The queue order is hopper, airboat, then piranha and gnat after the Buzzard, then lurker.
- **Start without them:**
  - read the current code and art;
  - plan the per-kind tag sets, frame counts and canvases;
  - restructure the art build so each kind has its own animation set, replacing the shared 42-frame
    `idle/cue/attack/tongue_cue/tongue/fire/death` template;
  - build the procedural motion pieces (fan blur, wing blur, splashes).
- Then poll the manifest every 2–3 minutes (`sleep 150`), for up to about 40 minutes per kind. If a reference still isn't
  there, build from the PHASE-H design direction and say so.

**Build** (design direction in PHASE-H; current behaviour in `BayouEnemy.ts`):
1. **hopper (mech bullfrog).** The owner called it rough, so this one matters most.
   - **Idle (6 frames):** the throat sac pulses, the lenses iris, steam puffs.
   - **Croak:** the cue.
   - **Hop:** a crouch anticipation, a stretched airborne pose for the 720 ms hop, then a landing squash with **`hopper_land`**
     and a splash (`water:splash` in shallow water, `mud_splat` or `dust_land` on mud or ground).
   - **Tongue:** `tongue_cue` swells the sac and opens the mouth. Then a tongue that **visibly extends the full 64 px hit line**
     (y-17), over its 220 ms, and retracts. Use a separate tongue sprite or segment if that's cleaner than a wide canvas.
   - **Hurt:** a flinch. Shotgun knockback must still read.
   - **Death (≥ 8 frames):** the lenses pop out on springs and the plates fly. Play the **`mech_pop`** sound and emit the **`mech_pop`** fx (scale about 0.8).
   - Placed in 2-1 (x about 2776–5704), 2-2 (about 2376–2488) and 2-3 (about 1080–3112).
2. **airboat (Regime swamp airboat).**
   - **Cruise:** a 4-frame fan blur, a bob, and bow spray. Emit **`boat_wake`** about every 100 ms while it moves.
   - **Firing:** a gun cue (the gunner swings in and the muzzle glints), with muzzle flash frames on each of the 3 shots.
   - **At ≤ 50% HP:** damaged frames and `smoke_trail` puffs.
   - **Death (≥ 8 frames over its 1200 ms):** sparks from the cage, the nose dips, and the crew is launched (soldier
     `death_launched` style). It sinks with **`airboat_sink`**, `mech_pop` fx at scale 1.5, and the existing splash.
   - Placed in 2-2 (x about 680–4520).
3. **piranha:** swim with the fin breaking the surface, a bulge cue, an arched leap with the jaw wide, a bite snap, the fall back
   and splash, and a death (scales pop, the jaw drops off) with `mech_pop` fx at about 0.6. Placed in 2-1 (x about 1144–2072) and 2-3 (about 536–1544).
4. **gnat (mosquito drone):** a hover with a 3–4 frame wing blur, a dive cue with a glowing proboscis, the dive, and a death
   (wings snap, the bulb pops) with `mech_pop` fx at about 0.5. They come in swarms, so keep them tiny but crisp.
   Placed in 2-1 (x about 1816–3496), 2-2 and 2-3. MEGA-SKEETER's larva drop spawns them too.
5. **lurker:** clean up the noisy moss into a readable ghillie (a few big clumps and reeds, a mud hem, drips) on all its tags.

**Keep the gameplay** as PHASE-H says:
- hurtboxes within about ±4 px, realigned to the new art (check them with `debug=1`);
- the same timings, telegraphs and damage;
- entry, flight and swim behaviour unchanged.

`npm --prefix game run audit` must pass for 2-1, 2-2 and 2-3.

**Evidence:**
- a contact sheet per kind with every tag and frame at 4×, beside a grunt and Knotz;
- before/after shots in context for each kind;
- frame sequences of the hopper hop and tongue, the airboat firing and sinking, and the piranha leap.

**H2 heads-up:** you'll get the MEGA-SKEETER mosquito silhouette pass next round. Don't start it now.
