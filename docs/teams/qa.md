# QA — harness, Phase C acceptance and test plan

## Phase G — Mission 2 acceptance, 2026-10-19

Mission 2 has working progression and passing structural audits, with **eight open acceptance findings** ranked at the top of [qa-bugs.md](qa-bugs.md). The two S2 findings concern BAYOU QUEEN combat visibility. Rain integration, marked pier destruction and boss-prompt layout also need correction. No S1 crash, required-wave softlock or boss-flow failure was established.

Build: `mission-2`, HEAD `2bb826759a93c78c3769345f67c67732491b72bd`, plus concurrent shared-tree polish. Environment: Linux, Chromium headless, ANGLE Vulkan **SwiftShader Device (Subzero)**, keyboard/debug input, Arcade, seed 731, viewport 1152×648, internal 384×216. Source fingerprints: `/tmp/kbe-qa/phase-g/source-sha256.txt`. QA edited only these two QA documents; the stock audit also generates its normal allowed `game/tests/artifacts/arena-audit-*.json` outputs. No git state changes, production fixes, installs or real-time bot traversal.

### Required checks

| Command | Final result | Evidence under `/tmp/kbe-qa/phase-g/` |
|---|---|---|
| `npm --prefix game run check` | PASS: typecheck; Phaser checker 113 files, 0 errors, 6 warnings | `check-final.log` |
| `npm --prefix game run audit` | PASS: reach + arenas for 1-1, 1-2, 1-3, 2-1, 2-2, 2-3; no skips | `audit-final.log`, copied `arena-audit-*.json` |
| `npm --prefix game run selftest` | PASS: 44/44 assertions, no page/state errors | `selftest-final.log` |

Initial check was 112 files / zero warnings. During concurrent work the checker gained findings for three audio-loop active-handle checks and three per-frame background tuple allocations; the final command still exits 0. These are explicitly retained as warnings, not silently called warning-free or converted into unobserved gameplay bugs. The first sandboxed arena launch hit `listen EPERM`; the permitted local-server rerun and final rerun both pass.

Mission 2 arena audit: **stilts 11/11, pump 8/8, crane 8/8, mill 11/11** members killed in view; each wave arena completes **3/3**, maxOff **0 ms**. SHELLSHOCK, MEGA-SKEETER and GATORGEDDON each reach phases **1/2/3**, maxOff **0 ms**, and expected **PartClear / PartClear / Results**. GATORGEDDON is legitimately submerged for 7.6 simulated seconds. The audit is authoritative arena acceptance. Warps in visual galleries intentionally skip prior arenas and do not establish combat completion.

### Mechanics and mission flow

`/tmp/kbe-qa/phase-g/probes.mjs` uses the same Vite/SwiftShader setup as `shot.mjs`, fixed-step advance, bounded loops and `finally` cleanup. Its final report is `probes/report.json`; **9/9 gameplay probes passed**, with no console entries.

| Probe | Observed |
|---|---|
| Real sinking log at x952, god off | Sinking visible by sample +950 ms; one life lost, 3→2; resurfaced by +4050 ms. Log state/counters and player sinking animation recorded |
| Real vent at x4104 | Two measured warning intervals **900 / 900 ms**; unprotected player dies in flame |
| Real branch at x1240, deck y304 | Crouch **0** intersections; standing **1**, god off. 18 px / 30 px body shapes preserved |
| Dirt / shallow / mud run | **105 / 75.6 / 63 px/s** |
| Dirt / shallow / mud takeoff and apex | **−318 / −286.2 / −270.3 px/s**; **53.55 / 43.13 / 38.34 px** |
| Shotgun 8 aim directions + grounded crouch | Each accepted trigger emits once and damages its 40 px target once for **4**. Real shotgun/damage service, finite ammo; eight directional targets are placed in empty air, crouch target above real ground |
| Natural airboat | 172 samples, lane y344 with bob **342–346**; normal unlocked exit is allowed |
| Natural piranha | 17 exposed leap (`attack`) samples, all inside the view; no off-screen leap observed |

Hazard isolation is explicit: unrelated ordinary enemies are removed **outside arenas** for the log/branch probes, and the branch probe filters unrelated incoming attacks so a grunt cannot kill the test body before the branch arrives. Actual branch contact uses the normal damage service with god off. This is hazard acceptance, not combat/difficulty acceptance. No arena is certified with `killEnemies`.

`/tmp/kbe-qa/phase-g/flow.mjs` drives native menus with keys held over simulation steps; **7/7 assertions pass**, `flow/report.json`, clean console:

- 1-3 clear → Results with **CONTINUE TO MISSION 2** → mission-break map/title → actual **MISSION 2: BAYOU BLACKOUT** loading screen → playable 2-1.
- Carried run verified: **score 4242, lives 2, bombs 5, spread / 40 ammo**. Native loader fetched Mission 2 packs; the main selftest separately verifies caching/retry/unlock behavior.
- 2-1 clear → native **PartClear** → 2-2 with the carried run; 2-2 PartClear → 2-3.
- 2-3 clear → **MISSION COMPLETE!** → Results → Title.
- Native **PART SELECT** lists all six parts grouped by mission and starts 2-1 as a fresh run. URL `?part=2-1`, `2-2`, `2-3` starts also work in the galleries. Clear-part cheats are used only for these authorized flow tests.

The supplementary acceptance probes intentionally fail on the filed defects: real crane clear requests rain but renders river; real GATORGEDDON slams miss/skip the marked planks; background skeeters exceed the clearance band. A center slam opens two displaced tiles and both repair after moving away and advancing 7 s. These are in `supplement/report.json`, separate from the passing main mechanics table.

