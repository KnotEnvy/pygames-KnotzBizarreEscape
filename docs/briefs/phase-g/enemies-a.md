# Phase G brief: Enemies A (GATORGEDDON)

# Context (read carefully)
You are the **Enemies A (GATORGEDDON)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/enemies-gatorgeddon.md (new file; read docs/teams/enemies.md for Mission 1 context)`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

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
- **Scratch output:** `/tmp/kbe-enemies-a/`.
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
  - Append a **Phase G** section to `docs/teams/enemies-gatorgeddon.md (new file; read docs/teams/enemies.md for Mission 1 context)`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Enemies A, **GATORGEDDON** (Mission 2's main boss; this game's MOOSEZILLA-tier fight)
**Ownership:** the Enemies team is split for Phase G, and Enemies B is working in parallel. You own **only** these paths:
- `src/entities/bosses/Gatorgeddon*.ts`: the stub `Gatorgeddon.ts` exists and is already called from `registerEnemies` as `registerGatorgeddon(ctx, track)`. Call `track(boss)` on spawn so the shared `boss`/`bossPhase` debug hooks report it.
- `src/config/tuning/gatorgeddon.ts`.
- `art-src/enemies/gatorgeddon*` and `public/assets/sprites/enemies/gatorgeddon*`.
- `public/assets/packs/gatorgeddon.m2.json`.
- `docs/teams/enemies-gatorgeddon.md`: your notes, instead of enemies.md.

Don't edit `src/entities/enemies/**`, `MachineBoss.ts`, `Moosezilla.ts`, `BossDebris.ts`, `BossFlash.ts` or `tuning/enemies.ts`; those are B's. **Use** `BossDebris` and `BossFlash` as they are. Read `Moosezilla.ts`, `MachineBoss.ts` and `docs/teams/enemies.md` closely: they show the boss contract, the arena props (`arenaX0/arenaX1`), the events, flashes, debris, intro handling and the debug snapshot shape the audit relies on.

**Design:** MISSION2.md § GATORGEDDON. Follow LESSONS.md §2 point by point.
- **Silhouette first:** before animating, make a same-scale contact sheet of the gator next to Knotz and next to MOOSEZILLA, and check it reads as an alligator at 1×.
- **HP:** about 450, plus a 50 HP missile pod. **Score:** 6000.
- **Phase thresholds:** 66% and 33%, with cosmetic damage tiers to match.
- **Size:** about 224–240 × 88–96.
- **Attacks:** the three phases' attacks as written.
  - At least 600 ms of telegraph each, ≥ 700 ms on lunges.
  - Ground markers for missiles.
  - Committed targets.
  - A 48 px wall gap.
  - Every attack is dodged by crouch, jump or moving.
  - Spawn grace of 1100 ms for the intro cinematic.
  - Exactly one `boss:defeated`, after the death chain.
  - Death clears bullets and markers.
- **Phase 3 tail slam:** emit `boss:stomp {x, y, power: 2}` aimed near the player, so Levels' `crack=stomp` pier planks break into holes that repair in ~5 s.
- **Real arena (Levels builds it in `m2p3`):**
  - arena `gator`, about x 3800–4312 (512 px; always read `arenaX0`/`arenaX1` from props, never hard-code);
  - pier and bank floor at y 336 across the arena; the deep channel lies **behind** the pier.
- **Depth contract with Levels:**
  - Submerged, the gator renders at `DEPTH.TILES_BACK + 0.5` (20.5): behind the ground tile layer (22) and in front of the back layer (20).
  - Levels draws an animated channel water-surface strip at `DEPTH.TILES_BACK + 1` (21), water line at **y 328**, covering about y 326–336 across the arena. So only the ridges and eye lamps break the surface.
  - Climbing onto the pier switches to `DEPTH.ENEMIES`.
  - **Hurtboxes are off** while fully under, and the wake and bubble trail must be clearly visible. Emit `water:splash` (`surface`/`sink`, size `xl`) on surfacing and diving, and `fx:emit` as you see fit.
- **Fixture `enemytest=gatorgeddon`** (cheat builds; follow B's existing pattern in `enemies/index.ts`, implemented inside your own module):
  - spawns the boss about 210 px right of the player on the current map;
  - gives it a fake 512 px arena;
  - draws a temporary water strip at depth 21 (fixture only), so you can build before the map exists.
  - Expose a fixture API (`bossHp(n)`, `hitAt(...)`) like `__KBE_ENEMYTEST` does, under `window.__KBE_GATORTEST`.
- **Sounds** (exact keys from MISSION2.md): `gator_roar`, `gator_snap`, `gator_hiss`, `gator_tail`, `gator_submerge`, `gator_surface`, `gator_roll`, `gator_missile`, `gator_gatling`, `gator_gas`, `gator_flame`, `gator_death`.
- **Name:** `boss:spawn/hp/phase/defeated` use the name `'GATORGEDDON'` (Levels' `boss:intro` name matches).
- **Verification:**
  - contact sheets at 3× (idle, intro, 66%, 33%, every attack cue and release, submerged and wake, death and debris);
  - fixture captures through fixed-step sim;
  - `__KBE.cheats.damageBoss(n)` or your fixture to cross phases;
  - a **real-fire completion**: a short scripted run in the fixture with god mode, HMG and fixed-step sim, no HP cheats, that kills it through all phases with exactly one defeat. Time-box it to 10 minutes.
  - When Levels' `m2p3` lands (check `game/public/assets/maps/m2p3.tmj`), also verify in the real arena: `?part=2-3&debug=1&god=1&fast=1` then `__KBE.cheats.boss()`, and `node game/tools/arena-audit.mjs --part 2-3` once Engine adds the part.
- **Pack:** list your sheets in `packs/gatorgeddon.m2.json` (Boot loads it now; Engine's lazy loader will too).

**Quality bar:** this is the mission's headline fight, the way MOOSEZILLA was for Mission 1. The owner wants it epic: heavy, menacing, juicy, fair.
