## Phase G — Mission 2 acceptance (2026-10-19)

**Verdict: functional progression passes; visual/combat acceptance needs fixes.** Ranked open findings are below. No S1 crash or arena stall was established. Judged against `docs/MISSION2.md` and `docs/LESSONS.md`, especially §§2–5.

Reviewed branch `mission-2`, HEAD `2bb826759a93c78c3769345f67c67732491b72bd`, with concurrent polish present in the shared working tree. Chromium/ANGLE Vulkan SwiftShader, Linux, keyboard/debug input, Arcade, seed 731, 1152×648 viewport / 384×216 game. All coordinates below are native pixels. Screenshot paths are absolute and retained under `/tmp/kbe-qa/phase-g/`. See `qa.md`'s Phase G section for coverage, caveats and reproduction commands.

| Rank / ID | Severity | Owner | Finding |
|---|---|---|---|
| 1 · KBE-QA-G01 | S2 | Engine + Levels | BAYOU QUEEN roof threats sit behind the HUD and Hazel's radio |
| 2 · KBE-QA-G02 | S2 | Levels | Opaque moving foreground crosses enemies and firing lanes |
| 3 · KBE-QA-G03 | S3 | Levels + FX | Storm-front rain is requested but suppressed by the river ambience zone |
| 4 · KBE-QA-G04 | S3 | Levels; coordinate Enemies A | GATORGEDDON pier holes miss the marked slam point; edge slams open none |
| 5 · KBE-QA-G05 | S3 | UI/Audio | Boss instructions cover the boss HP fill |
| 6 · KBE-QA-G06 | S4 | Levels | Wading surfaces read as transparent rectangular boxes |
| 7 · KBE-QA-G07 | S4 | Levels | Bog mud reads as speckled dirt/gravel rather than soft mud |
| 8 · KBE-QA-G08 | S4 | Levels | Background mosquito swarm rises above the y62 minimum |

### KBE-QA-G01 — OPEN: roof threats are covered by the HUD/radio

