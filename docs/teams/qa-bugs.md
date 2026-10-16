# Phase C QA — Mission 1 triage

Tested 2026-10-16 in the shared, changing checkout. No gameplay files, dependencies, or git state were changed by QA. Ownership follows `docs/ARCHITECTURE.md`.

**8 open findings: S1 0 / S2 3 / S3 3 / S4 2.** The major findings are Continue input leaking into Pause (Engine), the boss stage-end gap (Levels), and the hidden boss HP fill (UI). The animation issue briefly crashed Title after UI registered, then Engine fixed it during QA; that S1 is closed. Native UI/audio smoke is now included; audible mixing remains unverified.

| Owning team | S1 | S2 | S3 | S4 | Total |
|---|---:|---:|---:|---:|---:|
| Engine | 0 | 1 | 1 | 0 | 2 |
| Player and weapons | 0 | 0 | 0 | 0 | 0 |
| Enemies, AI and bosses | 0 | 0 | 2 | 1 | 3 |
| Levels and content | 0 | 1 | 0 | 1 | 2 |
| Effects and game feel | 0 | 0 | 0 | 0 | 0 |
| UI, HUD and audio | 0 | 1 | 0 | 0 | 1 |

S1 = crash or progression softlock; S2 = major gameplay/flow/readability defect; S3 = localized functional defect; S4 = polish. Counts exclude harness mistakes, transient browser transport failures, and capabilities not yet registered.

## Test conditions and evidence

- Chromium 156.0.8078.4 / Linux x64 / SwiftShader; keyboard; 1152×648 viewport, 384×216 game canvas; seed 731. The exact browser version in each `report.json` is authoritative. Muted unless stated otherwise; difficulty Arcade unless the URL says Casual.
- Each tool owns an independent loopback Vite server with HMR disabled and `watch: null`. This prevents save-triggered reloads; it does not make a source snapshot or prevent newly requested modules from seeing concurrent writes.
- URLs below use the repository's normal dev origin, `http://127.0.0.1:8080`. Substitute the origin printed by the QA launcher when using its random port. The reports retain the actual full URLs and UTC timestamps.
- Gameplay mutations below are explicit QA fixture setup through existing cheats/factories. Damage, collision, input, boss behavior and level triggers execute in the real Game scene. Fixture checks do not substitute for human balance acceptance.
- Screenshots were opened and inspected, including the camp, forest, bridge, outpost, all boss phases, death, completion, weapons, enemies, pause and continue.

## Engine

### KBE-QA-E01 — RESOLVED: empty Aseprite animations crashed newly registered Title

- **Status:** Closed after a concurrent Engine fix, verified in fresh UI boot. **Severity at exposure:** S1 (Title crash); initially S3 while UI was unregistered. **Owner:** Engine (`src/scenes/PreloadScene.ts`, new `src/core/anims.ts`). **Contract:** GDD §§7, 10, 12; valid globally named Aseprite animations.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&fxtest=1&x=1900&seed=731`.
- **Repro:** Boot; inspect `Object.values(__KBE.game.anims.anims.entries).filter(a => !a.frames.length).map(a => a.key)`. Check `fx_steam_vent`, `logo_glitch`, `hud_go`, and `countdown_9`.
- **Expected:** Every registered animation contains the frames in its Aseprite tag; clients can play the documented keys.
- **Actual before fix:** 115 keys had zero frames: FX and UI tags remained empty. Player, enemy and prop registrations repair their own animations. FX's custom `Art`/`FxPool` reads atlas frames independently, so its explosions and muzzle flashes **do render**; this is not a claim that all FX is absent. MOOSEZILLA's Phaser-animation steam branch is guarded out by the empty `fx_steam_vent`. When UI registered, `TitleScene.create()` playing `logo_idle` threw `TypeError: Cannot read properties of undefined (reading duration)`, preventing normal boot. Engine subsequently replaced the numeric-frame Aseprite path with the atlas frame names; fresh UI smoke sees **zero empty animations**, correct countdown/rank frames, and working Title.
- **Frequency:** 2/2 initial systematic runs; Title crash in 2 first-registration E2E boots. **Resolved verification:** fresh native UI report has `emptyAnimations: []`; final E2E boot and Title flow pass. The earlier 69/70 systematic result is historical, not an open failure.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/020-fx-gallery.png` (context; empty animation data is in JSON).
- **Trace/state:** [systematic report](../../game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/report.json), `emptyAnimations` and failed check `no zero-frame animations`; 69/70 checks passed, browser/state errors empty before UI registration. Crash trace: `game/tests/artifacts/2026-10-16T19-07-49-455Z-e2e-3492348/results/boot-page-renders-a-canvas-06273-ntext-and-no-browser-errors-chromium/trace.zip`. Resolution: `game/tests/artifacts/2026-10-16T19-12-07-148Z-phase-c-ui-3498072/report.json`.

