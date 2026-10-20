# Enemies A — GATORGEDDON

## Phase G — 2026-10-19

Implemented Mission 2's main boss inside the Enemies A ownership boundary. No git commands changed state; no other team's source, tuning, art or packs were edited. All browser verification used fixed-step simulation, with bounded attempts and server/browser cleanup.

### Delivery

- `game/src/entities/bosses/Gatorgeddon.ts`: seven-part rig, factory, `boss:intro` approach bubbles, full eye/snout/roar/climb introduction, three phases, local pooled rockets, independent missile pod, weak points, synchronized `BossFlash`, `BossDebris`, detached jaw, belly-up sinking death and exactly one named defeat. Exports the existing `TrackedBoss` contract and calls `track` on spawn.
- `game/src/config/tuning/gatorgeddon.ts`: HP, thresholds, cues, recovery, movement and death clocks.
- `game/art-src/enemies/gatorgeddon.lua`, `gatorgeddon-preview.lua`, nine `gatorgeddon_*.aseprite` sources; nine corresponding PNG sheets and atlas JSONs in `game/public/assets/sprites/enemies/`.
- `game/public/assets/packs/gatorgeddon.m2.json`: nine Aseprite entries. Engine's mission loader loads them for Mission 2 and the enemy fixture.

Original native pixel art: approximately 236×92 assembled, with steel teeth, yellow lamps, brow plates, exhaust scutes, rusty green armour, moss, spiral-eye flank plate, hydraulic legs, jointed blade tail, a red four-port missile pod and exposed reactor ribs. **112 frames / 26 unique prefixed animation tags / 9 textures**. Audit checked **176,266 opaque source pixels**, all in `K.PAL`, with binary alpha. No palette exceptions. Same-scale silhouette inspection preceded animation; the preview source reproduces the comparison with MOOSEZILLA and Knotz.

### Fight and tuning

- **450 hull HP + 50 independent pod HP; 6000 boss score.** Head/eyes take 1.5×; the phase-three reactor takes 2×. Piercing bullets remember the entire rig; radial/melee queries hit the shared hull once.
- Phase thresholds **300 / 150 HP** (66% / 33%). Persistent cracked/torn hull art, exposed glowing ribs, sparks, smoke and threshold debris.
- **1500 ms intro**, including at least **1100 ms spawn grace**, followed by **850 ms recovery**. Intro and threshold roars open the jaw; no damaging intro contact.
- Phase 1: **800 ms jaw-lunge cue**, up to 160 px travel with arena/view clamps; **750 ms rocket cue**, four fixed ground marks, staggered launches and 950 ms arcs; conditional behind-the-boss **700 ms tail cue**, then a low blade sweep.
- Phase 2: **600 ms dive**, **900 ms tracking wake**, then **700 ms committed burst marker** and 800 ms burst; three ambushes before climbing back. Gatling cue **750 ms**, followed by nine standing-height rounds: crouch.
- Phase 3: **750 ms roll cue** and a jumpable wave; **800 ms tail-slam cue**, with the tail/body moving toward a committed landing mark and `boss:stomp { x, y, power: 2 }`; **900 ms green gas cue**, then a low flame jet; **700 ms faster lunge cue**. Jump the low attacks, move off marked impacts, or keep distance.
- Root clamps use authored `arenaX0/arenaX1`, a **48 px arena wall gap** and an **8 px view inset** for the complete silhouette. Recovery backs away to leave room for the next lunge. Camera easing can shorten a charge; it never extends its committed endpoint after release.
- Fully submerged hurtboxes all return **`alive() === false`**, including pod/reactor/legs/head. Depth **20.5** under water, **40** on the pier; wake/lamps/bubbles remain visible. Burst intervals are below the audit's 15-second untouchable timeout. Diving/surfacing emit XL `water:splash` with `sink` / `surface`.
- Production waterline is the authored floor minus 8: **328 at the y336 pier**. The snapshot retains `x`, `y`, `hp`, `phase`, `state`, `hurtboxes`, plus `floorY`, pod HP, markers, ordnance, intro clock and submerged/depth information.
- At a **y336 root / camera scrollY168**, the conservative full source-canvas top is **screen y72**; opaque pixels start at about y76. The head remains lower. Idle steam was shortened to scale .4 at root−60 to keep it below the radio strip. The fixture's earlier raised deck was removed so it also clears the strip.
- Death is **4200 scaled ms**: cancel rockets/markers/enemy bullets, raw-time 100 ms synchronized flash, slow motion, explosions running down the body, heavy fragments, a detached falling jaw, belly-up flip, sinking hull, lamps fading last. Defeat/scoring happen after the chain. Levels alone owns stage clear.

