# Effects and game feel — real-map ambience polish (2026-10-17)

This pass supersedes the tunnel and train presentation values below. Edited only `game/src/fx/weather.ts`, `game/src/config/tuning/fx.ts`, and this report. No git state operations.

- Replaced full-height grey lamp rectangles with additive amber/orange cones, soft lateral/vertical falloff, ceiling fixtures/halos and broad deck pools. One 160×216 canvas texture is baked once and reused across scene restarts; five fixed weather Images are separate from the unchanged 344 pooled FX slots. No per-frame texture uploads or filters.
- Lamps move right to left at the real map's **260 px/s** drift, spaced 192 px apart. Each brightens locally for roughly 140 ms while passing Knotz (alpha .72 → 1); `reducedFlash` and OS reduced motion suppress that pulse. `fx.weather.lamps` and `lampPulse` expose the presentation. Tunnel veil changed from purple/.64 to near-black blue/.84. Veil depth 38 and light depth 38.5 preserve characters (40+) and fully visible projectiles (60).
- Train snow streaks now occupy 55% of emissions, are 8–17 px long, use a pale ice tint and .78 opacity; other train flakes use .62. Existing 22/s emission and 48-flake/64-ambient caps remain. Sideways snow is visible against the mountains without covering combat. Part III blizzard tuning is unchanged; inspected at the real lake x=1200 with readable ice and actors.

Verification used only `node tools/shot.mjs` from `game/`, short input steps and read-only/debug-setting sampling. Tunnel 1 is the trigger at **x=1712**, width 64, duration 6000 ms in `m1p2.tmj`. Spawn x=1690 is behind stacked crates: hold right, hold Z for 450 ms, continue right for 450 ms, release, then wait 1500 ms. A tap jump does not clear those crates. Wait 8500 ms before entry so the title/radio has mostly cleared. Open track uses x=400; lake uses part=1-3, x=1200 (11500 ms wait clears its radio).

All generated PNGs were opened and inspected. Evidence:
- Tunnel before: `/tmp/kbe-level/final/p2_tunnel.png` (Lead reference). Final: `/tmp/kbe-fx/polish/final-tunnel-pulse.png`, `final-tunnel-reduced.png`. Warm pools and bright enemy bullets remain distinct. Captured normal `lampPulse=.922`; reduced-flash samples retain alpha .72 and pulse 0.
- Open track before: `/tmp/kbe-fx/polish/before-track.png` (title/radio still visible). After: `after-track-motion.png`, `after-track.png` in the same directory, separated by 140 ms to inspect leftward travel.
- Lake before: `/tmp/kbe-fx/polish/before-lake.png` (title/radio visible). After: `final-lake.png` in the same directory (clear view).
- Intermediate captures in that directory include the blocked entry attempts and `after-tunnel-shot.png` with muzzle flashes; they are not the final tunnel evidence.

`__KBE.state().fx` on Chromium/SwiftShader: tunnel normal 62-frame sample mean **.101 ms**, maximum moving average **.125 ms**, `cpuPeakMs` **1.50 ms**; reduced-flash final **.076 ms**. Open-track final **.069 ms**, peak **1.60 ms**. Lake final **.049 ms**, peak **1.20 ms**. Final state FPS 60–61, no dropped FX, runtime/load errors or console problems. CPU excludes renderer/GPU work; these are short map captures, not a sustained hardware performance claim. Full output: `/tmp/kbe-fx/polish/{final-tunnel,after-track,final-lake}.log`.

Final `npm run check` passes: TypeScript and Phaser 4 scan, **98 files, zero errors/warnings** (`/tmp/kbe-fx/polish/check.log`). Shared files changed by other teams were left alone.

---

# Effects and game feel — Phase E integration contract

This section supersedes historical notes below. Implemented and verified in the existing camp/bridge map and boss fixtures; new Part II/III maps were not yet present during verification.

All effects are cosmetic. Emit `fx:emit` with `{ effect, x, y, ...params }`; coordinates are world pixels, angles radians, durations milliseconds. Optional `scale` defaults to 1 (clamped .25–2). New optional fields are accepted by FX locally until Engine expands the shared event type. `durationMs` is an alias for `duration`.

| Effect | Optional params / anchor | Behavior |
|---|---|---|
| `ice_skid` | feet `x,y`; `angle` = travel direction; `count=5`, `scale` | Cool powder and sliding ice chips; suppresses fallback brown movement dust. |
| `ice_crack` | surface center `x,y`; `width=32`, `duration=600`, `scale` | Branching stepped fissure, grows through three stages, expires at duration. |
| `ice_shatter` | waterline center `x,y`; `count=10`, `width=32`, `scale` | Ice chips, powder, water splash and ripple. Removes nearby crack decals. |
| `steam` / `vent_steam` | vent socket `x,y`; `scale` | One capped rising steam puff. Repeat from owner for a continuous vent. |
| `smoke_stack` | stack mouth `x,y`; `count=2`, `scale` | Dark drifting exhaust puffs; repeat from owner for continuous exhaust. |
| `cinder` | ember center `x,y`; `angle=π/2`, `speed=55`, `duration=900`, `scale` | One glowing ochre falling ember, cosmetic only. Boss owns damaging projectile. |
| `mortar_marker` / `ground_marker` | target surface center `x,y`; `width=28`, `duration=900`, `scale` | Bracket/ellipse target marker, pulse until expiry; steady with reduced flash. |
| `boss_chain` | `x,y` = rect top-left; `width=112`, `height=64`, `count=7`, `duration=1400` | Bounded staggered M/L explosions across rect. No terminal defeat event or gameplay damage. |
| `derail` | `x,y` = crash center; `width=220`, `height=80`, `count=10`, `duration=1800` | Multi-explosions, metal debris, steam, final XL and sustained decaying shake. |

`fx:ambience { kind }` and existing `fx:zone { id, kind, x, y, width, height, active }` accept `train`, `tunnel`, `blizzard`, plus existing `snow`, `embers`, `fireflies`, `steam`, and null fallback. Levels: add new ids to your ambience-trigger whitelist. Train reads map `drift` (px/s), default 180; tunnel darkness/lamp sweeps composite over overlapping train weather. All darkness, lamp sweeps, snow and gust veils stay below actors and projectiles.

`boss:phase` / `boss:defeated` distinguish `name` containing SNOWCAT / IRONHORN; terminal defeat supplies scaled hitstop, final burst, settings-gated flash and slow-mo. Keep defeated terminal (after boss-owned body choreography). An explicit `derail` supplies its own finale, so a following IRONHORN defeat will not duplicate it. `boss:stomp {x,y,power}` emits an expanding low dust ring and shake (power≈1 normal, 2+ heavy). `part:start` opens a brief in-Game wipe; UI still owns between-part scenes. Shake-off and reduced-flash settings are honored.

Dev preview (or production with `debug=1`): `?scene=Game&fast=1&mute=1&god=1&seed=7&fxtest=train` (also `tunnel`, `blizzard`, `phasee`, `derail`). `fxtest=1` retains the original explosion gallery. `state().fx.weather` reports mode/drift/gust; `state().fx.campaign` reports live markers/cracks, scheduled bursts, reveal state and cumulative reveals/derails/stomps. `state().fx.ambience` remains the level fallback id; a gallery override is reported in `weather.mode`.

## Implementation and budgets

Changed paths: `game/src/fx/{campaign,weather,director,gallery,index}.ts`, `game/src/config/tuning/fx.ts`, and this document. Existing authored FX atlases are reused; no new dependencies, textures, asset-pack edits or git operations that change state.