- **Severity / owner:** S2; Engine (vertical camera framing) + Levels (multi-deck layout). **Contract:** LESSONS §5, important gameplay below y54, with the y62 clearance band.
- **URL:** `http://127.0.0.1:8080/?scene=Game&part=2-2&debug=1&fast=1&god=1&mute=1&seed=731&x=3140` (substitute the harness's port).
- **Repro:** Start directly on the main deck, toggle the debug overlay off with F2, and capture while the natural Hazel briefing is open, about 5.5 seconds after boot. Also inspect x3840 and x4160 from the main deck.
- **Expected:** Roof enemies and their attack cues remain readable while the player uses the main deck.
- **Actual:** Main-deck camera top is y152; the roof is y208, leaving its actors' feet at screen y56 and their upper bodies around y24–54. The roof grunt is reduced to a head behind the BOMB digits while the radio covers its body/weapon. The x4160 roof turret also has its root at screen y56. This persists independently of the moving foreground.
- **Frequency / evidence:** Reproduced in direct boot and multiple section captures. `2-2/capture-states.json` records the view and roof actors; `roof-radio.log` records the fresh natural briefing.
- **Screenshot:** `/tmp/kbe-qa/phase-g/2-2/roof-natural-radio.png`; overview `/tmp/kbe-qa/phase-g/2-2/09-queen-main.png`.

### KBE-QA-G02 — OPEN: foreground trunks/canopy obscure combat

- **Severity / owner:** S2; Levels (`m2p2_fg_speed`, parallax depth/coverage). **Contract:** LESSONS §5, gameplay contrast and visibility first.
- **URL:** `http://127.0.0.1:8080/?scene=Game&part=2-2&debug=1&fast=1&god=1&mute=1&seed=731&x=3840`.
- **Repro:** Freeze, move the player onto the real hurricane roof with `ctx.player().teleport(3900,208)`, and advance/render in 17–50 ms batches. Watch a foreground trunk pass in front of the roof grenadier. `node /tmp/kbe-qa/phase-g/supplement.mjs` preserves a deterministic overlap and a diagnostic comparison with just this strip hidden.
- **Expected:** Speed scenery preserves enemy silhouettes, muzzle cues and dangerous bullets on every deck.
- **Actual:** The opaque front-band strip is above enemies/projectiles. A trunk removes part of the roof grenadier's arm/body; the paired frame reveals it when that strip is hidden. Canopy/moss also crosses roof-height silhouettes when the camera follows the main deck. A thin enemy bullet can disappear entirely behind a trunk. The whole moving strip crossing combat, rather than its darkness alone, is the issue.
- **Frequency / evidence:** Repeated across sections and boss captures. Focused overlap: grenadier `(3978,208)`, view approximately `(3770,75)`, torso screen `(208,118)`; opaque foreground texel sampled there. `supplement/report.json`, `probes.foreground`.
- **Screenshots:** `/tmp/kbe-qa/phase-g/supplement/foreground-real.png`, `/tmp/kbe-qa/phase-g/supplement/foreground-hidden-comparison.png`. The hidden-strip frame is a diagnostic, not a shipped fix.

### KBE-QA-G03 — OPEN: the storm front does not render its rain

- **Severity / owner:** S3; Levels + FX (`triggers.ts` ambience zones / `FxDirector` zone precedence). **Contract:** MISSION2 River Run storm-front beat; LESSONS §§1, 5.
- **URL:** `http://127.0.0.1:8080/?scene=Game&part=2-2&debug=1&fast=1&god=1&mute=1&seed=731&x=2310`.
- **Repro:** Let crane lock; advance its waves with `killVisible` only until `crane:done`, wait for the clear hook, then warp between sections to x4200. Alternatively, `__KBE.cheats.bg('storm_front')` reproduces the same renderer mismatch. Run `/tmp/kbe-qa/phase-g/storm-confirm.mjs` for the actual-clear path.
- **Expected:** The storm sky arrives and rain continues over the riverboat after crane clear.
- **Actual:** `arena.arenas='crane:done skeeter:idle'`, `fx.ambience='rain'`, audio bed `amb_rain`, but `fx.weather.mode='river'`, 24 motes, zero rain streaks. The static river `fx:zone` wins over the changed fallback ambience. A separate `fxtest=rain` capture demonstrates the missing 32-streak workload.
- **Frequency / evidence:** Actual crane clear plus independent `storm_front` probe/performance run. `storm-confirm/report.json`, `supplement/report.json`, `perf/report.json`.
- **Screenshots:** `/tmp/kbe-qa/phase-g/storm-confirm/storm-after-crane.png`; comparison `/tmp/kbe-qa/phase-g/perf/storm-rain.png` (explicit rain fixture).

### KBE-QA-G04 — OPEN: slam holes are displaced from the committed marker

- **Severity / owner:** S3; Levels (`IceSystem.stomp`); coordinate Enemies A (`Gatorgeddon` already emits the tail's committed target). **Contract:** MISSION2 tail slam / pier holes; LESSONS §2 marked, fixed attack targets.
- **URL:** `http://127.0.0.1:8080/?scene=Game&part=2-3&debug=1&fast=1&god=1&mute=1&seed=731&x=3700`.
- **Repro:** `cheats.boss()`, press right/advance about 3 s to enter the real den, then damage the boss through the shared hook to phase 3. Reposition with `ctx.player().teleport` (keep the arena lock), first to x4236, then to x4064; wait for each real `slam` cue/release. Do not emit a synthetic stomp.
- **Expected:** The marked tail impact breaks the planks at that position while preserving the edge refuge.
- **Actual:** A marker at x4048 opens tiles x4096 and x4112 (hole spans x4096–4128), leaving the marked tile intact and damaging the route 48–80 px to its right. A mark at x4236 increments `stomps` but opens no tiles. The shared Moose Lake consumer adds another 56 px to the already-final tail target, and its wall-margin check then skips the edge case. Opened tiles do repair: 2 opened / 2 refrozen after moving away and advancing 7 s.
- **Frequency / evidence:** Repeated edge slams in the gallery plus focused right/center comparisons, with real boss events. `supplement/report.json`, `slam-right`, `slam-middle`, `repair-middle`.
- **Screenshots:** `/tmp/kbe-qa/phase-g/supplement/slam-middle-cue.png`, `/tmp/kbe-qa/phase-g/supplement/slam-middle-holes.png`, `/tmp/kbe-qa/phase-g/supplement/slam-right-holes.png`.

### KBE-QA-G05 — OPEN: DUCK/JUMP prompts mask boss health

- **Severity / owner:** S3; UI/Audio (HUD prompt layout). **Contract:** LESSONS §5, important information remains readable; boss HP feedback.
- **URL / steps:** Start the real 2-3 den as G04; wait for phase-2 `gatling` or phase-3 `gas`. Freeze/render at cue +350–500 ms.
- **Expected:** The instruction and boss health remain legible together.
- **Actual:** `DUCK!` and `JUMP THE FLAME!` sit at y200 over the bar at y198, covering its central HP fill precisely during the attack cue. The fill itself renders correctly when the prompt is gone.
- **Frequency / evidence:** Both prompt types in repeated real-arena cycles. Tuning confirms prompt y200 / boss bar y198; gallery state preserves each attack.
- **Screenshots:** `/tmp/kbe-qa/phase-g/2-3/29-gatling-cue.png`, `/tmp/kbe-qa/phase-g/2-3/37-gas-flame.png` (original filenames; contact-sheet indices differ after removing unavailable cheat-only panels).

### KBE-QA-G06 — OPEN: shallow water looks like a glass box

- **Severity / owner:** S4; Levels (wading surface/edge art). **Contract:** requested water readability review; LESSONS §5.
- **URL / steps:** `http://127.0.0.1:8080/?scene=Game&part=2-1&debug=1&fast=1&god=1&mute=1&x=600`; F2, settle and inspect. Repeat at SHELLSHOCK's pool and 2-3's opening.
- **Expected:** A liquid surface over the submerged legs, with banks and water depth easy to distinguish.
- **Actual:** Long straight horizontal highlights, bright curled/beveled end caps and a translucent flat face make a bounded green glass trough. The turtle arena is the clearest example. Water movement/splash and slowdown work; this is a visual acceptance gap.
- **Frequency:** Consistent across both swamp parts.
- **Screenshots:** `/tmp/kbe-qa/phase-g/2-1/02-wading.png`, `/tmp/kbe-qa/phase-g/2-1/22-snap-high-cue.png`, `/tmp/kbe-qa/phase-g/2-3/01-wreck-shore.png`.

### KBE-QA-G07 — OPEN: mud lacks a distinct soft/wet surface reading

- **Severity / owner:** S4; Levels (mud tiles/dressing). **Contract:** requested bog readability review; MISSION2 mud verb and LESSONS §5.
- **URL / steps:** `http://127.0.0.1:8080/?scene=Game&part=2-1&debug=1&fast=1&god=1&mute=1&x=4020`; compare the bog with the ordinary bank at x420.
- **Expected:** Mud is identifiable before the speed/jump penalty takes effect.
- **Actual:** The hard flat edge and repeated bright flecks read as dark dirt/gravel. Small bubbles/splats help in motion, but the main traversal surface does not clearly communicate soft bog mud; a player depends on the prompt/slowdown. The physical values are correct (63 px/s, jump −270.3).
- **Frequency:** Bog and pump-area captures; visual judgment, not a collision defect.
- **Screenshots:** `/tmp/kbe-qa/phase-g/2-1/08-bog-mud.png`, `/tmp/kbe-qa/phase-g/2-1/09-gas-vents.png`, `/tmp/kbe-qa/phase-g/2-1/16-bg-wisps.png`.

### KBE-QA-G08 — OPEN: background skeeters enter the reserved clearance band

- **Severity / owner:** S4; Levels (background swarm vertical spread/bob). **Contract:** LESSONS §5, sky actors at screen y62–110.
- **URL / steps:** `http://127.0.0.1:8080/?scene=Game&part=2-2&debug=1&fast=1&god=1&mute=1&seed=731&x=3840`; fire `cheats.bg('skeeter_swarm')`; advance/render every 50 ms for 8 s. Measure current animation-frame opaque pixels, not transparent source padding.
- **Expected:** Every visible sky swarm pixel stays at or below y62.
- **Actual:** Visible background skeeters reach screen y57. In the final focused scan, 319 of 8,014 on-screen background-actor samples had opaque pixels above y62. This does not establish overlap with the radio itself (ends y54); it violates its clearance margin. The gameplay gnats in this probe remained below the limit.
- **Frequency / evidence:** Two seeded scans; `supplement/report.json`, `probes.flyers`. The guide screenshot marks y62; JSON captures the exact extrema over time.
- **Screenshot:** `/tmp/kbe-qa/phase-g/supplement/swarm-y62-guide.png`.

### Verification and concurrent work notes

- `npm --prefix game run check`: PASS initially with 112 files / zero warnings. Final typecheck passes; checker passes with 113 files / zero errors and **6 warnings** (three audio-loop handle retries, three background tuple allocations). These are reported as current checker warnings, not new reproduced gameplay bugs.
- `npm --prefix game run audit`: reach and arenas PASS for **all six parts**, including final rerun. All Mission 2 wave arenas complete 3/3 waves with maxOff=0 ms; every boss reaches phases 1/2/3 and PartClear/Results. Arena acceptance is the audit, not the section warps used for galleries.
- Full engine selftest: **44/44 PASS** initially and on the final rerun. Final mechanics probes **9/9 PASS** with a clean console; native flow/menu probes **7/7 PASS** with a clean console. The supplementary failures above are acceptance findings, not ignored green tests.
- Inspected full sheets: `/tmp/kbe-qa/phase-g/2-1/contact.png` (**45 panels**), `/tmp/kbe-qa/phase-g/2-2/contact.png` (**51**), `/tmp/kbe-qa/phase-g/2-3/contact.png` (**50**), plus their larger `review-*.png` strips. All sections, authored moment families, new mechanics and real-arena boss attacks are represented; captioned comparison/forced-weather panels are diagnostics.
- SwiftShader, approximately 10 s each, measured rAF FPS: integrated 2-2 storm trigger **60.04** (rain suppressed, G03); explicit rain workload **60.07**; 2-3 storm + GATORGEDDON phase 3 **60.07**; stilts wave 3 **60.10**. Full load-average triples, frame pacing and workload states are in `qa.md` / `perf/*.json`.
- Healthy final per-part background capture logs, native flow, and performance runs have no browser exceptions, missing-texture or missing-sound warnings; sampled `state().errors` are empty. Host `ERR_NETWORK_CHANGED` interrupted some earlier starts and appeared in an earlier mechanics run despite successful gameplay probes; those logs are retained and are not counted as clean console runs. The final mechanics rerun has zero console entries.
- **Concurrent polish:** initial `pond_shell` / `barge_blast` audio mapping warnings disappeared in fresh background captures. No duplicate audio-mapping bug filed. Fog-edge polish and SHELLSHOCK art detail work were left to their active owners. Audible mix, physical gamepad and human difficulty acceptance remain outside this deterministic review.

---

# Final QA — Phase D verification

## Release readiness

> **Owner playtest P01 (fixed by Lead):** the bridge arena stalled after "FINAL WAVE!" in 5/5 owner runs. Its two wave-3
> drones patrol ±48 px around spawns near the walls, drifted 33 px past the locked view (1 px past the 32 px activation
> margin), froze off-screen forever, and kept the wave "alive". QA's playthrough missed it because it traverses with
> `warp`, which abandons arenas, and `killEnemies` also kills frozen off-view members. Fix: enemies turn back at the
> edges of a locked view (`ENEMIES.lockedViewInset`, drone home anchored on screen), and the arena controller pulls any
> live member that stays off-view for 1.5 s back on screen, then culls it 4 s later as a last resort. Verified by a
> no-warp, no-kill-cheat bot (`tools/arena-bot.mjs`): bridge clears 3/3 runs (about 30 s), versus stalling forever before.
> **QA rule from now on:** every arena must be cleared by real shooting, with no warp and no `killEnemies`.

> **Lead update (post-verification):** KBE-QA-E04 was fixed by Engine after this pass: pack/file loads retry with backoff, and persistent failures stop on a LOAD FAILED / retry screen with `ready=false` and `state().loadErrors`. Verified with QA's repro (blocked once → recovers; blocked permanently → error screen, retry works) and 4 new selftest checks (17/17). QA suite 19/19, flow ×5 15/15.

**Ready for a supervised human playtest after a successful load; not a clean automated release sign-off.** All eight Phase C open findings are **RESOLVED**, and the Lead's mission-complete GO suppression passes. Healthy-load gameplay, boss completion/Results, production boot/audio/cheat gating, engine selftests and performance are solid. **One new conditional S1 remains open: E04, required-asset load failure can crash HUD creation and freeze the game.** Reloading is the current recovery. The three consecutive E2E runs and the flow repetition are retained as failures, not relabeled green: host `eth2` network notifications invalidated requests, with a resulting broken partial boot in the Continue repetition.

Human acceptance still needs listening to the audio mix (especially sustained fire, boss roar and the death chain), judging Arcade/Casual difficulty and feel, testing a real GPU, and using a physical gamepad including reconnect/focus behavior. Warp coverage and a forward-only section bot do not establish an unassisted complete run.

Verified 2026-10-16; commit `1fd9974e9abd0c836d71509eaeb5e72271a1d22e`; Chromium 156.0.8078.4, Linux x64, SwiftShader, keyboard, 1152×648 / 384×216 canvas, seed 731. Dev fixtures retain cheats; the production smoke has no `debug=1`. QA made no game-code fixes, installs or git state changes. Unrelated README/docs/TEAMS working-tree edits were left untouched. [Machine-readable summary and source hashes](../../game/tests/artifacts/phase-d-final-2026-10-16/summary.json).

## Bug status table

Severity below is the original Phase C severity. Every screenshot linked in the current verification was opened and inspected. [Final focused report](../../game/tests/artifacts/2026-10-16T20-28-27-886Z-final-verification-3585818/report.md) has **10/10 automated assertions**; L03 additionally requires visual judgment. Original repros and historical before-fix evidence remain below.

| ID | Owner | Severity | Status | Fresh evidence | Inspected screenshots |
|---|---|---|---|---|---|
| E02 | Engine | S3 | RESOLVED | Six tier-4 shake captures at x32 / x6680: view stays inside bounds; no perimeter strips. | [left](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/000-E02-shake-32-0.png) / [right](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/003-E02-shake-6680-0.png) |
| E03 | Engine | S2 | RESOLVED | Three real deaths, then Enter held 100 ms: Game active/unpaused, alive, 3 lives, score 0. | [Continue handoff](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/012-E03-original-enter-100ms.png) |
| N01 | Enemies | S3 | RESOLVED | Original factory properties: sleeper remains asleep; door entry at 200 ms becomes panic/flee at 700 ms; steel pedestal is visible. | [entry](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/008-N01-entry-sleep-pedestal.png) / [700 ms](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/009-N01-original-700ms.png) |
| N02 | Enemies | S3 | RESOLVED | Old silhouette upper corner misses in phase 3: HP 90→90, hit=false. Cyan marker labels the tested point. | [corner miss](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/016-N02-original-empty-corner-cyan-marker.png) |
| N03 | Enemies | S4 | RESOLVED | Original bridge actor is absent after the original walk/wait. Supplemental exact 88 px band fixture descends y183.21→218.68 over 1.25 s; it no longer freezes. | [bridge context; off-view motion in JSON](../../game/tests/artifacts/2026-10-16T20-28-27-886Z-final-verification-3585818/011-N03-exact-88px-band-fixture.png) |
| L01 | Levels | S2 | RESOLVED | Fixture at x6680/y336 completes without movement; the full shooting bot also defeats the boss and clears without recovery input. | [far-right victory](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/019-L01-no-movement-complete.png) / [Results](../../game/tests/artifacts/2026-10-16T20-28-27-886Z-final-verification-3585818/021-L01-results.png) |
| L03 | Levels | S4 | RESOLVED | Ground-route captures at x1900 and x2200 show lower needle boughs visibly attached to the trunks; the former bare-pole reading is improved. | [x1900](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/006-L03-ground-1900.png) / [x2200](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/007-L03-ground-2200.png) |
| U01 | UI/audio | S2 | RESOLVED | Full red fill at 400 HP, half at 200, visible sliver at 12; fill renders above the frame. | [full](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/013-U01-full-400.png) / [half](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/014-U01-half-200.png) / [12 HP](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/015-U01-sliver-12.png) |

**Lead HUD fix: VERIFIED.** No visible GO sprite / positive GO timer in any of **254 sampled post-defeat frames**, including the boss arena's real unlock and stage clear. [Unlock capture](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/018-lead-boss-unlock-no-GO.png) and [mission complete](../../game/tests/artifacts/2026-10-16T20-20-05-310Z-final-verification-3582420/019-L01-no-movement-complete.png) show the mission banner without GO. The event trace contains one boss defeat and one stage clear.

## Suite accounting and failure investigation

The required command was run three consecutive times, serially, with one worker and zero retries:

```bash
node game/node_modules/@playwright/test/cli.js test --config game/playwright.config.ts --reporter=line
node game/node_modules/@playwright/test/cli.js test --config game/playwright.config.ts --reporter=line flow.spec.ts --repeat-each 5
```

| Run | Passed / failed / skipped | Failure |
|---|---|---|
| 1 | **17 / 2 / 0** | Pause test could not boot a canvas after four source-module request failures; god-flag test recorded 17 failed asset requests. [log](../../game/tests/artifacts/phase-d-final-2026-10-16/clean-1.log) |
| 2 | **18 / 1 / 0** | Continue test's gameplay assertions passed, but the console guard caught 57 failed asset requests. [log](../../game/tests/artifacts/phase-d-final-2026-10-16/clean-2.log) |
| 3 | **17 / 2 / 0** | Shoot and fast-boot tests recorded 45 and 46 failed asset requests. [log](../../game/tests/artifacts/phase-d-final-2026-10-16/clean-3.log) |
| flow.spec.ts ×5 | **14 / 1 / 0** | Title/Pause **5/5**, respawn **5/5**, Continue **4/5**. The failed Continue case never reached confirmation: five pack requests failed, HUD creation threw, and the dead sandbox actor did not respawn. [log](../../game/tests/artifacts/phase-d-final-2026-10-16/flow-repeat.log) |

The earlier diagnostic full runs were **16/19** then **19/19** ([first log](../../game/tests/artifacts/phase-d-final-2026-10-16/e2e-run-1.log), [second log](../../game/tests/artifacts/phase-d-final-2026-10-16/e2e-run-2.log)); they do not replace the consecutive-run accounting. The first non-escalated launch stopped before tests at `listen EPERM`; no game result is claimed for that launch.

**Root cause, measured:** the trace retains every failed request with `net::ERR_NETWORK_CHANGED`. During the controlled sequence, **all 174 failed requests** (169 across the full suites plus 5 in the flow repetition) began within **153 ms** of host `eth2` notifications/address removal/re-addition. The monitor kept running across all three suites and repetitions, including intervals with no new shell inspections or other browser workload. Chromium NetLog independently records `NETWORK_IP_ADDRESSES_CHANGED` and `CONNECTION_NONE`→`CONNECTION_ETHERNET`. This is evidence of host network churn; it is not an attribution to other agents' servers. [Timestamp correlation](../../game/tests/artifacts/phase-d-final-2026-10-16/network-correlation.json), [host monitor](../../game/tests/artifacts/phase-d-final-2026-10-16/ip-monitor.log), [failed requests and retained trace paths](../../game/tests/artifacts/phase-d-final-2026-10-16/all-failed-requests.json), [Chromium diagnostic](../../game/tests/artifacts/phase-d-final-2026-10-16/network-diagnostic-summary.json).

**Continue diagnosis:** the failing repetition lost `player/enemies/level/fx/ui` packs, started the Dev Sandbox, then threw `TypeError: Cannot read properties of undefined (reading 'data')` in `HudScene.build` → bitmap text creation. Snapshot: `scene=Game`, sandbox=true, error already recorded, lives 3→2, alive=false indefinitely. It is **not a test wait/keypress race**. The original E03 repro passes on healthy loading; increasing the 6 s wait or suppressing console errors would hide this startup defect. See E04. No flow test timing change was made.

## New open finding

### KBE-QA-E04 — OPEN: failed required assets still route into a crashing Game

- **Severity:** S1, conditional on a required pack/font failing to load. **Owner:** Engine (`BootScene.ts` / `PreloadScene.ts`, coordinate with UI's bitmap-font assumption). **Contract:** successful preload/readiness and playable boot; GDD §§10, 12.
- **Observed organically:** the Continue repetition above, after five failed pack requests. The canvas is blank; the game reports ready/Game with a sandbox and a HUD exception. [Inspected original failure screenshot](../../game/tests/artifacts/2026-10-16T20-18-44-484Z-e2e-3581261/results/flow-game-over-offers-continue-and-starts-a-fresh-run-chromium-repeat1/test-failed-1.png).
- **Deterministic isolated repro:** boot a healthy dev server; use Playwright `page.route('**/assets/fonts/hud_gold.xml', route => route.abort('failed'))`; reload `/?scene=Game&fast=1&mute=1&god=1&seed=731`; wait 2.5 s. Call `__KBE.cheats.kill()` and wait another 2.5 s. [Repro script](../../game/tests/artifacts/phase-d-final-2026-10-16/load-failure.mjs) / [fault-injection report](../../game/tests/artifacts/2026-10-16T20-28-20-469Z-load-failure-3585625/report.md).
- **Expected:** retry or remain in a visible load-error state; no ready/playable handoff with required assets absent.
- **Actual:** real Mission 1 initializes, HUD construction throws the same bitmap-text `data` exception, the view stays on the full loading bar, and the player remains dead with 2 lives after the respawn delay. `reproduced=true` in the report. **Frequency:** 1 organic partial-pack crash plus 1/1 deterministic single-font failure. The deliberate `ERR_FAILED` belongs to the injected request, not the healthy production smoke.
- **Inspected screenshots:** [loading bar after HUD crash](../../game/tests/artifacts/2026-10-16T20-28-20-469Z-load-failure-3585625/missing-font-hud.png), [unchanged after death](../../game/tests/artifacts/2026-10-16T20-28-20-469Z-load-failure-3585625/missing-font-no-respawn.png).
- **Cause:** Boot catches pack failures and skips them; Preload only warns on file errors and still routes; HUD assumes the required font exists. No QA game-code fix was made. Reload is the present workaround. Healthy asset loading remains accepted separately.

## Other verification

| Check | Result | Evidence |
|---|---|---|
| Engine selftest | **13/13 PASS**, including held Continue keys, snap/unlock blend, zero page/debug errors | [log](../../game/tests/artifacts/phase-d-final-2026-10-16/selftest.log) |
| Project check | **PASS**: typecheck; Phaser checker **84 files, 0 errors, 0 warnings** | [log](../../game/tests/artifacts/phase-d-final-2026-10-16/check.log) |
| Systems regression | **70/70**, weapons ×8 directions, ammo fallback, grenade/knife/crouch/POWs, damage/hazards, animations/FX | [report](../../game/tests/artifacts/2026-10-16T20-29-13-883Z-phase-c-systems-3586129/report.md) |
| Audio regression | **4/4**, unlock, catalog keys, music/mute behavior | [report](../../game/tests/artifacts/2026-10-16T20-30-29-538Z-phase-c-audio-3586530/report.md) |
| Full `--weapon hmg` god/warp playthrough | **PASSED**, all three phases, real shooting defeat, stage clear without recovery; Results reveal required by final harness | [report](../../game/tests/artifacts/2026-10-16T20-30-42-172Z-playthrough-3586887/report.md) |
| Production build | **PASS**, 89 modules, index 216.05 kB / Phaser 1374.10 kB | [log](../../game/tests/artifacts/phase-d-final-2026-10-16/build.log) |
| Production smoke | **PASSED**, Title → Start → **20.005 s** gameplay; **330** successful asset responses, 0 request/HTTP/console/page/debug errors | [report](../../game/tests/artifacts/2026-10-16T20-33-35-727Z-production-smoke-3587830/report.md) |

The production smoke serves **game/dist** with the game's Vite preview config. Audio goes **locked/suspended → unlocked/running** after the Enter gesture; music is `music_stage1`, mute=false, unknown sound keys empty. Attempted `god=1`, `x=6350`, `enemytest=boss`, and API god/warp/give/bombs/kill do not mutate the run without `debug=1`; `cheatsEnabled=false`, no fixture API. [Title](../../game/tests/artifacts/2026-10-16T20-33-35-727Z-production-smoke-3587830/title.png), [20-second gameplay](../../game/tests/artifacts/2026-10-16T20-33-35-727Z-production-smoke-3587830/gameplay-after-20s.png) were inspected. Numeric mix is exposed and functioning (buses music .7 / SFX .9; limiter enabled); this is not a listening judgment.

The full bot's original fixed 4 s post-clear sleep captured the black wipe while Game was still active. QA replaced that timing assumption with waits for the actual Results scene and its finished reveal, then reran the full bot. The old walk-left recovery was removed before any final playthrough. The systems probe's obsolete 20 px crouch assertion now checks the authored **18 px** body. These are QA harness updates, with no game-source change.

## Physical section comparison

Same seed/start/target and forward/fire/jump/grenade policy; default pistol, **no god**, no warp after initial `x=` section setup. Arcade budget 40 s, Casual 35 s. Values are maximum world X, not difficulty scores.

| Section / target | Phase C Arcade | Levels Phase D Arcade | Final Arcade | Phase C Casual | Final Casual |
|---|---:|---:|---:|---:|---:|
| camp / 960 | 742 | 974 | 960 **cleared** | 971 | 963 **cleared** |
| forest / 2720 | 1707 | 1768 | 1768 | 2739 | 2733 **cleared** |
| bridge / 4000 | 3577 | 3578 | 3578 | 3577 | 3577 |
| outpost / 5760 | 4169 | 5461 | 5461 | 4169 | 5528 |
| pen / 6490 | 6494 | 6495 | 6495 **cleared** | 6496 | 6495 **cleared** |

[Arcade report](../../game/tests/artifacts/2026-10-16T20-23-56-789Z-phase-c-sections-3584140/report.md); [Casual report](../../game/tests/artifacts/2026-10-16T20-25-15-911Z-phase-c-sections-3584603/report.md). Final Arcade lives at stop: **1/0/0/0/3**; Casual: **3/2/1/0/3** (camp/forest/bridge/outpost/pen). Arcade camp now completes and outpost reaches the bunker fight, matching Levels' documented improvement. Casual bridge reaches its time budget with one life left; outpost loses its lives inside the fight. The bot never turns to face landing paratroopers or crouches to solve combat; its non-completion is not evidence of a geometry softlock. Human balance acceptance remains open.

## Performance

Isolated **20 s** standard workload, 2 s warmup, no screenshots during measurement, no parallel browser workload: **60.13 FPS average**, **58 minimum**, rAF mean **16.666 ms**, p95 **16.7 ms**, p99/max **16.8 ms**, **0** >50 ms / >100 ms spikes, **0** sampling/browser errors; **1269** frame samples. [report](../../game/tests/artifacts/2026-10-16T20-27-04-842Z-perf-3585081/report.md) / [inspected endpoint](../../game/tests/artifacts/2026-10-16T20-27-04-842Z-perf-3585081/final.png).

Versus Phase C's native-HUD baseline 60.431 FPS: **−0.504%** average FPS, unchanged p95 16.7 ms and zero long spikes. FX's Phase D standard probe was 60.068 FPS; the current result is within 0.1% of it. Current FX peak **51** slots, **0** drops, peak measured FX CPU **0.9 ms**. This is same-machine SwiftShader evidence, not real-GPU 60 FPS acceptance.

---

# Phase C QA — Mission 1 triage (historical)

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

### KBE-QA-E02 — RESOLVED (Phase D): Camera shake exposes flat sky strips at world edges

- **Severity:** S3. **Owner:** Engine (`src/core/camera.ts`; coordinate overscan with Levels). **Contract:** GDD §§3, 8, 12.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=32&seed=731`.
- **Repro:** Through Game's test context, call `__KBE.game.scene.getScene('Game').ctx.fx.shake(4)`; capture about 40 ms later. Repeat after `__KBE.cheats.warp(6680)`. Normal boss explosions also expose this.
- **Expected:** Shake keeps the rendered composition covered at the screen border.
- **Actual:** Flat blue horizontal/vertical strips replace the background at the canvas perimeter. Left-edge screenshot shows a conspicuous top and right strip; the boss entrance capture also shows a left strip.
- **Frequency:** Both edge captures; also seen during the full boss run. **Regression baseline:** reported by Engine; confirmed.
- **Screenshots:** `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/021-shake-world-left.png`, `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/022-shake-world-right.png`.
- **Trace/state:** Same systematic `report.json`; player alive, camera near map boundary, no browser error.

### KBE-QA-E03 — RESOLVED (Phase D): Continue confirmation also pauses the resumed Game

- **Severity:** S2. **Owner:** Engine (`src/core/flow.ts`, cross-scene input baseline); coordinate with UI Continue. **Contract:** GDD §10: Continue returns to playable gameplay.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=5800&seed=731`.
- **Repro:** Kill the player three times with `__KBE.cheats.kill()`, waiting for each respawn and then the native Continue screen. Press Enter with a normal 80–100 ms hold, release, wait 400 ms. The dedicated native UI probe and `flow.spec.ts` reproduce this without modifying input state.
- **Expected:** Exactly one Continue action: score resets, 3 lives restored, Game active and unpaused.
- **Actual:** Lives and score reset correctly, then the same Enter gesture opens Pause. Snapshot: `scene='Pause'`, player alive with 3 lives, active scenes HUD/Pause, Game paused. Escape recovers. This is a Continue handoff bug; fresh Title→Game→Pause/resume passes and is not attributed to this defect.
- **Frequency:** Native UI probes plus final E2E. No browser exception. **Regression baseline:** fallback Continue passed before the native overlay landed.
- **Screenshot:** `game/tests/artifacts/2026-10-16T19-12-07-148Z-phase-c-ui-3498072/009-native-continue-transition.png`.
- **Trace/state:** [native UI report](../../game/tests/artifacts/2026-10-16T19-12-07-148Z-phase-c-ui-3498072/report.json), `continueTransition`; E2E trace `game/tests/artifacts/2026-10-16T19-12-10-373Z-e2e-3498437/results/flow-game-over-offers-continue-and-starts-a-fresh-run-chromium/trace.zip` (expected Game, received Pause).

## Enemies, AI and bosses

### KBE-QA-N01 — RESOLVED (Phase D): Enemy factories ignore authored sleep, flee, door-entry and mount properties

- **Severity:** S3. **Owner:** Enemies (`src/entities/enemies/Enemy.ts`). **Contract:** Level spawn-property contract; GDD §§7–8.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=5800&seed=731`.
- **Repro:** Run `node game/tests/bot/phase-c.mjs --mode investigations`. Its `enemy-map-properties` case creates a grunt with `{idle:'sleep',patrol:0,facing:1}`, one with `{idle:'flee',from:'door',patrol:0,facing:1}`, and a turret with `{mount:'pedestal'}`. Wait 700 ms. Normal camp/pen/outpost map instances pass the same properties.
- **Expected:** Sleeping guard sleeps until alerted, fleeing pen guards flee, entry actors walk out of their doors, and turret mount styling matches the map.
- **Actual:** Both test grunts remain ordinary `patrol`/idle actors; the flee behavior is absent, and the turret uses the same default base presentation. Factories read facing/patrol/wave but omit these properties. Level-owned door opening and spawn timing work; the missing enemy exit animation is a separate handoff.
- **Frequency:** 3/3 investigation runs; source corroboration. **Regression baseline:** Levels' documented integration gap.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-58-07-454Z-phase-c-investigations-3486424/003-ignored-sleep-flee-mount.png`.
- **Trace/state:** [investigation report](../../game/tests/artifacts/2026-10-16T18-58-07-454Z-phase-c-investigations-3486424/report.json), `enemy-map-properties`, states `patrol` at x5860/x5950/x6040.

### KBE-QA-N02 — RESOLVED (Phase D): MOOSEZILLA accepts hits in empty corners of its silhouette rectangle

- **Severity:** S3. **Owner:** Enemies/bosses (`src/entities/bosses/Moosezilla.ts`). **Contract:** GDD §7 boss/weak-point readability.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=6350&enemytest=boss&seed=731`.
- **Repro:** Run `node game/tests/bot/phase-c.mjs --mode boss`. The phase-3 corner check queries the boss's real damage rectangle, then calls `__KBE_ENEMYTEST.hitAt(rect.x+2, rect.y+2, 1, 'bullet', 1, 0)`.
- **Expected:** A shot through empty space above/beside the visible machine misses; a visible hull/part hit damages it once.
- **Actual:** The point `(6360.56,222)` inside the broad `152×116` rect accepts damage, HP 90→89, despite being in the rectangle's empty upper corner. Coordinate-routed antler/core logic does not remove this empty-space hull region. This is a hurtbox issue, not evidence of a broad player-contact collider.
- **Frequency:** 1/1 targeted check, consistent with the implementation. **Regression baseline:** Enemies' known broad silhouette rectangle.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-54-22-293Z-phase-c-boss-3483699/010-boss-empty-corner-hit.png`.
- **Trace/state:** [boss report](../../game/tests/artifacts/2026-10-16T18-54-22-293Z-phase-c-boss-3483699/report.json), `cases[0].corners` with point, rect and before/after HP.

### KBE-QA-N03 — RESOLVED (Phase D): A bridge paratrooper's descent freezes just behind the arena camera

- **Severity:** S4. **Owner:** Enemies (AI lifetime/culling; coordinate with Levels). **Contract:** GDD §7 parachute lifecycle and view activation.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=3080&seed=731`.
- **Repro:** Hold Right 2 seconds, release, wait 6 seconds; inspect `enemyAI` while the camera locks at x3200.
- **Expected:** A departed airborne actor finishes its descent or is cleaned up as it leaves the playable view.
- **Actual:** The ordinary paratrooper at x3112 stays in `descent` at exactly y183.21 across all twelve samples. It is 88 px behind the view: outside the AI's 32 px margin but inside the 96 px cleanup threshold. This is an **off-view lifecycle stall**. The on-screen wave paratroopers continue descending; no required-wave softlock was established. Treat blanket off-view dormancy as a deliberate optimization, with this transition as a cleanup/presentation gap.
- **Frequency:** Reproduced in all enemy runs. **Regression baseline:** reported bridge hanging actor; confirmed with this narrower impact.
- **Screenshot:** `game/tests/artifacts/2026-10-16T18-58-51-268Z-phase-c-enemies-3487717/024-bridge-hanging-paratrooper.png` (on-screen context; frozen actor itself is left of the capture).
- **Trace/state:** [enemy report](../../game/tests/artifacts/2026-10-16T18-58-51-268Z-phase-c-enemies-3487717/report.json), final case's `samples`; x3112/y183.21 constant, required wave actors advancing.

## Levels and content

### KBE-QA-L01 — RESOLVED (Phase D): Boss defeat at the right edge does not trigger mission completion

- **Severity:** S2. **Owner:** Levels (`src/level/triggers.ts`, map `stage_end` rectangle). **Contract:** GDD §§7–8, 10: boss defeat → mission complete.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&stage=1&god=1&fast=1&mute=1&seed=731`.
- **Repro:** Run `node game/tests/bot/playthrough.mjs --weapon hmg`. The bot reaches the arena's far-right legal position, faces left, and defeats the boss through normal shooting. Observe the `boss-defeated` capture before the harness walks left. For a quicker fixture repro, use `x=6350&enemytest=boss`, walk to the right boundary after the gate opens, then `__KBE_ENEMYTEST.bossHp(0)` and wait for the real defeat event.
- **Expected:** After the death chain, the mission completes from every legal standing location in the boss arena.
- **Actual:** At player `(6677,336)`, boss HP=0/state=`defeated`, player remains `ready` and no completion starts. `stage_end` ends at x6672, leaving a legal strip to its right. Walking left into the strip changes the player to `victory` and completion proceeds. The harness deliberately performs that recovery; it must not hide the gameplay defect.
- **Frequency:** 2/2 full runs with delayed-defeat observation; fixture completion inside the strip also passed. **Regression baseline:** no earlier accepted defeat-to-completion run.
- **Screenshots:** `game/tests/artifacts/2026-10-16T18-55-14-821Z-playthrough-3484338/018-boss-defeated.png`, `game/tests/artifacts/2026-10-16T18-55-14-821Z-playthrough-3484338/019-final.png`.
- **Trace/state:** [full run](../../game/tests/artifacts/2026-10-16T18-55-14-821Z-playthrough-3484338/report.json), captures `boss-defeated` (`ready`) then `final` (`victory`); all six coverage flags true. That run also recorded a camera comparison across a cheat warp; the harness now resets that comparison at each warp. Physical no-warp camera checks passed.

### KBE-QA-L03 — RESOLVED (Phase D): Giant pines read as bare vertical trunks on the main route

- **Severity:** S4. **Owner:** Levels (map/tiles/art placement). **Contract:** GDD §8 Pine Forest identity and route readability.
- **URL / cheats:** `http://127.0.0.1:8080/?scene=Game&fast=1&mute=1&god=1&x=1900&seed=731`.
- **Repro:** Remain on the main ground route around x1900–2200, then compare with the upper branches.
- **Expected:** The forest's landmark pines read as trees from the route most players take; branch routes visually connect to a canopy.
- **Actual:** Large flat brown columns dominate the visible area. Needle tiers sit mostly above the resting view, making the scene read as poles with disconnected ledges. Snow/stone background noise further weakens the tree silhouette.
- **Frequency:** Full traversal and two systematic captures. **Regression baseline:** Levels' known canopy placement limitation.
- **Screenshots:** `game/tests/artifacts/2026-10-16T18-51-19-595Z-playthrough-3481455/003-camera-1702.png`, `game/tests/artifacts/2026-10-16T18-56-27-154Z-phase-c-systems-3485535/020-fx-gallery.png`.
- **Trace/state:** Matching reports, section=`pine_forest`; no collision or missing-texture error claimed.

## UI, HUD and audio

### KBE-QA-U01 — RESOLVED (Phase D): Opaque boss-bar frame hides the entire health fill

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
