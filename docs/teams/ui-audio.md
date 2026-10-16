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

## 5. Phase B implementation (code)

Everything below is live in the tree and verified with `shot.mjs` screenshots and QA's suite (see §8).

| Path | What |
|---|---|
| `src/config/tuning/ui.ts` | layout, timings, duck amounts, pan/falloff, rank thresholds, POW totals per stage |
| `src/audio/catalog.ts` | per-key playback rules (`SFX_META`), the alias table (`SFX_ALIASES`), music metadata and aliases |
| `src/audio/engine.ts` | `AudioEngine` (one per `Phaser.Game`): sfx voices, loops, music crossfades/jingles, ducking, unlock queue, debug |
| `src/audio/events.ts` | `wireAudioEvents(ctx, engine)`: event-driven sound + hints for teams' direct calls |
| `src/audio/index.ts` | `createAudioService(scene)` (installed on `ctx.audio`), `getAudio(scene)` for UI scenes |
| `src/ui/index.ts` | `registerUi(ctx)`: FX popup fallback off, audio wiring, Intro launch, `__KBE.state().ui` |
| `src/ui/{widgets,menu,input,keys,controls,callout,transitions,rank,prefs}.ts` | shared UI building blocks (see below) |
| `src/scenes/ui/*.ts` | `Title Intro HUD Pause Continue Results Options Credits`, exported as `uiScenes` from `src/scenes/ui/index.ts` |
| `public/assets/packs/ui.json` | + `ui_keyart_title` (`assets/ui/keyart/title_bg.png`, from the image-gen team); `make_pack.py` now scans `ui/keyart/` |

See it:
```sh
node game/tools/shot.mjs --out /tmp/kbe-ui/title.png --query "scene=Title&mute=1" --wait 2600
node game/tools/shot.mjs --out /tmp/kbe-ui/hud.png --query "scene=Game&fast=1&god=1&mute=1&seed=7" --steps '[{"hold":"ArrowRight","ms":1400},{"press":"KeyX"}]'
node game/tools/shot.mjs --out /tmp/kbe-ui/pause.png --query "scene=Game&fast=1&god=1&mute=1" --steps '[{"press":"Escape"},{"wait":400}]'
node game/tools/shot.mjs --out /tmp/kbe-ui/intro.png --query "scene=Game&god=1&mute=1" --wait 900 --steps '[{"wait":600}]'
# Results with sample data (the real path is stage:clear → engine → Results):
node game/tools/shot.mjs --out /tmp/kbe-ui/results.png --query "scene=Title&mute=1" --wait 1500 --steps '[{"eval":"window.__KBE.game.scene.getScene(\"Title\").scene.start(\"Results\",{stage:1,score:12340,rescued:4,kills:31,deaths:1,accuracy:0.63,timeMs:201400,difficulty:\"arcade\"})"},{"wait":5000}]'
```
`__KBE.state().audio` = `{ recent, unknown, voices, loops, music, musicVol, locked, context, played, dropped, stolen, lockedDrops, duck, master, musicBus, sfxBus, muted }`;
`__KBE.state().hud` = the HUD's displayed values (score/lives/ammo/bombs/weapon/rescued/go/boss/callout/prompt/popups);
`__KBE.state().ui` = `{ intro, lastPrompt, lastCallout, hud, log }` (`log` traces title:start / pause:open / continue:* with ms timestamps).

### AudioEngine
- **Buses:** `game.sound.volume` = master (UI pref, `localStorage kbe.ui.v1`), × `settings.musicVolume` / `settings.sfxVolume`. Mute stays with the
  engine's `bindGlobalMute`; `applySettings()` also calls `applyMute` so toggling MUTE in Options is immediate.
- **sfx(key, {volume, detune, x, rate}):** alias → catalog key → cache check (unknown keys are reported once in dev and listed in
  `audio.unknown`) → min-retrigger gate (`minMs`) → voice cap (`max`, oldest voice stolen) → variance (`vary` cents, ±10 % volume) →
  position (pan = clamp(dx/192) × 0.6; full gain within 160 px, 0.3 at 576 px, silent past 700 px of the Game camera centre).
