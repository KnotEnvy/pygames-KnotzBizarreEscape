# Phase G brief: Levels and content

# Context (read carefully)
You are the **Levels and content** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/level.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

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
- **Scratch output:** `/tmp/kbe-level/`.
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
  - Append a **Phase G** section to `docs/teams/level.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Levels and content (you own `src/level/**`, `src/config/tuning/level.ts`, maps, tiles, props, `public/assets/backgrounds/**` except Imagegen's `gen_*`, `art-src/{tiles,props,maps}/**`, `art-src/backgrounds/actors/**`, `public/assets/sprites/props/**`, `public/assets/sprites/bg/**`, `packs/level*.json`)
Build the three Mission 2 maps at **Phase F quality on the first pass**. Follow MISSION2.md (sections, beats, moments) and LESSONS.md, especially §3 (arenas never stall), §5 (readability, the reserved screen top, small far actors) and §7 (what made Mission 1 sing).

1. **Art:**
   - **Tilesets:** `m2_bayou` (boardwalk planks, rotten dock, cypress knees and roots, mud, shallow-water riverbed under a **translucent water surface** in the `front` layer that covers the legs, deep-water surface, moss, stilt-shack walls, roofs and decks, pump-station concrete and metal), `m2_boat` (barge decks and hulls, containers, fuel drums, crane, riverboat decks, railings, smokestacks, the paddlewheel housing) and `m2_mill` (mill pilings, plank floors, waterwheel housing, chains, cages).
   - **Props:** stilt-shack doors (spawning like `bunker_door`), lanterns, nets, signs (WADING SLOWS YOU, LOGS SINK, DANGER: GATOR, LOW BRANCHES!), Hazel's skiff, the beached BAYOU QUEEN wreck, a gas-vent nozzle, cages, bones, and the den gate if you use one.
   - Use helpers, as in Mission 1, when it speeds things up: you can spawn your own sub-agents for art against your written contract.
2. **Maps `m2p1`, `m2p2`, `m2p3`** (generators `art-src/maps/build_m2p*.mjs`, exported to `public/assets/maps/m2p*.tmj`, listed in `packs/level.m2.json` with the tilesets and backgrounds).
   - Ground line at y 336, maps 24 tiles tall.
   - Checkpoints every ~1000 px, a `cp_boss` before each boss.
   - A `music` trigger at x 0–1, and `music_boss_m2` before the mid-bosses (`music_boss_gator` for GATORGEDDON).
   - Prompts for every new verb, `clearSfx` (`boat_horn` after 2-1).
   - About 4 POWs per part, including the **POW shotgun** in 2-1's drowned forest.
   - Wave arenas: `stilts`, `pump` (2-1), `crane` (2-2), `mill` (2-3, its gate blows open on clear).
   - Boss arenas `shellshock` (2-1, ~480 px, gateless; the boss surfaces from the pond), `skeeter` (2-2 foredeck, 384–480 px, gateless, deck at y 304) and `gator` (2-3, 512 px).
   - Boss kinds `shellshock|skeeter|gatorgeddon`. Add the names to `LEVEL.boss.names`: `'SHELLSHOCK'`, `'MEGA-SKEETER'`, `'GATORGEDDON'`.
3. **New mechanics** (`src/level/**`; generalise the ice and train systems where that's cleaner):
   - **Sinking logs:** tile `sink=true`.
     - Bob frames when stood on; it sinks after ~800 ms standing (the tile becomes `hazard=water`, no collision).
     - It resurfaces after ~2.5 s, never into a body.
     - Emit `water:splash` and play `log_bob`/`log_sink`.
   - **Swamp-gas vents:** trigger `hazard_vent` (`period`, `on`, `offset`).
     - At least 700 ms of bubbling telegraph (`gas_bubble`, FX), then a flame column (`gas_vent`, `fx:emit gas_flame`).
     - It damages the player through `ctx.damage` (respect god mode and i-frames) and also hurts enemies.
   - **Low branches** on the river: `hazard_sweep kind=branch` (a mossy cypress limb instead of the girder, warned by `boat_horn`, `branch_whoosh`).
   - **Fog bank:** a tunnel-style moving zone `kind=fog` (FX draws it).
   - **Wading water:** `material=shallow` riverbed tiles plus the translucent front-layer surface. Mud is `material=mud`.
   - **The 2-2 drift map:** barges, riverboat decks (main y 304, promenade one-way y 256, hurricane roof one-way y 208), water gaps (`hazard=water`), and the animated stern paddlewheel set piece with spray.
     - Airboats ride a water lane beside the barges: tell Enemies B the lane y in your report (default about y 344).
     - Piranhas sit at deep-water surfaces.
   - **The 2-3 den:**
     - a pier and mud-bank floor at y 336 across the 512 px arena, with planks `crack=stomp` (not within 40 px of the walls);
     - **depth contract with Enemies A:** an animated channel water-surface strip at `DEPTH.TILES_BACK + 1` (21) across the arena, water line at **y 328**, covering about y 326–336 (the submerged gator renders at 20.5 behind it). The far bank and den set behind it.
   - **The arena flier and off-view logic** (`arenas.ts`) must treat the new kinds correctly:
     - `gnat` flies like `drone`;
     - `airboat` follows the `buzzard` rules (no vertical pull);
     - `piranha` is a water-surface kind, never pulled onto land;
     - `lurker`, `hopper` and `leaper` are walkers.
   - The validator knows all the new vocabulary. Arena members and patrols stay inside their locked views, and static traversal holds with mud jump (×0.85), shallow (×0.9) and `sink` tiles.
4. **Background director moments for Mission 2** (the table in MISSION2.md, about 6 per part) with small animated Aseprite actors (`art-src/backgrounds/actors/*.lua` → `sprites/bg/`).
   - Examples: patrol boat with searchlight, herons, wisps, the **lightning-lit GATORGEDDON silhouette** (2-1 foreshadowing), pond wake and shell, riverbank props, gator pod, burning barge, skeeter swarm, airboat race, mill wheel, den glow, the gator wake after `clear:mill`.
   - Sky flyers stay at screen y 62–110 (Hazel's radio strip covers y 31–54).
   - Lower contrast than gameplay.
   - Reduced flash dims lightning.
   - Hook moments to arena events, exactly as Mission 1 does.
5. **Parallax:** 5–8 layers per part (per-map `LEVEL.parallax.sets`, skies, a foreground speed layer in 2-2, `span`/`once`/`showIn` where useful).
   - **Imagegen is painting** painterly transparent layers in parallel into `public/assets/backgrounds/m2p1|m2p2|m2p3/gen_*` (see `docs/teams/imagegen.md` when they report).
   - Build your own placeholder or near layers first, so you're never blocked, and integrate their `gen_*` files as they appear.
6. **Events:** arena events and `boss:intro` work as in Mission 1 (gateless boss arenas lock as the camera arrives, then intro, then spawn).
   - `stage:clear` carries `{part, final}`.
   - Ambience triggers use the new kinds (`swamp`, `rain`, `storm`, `fog`, `river`); FX and Audio react.
   - **Every `bg:event` id you add must have a sound:** list your final ids in your report for UI/Audio (they map them in `UI.audio.bgEvents`).
7. **Verification:**
   - Your validator.
   - `npm --prefix game run audit` (Engine is adding 2-1/2-2/2-3 to the audit tools in parallel; until then use your validator plus targeted sim checks).
   - Screenshots of every section and moment in the real maps (`?part=2-1&debug=1&fast=1&x=...`, `__KBE.sim.advance`, `__KBE_LEVEL.bg('<id>')`).
   - Map previews in `/tmp/kbe-level/`.
   - Mission 1 must stay green.

**Model note:** Opus 5.5 at high effort. This is the biggest job. Keep the three maps moving in parallel with helpers rather than finishing one at a time. Report anything blocking early.
