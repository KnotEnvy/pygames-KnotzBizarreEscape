# UI, HUD and Audio team notes

Phase A deliverables (art + audio assets, no `src/` code yet) and the Phase B implementation plan.
Everything here is generated from source scripts and can be regenerated:

| What | Source | Build command | Output |
|---|---|---|---|
| Bitmap fonts | `game/art-src/ui/fonts.lua` (+ `lib/glyphs.lua`, `lib/ui.lua`) | `bash tools/build-art.sh art-src/ui/fonts.lua` | `public/assets/fonts/*.png/.xml` |
| HUD kit, prompts, countdown, ranks, panels, boss bar | `game/art-src/ui/hud.lua` | `bash tools/build-art.sh art-src/ui/hud.lua` | `public/assets/ui/*` |
| Logo (animated) | `game/art-src/ui/logo.lua` | `bash tools/build-art.sh art-src/ui/logo.lua` | `public/assets/ui/logo.png/.json` |
| SFX (66) | `game/tools/audio/sfx.py` (DSP in `kbe_synth.py`) | `bash tools/audio/build.sh sfx` | `public/assets/audio/sfx/*.ogg` + `sfx_manifest.json` |
| Music (6) | `game/tools/audio/music.py` | `bash tools/audio/build.sh music` | `public/assets/audio/music/*.ogg` + `music_manifest.json` |
| Asset pack | `game/tools/audio/make_pack.py` (scans the dirs + manifests) | `uv run --with numpy python3 -I tools/audio/make_pack.py` | `public/assets/packs/ui.json` |
| QA | `tools/audio/analyze.py` (levels, seams, spectrograms), `tools/audio/pianoroll.py` | `bash tools/audio/build.sh analyze` | `/tmp/kbe-ui/audio/*.png` |

Previews: `/tmp/kbe-ui/fonts/hud_x3.png`, `/tmp/kbe-ui/fonts/callout_x3.png`, `/tmp/kbe-ui/hud_mock_x3.png`,
`/tmp/kbe-ui/logo_mock_x3.png`, `/tmp/kbe-ui/logo_glitch.png`, `/tmp/kbe-ui/audio/sheet_*.png`, `/tmp/kbe-ui/audio/roll_*.png`.

## 1. Fonts (`this.load.bitmapFont`, BMFont XML)

| Key | Glyphs | Cell | Use | Notes |
|---|---|---|---|---|
| `font_hud` | 5×7 white fill, 1 px dark outline | 7×9, advance 6, lineHeight 10 | all HUD/menu text | fill is pure white: tint with `setTint()` and the outline stays dark |
| `font_hud_gold` | same metrics, fire-ramp gradient fill | | score digits, labels (ARMS/BOMB/1UP) | monospace, so score columns line up |
| `font_hud_plain` | 5×7 white, no outline | 5×7, advance 6, lineHeight 9 | dense text (Options, Credits, debug) | |
| `font_callout_fire` | chunky 12×16 bold letters, outline + 1 px drop shadow, fire ramp | ≈15×20, lineHeight 21 | "MISSION 1 START!", "HEAVY MACHINE GUN!", PAUSE | uppercase only: lowercase maps to the same glyphs |
| `font_callout_sand` | sand ramp | | weapon names, "RESULTS" | |
| `font_callout_steel` | steel ramp | | "MISSION COMPLETE", boss name | |
| `font_callout_white` | white | | tintable callouts ("GAME OVER" tinted red, menu highlight) | |