- **loop(key, {x, durationMs, fadeMs})** → handle `{stop(fade), setX, setVolume, active}`. Used for `flame_loop` (kept alive by
  `player:shoot weapon=flame`, released 450 ms after the last tick), `rocket_whoosh` (stops on the player's explosion or after 1.4 s),
  `boss_steam` (alias `steam` → 1.8 s loop) and the boss flame.
- **music(key|null, {fade, volume}):** crossfade (default 600 ms) between at most one incoming and N outgoing tracks; jingles (`loop:false`)
  cut the music in ≤250 ms, start at full volume and emit `engine.events 'music:ended'`. `lastGameplayMusic` is restored on `game:continue`.
- **duck(gain, holdMs, recoverMs)**, **pauseGameplay()/resumeGameplay()** (voices paused, music ×0.4), **hint(key, {replace, x, volume, detune}, ms)**
  (pre-arranges the next direct call), **stopRecent(key, ms)**, **after(ms, fn)** on the engine clock (survives scene pauses/hitstop).
- **Unlock:** before the first gesture, sfx are dropped (`lockedDrops`), the last music request is queued and starts on `UNLOCKED`.
- Fades/ducks/timers run on `Phaser.Core.Events.STEP`, so they keep moving while the Game scene is paused.

### Alias table (`SFX_ALIASES`): keys other teams call → what plays
| Called | Plays | Notes |
|---|---|---|
| `rocket` / `flame` (weapons `sfx(w)`) | `rocket_launch` / `flame_start` | flame loop and rocket whoosh come from `player:shoot` |
| `knife`, `melee` | `melee_slash` | `melee_hit` is event-driven (`entity:hurt kind=melee`) |
| `sfx_pistol`, `shoot` | `pistol` | dev sandbox |
| `enemy_shout` | `enemy_alert` | `enemy:shoot` hints the position of the following `enemy_shoot` |
| `enemy_die`, `enemy_death` | random `enemy_death_1..3` | |
| `chute_tear` | `chute_open` −500 cents, ×0.8 | no tear asset; detuned chute pop |
| `drone_buzz` (direct one-shot call at dive wind-up) | `drone_dive` | the loop asset needs a per-drone handle nobody has |
| `turret_shoot` | `turret_fire` | plus `enemy:shoot kind=turret` replaces the generic `enemy_shoot` call with `turret_fire` |
| `steam` | `boss_steam` as a 1.8 s loop | |
| `boss_explode` | `boss_death` + `explo_xl` | |
| `boss_flame` | `flame_start` −400 cents + `flame_loop` 1.3 s −300 cents | |
| `boss_hit` / `boss_phase` | `boss_hurt` / `boss_roar` | `boss:hp` decreases also play `boss_hurt` (voice-limit 2) |
| `door_open` | `steam_hiss` ×0.7 −200 cents | bunker door hydraulics |
| `crate`, `barrel_break`, `gate`, `explosion`, `hit`, `grenade`, `bounce`, `death`/`die`/`player_die`, `1up`/`life`, `powerup`, `pow` | the obvious catalog keys | synonyms, cheap insurance |
| `select move back pause unpause start tick` | `ui_*`, `continue_tick` | |
| music: `stage1`, `music_stage`, `boss1`, `boss`, `music_boss1`, `title`, `continue`, `gameover`, `complete`… | `music_stage1`, `music_boss`, `music_title`, `music_continue`, `jingle_gameover`, `jingle_complete` | the map already uses the catalog keys |

Keys verified against every `sfx(`/`music(` call in `game/src` (player, weapons, pickups, enemies, boss, props, triggers, dev sandbox):
after a full run (start → bridge arena → boss → clear, and the game-over path) `audio.unknown` is `[]`.

### Event-driven sound (`src/audio/events.ts`)
| Event | Sound |
|---|---|
| `projectile:impact` | `impact_body/metal/wood/dirt` by material (`shield` → `shield_tink`, `water` → low `impact_dirt`), positional, enemy shots ×0.6 |
| `explosion` | `explo_<size>`, positional; a player explosion stops the rocket whoosh |
| `entity:hurt kind=melee` (non-player) | `melee_hit` |
| `enemy:shoot` | hint: positions `enemy_shoot` / `boss_cannon`; turret → `turret_fire` |
| `fx:emit vent_steam` | `steam_hiss` |
| `player:shoot` flame / rocket | `flame_loop` keep-alive / `rocket_whoosh` loop |
| `player:land` | hint: `land` volume by `vy` |
| `player:died` / `player:respawn` | `player_death` + duck 0.5 for 1 s / `respawn` |
| `lives:changed` up | `one_up` (the `pickup` chirp from the pickup is cancelled) |
| `pickup:collected bombs` | `pickup` cancelled → `pickup_bombs` |
| `pow:freed`, `checkpoint` | `pow_freed`, `checkpoint` |
| `boss:spawn` / `boss:phase` / `boss:hp` / `boss:defeated` | `music_boss` (dedupes with the Levels trigger) + duck / duck / `boss_hurt` / music fades out over 2.5 s |
| `stage:clear` | music out, `jingle_complete` 1.1 s later (after the HUD's `mission_complete` ta-da) |
| `game:over` / `game:continue` / `game:pause` | music out + `game_over` / last stage music back / pause ducking |
Not doubled (teams call them directly): weapons, jump/land, knife, pickup, weapon_get, grenade_throw, enemy shoot/alert/panic/die, shield_tink,
turret_windup, boss roar/cannon/stomp/steam/flame/explode, crate_break, gate_smash.

### Scenes
- **Title** – key art, snow particles, logo drop-in (`Back.easeOut`) and `logo_glitch` every 4–7 s, `music_title`. Attract mode blinks
  PRESS START: **confirm starts the game at once** (arcade style, and what QA's flow test expects), any other input opens the menu
  (START / DIFFICULTY ARCADE|CASUAL / OPTIONS / CREDITS), 12 s idle returns to attract. Start = `ui_start` → wipe → `Game`
  (the handoff waits for the key to be released, see "Design decisions").
- **Intro** – launched by `registerUi` on `stage:start` unless `?fast=1`: "MISSION n" slides in, "START!" slams with `mission_start`
  and a tier-1 shake, the stage name fades in, out at 1.5 s; music ducked to 0.4 meanwhile. Gameplay runs underneath.
- **HUD** – per GDD §9 / the mock: 1UP badge + 8-digit score (tallies up) + life icon ×N (flashes red on loss); weapon icon + ARMS
  ammo/∞ (blinks red ≤ 10) + BOMB count; rescue faces (≤ 6) + RESCUED n; weapon callouts (`HEAVY MACHINE GUN!` …, with `callout` +
  a short duck); GO! (`hud_go`, bouncing) for 2.2 s on `camera:unlock` after a lock; boss bar (frame + fill crop + lagging ghost
  drain + name in red, slides in on `boss:spawn`, flashes on phase, slides out after defeat); score popups (`ui:popup` + `+score` on
  `enemy:killed`, world → screen each frame) and a multi-kill chain (`×n +bonus`, +50 per extra kill within 700 ms, added to
  `ctx.state.score`); level prompts (`ui:prompt`) in a thin panel at the bottom; "MISSION COMPLETE!" + fade to black timed for
  the engine's 3.5 s cut to Results. FX's fallback popups and the engine's dev prompt are off (`fx.popups=false`, early `ui:prompt` listener).
- **Pause** – `ui_pause`, dim, PAUSE panel (RESUME / OPTIONS / QUIT) + CONTROLS help (key-caps + pad glyphs). Esc/Start or RESUME →
  `ui_unpause` + `flow.resume()`; QUIT → wipe → `flow.quit()`. Enter (bound to both confirm and pause) is consumed by the menu first.
- **Continue** – `CONTINUE?` slam, `countdown_9…0` numerals (bounce + `continue_tick`, rising detune), `music_continue` 0.9 s after the
  `game_over` sting, PRESS START blink. Confirm/Start → `ui_start` → `flow.continueGame()` once the key is released. 0 → `continue_final`,
  GAME OVER (white callout tinted red), `jingle_gameover`, then wipe → `flow.quit()` (any key after 0.8 s skips the wait).
- **Results** – header slam, RESULTS panel: SCORE / POW RESCUED n × 1000 / ACCURACY / TIME / DEATHS / TOTAL tally in (`score_tally`
  every 30 ms while counting; confirm skips), rank stamp (`rank_stamp` + camera shake), `music_title` after the clear jingle ends,
  PRESS START → wipe → Title (auto after 22 s). Rank = accuracy (40 pts) + rescues/stage total (40) + 20 − 7·deaths: S ≥ 84, A ≥ 64, B ≥ 42.
- **Options** – overlay from Title or Pause: MASTER / MUSIC / SFX volume bars (10 steps), DIFFICULTY, CRT FILTER, SCREEN SHAKE,
  REDUCED FLASH, MUTE, CONTROLS, BACK. Writes `settings.update` (+ UI prefs for master), emits `settings:changed {difficulty}` on the
  Game bus and updates `ctx.state.difficulty` when a run is active. CONTROLS page lists every action with key / alt / pad glyphs and
  **rebinds keyboard keys** (confirm a row, press a key; ESC cancels; RESET DEFAULTS).
- **Credits** – scrolling roll (teams, the original pygame game, tools) over the Title; any key or the end closes it.
- Transitions: wipes (`wipeOut`/`wipeIn`, 320 ms sweep with a half-alpha trailing band) between Title ⇄ Game, Results → Title,
  Pause/Continue quit → Title; dim fades for overlays; HUD fade-to-black before the Results cut.

### Building blocks (`src/ui/`)
`MenuInput` wraps `createInput(this)` (keyboard + pad) and **arms itself only once every menu action is released** (keyboard state is
also read from a page-level keydown/keyup tracker in `keys.ts`), adds held-direction auto-repeat and `anyHeld` for handoffs. `Menu` =
rows with label/value, bouncing `ui_cursor`, blips. `Callout` = the drop/overshoot/flash/hold/fly-out slam used by the HUD, Intro,
Continue and Results. `ControlsPanel` = bindings → `ui_prompts` glyphs (text key-caps for keys without art). `transitions.ts`,
`widgets.ts` (bitmap text at native size, 9-slice panels, `frameOf(tag)`/`hasAnim`), `rank.ts`, `prefs.ts`.

## 6. Design decisions
- **Scene stepping order matters.** Phaser steps active scenes top-most first and renders bottom-up. A menu therefore acts on a key
  edge *before* the Game samples the same key, so handing control to the Game on the frame of the press makes the engine read it as
  a fresh `pause` (Enter is bound to confirm *and* pause). Continue and Title now hand off only once the confirm key is up
  (`MenuInput.anyHeld`, 1–1.5 s cap). Menus also wait for all keys to be released before accepting input (the Escape that opened the
  Pause menu can't close it on the same press).
- **One AudioEngine per game, not per run.** Music must survive scene changes (Title → Game crossfade, stage music under the Pause scene,
  jingles into Results). The per-run `ctx.audio` only adds the camera listener and stops the run's voices/loops on shutdown.
- **Direct calls stay, events add information.** Removing other teams' `sfx()` calls isn't ours to do; instead `hint()` lets an event
  that carries position/intent (enemy:shoot, player:land) shape the direct call that follows it, and `stopRecent()` swaps a generic
  pickup chirp for the specific one. Unknown keys are reported, never thrown.
- **Attract mode starts on confirm.** Metal Slug style and QA-friendly: one Enter on the Title boots the run; the menu is one key away.
- **Fonts are generated** (Phase A); callouts animate by position + font swap only, never scale. Panels are opaque 9-slices, dimming is
  done with alpha rectangles.
- Multi-kill bonus is the only score the UI adds (GDD §9 asks for it); everything else comes from the engine's state events.

## 7. Known gaps / follow-ups
- The listen pass is instrumented, not heard: `audio.context === 'running'`, voices/loops/music `isPlaying` with advancing `seek`,
  `unknown: []`. Mix balance (duck depths, the −6 dB death duck, impact spam at 4 voices) needs a human ear.
- Rank uses a per-stage POW total from tuning (`UI.results.powTotal`, stage 1 = 5) because the engine doesn't report it.
- `drone_buzz` isn't used as a loop (no per-drone start/stop hook); the direct call plays the dive whoosh.
- Pad rebinding isn't offered (keyboard only). Pad glyphs assume the standard mapping.
- Holding Enter for longer than the handoff cap (1–1.5 s) when starting/continuing still reaches the Game as a `pause` press.
- The key art is static (no drift) to keep the 384×216 pixels crisp; the Title's motion is the logo glitch, snow and cursor.
- No Preload progress-bar art (Engine owns Preload).

## 8. QA (Phase B)
See the final report for the run; the three UI-gated tests (Title → Game → Pause → resume, kill/respawn, game-over → continue) are
drivable: `Title` reacts to a single Enter, `Pause` toggles with Escape and leaves Game's Phaser pause state intact, `Continue` answers
Enter with a fresh run (lives reset, score 0).

## 9. Requests for other teams
- **Engine**: `flow.update` pauses on `input.justDown('pause')` the very frame after a UI scene hands control back; a one-frame
  `rebaseline()` of the Game's input in `continueGame()` and on `Game` CREATE (like the one on RESUME) would remove the UI-side
  release-wait. Consider exposing the level's POW total on `LevelQuery` (`powTotal?`) for the Results rank. `boss:*` payloads already
  carry x/y, thanks. `scene.sound` unlock state and camera centre are read directly (fine as is).
- **Enemies**: a per-drone `ctx.audio`-free hook isn't possible; if you want the buzz loop, call `getAudio(scene).loop('drone_buzz', {x})`
  from the drone and `stop()` it on death/offscreen (or emit a typed `enemy:spawn/despawn` event we can listen to).
- **Levels**: `music_stage1`/`music_boss` keys are perfect. The `prompt` texts are plain; if you want key-cap art inside prompts, use
  `{key:Z}` tokens and we'll render `ui_prompts` glyphs.
- **FX**: the popup fallback stays off via `fx.popups=false`; thanks for the listener-count guard too. `reducedFlash`/`crt`/`shake` are
  exposed in Options and emit `settings:changed`.
- **QA**: the UI-gated tests should now pass; `__KBE.state().ui.log` and `.audio` are there for flow/audio assertions.