### How to see it

From the repository root:

```sh
mkdir -p /tmp/kbe-enemies-a
bash game/tools/build-art.sh art-src/enemies/gatorgeddon.lua
/home/knotz2/.local/bin/aseprite --batch --script-param root="$PWD/game" --script game/art-src/enemies/gatorgeddon-preview.lua
node game/tools/shot.mjs --out /tmp/kbe-enemies-a/manual-fixture.png --query 'scene=Game&enemytest=gatorgeddon&god=1&fast=1&mute=1' --wait 1400 --steps '[{"eval":"(__KBE.sim.freeze(), __KBE.sim.advance(2200), __KBE.sim.render(), __KBE.state().boss)"}]'
```

Fixture URL: `?scene=Game&enemytest=gatorgeddon&god=1&fast=1&mute=1` (add `debug=1` in a production build). It requests a boss spawn 210 px right of the player, creates a fake 512 px arena and a flat temporary pier, and draws animated channel water at depth 21. Initial camera easing clamps the assembly to the visible screen. Mission 1 tutorial signs inside the fixture are hidden temporarily so they cannot cover the submerged lamps; their visibility is restored on shutdown. The water continues below the fixture deck to conceal the submerged body like the production ground layer. The test pier/collider and graphics are removed on shutdown; production arenas get none of this fixture geometry.

- `window.__KBE_GATORTEST.bossHp(n)` crosses thresholds for controlled captures.
- `window.__KBE_GATORTEST.hitAt(x, y, damage=1, kind='bullet', dirX=1, dirY=0, weapon='pistol')` goes through the damage service.
- `__KBE.state().gatorTest` reports phases, defeats, score, kills and stomps; `state().boss` is the shared tracked snapshot.
- `__KBE.cheats.damageBoss(n)` remains the normal shared boss damage hook; it cannot hit while the boss is fully under.
- Do not use the warp cheat to reposition inside the fixture: it unlocks/snaps the camera. For a controlled pose capture, use `__KBE.game.scene.getScene('Game').ctx.player().teleport(x, __KBE.state().boss.floorY)`; normal movement/input is preferable for combat.

The scratch harness adapts `game/tools/shot.mjs`'s Vite/Chromium setup. Reproduce the full fixed-step sequence with `timeout 180s node /tmp/kbe-enemies-a/capture.mjs`; supplemental flash, radial and lifecycle checks with `timeout 90s node /tmp/kbe-enemies-a/supplemental.mjs`. Both close their resources in `finally`. The harness hides the HUD title card for unobscured review, not gameplay actors. Contact generation: `aseprite --batch --script /tmp/kbe-enemies-a/contact.lua` using the full absolute Aseprite path above.

### Inspected evidence

Everything below is under **`/tmp/kbe-enemies-a/`**. All cited PNGs were opened and inspected, directly or in the contact sheets. Runtime captures are **1152×648 (3× native)**; contact sheets preserve that scale, two columns read left-to-right/top-to-bottom.

- `silhouette-1x.png`, `silhouette-3x.png`: same-scale GATORGEDDON, MOOSEZILLA and Knotz.
- `review-1.png`: intro eyes, intro roar, idle, 66%, 33%, destroyed pod.
- `review-2.png`: lunge, missiles and behind-the-boss tail — cue/release pairs.
- `review-3.png`: dive, submerged wake, ambush cue/release, climb, gatling release.
- `review-4.png`: gatling, death roll and tail slam — cue/release pairs.
- `review-5.png`: gas/flame and faster lunge — cue/release pairs.
- `review-6.png`: lethal flash, death debris, belly-up, sinking, final defeat and real-fire completion.
- `review-7.png`: normal flash 0/67 ms, reduced flash 0/67 ms, reduced death at 117 raw ms. Individual source captures: `flash-{normal,soft}-{0,67}.png`, `soft-death-117.png`.
- Standalone `submerged-wake.png` shows the channel wake; `ambush-cue.png` shows the fixed impact mark; `real-fire-complete.png` records the normal-fire finish.

`verification.json` records all main captures and **8/8 passing checks**. `supplemental.json` records **7/7 passing checks**: radio clearance, single shared-pool radial damage, normal/reduced flash cleanup, detached-jaw cleanup through slow motion, no duplicate defeat and fixture restart cleanup. `capture.log`, `supplemental.log`, `art-audit.log`, `phaser.log`, `check-final.log`, `reach.log`, `arena.log` hold the command evidence.

