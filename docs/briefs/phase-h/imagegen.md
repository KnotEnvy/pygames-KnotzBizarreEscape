# Phase H brief: Imagegen

# Context (read carefully)
You are the **Imagegen** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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
- **Scratch output:** `/tmp/kbe-imagegen/`.
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

# Your Phase H job: Imagegen, reference art for the enemy facelift
**Ownership:** you own the new folder **`game/art-src/refs/**`**, and nothing else this phase. Don't touch runtime files, packs or other teams' art.
Your earlier pipelines are in `game/art-src/backgrounds/gen/` (`process_g.py` and its siblings). Read them and reuse their palette and alpha code.

**Goal:** give Enemies and Levels references good enough that the rebuilt sprites jump a quality tier. The references are a
**design guide**: silhouette, proportions, details and colour blocking. Enemies redraws and animates the final pixels in Aseprite.

**For each kind,** in this priority order, `hopper`, `airboat`, `buzzard`, `piranha`, `gnat`, `hound`, `lurker`, `skeeter`, `gatorgeddon_legs`
(the design direction is in `docs/PHASE-H.md`):
1. **`concept.png`:** a clean, high-resolution side view **facing right** on real transparency, using the built-in image generation tool.
   - Cartoon-military Metal Slug style, a bold readable silhouette, even light from the top-left, no background or ground shadow.
   - It must be an original design. Don't name or imitate a specific copyrighted character or sprite.
   - Generate a couple of variants if the first doesn't read, and keep the best.
2. **`pixel.png`:** a game-scale pixel reference at the **visible size** listed in PHASE-H (the hopper is about 40×32).
   - Best results usually come from asking the generator for **chunky pixel art with a clear pixel grid**. Edit from the
     concept so the design stays the same. Then reduce it **by its grid** (mode or nearest per cell), not by blurring it down.
   - Then quantize to the master palette (`docs/palette.gpl`) with no dithering and binary alpha.
   - Clean obvious noise (single orphan pixels, muddy clusters) so it reads at 1×.
   - Also write `pixel_4x.png` (nearest neighbour).
3. **Poses:** `poses.png` and `poses_pixel.png`, the key poses PHASE-H lists for that kind, edited from the concept so they stay consistent.
   This matters most for the hopper, airboat, buzzard and hound. Lay the poses out in a row on transparency with gaps between them.
4. **Parts:** `parts.png` and `parts_pixel.png`, an exploded parts sheet for rigging, with gaps between the parts:
   - **hopper:** body, eye turrets, hind leg segments, front legs, throat sac, tongue segment and tip;
   - **airboat:** hull, fan cage, blades, driver, gunner, MG;
   - **buzzard:** fuselage, canopy, rotor hub, tail boom, tail rotor, skids, stub wing and pod, chin turret;
   - **skeeter:** thorax, abdomen tank, head and proboscis, a leg, a wing;
   - **gatorgeddon_legs:** thigh, shin and clawed foot, front and back.
   Skip it for the gnat, piranha and lurker if the poses are enough.
5. **`sheet_<kind>.png`:** the pixel reference beside a **grunt** and **Knotz** at 1× and 4×, so the scale is obvious.
   - Grunt frames: `game/public/assets/sprites/enemies/grunt.png` plus its `.json`.
   - Knotz: `game/public/assets/sprites/player/knotz_full.png` plus its `.json`.
   - Look at it. Does it read at 1×? Is it in the same family as the grunt, the props and SHELLSHOCK (see `/tmp/kbe-lead/polish/bosses1.png`)?
6. **Bookkeeping:**
   - Update **`game/art-src/refs/manifest.json`** right away (`status: "ready"`, `visible`, `files`, `notes`). **Enemies is waiting on it**,
     and the hopper, airboat and buzzard unblock them, so write each kind the moment it's done; don't batch.
   - Keep raw sources as `raw_<kind>_*.png`, every exact prompt in `game/art-src/refs/prompts.json`, and your offline processor as
     `game/art-src/refs/process_refs.py` (rerunnable, asserts palette membership and binary alpha).
   - Add `game/art-src/refs/README.md` explaining the files.

**Time:** aim to have the hopper, airboat and buzzard ready within about 30–40 minutes, and everything within about 90.
Quality matters more than speed for the first three.

**Notes:** write a short **Phase H** section in `docs/teams/imagegen.md`. Your final reply lists every kind, with its files and a one-line verdict on how well it reads.