### KBE-QA-E02 — Camera shake exposes flat sky strips at world edges

- **Severity:** S3. **Owner:** Engine (`src/core/camera.ts`; coordinate overscan with Levels). **Contract:** GDD §§3, 8, 12.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=32&seed=731`.
- **Repro:** Through Game's test context, call `__KBE.game.scene.getScene('Game').ctx.fx.shake(4)`; capture about 40 ms later. Repeat after `__KBE.cheats.warp(6680)`. Normal boss explosions also expose this.
- **Expected:** Shake keeps the rendered composition covered at the screen border.
- **Actual:** Flat blue horizontal/vertical strips replace the background at the canvas perimeter. Left-edge screenshot shows a conspicuous top and right strip; the boss entrance capture also shows a left strip.
- **Frequency:** Both edge captures; also seen during the full boss run. **Regression baseline:** reported by Engine; confirmed.
- **Screenshots:** `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/021-shake-world-left.png`, `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/022-shake-world-right.png`.
- **Trace/state:** Same systematic `report.json`; player alive, camera near map boundary, no browser error.

### KBE-QA-E03 — Continue confirmation also pauses the resumed Game

- **Severity:** S2. **Owner:** Engine (`src/core/flow.ts`, cross-scene input baseline); coordinate with UI Continue. **Contract:** GDD §10: Continue returns to playable gameplay.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=5800&seed=731`.
- **Repro:** Kill the player three times with `__KBE.cheats.kill()`, waiting for each respawn and then the native Continue screen. Press Enter with a normal 80–100 ms hold, release, wait 400 ms. The dedicated native UI probe and `flow.spec.ts` reproduce this without modifying input state.
- **Expected:** Exactly one Continue action: score resets, 3 lives restored, Game active and unpaused.
- **Actual:** Lives and score reset correctly, then the same Enter gesture opens Pause. Snapshot: `scene='Pause'`, player alive with 3 lives, active scenes HUD/Pause, Game paused. Escape recovers. This is a Continue handoff bug; fresh Title→Game→Pause/resume passes and is not attributed to this defect.
- **Frequency:** Native UI probes plus final E2E. No browser exception. **Regression baseline:** fallback Continue passed before the native overlay landed.
- **Screenshot:** `game/tests/artifacts/2026-10-16T19-12-07-148Z-phase-c-ui-3498072/009-native-continue-transition.png`.
- **Trace/state:** [native UI report](../../game/tests/artifacts/2026-10-16T19-12-07-148Z-phase-c-ui-3498072/report.json), `continueTransition`; E2E trace `game/tests/artifacts/2026-10-16T19-12-10-373Z-e2e-3498437/results/flow-game-over-offers-continue-and-starts-a-fresh-run-chromium/trace.zip` (expected Game, received Pause).

## Enemies, AI and bosses

### KBE-QA-N01 — Enemy factories ignore authored sleep, flee, door-entry and mount properties

- **Severity:** S3. **Owner:** Enemies (`src/entities/enemies/Enemy.ts`). **Contract:** Level spawn-property contract; GDD §§7–8.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=5800&seed=731`.
- **Repro:** Run `node game/tests/bot/phase-c.mjs --mode investigations`. Its `enemy-map-properties` case creates a grunt with `{idle:'sleep',patrol:0,facing:1}`, one with `{idle:'flee',from:'door',patrol:0,facing:1}`, and a turret with `{mount:'pedestal'}`. Wait 700 ms. Normal camp/pen/outpost map instances pass the same properties.
- **Expected:** Sleeping guard sleeps until alerted, fleeing pen guards flee, entry actors walk out of their doors, and turret mount styling matches the map.
- **Actual:** Both test grunts remain ordinary `patrol`/idle actors; the flee behavior is absent, and the turret uses the same default base presentation. Factories read facing/patrol/wave but omit these properties. Level-owned door opening and spawn timing work; the missing enemy exit animation is a separate handoff.
- **Frequency:** 3/3 investigation runs; source corroboration. **Regression baseline:** Levels' documented integration gap.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-58-07-454Z-phase-c-investigations-3486424/003-ignored-sleep-flee-mount.png`.
- **Trace/state:** [investigation report](../../game/tests/artifacts/2026-10-16T18-58-07-454Z-phase-c-investigations-3486424/report.json), `enemy-map-properties`, states `patrol` at x5860/x5950/x6040.