- Weather uses the existing 64 ambient slots, with at most 48 snow sprites. Train emits 22/s; blizzard 30/s. Gusts modulate wind speed; wheel sparks use the existing spark cap. Map `drift` is read from the published tilemap (cached map fallback), clamped −600…600 px/s, default 180. Negative drift reverses wind. Tunnel dark alpha .64; blizzard veil ≤.075 plus three sparse .035 gust bands. Three reusable Graphics objects cover weather, ground marks, and the entry wipe; no per-flake filters or Arcade bodies.
- All weather, smoke, debris, ice chips and splash ripples render below actors/projectiles. The tunnel veil overscans viewport edges by 16 px for Engine's scroll-space shake and stays drawn during hitstop. The entry wipe alone covers the Game layer at depth 90; HUD stays separate. It opens in 380 real ms, or 160 ms with reduced flash/OS reduced motion. No camera flash/shake is added by part entry.
- Fixed capacity: 20 combined markers/cracks, 32 delayed explosion jobs. Markers use 80–8000 ms durations, chain/derail 300–4000 ms and at most 16 bursts. Finale reservation may reclaim an optional scheduled burst. Repeated targets coalesce; excess optional requests drop. Markers keep their outline visible during the pulse and are steady under reduced flash. Crack decals grow in three steps; shatter removes nearby cracks. The 344 pooled-Image cap and .16 total / .08 cloud weighted coverage caps remain intact. Those coverage metrics describe pooled FX, not the explicitly bounded weather veil or short entry curtain.
- SNOWCAT/IRONHORN use 90 ms terminal hitstop then .5× for 650 real ms; MOOSEZILLA retains 120 ms then .35× for 900 ms. Slow-mo starts after hitstop. Mid-boss phase stop is 45 ms, main boss 65 ms. A terminal XL remains large for both mid-bosses. `derail` has a 75 ms initial stop, delayed core finale and sustained decaying shake; normal chain sub-bursts do not repeatedly freeze combat. Explicit derail suppresses duplicate IRONHORN finale for 5 gameplay seconds. Boss names are case-insensitive. All FX camera flashes are suppressed by reducedFlash/OS reduced motion; shakes pass through the existing setting gate.
- New spatial effects are visual-only. Ground markers have no hitboxes, cinders do not deal damage, and cracks do not modify tiles. Phase changes/defeat clear markers and cracks; continue/part entry/shutdown cancel delayed work. Gallery requires `ctx.debug.cheatsEnabled`.

## Phase E verification

`npm --prefix game run check` passes: TypeScript plus Phaser 4 scan, 90 files, zero errors/warnings. Phaser 4 Filters and FILL tint modes are preserved; no legacy FX APIs introduced.

Chromium 156 / SwiftShader, 1152×648 capture of the 384×216 game. The representative full-combat workload holds the actual HMG at the bridge, adds three M/XL/M bursts every 850 gameplay ms, the gallery's burst sequence, and up to ten live enemy bullets. This is an explicit stress fixture, not an unassisted train playthrough. Train runs 30 s; tunnel/blizzard 6 s each. Final tunnel capture/measurement includes the overscan repair.

| Ambience | Average FPS | p95 frame ms | FX cpuMs at end | Maximum observed cpuMs | cpuPeakMs | Peak pooled FX |
|---|---:|---:|---:|---:|---:|---:|
| train | 59.95 | 16.7 | .121 | .220 | 2.3 | 158 |
| tunnel | 59.48 | 16.8 | .086 | .125 | 1.8 | 103 |
| blizzard | 59.00 | 16.8 | .094 | .160 | 1.5 | 153 |

All frame intervals ≤16.8 ms; no >50 ms spikes, browser errors, sample errors or depth violations. Train processed 116 explosions with 40 optional pool requests dropped by caps; tunnel/blizzard dropped 7 each. Damage/projectiles are independent of those caps. CPU values come from `state().fx`, include handler/update/presentation work, and exclude renderer/GPU time. `cpuPeakMs` includes setup/JIT/event spikes; these are software-renderer results, not hardware GPU timings.

Evidence: `/tmp/kbe-fx/phase-e-verification.json`, `phase-e-tunnel-final.json`, `phase-e-contracts.json`, `phase-e-routing.json`, with their `.mjs` harnesses beside them. Contract checks pass for all new spatial effects; crack growth/removal, marker duration/alias, pause, splash/ice tint, power-scaled stomp, shake-off/reduced-flash, part reveal completion, map drift read, cancellation on continue, stable listener count on restart, real Snowcat/Ironhorn death lifecycle, and exactly one mid-boss slow-mo/finale with an explicit derail. Routing checks pass for fallback train → tunnel zone → hitstop → zone removal → blizzard → null. The initial restart assertion expected one listener, but Audio also owns an `fx:emit` listener; corrected verification checks the stable count across restart.

Opened/inspected captures under `/tmp/kbe-fx/`:
- `phase-e-train-combat.png`, `phase-e-tunnel-combat.png`, `phase-e-blizzard-combat.png`: live enemy bullets remain distinct through fire/smoke/weather.
- `phase-e-tunnel-shake.png`, `phase-e-blizzard-ambience.png`: weather-only views; tunnel edge gutters repaired.
- `phase-e-ice-marker.png`, `phase-e-ice-shatter.png`, `phase-e-steam-cinder-skid.png`, `phase-e-stomp.png`, `phase-e-part-reveal.png`.
- `phase-e-snowcat-chain.png`, `phase-e-snowcat-finale.png`, `phase-e-ironhorn-chain.png` (explicit derail plus real boss death).
- `phase-e-gallery.png`: documented Phase E gallery via the repository screenshot command.

```sh
node game/tools/shot.mjs --out /tmp/kbe-fx/phase-e-gallery.png \
  --query 'scene=Game&fast=1&mute=1&god=1&seed=7&fxtest=phasee' --wait 3500
# fxtest=train|tunnel|blizzard: weather plus explosion gallery.
# fxtest=derail: repeated crash every 5200 gameplay ms; wait at least 6000 ms.
```

## Known issues and requests for other teams (Phase E)

- **Engine:** extend `fx:ambience.kind` with `steam | train | tunnel | blizzard`; extend `fx:emit` with optional numeric `duration`, `durationMs`, `width`, `height`, `speed`. FX accepts these locally; no shared files edited. `part:start` and `boss:stomp` are already present and consumed.
- **Levels:** add `train`, `tunnel`, `blizzard` to your ambience-trigger whitelist, publish existing `fx:zone` rectangles, and set map `drift`. Call `ice_crack` at surface center with the tile's remaining break duration, then `ice_shatter` at the waterline. The new maps were absent during this pass; verify the authored tunnel/bridge/train positions after they land.
- **Enemies:** the named boss lifecycle already works. Integrate optional `smoke_stack`, `steam`, `cinder`, markers and `derail` at your sockets. Request `derail` near the beginning of IRONHORN's death so its default 1800 gameplay ms sequence completes before terminal `boss:defeated`/part transition. Keep your actual damaging shells/cinders. If adopting FX markers, remove equivalent boss-owned marker drawing to avoid duplicates. Use either your existing body chain or `boss_chain`, not both for the same bursts. FX supplies the terminal burst/stop/slow-mo.
- **UI/audio:** boss fixtures currently log missing `snowcat_engine` and `loco_steam` audio keys. Please add/alias those keys. FX uses existing `explo_m/l/xl` sounds for its own scheduled chains; avoid duplicating those. `steam` aliases the FX art for `vent_steam`; Audio currently only handles the old spelling.
- **Player:** emit `ice_skid` at the feet with travel `angle` instead of ordinary brown skid dust on ice.
- **QA:** verify final train/lake maps and hardware GPU performance once those assets land. All authored-weather integration remains outside FX ownership.


---

# Effects and game feel — Phase D review fixes and polish

This section supersedes the Phase B tuning and integration notes below. Edits are confined to FX source/tuning, FX art/exports/pack and this report. No installs, commits, staging, branches or other git mutations.

## Changes