All fonts cover printable ASCII (the callout set lacks `\ ^ ` { | } ~`) plus these Unicode symbols, usable directly in strings:
`→` U+2192, `←` U+2190, `↑` U+2191, `↓` U+2193, `▲` U+25B2, `●` U+25CF, `×` U+00D7, `♥` U+2665, `∞` U+221E (for `ARMS ∞`).

Metal Slug trick for callouts: slam the text in with a scale tween is **not** allowed (no sprite scaling), so animate with
position (drop from above + 2-frame overshoot) and a 4-frame flash by swapping `font_callout_fire` ↔ `font_callout_white`.

## 2. UI sheets (`this.load.aseprite`; tag = animation key; all tags are globally unique)

| Key | Canvas | Tags / frames |
|---|---|---|
| `ui_icons` | 16×16 | `icon_pistol icon_hmg icon_spread icon_rocket icon_flame icon_bomb icon_life icon_pow icon_medal icon_skull icon_check`, `ui_cursor` (4 frames, 120 ms, bouncing arrow) |
| `ui_hud` | 64×24 | `hud_1up` (24×12 badge at top-left of the frame), `hud_go` (4 frames, 110 ms: "GO!" + flashing/stepping arrow) |
| `ui_prompts` | 40×14 | `prompt_key_z/x/c/j/k/l/shift/esc/enter/space/up/down/left/right`, `prompt_pad_a/b/x/y/start/rb/dpad` (centered in the 40 px cell; use origin 0.5) |
| `ui_countdown` | 28×36 | `countdown_0` … `countdown_9` (big fire numerals for the CONTINUE screen) |
| `ui_rank` | 36×44 | `rank_s` (gold + sparkles) `rank_a` (silver) `rank_b` (bronze) `rank_c` (grey), 3D extruded stamps |
| `ui_logo` | 240×112 | `logo_idle` (1 frame), `logo_glitch` (4 frames, 70 ms: band displacement + neon ghost; play it every few seconds on the Title) |

Plain images: `ui_panel` (24×24, **9-slice with 8 px borders**: `this.add.nineslice(x, y, 'ui_panel', undefined, w, h, 8, 8, 8, 8)`),
`ui_panel_thin` (12×12, 4 px borders), `ui_bossbar_frame` (204×14; the slot is at (3,4) 198×6), `ui_bossbar_fill`
(198×6 gradient with 20 px ticks; crop its width with `setCrop(0, 0, hp/maxHp*198, 6)`).

HUD layout (384×216), see `/tmp/kbe-ui/hud_mock_x3.png`: top-left `hud_1up` + score (`font_hud_gold`, 8 digits) + `icon_life ×N`;
top-center weapon icon + `ARMS` + ammo/∞ and `icon_bomb` + `BOMB` + count; top-right rescue tally as a row of `icon_pow`;
`hud_go` at the right edge, y≈90; boss bar bottom-center with `icon_skull` and the boss name above it in `font_hud` tinted `red5`.

## 3. Audio key catalog

All files are OGG Vorbis 44.1 kHz. SFX are mono; loudness is pre-balanced per tier (max-300 ms RMS; see `rms` in the manifest),
so the default `volume` is 1.0 and the numbers below are *multipliers* on top of that. "Vary" = the AudioService should
randomize detune (±60 cents) on every play. Other teams call `ctx.audio.sfx('<key>')`; the listed *trigger* is the event
the Audio layer will subscribe to in Phase B when the key is event-driven (then gameplay code needn't call it directly).

### Weapons and explosions
| Key | When | Vol | Notes |
|---|---|---|---|
| `pistol` | `player:shoot` weapon=pistol | 0.9 | vary |
| `hmg` | `player:shoot` weapon=hmg | 0.7 | 70 ms, burst-friendly; voice-limited to 1 new instance per 40 ms, vary |
| `spread` | `player:shoot` weapon=spread | 1.0 | |
| `rocket_launch` | `player:shoot` weapon=rocket | 1.0 | |
| `rocket_whoosh` | while a rocket flies | 0.6 | **loop**; one instance, stop when the rocket dies |
| `flame_start` | flame trigger pressed | 0.8 | |
| `flame_loop` | while flame button is held | 0.7 | **loop**; fade out 80 ms on release |
| `grenade_throw` | `player:grenade` | 0.8 | |
| `grenade_bounce` | grenade first bounce | 0.7 | vary |
| `explo_s` / `explo_m` / `explo_l` / `explo_xl` | `explosion` size s/m/l/xl | 1.0 | vary ±40 cents; `explo_xl` is also the boss-death chain tier |

### Impacts and melee
| Key | When | Vol | Notes |
|---|---|---|---|
| `impact_dirt` / `impact_wood` / `impact_metal` / `impact_body` | `projectile:impact` by material (flesh→`impact_body`) | 0.7 | vary, voice-limit 4 |
| `shield_tink` | bullet blocked by a riot shield | 0.8 | vary |
| `melee_slash` | `player:melee` | 1.0 | |
| `melee_hit` | melee connects (enemy hurt with kind=melee) | 1.0 | |

### Player
| Key | When | Vol | Notes |
|---|---|---|---|
| `jump` | `player:jump` | 0.7 | |
| `land` | `player:land` | 0.6 | scale volume by fall speed |
| `pickup` | `pickup:collected` points/ammo | 0.9 | |
| `pickup_bombs` | `pickup:collected` kind=bombs | 0.9 | |
| `weapon_get` | `weapon:changed` to a special weapon (plays under the callout) | 1.0 | |
| `player_death` | `player:died` | 1.0 | music ducks −6 dB for 1 s |
| `respawn` | `player:respawn` | 0.8 | |
| `one_up` | life pickup / `lives:changed` upward | 1.0 | |

### POWs and enemies
| Key | When | Vol | Notes |
|---|---|---|---|
| `pow_freed` | `pow:freed` ("thank you!" chirp) | 1.0 | |
| `pow_salute` | POW salute frame (optional) | 0.7 | |
| `enemy_alert` | grunt spots the player ("!") | 0.8 | positional |
| `enemy_death_1/2/3` | `enemy:killed` (pick randomly) | 0.9 | vary |
| `enemy_shoot` | enemy fires | 0.6 | positional, voice-limit 3 |
| `enemy_panic` | grunt flees | 0.7 | |
| `turret_windup` | turret 0.5 s wind-up telegraph | 0.9 | positional |
| `turret_fire` | turret burst | 0.8 | |
| `drone_buzz` | while a drone is on screen | 0.5 | **loop**, positional, one instance per drone (max 3) |
| `drone_dive` | drone dive | 0.8 | |
| `chute_open` | paratrooper spawns | 0.7 | |

### Boss (MOOSEZILLA)
| Key | When | Vol | Notes |
|---|---|---|---|
| `boss_roar` | `boss:spawn`, `boss:phase` | 1.0 | music ducks −4 dB |
| `boss_stomp` | stomp attack lands (pair with `fx:shake` 3) | 1.0 | |
| `boss_steam` | vents steam | 0.6 | **loop** 1 s; play 2–3 loops then stop |
| `boss_hurt` | weak point hit | 0.6 | voice-limit 2, vary |
| `boss_cannon` | antler cannon shot | 0.9 | |
| `boss_charge` | pawing telegraph → charge (1.3 s, starts with the scrapes) | 1.0 | |
| `boss_death` | `boss:defeated` (3.3 s power-down; layer `explo_*` on top) | 1.0 | |

### Environment and props
| Key | When | Vol |
|---|---|---|
| `steam_hiss` | vents/pipes | 0.5 |
| `crate_break` | crate/barrel destroyed | 0.8 |
| `gate_smash` | boss-pen gate bursts | 1.0 |
| `checkpoint` | `checkpoint` reached | 0.8 |

### UI and stingers
| Key | When | Vol |
|---|---|---|
| `ui_move` / `ui_select` / `ui_back` | menu cursor / confirm / cancel | 0.8 |
| `ui_pause` / `ui_unpause` | pause toggled | 0.9 |
| `ui_start` | PRESS START confirmed on Title | 1.0 |
| `continue_tick` | each countdown second | 0.9 |
| `continue_final` | countdown hits 0 / game over | 1.0 |
| `mission_start` | "MISSION 1 START!" callout (1.4 s) | 1.0 |
| `mission_complete` | "MISSION COMPLETE!" short ta-da (the full fanfare is `jingle_complete`) | 1.0 |
| `game_over` | game-over sting (short; the jingle is `jingle_gameover`) | 1.0 |
| `callout` | any big text slam (weapon names, GO!) | 0.9 |
| `score_tally` | results counter tick (every 30 ms while counting) | 0.5 |
| `rank_stamp` | rank letter slams in | 1.0 |

### Music (`ctx.audio.music(key, { fade })`, stereo)
| Key | Length | Loop | Where | Notes |
|---|---|---|---|---|
| `music_title` | 58.2 s | seamless | Title / Options / Credits | 132 BPM G mixolydian anthem: pad + arpeggio intro, brass lead, bell motif |
| `music_stage1` | 90.4 s | seamless | Mission 1 (map property `music=music_stage1`) | 170 BPM E minor march-rock, 64 bars: intro roll, A/A'/B, half-time bridge, 16th-run solo, reprise, turnaround |
| `music_boss` | 62.6 s | seamless | `boss:spawn` → crossfade 0.8 s | 184 BPM D phrygian thrash: chromatic gallop riff, distorted lead, tritone breakdown |
| `music_continue` | 8.0 s | seamless | Continue screen | tense A minor / B♭ pulse under the countdown ticks |
| `jingle_complete` | 7.0 s | one-shot | `stage:clear` (stop stage music first) | E major fanfare + crash, then Results |
| `jingle_gameover` | 6.0 s | one-shot | game over | chromatic descent to E minor |

Loop points are the file boundaries (bar-exact renders; the reverb/delay tail of the last bar is folded into the first bar), so
`loop: true` is seamless with no extra markers. Levels: music RMS −13…−16 dBFS, peaks ≤ −1 dBFS after Vorbis; SFX tiers from
−8.5 (XL explosion) to −24 (loops). The analyzer (`build.sh analyze`) prints peak/RMS/seam/clipping per file.

## 4. Design decisions
- **Fonts are generated, not drawn by hand per variant.** 5×7 and 6×8 skeletons in `glyphs.lua` are dressed by `ui.lua` (EPX 2× smoothing →
  1 px bold smear → vertical gradient → outline → shadow/extrusion). The same pipeline makes the countdown numerals, rank letters and the logo
  lettering, so all text art shares one look. New variants = one line in `fonts.lua`.
- **Text in sprites** only where the GDD allows it: the logo, the `1UP` badge and the `GO!` callout (iconic HUD elements), key-cap labels.
- **Panels** are opaque dark-steel 9-slices; translucency is done in-engine with `setAlpha` so the pixel art stays crisp.
- **Audio is 100% synthesized** with numpy/scipy (oscillators, noise, biquads, Schroeder reverb, limiter). Loudness tiers are baked so Phase B
  code uses volume 1.0 by default. OGG only (≈4 MB total, music 3.4 MB); regenerate with `bash tools/audio/build.sh`.
- **Music is sequenced from a tiny DSL** (`"e5:2 g5:2 a5:2 b5:4 …"`, chord symbols for bass/stab generators, drum grids), rendered with
  cached per-note instruments, per-track reverb/delay/pan, drum-bus compression and a lookahead limiter. Piano rolls in `/tmp/kbe-ui/audio/roll_*.png`.

## 5. Phase B plan (code under `src/scenes/ui/**`, `src/ui/**`, `src/audio/**`, `src/config/tuning/ui.ts`)

### AudioService (`src/audio/AudioService.ts`, registered on `ctx.audio`)
- `sfx(key, { volume, detune, x })`: looks up the key in the loaded pack; unknown key → one console warning, no-op.
  *Voice limiting*: per-key max instances (default 4; `hmg` 3, impacts 4) and min retrigger interval (hmg 40 ms, impacts 25 ms).
  *Variance*: keys flagged "vary" get `detune ±60` cents and ±10% volume unless `detune` is passed.
  *Positional*: when `x` is given, pan = clamp((x − cameraCenterX)/192, −1, 1) × 0.6 and volume falls off to 0.3 beyond one screen width
  (uses `WebAudioSound.pan`; verify in `phaser.d.ts` first). Loops (`flame_loop`, `drone_buzz`, …) return a handle to stop/fade.
- `music(key | null, { fade })`: crossfade (tween volumes over `fade` ms, default 600) between at most two music instances; jingles
  (`loop:false` in the manifest) stop the current track and fire `audio:musicEnded` when done so the scene can continue.
  *Ducking*: `duck(db, ms)` used by player death, boss roar and callouts. *Buses*: master/music/sfx volumes persisted in `localStorage`
  (`kbe.options`), `?mute=1` honoured.
- *Web Audio unlock*: Title shows "PRESS START" and plays nothing until `Phaser.Sound.Events.UNLOCKED` (or the first `confirm` input);
  queued music starts then. Sounds requested before unlock are dropped, not queued (except music).
- Event wiring (`src/audio/AudioEvents.ts`): subscribes to the event bus for every event-driven key in the catalog above so gameplay teams
  don't need to call `sfx` for shots, impacts, explosions, pickups, deaths, boss events, stage start/clear.

### Scenes
- **TitleScene**: keyart backdrop (`public/assets/ui/keyart/`, parallax drift 2 px), `ui_logo` dropping in with a bounce, `logo_glitch`
  every 4–7 s, snow particles, "PRESS START" blinking (`font_callout_white`), then the menu (Start / Difficulty / Options / Credits) with
  `ui_cursor` and `font_hud` tinted `fire5` on the selected row. `music_title`. Transitions: 300 ms wipe (a `Rectangle` sweep).
- **IntroScene** (overlay on Game, pauses input for 1.6 s unless `fast=1`): "MISSION 1" (`font_callout_steel`) slides from the left,
  "START!" (`font_callout_fire`) slams from the right with `mission_start`, both flash and fly out; `music_stage1` starts on the slam.
- **HudScene** (launched in parallel with Game, depth HUD): listens to `score:changed`, `lives:changed`, `ammo:changed`, `bombs:changed`,
  `weapon:changed` (callout "HEAVY MACHINE GUN!" + `callout`/`weapon_get`), `rescued:changed` (POW tally), `camera:unlock` (`hud_go` for 2 s),
  `boss:spawn/hp/phase` (boss bar slides up; the fill drains with a 200 ms lag "ghost" bar), `ui:popup` (floating "+100" with `font_hud_gold`),
  `enemy:killed` multi-kill counter. Score counts up with `score_tally`. Pools the popup texts.
- **PauseScene**: `ui_panel` with RESUME / OPTIONS / QUIT, `ui_pause`/`ui_unpause`, dims the game (black rect alpha 0.5), music volume ×0.4.
- **ContinueScene**: `countdown_9…0` numerals (each tick scales *position* not sprite: drop 2 px + `continue_tick`), `music_continue`,
  confirm → `game:continue` (score reset, respawn at checkpoint); 0 → `continue_final` + `jingle_gameover` → GameOver → Title.
- **ResultsScene**: tally rows (score, POWs × 1000, accuracy, time) typed in with `score_tally`, then the rank stamp (`ui_rank`, `rank_stamp`),
  `jingle_complete` before, `music_title` after. Rank = S ≥ 90% kills & all POWs, A ≥ 70%, B ≥ 50%, else C.
- **OptionsScene**: volumes (master/music/sfx), CRT filter on/off, screen shake on/off, difficulty, controls preview with `ui_prompts`
  (keyboard row + gamepad row, auto-swapped when a pad connects). Saved to `localStorage`.
- **CreditsScene**: scrolling `font_hud_plain` over keyart with `music_title`.
- `registerUi(ctx)` (`src/ui/index.ts`): launches HudScene, wires AudioEvents, exposes `ui.callout(text, style)` and `ui.popup(x, y, text)`.
- Tuning in `src/config/tuning/ui.ts` (callout timings, duck amounts, voice limits, rank thresholds).

## 6. Known gaps / follow-ups
- Nothing has been *heard* yet: levels, seams and spectra were verified numerically and visually only. First Phase B task is a listening
  pass in the browser; the generators make re-tuning a one-line change.
- The callout font lacks `\ ^ ` { | } ~`; lowercase renders as uppercase by design.
- `logo_glitch` is a band-displacement effect; a colour-cycling "shine" sweep is planned in-engine (mask filter) rather than baked.
- Keycap labels use the 5×7 font at 1×; `RB` is tight. Pad prompts assume Xbox colours (A green, B red, X blue, Y yellow).
- No Preload progress-bar art yet (Engine owns PreloadScene; see requests).

## 7. Requests for other teams
- **Engine**: load `packs/ui.json` (it's in `PACKS`); please expose `scene.sound` unlock state and camera center on `CameraService`
  (`centerX()`), or we'll read `scene.cameras.main` directly. Confirm `AudioService.music` may return a handle/promise for jingles.
  If you want a styled preload bar, use `ui_panel_thin` + `ui_bossbar_fill` (or ask for a dedicated strip).
- **Player**: emit `player:land` with `vy` (land volume scales with it) and `weapon:changed` with the weapon id (`pistol|hmg|spread|rocket|flame`)
  so the callout picks the right name/icon; call `ctx.audio.sfx('grenade_bounce')` on the first bounce (no event exists for it).
- **Enemies/boss**: emit `boss:phase` on phase changes (roar), and call `sfx('turret_windup')`/`sfx('boss_charge')` at telegraph start so the
  audio lands with the visual wind-up; `drone_buzz` wants a per-drone start/stop (we'll expose `ctx.audio.loop(key, x)` → handle).
- **Levels**: map `music` property = `music_stage1`; put a `music` trigger with `music_boss` at the boss gate if you don't fire `boss:spawn` early enough.
- **FX**: the `callout` SFX is timed for a 220 ms slam; `fx:shake` tier 1 on callout impact looks great if you want to add it.
- **Lead**: optional AI key art for the Title is expected in `public/assets/ui/keyart/`; the logo is sized 240×112 to sit over it.
