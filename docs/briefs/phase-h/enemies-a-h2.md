# Phase H2 brief: Enemies A (GATORGEDDON legs)

# Context (read carefully)
You are the **Enemies A (GATORGEDDON legs)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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

# Your Phase H2 job: Enemies A, the GATORGEDDON legs and claws pass
You did H1 (Buzzard and hound; it's committed, nice work). This round is **GATORGEDDON**, which is all yours as in Phase G:
`src/entities/bosses/Gatorgeddon*.ts`, `tuning/gatorgeddon.ts`, `art-src/enemies/gatorgeddon*`, `sprites/enemies/gatorgeddon*`,
`packs/gatorgeddon.m2.json`, `docs/teams/enemies-gatorgeddon.md`. B still owns everything else under Enemies' paths.
Don't touch your H1 files unless a bug shows up; if one does, fix it and say so.

**Why:** next to MOOSEZILLA, GATORGEDDON's legs are thin pistons and tread-like feet under a huge armoured body
(`/tmp/kbe-lead/polish/bosses2.png`, `b_gator_1.png`). The body, head and tail read well. The legs don't sell the weight of a mech crocodile.

**Reference:** `game/art-src/refs/gatorgeddon_legs/` (concept, pixel, poses, parts) and `game/art-src/refs/sheet_gatorgeddon_legs.png`.
Read `game/art-src/refs/README.md`; the manifest notes say the boss envelopes are provisional, so fit them to your rig.

**Build:**
1. **New front and back legs:**
   - thick armoured gator legs in the body's green and steel;
   - elbow and knee plates, visible hydraulic rams;
   - big splayed three-claw feet that grip the ground.
   Redo every leg tag: idle, walk, crouch, stomp, and anything else the rig uses. Give them weight:
   - the foot plants and the claws spread;
   - the rams compress on the stomp;
   - dust or mud on each plant (`dust_land`/`mud_splat` fx).
2. **Damage states:** the 66% and 33% cosmetic states carry through to the legs (cracked plates, a leaking ram, sparks).
3. **Death:** the legs buckle as part of the death chain. The LESSONS.md §2 boss rules all still hold.
4. **Fit:** look at the whole composite in its **real 2-3 arena**, the intro, every attack and the death, beside Knotz.
   If any other part now falls below the legs (the body's underside or the jaw hinge), give it a light matching touch.
   No silhouette redesign.

**Keep the gameplay:** the same hurtboxes (within about ±4 px), timings, attacks, HP and phases. `npm --prefix game run audit` must pass for 2-3, including the boss phases.

**Evidence:**
- before/after contact sheets of the leg tags at 4×;
- a composite boss sheet of the idle, a stomp, the 66% and 33% states and the death;
- in-arena shots of the walk and stomp.