### KBE-QA-N02 — MOOSEZILLA accepts hits in empty corners of its silhouette rectangle

- **Severity:** S3. **Owner:** Enemies/bosses (`src/entities/bosses/Moosezilla.ts`). **Contract:** GDD §7 boss/weak-point readability.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=6350&enemytest=boss&seed=731`.
- **Repro:** Run `node game/tests/bot/phase-c.mjs --mode boss`. The phase-3 corner check queries the boss's real damage rectangle, then calls `__KBE_ENEMYTEST.hitAt(rect.x+2, rect.y+2, 1, 'bullet', 1, 0)`.
- **Expected:** A shot through empty space above/beside the visible machine misses; a visible hull/part hit damages it once.
- **Actual:** The point `(6360.56,222)` inside the broad `152×116` rect accepts damage, HP 90→89, despite being in the rectangle's empty upper corner. Coordinate-routed antler/core logic does not remove this empty-space hull region. This is a hurtbox issue, not evidence of a broad player-contact collider.
- **Frequency:** 1/1 targeted check, consistent with the implementation. **Regression baseline:** Enemies' known broad silhouette rectangle.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-54-22-293Z-phase-c-boss-3483699/010-boss-empty-corner-hit.png`.
- **Trace/state:** [boss report](../../game/tests/artifacts/2026-10-16T18-54-22-293Z-phase-c-boss-3483699/report.json), `cases[0].corners` with point, rect and before/after HP.

### KBE-QA-N03 — A bridge paratrooper's descent freezes just behind the arena camera

- **Severity:** S4. **Owner:** Enemies (AI lifetime/culling; coordinate with Levels). **Contract:** GDD §7 parachute lifecycle and view activation.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=3080&seed=731`.
- **Repro:** Hold Right 2 seconds, release, wait 6 seconds; inspect `enemyAI` while the camera locks at x3200.
- **Expected:** A departed airborne actor finishes its descent or is cleaned up as it leaves the playable view.
- **Actual:** The ordinary paratrooper at x3112 stays in `descent` at exactly y183.21 across all twelve samples. It is 88 px behind the view: outside the AI's 32 px margin but inside the 96 px cleanup threshold. This is an **off-view lifecycle stall**. The on-screen wave paratroopers continue descending; no required-wave softlock was established. Treat blanket off-view dormancy as a deliberate optimization, with this transition as a cleanup/presentation gap.
- **Frequency:** Reproduced in all enemy runs. **Regression baseline:** reported bridge hanging actor; confirmed with this narrower impact.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-58-51-268Z-phase-c-enemies-3487717/024-bridge-hanging-paratrooper.png` (on-screen context; frozen actor itself is left of the capture).
- **Trace/state:** [enemy report](../../game/tests/artifacts/2026-10-16T18-58-51-268Z-phase-c-enemies-3487717/report.json), final case's `samples`; x3112/y183.21 constant, required wave actors advancing.

## Levels and content

### KBE-QA-L01 — Boss defeat at the right edge does not trigger mission completion

- **Severity:** S2. **Owner:** Levels (`src/level/triggers.ts`, map `stage_end` rectangle). **Contract:** GDD §§7–8, 10: boss defeat → mission complete.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&stage=1&god=1&fast=1&mute=1&seed=731`.
- **Repro:** Run `node game/tests/bot/playthrough.mjs --weapon hmg`. The bot reaches the arena's far-right legal position, faces left, and defeats the boss through normal shooting. Observe the `boss-defeated` capture before the harness walks left. For a quicker fixture repro, use `x=6350&enemytest=boss`, walk to the right boundary after the gate opens, then `__KBE_ENEMYTEST.bossHp(0)` and wait for the real defeat event.
- **Expected:** After the death chain, the mission completes from every legal standing location in the boss arena.
- **Actual:** At player `(6677,336)`, boss HP=0/state=`defeated`, player remains `ready` and no completion starts. `stage_end` ends at x6672, leaving a legal strip to its right. Walking left into the strip changes the player to `victory` and completion proceeds. The harness deliberately performs that recovery; it must not hide the gameplay defect.
- **Frequency:** 2/2 full runs with delayed-defeat observation; fixture completion inside the strip also passed. **Regression baseline:** no earlier accepted defeat-to-completion run.
- **Screenshots:** `game/tests/artifacts/2026-10-16T18-55-14-821Z-playthrough-3484338/018-boss-defeated.png`, `game/tests/artifacts/2026-10-16T18-55-14-821Z-playthrough-3484338/019-final.png`.
- **Trace/state:** [full run](../../game/tests/artifacts/2026-10-16T18-55-14-821Z-playthrough-3484338/report.json), captures `boss-defeated` (`ready`) then `final` (`victory`); all six coverage flags true. That run also recorded a camera comparison across a cheat warp; the harness now resets that comparison at each warp. Physical no-warp camera checks passed.

### KBE-QA-L03 — Giant pines read as bare vertical trunks on the main route

- **Severity:** S4. **Owner:** Levels (map/tiles/art placement). **Contract:** GDD §8 Pine Forest identity and route readability.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=1900&seed=731`.
- **Repro:** Remain on the main ground route around x1900–2200, then compare with the upper branches.
- **Expected:** The forest's landmark pines read as trees from the route most players take; branch routes visually connect to a canopy.
- **Actual:** Large flat brown columns dominate the visible area. Needle tiers sit mostly above the resting view, making the scene read as poles with disconnected ledges. Snow/stone background noise further weakens the tree silhouette.
- **Frequency:** Full traversal and two systematic captures. **Regression baseline:** Levels' known canopy placement limitation.
- **Screenshots:** `game/tests/artifacts/2026-10-16T18-51-19-595Z-playthrough-3481455/003-camera-1702.png`, `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/020-fx-gallery.png`.
- **Trace/state:** Matching reports, section=`pine_forest`; no collision or missing-texture error claimed.