The real-fire completion is a fresh fixture run with **god mode, HMG and an ammo grant**, using normal shoot input in the fixed-step sim. **No boss HP setter, direct damage, kill cheat, warp or arena clear** is used in that run. The final run fires **460 shots** and completes in **39.067 simulated seconds** (400 ms CPU simulation time, excluding rendering). It reaches phases **1 → 2 → 3**, exactly **one defeat**, **one boss kill**, and **6000 boss points**, with no runtime errors. Controlled phase/weak-point captures are separate from this completion.

### Verification status and known issues

- **Final `npm --prefix game run check`: PASS**, TypeScript plus Phaser 4 checker, **112 files / zero errors / zero warnings** (`check-final.log`). Earlier transient concurrent Levels diagnostics in `ice.ts`, `train.ts` and `index.ts` were resolved by their owners before the final check. Those files were not edited.
- `node game/tools/reach-check.mjs --part 2-3` and `node game/tools/arena-audit.mjs --part 2-3` currently **SKIP: map missing (`m2p3.tmj`)**. Therefore real-arena camera placement, pier-hole collisions/repair and mission completion are pending integration, not claimed as accepted.
- The console reports missing GATOR sound keys while Audio works in parallel. Missing sounds are silent; captures were muted. No audible mix assessment is claimed.
- Repeated ordnance is bounded: four reusable rocket sprites, pooled shared bullets/waves; shared heavy debris caps itself at 18. No sustained 60-FPS SwiftShader benchmark is claimed.

### Requests for other teams

- **Levels / Lead QA:** land `m2p3`, then run `?part=2-3&debug=1&god=1&fast=1` plus `__KBE.cheats.boss()`, the real boss arena capture and `node game/tools/arena-audit.mjs --part 2-3`. Validate the channel strip at depth 21 / y328, ground at depth22 / y336, stomp-breakable pier planks and approximately five-second repairs. The current shared stomp consumer offsets holes by 56 px toward the player; verify that its resulting holes match the boss's committed slam mark and retain a survivable route.
- **UI/Audio:** supply/verify all agreed keys: `gator_roar`, `gator_snap`, `gator_hiss`, `gator_tail`, `gator_submerge`, `gator_surface`, `gator_roll`, `gator_missile`, `gator_gatling`, `gator_gas`, `gator_flame`, `gator_death`, and main-boss music selection for `GATORGEDDON` / `music_boss_gator`.
- **Enemies B / Engine:** no source changes requested. Existing `registerGatorgeddon(ctx, track)`, mission loading, shared debris/flash helpers and debug contract are used as supplied.

## Phase H (Enemies A) — 2026-10-20

Rebuilt the Buzzard and attack hound from Imagegen's progressively delivered references. Both were marked ready in `game/art-src/refs/manifest.json` before delivery. Inspected each concept, pixel preview and pose guide, plus Buzzard's parts guide; these are design references, not pasted or quantized sprite pixels. No git state changes, real-time bot playthroughs, `playtest/` edits or other team's source edits.

### Delivery and decisions

