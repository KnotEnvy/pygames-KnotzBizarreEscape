# Phase H3 brief: Enemies B

# Context (read carefully)
You are the **Enemies B** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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

# Phase H3: the fix round
H1 and H2 are committed on `mission-2`. QA reviewed H1 (`docs/teams/qa-bugs.md`, Phase H section at the top) and Rules reviewed the
H1 code (`docs/teams/rules-review.md`, Phase H review section). Your items are below. **Read the full finding text in those files
first.** They have exact repros, URLs and evidence paths.
- Keep every fix small and inside your paths.
- Keep the gameplay unchanged: attack timings, hurtboxes, HP and damage.
- Re-verify each fix with the same repro QA or Rules used, and open the images.
- At the end, run `npm --prefix game run check` and `npm --prefix game run audit`.
- Append a short "Phase H3" note to your team file listing each item as fixed or won't-fix, with a reason.

## Your items: Enemies B (`BayouEnemy.ts`, `phase-g.lua` and the roster libs)
1. **KBE-QA-H02 (S4):** the airboat's final sink frames leave the locked crane view in 2-2 (x about 2320 lock).
   - Fix: keep the crew escape, the fan collapse and the last debris visible inside the water lane until cleanup, for example by limiting
     the runtime downward drift so the art's own sink reads. The hull can still disappear under the surface.
2. **Rules H4 (N):** a piranha or hopper killed mid-leap hangs in the air for its whole death.
   - Fix: let it fall to its floor or water line during the death (a short gravity fall), with a splash where it lands in water.
3. **Rules H5 (N):** the piranha's ellipse cue width changes every frame, so its redraw cache never hits. Round it.
4. **QA suggestion 4:** the hopper blends into olive ground and Knotz's olive.
   - Fix: give it a clearer lit belly and a steel edge, a crisper outline at the feet, and a more legible small red flank marking,
     in all tags, including the new hop.
5. **QA suggestion 5:** the gnat's glass wing panes read as a thin slash at 1×.
   - Fix: make the wings legible at 1×, for example a slightly larger pane with a 1 px pale rim and a dark interior.
     Keep the small body and the dive hitbox. Levels' far `bg_skeeter` copies the gnat, so mention what changed in your note.

**Evidence:**
- before/after contact sheets for the hopper and gnat at 1× and 4×, beside Knotz, plus an in-context 2-1 shot;
- an airboat sink sequence in the real 2-2 lock;
- a piranha killed mid-leap.