## UI, HUD and audio

### KBE-QA-U01 — Opaque boss-bar frame hides the entire health fill

- **Severity:** S2. **Owner:** UI (`src/scenes/ui/HudScene.ts`, `public/assets/ui/bossbar_frame.png`). **Contract:** GDD §9 boss HP feedback.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=6350&enemytest=boss&seed=731`.
- **Repro:** Wait 1.5 seconds after boss spawn. Inspect the bottom bar while debug HUD reports 400/400 HP. `node game/tests/bot/phase-c.mjs --mode ui-results` records the state and screenshot.
- **Expected:** Full red/orange fill at full HP, draining as the boss takes damage.
- **Actual:** The bar appears empty at 400/400. The frame image's center is opaque RGBA `[43,38,53,255]`, and HUD adds it after the fill and ghost inside `bossBox`, painting over both. The source fill PNG contains valid colored pixels. This is a render-order/asset-cutout issue; the HP event and debug value are correct. Use a transparent slot or draw the fill above the opaque interior.
- **Frequency:** Three native boss HUD captures, including the post-animation-fix run. **Regression baseline:** first native HUD acceptance.
- **Screenshots:** `game/tests/artifacts/2026-10-16T19-14-04-759Z-phase-c-ui-results-3501820/000-native-boss-hud.png`; final visual verification: `game/tests/artifacts/2026-10-16T19-15-51-181Z-phase-c-ui-results-3503979/000-native-boss-hud.png`.
- **Trace/state:** [HUD/Results report](../../game/tests/artifacts/2026-10-16T19-14-04-759Z-phase-c-ui-results-3501820/report.json), HUD boss `{hp:400,max:400}`. The follow-up visual probe records the opaque frame-center pixel and failed visibility assertion; browser errors are empty.

## Confirmed working, refuted reports, and limits

- **Warning-sign occlusion refuted after controlled capture (withdrawn candidate KBE-QA-L02).** The early crouch screenshot was taken during 0.4-alpha respawn blinking and made Knotz look hidden by the sign. At invulnerability=0, Knotz draws clearly above it; `occluders` is empty. Screenshot: `game/tests/artifacts/2026-10-16T19-00-20-810Z-phase-c-investigations-3488401/003-foreground-sign-hides-crouch.png` (the provisional filename describes the hypothesis, not the result). No z-order defect is asserted here.
- **Camp camera failure refuted on this checkout.** The initial isolated E2E camera test advances and remains monotonic on left input. The start cage does not reproduce the old x104 failure. Intentional cheat warps reset the camera and must not be judged as ordinary reverse scrolling.
- **Bottom-row crates confirmed below standing fire; not an open bug.** The same crate survives standing fire and breaks under crouch fire. This matches the team's intended interaction; add a crouch teaching beat (improvement below).
- **Arena lifecycle:** bridge and bunker finish all waves and unlock when all actual member hurtboxes die. This uses `killEnemies()` to isolate arena sequencing; it does not establish fair physical combat completion.
- **Weapons:** 5 weapons × 8 directions passed; all 4 finite-ammo weapons reverted to pistol at depletion. Grenade consumption/explosion, close-range knife kill, crouch hitbox, one-way drop-through, bomb/points/life/weapon pickups and POW explosion immunity/one-time reward passed.
- **Enemies:** all six fixture cycles, deaths and shield front/rear behavior passed in a clean rerun. An earlier retry had `ERR_NETWORK_CHANGED`; its pass assertions were not treated as a clean browser run.
- **Boss:** all three phases via real fire in the full bot; attack cycles, threshold transitions, delayed single defeat, explosion chain and real stage-end activation also exercised in the fixture. Fixture HP control is labeled separately from combat. Broad hurtbox remains E/N triage above.
- **Damage/flow:** Arcade one-hit death; Casual 3 HP and i-frames; god normal-hit immunity; water/spikes kill; one-life respawn; fallback Continue restores lives/score; fallback pause/resume and 9-second expiry work. The first flow probe pressed Enter before `game:over` and entered pause; corrected probe waits for actual flow state. That test-timing mistake is not a game defect.
- **Physical checkpoint routes:** Arcade camp/forest/bridge exhausted 3 lives at max x742/1707/3577. Outpost stalled at x4169 with 2 lives; pen approach reached x6494 with all 3 lives. Casual cleared camp (3 lives) and forest (1 life), reached bridge arena x3577 (1 life), stalled at the same outpost step (3 lives), and reached pen x6496 (3 lives). All use physical movement/fire/jump/grenades after their starting URL checkpoint; no god or weapon cheat. These are repeatable bot difficulty observations, not human skill ratings or completed non-god arena/boss acceptance.
- **Outpost stall refuted as a softlock:** after the direct jump stalls, jump left onto the x4141/y304 intermediate step, then right again; player reaches x4277/y272. This is an awkward route beat, not an impassable wall.
- No unprompted fall-through-floor, ordinary scrolling-back, texture loss, or required-arena softlock was established. The transient Title exception is recorded under resolved E01; final native runs had no browser exception. Real GPU, physical gamepad, audible mixing and long-session memory still require acceptance. Camera shake is the visible edge defect above.
- **Late native UI acceptance:** Title, Difficulty, Options/CRT/shake persistence, Controls, Credits, Intro, HUD values, native Pause/resume, Continue digits/life reset, Game Over timeout→Title, actual boss defeat→Results and Results→Title were exercised after registration. Continue requires an explicit Escape recovery (E03); boss HP is visually hidden (U01). Results score/POW bonus/rank data are correct. An early rank screenshot preceded its reveal tween; it was not a missing-rank defect. AudioService passed 4/4 unlock/gameplay/music/mute debug checks. See final evidence in `qa.md`.

## Top 10 fun/feel improvements

1. **Levels:** complete the stage from every legal boss-arena location after the defeat chain. Avoid a final invisible trigger hunt after the climactic kill.
2. **Engine + UI:** consume/rebaseline the Continue confirmation before returning to Game. A successful continue should resume action immediately, without a surprise Pause menu.
3. **Levels:** teach crouch with a visible low crate and a DOWN+FIRE sign before the first mandatory cover encounter. Put the first reward where standing fire visibly misses but crouch succeeds.
4. **Levels + Enemies:** give the camp's first guard a real sleeping/alert acting beat and the pen guards a real flee. These are good places for humor and pacing relief before the boss.
5. **Levels:** widen the outpost intermediate landing and remove the narrow recovery trough. The current 64 px wall asks the player to reverse onto a small step before progressing.
6. **Enemies + FX:** give dangerous bullets a consistent dark outline and bright core, distinct from HMG tracers and explosion embers; keep smoke behind them and test against snow, fence and rock separately.
7. **Enemies:** make every shield/front block unmistakable, then clearly expose the firing/recovery window. Pair the first shield with enough grenade space that the bypass is learned before a two-sided arena wave.
8. **Levels:** lower a few giant-pine needle tiers into the ground-route view and use branch/canopy silhouettes to point toward the tree POW. Keep the foreground rock pattern quieter behind combat lanes.
9. **Enemies + FX + Audio:** give each boss phase a distinct anticipation pose, floor cue and sound: cannon charge, flame reach, then a clear charge lane. Keep the exposed core visible through the phase-3 effects burst.
10. **UI + Levels:** make the boss health fill visible, show wave progress and a strong GO cue on unlock, and give the player a short pickup/recovery beat after each arena. Preserve ammo and threat visibility through the busiest effects.

Final accepted full-run evidence: [all-phase/defeat/stage-clear report](../../game/tests/artifacts/2026-10-16T19-03-09-069Z-playthrough-3489678/report.md). It records the right-edge completion recovery and passes after the harness camera comparison is reset at each intentional warp. [Final run inventory and source fingerprint](../../game/tests/artifacts/phase-c-2026-10-16-summary/acceptance-summary.json).