- `game/art-src/enemies/buzzard.lua` and `buzzard.aseprite`: five editable layers (tail, hull, turret, exhaust, rotor), 112×80 canvas, right-facing, centre anchor. Steel hull/red armour, spiral tail stencil, red-capped pilot behind curved blue canopy ribs, twin exhaust ports, rocket pod and skids. **69 frames / 10 tags**: `buzzard_cruise`, `aim`, `strafe`, `fire`, `damaged`, `damaged_aim`, `damaged_strafe`, `damaged_fire`, `hurt`, `death` (all names prefixed `buzzard_`). Eight-position main rotor and tail propeller, sparse blur arcs, hull bob and exhaust. The approximately 12° strafe tilt is baked into the art, with the turret progressively dropping during aim and staying down during fire. Twelve death frames ×100 ms detach the tail, bend the rotor and pitch the smoking hull down.
- `game/art-src/enemies/hound.lua` and `hound.aseprite`: dog and detachable helmet layers, 48×40 canvas, bottom-centre anchor/paws y39. Brown fur, red back/shoulder armour, steel straps/buckles, amber goggle, antler helmet and snapping tan muzzle. **37 frames / seven tags**: `hound_idle` (6), `run` (8), `crouch` (4), `leap` (4), `land` (4), `hurt` (3), `death` (8), all prefixed `hound_`. Jointed near/far legs follow eight distinct gallop poses; crouch loads the haunches, leap stretches/gathers, landing squashes. Eight 100 ms death frames throw the helmet and tumble the dog without gore. Flight paths stay within the source canvas.
- Corresponding `game/public/assets/sprites/enemies/{buzzard,hound}.{png,json}` rebuilt. Only these two old drawing blocks were removed from `game/art-src/enemies/phase-e.lua`, avoiding last-writer overwrites during a full art build. Other Phase E sprites and all shared drawing helpers were left alone.
- `game/src/entities/enemies/AssaultEnemy.ts`: animation selection, damage states, sounds and spatial FX. Buzzard plays `buzzard_gun` for each of the existing five burst shots; below/equal 20 HP it uses damaged variants and emits `smoke_trail` every 150 scaled ms. Rotor wash probes the nearest water/deck/ground surface every 120 ms while within 90 px, preserving its actual terrain material. Hound landing emits `dust_land`; hit animations recover without pausing AI. Cached visual keys avoid animation-config/string creation on the ordinary per-frame path. Hit flashes use raw time and reduced-flash multiplication.
- Buzzard cruise root stays at screen y90–106; strafing adds a 6 px dip. This leaves the hull in the intended sky band and rotor below the radio. Captured opaque sprite tops are y62.5–75.7 across the fixture sequence (`altitude-proof.json`), including death. Locked flight/crash uses a 56 px horizontal inset for the new rotor envelope. Death still lasts **1200 ms**, falls to a probed surface, and emits exactly one size-`l` explosion, scale-1.5 `mech_pop` and `heli_crash` at impact. Free passes still exit after eight seconds and retain their three paratrooper drops.
- Hurtboxes only: Buzzard **66×26 → 70×30**, aligned 8 px toward the nose; hound **30×18 → 34×21**, aligned to torso/paws. Sizes are within the ±4 px allowance. Hound remains **`flesh`**. HP, damage, score, attack/telegraph/recovery clocks, pounce travel and projectile speed are unchanged. The chin muzzle's projectile/event origin follows the new gun. No tuning edits.
- Palette/alpha audit: **106 frames, 17 globally unique tags**, no master-palette exceptions, no fractional alpha, no duplicate hound/Buzzard keys. Every gallop, crouch, leap, land and death frame is distinct. No new filters, timers or per-shot game objects; repeated smoke/wash/debris use shared FX recipes.

### Reproduce / see it

From the repository root:

```sh
bash game/tools/build-art.sh art-src/enemies/buzzard.lua art-src/enemies/hound.lua
node game/tools/shot.mjs --out /tmp/kbe-enemies-a/manual-buzzard-h.png --query 'debug=1&scene=Game&fast=1&mute=1&god=1&enemytest=buzzard' --wait 1400 --steps '[{"eval":"(__KBE.sim.freeze(), __KBE.sim.advance(2000), __KBE.sim.render(), 1)"}]'
node game/tools/shot.mjs --out /tmp/kbe-enemies-a/manual-hound-h.png --query 'debug=1&scene=Game&fast=1&mute=1&god=1&part=1-3&x=500' --wait 1400
```

Fixture URLs: `?debug=1&scene=Game&fast=1&mute=1&god=1&enemytest=buzzard` and the same with `enemytest=hound`.
Production URLs use `?debug=1&scene=Game&fast=1&mute=1&god=1&part=<part>&x=<player x>`:

- 1-2: x2004 (Buzzard authored x2104), x3268 (x3368), x4772 (x4872).
- 2-1: x4868 (Buzzard x4968); 2-2: x2340 (Buzzard x2440).
- 1-3: x500 and x1668 (hound packs authored around x600 and x1768).

The scratch capture harness uses the repository `shot.mjs` Vite/Chromium setup and fixed-step `__KBE.sim`. Run **serially**, each bounded to 600 s:

```sh
timeout 600s node /tmp/kbe-enemies-a/capture-h.mjs
timeout 600s node /tmp/kbe-enemies-a/supplemental-h.mjs
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python3 -I /tmp/kbe-enemies-a/contact.py
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python3 -I /tmp/kbe-enemies-a/review.py
```

