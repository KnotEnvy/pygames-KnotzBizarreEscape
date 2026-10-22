# Phase H brief: Effects (FX)

# Context (read carefully)
You are the **Effects (FX)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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
- **Scratch output:** `/tmp/kbe-fx/`.
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

# Your Phase H job: FX, effects for the enemy facelift
**Ownership:** your usual FX paths (`src/fx/**`, `config/tuning/fx.ts`, `art-src/fx/**`, FX sprites and packs, `docs/teams/fx.md`).

**Build** (the contract is in `docs/PHASE-H.md`; Enemies A and B start emitting these during this round):
1. **New `fx:emit` recipes:**
   - **`rotor_wash`:** a radial ring blown outward from `x` along the surface at `y`, with `width` and strength `count` (0–1).
     - `snow`: powder streaks.
     - `dirt` or `mud`: dust.
     - `water`: a spray ring and ripples.
     - `wood` or `metal`: grit.
     About every 120 ms per craft, so it has to be cheap.
   - **`boat_wake`:**
     - bow spray, a curl of white water at `x` facing `angle`;
     - a stern foam trail that lingers about 600 ms and drifts (it should read on the moving 2-2 river and on still water).
     About every 100 ms per boat.
   - **`mech_pop`:** a small comic machine death burst sized by `scale` (0.5–1.5):
     - bolts and plates with gravity and bounce;
     - one or two springs, glass glints and a shower of sparks;
     - a short puff of dark oily smoke.
     Reuse `fx_debris_metal` where it helps.
   - **`smoke_trail`:** one dark puff that drifts up and stretches.
2. **Kill feel:** add the Phase G kinds to `MACHINE` in `src/fx/director.ts` (hopper, airboat, piranha, gnat, buzzard, hound, skeeter, shellshock, gatorgeddon).
   - The hound is an armoured dog, so give it the normal kill feel.
   - Make sure a killed swarm of 6 gnats doesn't stack hitstop into a stutter.
3. **Budgets and settings:**
   - pooled, with no per-frame allocation (Rules F2);
   - caps per recipe, so 3 airboats plus a Buzzard plus a gnat swarm stays at 60 FPS on SwiftShader;
   - reduced flash and screen shake respected.
4. **Preview:** add the new recipes to your FX gallery (`src/fx/gallery.ts`), and make a contact sheet of each:
   - over a Mission 1 snow background;
   - over the 2-2 river, and over 2-1 mud.
   Then, once the enemies emit them, take in-context shots: 2-2 airboats, the Buzzard over 1-2 snow and the 2-2 river, and a hopper and piranha kill in 2-1.

**Time:** the recipes come first (about 30–45 minutes), so the enemies see them working. Then polish them against the in-game shots.
