# UI, HUD and Audio team notes

Phase A deliverables (art + audio assets, no `src/` code yet) and the Phase B implementation plan.
Everything here is generated from source scripts and can be regenerated:

| What | Source | Build command | Output |
|---|---|---|---|
| Bitmap fonts | `game/art-src/ui/fonts.lua` (+ `lib/glyphs.lua`, `lib/ui.lua`) | `bash tools/build-art.sh art-src/ui/fonts.lua` | `public/assets/fonts/*.png/.xml` |
| HUD kit, prompts, countdown, ranks, panels, boss bar | `game/art-src/ui/hud.lua` | `bash tools/build-art.sh art-src/ui/hud.lua` | `public/assets/ui/*` |
| Logo (animated) | `game/art-src/ui/logo.lua` | `bash tools/build-art.sh art-src/ui/logo.lua` | `public/assets/ui/logo.png/.json` |
| SFX (84) | `game/tools/audio/sfx.py` (DSP in `kbe_synth.py`) | `bash tools/audio/build.sh sfx` (named keys re-render only those and merge the manifest) | `public/assets/audio/sfx/*.ogg` + `sfx_manifest.json` |
| Music (10) | `game/tools/audio/music.py` | `bash tools/audio/build.sh music` (named songs likewise) | `public/assets/audio/music/*.ogg` + `music_manifest.json` |
| Campaign UI art (radio icon, map pictograms, Pine Ridge route map) | `game/art-src/ui/campaign.lua` | `bash tools/build-art.sh art-src/ui/campaign.lua` | `public/assets/ui/ui_radio.*`, `ui_map.*`, `map_m1.png` |
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
`MenuInput` wraps `createInput(this)` (keyboard + pad). Keyboard **press edges come from the page-level key tracker**
(`keys.ts` timestamps every fresh keydown), not from the engine's per-frame sample: a release + re-press inside one frame and a
tap shorter than a frame both count, on the frame the press started (Phase D). It **ignores the press that opened the menu**: a
menu only accepts keyboard presses that started after it was requested (`since`; the Pause scene uses the `game:pause` moment,
`flowStamps.pauseRequestedAt`, so a second Escape counts even when the first paused frame was slow). Pad/virtual actions held at
the first sample are ignored until released. Also held-direction auto-repeat. `Menu` =
rows with label/value, bouncing `ui_cursor`, blips. `Callout` = the drop/overshoot/flash/hold/fly-out slam used by the HUD, Intro,
Continue and Results. `ControlsPanel` = bindings → `ui_prompts` glyphs (text key-caps for keys without art). `transitions.ts`,
`widgets.ts` (bitmap text at native size, 9-slice panels, `icon()`/`playTag()` over core's `tagFrame`/`hasAnim`), `rank.ts`, `prefs.ts`.

## 6. Design decisions
- **Scene stepping order matters.** Phaser steps active scenes top-most first and renders bottom-up. A menu therefore acts on a key
  edge *before* the Game samples the same key, so handing control to the Game on the frame of the press makes the engine read it as
  a fresh `pause` (Enter is bound to confirm *and* pause). Since Phase D the engine latches every key still held when the Game
  scene is created and in `flow.continueGame()` (ignored until released), so Title and Continue hand off immediately; the
  UI-side release-wait (`anyHeld`, 1–1.5 s cap) is gone. Menus judge presses by their start time, not by what is held when the
  menu's first frame runs: the Escape that opened the Pause menu can't close it, but a new Escape 3 ms after its release does,
  even if the first paused frame took 200 ms (SwiftShader's first level render).
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
- The key art is static (no drift) to keep the 384×216 pixels crisp; the Title's motion is the logo glitch, snow and cursor.
- No Preload progress-bar art (Engine owns Preload).

## 8. QA (Phase B)
Full suite (2026-10-16, SwiftShader): **18 passed, 1 failed** of 19. The failure is `gameplay › holding right moves the player
right`, and only because QA's "no console errors" guard caught a burst of `net::ERR_NETWORK_CHANGED` resource errors while
other agents' Vite servers started/stopped on the same machine; the movement assertion itself passed and the test passes alone.
The three previously UI-gated tests (Title → Game → Pause → resume, kill/respawn, game-over → continue) pass, and pass 3/3 with
`--repeat-each 3`: `Title` reacts to a single Enter, `Pause` toggles with Escape and leaves Game's Phaser pause state intact,
`Continue` answers Enter with a fresh run (lives reset, score 0). `npm run typecheck` and `npm run check:phaser4` are clean.

## 9. Requests for other teams
- **Engine**: done in Phase D, thanks: held keys are latched on Game CREATE and in `continueGame()` (the UI release-wait is
  removed), and `LevelQuery.powTotal?` exists (the Results rank uses it when a level reports it; see §10). `boss:*` payloads
  already carry x/y. `scene.sound` unlock state and camera centre are read directly (fine as is).
- **Enemies**: a per-drone `ctx.audio`-free hook isn't possible; if you want the buzz loop, call `getAudio(scene).loop('drone_buzz', {x})`
  from the drone and `stop()` it on death/offscreen (or emit a typed `enemy:spawn/despawn` event we can listen to).
- **Levels**: `music_stage1`/`music_boss` keys are perfect. The `prompt` texts are plain; if you want key-cap art inside prompts, use
  `{key:Z}` tokens and we'll render `ui_prompts` glyphs.
- **FX**: the popup fallback stays off via `fx.popups=false`; thanks for the listener-count guard too. `reducedFlash`/`crt`/`shake` are
  exposed in Options and emit `settings:changed`.
- **QA**: the UI-gated tests should now pass; `__KBE.state().ui.log` and `.audio` are there for flow/audio assertions.

## 10. Phase D (final fix round)

Scratch and evidence: `/tmp/kbe-ui/d_*.png`, probe `/tmp/kbe-ui/pause_race.mjs`. `npm run typecheck` clean, `check:phaser4 --strict`
0/0, `node tools/engine-selftest.mjs` all passed, QA e2e 18/19 (the one failure is again QA's "no console errors" guard catching
76 `net::ERR_NETWORK_CHANGED` resource errors from other agents' servers; `gameplay.spec.ts` passes 5/5 alone).

### Fixes
- **KBE-QA-U01 (S2) boss HP bar empty at full HP: fixed.** `bossbar_frame.png` is opaque on purpose (its dark `ink1` slot is
  the "empty" bar), and the HUD added it *after* the fill and ghost in `bossBox`, painting over both. The container order is now
  frame → ghost → fill → skull → name; the fill/ghost also hide at a 0 px crop. Verified with the Lead's capture command and the
  HMG (`give('hmg')` + held X, 400 → 358 → 304 → 256) and the boss fixture: `d_bossbar_full.png` (400/400, full fill),
  `d_bossbar_low2.png` (256/400), `d_bossbar_half_ghost.png` (200/400 mid-drain: lagging dark-red ghost + phase flash),
  `d_bossbar_half.png`, `d_bossbar_near_empty.png` (12/400, a 6 px sliver); `d_bossbar_before.png` is the broken baseline.
- **Pause → resume race: fixed in `MenuInput`.** Keyboard presses are now edge-detected from the page-level key tracker
  (`keys.ts` keeps the time of the most recent fresh keydown per key, even after release) instead of the engine's per-frame
  sample, so a release + re-press inside one frame (the 3 ms case the Engine diagnosed) and a sub-frame tap both count on the
  frame they start. The opening-key filter (`since`) is unchanged. `pause_race.mjs` (8 rounds each): re-press 3 ms after release
  8/8, 2 ms tap 8/8, held opener stays paused then a new press closes 8/8, Title with a 250 ms held Enter starts the Game unpaused
  4/4, Continue with a 250 ms held Enter resumes unpaused with lives reset 3/3. QA's `flow.spec.ts` "Title → Game → Pause →
  resume" `--repeat-each 5`: 5/5.
- **Release-wait workaround removed** (Title `pendingStart`, Continue `continuing` state, `MenuInput.anyHeld`,
  `keys.anyBoundKeyHeld/heldKeyCodes`): the engine's `latchHeld` on Game CREATE and in `continueGame()` has landed
  (`engine-selftest` covers it). Title starts the Game straight after the wipe; Continue calls `flow.continueGame()` on the press.
- **Core animation helpers everywhere** (rules review U1): `widgets.frameOf`/`hasAnim` are deleted; `icon()`/`playTag()` use core's
  `tagFrame`/`hasAnim`; HUD (1UP badge, weapon icon), Results (rank), Continue (numerals) and controls (key-caps, pad glyphs) use
  `tagFrame`; Title uses `playAnim` for the logo idle/glitch; the menu cursor and GO! use `hasAnim`. No `anims.exists` remains in
  UI code (the checker's `anims-exists-zero-frame` rule is clean). A missing icon still falls back to the magenta `TEX.missing`
  on purpose (loud in screenshots) and now warns once in dev.
- **Magenta/missing sweep, every scene looked at:** `d_title_attract.png`, `d_title_menu.png` (cursor is the real arrow; the
  magenta square in the Lead's `title_b.png` predates the engine's animation fix), `d_options.png`, `d_controls_page.png` (all
  key-cap and pad glyphs), `d_pause_final.png`, `d_continue.png` (countdown numeral), `d_gameover.png`, `d_results.png` +
  `d_results_rank.png` (rank stamp), `d_credits_fixed.png`, HUD: `d_bossbar_full.png` (1UP, life, pistol, bomb, skull icons),
  `d_bossbar_low2.png` (HMG icon after `give`), `d_go.png` (GO! arrow). Nothing magenta. Found and fixed on the way: `©` and `•`
  are not in the bitmap fonts (rendered as blanks in the Title footer, Credits and the Options controls header; now `(C)` and
  `●`), the Pause pad-glyph column spilled past the right panel (`ControlsPanel.padX`, 136 for Pause), the Pause footer hint sat
  over the level art (now inside the panel), and Credits lines leaked below the panel through the 0.7-alpha band (lines outside
  the window are now hidden; no mask filter).
- **Rules review U2:** `keys.ts` listeners are removed on `import.meta.hot.dispose` (no stacking on HMR).
- **Results rank** uses the level's `LevelQuery.powTotal` when it reports one (`runInfo` in `src/ui/index.ts`, recorded on
  `stage:start`/`stage:clear`), else the per-stage estimate from tuning as before.

### Mix sanity pass (numeric; nobody has heard it)
New `__KBE.state().audio.mix`: estimated sfx and music bus levels (dBFS, power sum of each playing voice's manifest RMS × every
gain stage; the manifests are now in `packs/ui.json` as `sfx_manifest`/`music_manifest`), peak-held for 1.5 s with the voices
playing at the peak, the loudest voice and its share, and the limiter's gain reduction. Default buses: music 0.7, sfx 0.9, master 1.

| Moment (`d_mix_*.png`) | sfx bus | music bus | voices at the peak | loudest (share) | limiter |
|---|---|---|---|---|---|
| Bridge, HMG held, nothing hit | −24 (first shot −19.7) | −17.1 | hmg | hmg (1.0) | 0 |
| Bridge arena wave 1, HMG held | peak −13.5, typical −16…−24 | −17.1 | enemy_death_1, hmg, pow_freed, impact_body | pow_freed (0.42) | −0.5 dB |
| Boss arena, HMG held (cannons, hurt, metal hits, stomp) | peak −11.6, typical −20.5 | −16.3 | boss_hurt ×2, impact_metal, hmg, boss_stomp, explo_s | boss_stomp (0.48) | −2.9 dB |
| Boss death chain | −7.0 | −16.3 (fading) | boss_roar, boss_death, explo_xl ×2, explo_m ×2 | explo_xl (0.22) | −3.5…−5.2 dB |

Reading: the music sits 3–7 dB over the sustained HMG and only goes under the SFX bus at genuinely busy instants (bridge peak
+3.6 dB, boss fight +2…+5 dB, death chain +9 dB), which is the intended action-game balance. The HMG is never the loudest voice
once anything else happens. Changes made from the numbers:
- **Rapid-fire fatigue** (`SfxMeta.burst`): a start within `ms` of the previous one lowers the volume by `step` per consecutive
  shot down to `floor`. `hmg` at 14/s is one continuous voice (70 ms file at 71 ms spacing): 0.6× after 7 shots (−24 dBFS
  sustained, first shots −20); `pistol` 0.7×; `impact_*` 0.5× (they arrive at 14/s too). `hmg` max 3 → 2 (never more than 2 overlap).
- **Peak hygiene:** `boss_cannon` 0.9 → 0.75 and `minMs` 60 → 120 (both antlers fired identical −3 dBFS peaks at the same instant,
  summing past 0), `impact_metal` 0.7 → 0.5 (21 dB crest factor, peak −1 dBFS), `explo_m` max 3 → 2.
- **Master limiter:** a `DynamicsCompressor` (threshold −3 dBFS, knee 3, ratio 20, attack 2 ms, release 120 ms) between Phaser's
  `masterVolumeNode` and the destination (`UI.audio.limiter`; WebAudio only, skipped on HTML5/NoAudio). Music alone peaks at
  −5.8 dBFS and never touches it; it caught up to 5.2 dB of stacked transients in the boss death chain that would otherwise have
  hard-clipped at the destination. `audio.mix.limiterDb` shows it working.
- Unchanged and worth a human ear: the death chain is deliberately the loudest moment (two overlapping `explo_xl`, by design
  `max: 2`), the −6 dB death duck and the 0.55 boss-roar duck.

### Requests (Phase D)
- **QA:** `flow.spec.ts` can drop its 100 ms "MenuInput arms" wait if you like; `/tmp/kbe-ui/pause_race.mjs` is a harsher
  version of the same flow. `audio.mix` is there for level checks (`peakSfxDb`, `loudest`, `limiterPeakDb`).
- **Enemies:** the per-drone `loop('drone_buzz')` is exactly the hook we asked for, thanks; the catalog caps it at 3 voices.

## 11. Phase E: missions in 3 parts (PART CLEAR, title cards, Hazel, new audio)

### New audio keys (code against these now; files are in `public/assets/audio/{sfx,music}/`, pack `ui.json`)
Call them exactly like the Phase B keys: `ctx.audio.sfx('<key>', { x })`, loops through `getAudio(scene).loop('<key>', { x })` → `handle.stop()`.
Levels are pre-balanced per tier, so the default volume is 1.0. "vary" = random ±detune on every play.

| Key | Kind | Who / when | Notes |
|---|---|---|---|
| `train_clack` | **loop** 1.6 s | Part II ambience (the Audio layer starts it itself on `part:start` of `1-2`, voice-limited to 1, so a Levels call won't double it) | rail joints at ~150 BPM, matches `music_m1p2` |
| `train_horn` | one-shot 1.4 s | low-bridge warning (Levels `hazard_sweep` telegraph), Ironhorn | two-tone air horn |
| `train_whistle` | one-shot 1.6 s | end of Part I (distant logging train), Part II flavour | steam whistle with a chiff; detune −300 and ×0.5 for "distant" |
| `wind` | **loop** 2.4 s | Part II + Part III ambience (started by the Audio layer on `part:start`, 1 voice) | gusting blizzard bed |
| `ice_crack` | one-shot 0.5 s | Levels: `crack=true` tile stepped on; boss stomps on the lake | vary |
| `ice_shatter` | one-shot 0.9 s | Levels: the cracked tile turns to water | vary |
| `laser` | one-shot 0.35 s | Player: laser weapon shot | voice-limit 3, min 45 ms, rapid-fire fatigue like `hmg` |
| `snowcat_engine` | one-shot 1.2 s | Snowcat plow-charge telegraph (rev-up + exhaust puffs) | positional |
| `snowcat_tread` | **loop** 0.7 s | Snowcat moving (also fine as a one-shot per tread step) | positional |
| `mortar_thump` | one-shot 0.5 s | Snowcat roof mortar launch | vary |
| `loco_steam` | one-shot 1.1 s | Ironhorn phase change / smokestack burst | |
| `loco_cannon` | one-shot 0.7 s | Ironhorn rear cannon turrets | vary, voice-limit 2, min 120 ms (two turrets) |
| `cinder` | one-shot 0.4 s | burning cinder lands / hits | vary ±120, voice-limit 4 |
| `hound_bark` | one-shot 0.35 s | hound alert / leap | vary ±150 |
| `hound_growl` | one-shot 0.8 s | hound charge telegraph | vary |
| `buzzard_rotor` | **loop** 0.9 s | Buzzard gunship on screen (`loop('buzzard_rotor', { x })` + `setX`, max 2) | positional |
| `radio_blip` | one-shot 0.25 s | UI: radio line start/end, PART SELECT moves | |
| `radio_static` | one-shot 0.6 s | UI: radio box opens | |
| `part_clear_jingle` | **music one-shot** 4.2 s | `stage:clear` with `final:false` (the Audio layer plays it; the HUD shows PART CLEAR!) | music bus; `jingle_complete` stays for the final part |
| `music_m1p2` | music loop | Part II default (`PartDef.music`) | 150 BPM G minor train theme, rhythmic chug |
| `music_m1p3` | music loop | Part III default | tense, eerie lake/lab theme |
| `music_midboss` | music loop | `boss:spawn` whose `name` isn't MOOSEZILLA (WARDEN'S SNOWCAT, IRONHORN) | MOOSEZILLA keeps `music_boss` |

Routing the Audio layer does on its own (no calls needed):
- `part:start` → if no gameplay music is playing yet (Levels' map `music` property wins when it already started one), start `ctx.part.music`.
  `1-2`: `train_clack` + `wind` loops; `1-3`: `wind` loop. Loops stop on `stage:clear`, `game:over` and the run's end.
- `boss:spawn` → `music_midboss` or `music_boss` by `name`; `boss:defeated` fades the music out.
- `stage:clear` → music out, then `part_clear_jingle` (`final:false`) or `jingle_complete` (`final:true`).
- `boss:stomp` → positions the boss's own `boss_stomp` call (hint), so emitting the event + calling `sfx('boss_stomp')` as Moosezilla does is right.
- Aliases accepted: `laser_shot laser_fire` → `laser`; `rotor heli buzzard` → `buzzard_rotor`; `horn` → `train_horn`; `whistle` → `train_whistle`;
  `bark growl` → `hound_*`; `mortar` → `mortar_thump`; `cannon` → `loco_cannon`; `steam_blast` → `loco_steam`; `crack ice_break` → `ice_crack`/`ice_shatter`;
  `radio` → `radio_blip`; `static` → `radio_static`; music `midboss boss_snowcat boss_ironhorn` → `music_midboss`, `music_m1p1 stage1` → `music_stage1`,
  `train stage2 music_stage2` → `music_m1p2`, `lake lab stage3 music_stage3` → `music_m1p3`, `part_clear` → `part_clear_jingle`.

### What was built (code)
| Path | What |
|---|---|
| `src/scenes/ui/PartClearScene.ts` | **`PartClear`** scene (key `'PartClear'`): tally + escape-route map between parts |
| `src/ui/titlecard.ts`, `src/ui/radio.ts` | HUD title card ("MISSION 1 · PART II" / title slam / location) and Hazel's radio box (typewriter, static, pagination) |
| `src/ui/routemap.ts` | the Pine Ridge map widget (pictograms, dotted route, travelling Knotz marker, bouncing pin) |
| `src/ui/tally.ts` | reusable count-up rows (PartClear and Results share it) |
| `src/scenes/ui/HudScene.ts` | title card on `part:start`, "PART CLEAR!" vs "MISSION COMPLETE!" by `stage:clear.final`, laser icon, card yields to weapon callouts |
| `src/scenes/ui/ResultsScene.ts` | mission totals + **PARTS** breakdown (one row per part), rank from the mission's POW total |
| `src/scenes/ui/TitleScene.ts` | **PART SELECT** (reads `core/progress.ts` defensively; locked rows, BEST scores, starts `Game` with `{ part }`) |
| `src/scenes/ui/IntroScene.ts` | mission name + escape-premise tagline; only on a mission's first part |
| `src/ui/index.ts` | keeps the `part:start` payload for the HUD (it is launched a frame later), gates the Intro, per-part POW totals |
| `src/audio/catalog.ts`, `src/audio/events.ts` | new keys/aliases, `bossMusicFor(name)`, part music + ambience on `part:start`, jingle by `final` |
| `src/config/tuning/ui.ts` | `titleCard`, `radio`, `partClear` (map anchors/route), `partSelect`, `intro.taglines`, `results.powTotalByPart`, `audio.ambience` |
| `art-src/ui/hud.lua` | `icon_laser` ("L" weapon) and `icon_lock` added to `ui_icons` |

### Scene and data flow
1. `GameScene.create` emits `stage:start` then `part:start` before the HUD scene exists → `registerUi` stores the payload; `HudScene.create` takes it
   (`takePendingPart()`) and shows the **title card** after `UI.titleCard.delayMs`, or after the Intro (`afterIntroMs`) when the part is a
   mission's first (the Intro now carries the mission name and `UI.intro.taglines[mission]`). The card: mission line slides in, the title slams
   (steel; fire for the final part), the location fades in, and **Hazel's radio box** opens (`radio_static`, `radio_blip` per page, typewriter at
   26 ms/char, 2 rows × 33 chars per page, long briefings paginate). Shoot/jump reveal the current page; nothing blocks gameplay; a weapon
   callout cuts the title (Hazel keeps talking); `stage:clear`/`game:over` hide it. `__KBE.state().hud.card` exposes it for QA.
2. `stage:clear { part, final }` → HUD shows **PART CLEAR!** (fire) or **MISSION COMPLETE!** (steel), fades to black at 2.8 s; Audio stops the
   music and the ambience loops and plays `part_clear_jingle` / `jingle_complete`.
3. Engine starts **`PartClear`** with `{ from, next, result, carry }` (every field is defaulted defensively, so the scene also previews from the
   Title with partial data). Header "PART I CLEAR!", tally (SCORE, POW RESCUED, KILLS, ACCURACY, TIME, TOTAL = carried score; lives/bombs/arms
   line), the map: pictograms I/II/III on the railway, the Knotz marker travels from the cleared part to the next one along the route
   (`UI.partClear.route`, dots light up), the pin drops with a blip, "NEXT: TIMBER EXPRESS" + location appear, PRESS START (auto-advance after
   8 s; confirm during the tally skips everything). A quiet `wind` loop plays under the map. Leave: `ui_start` → wipe →
   `scene.start('Game', { part: next.id, carry })` (the engine latches held keys on Game create).
4. The next part: `part:start` → title card again; Audio starts `ctx.part.music` unless Levels' map property already started gameplay music, and
   the part's ambience loops (`UI.audio.ambience`: `1-2` train clack + wind, `1-3` wind). Boss arenas: `boss:spawn` picks `music_midboss` unless
   the name is MOOSEZILLA (`music_boss`); the HUD bar shows any `name` (WARDEN'S SNOWCAT, IRONHORN, MOOSEZILLA).
5. Final part → **Results** with totals + `parts[]`: RESULTS panel (tally) + PARTS panel (numeral, title, score / POW / time per part) + rank
   (POW total = sum of each part's reported `powTotal`, else `UI.results.powTotalByPart`).
6. Title → **PART SELECT**: `loadProgress()` (try/catch, shape-checked), rows with the map pictogram or a lock, BEST score / NEW / LOCKED, the
   selected part's location, cursor starts on the furthest unlocked part; confirm → wipe → `scene.start('Game', { part })` (fresh run state).

### Measured levels (Vorbis files, from the manifests)
| Key | Length | Peak dBFS | RMS dBFS | Loop |
|---|---|---|---|---|
| `train_clack` | 1.60 s | -11.6 | -25.3 | loop (seam 0.001) |
| `train_horn` | 1.80 s | -3.6 | -15.2 |  |
| `train_whistle` | 2.02 s | -6.7 | -17.3 |  |
| `wind` | 2.40 s | -19.2 | -29.8 | loop (seam 0.000) |
| `ice_crack` | 0.47 s | -1.4 | -20.0 |  |
| `ice_shatter` | 0.83 s | -1.2 | -19.1 |  |
| `laser` | 0.30 s | -6.4 | -16.0 |  |
| `snowcat_engine` | 1.20 s | -10.9 | -17.6 |  |
| `snowcat_tread` | 0.70 s | -9.8 | -22.3 | loop (seam 0.007) |
| `mortar_thump` | 0.49 s | -4.6 | -16.2 |  |
| `loco_steam` | 1.10 s | -2.0 | -20.4 |  |
| `loco_cannon` | 0.85 s | -5.4 | -16.3 |  |
| `cinder` | 0.40 s | -3.0 | -22.2 |  |
| `hound_bark` | 0.32 s | -3.2 | -15.3 |  |
| `hound_growl` | 0.80 s | -7.8 | -18.7 |  |
| `buzzard_rotor` | 0.90 s | -9.6 | -22.7 | loop (seam 0.001) |
| `radio_blip` | 0.18 s | -7.2 | -18.0 |  |
| `radio_static` | 0.60 s | -8.1 | -22.6 |  |
| `music_m1p2` | 76.8 s (48 bars @ 150 BPM) | -1.9 (-1.0 after Vorbis) | -14.6 | seamless (seam 0.025; `music_stage1` is 0.052) |
| `music_m1p3` | 75.0 s (40 bars @ 128 BPM) | -3.2 | -15.5 | seamless (seam 0.003) |
| `music_midboss` | 43.6 s (32 bars @ 176 BPM) | -2.1 | -13.5 | seamless (seam 0.014) |
| `part_clear_jingle` | 4.8 s (2 bars @ 150 BPM) | -1.9 | -14.5 | one-shot |

Loops are rendered with `periodic()` (the tail already holds the next period's head) so `loopify()` keeps the exact period: `train_clack` is
1.600 s = 4 beats at 150 BPM, `wind`'s gust LFOs are multiples of 1/2.4 Hz. Music: `music_m1p2` G minor, palm-mute chug (`inst_chug`) on 8ths,
woodblock "clack-clack" per 2 beats (`DRUM.w`), brass lead, train bell; `music_m1p3` E minor with b2/tritone, half-time "eerie" kit, icy bell
arpeggio with delay, dark pad, dissonant organ, wind swells (`inst_whoosh`); `music_midboss` F# harmonic-minor chase, gallop bass, "chase"
kit, hard lead + organ stabs. Piano rolls: `/tmp/kbe-ui/audio/roll_music_m1p2.png`, `roll_music_m1p3.png`, `roll_music_midboss.png`,
`roll_part_clear_jingle.png`; spectrograms/waveforms `/tmp/kbe-ui/audio/<key>_spec.png`/`_wave.png`. Limiter and mix rules unchanged
(`UI.audio.limiter`, catalog tiers; `audio.unknown` stayed `[]` through every flow run).

### Screenshots (SwiftShader, 3×)
`/tmp/kbe-ui/e_flow_clear.png` (PART CLEAR! over the camp) → `e_flow_partclear.png` / `e_partclear_tally.png` (tally) →
`e_partclear_arrived.png` (marker at the train, NEXT: TIMBER EXPRESS) → `e_flow_p2_card.png` (Part II title card) → `e_flow_p2_radio.png`
(Hazel paginating); `e_card_fast.png`, `e_card_radio.png` (Part I card + radio); `e_seq_23.png` (Intro with mission name + tagline) →
`e_seq_29.png` (card after the Intro); `e_final_clear.png` / `e_final_results.png` (final part → MISSION COMPLETE! → Results);
`e_results.png` (Results with three parts, rank B); `e_partselect_locked.png` (PART SELECT); `e_laser.png` (laser icon, LASER GUN!);
`/tmp/kbe-ui/campaign_x3.png` (map/radio/pictogram art sheet).

See it:
```sh
node game/tools/shot.mjs --out /tmp/kbe-ui/flow.png --query "scene=Game&fast=1&part=1-1&debug=1&god=1&mute=1" --wait 1800 \
  --steps '[{"eval":"window.__KBE.cheats.clearPart()"},{"wait":900},{"shot":"/tmp/kbe-ui/clear.png"},{"wait":3400},{"shot":"/tmp/kbe-ui/partclear.png"},{"wait":5500},{"shot":"/tmp/kbe-ui/arrived.png"},{"press":"Enter"},{"wait":1500}]'
# PartClear / Results with sample data (wrap scene.start in (..., 1): shot.mjs serialises the eval result)
node game/tools/shot.mjs --out /tmp/kbe-ui/pc.png --query "scene=Title&mute=1" --wait 1500 --steps '[{"eval":"(window.__KBE.game.scene.getScene(\"Title\").scene.start(\"PartClear\",{result:{id:\"1-1\",score:12340,rescued:3,kills:41,deaths:1,shots:200,hits:131,timeMs:154000}}), 1)"},{"wait":8500}]'
```

### Known issues
- `?part=1-2` / `1-3` still load the `m1p1` map (Levels' maps haven't landed); the flow, music, ambience and cards were verified on that fallback.
- The radio box's skip key is shoot/jump (there is no spare action: Enter pauses, Esc pauses, X is shoot). It only fast-forwards the page; it
  never closes the box, so a trigger-happy player still sees the full line. Pages close by timeout (1.7 s / 2.4 s last).
- Rank POW totals for `1-2`/`1-3` are estimates (`powTotalByPart` 4 / 3) until those levels report `powTotal`.
- The Knotz map marker stands on the pictogram it has reached (by design); the radio icon's signal arcs are 1 px and subtle at 1×.
- Nobody has heard the new audio; levels are numeric. `music_m1p2` peaks at -1.0 dBFS after Vorbis (limiter ceiling 0.80 pre-encode).

### Requests for other teams (Phase E)
- **Engine**: done, thanks: `part:start`, `stage:clear {part, final}`, PartClear data, `progress.ts`, `cheats.clearPart()`. One wish: a
  `cheats.part('1-2')` that keeps the carry would let QA test PART CLEAR → Part II with real totals.
- **Levels**: `PartDef.music` is started by the Audio layer when no gameplay music is playing at `part:start`; a map `music` property that
  already started one wins (no change needed). `train_clack`/`wind` loops run from `part:start` for `1-2`/`1-3` (1 voice each), so you don't
  need to call them; `train_horn` for the DUCK! telegraph and `ice_crack`/`ice_shatter` for the crack→water swap are yours to call (positional
  `{ x }`). When `m1p2`/`m1p3` report `LevelQuery.powTotal`, the rank uses it.
- **Enemies/Bosses**: `boss:spawn` names route the music (anything but MOOSEZILLA → `music_midboss`). `snowcat_engine` (rev telegraph),
  `snowcat_tread` (loop handle via `getAudio(scene).loop`), `mortar_thump`, `loco_steam`, `loco_cannon`, `cinder`, `hound_bark/growl`,
  `buzzard_rotor` (loop) are live; `enemy:shoot` with `kind: 'snowcat' | 'ironhorn'` positions the following direct call (`weapon: 'mortar'`
  swaps in the mortar). Keep emitting `boss:stomp` + calling `sfx('boss_stomp')` as Moosezilla does (the event only positions the call).
- **Player**: `laser` is in the catalog with HMG-style rapid-fire fatigue; the HUD shows `icon_laser` and "LASER GUN!" as soon as
  `weapon:changed { weapon: 'laser' }` arrives (verified through the HUD; `cheats.give('laser')` currently reverts to the pistol on your side).
- **QA**: `__KBE.state().hud.card` (title/location/radio phase + text), `__KBE.state().partClear` (phase, tallyDone, arrived) and
  `ui.log` entries `partclear:open`, `partclear:next`, `title:start <part>` are there for flow assertions.