- **F1:** `FxPool.spawn/release` maintain per-combat-kind and per-texture live counts, including delayed slots, reclaim, expiry, clear and duplicate-release safety. `scatter()` no longer scans all 344 slots per call. XL admission uses the texture count; the final cinematic reclaims an older XL if necessary to retain the two-XL cap. Combat counters are exposed in `state().fx.combat`.
- **F2:** fallback popups use `Text.setColor()` instead of multiplying the yellow text fill with `setTint()`.
- **Engine helper adopted:** FX reads frame order/durations from Preload's shared animations, guarded with `hasAnim()`. FX continues advancing pooled Images with scaled dt, avoiding double animation clocks or re-registering Aseprite animations.
- **Readability:** smoke, debris, embers, bursts and ordinary glows draw at depth 39, below enemies/core (40), player (50), projectiles (60). Cannon anticipation alone overlays its cannon at depth 41, still below player/projectiles. Loose embers are small ochre diagonal slivers with normal blending, no red/white round core. Delayed and newly emitted effects are presented in POST_UPDATE after alpha configuration, fixing the full-opacity birth frame.
- **Opacity budget:** smoke alpha ≤.28, cloud coverage ≤8%, all pooled FX ≤16% of the viewport. Coverage is the sum of clipped, alpha-weighted painted bounding rectangles, conservative about holes within shapes. Tight bounds are cached from one atlas readback at startup; no texture readback, allocation or geometry creation during presentation. This preserves ignition strength without charging transparent atlas padding against the budget. `fx.coverage` / `fx.cloudCoverage` expose the actual bounded values. Camera bloom/flash are separate from this sprite budget.
- **Feel:** ordinary/melee/machine kill stops 32/48/55 ms; M/L/XL stops 45/65/100 ms; phase 65 ms; death 75 ms. Max coalescing remains, with a 160 ms real-time gate for routine stop requests; death/finale retain priority. FX requests respect shake off/reduced flash and reduced-motion flash suppression.
- **Boss death:** positioned chain stays Enemies-owned. At zero HP, FX cancels pending anticipation and suppresses its extra chain stops/flashes. `boss:defeated` supplies one final XL at x,y−48, the `explo_xl` audio call, 120 ms hitstop, settings-gated white 45 ms flash, then .35× for 900 ms **after** the stop. Initial death flash/slow-mo/body parts remain Enemies-owned. Do not add a duplicate finale/slow-mo on that event.
- **Snow:** new `fx_impact_snow_burst` emits cool powder and pale flakes for `material=snow`; no brown rock chips. New `fx_heat_reach` provides rising broken heat ribbons. Pack/catalog now contain 37 textures, 224 frames and 66 tags; palette, binary alpha, frame bounds, durations and references validate.

## Boss event integration

Enemies has now wired all three `fx:emit` effects (confirmed in `Moosezilla.ts` and its Phase D report):

- `boss_cannon_charge`: cannon socket, one event per committed windup; converging sparks and charge glow for 320 ms. Second socket is staggered by the boss.
- `boss_flame_reach`: mouth, committed `angle`, `scale=88/84`; rising heat ribbons along an 84×scale px reach for 400 ms.
- `boss_charge_lane`: leading foot/ground y, committed `angle`; sequential low dust along ~160×scale px for 500 ms.

`scale` is clamped .25–2. FX clears anticipation on phase change/death. Enemies owns its interruption-safe floor graphics, timing, poses, damage and sounds. There is no outstanding event-wiring request. The natural-event capture harness does not inject these anticipation events.

## Verification and evidence

- `npm --prefix game run typecheck`: pass. `npm --prefix game run check:phaser4 -- --strict`: **84 files, zero errors/warnings**. Logs: `/tmp/kbe-fx/phase-d-{typecheck,phaser4}.log`.
- Requested `node game/tests/perf/probe.mjs`: **passed**, 60.068 average FPS, minimum 58; average frame 16.666 ms, p95 16.7, p99/max 16.8; zero >50/>100 ms spikes and zero sampling/browser errors. 1,265 frame samples. Report: `game/tests/artifacts/2026-10-16T19-30-52-945Z-perf-3534419/report.json`; log `/tmp/kbe-fx/phase-d-perf-final.log`. Earlier attempts hit localhost sandbox denial or browser `ERR_NETWORK_CHANGED` before gameplay and are not performance results.
- Real bridge/bunker/MOOSEZILLA phase-3 scenes, HMG held, extra three-burst chains every 800 gameplay ms, five live enemy bullets placed through the densest effects: **all checks passed**, zero actor/projectile-depth violations; coverage never exceeded .16/.08 and smoke never exceeded .28. Boss HP was held at 99 during the HMG readability workload. These are explicit stress fixtures, not unassisted balance/playthrough claims.
- Bridge/bunker/boss stress averages **58.81 / 58.81 / 59.86 FPS**, p95 **16.8 / 16.7 / 16.7 ms**, zero >50 ms spikes. FX CPU moving averages **.126 / .091 / .086 ms**, observed peak CPU **3.6 / 2.0 / 1.8 ms** (includes setup/JIT/event spikes). Peak active slots **129 / 115 / 145**, below fixed 344 capacity. Detailed report: `/tmp/kbe-fx/phase-d-verification.json`; harness `/tmp/kbe-fx/phase-d-verify.mjs`. Pool acquire/release/idempotence/reclaim/expiry/clear invariants, settings suppression and snow dispatch pass.
- Natural boss anticipation, phase cancellation, single defeat/finale, final audio request and slow-mo recovery: **passed**, `/tmp/kbe-fx/phase-d-natural.json` and `.mjs`. Death composition was centered by a fixture position adjustment; boss timing and parts use the real implementation. Audio was muted; dispatch was verified, audible mixing was not.
- QA's unchanged full suite: **17 passed, 2 failed** in 1.2 minutes. Failures: Title→Game→Pause→resume stayed paused; movement test passed its motion assertion but recorded `ERR_NETWORK_CHANGED`. Both passed on an isolated two-test recheck (11 s). Preserve this as a flaky initial run, not a clean 19/19 run. Logs `/tmp/kbe-fx/phase-d-qa.log` and `phase-d-qa-recheck.log`; JSON/traces under `/tmp/kbe-fx/phase-d-qa/` and `phase-d-qa-recheck/`. Temporary configs only override artifact paths; no QA source edits.
- Art validation: `/tmp/kbe-fx/phase-d-art-validation.json`. Strict palette / binary alpha / catalog checks pass for all 37 sheets.