For clear visual evidence the harness cuts only the centre title card; Hazel's radio remains. **Three wave-only production location captures stage a ship at its authored coordinates** while the real arena is on wave one (1-2 x3368, 2-1 x4968, 2-2 x2440). `verification-h.json` marks these `staged: true`; these images establish art/framing, not arena completion. The independent full audit verifies actual wave progression. Terrain under these authored coordinates is often a raised metal/wood/stone deck, so wash correctly uses that material; the fixture also proves snow wash. Water is selected when it is the nearest surface below the craft, rather than through an intervening deck.

### Inspected evidence

All final evidence is under **`/tmp/kbe-enemies-a/`**, opened directly or as the following inspected review sheets:

- `buzzard-contact-1x.png`, `buzzard-contact-4x.png`, `buzzard-contact-page-{1,2,3,4}.png`; `hound-contact-1x.png`, `hound-contact-4x.png`: every tag/frame, with a same-scale grunt and composite Knotz. Four Buzzard page crops support close inspection of the tall full contact.
- `review-context-buzzard-1.png`: all five production Buzzard placements, with debug hurtboxes. `review-hound-1.png` includes both real hound locations.
- `review-strafe-1.png`: cruise, aim, lowered turret, burst and pass-end sequence, including Hazel's live radio strip.
- `review-damage-death-{1,2}.png`: damaged holes/sparks/smoke, detached tail, pitching crash and impact.
- `review-hound-{1,2,3}.png`: real map context, loaded crouch, charge, stretched leap, apex, land, recover, flinch, helmet ejection, tumble and final removal.
- `buzzard-soft-hit.png`, `buzzard-soft-hit-cleared.png`: reduced flash and raw-time cleanup during hitstop. The supplemental log also verifies normal FILL flash.
- Before art/context inspected from the Lead's read-only survey: `/tmp/kbe-lead/polish/buzzard.png`, `small.png`, `ctx_buzzard.png`, `ctx_hound.png`. Preserved pre-build atlas copies are `/tmp/kbe-enemies-a/{buzzard,hound}-before.{png,json}`.

`verification-h.json` / `capture-h.log`: **7/7 passing** targeted checks: five rounds/five sounds, half-HP damaged art/smoke, snow rotor wash, exactly one kill/large crash/pop/sound, hound landing dust, flesh material and no page errors. `supplemental-h.json` / log: **5/5 passing** normal/reduced flash mode and raw-time clearing during a 100 ms hitstop, plus no page errors. `altitude-proof.json` checks the exact visible-frame source bounds against the captured camera and confirms the complete 112 px crash canvas remains horizontally inside the locked view. `art-audit.log` records palette/alpha and per-tag unique frames.

### Verification status / known issues

- Final `npm --prefix game run check`: **PASS**, TypeScript plus Phaser 4 lint, **115 files / zero errors / zero warnings** (`check-final.log`).
- `npm --prefix game run audit`: full reach and all six arenas **PASS** (`audit.log`); final rerun after animation/muzzle/cache refinement also **PASS for all six parts** (`audit-final.log`).
- `npm --prefix game run selftest`: completed within six minutes with **six failing assertions** (`selftest.log`): MOOSEZILLA projectile kill and re-entrant clear follow-up; held-key latch and continue-input fresh press; camera letterbox/focus release; camera unlock-blend progress. These concern code outside Enemies A's owned files; the cause was not established here. All global animation/frame-resolution, campaign, restart-listener/audio cleanup, mission-pack loading/material mapping, mission-chain and load-error recovery checks passed. No runtime page errors. The shared check is therefore **not claimed green**.
- `buzzard_gun` and `heli_crash` are emitted using the agreed contract but were still absent from Audio's catalog at handoff inspection. Missing sounds degrade silently; captures are muted and no audible mix assessment is claimed.
- No sustained 60-FPS benchmark is claimed in this shared SwiftShader session. Visual/arena runs used one owned browser at a time; all owned servers/browsers were closed by their harnesses. Early scratch-camera setup and one-step-short impact captures were corrected; only the final passing JSON/review sheets above are evidence.

### Requests for other teams

- **UI/Audio:** land/verify the agreed `buzzard_gun` and `heli_crash` keys. Enemies A already calls them at each burst and at crash impact; no enemy-side alias is needed.
- **Lead / Engine / QA:** triage the six selftest failures in `/tmp/kbe-enemies-a/selftest.log`, preferably after concurrent SwiftShader work settles. Do not treat this delivery as a green full selftest. Review the three explicitly staged wave-location images alongside the passing native arena audit.
- No gameplay, map, pack or shared-helper source changes requested. GATORGEDDON's H2 work is untouched.
