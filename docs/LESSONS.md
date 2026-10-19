# Mission Playbook: Lessons from Mission 1

Mission 1 reached the quality bar the owner wants, but much of it came from fix rounds: Phase E and E2 (build), two owner
playtests, and Phase F (juice). **From Mission 2 on, every part ships at Phase F quality in its first build.** This file is
the definition of done for every team. Read it before you start, and check your work against it before you report.

## 1. Build the juice in, don't add it later
Mission 1 needed a whole extra phase to add these. In a new mission they're part of the first delivery:
- **Bosses:**
  - an idle loop with life (breathing pistons, steam, blinking lamps);
  - an **intro animation** that reacts to `boss:intro`, plus a full sprite intro on spawn;
  - **cosmetic damage states at 66% and 33%** (cracked plates, missing armour, sparks, smoke);
  - large **death debris** through `BossDebris`;
  - a synchronized **`BossFlash`**.
- **Background moments:** about 5–7 per part, chosen together with the map layout (the background director, `bg_event` triggers, arena hooks).
- **Parallax:** 5–8 layers per part, including a foreground speed layer where the part moves.
- **Sound:** one for every new enemy action, boss attack, hazard and background moment, plus an ambient bed per section.
- **Effects:**
  - per-material impacts;
  - effects for every new hazard (splash, ripple, gas, rain);
  - light pools in dark areas.
- **HUD and story:** the title card and briefing, `clearSfx` foreshadowing the next part, prompts for every new verb.

## 2. Bosses: the checklist
- **Silhouette first.** The first Ironhorn read as a tank and had to be redrawn as a locomotive. Before animating:
  - make a same-scale contact sheet of the boss beside Knotz;
  - ask whether a stranger could name the animal or machine at a glance.
- **Fair telegraphs:**
  - at least 600 ms of anticipation on every attack, with motion, light and sound;
  - a blinking ground marker for every arcing shot;
  - targets fixed when the attack starts.
- **Every attack is dodged by a verb the player knows:**
  - **crouch** for sweeps at standing height;
  - **jump** for low sweeps, rolls and tails;
  - **distance or moving** for marked landing spots.
- **Arena safety:**
  - charges and lunges stop with a **48 px safe gap** at the wall;
  - hurtboxes stay at least 8 px inside the locked view;
  - the player can always stand at least 48 px from the edge.
  - Engine's boss framing handles wide arenas. Test your boss in the **real arena**, not only the fixture.
- **Spawn grace of 1100 ms**, so attacks wait out the intro cinematic.
- **One defeat:**
  - `boss:defeated` fires exactly once, after the death chain;
  - death clears enemy bullets, markers and local ordnance;
  - Levels owns `stage:clear`.
- **No FILL tint on art with opaque backing.**
  - The problem: `setTint(...).setTintMode(FILL)` on the HUD fonts, the boss bar frame and boss parts painted solid white slabs.
  - Use `BossFlash` (synchronized, 50 ms hit / 100 ms death) and a soft multiply tint for reduced flash.
- **Floor probes start high enough.** Ironhorn's markers landed 48 px under the player until the arc probe started 96 px above the root.

## 3. Arenas and enemies: never stall
- **The worst Mission 1 bug** stalled the bridge arena in 5 of 5 owner runs: drones froze 1 px past the view, so the wave never ended.
  - Every arena member and its patrol stays inside its locked view; the validator checks this.
  - At runtime, enemies turn at `lockedViewInset`.
  - The off-view pull and cull is only a safety net, not the design.
