# Phase G brief: Effects and game feel

# Context (read carefully)
You are the **Effects and game feel** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/fx.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

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
- **Scratch output:** `/tmp/kbe-fx/`.
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
  - Append a **Phase G** section to `docs/teams/fx.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Effects and game feel (you own `src/fx/**`, `src/config/tuning/fx.ts`, `public/assets/sprites/fx/**`, `art-src/fx/**`, `packs/fx*.json`)
The Lead already added placeholder rates for the new ambience kinds (`FX.ambientRate.swamp|rain|storm|fog|river = 0`) and widened your `Ambience` type. Make them real.
1. **Water** (`water:splash {x, y, size:'s'|'m'|'l'|'xl', kind}`, the new event; anyone emits it):
   - splashes by size;
   - expanding rings on the surface;
   - droplets;
   - bubbles for `sink`/`surface`;
   - a big cascade for `xl` surfacing (GATORGEDDON, SHELLSHOCK);
   - wakes (an `fx:emit {effect:'wake'}` for moving things in water);
   - drips;
   - river spray and paddlewheel spray for the 2-2 drift map (`fx:emit 'paddle_spray'`, `'bow_spray'`).
   - Projectiles hitting water (`projectile:impact material 'water'`) make small splashes. Add a `mud` impact material (dark splats).
2. **Weather and ambience:**
   - `swamp`: gnats, drifting spores, low ground mist, fireflies.
   - `rain`: slanted rain with splash ticks on the ground and decks.
   - `storm`: rain plus **lightning flashes** that briefly backlight the scene. Respect **reduced flash**: dimmed and fewer.
   - `fog`: a tunnel-style moving zone `kind=fog` (`fx:zone`) that darkens with drifting fog banks and soft lantern light pools.
   - `river`: water rush, foam streaks and mist with drift.
   - Hold 60 FPS on SwiftShader: pool everything, stay within your existing particle budgets.
3. **Swamp gas:** `fx:emit 'gas_bubble'` (the telegraph) and `'gas_flame'` (the column, with a light pool). Also GATORGEDDON's gas cloud and flame jet (`'gas_cloud'`, `'flame_jet'`, if Enemies A emits them; agree on names through your report).
4. **Shotgun:** a `player:shoot {weapon:'shotgun'}` recipe: a big muzzle blast, a smoke puff, a pellet spark fan, a red shell casing, and a bit more screen kick than the HMG (shake-setting aware).
5. **Mud:** `fx:emit 'mud_splat'` for footsteps and landings (Player emits it).
6. **Background effects** for the Mission 2 background moments (Levels directs; `fx:emit {bg: true, scrollFactor}`):
   - `bg_lightning`, adapted to storm strikes on the horizon;
   - `bg_wisp` (green swamp-gas flames);
   - `bg_fireflies_swarm`;
   - `bg_splash` (far splashes);
   - `bg_fire` (the burning barge);
   - `bg_smoke_plume`, reused;
   - `bg_rain_curtain`, if useful.
   Coordinate the ids in your report; Levels gets the same list.
7. **Light pools** from muzzles and explosions in dark night areas (2-2 night, 2-3 storm, fog banks), as in tunnels and on 1-3.
   - Today `director.ts` checks `part.id === '1-3'`. Generalise it (e.g. a per-part `FX.darkParts` list or an ambience-driven rule) so 2-2 and 2-3 get it.
8. **Verification:** your gallery and `fxtest` modes for every new recipe, real-map captures once Levels' `m2p*` maps land, contact sheets you inspect, and `npm --prefix game run check` clean in your files.

**Model note:** Astra 6 at medium effort. Prioritise water, rain and storm, fog, gas and the shotgun first. Background effects after.