Opened and inspected these PNGs under `/tmp/kbe-fx/`: `phase-d-{bridge,bunker,boss}-{hot,smoke}.png`, `phase-d-natural-cue-{1,2,3}.png`, `phase-d-natural-death-chain.png`, `phase-d-natural-final-boom.png`, and `phase-d-snow-only.png`. Player silhouettes, dangerous round outlined bullets, HMG tracers and phase-3 core stay distinct. Snow reads as cool powder. The last natural finale visibly overlaps the world while preserving Knotz and detached parts. Existing boss HP fill still appears empty/dark in captures (QA #10, UI-owned); no UI edits were made.

All timings are Chromium/SwiftShader on this shared host, not a real-GPU acceptance claim. T3 preview could not launch because host browser libraries are missing; verification used the repository's configured Chromium harness. Scratch/evidence are in `/tmp/kbe-fx/`, except the requested unmodified perf probe's own artifact directory above.

---

# Effects and game feel — Phase B runtime

Phase B implements the runtime in `game/src/fx/{index,director,pool,filters,gallery}.ts` and `game/src/config/tuning/fx.ts`. The Phase A art plan is preserved below as historical design context; this section takes precedence where implementation or the live engine contract differs.

## Integration and viewing

`registerFx(ctx)` is synchronous and event-driven. Preload owns Aseprite loading/animation registration. FX caches atlas tag frame names and exact per-frame durations once, then advances prewarmed Images using engine-scaled `dt`; there are no independent animation clocks, gameplay timers, Arcade debris bodies, or damage calls. Delayed smoke/poofs occupy pool slots with a negative age, so there is no per-burst timer/closure allocation.

Normal play: `?scene=Game&mute=1&seed=7`. Gallery: add `&fxtest=1` to emit S/M/L/XL at 1.2-second gameplay intervals, plus a splash on every fourth burst. Add `&debug=1` for engine FPS. `window.__KBE.state().fx` reports active/peak objects, dropped optional requests, cumulative impacts/explosions/splashes, filter mode, ambient fallback mode, pooled popups, FX CPU moving average and peak. CPU includes FX event handlers, update and post-update impact/feel flush; it excludes Phaser render/GPU work and text texture uploads.

```sh
node game/tools/shot.mjs --out /tmp/kbe-fx/b1.png \
  --query 'scene=Game&mute=1&god=1&fxtest=1&seed=7' \
  --steps '[{"down":"x"},{"wait":250},{"shot":"/tmp/kbe-fx/fire.png"},{"press":"c"},{"wait":700},{"shot":"/tmp/kbe-fx/grenade.png"},{"up":"x"}]'
```

UI popup handoff: set `ctx.scene.registry.set('fx.popups', false)` to disable the fallback. It also suppresses itself whenever another `ui:popup` listener exists. `FX.popup.enabled` is the compile-time default. Twelve Text objects are preallocated; changing popup text necessarily rasterizes a new string, but does not create/destroy Text objects. UI can own the richer implementation without duplicate text.

## Runtime recipes and tuning

| Effect | Shake request | Hitstop | Composition / gate |
|---|---|---|---|
| Pistol / HMG / spread | none / T1 every 160 ms / T1 | none | Authored cardinal/diagonal muzzle, 35 ms glint, bouncing casings; HMG casings ≤14/s |
| Rocket / flame | T2 / none | none | Rear-facing exhaust + two smoke puffs / nozzle, 2 embers, local glow; flame ≤10/s per socket |
| Flesh / melee / machine kill | none (machine explosion owns shake) | 40 / 60 / 80 ms | Delayed cartoon poof or metal debris |
| Player death / boss phase | T2 / T3 | 90 / 90 ms | Death poof/splash; one phase request per distinct phase |
| Explosion S | T1 | 0 ms | 1 smoke, 3 debris, 4 ember requests; no ground decal |
| Explosion M | T2 | 60 ms | 2 smoke, 6 debris, 8 embers; ring .55, scorch .5 |
| Explosion L | T3 | 100 ms | 3 smoke, 10 debris, 14 embers; ring 1, scorch .85 |
| Explosion XL | T4 | 150 ms | 4 smoke, 16 debris, 24 ember requests (16 global live cap); ring 1.35, scorch 1.2 |
| Boss defeated | existing final burst owns shake | .35× for 900 real ms after hitstop | Current boss emits defeated **after** destruction bursts; FX does not invent body coordinates/timing |

Stops/shakes coalesce by maximum in `POST_UPDATE`, after projectile damage. Small shake retriggers gate at 75 ms. The engine owns actual camera tier amplitudes/durations and clamps hitstop at 250 ms. XL screen flash is warm white, 45 ms, ≤1/600 ms; `settings.reducedFlash` and OS reduced-motion suppress FX flash requests entirely. `settings.shake` gates shakes. Actual engine shake tiers are currently stronger/longer than the original targets below (see requests).

Explosion art supplies the flash/fireball/smoke progression. Additional puffs begin 180–320 ms after ignition and stagger by 60 ms. Late fireball/smoke moves to `ENEMIES - 1` after 42% of its duration; alpha .65, separate smoke .52. Scorch requires a standable surface within 24 px, excludes water/one-way platforms, expires at 8 s or 64 px behind camera. Airbursts never create floating decals. More than two concurrent XL sprites degrade to L. Material impacts distinguish metal, shield, wood, dirt/stone/snow, water and flesh. Paired hurt/impact events within 4 px coalesce, capped at 16 per frame.

Hard prewarmed budgets: 64 animated effects (12 explosion, 8 muzzle, 16 impact, 12 dust, 16 smoke), 160 combat motes (64 debris / 80 sparks / 16 embers), 64 ambient, 32 casings, 16 decals, 8 glow helpers = **344 FX Images**, plus **12 popup Texts**. Optional requests drop when full. Ambient subcaps: snow 32, embers 12, fireflies 12, steam 6. Existing muzzle sockets reuse their slot; casings and decals reclaim the oldest. No unbounded pool growth.

Phaser 4 camera bloom uses verified `Phaser.Actions.AddEffectBloom` internal ParallelFilters, threshold .82, two low-quality blur steps, radius 1, strength .10. It runs only while hot explosion/glow slots exist. `?fxbloom=0` provides a profiling comparison. CRT uses **one** registered `BaseFilterShader` RenderNode with one texture sample, .06 logical scanlines, .16 vignette and .006 radial curvature. `settings.crt` toggles it via both `settings:changed` and the settings store; HUD is a separate Scene. Shutdown removes only retained FX filter handles; registration checks `renderNodes.hasNode` so scene restarts do not duplicate shader constructors.

## Spatial and ambient contract

- `enemy:shoot` now drives weapon muzzles and casings, without player launch shake.
- `fx:emit` handles `dust_run`, `dust_skid`, `dust_land`, `splash`, `waterfall` (single splash), `vent_steam`, `debris`, `shield_spark`, `shockwave`, `muzzle_enemy`, `casing`, `scorch`. Unknown effect ids are ignored. Count/scale are bounded.
- `fx:zone` keeps 32 fixed registry slots keyed by id, activates only visible intersection, supports snow/embers/fireflies/**steam**, and resets emission debt offscreen. Active visible zones take precedence over camera-wide fallback ambience.
- `fx:ambience` controls camera-wide snow/embers/fireflies. Runtime also understands steam, but the current event type still needs that enum member. Steam is already available through zones and `vent_steam`.
- Until every owner emits spatial events, conservative P1 movement/hazard observation supplies run/skid and water-entry effects. Explicit dust suppresses the inferred dust for 250 ms; nearby splash requests dedupe for 180 ms. Explicit waterline events remain preferable, especially for P2 and moving water.

## Phase B verification

Typecheck and Phaser 4 scanner pass. Focused browser checks in `/tmp/kbe-fx/verify.mjs` pass for paired-impact dedupe, all five weapons/eight directions, reduced flash/shake settings, CRT shader, pause, pool overflow/recovery, zones, steam/splash, real sandbox water entry, .35× slow-motion recovery, and scene restart. Restart retains exactly one FX impact listener and one CRT controller, with no console/page errors. These checks found and fixed camera shutdown ordering and duplicate RenderNode constructor registration.

Visual frames inspected: `fire.png`, `grenade.png`, `tiers-sm.png`, `tier-l-hot.png`, `tier-xl-hot.png`, `tier-xl-tail.png`, `crt.png`, `weapon-{pistol,hmg,spread,rocket,flame}.png`, `water-steam.png`, `water-fall.png`, `water-fall-current.png` in `/tmp/kbe-fx/`. XL reads as a contained fireball; actors remain above its cooling smoke. Mid-action real shots killed a sandbox target (score 100); grenades used real Player/Engine events. The final river-bridge capture shows the actual water-entry splash at x=3000, with one splash event and a clean console. One earlier capture was interrupted by a concurrent shared-checkout hot reload and was rerun.

QA's original suite completed **13 passed, 3 skipped (3.8 min)**. Skips are unregistered UI flows. The first attempt found port 4310 occupied; an isolated-port attempt was time-limited and interrupted during concurrent integration, then the original configuration was rerun successfully. Final log: `/tmp/kbe-fx/qa-final.log`.

The 30-second stationary workload on the integrated **Pine Ridge Breakout** uses 14 HMG muzzle/impact events per gameplay second, three M/M/L explosions every 1.5 gameplay seconds, and snow zones. Bloom enabled: **60.22 average FPS, 58 minimum FPS, 16.666 ms mean frame, 16.7 ms p95, 16.8 ms p99/max, zero >50 ms frames**. FX peak **111 live Images**, **0 drops**, **0.9 ms peak FX CPU**, sampled moving-average CPU ≤0.125 ms. 399 impacts and 54 explosions were processed. The final run disabled hot reload, processed all 1799 measured frames continuously, and recorded no browser errors. An earlier complete run had two startup `net::ERR_NETWORK_CHANGED` errors and was superseded by this clean run. Report: `/tmp/kbe-fx/stress.json`. These are SwiftShader/Chromium relative measurements, not target hardware GPU timing.

The earlier standard 20-second probe on the sandbox completed measurement but **failed** its gameplay assertion when the god-mode player fell into the pit at x=617, y=326 and lost a life. It measured **59.45 average FPS, 56 minimum, 16.722 ms mean frame, 16.8 ms p95/p99, 83.3 ms max, one >50 ms frame, zero >100 ms frames**, with no browser errors. Original report copied to `/tmp/kbe-fx/perf-probe.json`. This is a Player/probe traversal issue, not a passing baseline. The no-bloom comparison completed 30 seconds with hot reload disabled: **60.08 average FPS, 57 minimum, 16.666 ms mean frame, 16.7 ms p95, 16.8 ms p99/max, zero >50 ms frames**, 111 peak FX, zero drops, 2.1 ms peak FX CPU, and no browser errors. Both variants were refresh-rate limited in this software renderer; the comparison does not measure GPU time. Report: `/tmp/kbe-fx/stress-no-bloom.json`. An earlier no-bloom attempt was discarded because a concurrent hot reload reset the measurement (only 140 frame samples and zero FX events). The stable fixture now rejects incomplete workloads.

The mandatory standard probe was rerun after the real level landed and **passed**: **60.11 average FPS, 59 minimum, 16.666 ms mean frame, 16.7 ms p95, 16.8 ms p99/max, zero >50 or >100 ms frames**, 1262 frame samples, 204 FPS samples. No gameplay assertions failed; the player travelled 1553 px. No browser errors, FX drops, or sample errors; FX peak 49 live Images and 0.8 ms CPU. Final report: `/tmp/kbe-fx/perf-current.json`; original artifact: `game/tests/artifacts/2026-10-16T18-31-40-741Z-perf-3469893/report.json`. This supersedes the earlier sandbox failure for current integration.

## Requests for other teams (Phase B)

- **Engine:** the added `fx:emit`, `fx:zone`, `enemy:shoot`, optional boss positions, and `reducedFlash` settings are consumed. Add `'steam'` to `fx:ambience.kind` for the full requested fallback catalog. Consider matching shake tiers to the Phase A target durations 65/110/170/260 ms and displacement .7/.4, 1.3/.8, 2.4/1.4, 4/2.5 px; current engine tiers are 90/160/260/480 ms at .004/.008/.014/.022 intensity. Other teams' direct `fx:flash` requests still use Engine's reduced-flash behavior (dim/shorten rather than suppress); our requests suppress completely.
- **Player:** continue emitting one `player:shoot` per shot/burst. Rocket uses the supplied position as rear exhaust because the art is backblast; provide the rear socket rather than the projectile muzzle, or extend the event with named sockets. Explicit skid/run/splash emissions have now landed and are consumed. Keep waterline coordinates precise; FX's conservative fallback observes P1 only.
- **Enemies/boss:** rifle/cannon `enemy:shoot` now lands and is consumed. Add `fx:emit` vent/head-landing events where appropriate, and keep `boss:defeated` terminal after the final explosion. FX uses that terminal event for delayed slow motion and never synthesizes damage.
- **Levels:** zone publication has now landed and is consumed. Add steam zones/vent sockets and precise waterline events where authored; zones avoid emission outside the authored region.
- **UI/audio:** disable fallback popups with registry `fx.popups=false` when claiming them. Use `crt`, `shake`, `reducedFlash` settings; no FX-owned sound duplication. Listen to the same impact/explosion events for material audio.
- **QA/Lead:** the custom shader and bloom are visually verified under SwiftShader, not a target midrange hardware GPU. Confirm hardware GPU cost against the 2 ms budget before treating software-renderer FPS as hardware certification.

---

# Effects and game feel — Phase A

Status: art library complete; integration and performance measurements belong to Phase B. No `game/src` files are changed. The intent is a brief, unmistakable impact followed by weight and aftermath: flash → hot expanding folds → staggered cooling → rolling smoke → isolated embers. Fire uses all six `fire` colors plus white; smoke uses the violet `ink` ramp. Every opaque pixel is in the master palette. No generated noise, gradients, fractional alpha, or external art is used.

## Deliverables and rebuilding

From `game/`:

```sh
bash tools/build-art.sh art-src/fx/explosions.lua art-src/fx/weapons.lua art-src/fx/impacts.lua art-src/fx/ambient.lua art-src/fx/zz_manifest.lua
```

`lib/draw.lua` contains bounded drawing, polygon rasterization, stars, rings, and scalloped/shaded cloud rolls. The four authoring scripts call `K.build`; each writes an editable `.aseprite` alongside its Lua and a packed `.png`/`.json` pair to `public/assets/sprites/fx/`. `zz_manifest.lua` runs last and writes the Phaser pack plus `art-src/fx/catalog.json`. It checks that every asset exists. The normal all-art build sorts it after the authoring scripts and excludes `lib/`.

All **35 pack entries use `type: "aseprite"`**, including static variants. Load `assets/packs/fx.json`, then call `scene.anims.createFromAseprite(key)` once per loaded texture. There are **212 frames and 64 globally unique tags**. Keep Aseprite's per-frame durations. Animated effects play once and return to their pool on completion; no transparent terminal frame is required. Casings, foliage, and fireflies loop only when explicitly requested. Static particle variants select a frame directly, never play the entire sheet as an animation.

`catalog.json` records dimensions, pixel pivots, recommended blend mode, animation tags, exact atlas frame keys, and durations. A frame key is, for example, `fx_debris_metal#0`, independent of its packed position. Variant tag `fx_debris_metal_v1` identifies that frame; `_v2` identifies `#1`, etc. `#` indices are zero-based, unlike source frame numbers in Aseprite's UI. Engine can build a tag-to-frame lookup from this catalog or the Aseprite JSON. The catalog is authoring metadata, not an additional asset-pack entry.

| Texture key(s) | Canvas; frames | Tags / intended use |
|---|---|---|
| `fx_explosion_s`, `_m`, `_l`, `_xl` | 32² / 48² / 80² / 128²; 8 / 10 / 14 / 16 | `<key>_burst`; 510 / 640 / 900 / 1030 ms |
| `fx_smoke` | 32²; 8 | `_drift`, 840 ms lingering billows |
| `fx_shockwave` | 80×48; 6 | `_expand`, 270 ms ground-plane ellipse |
| `fx_scorch` | 48×24; 2 static variants | `_round`, `_scatter` |
| `fx_muzzle_pistol`, `_hmg`, `_spread`, `_rocket`, `_flame` | 48² each; 3 + 3 | `<key>_right`, `<key>_diag`; 105 ms each |
| `fx_casing` | 10²; 4 | `_spin`, 70 ms per rotation pose |
| `fx_sparks` | 8²; 6 static variants | `_v1`…`_v6`; star, slash, streak, vertical, chip, dot |
| `fx_debris_metal`, `_wood`, `_rock` | 12² each; 4 static variants each | `<key>_v1`…`_v4` |
| `fx_impact_dirt`, `_wood` | 32×24; 6 each | `_burst`; 300 / 330 ms |
| `fx_impact_metal` | 32²; 5 | `_burst`, 230 ms |
| `fx_impact_shield` | 24²; 5 | `_tink`, 250 ms |
| `fx_water_splash` | 80×56; 9 | `_fall`, 660 ms; large fall splash |
| `fx_water_ripple` | 32×16; 6 | `_expand`, 390 ms; bullet splash |
| `fx_dust` | 32×20; 6 + 4 + 4 | `_land`, `_skid`, `_run` |
| `fx_hit_pop` | 24²; 5 | `_burst`, 235 ms; blood-free flesh hit |
| `fx_death_poof` | 48²; 8 | `_burst`, 600 ms; cartoon death aftermath |
| `fx_snow` | 9²; 4 static variants | `_v1`…`_v4`; 1 px speck through 7 px flake |
| `fx_foliage` | 12²; 4 + 4 | `_leaf`, `_needle`; tumbling poses |
| `fx_embers` | 8²; 4 static variants | `_v1`…`_v4` |
| `fx_firefly` | 12²; 4 | `_pulse`, 720 ms; additive glow dot |
| `fx_steam` | 48²; 8 | `_vent`, 770 ms; MOOSEZILLA vents |
| `fx_glow_8`, `_16`, `_32` | 8² / 16² / 32²; 1 each | `<key>_still`; six discrete fire bands, ADD at alpha 0.12–0.3 |
| `fx_flare` | 32×8; 1 | `_still`; additive bullet glint, alpha 0.35, 35 ms |

### Placement and readability

Default origin is `(0.5, 0.5)`. Explicit pixel pivots: all muzzle assets `(8,24)`; dirt/wood impact `(16,20)`; splash `(40,47)` at waterline; steam `(24,44)` at vent; land dust `(16,16)`; skid/run dust `(26,16)` with plume trailing left. Normalize those by canvas width/height for `setOrigin`. Mirror trailing dust when moving left. Explosions retain the centered pivot even as smoke rises inside the canvas. Decals are centered on a detected ground contact and never float at an airburst.

Muzzle `_right` points right; `_diag` is separately rasterized at **−45°**. Use `_right` for cardinal directions and rotate by exact 90° steps; use `_diag` for diagonal directions and rotate by `aimAngle + π/4`. Both retain the same pivot. This avoids 45° resampling of tiny pixels. Rocket art is the **backblast**: place it at the rear exhaust socket and orient it at `aimAngle + π`. The current shoot payload supplies only a generic x/y; Player must define it as the exhaust socket for rocket, or extend the event with named sockets. Flame art is the nozzle flash, not the damaging flame projectile.

Normally use `NORMAL` blending for fire sprites so their dark rolls remain readable. Glow helpers/fireflies/flare use ADD; do not add filters per particle. Put scorch at `DECALS`; dense smoke behind actors (proposed `ENEMIES - 1`); small hit glints/muzzles at `FX`; sparse finishing sparks at `FX_TOP`. An explosion can briefly cover the player for its first 40 ms. Late smoke should never obscure player/enemy-bullet silhouettes. Recheck actor contrast in Phase B before changing established depth constants.

## Event → effect mapping

All values are initial tuning at 384×216, in world pixels and milliseconds. `0` means deliberately no response. Entity fill tint, recoil, corpse motion, and sound belong to their owning teams. FX only renders and requests Engine services; explosions never deal damage here. The flash column means **camera flash**, not the white pixels already in an animation. Shake `T1`…`T4` and explosion recipes are defined below.

| Catalog event | Visual / particle response | Shake | Hitstop / slow motion | Camera flash |
|---|---|---|---|---|
| `stage:start` | Clear old pools/decals; seed ambient zones; start weather ramp over 600 ms | 0 | 0 | 0 |
| `stage:clear` | Fade ambient emission over 300 ms; let live particles finish | 0 | 0; don't duplicate boss slow motion | 0 |
| `checkpoint` | 4 upward firefly motes, 20 px/s, life 350 ms at x/y | 0 | 0 | 0 |
| `camera:lock` | Stop ambient spawning outside arena bounds; no celebratory particles | 0 | 0 | 0 |
| `camera:unlock` | Resume ambient bounds following camera; GO arrow belongs to UI | 0 | 0 | 0 |
| `player:spawn` | One land puff; 6 pale spark motes, radius 10, life 240 ms | 0 | 0 | 0 |
| `player:died` | One hit pop immediately; death poof at +160 ms; 4 dust motes. Water splash only with explicit water location signal | T2 | 90 ms | 0; avoids hiding death pose |
| `player:respawn` | One land puff, 8 upward pale sparks, life 300 ms; blinking belongs to Player | 0 | 0 | 0 |
| `player:shoot` | One weapon muzzle, casing for pistol/HMG/spread only, 35 ms flare for hitscan-looking shots; details below | weapon recipe | 0 | 0 |
| `player:jump` | One run-dust puff at feet; scale 0.75 | 0 | 0 | 0 |
| `player:land` | One land puff; `abs(vy)` <120: scale .7; 120–260: 1; >260: 1.2 + 3 dirt motes | T1 only if >260 px/s | 0 | 0 |
| `player:melee` | One hit-pop star, offset 8 px along facing; target's actual damage creates impact | T1 only on confirmed hit, not swing | 0 on swing; kill handles stop | 0 |
| `player:grenade` | 2 small dust motes, life 120 ms at throw socket | 0 | 0 | 0 |
| `weapon:changed` | No world effect: lacks position; pickup handles celebration | 0 | 0 | 0 |
| `ammo:changed` | No FX; UI updates count | 0 | 0 | 0 |
| `bombs:changed` | No FX; UI updates count | 0 | 0 | 0 |
| `score:changed` | No FX; UI owns digits | 0 | 0 | 0 |
| `lives:changed` | No FX; do not duplicate player death/respawn | 0 | 0 | 0 |
| `rescued:changed` | No FX; `pow:freed` owns celebration | 0 | 0 | 0 |
| `projectile:impact` | dirt: puff + 2 rock chips; metal: burst + 4 sparks; wood: burst + 3 wood chips; shield: tink + 2 sparks; water: small ripple; flesh: hit pop. Unknown material: small hit pop | 0 | 0 | 0 |
| `entity:hurt` | Flesh/contact hit pop or material effect when no impact was received nearby this tick; flame adds 2 embers max / 100 ms. Entity applies 50 ms white FILL tint and restores MULTIPLY | 0 | 0 | 0 |
| `enemy:killed` | Flesh enemy: poof at +120 ms, 4 dust motes, allow owner corpse launch first; turret/drone: 6 metal debris, explosion supplied by enemy once | 0 for flesh; machine explosion owns shake | 40 ms ordinary; 60 ms melee; 80 ms turret. Coalesce same-tick kills by max | 0 |
| `explosion` | Tier recipe; one authored burst, smoke/embers/debris, ground-only ring/decal | T1 / T2 / T3 / T4 | 0 / 60 / 100 / 150 ms | S/M/L: 0; XL: warm white 45 ms, max once / 600 ms |
| `pickup:collected` | 6 small stars rising 20–35 px/s, life 300 ms; life pickup: 10 stars, life 450 ms | 0 | 0 | 0 |
| `pow:freed` | 6 fireflies/white spark stars, 18–30 px/s upward, life 500 ms; leave room for salute | 0 | 0 | 0 |
| `boss:spawn` | Register boss-sequence state; one entry T3. Vents/dust need spatial events from boss | T3 | 0 | 0 |
| `boss:hp` | No burst every HP update; record phase-independent health for ambient intensity only | 0 | 0 | 0 |
| `boss:phase` | Once per distinct phase: increase steam/ember emission targets when socket events arrive; break debris must be placed by boss | T3 | 90 ms | 0 |
| `boss:defeated` | Arm 3 s death choreography, suppress ordinary kill feedback; boss supplies explosion positions/head landing | final explosion owns T4 | Request .35× for 900 ms on final burst, not initial event | final XL only |
| `fx:shake` | Engine CameraService consumes tier; FX must not re-emit this event | exact requested tier | 0 | 0 |
| `fx:hitstop` | Engine TimeService pauses/resumes; FX must not maintain a second pause timer | 0 | requested ms, max stacking | 0 |
| `fx:flash` | Engine consumes; accessibility/rate limit gate before camera call | 0 | 0 | requested color/ms |
| `fx:slowmo` | Engine TimeService owns all clocks; no independent FX world-time multiplier | 0 | requested scale/ms | 0 |
| `ui:popup` | UI owns text at x/y; FX does not create a duplicate popup or particles | 0 | 0 | 0 |
| `game:over` | Stop ambient emission; clear transient pools after scene exit | 0 | Cancel pending FX time requests | 0 |
| `game:continue` | Reset quotas/dedupe and release old decals; spawn event supplies respawn puff | 0 | Restore normal time through Engine | 0 |

Do not emit FX consumer events recursively. For paired `projectile:impact` + `entity:hurt`, collect one tick of requests and coalesce the same material within 4 px; prefer the impact. Preserve genuinely separate spread impacts farther apart. Clamp at 16 impacts per rendered frame; this is visual coalescing only. Request stop/shake after processing all same-tick events so simultaneous explosions/kills take the maximum, never sum. Same-tier small explosions have a 75 ms shake retrigger gate; do not queue an avalanche of stops.

### Weapon recipes

| Weapon | Muzzle cadence | Casings | Additional feedback |
|---|---|---|---|
| pistol | Every shot, 105 ms | 1; vx opposite aim 35–55, vy −70…−100, gravity 350, life 650 ms | No camera shake; Player recoil 1 px for 35 ms |
| hmg | Every shot, restart/reuse muzzle slot; at most 1 muzzle per firing socket | 1 per shot, cap 14/s; same ballistics | T1 at most every 160 ms; Player recoil 1 px for 25 ms |
| spread | Every shot, 105 ms | 1; heavier shell, spin every 90 ms | T1; Player recoil 2 px for 45 ms; one muzzle for all five pellets |
| rocket | Rear exhaust, 105 ms | 0 | T2 on launch; 2 smoke puffs separated by 45 ms; no explosion until actual detonation |
| flame | Nozzle pulse at most 10/s, 105 ms | 0 | 2 embers per pulse, life 220 ms; glow alpha .15; no continuous shake |

Casings collide at most twice using cheap ground samples (restitution .3, horizontal damping .55); sleep after impact below 18 px/s, fade over last 120 ms. They are cosmetic, with no Arcade bodies and no ability to block projectiles. Use the supplied four rotation frames rather than arbitrary image rotation.

### Explosion and camera recipes

| Tier | Additional smoke | Debris / ember counts | Ground ring / scorch | Shake duration; peak x/y displacement |
|---|---|---|---|---|
| S | 1 puff, start +180 ms | 3 / 4 | no ring; no decal | T1: 65 ms; .7/.4 px |
| M | 2 puffs, +220/+280 ms | 6 / 8 | ring scale .55; scorch scale .5 | T2: 110 ms; 1.3/.8 px |
| L | 3 puffs, +260/+320/+380 ms | 10 / 14 | ring scale 1; scorch scale .85 | T3: 170 ms; 2.4/1.4 px |
| XL | 4 puffs, +320…+500 ms | 16 / 24 | ring scale 1.35; scorch scale 1.2 | T4: 260 ms; 4/2.5 px |

Debris: speed 45–135 px/s, gravity 320, life 450–900 ms, two cosmetic bounces maximum. Embers: 30–100 px/s, upward bias, gravity 35, life 250–650 ms. Smoke: drift −12…−24 px/s vertically, horizontal ±8, alpha .65 declining to 0 over the final 180 ms. Choose rock debris by default; the current explosion payload lacks surface material. Owners should request metal/wood debris explicitly until the event is extended. Ground detection scans down no more than 24 px through `ctx.level.solidAt`; no ground means omit ring/decal. Keep at most 16 decals, remove the oldest, and expire after 8 s or 64 px behind the camera.

CameraService should use these displacement targets normalized by the 384×216 viewport, with decay and fixed-step random offsets. Screen shake OFF must suppress all tiers, including boss entry. Reduced-flash mode retains local fire art and disables camera flashes. Proposed flash rate limiter permits no more than one XL screen flash per 600 ms, regardless of overlapping events. Entity fill flashes remain short and local.

Boss sequence proposal: 0–2400 ms, eight M/L bursts at irregular 220–380 ms intervals across actual body bounds, max 3 bursts simultaneously; at 2400 ms, one XL at core with 150 ms hitstop; after stop, .35× slow motion for 900 real ms; head landing supplies dust + ground ring. The boss owns destruction timing, body parts, and completion. FX must not schedule approximate offscreen positions from `boss:defeated`, whose payload has no x/y. Explosion timings are choreography inputs, not new damage calls.

## Phaser 4 filter plan — verified against installed 4.2.1

Verified in `game/node_modules/phaser/types/phaser.d.ts` and `src/actions/AddEffectBloom.js`. These are design snippets, not installed gameplay code:

```ts
// Camera already has filters; GameObjects need enableFilters().
const glow = camera.filters.internal.addGlow(
  0xffae22, 0.35, 0, 0.3, false, 4, 4
);
// Signature: color, outerStrength, innerStrength, scale, knockout, quality, distance.
// This camera glow is a diagnostic alternative, OFF in the default preset.

const [bloom] = Phaser.Actions.AddEffectBloom(camera, {
  threshold: 0.82, blurRadius: 1, blurSteps: 2, blurQuality: 0,
  blendAmount: 0.10, blendMode: Phaser.BlendModes.ADD, useInternal: true
});
const vignette = camera.filters.external.addVignette(
  0.5, 0.5, 0.78, 0.16, 0x1a1220, Phaser.BlendModes.NORMAL
);
const grade = camera.filters.external.addColorMatrix();
grade.colorMatrix.contrast(0.04);
const barrel = camera.filters.external.addBarrel(1.01);
// 1 is identity, NOT 0. Curvature is optional and defaults to identity/off.
```

Default quality preset: camera bloom only while hot effects are present, threshold .82, strength .10; pooled palette-step additive dots provide inexpensive local glow. Camera bloom also catches bright snow/white art, so judge snow scenes and cap intensity at .12. Whole-camera glow lights every edge and is unsuitable as the normal fire-only treatment. If bloom is too broad, use `enableFilters()` plus `sprite.filters.internal.addGlow(...)` on at most **two** large hero bursts, with 4 px padding and the controller disabled during the smoke phase. Do not stack hero glow and camera bloom by default. The AddEffectBloom result is an **array**, and each entry contains `parallelFilters`, `threshold`, and `blur`; disable using `bloom.parallelFilters.active = false`. The action defaults to external filters unless `useInternal` is set explicitly. There is no `FilterList.addBloom` method.

CRT toggle OFF by default. ON enables one custom scanline filter plus subtle vignette; grade and barrel are optional quality extras. There is no built-in `addCRT`/`addScanline` API in the installed types. Implement `ScanlineFilter` as a `Phaser.Filters.Controller(camera, 'KbeScanline')` subclass and its node as `Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader`. Verified constructor is `(name, manager, fragmentShaderKey?, fragmentShaderSource?, shaderAdditions?)`; override `setupUniforms(controller, drawingContext)`. Register once through `renderer.renderNodes.addNode(name, node)` or `addNodeConstructor(name, constructor)`, then attach with `camera.filters.external.add(controller)`.

The scanline shader samples the camera texture once and multiplies every second **logical** row by .94, using quantized input UVs and a logical-height uniform of 216. No moving bands, flicker, chromatic fringing, or subpixel shimmer. Phaser 4 textures are Y-up; verify coordinate orientation at noninteger FIT scales. Keep controller handles: toggle `.active`, and remove only FX-owned controllers with `filterList.remove(controller)` on shutdown. `FilterList.clear()` destroys every controller and could remove another team's effects. HUD is a separate Scene and stays unfiltered. Final order: internal bloom, optional external grade/barrel, external scanlines, external vignette. Profile and drop optional grade/barrel first; fuse scanline/vignette into one custom pass only if necessary.

## Performance and lifecycle budget

At 60 FPS, target FX CPU ≤1.5 ms and incremental GPU ≤2 ms on the agreed midrange test device; these are budgets, **not measured claims**. Art sheets total about **2.44 MiB RGBA** before driver overhead, with roughly 72 KiB of PNG downloads. Pack contains 35 texture pages; Phaser may batch several, but blend/order changes still cost draws.

| Resource | Hard cap | Policy |
|---|---|---|
| Animated effect sprites | 64 total | 12 explosion (XL ≤2), 8 muzzle, 16 impact, 12 dust/poof, 16 smoke/steam; preallocate and reuse |
| Combat particles | 160 | up to 64 debris, 80 sparks, 16 loose embers; built-in embers in explosion frames cost no extra particles |
| Ambient particles | 64 | snow 32, foliage 8, fireflies 12, ambient embers 12; combined ceiling always 64 |
| Casings | 32 | oldest sleeping casing reclaimed first |
| Decals | 16 | 8 s expiry and offscreen eviction |
| Glow helper sprites | 8 | ADD, no per-dot filter |
| Total visible FX objects/particles | 344 maximum | 64 + 160 + 64 + 32 + 16 + 8; typical target <140 |
| Emitters | ≤12 resident | one per shared category/texture as practical; no new emitter per bullet |
| Expensive filters | One bloom chain OR ≤2 hero glows | CRT/grade extras only within GPU budget |

Use `ctx.pools` and seeded `ctx.rng`; never allocate new Sprite, TimerEvent, array, or closure per particle in steady state. A fixed-capacity scheduler handles delayed puffs/boss bursts. Prioritize muzzle/impact/primary explosion; reclaim ambient first, then oldest smoke, then optional debris. Reuse an active muzzle at the same socket instead of allowing HMG flashes to accumulate. Cull effect centers >64 px outside camera bounds; retain at most 128 px margin for XL/existing tails. Never cull gameplay or a damaging projectile from this visual budget.

Ambient default tuning: snow 6/s (vx −8…−16, vy 12…22), foliage .7/s (vx −8, vy 10, tumble 140 ms/pose), fireflies 1/s per zone (wander ≤8 px/s; pulse 720 ms), outpost embers 3/s (vy −15…−28), steam one vent animation per socket every 650–1100 ms, capped at 6 live vents. Snow and foliage live behind actors. Ambience needs world-zone bounds supplied by Levels; FX cannot infer the Tiled rectangles from the current event catalog.

Scene shutdown unsubscribes every listener, stops emitters, returns sprites, drops delayed requests, removes owned filter controllers, and cancels owned time requests through Engine. Resume after pause must not dump queued ambient particles. Engine hitstop uses a real-time deadline: scene time paused by hitstop cannot schedule its own unpause. Newly spawned explosion art should remain at its flash frame during stop; do not independently scale it twice under slow motion.

## Phase B implementation plan

1. Read final `src/core/contracts.ts`, events, pool/time/camera services. Replace only FX's no-op `registerFx(ctx)` stub. Create `src/config/tuning/fx.ts` then; Phase A intentionally has no runtime code.
2. Build `FxDirector`, atlas/tag lookup, fixed pools, and shutdown cleanup. Add material impact coalescing, frame-key particle selection, and deterministic randomization. Wire every catalog event with the no-op decisions above.
3. Add weapon socket placement, authored diagonal selection, shell bounce, movement dust, material impacts, explosion recipes, decals, and boss choreography consumers. Entity owners keep tint, hitbox, recoil, corpse physics, and damage.
4. Implement `CameraFeel` as requests to Engine-owned services, with max aggregation and accessibility options. Add `FilterController` and the Phaser 4 scanline RenderNode. Avoid legacy pipelines entirely.
5. Add ambient-zone consumption and budget diagnostics (`fx.active`, particles, dropped requests, peak sprites, CPU time, filter mode) through the Engine debug registry.
6. Validate one shot per weapon in all eight directions, paired hit/impact dedupe, grounded vs airborne explosions, water falls, pause/stop/slowmo recovery, full boss chain, scene restart, reduced-flash/shake-off, and smoke/player contrast. Stress 14 HMG shots/s + 3 explosions + snow for 30 s; verify stable allocations, caps, and 60 FPS. QA owns e2e tests/screenshots; provide stable event-driven scenarios and `seed` values.

## Inspection and known gaps

All 35 assets exported as 4× GIFs under `/tmp/kbe-fx/fx_*.gif`. Inspected PNG strips: `explosions-review.png`, `explosion-xl-review.png`, `weapons-review.png`, `impacts-review.png`, `particles-review.png`. Source review corrected overly radial smoke, staggered the fire-to-smoke transition, and fixed needle/chip edge clipping. Exact-duration exports retain slow smoke tails. Runtime smoke fades, blending, camera filters, full-rate combat overlap, and socket placement need Phase B game verification; the art review does not establish in-game performance or finished Metal Slug-level choreography.

Independent validation in `/tmp/kbe-fx/validate.py` checks all pack paths, atlas dimensions, frame bounds, nonempty frames, frame/tag/catalog agreement, global tag uniqueness, exact palette RGB, and binary alpha. It outputs `/tmp/kbe-fx/validation.json`. Small spark tips, glow textures, and the final ripple intentionally reach their canvas edge; explosion/cloud frames have transparent margins. Deterministic runtime outputs are checked by rebuilding and comparing hashes.

Final checks: the 72 runtime/catalog files were byte-identical after rebuilding all FX scripts. `npm run check:phaser4` passed (29 source files, zero findings). Shared `npm run typecheck` currently fails in Engine-owned `src/core/context.ts:23`: `Property 'glob' does not exist on type 'ImportMeta'`. No FX TypeScript exists in Phase A; route that Vite typing fix to Engine/Lead.

Preview regeneration example (from repo root):

```sh
/home/knotz2/.local/bin/aseprite --batch game/art-src/fx/fx_explosion_xl.aseprite --scale 4 --save-as /tmp/kbe-fx/fx_explosion_xl.gif
```

Game screenshot command after Phase B integration: `cd game && node tools/shot.mjs --out /tmp/kbe-fx/game.png --query 'scene=Game&fast=1&mute=1&seed=7'`. Phase A does not instantiate FX in the game, so this is not presently a visual acceptance test for the new library.

## Requests for other teams

- **Engine:** load the FX pack and confirm animation registration is owned by FX or Preload (one owner). Preserve all existing catalog events. Provide a small typed spatial effect event, proposed `fx:emit { effect, x, y, angle?, count?, material? }`, or specific equivalents for skid/run dust, water falls, boss vents, debris, and enemy muzzle flashes; none currently has adequate source data. Provide ambient zone add/remove events or a registry with rectangles. Confirm hitstop clocks, max stacking, filter/scene teardown, and camera shake options.
- **Player:** shoot x/y must be the muzzle socket; rocket needs rear exhaust coordinates (or explicit sockets). Keep one shoot event per trigger/burst, not per spread pellet. Emit land impact velocity before zeroing the body. Supply skid/run intervals and waterline fall position through the agreed event, and restore entity tint mode after hurt.
- **Enemies/bosses:** emit one actual `explosion` for machine deaths (FX does not synthesize damage), material impacts for shield hits, and enemy shooting socket events. Boss event payload lacks position: supply body explosion positions, vent sockets, debris materials, and final head landing. Own the three-second death timeline and send final XL once; coordinate slow motion start after the final stop.
- **Levels:** supply ambient zone bounds, water surface y, and surface/debris material where known. `solidAt` alone cannot distinguish water, dirt, metal, and wood. Keep scorch off water and moving platforms unless local-space attachment is provided.
- **UI/audio:** expose independent CRT, screen-shake, and reduced-flash toggles to FX/Engine. Own popups and sound; bind shield tink, casing bounce, explosion tiers, and impact surfaces to the same event recipes without duplicate effects.
- **QA/Lead:** review the scaled GIFs and strips, then route API requests before Phase B. Confirm the reference midrange device and GPU quality preset. No additional dependencies or generated image assets are requested.