- **New fliers or swimmers** (anything that isn't a walker) register with the arena as flying for the edge clamp and the pull and cull, like `drone` and `buzzard` do.
- **Entry animations** (leapers, lurkers rising, airboat drops) clamp their landing inside a locked view.
- **Factories accept authored props:** `facing`, `patrol`, `wave`, `from=door`, `sleep`.
- **Fair openings (Mission 2).** The first threat stands at least 224 px from `player_start`. A player who stands idle while the title card and
  Hazel's radio play must survive at least 5 s in Arcade mode. 2-3 shipped a lurker 176 px out that killed an idle player in about 3 s.
- **Gameplay stays below the HUD on multi-level maps (Mission 2).** The camera keeps the player's feet near screen y≈152, so from the lowest
  floor a section uses, an enemy can stand at most ~44 px higher and still clear screen y 62. Higher decks are routes, not firing positions,
  unless the player is up there too.
- **Speed scenery never crosses the combat band** (screen y 29–199). Put it behind the actors, or keep it to the edges.

## 4. Testing: fast, deterministic, time-boxed
- Owner's rule: **no real-time bot playthroughs.** Phase E1 lost 2+ hours to a bot stuck on scenery.
- Use:
  - `npm run check` (typecheck plus the Phaser 4 linter);
  - `npm run audit` (static reach plus an arena audit through the turbo sim, about 4 s per part);
  - `npm run selftest`;
  - targeted `tools/shot.mjs` captures and contact sheets.
- **Time-box each verification attempt** to about 10 minutes. If a check won't converge, stop and report it.
- Warping **between** arenas is fine. Clearing arenas with `warp` or `killEnemies` **hides bugs**. Arena acceptance runs through
  `audit:arenas` (members must stay in view and die from `killVisible` waves, and boss phases must complete).
- **Look at your screenshots in the real map context.** In-context review caught:
  - the grey tunnel lamps;
  - Hazel's radio box covering gameplay;
  - flyers behind the radio strip;
  - the boss cut off at the arena edge.
- **Mid-flight typecheck errors** in other teams' files are expected while everyone works in parallel. Re-run `check` at the end, and
  report only your own errors.

## 5. Readability and layout
- **Gameplay layer first.** Background detail stays lower in contrast than enemies, bullets and Knotz.
- **The top of the screen is reserved.**
  - Hazel's radio strip covers screen y 31–54, and the HUD sits above it.
  - Sky flyers and background actors stay at screen y 62–110.
  - Callouts sit high but below the strip.
- **Far actors are small.** Imagegen's actor stills were 2–3× too big for the far layers, so Levels drew animated Aseprite actors
  instead. Imagegen paints layers and large set pieces; Levels animates the actors.
- **Accessibility:** big flashes respect **reduced flash**, and shake respects the **screen-shake** setting.
- **Hold 60 FPS** on SwiftShader. Pool everything that spawns repeatedly, and don't allocate per frame (Rules F2).

## 6. Contracts and integration
- **Contract first.** The Lead lands shared types (events, campaign data, tuning names) before teams start. Code against the
  contract. If someone else's piece isn't there yet, degrade gracefully: skip missing art, and missing sounds are silent.
- **Agree sound keys up front.** Mission 1 shipped `bridge_whoosh`, `ice_break`, `lab_searchlights` and `lab_tesla` silent because the
  keys came late. The mission doc lists every key; Audio supplies them all; other teams use exactly those names.
  - Every `bg:event` id needs a sound mapping or a deliberate "none".
- **Global animation keys:**
  - Aseprite tags are global, so prefix them with the sprite key;
  - check for duplicates;
  - use the master palette only, with binary alpha.
- **Ownership is strict.** Need something outside your paths? Put it under "Requests for other teams".
  No git commands; the Lead commits.
- **Enemy fixtures** (`enemytest=`) must work without the new maps, so bosses can be built before the arenas exist.

## 7. What made Mission 1 sing (keep doing it)
- Foreshadowing:
  - the Snowcat's smoke behind the yard;
  - the Ironhorn plume growing closer;
  - MOOSEZILLA's silhouette roaring behind the lab;
  - the train whistle after Part I.
- Each part teaches one new verb and then tests it:
  - crouch, taught by the Warden's MG sweep, then the low bridges;
  - ice;
  - cracking ice under MOOSEZILLA.
- Part III opens at the wreck of Part II's vehicle (Ironhorn nose-down in the lake), so the parts feel like one escape.
- Big set-piece motion with a static world: drift parallax, a foreground speed layer, trackside props whipping past.
- The boss intro: letterbox, a slow camera push, the WARNING banner and siren, the gate bursting.
