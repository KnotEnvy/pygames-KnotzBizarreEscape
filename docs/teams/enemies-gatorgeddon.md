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