### Visual gallery and readability

**Opened and inspected all three final contact sheets**, their larger review strips, and the focused comparisons. Each part's `manifest.json` maps every caption to its original full-size screenshot. Main galleries use **`game/tools/shot.mjs`** and `__KBE.sim.advance`, rendering every 50 ms so PRE_RENDER background actors keep moving. F2 removes the diagnostic overlay while retaining `debug=1` hooks. Boss state/HP controls are used for pose coverage in the **real arenas**, separately from audit acceptance.

| Inspected sheet | Panels | Coverage |
|---|---:|---|
| `/tmp/kbe-qa/phase-g/2-1/contact.png` | 45 | Landing, shallow water, forest/logs, shotgun island, stilt village/arena, mud/vents/pump/fog, turtle pond; fireflies, herons, patrol boat, wisps, lightning/gator glimpse, plane, wake/shell; high/low snap cues and releases, egg marks/volley, spin cue/release, damage tiers and death; actual log drowning/resurface and wave-3 stress |
| `/tmp/kbe-qa/phase-g/2-2/contact.png` | 51 | Skiff/fuel/container barges, branch sweep/fog, crane, paddlewheel, main/promenade/hurricane decks, boiler room, wheelhouse/foredeck; riverbank, gator pod, burning barge/blast, swarm, racing airboats, storm/lightning; laser/dive/stuck, larva marks/drop, stinger cue/fan, damage tiers/death/clear; natural radio occlusion and paired foreground diagnostic |
| `/tmp/kbe-qa/phase-g/2-3/contact.png` | 50 | Wreck shore, water/logs/roots/mud/vents, mill/wheel/arena, den approach/channel; lightning, wreck collapse, far wheel/glow, gator wake/tail/roar; lunge, missiles, conditional tail, dive/wake/ambush/burst/gatling, roll, slam, gas/flame, faster lunge, damage tiers/death/Results; actual marked-slam/pier-hole comparisons |

Readability conclusions: ordinary orange enemy bullets have readable bright cores against the dark river/storm backgrounds; foreground occlusion remains G02. Roof actors collide with the HUD/radio band (G01). Shallow-water box styling and weak mud differentiation are G06/G07. Gameplay gnats sampled below the reserved band; visible background skeeters reach **opaque-pixel y57** (G08). Boss silhouettes, phase art and marked attacks are present; GATORGEDDON's prompt covers its bar (G05). Fog edges and SHELLSHOCK art details are concurrent polish areas, not duplicate bugs.

The forced-weather and hidden-foreground comparisons are explicitly labeled fixtures; they are not evidence of shipped behavior. Some low-contrast far-water moments are partially concealed by real scenery; the sheets retain that context rather than replacing the backdrop.

### Performance: serial 10-second samples

All samples use SwiftShader, 1152×648, god on, stationary firing in the named real map region after setup/warmup. Each lasts approximately **10.0 s** and collects about **601 rAF frames**. No other QA browser sample runs concurrently. `uptime` was recorded immediately before/after each window; load is **1 / 5 / 15 minutes**, not a CPU utilization percentage. Reports preserve raw frame times, displayed game FPS, scene/player/arena/boss/weather state and renderer.

| Workload | Measured rAF FPS | Mean displayed FPS / min | p95 frame | Load before → after |
|---|---:|---:|---:|---|
| 2-2, storm-front trigger at x4200 | **60.04** | 60.49 / 60 | 16.8 ms | **2.89 / 2.80 / 2.51 → 2.52 / 2.72 / 2.49** |
| 2-2, explicit rain fixture on same real map | **60.07** | 59.99 / 59 | 16.8 ms | **1.14 / 2.30 / 2.37 → 1.26 / 2.29 / 2.37** |
| 2-3, storm + GATORGEDDON phase 3 | **60.07** | 60.70 / 60 | 16.7 ms | **2.80 / 2.77 / 2.51 → 4.05 / 3.05 / 2.60** |
| 2-1, stilts wave 3 (four members alive) | **60.10** | 60.19 / 59 | 16.7 ms | **2.08 / 2.66 / 2.49 → 1.76 / 2.57 / 2.46** |

**The integrated 2-2 sample does not contain rain because of G03.** The separate `fxtest=rain` sample explicitly supplies the intended heavier workload and renders 32 rain streaks. The 2-3 sample stays in phase 3/storm with the player alive; the stilts sample stays in wave 3. `killVisible` is used only to select that stress wave, not to assert arena acceptance. An earlier stilts sample remained on wave 2 and is retained as setup history rather than substituted for wave 3.

Evidence: `perf/report.json`, `perf/stilts.json`, `perf/storm-rain.json`, `perf.log`, `perf-stilts.log`, `perf-rain.log`. This establishes approximately 60 FPS for the sampled stationary workloads, not a long-session or real-GPU playthrough.

### Console, concurrent changes and reproducibility

Final healthy background captures for all three parts, native flow and performance runs have no browser exceptions, missing-texture or missing-sound warnings. Captured `__KBE.state().errors` arrays are empty. `audio.unknown` / `audio.bgUnknown` are checked in the saved states. Early `pond_shell` and `barge_blast` mapping warnings disappeared during UI/Audio's concurrent polish; no duplicate issue was filed. Invalid attempts to call event-only `barge_blast`/`gator_roar` as independent cheats are harness diagnostics, not missing-game-content findings.

