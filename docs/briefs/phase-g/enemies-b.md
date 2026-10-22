# Phase G brief: Enemies B (mid-bosses and roster)

# Context (read carefully)
You are the **Enemies B (mid-bosses and roster)** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/enemies.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

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
- **Scratch output:** `/tmp/kbe-enemies-b/`.
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
  - Append a **Phase G** section to `docs/teams/enemies.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Enemies B, the Mission 2 mid-bosses and roster
**Ownership:** the Enemies team is split for Phase G. You own everything in Enemies' paths **except** Enemies A's GATORGEDDON files:
- A owns `src/entities/bosses/Gatorgeddon*.ts`, `tuning/gatorgeddon.ts`, `art-src/enemies/gatorgeddon*`, `sprites/enemies/gatorgeddon*`, `packs/gatorgeddon.m2.json` and `docs/teams/enemies-gatorgeddon.md`.
- `registerGatorgeddon(ctx, track)` is already wired into `registerEnemies`; leave that call in place.
- You own the shared boss helpers (`BossDebris.ts`, `BossFlash.ts`). If A asks for a change through the Lead, you'll get it.
- Your notes go in `docs/teams/enemies.md`, and Mission 2 assets in `packs/enemies.m2.json`.

**Build these** (MISSION2.md § The mechs; LESSONS.md §2 and §3 point by point; reuse `MachineBoss` patterns or new files as you judge best):
1. **SHELLSHOCK** (`boss:shellshock`, mech snapping turtle, about 170 HP, 3000 pts, 2-1 mid-boss).
   - **Arena:** about 480 px on a muddy pond bank with a shallow pool in the middle (`material=shallow`), gateless.
   - **Intro:** it surfaces from the pond: the shell breaks the water first.
   - **SNAP:** high (crouch) or low (jump), with the head angle as the telegraph.
   - **EGG MINES:** marked arcs; eggs blink and pop, and can be shot.
   - **SHELL SPIN:** jumpable height, invulnerable with clear clank sparks, a 48 px wall gap.
   - **Weak points:** the head takes 2× while extended; the core 2× after the plates drop at 33%.
   - **Death:** comic. It flips, explodes, and the head pops off on a spring.
2. **MEGA-SKEETER** (`boss:skeeter`, mech mosquito gunship, about 200 HP, 3500 pts, 2-2 mid-boss).
   - It's a **flying boss** on the riverboat foredeck. The deck floor is y 304 (the arena is on the boat in the `drift` map).
   - **Attacks:**
     - DRILL DIVE: a 700 ms red laser line, then the dive; it's stuck for about 700 ms, low and open.
     - LARVA DROP: no more than 4 gnats alive.
     - STINGER FAN: a 600 ms cue, then slow bullets with readable gaps.
   - **Damage:** the tank takes 1.5×, then 2× once it cracks at 33%. A torn wing makes its flight erratic.
   - **Death:** it spins into the river beside the boat with a huge splash.
   - Keep its whole silhouette inside the locked view, clamped vertically too (the view is 216 tall). Flier rules apply.
3. **Regular enemies:** `lurker`, `piranha`, `hopper`, `gnat`, `airboat`, with the behaviour, HP and scores in the MISSION2.md table.
   - Locked-view rules: entry anims clamp inside the view.
   - `gnat`, `airboat` and `piranha` must be handled by the arena's flier and off-view logic (`src/level/arenas.ts` is Levels'). Tell Levels the kinds in your report; they also get this list.
   - **Piranhas** never leap from off-screen, and they live in `hazard=water` stretches (Levels places them at the water surface).
   - **Airboats** ride the water lane beside the barges (the lane y comes from props; Levels will tell you, default about y 344). They drop leapers via `ctx.spawn('enemy','leaper',...)`, and they explode and sink.
   - **Hoppers** stay on their floor.
   - **Lurkers** rise from shallow water or mud: a 700 ms entry, then grunt AI.
   - Factories accept the authored props `facing`, `patrol`, `wave`, `from=door`, `sleep`.
   - Positional loops `gnat_buzz` and `airboat_motor` stop on death, exit and shutdown.
4. **Shotgun:** Player's new shotgun may want **knockback** on regular enemies (`HitInfo.dirX`, `weapon:'shotgun'`). Add a short knockback impulse for `weapon === 'shotgun'` on walkers if it's cheap and safe; it must never push one out of a locked view.
5. **Fixtures:** `enemytest=shellshock|skeeter|lurker|piranha|hopper|gnat|airboat`, extending the existing fixture block. The skeeter fixture fakes a deck at the player's floor.
6. **Sounds** (exact keys from MISSION2.md):
   - Enemies: `lurker_rise`, `piranha_leap`, `piranha_bite`, `hopper_croak`, `hopper_hop`, `hopper_tongue`, `gnat_buzz`, `airboat_motor`, `airboat_gun`.
   - SHELLSHOCK: `turtle_hiss`, `turtle_snap`, `shell_clank`, `shell_spin`, `egg_lob`, `egg_beep`.
   - MEGA-SKEETER: `skeeter_whine`, `skeeter_laser`, `skeeter_dive`, `skeeter_drill`, `larva_pop`, `stinger_fire`.
   - Use `water:splash` for anything entering or leaving water.
7. **`boss:intro` names** (Levels emits these): `'SHELLSHOCK'`, `'MEGA-SKEETER'`. Add their approach puffs or sounds in the existing `boss:intro` listener (pond bubbles for the turtle, a rising whine for the skeeter).
8. **Verification:**
   - Silhouette contact sheets next to Knotz first, then 3× sheets of every state.
   - Fixture captures with fixed-step sim.
   - Real-fire boss completions in fixtures (god mode, HMG, no HP cheats, exactly one defeat). Time-box each to 10 minutes.
   - A locked-view test for the new kinds, seeded at the screen edges.
   - When Levels' maps land (`game/public/assets/maps/m2p1.tmj`, `m2p2.tmj`), verify in the real arenas with `node game/tools/arena-audit.mjs --part 2-1` (or `2-2`) once Engine adds the parts.
   - Mission 1 must stay green (`npm --prefix game run audit`).

**Quality bar:** Phase F boss quality from day one: an idle with life, intros, 66% and 33% damage states, `BossDebris`, synchronized `BossFlash` (no FILL tints on opaque art).
