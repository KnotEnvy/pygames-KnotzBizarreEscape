# Phase H2 brief: Enemies B (MEGA-SKEETER and hopper hop)

# Context (read carefully)
You are the **Enemies B (MEGA-SKEETER and hopper hop)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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

# Your Phase H2 job: Enemies B, the MEGA-SKEETER mosquito pass and a stronger hopper hop
Your H1 work (hopper, airboat, piranha, gnat, lurker) is committed. It's a big step up, nice work. Same ownership as H1.
Enemies A is reworking GATORGEDDON's legs at the same time (its files only).

**1. MEGA-SKEETER silhouette pass** (`boss:skeeter`, the 2-2 mid-boss, art in `art-src/enemies/phase-g.lua`, sprite `skeeter`).
- **Why:** it reads as a fat beetle-fly. The wings are an opaque blue-grey bar, and the body is a round red drum
  (`/tmp/kbe-lead/polish/bosses1.png`, `b_skeeter.png`). It must read as a **mosquito** at a glance (PHASE-H design direction).
- **Reference:** `game/art-src/refs/skeeter/` (concept, pixel, poses, parts) and `game/art-src/refs/sheet_skeeter.png`.
  The reference's visible envelope (144×104) is provisional. Fit it to your rig: about the current footprint ±15% for
  the body, with wings and legs free to reach further. The whole silhouette must stay inside the locked view and its vertical clamp.
- **Wings:** they flutter (a 3–4 frame wing blur). Show them as glassy with steel rims, veins and pale-blue panes (binary alpha).
- **Legs:** they dangle and twitch.
- **Weak point:** the abdomen fuel tank glows and pulses, so the weak point is obvious.
- **Proboscis:** the drill needle reads clearly in DRILL DIVE.
- **Tags:** redraw every one, including intro, idle, laser, dive, stuck, larva, fan_cue, fan, death, and the `_damaged` and `_critical` states.
  The torn wing at 33% must still be visible, and the death spin into the river still plays.
- **Gameplay stays the same:**
  - hurtboxes and their multipliers (the tank takes 1.5×, then 2× once it cracks);
  - every telegraph (the 700 ms laser line, the 600 ms fan cue);
  - the larva cap, HP, phases and the flier clamps.
  `npm --prefix game run audit` must pass for 2-2, including the boss phases.

**2. A stronger hopper hop.** In H1 the hop barely reads: the legs stay folded in the air (see your
`compare-context-hopper.png`, or `/tmp/kbe-lead/polish/new_hopper.png`). Give it real squash and stretch:
- **crouch:** lower, wider, with the legs visibly loaded;
- **airborne:** the body stretched and the hind legs **extended back**, with the front feet reaching;
- **landing:** a wide squash before it recovers.
Keep the hurtbox and the 720 ms arc.

**Evidence:**
- before/after MEGA-SKEETER contact sheets at 2× and 4×, beside Knotz;
- in-arena shots on the 2-2 riverboat foredeck: idle, laser cue, dive, stuck, fan, damaged, critical and death;
- a hopper hop sequence.