Host `ERR_NETWORK_CHANGED` interrupted an early 2-3 module load and one mechanics start; another mechanics run recovered loads but retained console resource errors. Those attempts are preserved in `probes/report-network-observed.json`, `probes-network-observed.log` and the failed-start logs, and are not represented as clean console acceptance. The final full mechanics rerun passes 9/9 with zero console entries. The native flow, clean per-part captures and engine selftest provide independent healthy-load coverage. No audible mix, physical gamepad or human Arcade difficulty sign-off is claimed.

Reproduce from repository root; each browser script closes its browser/server in `finally`, and each verification attempt is bounded below ten minutes:

```sh
npm --prefix game run check
npm --prefix game run audit
npm --prefix game run selftest
python3 /tmp/kbe-qa/phase-g/gallery.py 2-1   # also 2-2 and 2-3
python3 /tmp/kbe-qa/phase-g/backgrounds.py 2-1  # also 2-2 and 2-3; adds timed moment captures
node /tmp/kbe-qa/phase-g/probes.mjs
node /tmp/kbe-qa/phase-g/flow.mjs
node /tmp/kbe-qa/phase-g/supplement.mjs
node /tmp/kbe-qa/phase-g/storm-confirm.mjs
node /tmp/kbe-qa/phase-g/perf.mjs storm
node /tmp/kbe-qa/phase-g/perf.mjs storm-rain
node /tmp/kbe-qa/phase-g/perf.mjs gator-phase3
node /tmp/kbe-qa/phase-g/perf.mjs stilts
node /tmp/kbe-qa/phase-g/contacts.mjs 2-1  # also 2-2 and 2-3
```

Scratch gallery generators overwrite their primary manifest; the final combined manifests additionally include mechanic/stress/diagnostic screenshots. Keep the existing final manifests for this review's exact panel inventory. Single captures can be reproduced directly with `shot.mjs` using the URLs and steps in each bug. Servers select free loopback ports, so substitute their reported port for 8080. No `cd` alias, pattern-based kill or git operation is used.

---

Owner: QA. Scope: `game/tests/**`, `game/playwright.config.ts`, this document. No source, dependency, or git state changes.

## Running the harness

Commands work from any directory. Use the installed CLI directly if npm exec is slow resolving its executable. Playwright owns a fresh Vite instance on a computed free loopback port, or the explicit `KBE_PORT`, with `reuseExistingServer: false`. The runner passes its chosen port to workers and the server. Test and HTML output use a unique `KBE_QA_RUN` directory. Every QA Vite server disables HMR and uses `watch: null`, so other agents’ saves do not reload the page. One Chromium worker avoids SwiftShader contention. Every browser process prepends `/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu` to `LD_LIBRARY_PATH` and uses `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Viewport: 1152×648, internal canvas: 384×216.

```bash
npm --prefix /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game exec -- playwright test --config /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/playwright.config.ts
node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/node_modules/@playwright/test/cli.js test --config /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/playwright.config.ts

# Single suite / headed investigation (append to the previous command):
# --grep 'camera'
# --headed

node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/bot/playthrough.mjs
node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/bot/playthrough.mjs --step 128 --capture-every 256 --walk-ms 600 --weapon hmg --boss-ms 150000

node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/perf/probe.mjs
node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tests/perf/probe.mjs --baseline /absolute/path/to/prior/perf/report.json

