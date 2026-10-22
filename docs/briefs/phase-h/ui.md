# Phase H brief: UI, HUD and audio

# Context (read carefully)
You are the **UI, HUD and audio** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
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
- **Scratch output:** `/tmp/kbe-ui/`.
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

# Your Phase H job: UI/Audio, new enemy sounds and the title card / radio overlap
**Ownership:** your usual UI, HUD and audio paths (`src/scenes/ui/**`, `src/ui/**`, `src/audio/**`, `config/tuning/ui.ts`, `tools/audio/**`, audio assets, `docs/teams/ui-audio.md`).

**Build:**
1. **Five new sounds,** keys exactly as in `docs/PHASE-H.md` (Enemies plays them with `ctx.audio.sfx`):
   - `buzzard_gun`
   - `heli_crash`
   - `hopper_land`
   - `mech_pop`
   - `airboat_sink`

   Make them in your synth pipeline (`game/tools/audio/`, chunked OGG writer, peaks ≤ 0.8 before encoding) and register them
   in `src/audio/catalog.ts` with sensible `vol`, `vary`, `max` and `minMs`. Mission 2-only sounds go in the Mission 2 audio pack, as in Phase G.

   Match the family:
   - `buzzard_gun` sits beside the `buzzard_rotor` loop;
   - `hopper_land` beside `hopper_hop` and `hopper_croak`;
   - `mech_pop` is comic and punchy, short enough for a 6-gnat swarm (cap it).

   Run your analyzer for levels against the Mission 1 and 2 sounds.
2. **Title card / radio overlap.** Hazel's radio box (screen y 31–54) opens while the part title is still up, and it covers the big title text.
   - Today `UI.radio.delayMs` is 2650 while the title holds until `titleAt + holdMs` (2840 ms) plus its out-tween and the card's
     own 350 ms delay. See `/tmp/kbe-lead/polish/ctx_hopper.png` (title showing) and `ctx_hopper_1.png` (the radio covering it), taken 1.5 s apart.
   - Fix it so the box never overlaps the title. For example, open the radio only after the title's out-tween completes (event-driven, not a guessed delay), or move the title card.
   - Check it with frame-by-frame shots at 0.25 s steps from part start for **all six parts** (`?debug=1&scene=Game&fast=1&mute=1&part=1-1` … `2-3`), and for a mid-run part start (the PartClear → next part flow).
   - The briefing must still be readable before the first enemy shows up: the openings keep their first threat at least 224 px away.
3. **Optional, if time allows:** a quick look for any other place the radio strip or a callout covers gameplay or the boss bar in Missions 1–2. Report it, or fix it if it's yours.
