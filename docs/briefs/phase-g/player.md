# Phase G brief: Player and weapons

# Context (read carefully)
You are the **Player and weapons** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/player.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

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
- **Scratch output:** `/tmp/kbe-player/`.
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
  - Append a **Phase G** section to `docs/teams/player.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Player and weapons (you own `src/entities/player/**`, `weapons/**`, `pickups/**`, `pow/**`, `src/config/tuning/player.ts`, `public/assets/sprites/player/**`, `art-src/player/**`, `packs/player*.json`)
1. **Surfaces.** Add `PLAYER.surface = { shallow: { speed: 0.72, jump: 0.9 }, mud: { speed: 0.6, jump: 0.85 } }` (Engine's reach audit reads these names).
   - Read the surface with `ctx.physics.surfaceAt(x, bottom + 1)`.
   - **Wading (`shallow`):**
     - slower run and lower jump; crouch still works;
     - emit `water:splash {size:'s', kind:'step'}` at the feet about every 180 ms while moving;
     - landing in shallow water emits `{size:'m', kind:'enter'}`;
     - Audio plays every splash and wade-step sound from `water:splash`, so don't play them yourself;
     - Levels draws a translucent water surface over the legs.
   - **Mud (`mud`):**
     - slower and heavier;
     - `fx:emit {effect:'mud_splat'}` on steps and landing, and play `mud_step` yourself;
     - landing in mud is a heavier squelch.
   - Make transitions between surfaces smooth (no velocity snaps). Existing ice behaviour stays the same.
2. **Sinking death** in deep water (`hazard=water`): Knotz sinks, flailing, with bubbles, then the normal death flow.
   - Emit `water:splash {size:'l', kind:'sink'}`.
   - Find how the engine's hazard check kills the player (cause or kind). If the cause isn't available to you, request it from Engine and fall back to detecting water under the feet at death.
   - Keep the existing death for everything else.
3. **New weapon: SHOTGUN** (`shotgun`, pickup letter **S**, ammo 30). Classic Metal Slug "S".
   - **Hit area:** a short cone (about 72 px) that deals heavy damage to everything inside it (max 3 targets; damage highest up close), plus 4–5 short-lived pellet tracers about 96 px long.
     Use `ctx.damage` (queryRect plus angle and distance tests, `kind:'bullet', weapon:'shotgun'`).
   - **Knockback** on regular enemies, if their `hit(info)` honours `dirX`. Otherwise ask Enemies B in your report.
   - About 550 ms between shots, with a **pump animation** and a red shell casing ejecting on the pump (FX `casing`).
   - A **big muzzle blast**: `player:shoot {weapon:'shotgun'}`. FX is adding a shotgun recipe; Audio plays `shotgun_fire`/`shotgun_pump` from your events, so check the existing pattern in `src/audio/events.ts` and request what you need.
   - **A distinct silhouette in every pose:** all 8 aim directions including aim-lock, crouch down-diagonals, jump, run and the knife transitions.
   - Strong but not a boss-melter: compare its DPS with the HMG and rocket, and note the numbers in your docs.
   - **Pickup sprite and POW item** `shotgun`.
   - UI/Audio makes the HUD weapon icon and the "SHOTGUN!" callout from `weapon:changed`.
   - Core art can extend your existing sheets. Mission 2-only assets go in `packs/player.m2.json`.
4. **Part entrances** (by `ctx.part.id`; extend the existing entrance system):
   - 2-1: hop off Hazel's skiff onto the dock.
   - 2-2: jump from the skiff onto the first barge.
   - 2-3: crawl out of the riverboat wreck into the shallows.
   - Each is about 1 s, readable and invulnerable as now. Levels places `player_start` at each spot; make the entrance work wherever it lands.
5. **Verification:** dev sandbox and fixtures plus shot.mjs. Inspect:
   - wading and mud (a short run strip; Levels' maps may not exist yet, so build a sandbox test with temporary tiles or ask Engine's sandbox hooks);
   - a contact sheet of shotgun poses at 3× (all directions, crouch, air);
   - shotgun blast frames on a target group;
   - a sinking-death sequence;
   - the 3 entrances.
   Then run `npm --prefix game run check` and `npm --prefix game run audit` (Mission 1 must still pass).

**Note:** the hero art pass from Phase F is the bar for the new poses: same detail level, same palette.