npm --prefix /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game run typecheck
npm --prefix /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game run check:phaser4
```

No installs or new package scripts are needed (`test:e2e` already exists). In a restricted runner, local HTTP sockets and Chromium process launching need the runner's execution permission.

Failure screenshots and retained traces: `game/tests/artifacts/<timestamp>-e2e-<pid>/results/`. HTML E2E report: the sibling `html/index.html` (kept separate because Playwright rejects nested reporter/test output directories). Standalone reports: `game/tests/artifacts/<timestamp>-<kind>-<pid>/report.md` and `report.json`, with relative screenshot links. All are covered by existing ignore rules. Open traces with the installed Playwright CLI `show-trace <trace.zip>`.

Visual verification via the repository's existing launcher (run from any directory):

```bash
LD_LIBRARY_PATH=/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH} node /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game/tools/shot.mjs --out /tmp/kbe-qa/game.png --query 'scene=Game&fast=1&mute=1&god=1' --steps '[{"hold":"ArrowRight","ms":1000},{"press":"z"}]'
```

Create `/tmp/kbe-qa` before that screenshot command. Standalone tools create their artifact directory automatically and use independent random-port Vite servers, so they do not contend with the E2E port.

## Automated coverage and capability gates

- `boot.spec.ts`: successful HTTP response, visible 384×216 canvas, live WebGL context, no console errors/pageerrors, and Engine readiness. Rendering/error assertions always run, including during boot-probe-only development.
- `hooks.spec.ts`: `game`, `version`, `state`, `press`, all eight cheat functions (including `killEnemies` and `hurt`); required state keys and player field types; `scene=Game`, `fast=1`, `x=160`, `mute=1`, observable `god=1`, and timed virtual input release.
- `gameplay.spec.ts`: physical right input, jump/landing, firing observations, forward camera movement and twelve monotonic camera samples while moving left, paused movement freeze and resumed input.
- `flow.spec.ts`: Title → Game → Pause → resume, kill → observable death → respawn with exactly one life lost, and exhaustion of lives → actual GameOver/Continue UI → fresh lives and zero score.

Absent `__KBE` produces a named `fixme` after 1.5 s; an installed hook must become ready within 15 s. Feature gates use absent scene registrations, a null player, missing cheat functions, or absent shot/god telemetry. They never skip a feature because its action failed. Contract assertions fail on malformed installed hooks. GameOver is conditionally fixed until its scene is registered. Every test attaches browser errors; the boot tests assert an empty list. The report must list all skips as untested scope, not acceptance.

Current firing observability recognizes `state().projectiles` (number or array) or monotonic `state().shotsFired`. God flag observability recognizes `state().god`, `state().debug.god`, or `game.registry.get('god')`. These fields and `hurt(n)` are now installed contracts. `damage.spec.ts` verifies god immunity, Arcade/Casual normal damage, Casual i-frames, `kill()` bypass, and `killEnemies()` preserving the player. `fast=1` is checked with direct Game boot and no active intro; a before/after intro duration comparison remains manual.

The bot enables god mode, requests HMG if `cheats.give` exists (`--weapon` overrides), holds fire, warps through x=64…6719 in 256 px steps, walks each step, samples states/FPS at ~100 ms, captures each observed 512 px camera threshold and boss phase, and records console errors and camera regressions. A step jumping across multiple capture thresholds yields one screenshot at the observed position; use `--step` ≤ `--capture-every`. Actual warp positions are checked. Camera monotonic comparisons reset after intentional warp snaps; the physical E2E camera check is authoritative. It waits beyond HP zero for the death sequence, observes `defeated`, walks left if the far-right stage-end gap prevents completion, and records stage clear. This recovery is reported as KBE-QA-L01, not silently accepted. It records incomplete boss coverage as blocked. Warp coverage does not prove that a player can traverse platforms, arena gates or hazards. Phase transitions need `bossPhase` or `boss.phase`; HP alone is not used to invent phase transitions. Boss dwell defaults to 150 s and total traversal budget to 240 s; extend `--boss-ms`/`--max-ms` for longer runs.

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
Severity: S1 crash/softlock | S2 major | S3 localized functional defect | S4 polish
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

S1: cannot boot/progress, crash or reliable softlock. S2: major combat/flow/readability defect. S3: localized gameplay/HUD/audio or integration defect. S4: visual, lifecycle or tuning polish. Keep observed defects separate from capabilities that have not landed.

## Phase A requests (historical; superseded by Phase C below)

- **Engine:** implement documented `__KBE` ready/state/cheats/press and scene URL handling; preserve readiness as “boot requested scene and registrations completed.” Add observable `state().god` (or `debug.god`) so URL god behavior is not inferred. A stable debug damage-player operation would allow an automated immunity test without importing another team's entity code.
- **Player/weapons:** `registerDebug('shotsFired', () => monotonicShotCount)` is preferred over transient projectiles; optionally expose active projectile count. State must retain player coordinates/alive/lives through death/respawn.
- **Enemies + Engine:** add `registerDebug('bossPhase', () => phaseOrNull)` (or `boss: {phase}`), plus boss max HP/position if practical. This enables phase screenshots and reliable phase combat targeting without guessing from HP. Keep boss phase values numeric 1/2/3.
- **UI/audio:** register Title, Pause, GameOver/Continue scene keys; Enter starts/confirms and Escape toggles pause. Preserve Game's Phaser paused status for deterministic flow checks. Expose remapping and shake toggle for the manual accessibility pass.
- **Lead:** no dependency requests. Route incomplete checker/typecheck results to their owners; rerun QA when Engine and UI land. Do not count conditional skips as release acceptance.

## Phase A baseline (historical)

Verified 2026-10-16 against the current `BootProbe` app; this checkout is receiving concurrent Engine changes.

- **E2E: 1 passed, 15 skipped/fixme, 0 failed** (16 total; exit 0; 2.9 min including runner startup). Passing test: HTTP/canvas dimensions/live WebGL/no console errors or pageerrors. All 15 skips have the explicit missing-`window.__KBE` reason; no gameplay or flow acceptance is claimed.
- **Visual bot: blocked, exit 2.** Chromium/Vite/report/screenshot path exercised, no console errors; no debug hook, so no level traversal or boss coverage. [Latest playthrough report](../../game/tests/artifacts/2026-10-16T17-53-51-629Z-playthrough-3417482/report.md).
- **Performance probe: blocked, exit 2.** No debug hook, so the 20 s gameplay workload has not run. Boot-only frame samples must not be used as a gameplay baseline. [Latest performance report](../../game/tests/artifacts/2026-10-16T17-53-52-238Z-perf-3417632/report.md).
- **Visual inspection:** repository `shot.mjs` exit 0, `state: null`, `console: clean`; `/tmp/kbe-qa/game.png` inspected and shows the Phaser 4.2.1 boot probe.
- **QA checks:** all E2E TypeScript files pass a separate strict `tsc --noEmit` check; all standalone `.mjs` files pass `node --check`; known-input telemetry metric assertions pass.
- **Required project checks:** latest `npm run typecheck` passes; latest `npm run check:phaser4` passes (19 source files, 0 errors/warnings). Earlier checks caught an unfinished Engine projectile import and the not-yet-created checker; both resolved through concurrent team work without QA source edits.
- **Harness setup issues resolved:** initial HTML reporter output overlapped the failure-output directory; moved HTML to ignored test artifacts. Restricted execution denied loopback sockets, so browser commands ran with execution permission. An initial E2E run was interrupted during launch investigation; the clean full run above supersedes it.

The next acceptance step is a full rerun once Engine's hook and Game scene are installed, followed by gameplay/UI coverage as their registrations arrive. The 15 capability skips remain open scope.


## Phase C harness and commands

Use the existing installed dependencies; no install, game-source fix, staging or commit is required.

```bash
# Explicit port override is optional. Default: computed free port.
KBE_PORT=44991 node game/node_modules/@playwright/test/cli.js test --config game/playwright.config.ts
node game/tests/bot/playthrough.mjs --weapon hmg
node game/tests/bot/phase-c.mjs --mode systems
node game/tests/bot/phase-c.mjs --mode enemies
node game/tests/bot/phase-c.mjs --mode arenas
node game/tests/bot/phase-c.mjs --mode boss
node game/tests/bot/phase-c.mjs --mode flow
node game/tests/bot/phase-c.mjs --mode investigations
node game/tests/bot/phase-c.mjs --mode sections --difficulty arcade --section-ms 40000
node game/tests/bot/phase-c.mjs --mode sections --difficulty casual --section-ms 35000
node game/tests/bot/phase-c.mjs --mode audio
node game/tests/bot/phase-c.mjs --mode ui
node game/tests/bot/phase-c.mjs --mode ui-results
node game/tests/perf/probe.mjs
```

`phase-c.mjs` saves checks, scenario states, real event traces, screenshots, console errors and metrics. `systems` tests five weapons in all eight directions, finite-ammo fallback, grenade, knife, crouch, pickups/POW/props, both difficulty damage rules, hazards and drop-through, animation validity and FX/edge shake. `enemies` cycles all six opt-in enemy fixtures. `arenas` uses actual enemy deaths to isolate wave sequencing. `boss` uses labeled HP control to sample each attack phase and the real delayed-defeat/stage-end flow. `flow` waits for actual game-over state before confirming Continue and also checks timeout and fallback pause. `investigations` isolates route geometry, foreground visibility, map props and low crates. `audio` checks the installed debug state and unlock/music/mute behavior.

`sections` uses only physical movement/fire/jump/grenade after `x=` checkpoint setup, starting with the default pistol. It records max position, lives, event traces and route completion. A report status of passed means the observation ran without runtime/transport errors; each case's `completed` field separately states whether it reached its target. Bot failure to finish is not automatically a level defect. `--full --god --section-ms <ms>` is available for a physical whole-route observation; the normal playthrough tool intentionally uses warp coverage and does not prove end-to-end traversability.

Keep performance probes isolated from other browser workloads. Other diagnostic modes may run concurrently on their private ports; their startup/screenshot frame spikes are not hardware performance regressions.

## Phase C findings and acceptance (final)

[Triaged bugs and top 10 fun/feel improvements](qa-bugs.md). **8 open findings — S1 0, S2 3, S3 3, S4 2.** Owners: Engine 2, Enemies 3, Levels 2, UI/audio 1. The S2 findings are Continue Enter leaking into Pause (Engine), the right-edge boss stage-end gap (Levels), and the opaque boss-bar frame hiding its fill (UI).

The zero-frame animation issue initially reproduced, then caused an S1 Title crash when UI registered. Engine fixed it concurrently via `core/anims.ts` and Preload's atlas-name frame builder; fresh native UI boot verifies **zero empty animations** and correct countdown/rank frames. E01 is closed, with its crash trace retained. QA made no gameplay fix.

The camp-camera failure is refuted. Outpost's entrance is passable using the intermediate landing; a straight-right bot stalls there. Bottom-row crates are intentionally a crouch/grenade interaction. A suspected foreground-sign occlusion was respawn transparency: the post-invulnerability shot shows Knotz above the sign. An off-view bridge paratrooper freezes, but required on-screen members descend and both wave controllers unlock when cleared.

The UI scenes registered during finalization, so acceptance was extended. Title, Difficulty, Options/CRT/shake persistence, Controls, Credits, Intro, HUD values, native Pause/resume, Continue digits/life reset, native Game Over timeout→Title, boss defeat→Results and Results→Title were exercised. Continue's unintended Pause is retained as a failure; the native UI probe explicitly recovers with Escape to continue checking other flows. Results data is correct: score 17345, 2 POWs ×1000, total 19345, rank C. An early rank screenshot preceded its reveal tween; the final image shows the rank correctly.

| Phase C run | Result | Evidence |
|---|---|---|
| **Final E2E with native UI** | **18 passed, 1 failed, 0 skipped**, 19 total. Failure: Continue expected Game, received Pause (E03) | [HTML report](../../game/tests/artifacts/2026-10-16T19-12-10-373Z-e2e-3498437/html/index.html) |
| Full god/warp bot | **Passed**, phases 1/2/3, delayed defeat and stage clear; L01 recovery recorded | [Report](../../game/tests/artifacts/2026-10-16T19-03-09-069Z-playthrough-3489678/report.md) |
| Systematic weapons/damage/props/hazards/FX | **69/70 initially passed**; zero-animation failure later fixed and verified separately | [Initial report](../../game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/report.md) |
| Six enemy fixtures | **8/8 passed**, clean browser rerun | [Report](../../game/tests/artifacts/2026-10-16T18-58-51-268Z-phase-c-enemies-3487717/report.md) |
| Wave arenas | **2/2 passed** after actual member deaths via killEnemies | [Report](../../game/tests/artifacts/2026-10-16T18-54-03-392Z-phase-c-arenas-3483352/report.md) |
| Boss fixture | **5/5 passed**, attack samples, delayed single defeat and actual stage_end trigger | [Report](../../game/tests/artifacts/2026-10-16T18-54-22-293Z-phase-c-boss-3483699/report.md) |
| Fallback flow before native UI | **4/4 passed** | [Report](../../game/tests/artifacts/2026-10-16T18-56-24-669Z-phase-c-flow-3485360/report.md) |
| Geometry/visibility/low-crate investigation | Outpost passable; sign candidate refuted; crouch crate interaction confirmed | [Report](../../game/tests/artifacts/2026-10-16T19-00-20-810Z-phase-c-investigations-3488401/report.md) |
| Non-god physical Arcade sections | 5 observed; only pen approach completed; not full route acceptance | [Report](../../game/tests/artifacts/2026-10-16T18-53-00-961Z-phase-c-sections-3482314/report.md) |
| Non-god physical Casual sections | Camp, forest and pen approach completed; bridge/outpost incomplete | [Report](../../game/tests/artifacts/2026-10-16T18-55-19-904Z-phase-c-sections-3484538/report.md) |
| AudioService | **4/4 passed**: gesture unlock, gameplay keys/no unknowns, boss crossfade, URL mute after unlock | [Report](../../game/tests/artifacts/2026-10-16T19-04-21-402Z-phase-c-audio-3490616/report.md) |
| Native UI smoke | Menus/intro/pause/timeout/digits/global animation repair passed; E03 failed. Its early Results-exit timing was superseded by the next focused run | [Report](../../game/tests/artifacts/2026-10-16T19-12-07-148Z-phase-c-ui-3498072/report.md) |
| Native HUD/Results functional check | **4/4 passed**; HUD values, actual stage clear, Results tally and return | [Report](../../game/tests/artifacts/2026-10-16T19-14-04-759Z-phase-c-ui-results-3501820/report.md) |
| Final native HUD/Results visual check | **4/5 passed**, sole failure: opaque boss frame (U01); rank reveal inspected | [Report](../../game/tests/artifacts/2026-10-16T19-15-51-181Z-phase-c-ui-results-3503979/report.md) |
| Pre-UI isolated 20 s performance | Avg 60.44 FPS, min 59; rAF p95 16.7 ms, max 16.8 ms; zero >50 ms spikes. Used as same-machine baseline for the final HUD probe | [Baseline](../../game/tests/artifacts/2026-10-16T19-00-57-668Z-perf-3488723/report.md) |
| Final project checks | Typecheck passed; Phaser checker **85 files, 0 errors, 0 warnings** | [Logs/source fingerprint](../../game/tests/artifacts/phase-c-2026-10-16-summary/acceptance-summary.json) |

All QA `.mjs` launchers pass `node --check`; documentation evidence links were checked. Earlier fixed-port/cross-warp assumptions, transient `ERR_NETWORK_CHANGED`, and probe mistakes are retained as history and superseded by the linked runs. Native menu keys now have 80 ms holds and allow the input's arming interval; the remaining Continue failure is reproduced by both E2E and the deliberate 100 ms native UI probe.

Testing used keyboard and SwiftShader in a changing shared checkout. Warp coverage does not prove end-to-end traversability; incomplete physical section runs are explicitly recorded. Native UI checks are not gamepad or listening/mix acceptance. Real-GPU 60 FPS, physical gamepad and a long-session soak remain unverified. The summary includes run outcomes and a handoff-time source hash manifest; it does not imply all runs used one frozen source revision. QA used no git state-changing command and edited only owned paths.


Final native-HUD performance rerun: **passed**, average **60.43 FPS**, min **59**, rAF p95 **16.7 ms**, max **16.8 ms**, **0** frames over 50 ms. Average FPS change versus the same-machine pre-UI baseline: **-0.01%**. [Final performance report](../../game/tests/artifacts/2026-10-16T19-18-08-384Z-perf-3505986/report.md). The relative result does not establish real-GPU 60 FPS acceptance. The [summary](../../game/tests/artifacts/phase-c-2026-10-16-summary/acceptance-summary.json) now includes final native UI, visual defects, 18/1 E2E status, current bug counts and refreshed source hashes.


## Phase D final verification

The current release verdict, per-bug statuses, fresh screenshots and run accounting are in [qa-bugs.md](qa-bugs.md). Phase A/C results above are historical and are superseded by that final verification.

Final-pass harness changes stay in QA ownership: the systems probe expects the authored 18 px crouch body; the HMG playthrough no longer walks left after defeating the boss; failed-request URLs/times are attached to E2E results without filtering console errors. `KBE_QA_NETLOG=/tmp/kbe-qa/<name>.json` optionally enables Chromium NetLog. No E2E retries, E2E timeout increases, network-error suppression, or game-code fix were added. The playthrough ending now waits for the actual Results reveal instead of a fixed sleep.

Additional focused launchers:

```bash
node game/tests/bot/final-verification.mjs
npm --prefix game run build
node game/tests/bot/production-smoke.mjs
```

`final-verification.mjs` repeats the original Phase C fixtures, checks the boss corner against the **old silhouette rectangle** (the new core rectangle is intentionally damageable), samples the 88 px off-view descent band, and monitors HUD GO visibility through the real boss defeat/stage-clear events. `production-smoke.mjs` uses installed Vite preview to serve dist, starts through Title with real keyboard input, attempts production URL/API cheats without debug, and observes 20 seconds of gameplay with WebAudio running. Neither launcher changes gameplay files.

Final recorded outcomes: consecutive E2E **17/19, 18/19, 17/19**; flow ×5 **14/15**. These are failed runs with retained traces. Host network churn is timestamp-correlated; a required-asset failure also exposes the new conditional S1 E04. All eight original findings are resolved. The detailed verdict and evidence in qa-bugs.md remain authoritative.


## Phase H — H2 visual and regression review (2026-10-20)

Report only: three S4 findings are at the top of [qa-bugs.md](qa-bugs.md): Buzzard crash canvas crop, airboat sink outside the locked viewport, and Buzzard fire recovery frame omitted. No production code/art changes or git state changes. QA modified only these two QA documents; all review scripts, exports and evidence live under `/tmp/kbe-qa/phase-h/`.

### Baseline and method

Starting shared HEAD: `df3d3c726d65b6245d75cf1070f8e323f6a58830`. It adds H2 briefs after the requested H1 target `97d8e5c`. Since other teams were editing shared art, QA exported **97d8e5c** with read-only `git archive` into `/tmp/kbe-qa/phase-h/h1/`, reusing the installed node_modules through a scratch symlink. Every visual, gameplay and browser audit here uses that fixed source. The Phase G comparator is **3704ab1** (`enemy-diff.txt`); enemy tuning, engine selftest and mission loader/recovery sources are unchanged across that range. The final live typecheck was at `f9736c3ec603eaca8c0ad94fb93c175b6f259337`; subsequent H2 art is not accepted by this H1 report.

Read PHASE-H, ART-STYLE, LESSONS, ARCHITECTURE, PHASER4-RULES and previous QA notes. Reused the repository's shot/Vite/Chromium setup: Linux, ANGLE Vulkan SwiftShader, Arcade, seed 731, 1152×648 viewport, 384×216 canvas. One QA browser at a time, serial pages/captures, fixed-step `__KBE.sim.advance`; no real-time bot traversal. Each invocation had a 580 s cap and the attempts stopped within that budget. Browser/server cleanup is in each scratch harness's `finally`; no review server or browser remains running.

### Required verification results

| Check | Result | Evidence |
|---|---|---|
| Pinned H1 `npm --prefix /tmp/kbe-qa/phase-h/h1/game run check` | PASS: typecheck; 115 files, 0 errors, 0 warnings | `check-h1.log` |
| Required final live `npm --prefix game run check` | PASS: typecheck; 115 files, 0 errors, 0 warnings | `check-live-final.log` |
| Pinned H1 `npm --prefix /tmp/kbe-qa/phase-h/h1/game run audit` | PASS: reach + arena audits for all six parts, no skips | `audit-h1.log`; exported `h1/game/tests/artifacts/arena-audit-*.json` |
| Full pinned `npm --prefix /tmp/kbe-qa/phase-h/h1/game run selftest` | **NOT GREEN**: 44 PASS assertions then 30 s wait timeout after mission load-error → Title; the later reload/resume assertions did not run | `selftest-h1.log` |
| Isolated mission diagnostic, unchanged assertions/timeouts plus logging | 18 PASS / 0 FAIL in its log, including reload/resume/stale/blocked storage | `selftest-missions-diagnostic.log`; scratch `h1/game/tools/selftest-diagnostic.mjs` |
| One unmodified full-selftest rerun | **NOT GREEN**: initial readiness wait timed out before any assertion | `selftest-h1-final.log` |

No successful full-selftest exit is claimed. The isolated diagnostic and final rerun's tool sessions ended with transport status 143; no exit-marker file was returned, although their scripts logged their respective all-passed/failure summaries. The original full run reported a failed selftest. After these bounded attempts QA stopped retrying. The failure is not established as an H1 gameplay defect: the tested engine/loader code is unchanged, ordinary review starts are healthy, and isolated mission assertions pass. The cause remains unresolved. Engine/Lead should reproduce this before sign-off; do not convert the isolated 18-pass log into whole-suite acceptance.

Arena coverage: bridge/bunker/guncar/labgate/stilts/pump/crane/mill finish all authored waves with every member killed in view and **maxOff=0 ms**. All six bosses reach phases 1/2/3 and expected PartClear/Results. The audit, rather than presentation warps/direct hits, establishes progression acceptance.

### Visual, state and regression evidence

Opened and inspected: `context-contact-0.png` (17 natural map panels), `fixture-contact-0.png` through `fixture-contact-5.png`, `arena-contact-0.png` / `arena-contact-1.png`, seven `roster-<kind>-1x-4x.png` sheets beside Knotz and a grunt, all seven per-kind tag sheets, the Buzzard/hound/hopper/airboat/piranha/gnat death sequences, `hurtbox-contact-0.png`, `ui-contact-0.png`, `transition-contact-0.png`, `wash-contact-0.png`, `perf-contact-0.png`, and each specific screenshot cited in the H findings. The original Lead hopper/airboat/Buzzard/small/soldier reference sheets were also inspected. New art is visibly more articulated, with readable crew/pilot/animal-mech identity and distinct deaths.

`review-contexts.json` records the actual query, camera, actors and state for every natural capture. `review-fixtures.json` records per-state pose/death traces. All hopper tongue frames, piranha leap/bite/fall/splash and gnat dive/recovery frames appear; H03 is the omitted Buzzard firing frame. Live actors were mirrored separately in `facing-clean-*` and other fixture shots. Hound's separate helmet layer does detach during its tumble; it is not an unresolved placeholder.

`mechanics.json`: hopper cue **500 ms**, drawn/actual reach **63 / 63.35 px** at the sampled near-peak, visual cable on the five-pixel collision strip, nonlethal shotgun displacement **9.34 px**. Airboat fires **3** shots at ~170 ms intervals after its ~600 ms cue and spawns two leapers. Buzzard has a ~700 ms strafe cue and five shots; hound cue **450 ms**. These clocks, HP, damage and scoring remain consistent with the Phase G source. The requested H1 hurtbox adjustments are small: hound 30×18→34×21; Buzzard 66×26→70×30; Bayou body rectangles unchanged. Debug box screenshots and `hurtboxes.json` support body fit, with appendages outside core body boxes.

`focused.json`: actual pump/crane wave-2 Buzzards, stilts/mill hopper contexts and their deaths, damaged art/smoke and terrain wash. `airboat-death.json` reproduces the new sink ending on the real crane wave-1 boat. `recheck.json` contains a clean controlled crash over solid ground: god off, player remains alive at `(420,336)`, **3 lives**. An earlier crash probe teleported the player above a gap and drowned; it is a rejected setup, not crash damage.

Rotor wash on actual mud/wood/metal surfaces, boat wake, machine breakup and damaged-machine smoke appear. Snow/mud/water recipes were also explicitly injected/rendered (`recipe-wash-*`); these are recipe fixtures, not proof of an authored helicopter flying low over every material. The scratch capture named `wash-snow` actually probes a wooden train deck, and the high `wash-water` helicopter emits no wash because it is outside the 90 px surface range. Neither filename is treated as natural snow/water integration acceptance.

Fresh 1-2 and 2-1 starts and actual native PartClear 2-1→2-2 have **zero title/radio overlap** at 50 ms samples. Fresh starts survive five idle seconds with god off; the briefing types after the title leaves. The first two transition attempts pressed confirm before the native tally was ready; `transition.json` and `transition-confirmed-*` are the accepted two-confirm flow, not those premature attempts. The next-part diagnostic overlay was retained in these accepted transition shots.

All five sound keys (`buzzard_gun`, `heli_crash`, `hopper_land`, `mech_pop`, `airboat_sink`) are present in the loaded audio cache and observed in corresponding gameplay call logs. Review logs contain **no missing keys, unknown keys, warning entries or page exceptions**. No listening/mix judgment is claimed. Palette scan: no off-palette opaque pixels, alpha only 0/255. No duplicate global animation names among **696** sprite tags. Every reviewed death has at least eight frames; durations are 600 ms small mechs, 800 ms hound, 1200 ms Buzzard/airboat.

Coverage limits: the late optional guncar wave-2 screenshot boot timed out after all seven hurtbox captures had succeeded; no H1 error was logged. The delayed guncar Buzzard was not obtained in a clean dedicated photograph. Its arena passes the stock audit; the other 1-2 Buzzards and actual 2-1/2-2 arena Buzzards were photographed. Lurker flame/explosion death variants were inspected in atlas metadata/art, not every variant forced in a natural encounter. Out-of-scope H2 boss legs, MEGA-SKEETER, hopper hop poses and background actors were not filed against.

### Performance: same-browser baselines and qualified stress results

Stationary 10 s rAF windows, one QA browser at a time; this is not bot playthrough testing. Table FPS is computed from frame count / elapsed wall time, while displayed game FPS is separate. Full raw timings, renderer, workload states and host `uptime` load triples are retained in `performance.json` / `performance-corrected.json`.

| Window | rAF FPS | Mean displayed FPS | p95 / p99 frame |
|---|---:|---:|---:|
| baseline-before | 60.02 | 58.19 | 16.7 / 16.8 ms |
| mixed-2-2 | 47.97 | 45.01 | 49.9 / 83.3 ms |
| baseline-after | 58.04 | 52.13 | 16.8 / 50.0 ms |
| baseline-before-corrected | 57.97 | 55.33 | 16.8 / 49.9 ms |
| buzzard-1-2-corrected | 60.11 | 59.69 | 16.7 / 16.8 ms |
| gnat-kills-corrected | 59.93 | 58.60 | 16.7 / 16.8 ms |
| baseline-after-corrected | 60.07 | 59.20 | 16.7 / 16.8 ms |

The initial mixed 2-2 stress fixture retains **1 Buzzard, 3 airboats and 4 gnats** on the real map by a camera lock and supplemental spawns. It is an explicitly augmented stress case, not a claim that this exact combination naturally spawns together. It misses the 60 FPS target at **47.97**, with same-session baseline **60.02 before / 58.04 after**. Host load rises substantially (full triples in the report; one-minute load about 18→38 across the session). This remains a performance acceptance concern, not an attributed H1 regression or a measured quiet-host result.

The corrected session holds the authored 1-2 Buzzard inside view through the entire window: **60.11 FPS**. Four-gnat death bursts fire 19 times, **76 actual kills**, at **59.93 FPS**; its baseline is **57.97 before / 60.07 after**. The initial 1-2 window had already lost its fly-by Buzzard, and the initial gnat pulse was limited by three surviving gnats; those two incorrect workloads are retained in the raw history but excluded from the acceptance table. No repeat mixed sample was used to replace the slower result. Displayed FPS smoothing includes warmup history; rAF intervals are not GPU timings. No quiet-host 60 FPS sign-off is claimed.

### Reproduction and requests

From repository root (every browser invocation serial, 580 s cap):

```sh
node /tmp/kbe-qa/phase-h/review.mjs contexts
node /tmp/kbe-qa/phase-h/review.mjs fixtures
node /tmp/kbe-qa/phase-h/mechanics.mjs
node /tmp/kbe-qa/phase-h/focused.mjs
node /tmp/kbe-qa/phase-h/recheck.mjs
node /tmp/kbe-qa/phase-h/transition.mjs
node /tmp/kbe-qa/phase-h/airboat-death.mjs
node /tmp/kbe-qa/phase-h/hurtboxes.mjs
node /tmp/kbe-qa/phase-h/perf.mjs
node /tmp/kbe-qa/phase-h/perf-corrected.mjs
npm --prefix /tmp/kbe-qa/phase-h/h1/game run check
npm --prefix /tmp/kbe-qa/phase-h/h1/game run audit
npm --prefix /tmp/kbe-qa/phase-h/h1/game run selftest
npm --prefix game run check
```

Requests: **Enemies A** H01/H03; **Enemies B** H02 plus hopper contrast/gnat wing readability; **Engine/Lead** resolve or characterize the full-selftest timeouts; **FX/Lead** remeasure/profile the mixed fixture under a quiet, comparable host load. No implementation fix was made by QA.
