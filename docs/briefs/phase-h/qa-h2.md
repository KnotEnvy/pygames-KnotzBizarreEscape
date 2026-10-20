# Phase H2 brief: QA

# Context (read carefully)
You are the **QA** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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
- **Scratch output:** `/tmp/kbe-qa/`.
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

# Your Phase H2 job: QA, the visual and regression review of the H1 facelift
**Ownership:** `docs/teams/qa-bugs.md` and `docs/teams/qa.md`, your test tooling (`game/tests/**`, if present), and scratch space. **Report only:
don't edit game code or art.** Owners fix in the next round.

**Scope: the H1 work, committed in `3704ab1..97d8e5c` on `mission-2`** (`git log --oneline 3704ab1..97d8e5c`):
- **Enemies A:** the Buzzard gunship and the attack hound (`AssaultEnemy.ts`).
- **Enemies B:** hopper, airboat, piranha, gnat and lurker (`BayouEnemy.ts`).
- **FX:** `rotor_wash`, `boat_wake`, `mech_pop`, `smoke_trail`, and the machine kill feel.
- **UI/Audio:** five new sounds, and the radio now opens after the title card leaves.

**Out of scope, in progress right now** (don't file against these; they may change under you): GATORGEDDON's legs, MEGA-SKEETER,
the hopper's hop squash and stretch, and the far background actors. Take your baseline from the committed HEAD and note it.

**Check, against `docs/PHASE-H.md` (rules and design direction), `docs/ART-STYLE.md` and `docs/LESSONS.md`:**
1. **Each new enemy in its real map location** (URLs: `?debug=1&scene=Game&fast=1&mute=1&god=1&part=<p>&x=<x>`; press F2 to hide the
   debug overlay for clean shots):
   - **Buzzard:** 1-2 (x about 2104, 3368, 4872), 2-1 (about 4968), 2-2 (about 2440).
   - **Hound:** 1-3 (about 600–1768).
   - **Hopper:** 2-1 (about 2776–5704), 2-2 (about 2376–2488), 2-3 (about 1080–3112).
   - **Airboat:** 2-2 (about 680–4520).
   - **Piranha:** 2-1 (about 1144–2072), 2-3 (about 536–1544).
   - **Gnat:** 2-1 (about 1816–3496), 2-2, 2-3.
   - **Lurker:** 2-1 and 2-3.

   For each one:
   - **Readability:** does it read at 1×, with contrast against that background? Is it in the same family as the grunt and SHELLSHOCK?
   - **Facing:** correct in both directions.
   - **States:** every animation state actually shows in play. Capture sequences with `__KBE.sim.advance(ms)`.
   - **Hurtbox:** matches the visible body (`debug=1` boxes).
   - **Death:** plays fully, isn't clipped, and stays inside the locked view.
   - **FX:** they show (rotor wash on snow, mud and water; boat wake; mech_pop; smoke when damaged).
   - **Layout:** nothing hides behind the HUD or Hazel's strip (screen y 31–54). The Buzzard cruises at screen y 62–110.
2. **Gameplay regression:**
   - the hopper's 500 ms tongue cue, then its 64 px tongue (is the drawn tongue on its hit line?), and shotgun knockback;
   - the airboat's 3-shot volley and its leaper drops;
   - the Buzzard's strafe telegraph and that its crash doesn't hurt the player unexpectedly;
   - the hound's pounce cue;
   - piranha leaps and gnat dives;
   - `npm --prefix game run audit` and `selftest`.
   Compare with Phase G's behaviour (`git show 3704ab1:game/src/entities/enemies/BayouEnemy.ts` and `AssaultEnemy.ts`).
3. **Title card and radio:** spot-check two part starts and one PartClear → next part start. No overlap, and the briefing is readable before the first threat.
4. **Performance:**
   - Measure FPS in the heaviest new scenes: 2-2 with several airboats, gnats and the Buzzard; 1-2 with the Buzzard; a gnat-swarm kill.
   - Other agents are running browsers on this host, so **also measure the 1-1 opening in the same session as a baseline** and
     report both. Phase G measured about 60 FPS on a quiet host.
5. **Audio wiring** (nobody can listen here): confirm the five new keys load and are triggered by their events with no missing-key warnings.

**Report:** append a **Phase H** section at the top of `docs/teams/qa-bugs.md` (same format as Phase G):
- a ranked table, with IDs `KBE-QA-H01…`, severity S1–S4, the owner team, the URL and repro, expected versus actual, and the screenshot paths;
- a short "Confirmed working" list.

Your final reply is the ranked table plus the top 5 visual improvements you'd still make.
