# QA — Phase A harness and test plan

Owner: QA. Scope: `game/tests/**`, `game/playwright.config.ts`, this document. No source, dependency, or git state changes.

## Running the harness

Commands work from any directory. Use the installed CLI directly if npm exec is slow resolving its executable. Playwright owns a fresh Vite instance on **4310** with `reuseExistingServer: false`; stop another process using that port before running. One Chromium worker avoids SwiftShader contention. Every browser process prepends `/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu` to `LD_LIBRARY_PATH` and uses `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Viewport: 1152×648, internal canvas: 384×216.

```bash
npm --prefix /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game exec -- playwright test --config /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/playwright.config.ts
node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/node_modules/@playwright/test/cli.js test --config /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/playwright.config.ts

# Single suite / headed investigation (append to the previous command):
# --grep 'camera'
# --headed

node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/bot/playthrough.mjs
node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/bot/playthrough.mjs --step 128 --capture-every 256 --walk-ms 600 --boss-ms 90000

node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/perf/probe.mjs
node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/perf/probe.mjs --baseline /absolute/path/to/prior/perf/report.json

npm --prefix /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game run typecheck
npm --prefix /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game run check:phaser4
```

No installs or new package scripts are needed (`test:e2e` already exists). In a restricted runner, local HTTP sockets and Chromium process launching need the runner's execution permission.

Failure screenshots and retained traces: `game/test-results/`. HTML E2E report: `game/tests/artifacts/e2e-report/index.html` (kept separate because Playwright rejects nested reporter/test output directories). Standalone reports: `game/tests/artifacts/<timestamp>-<kind>-<pid>/report.md` and `report.json`, with relative screenshot links. All are covered by existing ignore rules. Open traces with the installed Playwright CLI `show-trace <trace.zip>`.

Visual verification via the repository's existing launcher (run from any directory):

```bash
LD_LIBRARY_PATH=/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH} node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tools/shot.mjs --out /tmp/kbe-qa/game.png --query 'scene=Game&fast=1&mute=1&god=1' --steps '[{"hold":"ArrowRight","ms":1000},{"press":"z"}]'
```

Create `/tmp/kbe-qa` before that screenshot command. Standalone tools create their artifact directory automatically and use independent random-port Vite servers, so they do not contend with the E2E port.

## Automated coverage and capability gates

- `boot.spec.ts`: successful HTTP response, visible 384×216 canvas, live WebGL context, no console errors/pageerrors, and Engine readiness. Rendering/error assertions always run, including during boot-probe-only development.
- `hooks.spec.ts`: `game`, `version`, `state`, `press`, all six cheat functions; required state keys and player field types; `scene=Game`, `fast=1`, `x=160`, `mute=1`, observable `god=1`, and timed virtual input release.
- `gameplay.spec.ts`: physical right input, jump/landing, firing observations, forward camera movement and twelve monotonic camera samples while moving left, paused movement freeze and resumed input.
- `flow.spec.ts`: Title → Game → Pause → resume, kill → observable death → respawn with exactly one life lost, and exhaustion of lives → actual GameOver/Continue UI → fresh lives and zero score.

Absent `__KBE` produces a named `fixme` after 1.5 s; an installed hook must become ready within 15 s. Feature gates use absent scene registrations, a null player, missing cheat functions, or absent shot/god telemetry. They never skip a feature because its action failed. Contract assertions fail on malformed installed hooks. GameOver is conditionally fixed until its scene is registered. Every test attaches browser errors; the boot tests assert an empty list. The report must list all skips as untested scope, not acceptance.

Current firing observability recognizes `state().projectiles` (number or array) or monotonic `state().shotsFired`. God flag observability recognizes `state().god`, `state().debug.god`, or `game.registry.get('god')`. These additions are requests, not existing architectural guarantees. God damage immunity also needs a manual hit test until a stable debug damage hook exists. `fast=1` is checked with direct Game boot and no active intro; a before/after intro duration comparison remains manual.

The bot enables god mode, requests HMG if `cheats.give` exists (`--weapon` overrides), holds fire, warps through x=64…6719 in 256 px steps, walks each step, samples states/FPS at ~100 ms, captures each observed 512 px camera threshold and boss phase, and records console errors and camera regressions. A step jumping across multiple capture thresholds yields one screenshot at the observed position; use `--step` ≤ `--capture-every`. Actual warp positions are checked. It records incomplete boss coverage as blocked. Warp coverage does not prove that a player can traverse platforms, arena gates or hazards. Phase transitions need `bossPhase` or `boss.phase`; HP alone is not used to invent phase transitions. Boss dwell defaults to 90 s and total traversal budget to 180 s; extend `--boss-ms`/`--max-ms` for longer runs.

The performance probe warms up for 2 s then measures **20 s** while moving, firing and jumping every 2 s. Reports include average/min game FPS, average/p95/p99/max rAF frame times, >50/>100 ms spike counts, full samples, input configuration and environment. It rejects dead/non-Game workloads and stationary player runs. Screenshots occur after timing. Store one passed report as a baseline and compare the same machine/browser/seed/workload; different configurations are rejected and environment differences flagged. SwiftShader FPS is diagnostic, never an absolute 60 FPS gate. Browser rAF intervals are a frame-pacing proxy, not GPU timings. Real GPU validation remains necessary for GDD §3 acceptance.

Standalone tool exit codes: **0 passed**, **1 failed**, **2 blocked by a missing capability**. Blocked reports still include browser evidence; recorded browser/state/sampling errors turn the result into a failure.

## Manual playtest checklist

Record build/commit identifier supplied by Lead, browser/OS/GPU, difficulty, seed, viewport, input device, debug query, and whether cheats were enabled. Perform one no-cheat Arcade run, one Casual run, and repeat critical input/flow checks with a standard gamepad. Review screenshots at native resolution and 3× scale.

### Identity, rendering and technical frame — GDD §§1–3, 14

- [ ] Green hero and red soldiers read against pine/snow backgrounds; no legacy assets with unknown licenses ship.
- [ ] 384×216 composition remains crisp at integer scales; resize/fullscreen and non-integer FIT have correct aspect ratio, centered content and no clipping.
- [ ] Bullets/telegraphs are readable amid explosions; hero silhouette stays visible. Cartoon humor and mechanical moose match the premise.
- [ ] No missing textures, magenta unknown-spawn boxes, WebGL context loss, loader failures or console errors after complete playthrough.

### Controls and player feel — GDD §§4, 11

- [ ] Arrows/WASD move and aim; Z/Space jump, X/J fire, C/K grenade, Shift/L aim-lock, Escape/Enter pause. Verify standard gamepad equivalents and analog deadzone.
- [ ] Run accelerates promptly, reverses cleanly, and does not depend on refresh rate. Validate ~105 px/s as a tuning reference with Player team.
- [ ] Short/full jump differ; coyote time (~90 ms) and pre-landing jump buffer (~120 ms) feel reliable. No accidental double jumps or ceiling/platform sticking.
- [ ] Crouch reduces hitbox and slows walking; eight-way standing/running/air aiming includes downward aerial fire. Aim-lock permits stationary aiming.
- [ ] Hold fire and tap fire differ as designed; close-range shoot invokes readable knife attack (~18 px). No stuck keys after pause, focus loss or release outside canvas.
- [ ] Grenade arc/bounce/fuse/blast works; bombs start at 10, clamp at 30, and cannot underflow.
- [ ] Arcade single hit kills; Casual takes three hits with invulnerability. Death → ~1.2 s respawn → ~2 s blinking protection; no duplicate deaths/life loss.

### Weapons, pickups and POWs — GDD §§5–6

- [ ] Pistol: unlimited ammo, 1 damage, muzzle/impact feedback. HMG: ~14/s, spread and aim sweep, 200 ammo.
- [ ] Spread: five-way ±20° fan, 40 ammo. Rocket: acceleration/gentle seeking/explosion, 6 damage, 30 ammo. Flame: short range/piercing/tick damage, 30 bursts.
- [ ] Each weapon consumes correct ammo and returns to pistol when empty. Switching during firing, death and pickup cannot leak projectiles or duplicate consumption.
- [ ] Bomb/point/life pickups apply correct capped amounts and score; letter crates and callouts match the weapon.
- [ ] POW touch/shoot frees once, salute/drop/run-left occurs; assigned item, +100 score and rescue tally happen once. Explosion does not kill POWs.

### Every enemy and boss phase — GDD §7

- [ ] Grunt patrol → LOS shout → slow 1–3 shot burst; hurt flash, crouch and panic read clearly; 3 HP / 100 score reference.
- [ ] Grenadier maintains distance, retreats under pressure, readable blinking grenade/fuse and 2–3 s cadence; 4 HP / 150 score.
- [ ] Shield blocks front shots with spark/tink; above/behind/grenade/rocket vulnerabilities work; attack window readable; 6 HP / 200 score.
- [ ] Turret tracks eight directions with ~0.5 s glowing wind-up, bursts and debris death; 12 HP / 300 score.
- [ ] Drone sine-flight and dive are avoidable, damageable and legible; 2 HP / 150 score. Paratrooper chute can be shot; landing converts cleanly into a grunt; 3 HP / 150 score.
- [ ] All threats telegraph ≥300 ms; camera-range spawning avoids premature shots; corpse/poof personality, scores and cleanup occur once.
- [ ] MOOSEZILLA entrance and camera arena lock work. Phase 1 (100–60%): antler triple spread, stomp shockwave jump and steam.
- [ ] Phase 2 (60–25%): antlers break with bonus, mouth flame sweep and spawned drone flies. Phase 3 (<25%): armor falls, exposed core, pawing telegraph and enraged charge.
- [ ] Weak points take 2× damage; HP/phase bar stays in sync. Cross each phase threshold under sustained fire, a large grenade burst and low FPS; no missed/duplicate transition.
- [ ] Death chain lasts ~3 s with flash/slow-mo/debris/head wobble, damage stops, no soft lock, then mission completion.

### Section traversal and checkpoints — GDD §8

- [ ] Prison 0–960: spawn/cell, tutorial signs, towers/fences, grunts, first HMG POW, sandbag turret.
- [ ] Forest 960–2720: height routes, one-way logs/rocks/branches, drones/ledge grenadiers, tree Spread POW and destructibles.
- [ ] Bridge 2720–4000: water kills, parachute drops, locked wave arena clears/unlocks, Rocket POW reachable.
- [ ] Outpost 4000–5760: bunkers/catwalks/wall turrets/shields/alarms, Flame POW and hidden upper-route 1UP.
- [ ] Moose Pen 5760–6720: entrance/gate, boss arena and stage end. Camera scrolls only forward, respects bounds and lock/unlock; vertical follow never exposes outside-map gaps.
- [ ] Die after each of five section checkpoints; correct respawn and camera, no bypassed encounter or repeated rescue rewards. Complete each section without warping.

### HUD, flow and audio — GDD §§9–10

- [ ] Score shows eight digits; lives, weapon/ammo/∞, bombs, rescued faces and boss HP match state through all changes. Popups/multikill bonuses never duplicate.
- [ ] Boot/preload progress, Title start/difficulty/options/credits, mission intro, HUD, Pause/resume, continue countdown (~9 s), Results and return to Title all work with keyboard/gamepad.
- [ ] Continue restores lives and resets score; unlimited continues. Let countdown expire and test input at its final moment. Pausing repeatedly cannot leave a frozen or duplicated scene/audio instance.
- [ ] Results show score, POW ×1000 bonus, accuracy, time and rank once. Wipes/fades have no input bleed-through.
- [ ] First gesture unlocks audio; music transitions at sections/menus/boss; sfx play once, varied without clipping. Master volume/mute persist as designed and mute URL produces silence.

### Effects, performance and accessibility — GDD §§3, 10–12

- [ ] Hitstop ~40–90 ms kills/~150 ms large blasts; muzzle recoil/casings, per-surface impacts, enemy fill flash and corpse arcs; dust, splash, parallax, ambient particles and explosion tiers.
- [ ] Optional CRT/scanline setting and screen-shake off work in normal combat and boss death; flash/shake do not obscure hitboxes or threat telegraphs.
- [ ] Controls screen lists actual bindings; verify remapping if offered, otherwise file a UI accessibility gap. Keyboard-only menus, visible focus, readable contrast, non-color-only cues and volume options.
- [ ] Test real GPU 60 FPS target; repeat the 20 s probe against baseline under equal conditions. Inspect worst frame spikes, boss phase transitions and explosions; check pools/memory after multiple deaths/continues/restarts.
- [ ] Tab out/in, resize during pause/intro/boss, disconnect/reconnect controller, and restart several times: no runaway loops, retained actors/audio or stuck inputs.

## Bug report template

```text
ID / title:
Severity: P0 blocker | P1 major | P2 normal | P3 polish
Owner: Engine | Player/weapons | Enemies/bosses | Levels | FX | UI/audio | Lead
GDD section / contract:
Build/commit, date, browser/OS/GPU, difficulty, seed, viewport, input:
URL query / cheats:
Repro steps (minimal, numbered):
Expected:
Actual:
Frequency (e.g. 3/3):
Screenshot / video path:
Trace / report.json / console errors path:
State before / after (scene, player, camera, boss phase):
Regression baseline / previous working build:
```

P0: cannot boot/progress, crash, lost controls. P1: core combat/flow broken or reliable soft lock. P2: localized gameplay/HUD/audio defect. P3: visual or tuning polish. Keep observed defects separate from capabilities that have not landed.

## Requests for other teams

- **Engine:** implement documented `__KBE` ready/state/cheats/press and scene URL handling; preserve readiness as “boot requested scene and registrations completed.” Add observable `state().god` (or `debug.god`) so URL god behavior is not inferred. A stable debug damage-player operation would allow an automated immunity test without importing another team's entity code.
- **Player/weapons:** `registerDebug('shotsFired', () => monotonicShotCount)` is preferred over transient projectiles; optionally expose active projectile count. State must retain player coordinates/alive/lives through death/respawn.
- **Enemies + Engine:** add `registerDebug('bossPhase', () => phaseOrNull)` (or `boss: {phase}`), plus boss max HP/position if practical. This enables phase screenshots and reliable phase combat targeting without guessing from HP. Keep boss phase values numeric 1/2/3.
- **UI/audio:** register Title, Pause, GameOver/Continue scene keys; Enter starts/confirms and Escape toggles pause. Preserve Game's Phaser paused status for deterministic flow checks. Expose remapping and shake toggle for the manual accessibility pass.
- **Lead:** no dependency requests. Route incomplete checker/typecheck results to their owners; rerun QA when Engine and UI land. Do not count conditional skips as release acceptance.

## Current run

Verified 2026-10-16 against the current `BootProbe` app; this checkout is receiving concurrent Engine changes.

- **E2E: 1 passed, 15 skipped/fixme, 0 failed** (16 total; exit 0; 2.9 min including runner startup). Passing test: HTTP/canvas dimensions/live WebGL/no console errors or pageerrors. All 15 skips have the explicit missing-`window.__KBE` reason; no gameplay or flow acceptance is claimed.
- **Visual bot: blocked, exit 2.** Chromium/Vite/report/screenshot path exercised, no console errors; no debug hook, so no level traversal or boss coverage. [Latest playthrough report](../../game/tests/artifacts/2026-10-16T17-53-51-629Z-playthrough-3417482/report.md).
- **Performance probe: blocked, exit 2.** No debug hook, so the 20 s gameplay workload has not run. Boot-only frame samples must not be used as a gameplay baseline. [Latest performance report](../../game/tests/artifacts/2026-10-16T17-53-52-238Z-perf-3417632/report.md).
- **Visual inspection:** repository `shot.mjs` exit 0, `state: null`, `console: clean`; `/tmp/kbe-qa/game.png` inspected and shows the Phaser 4.2.1 boot probe.
- **QA checks:** all E2E TypeScript files pass a separate strict `tsc --noEmit` check; all standalone `.mjs` files pass `node --check`; known-input telemetry metric assertions pass.
- **Required project checks:** latest `npm run typecheck` passes; latest `npm run check:phaser4` passes (19 source files, 0 errors/warnings). Earlier checks caught an unfinished Engine projectile import and the not-yet-created checker; both resolved through concurrent team work without QA source edits.
- **Harness setup issues resolved:** initial HTML reporter output overlapped the failure-output directory; moved HTML to ignored test artifacts. Restricted execution denied loopback sockets, so browser commands ran with execution permission. An initial E2E run was interrupted during launch investigation; the clean full run above supersedes it.

The next acceptance step is a full rerun once Engine's hook and Game scene are installed, followed by gameplay/UI coverage as their registrations arrive. The 15 capability skips remain open scope.
