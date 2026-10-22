# Phase G brief: Engine and core

# Context (read carefully)
You are the **Engine and core** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/engine.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

**The shared contract is already in the code:**
- `src/config/campaign.ts` has Mission 2: parts `2-1`/`2-2`/`2-3`, maps `m2p1..3`, music `music_m2p1..3`.
- `events.ts` has `water:splash` and the ambience kinds `swamp|rain|storm|fog|river`.
- `contracts.ts` has the `mud` material.
- **Mission 2 assets go in a new `game/public/assets/packs/<team>.m2.json`** (same format as your main pack). Boot loads these packs today as a Lead
  stopgap; Engine is replacing that with on-demand per-mission loading, which needs no changes from you.

# Rules
- **Edit only the paths your team owns** (ARCHITECTURE.md). If you need something outside them, list it under **"Requests for other teams"** in your report.
- **No git commands that change state:** no commit, add, checkout, stash, reset or restore. The Lead commits.
- **Other teams' work in progress:**
  - Transient typecheck errors in their files are expected; don't touch their files.
  - At the end, run `npm --prefix game run check` and make sure **your** files are clean.
  - Report foreign errors briefly.
- **Testing (the owner's hard rule): NO real-time bot playthroughs.**
  - Use `npm --prefix game run check`, `npm --prefix game run audit` (or `node game/tools/arena-audit.mjs --part 2-1`), `npm --prefix game run selftest`, your `enemytest=`/sandbox fixtures, `__KBE.sim.advance(ms)` (fixed-step turbo), `__KBE.cheats.*`, and targeted `game/tools/shot.mjs` screenshots and contact sheets.
  - **Open and look at** every image you cite.
  - **Time-box each verification attempt to about 10 minutes.** If a check won't converge, stop and report it.
  - Warping between arenas is fine; clearing arenas with warp/killEnemies hides bugs.
- **Scratch output:** `/tmp/kbe-engine/`.
- **Shell:**
  - `cd` is aliased by fnm and errors. Use `builtin cd`, absolute paths, or `npm --prefix game ...`.
  - **Never** use `pkill -f` or `killall` with patterns (an agent once killed its own shell that way). Kill by PID.
  - Stop every dev server or browser you start before you finish.
- **Browser:** `game/tools/shot.mjs` already sets up Chromium (`LD_LIBRARY_PATH=/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu`, SwiftShader). Reuse or adapt it. Shot tips:
  - wrap `scene.start` evals in `(…, 1)`;
  - use unique shot names;
  - allow about 1.2 s of boot.
- **Pixel art:**
  - Aseprite is at `/home/knotz2/.local/bin/aseprite` (guide: `/home/knotz2/.local/opt/pixel-tools/PIXEL-TOOLS.md`); Tiled at `/home/knotz2/.local/bin/tiled-headless`.
  - Master palette only (`docs/ART-STYLE.md`), binary alpha.
  - **Aseprite tags are global animation keys:** prefix every tag with its sprite key.
  - Build with `bash game/tools/build-art.sh <lua>`.
- **Quality bar:** this has to look and feel like Metal Slug. Silhouettes read at 1×, there's life in every idle, telegraphs are fair, impacts are juicy, and it holds 60 FPS on SwiftShader. Reduced-flash and screen-shake settings are respected.
- **Sound keys:** use exactly the names in MISSION2.md. Missing sounds are silent; UI/Audio is making them all in parallel.
- **When done:**
  - Append a **Phase G** section to `docs/teams/engine.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Engine and core (you own `src/core/**`, Boot/Preload/GameScene, `src/config/campaign.ts`, `tools/arena-audit.mjs`, `tools/reach-check.mjs`, `tools/engine-selftest.mjs`, `packs/engine*.json`)
Do these in this order. **1 and 4 unblock the other teams**, so land them first and keep them working while everyone builds.

1. **Lazy per-mission asset packs.** Replace the Lead's stopgap in `src/scenes/BootScene.ts` (`MISSION_PACKS_AT_BOOT`, which loads every `packs/<team>.m2.json` at boot) with on-demand loading.
   - When a part of mission N ≥ 2 starts, load `packs/<name>.m<N>.json` for names `engine, player, enemies, gatorgeddon, level, fx, ui`.
   - Do it before the level builds (in Game's `preload()` or a small loading step), with a clean small progress bar.
   - Cache the packs, so you don't reload them on later parts or retries.
   - A missing mission pack is not an error. Failed files follow Preload's retry and error policy.
   - Create Aseprite animations for newly loaded sheets (`core/anims.ts`).
   - Audio keys must be usable as soon as Game creates. Check how `src/audio/` (UI-owned) finds sounds, and request changes if needed.
   - Must work for: `?part=2-1` direct starts, Title → PART SELECT → 2-x, the mission chain (below), `cheats.part('2-2')`, and continue or retry.
   - `__KBE.ready` semantics stay correct.
   - Mission 1 stays in the main packs (boot).
   - Test with a tiny real `packs/engine.m2.json` entry if the other teams' packs aren't there yet.
2. **Mission chaining and unlock.**
   - When the final part of mission N clears and mission N+1 exists, `MissionResultsData` carries `next: PartDef` (the first part of the next mission) and `carry` (CarryState with the parts reset for the new mission's totals; score, lives, bombs and weapon carry).
   - Clearing 1-3 unlocks 2-1 (`progress.ts`).
   - UI/Audio is changing Results to show **CONTINUE TO MISSION 2**, which calls `scene.start('Game', { part: next.id, carry })`. Document the exact data shape in your notes so they can match it, and keep it backward compatible.
   - The last mission's Results still goes to Title.
   - Add selftest coverage.
3. **Materials:**
   - `materialAt` maps the tile `material=shallow` → `'water'` and `mud` → `'mud'` (for impacts and footsteps).
   - `surfaceAt` keeps returning the raw string (`'shallow'`, `'mud'`, `'ice'`).
4. **Audits for parts 2-1, 2-2 and 2-3.**
   - Extend `tools/reach-check.mjs` and `tools/arena-audit.mjs`:
     - add the parts to `PARTS` and `all`;
     - detect the final part from campaign `final`, not `'1-3'`;
     - a part whose map file doesn't exist yet → **SKIP (map missing)**, not FAIL, so every team can run `npm run audit` from day one.
   - **reach-check** needs the new rules:
     - jump height on `material=mud` (×0.85) and `material=shallow` (×0.9). Player defines `PLAYER.surface.{shallow,mud}.{speed,jump}` in `src/config/tuning/player.ts`; read them or mirror them with a comment;
     - `sink=true` sinking-log tiles count as floor (they resurface), but flag any route that needs standing on one tile for more than ~800 ms;
     - `hazard=water` deep water is a gap;
     - one-way decks;
     - drift maps.
   - **arena-audit** needs the new bosses:
     - a **flying boss** (MEGA-SKEETER, `boss kind=skeeter`);
     - a **submerging boss** (GATORGEDDON has no live hurtboxes while submerged: wait for it to surface rather than fail; `damageBoss` should just no-op then);
     - flying and swimming regular enemies (`gnat`, `airboat`, `piranha`).
   - Keep the whole audit fast (about 4 s per part).
5. **`__KBE.cheats.bg(id)`**: a slot calling the Levels director (today it's `window.__KBE_LEVEL.bg(id)`). Update the cheat list in hooks and ARCHITECTURE.
6. **Boss framing check**, using a sandbox or fixture:
   - a ~240 px-long ground boss in a 512 px arena, plus the submerged-depth case;
   - a **flying boss** moving vertically over a deck at y 304 (MEGA-SKEETER) stays framed.
   - If the camera needs a vertical framing tweak for fliers, make it.
   - Enemies keep their bosses inside the locked view themselves, so this is the camera side only.
7. Keep `npm run check`, `npm run audit` (1-1/1-2/1-3 still PASS) and `npm run selftest` green.
   - Update `docs/teams/engine.md` (API, the mission-pack loader, chaining data shape, audit rules).
   - Update the `ARCHITECTURE.md` debug hooks list, since you own the hooks.

**Model note:** you are Opus 5.5 at medium effort. Be decisive and keep diffs focused. Budget: about 2 hours of work. Report early if blocked.
