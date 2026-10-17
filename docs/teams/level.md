# Levels and content: Mission 1 "Pine Ridge Breakout"

> **Phase E (3 parts) is at the end of this file.** Sections below it describe Part I (`m1p1`, formerly `stage1`) as built in Phases A–D.

Phase A delivered the art and data (tileset, props, the Mission 1 map, parallax assets, the asset pack). Phase B made the level run in the
game: `src/level/**` and `src/config/tuning/level.ts` (see "Phase B: runtime" below).

## Build and preview

| What | Command (from `game/`) | Output |
|---|---|---|
| Tileset | `bash tools/build-art.sh art-src/tiles/stage1.lua` | `public/assets/tiles/stage1.png` (512×224, 32 columns, 16×16 tiles, 0 margin and spacing), `art-src/tiles/stage1.aseprite`, `art-src/tiles/stage1_tiles.json` (manifest: tile name → id, properties, animation) |
| Props | `bash tools/build-art.sh art-src/props/<group>.lua` | `public/assets/sprites/props/prop_*.png/.json` (24 sprites), `art-src/props/manifest.json` |
| Haze layer | `bash tools/build-art.sh art-src/maps/haze.lua` | `public/assets/backgrounds/stage1/haze.png` |
| Maps, everything | `bash art-src/maps/build.sh [m1p1 m1p2 m1p3] [--tiles]` (no map = all three; `--tiles` rebuilds the tilesets and train strips first) | `art-src/maps/<map>.tmx` (embedded tilesets), `public/assets/maps/<map>.tmj`, validation report, previews in `/tmp/kbe-level/<map>/` |
| Validate only | `node art-src/maps/validate.mjs public/assets/maps/<map>.tmj` | Contract check, arena placement check, static traversal check, summary. Exit code 1 on errors |

Each map has its own generator, `art-src/maps/build_<map>.mjs`, on the shared level DSL `art-src/maps/lib/mapkit.mjs` (ground runs,
platforms, trees, bridges, facades, spawns, multi-tileset TMX writer, autotiler). **Don't hand-edit the `.tmx` files**: edit the script
and rebuild. Tile ids are always resolved by name from the manifests (`<tileset>:<name>` picks a tileset explicitly), so tileset layout
changes never break a map. (Phase A–D called the Part I map `stage1`; it's now `m1p1`, byte-identical apart from the Phase E edits.)

Previews in `/tmp/kbe-level/`:
- `stage1_full.png`: raw tile render.
- `stage1_annotated.png`: props plus colour-coded spawn markers and trigger frames. The colour legend is in `art-src/maps/lib/preview.lua`.
- `stage1_x000.png` … `stage1_x400.png`: 40-tile chunks at 2×.
- `screen_NN.png`: game-camera crops at 3× on a stand-in sky.
- `plx_NN.png`: game-camera crops with the real parallax stack, using the plan below.

## Tileset `stage1` (tileset name in Tiled = `stage1`, texture key `tiles_stage1`)

### Properties
- `collides` (bool)
- `oneway` (bool)
- `hazard` = `water` or `spikes`
- `material` = `dirt`, `stone`, `metal`, `wood`, `snow` or `water` (the engine vocabulary). Snow-capped tops of earth and rock report `snow`.
- Background (`*_bg_*`) and decoration tiles have no properties. The validator fails if a collidable tile lands in a non-collision layer.

### Layout (`row`: contents)
- **0–3: terrain, foreground (collides).** One row each: `ground` (snowy-grass dirt), `rock`, `concrete`, `steel` (hazard-striped top).
  Columns: `m0`–`m15` = exposed-side mask (N=1, E=2, S=4, W=8), `ic_tl/tr/bl/br` = inner corners, `fill_v1-3`, `deep_v0-3`
  (darker fill used for the bottom row and for depth ≥ 4), `top_v1-3` (alternate tops). Name pattern: `<mat>_<variant>`.
  Every variant keeps its edge pixels identical, so any mix is seamless. No slopes: terrain steps instead.
- **4–7: the same four sets for the `back` layer**, palette-remapped darker, cooler and outline-free (`<mat>_bg_<variant>`).
- **8: platforms and solids.**
  - One-way: `plank_l/m/m2/r`, `log_l/m/m2/r`, `branch_l/m/r`, `bridge_a/b/c`, `catwalk_l/m/m2/r`.
  - Solid sandbag wall: `sandbag_tl/tm/tr/ml/mm/mr`.
  - Hazards: `spikes`, `spikes_wood` (`hazard=spikes`).
- **9: water and supports.**
  - `water_top_f0..3` (animated through f0, 140 ms per frame) and `water_body_f0..3` (animated, 180 ms), `water_deep`. All `hazard=water`.
  - Supports: `post_top/mid/base`, `bridge_post_top/mid`.
  - Rope handrails: `rope_<yL>_<yR>` in 8 sag segments, plus `rope_hangers`.
  - Outpost metal: `truss`, `railing`, `railing_post`, `ladder_top/mid`, `chain`, `chain_hook`.
- **10: fences and trees.**
  - Chain-link fence: `fence_top/mid/base`, `fence_post_*`.
  - `stake_top/mid` (palisade), `barbwire_coil`, `barbwire_strand`, `hazard_band`, `hazard_post`.
  - Giant pine trunk: `trunk_l/r`, `trunk_base_l/r`. `bough_s` clump. `tier3_RC` (3×3 pine needle tier).
- **11: nature decoration.** `tuft_1-3`, `rock_small`, `rock_pair`, `drift_l/m/r`, `bush_l/r`, `stump`, `icicles_a/b`, `roots`, and `tier4_RC` (4×3 tier).
- **12: outpost decoration.**
  - Free-standing: `pipe_h/v`, pipe elbows, `valve`, `vent`, `window_lit/dark`, `cage_lamp`, `sign_warn`, `poster_top/bot`, `cable`, `crack`, `rivet_strip`.
  - **`wall_*`** variants are the same pieces baked onto background concrete, because the back layer holds one tile per cell.
- **13: `bg_far_deco` silhouettes.** 2-wide distant pines: `far_pine_{top,mid,base}_{l,r}`, `far_pine2_*`.

## Map `stage1.tmj` (key `map_stage1`)

420×24 tiles (6720×384 px).

### Layers, top to bottom
`bg_far_deco` (far pine silhouettes), `back` (background hills, fences, trunks, needle tiers, facades, rope rails), `ground` (collision,
one-way and hazards), `front` (icicles, roots under overhangs, barbed wire, a few tufts), then `spawns` and `triggers`.

### Map properties
- `name` = "Pine Ridge Breakout"
- `music` = `music_stage1` (the audio catalog key; the boss music trigger uses `music_boss`)
- `parallax` = `stage1`
- `sections` = `prison_camp:0-60,pine_forest:60-170,river_bridge:170-250,regime_outpost:250-360,moose_pen:360-420` (in tiles)

### Conventions
- The default ground surface is **row 21** (y = 336). The camera resting on the map bottom shows rows 10.5–24.
- Every spawn is a **point at the feet** (bottom-centre), matching the engine's `ctx.spawn(type, kind, props, x, y)`.
- Flying spawns (`drone`, `paratrooper`) sit at their air position. Paratroopers are at y ≈ 0–16 so they drop in.
- Tiles flipped horizontally (left-pointing branches and tiers) use Tiled's flip bit. Phaser handles it.
- Physics reach used for the layout: jump about 3.5 tiles, gap about 4 tiles. Every required step is ≤ 3 tiles up and ≤ 3 across. Gaps are 3 tiles.

### Spawn and trigger properties

The contract keys come first. Extra optional keys are tagged *(ext)*. Factories must tolerate unknown keys.

| type | properties |
|---|---|
| `player_start` | none |
| `enemy` | `kind` (grunt, grenadier, shield, turret, drone, paratrooper), `facing` (left/right, default left), `patrol` (px), `wave` (1..n), `lock` *(ext: camera_lock id the wave belongs to)*, `delay` *(ext: ms after the wave starts)*, `from` *(ext: `door` = walks out of the nearest bunker_door)*, `idle` *(ext: `sleep`, `crouch` or `flee`)*, `mount` *(ext, turret: `sandbag`, `roof` or `pedestal`)* |
| `pow` | `item` (hmg, spread, rocket, flame, bombs), `pose` *(ext: `tree`)* |
| `pickup` | `kind` (hmg, spread, rocket, flame, bombs, points, life), `float` *(ext: hangs in the air)*, `hidden` *(ext: secret 1UP)* |
| `boss` | `kind=moosezilla`, `lock=boss`, `wave=1` |
| `prop` | `kind` (24 sprite kinds, see props below), `layer` *(ext: `back` = decor behind actors, no body; `front` = over actors; omitted = gameplay prop at PROPS depth)*, `contains` *(ext: pickup kind dropped when destroyed)*, `stacked` *(ext)*, `variant` *(ext: prison_cell `broken`)*, `on` *(ext: alarm_light starts blinking)*, `lock` *(ext: alarm/door/gate reacting to that lock)*, `sweep` *(ext: searchlight sweeps)*, `spawns`/`count`/`interval` *(ext: bunker_door trickle-spawns that enemy kind while on screen)* |
| `camera_lock` | `id`, `release` (clear or time), `waves` |
| `checkpoint` | `id` |
| `stage_end` | `requires` *(ext: `boss` = armed only after `boss:defeated`)*. Fallback only: `boss:defeated` clears the stage by itself (Phase D) |
| `music` | `key` |
| `prompt` | `text` |
| `ambience` | `fx` (snow, embers, fireflies) |

## Section breakdown

| # | Section | Tiles (px) | Beats |
|---|---|---|---|
| 1 | Prison Camp | 0–60 (0–960) | The player starts in a broken cell on a concrete slab. FIRE and JUMP signs sit before a 2-high sandbag wall. A sleeping guard (back turned: sneak-up beat), then watchtower #1 with a sniper on the deck and a patroller below. The **POW (hmg)** comes early. **Crouch lesson:** a ▼+FIRE sign and a prompt, then one low crate holding a points medal (standing fire sails over it, the crouch shot breaks it), then the first crouching grunt. A supply shelf (bombs). The BOMB sign teaches the **sandbag turret** with an explosive barrel beside it. Watchtower #2 has a searchlight and a grunt. The palisade exit has an alarm light. 7 enemies, gentle |
| 2 | Pine Forest | 60–170 (960–2720) | Terrain steps up 1 tile at a time. A log ledge holds a grenadier. A dip with an explosive barrel and a grunt pair. **Rock outcrop** (top row 17) with grenadier and crouching grunt, and icicles under its overhang. **Two giant climbable pines** (x 123 and x 134) with branch platforms wrapped in needle tiers, an upper route via a log, and the **POW in a tree (spread)** at row 9. Drones throughout (all inside the resting view on the ground route). A log bridges a spiked ravine. A breather clearing with a supply crate (hmg), then the **first shield trooper** at the bank. Mid checkpoint at x 128. Pines carry lower boughs into the ground view; tree 2's right-hand cone climbs to the tree POW. 17 enemies |
| 3 | River Bridge | 170–250 (2720–4000) | A rope bridge (deck row 18) over a deadly river (surface row 21), with sagging handrails and pylons. Jump gaps at x 187–189 and 235–237. Paratroopers drop in. **Arena #1 `bridge`** (x 200–224, 384 px) on a mid-river rock island: wave 1 is grunts plus paratroopers, wave 2 adds shields from both sides plus a grenadier, wave 3 is drones plus a shield plus a paratrooper, staggered so threats arrive one side at a time. `WAVE n/3` / `FINAL WAVE!` prompts. The **POW (rocket)** is right after the arena with no enemy on top of it (recovery beat). 18 enemies |
| 4 | Regime Outpost | 250–360 (4000–5760) | A skyline of separate concrete buildings with gaps that show `gen_outpost_far`. A crouching grunt in front of a wide 2-high sandbag step up to bunker A's roof (shield + turret, the roof edge is a clear landing). A catwalk runs over a bunker door that trickle-spawns grunts and over explosive barrels. A pedestal turret, then bunker B's roof with a grenadier. A **spike pit**, then a catwalk staircase up to structure C, with a **tunnel** under it. C's roof leads to the **hidden 1UP** at row 6. The **POW (flame)** is at the tunnel exit. Checkpoint, then **Arena #2 `bunker`** (x 322–346): grunts from two bunker doors, then shields from both sides plus a grenadier, with a roof turret on the right pillar. A supply crate (bombs) after the arena. 22 enemies, embers ambience |
| 5 | Moose Pen | 360–420 (5760–6720) | A breather with a supply crate (hmg), crates (bombs), a rocket pickup, the **POW (bombs)** and two fleeing grunts. Boss checkpoint at x 388, boss music trigger at x 389. **Arena `boss`** (x 390–420, 480 px, so the camera drifts 96 px): a hazard-striped steel floor, a low palisade, a watchtower, one plank platform on posts (x 392–395, row 18), and the **gate** set into a gatehouse at x 414. MOOSEZILLA spawns behind it. After the death chain the stage clears automatically wherever the player stands; `stage_end` (x 390–417, the whole floor) is a fallback |

### Checkpoints
`cp_camp`@2, `cp_forest`@60, `cp_forest_b`@128, `cp_bridge`@170, `cp_outpost`@252, `cp_outpost_b`@318, `cp_pen`@360, `cp_boss`@388 (tile x).

### Totals (validator)
- Enemies: 33 grunts, 6 grenadiers, 8 shields, 4 turrets, 9 drones, 6 paratroopers (66, Phase C had 75).
- 5 POWs, one per weapon plus bombs.
- Pickups: 3 points, 1 rocket, 1 life (plus crate contents: the camp crouch crate holds a points medal).
- 58 props (25 kinds: `sign_crouch` is new).
- Triggers: 8 checkpoints, 3 camera locks, 6 ambience, 6 prompts, 2 music, 1 stage_end.

## Props (`public/assets/sprites/props/`, built by a helper agent, reviewed)

All 25 props are anchored bottom-centre, except `prop_searchlight_beam`, whose origin is (0, 0.5). Texture key `prop_<kind>`, tags
`prop_<kind>_<anim>`. `art-src/props/manifest.json` has the canvas sizes, tags, suggested bodies and hp.

| Group | Kinds |
|---|---|
| Destructibles | `crate` (hp 3), `supply_crate` (4), `barrel` (5), `explosive_barrel` (3; `damaged1` at hp 2, `damaged2` at hp 1), `sandbag` (10) |
| Camp | `watchtower` (deck walkable at y = 32 from the canvas top, which matches a plank row 5 tiles up), `prison_cell` (`broken`, `intact`), `lamp_post`, `wire_coil` |
| Signs | `sign_jump`, `sign_bomb`, `sign_shoot`, `sign_crouch` (▼ + / FIRE), `sign_arrow` (animated), `sign_danger` |
| Forest | `pine_fg`, `pine_mid`, `pine_dead` |
| Outpost | `gate` (`closed`, `shake`, `smashed`; remove its body on smash), `alarm_light` (`off`, `on`), `searchlight` (+ `searchlight_beam`, additive blend recommended), `flag`, `banner`, `bunker_door` (`closed`, `open`; play once and hold) |

## Parallax plan (key prefix `bg1_`, all in the `level` pack)

Offsets are screen y when the camera rests on the map bottom (`scrollY = 168`). Implement each layer as a camera-fixed
`TileSprite` (`scrollFactor 0`):
- `tilePositionX = camX * sfX`.
- `y = offset + (168 - camY) * sfY`, so the layer sinks a little when the camera climbs.

Verified in `/tmp/kbe-level/plx_*.png`.

| Depth | Key | File | sfX | sfY | y offset | Notes |
|---|---|---|---|---|---|---|
| BG_FAR+0 | `bg1_sky` | gen_sky.png 384×216 | 0.015 | 0 | 0 | Opaque base |
| BG_FAR+1 | `bg1_mountains` | gen_mountains.png 768×140 | 0.08 | 0.04 | 34 | |
| BG_FAR+2 | `bg1_pines_far` | gen_pines_far.png 768×110 | 0.18 | 0.08 | 91 | |
| BG_FAR+3 | `bg1_pines_mid` | gen_pines_mid.png 768×150 | 0.34 | 0.15 | 90 | Sections 1–3. Alpha crossfades out over camX 3700→4084 |
| BG_FAR+3 | `bg1_outpost_far` | gen_outpost_far.png 768×140 | 0.23 | 0.12 | 67 | Sections 4–5. Crossfades in over the same span |
| BG_NEAR+0 | `bg1_haze` | haze.png 384×64 (hand-made) | 0.5 | 0.3 | 112 | Sparse dithered mist (binary alpha). Optional `alpha 0.7` |
| TILES_BACK−2 | tile layer `bg_far_deco` | | 1.0 | 1.0 | | Distant pine silhouettes |
| TILES_BACK | tile layer `back` | | 1.0 | 1.0 | | |
| (map) | `ground` | | | | | Same depth band as `back` +1, under PROPS |
| TILES_FRONT | tile layer `front` | | | | | |

Below the map's own sky (rows 0–10) the stack above shows. The camera background colour should be `#6aa2dc` (`sky4`) in case a
strip is ever uncovered.

## Phase B: runtime (`src/level/**`, `src/config/tuning/level.ts`)

| File | Job |
|---|---|
| `index.ts` | `registerLevel(ctx)`: builds the map and parallax, `ctx.setLevel(query)` (the engine sandbox then steps aside), registers the prop factories (prop animations come from Preload's `createAsepriteAnims`), spawns the player and every prop, runs spawner/arenas/triggers each frame, debug fields and the `warp`/`boss` cheats |
| `map.ts` | Tilemap + the 4 layers (`bg_far_deco` TILES_BACK−2, `back` TILES_BACK, `ground` TILES_BACK+2, `front` TILES_FRONT), `createTileLevelQuery` (with `waterSurfaceAt`), Tiled object parsing, `sections` |
| `parallax.ts` | Camera-fixed TileSprites per the plan above, crossfade forest → outpost. Updated at the scene's `PRE_RENDER` (after the engine camera moves at `POST_UPDATE`) with rounded offsets, so layers never lag the tiles or shimmer |
| `props.ts` | `prop:<kind>` factories. Destructibles (crate, supply_crate, barrel, explosive_barrel, sandbag): neutral hurtbox from the manifest body, solid static body (players stand on them; stacked props fall when their support breaks), damaged frames, white hit flash, `fx:emit debris`, `crate_break`, `contains` → `ctx.spawn('pickup', kind, ...)`. Explosive barrels: `fx.explosion(m)` + `damage.applyRadial` (44 px, 6 dmg, neutral), chain reactions staggered 140 ms. Decor: `layer=back` at TILES_BACK+1 (behind the ground layer), `layer=front` above actors, else PROPS. Searchlight beam sweeps (ADD). Alarm lights (`on`, or lit while their `lock` arena runs). Bunker doors (`from=door` wave members, `spawns/count/interval` trickle while on screen). Gate (solid while closed, rumble, smash) |
| `spawner.ts` | Proximity spawning, once per run: ground objects at view.right + 32 (enemies don't think beyond 32 px), drones + 64, paratroopers once their x is 64 px inside the view (they appear above the top edge and drift in). Objects > 96 px behind the view are skipped (warps). A factory that returns nothing (enemy cap) is retried |
| `arenas.ts` | `camera_lock` arenas. Wave arena: locks when the camera is 48 px from its left edge → waves in order, members honour `delay` and `from=door`; members placed outside the walls spawn 12 px inside with ≤ 20 px patrol (enemies freeze > 32 px off-view and don't walk in); every member dead → next wave after 700 ms; each wave start of a multi-wave arena emits `ui:prompt` `WAVE n/N` / `FINAL WAVE!`; last wave → unlock after 600 ms (`camera:unlock`, the UI's "GO!"). `release=time` (+ `time` s) supported. Boss arena: starts when the gate is on screen → 1.3 s gate rumble → smash → `ctx.spawn('boss', 'moosezilla', {arenaX0, arenaX1, facing})`; Moosezilla locks the camera itself and unlocks on `boss:defeated`. A foreign unlock (warp) relocks while the player is inside, otherwise abandons a wave arena (a live boss arena waits) |
| `triggers.ts` | `checkpoint` and `music` fire on crossing the strip's left edge; `prompt` once when the feet are inside (`ui:prompt`, 3.5 s); `ambience` rects are published as `fx:zone` at load and `fx:ambience` follows the innermost zone; `boss:defeated` → `stage:clear` after `LEVEL.boss.clearDelayMs` (1.4 s, waits while the player is dead/respawning and up to 1.5 s for them to land); `stage_end` → `stage:clear` as a fallback (`requires=boss` armed by `boss:defeated`) |

Hazards need no level code: water and spike tiles are non-colliding `hazard` tiles, so the player falls in and its
`hazardAt(x, feet − 2)` check kills it (verified for both); FX places the splash with `waterSurfaceAt`. Water tiles animate natively:
Phaser 4's `TilemapLayer.preUpdate` advances `timeElapsed` and the WebGL renderer draws `getAnimatedTileId` (verified in game: 289→292 cycle).

**Debug / QA:** `__KBE.state()` gains `section`, `arena` (`{active, state, wave, waves, alive, pending, x0, x1, arenas: "bridge:done bunker:idle boss:idle"}`)
and `level` (`{name, section, checkpoint, pending, spawned, skipped, gate}`). Cheats: `warp(x)` lands on the standable, hazard-free surface nearest
the player's current height (± 64 px sideways off walls; the engine default took the first surface from the top, e.g. the end pillar at x 6719,
which froze the boss off-view); `boss()` warps to `cp_boss` (walk right: the gate rumbles and MOOSEZILLA bursts out).

**See it** (from the repo root, `node game/tools/shot.mjs --out /tmp/kbe-level/<name>.png --query "scene=Game&mute=1&god=1&x=<X>"`):
`x=400` camp + watchtower, `x=900` turret emplacement, `x=1900` giant pines, `x=2800` rope bridge + paratroopers, `x=3080` then
`--steps '[{"hold":"ArrowRight","ms":2000}]'` bridge arena lock, `x=4200` outpost (outpost backdrop), `x=5000` + hold right 2800 ms bunker arena
(doors open), `x=5900` moose pen, `x=6200` + hold right 1200 ms boss gate rumble/smash.

## Known gaps
- Enemies now read `idle` (`sleep`/`crouch`/`flee`), `mount` and `from=door`. Enemies never walk toward the player, so wave members that start
  far away only engage when the player approaches.
- Low crates sit below the standing shot line by design (taught by the camp crouch lesson): crouch-shoot or grenade them.
- Water tiles animate on real time (the layer timer isn't hitstop-scaled); invisible in practice.
- Turret mounts (`sandbag`, `roof`, `pedestal`) assume the enemies team draws the turret standing on its base. The `wall` style isn't used.
- The bridge rope sag is a fixed 7-segment curve resampled per span. Handrails are back layer only (there's no front rope).
- The hand-made haze is very subtle and could be dropped if it reads as noise at 5× scale.

## Phase D: fixes and polish (2026-10-16)

| ID / item | Change |
|---|---|
| **KBE-QA-L01** (S2) | `triggers.ts`: `boss:defeated` (emitted after the death chain) arms an automatic `stage:clear` 1.4 s later from any position (waits through a death/respawn, and up to 1.5 s for an airborne player to land). `stage_end` widened to the whole floor (x 390–417) as a fallback. `arenas.ts`: `boss:defeated` also retires an idle boss arena (a boss spawned outside the arena flow, e.g. `?enemytest=boss`, no longer lets the gate intro run after the clear and spawn a second MOOSEZILLA) |
| **KBE-QA-L03** | Background trunks get three lower boughs (rows 7–15, alternating sides, widening, the lowest 6 rows above the ground so lanes stay clear). Climbable tree 1 gets a bough behind the outcrop log (that route visibly enters the canopy); tree 2 a right-hand cone R15/R12/R9 that climbs to the tree POW plus a low left bough. Quieter background: back-layer earth uses plain fills 60 % of the time (was 25 %), background rock has its own lower-contrast remap (`BG_ROCK_MAP` in `art-src/tiles/stage1.lua`), and the hill behind the outcrop lane is 2 rows lower |
| Rules L1 | `props.ts`: a falling stacked prop's tween is kept and stopped in `breakProp`/on destroy; its callbacks bail on a dead prop |
| Engine E2 landed | `src/level/animations.ts` deleted: Preload's `createAsepriteAnims` builds every `prop_*` tag; `playIf` uses core `hasAnim`. Verified in game: all 22 placed prop kinds play a valid animation (multi-frame: flag, banner, alarm light, lamp post, explosive barrel, sign arrow), zero empty `prop_*` animations |
| QA #3 crouch | New prop `sign_crouch` (▼ + / FIRE, `art-src/props/signs.lua`, manifest, `packs/level.json`, validator kind list). Camp x34: sign + prompt `CROUCH SHOT: HOLD ↓ + X`, a single low crate at x37 with a points medal, then the first crouching grunt (x42). Verified: standing fire leaves the crate intact, the crouch shot breaks it and drops the medal |
| QA #4 | Camp sleeper faces right (back to the player, so it isn't woken by sight on approach); its neighbour's patrol no longer walks over it. Pen guards keep `idle:flee`. Enemies read both |
| QA #5 | Outpost: the sandbags fill x 257–260 (a 4-wide 2-high step against bunker A): no trough, two 2-tile hops to the roof. Crouching grunt moved in front of it (x255); roof shield moved to x266 with `patrol: 0` so the roof edge is a clear landing |
| QA #10 | `WAVE n/N` / `FINAL WAVE!` prompts at each wave start. Recovery beats: rocket POW after the bridge arena without the grunt that stood on it; supply crate (bombs) after the bunker arena with one fewer grunt |
| Pacing | Camp: removed the crouching grunt under the turret/tower crossfire. Forest: removed drone 101, grunt 74, the grunt under the log-ledge grenadier; outcrop grenadier/crouch grunt moved to x110/x115 (5 tiles of safe landing). Every ground-route drone now sits at row 12 (fully inside the resting view; rows 7–10 sat at/above the top edge but inside the AI's 32 px wake margin, so they could dive from off-screen). Bridge: one fewer entry paratrooper; the pre-arena paratrooper/drone moved off the arena's left wall; wave 1 paratroopers follow the grunts (2.4/3.4 s); wave 2 loses one grunt and staggers left grunt (1.6 s) then grenadier (3.4 s); wave 3 drones/paratrooper at 1.4/3.2/4.6 s. Outpost: removed the catwalk-stair grunt firing over the two shields |
| Warp cheat | `warpTo` snaps the camera before unlocking it (`unlock()` starts a blend from the old x and `snapTo()` doesn't cancel it, so a warp out of a locked arena dragged the camera back and clamped the player to the old view: QA bot "Camera moved left 3494 → 3252"). It also abandons a running wave arena the destination leaves (`ArenaController.warped`) |

**Arcade non-god route bot** (`phase-c.mjs --mode sections --difficulty arcade`, a run-right-and-fire bot that never crouches or turns):
camp max x 742 → **974 (cleared)**, forest 1707 → 1768, bridge 3577 → 3578 (dies in the bridge arena to paratroopers landing *behind* it:
visible, telegraphed threats a human turns to face), outpost stalled at 4169 → **5461** (into the bunker arena), pen 6494 → 6495 (cleared).

**For Engine:** `CameraService.snapTo()` should finish any running lock/unlock blend (`this.blend = 1`); the level works around it.


### Phase D follow-up: POW total

- `level/map.ts` sets `query.powTotal` to the count of `pow` objects in the `spawns` layer (5 in stage 1) on the `LevelQuery` from
  `createTileLevelQuery`, so the Results rank uses the real number. Verified in game: UI `runInfo` reads `{ stage: 1, powTotal: 5 }`
  after `stage:start`. Validator OK (0 errors, 0 warnings), `tsc --noEmit` clean, `check:phaser4 --strict` clean.
- Note: `__KBE.state().level` (engine `debug/hooks.ts`) doesn't list `powTotal`. Engine could add it if it's needed for QA.

## Phase E: Mission 1 in 3 parts (2026-10-16)

Every mission part is its own map. The level loads `ctx.part.map` (read defensively; falls back to `LEVEL.map.key` = `m1p1`,
which Engine's GameScene also uses as its fallback). All three maps are in `packs/level.json`.

| Part | Map | Generator | Size | Tilesets | Parallax set | Music | Ambience | Ends with |
|---|---|---|---|---|---|---|---|---|
| I "THE CAMP" | `m1p1` | `build_m1p1.mjs` | 420×24 (6720 px) | stage1 | `stage1` | `music_stage1` | snow / fireflies / embers | `boss` `kind=snowcat` (gate) |
| II "TIMBER EXPRESS" | `m1p2` | `build_m1p2.mjs` | 336×24 (5376 px) | stage1 + `m1_train` | `m1p2`, `drift=260` | `music_m1p2` | `train` (+ moving `tunnel` zones) | `boss` `kind=ironhorn` (no gate) |
| III "MOOSE LAKE" | `m1p3` | `build_m1p3.mjs` | 262×24 (4192 px: 3712 + the 480 px boss yard) | stage1 + `m1_lake` | `m1p3` | `music_m1p3` | `blizzard` | `boss` `kind=moosezilla` (gate) |

Every part has a `music` trigger at x 0–1 (the map key), `music_boss` just before its boss arena, and a `cp_boss` checkpoint (the
`boss` cheat warps there). Part I's map property `clearSfx=train_whistle` plays 0.6 s after `boss:defeated` (the train in the distance).

### New Tiled vocabulary (validator knows all of it)
- Enemy kinds `leaper`, `buzzard`, `hound`; boss kinds `snowcat`, `ironhorn`, `moosezilla`; POW/pickup item `laser`.
- Map property `drift` (px/s): parallax drift for the moving train. Map property `crack_gids` ("f1,f2,f3,water" gids, written by the
  generator by tile name) drives the ice swap.
- Tile properties `material=ice` (slippery; Player reads `ctx.physics.surfaceAt`) and `crack=true` (cracks under the player) /
  `crack=stomp` (cracks only on a heavy `boss:stomp`).
- Trigger `hazard_sweep` (low bridge): `y` (beam bottom, default 234), `count` (beams, default 1), `gap` (ms). Trigger `tunnel`: `ms`.
- Ambience `fx` ids: `snow embers fireflies steam train tunnel blizzard`.
- `gate` props carry `lock=<arena id>` (default `boss`): a boss arena bursts its own gate for the boss; a **wave** arena with a gate
  (Part III's lab gate) blows it open when cleared. `boxcar_door` works like `bunker_door` (`from=door` wave members, `spawns/count/interval`).

### Runtime additions (`src/level/**`)
| File | Job |
|---|---|
| `map.ts` | `buildMap(scene, key, colliders, stage)`: attaches **every** tileset embedded in the map (`tiles_<name>`), live `waterSurfaceAt` (ice holes open new water) |
| `parallax.ts` | Set from the map's `parallax` property (`LEVEL.parallax.sets`). `tilePositionX = (camX + drift·t)·sfX` (scaled clock), so far layers crawl and near ones whip past. Depth bands `far`/`near`/`track`/`front`; `once` layers (Part III's lab compound slides in near the end); `tunnelHide` layers fade while a tunnel covers the view |
| `train.ts` | **Low bridges:** feet enter a `hazard_sweep` → `train_horn`, prompt `LOW BRIDGE! DUCK: HOLD ↓`, a trackside `sign_duck` whips past behind the train, then after 1.9 s the `low_bridge` girder enters at the view's right edge and moves left at drift speed. It deals contact damage through `ctx.damage.deal` to the player (respects god/i-frames) and smashes enemies standing on roofs. Beam bottom 234 = boxcar roof (256) − 22: standing on a roof (head 226) is hit, crouching (head 238) clears it, log/coal tops (272), decks (304) and boxcar interiors are safe; jumping is not. **Tunnels:** a moving rock portal (`tunnel_edge`), dark wall behind the train, icicle ceiling in front, and a moving `fx:zone` of kind `tunnel` (FX draws the darkness and lamps), ambience override `tunnel` while the player is inside |
| `ice.ts` | `crack=true` tile under the player's feet → `crack_f1/f2/f3` (150 ms each, `fx:emit ice_crack`, `ice_crack` sfx) → open water (`hazard=water`, no collision; the engine's hazard check kills) with `ice_shatter`/`ice_break`; refreezes after 9 s (never into a body). `boss:stomp` with power ≥ 2 (MOOSEZILLA phase 3) cracks a 2-tile hole 56 px toward the player in `crack=stomp` arena ice (not within 40 px of the walls), refreezing after 5 s |
| `arenas.ts` | Gates by lock; gateless boss arenas (Ironhorn at the map's end) lock as the camera arrives (the old rule waited 16 px past an exact-width arena that can't scroll that far: Enemies' report). `buzzard` counts as a flyer in the off-view pull and edge clamp |
| `spawner.ts` | Buzzards spawn with the drone's flying margin |
| `triggers.ts` | New ambience ids, tunnel override, `clearSfx`, `stage:clear` carries `{part, final}` |
| `index.ts` | Per-map setup: sky colour, parallax set + drift, `TrainSystem` (maps with drift or train triggers), `IceSystem` (maps with crack tiles). Debug: `level.map/powTotal/drift`, `train {sweeps,beams,hits,tunnels,pending}`, `ice {tiles,live,cracked,opened,refrozen,stomps}` |

### Art (new)
- `art-src/tiles/m1_train.lua` → `tiles/m1_train.png` (48 tiles: deck, underframe, boxcar walls/roof/emblem, log stacks, stakes,
  coal gondola, armor), `art-src/props/train.lua` → props `bogie` (spin), `coupling` (jostle), `boxcar_door` (closed/open),
  `sign_duck`, `low_bridge`, `train_lamp`; `art-src/maps/train_strips.lua` → `backgrounds/m1p2/{track,ballast_front,poles,fg_speed,
  tunnel_edge,tunnel_wall,tunnel_ceiling}.png`. Drawn by a helper from my contract; previews `/tmp/kbe-level/art-train/`.
- `art-src/tiles/m1_lake.lua` → `tiles/m1_lake.png` (37 tiles: ice sheet, under-ice water, `crack_m` + `crack_f1..3`, `crack_stomp`,
  floes (row-21 tiles, flush with the ice), reeds, drifts, shards, lab floor, lab wall decor baked on stage1's background concrete),
  `art-src/props/lake.lua` → props `wreck_boxcar`, `wreck_engine`, `wreck_bogie`, `log_spill`, `sign_thin_ice`, `lab_sign`,
  `tesla_coil`, `ice_hole`. Previews `/tmp/kbe-level/art-lake/`. Note: the lab wall tiles crop stage1's `concrete_bg_*`; rebuild
  `m1_lake` if those change.
- Imagegen's `gen_*` strips for `m1p2` (sky, peaks, slopes, near_pines) and `m1p3` (sky, mountains, lake_far, lab_far) are integrated.

### Validator and previews
`validate.mjs` now also checks (1) **every arena wave member and its patrol stays inside its locked view** (enemy default patrol
48, drones ≥ 48; this flagged 10 Part I members that relied on the runtime clamp: moved inside), and (2) **static traversal** from
`player_start` to the boss arena (walk, ≤ 3-tile steps, gap jumps, drops), run again with every `crack=true` tile turned into water.
`build.sh` renders `/tmp/kbe-level/<map>/` (full, annotated, 40-tile chunks, 3× screens, parallax composites).

### Part I `m1p1` "THE CAMP" (changes only)
Unchanged camp → forest → bridge → outpost. The yard (x 6240–6720, tiles 390–420) now spawns **`boss` `kind=snowcat`** behind the
same gate (it crashes through), `stage_end requires=boss` kept, section renamed `warden_yard`, `clearSfx=train_whistle`. Bridge-arena
members (wave 1 grunts, wave 2 shield/grunt/grenadier, wave 3 shield/drones) and the bunker arena's two wave-2 shields were moved
**inside** their locked views with short patrols (8–16 px); the runtime clamp still exists as a safety net.

### Part II `m1p2` "TIMBER EXPRESS" (x in tiles; ×16 for px)
Deck y 304, log/coal tops 272, armor 288, boxcar roofs 256. 2–3 tile gaps between cars (falling = death off the map bottom).
| Section | Tiles (px) | Cars and beats |
|---|---|---|
| Rear cars | 0–68 (0–1088) | Rear flatcar (start, red marker lamp, crates, **POW hmg**), log car (stack grunts, crouching grunt), boxcar #1 (door spawns 2 grunts, roof grenadier, drone) with **low bridge #1** (2 beams) over it, flatcar (2 leapers, supply crate hmg, explosive barrel). Prompt: GAPS: JUMP! |
| Log cars | 68–141 (1088–2256) | Three log cars and a flatcar: stacks as cover/steps, grenadiers on stacks, leapers, drone, **POW spread** on a stack, stacked crates (points), shield, a **Buzzard** dropping paratroopers, **tunnel #1** (6 s) |
| Boxcars | 141–198 (2256–3168) | Two boxcars (3 doors trickle grunts, roof shield/grenadier, drone, leaper), **low bridge #2** (2 beams), then a sandbagged flatcar (sandbag turret, shield, paratrooper, supply crate bombs) |
| Gun car | 198–224 (3168–3584) | **Arena `guncar`** (x 198–221, 384 px): armored gun car, armor walls at both ends, gun pedestal. W1 pedestal turret + 2 grunts; W2 2 leapers + Buzzard; W3 shield, grenadier on the armor wall, drone. Alarm light lit while locked |
| Coal cars | 224–312 (3584–4992) | Gondolas (coal tops 272), **POW laser**, **tunnel #2** (7 s: drones and a coal-top grunt in the dark), boxcar (door grunts, roof grunt, shield), last gondola with **POW bombs**, a Buzzard and **low bridge #3** (3 beams) |
| Locomotive | 312–336 (4992–5376) | **Arena `boss`**: the end car; **IRONHORN** (`boss kind=ironhorn`, no gate) takes the right side and locks as the camera arrives. `stage_end requires=boss` |
Checkpoints: `cp_rear`@2, `cp_logs`@70, `cp_logs_b`@104, `cp_box`@142, `cp_gun`@190, `cp_coal`@225, `cp_coal_b`@277, `cp_boss`@302.
Validator totals: 4 POWs (hmg, spread, laser, bombs); enemies 12 grunts (+10 from boxcar doors), 6 grenadiers, 5 shields, 2 turrets,
6 drones, 1 paratrooper (+ up to 3 per Buzzard), 8 leapers, 3 Buzzards.

### Part III `m1p3` "MOOSE LAKE" (x in tiles)
Lake surface (ice top) y 336 like Part I's ground.
| Section | Tiles (px) | Beats |
|---|---|---|
| Crash site | 0–48 (0–768) | Snowy shore: the overturned boxcar on a mound, spilled logs, a wheel truck, IRONHORN nose-down in the ice at the waterline. Grunts, the first **hound pack** (2), **POW hmg**, crate (bombs), explosive barrel |
| Frozen lake | 48–151 (768–2416) | Slippery ice (prompts: ICE! IT'S SLIPPERY!, THIN ICE: KEEP MOVING!, THIN ICE! signs), **cracking ice** runs of 3 (71–73, 100–102, 106–107, 128–130, 136–138), two open-water stretches crossed on **floes** (85–96, 140–147), a rock island with the **POW laser** and a grenadier, hound packs of 3 and 2 and 2, shields, drones |
| Lab shore | 151–232 (2416–3712) | Project ANTLER: fence, searchlight, a concrete wall block (sandbag step) with a roof turret and a shield, lab facades with glowing windows/antler emblems, tesla coils, supply crate (hmg), **POW rocket**. **Arena `labgate`** (x 192–215): W1 3 grunts (2 from bunker doors), W2 3 hounds + shield, W3 2 drones + door grenadier; the **lab gate blows open** on clear. Then the lab sign, **POW bombs**, crate, rocket pickup |
| Lab yard | 232–262 (3712–4192) | **Arena `boss`** (480 px): lab steel floor at both ends, `crack=stomp` ice in the middle over water, gatehouse + gate; **MOOSEZILLA** bursts out as before; its phase-3 stomps crack 2-tile holes toward the player (refreeze in 5 s) |
Checkpoints: `cp_crash`@2, `cp_lake`@50, `cp_lake_b`@97, `cp_shore`@152, `cp_lab`@186, `cp_boss`@228. 4 POWs (hmg, laser, rocket, bombs);
enemies 11 grunts, 14 hounds (packs of 2–3), 4 shields, 5 drones, 2 grenadiers, 1 turret.

### Verification (Phase E)
- `npm --prefix game run check` passes (typecheck + `check:phaser4`, 97 files, 0 findings). All three maps validate (0 errors,
  0 warnings) including the arena-placement and traversal checks; Part III's route also holds with every cracking tile broken.
- **Real-play bot, no warp, no killEnemies** (`/tmp/kbe-level/bot.mjs`, adapted from `tools/arena-bot.mjs`: god + HMG refills,
  starts at the part's `player_start`, jumps gaps/walls, drops through roofs, hops cover, crouches under low bridges, presses CONTINUE
  at game over):
  - **Part II:** start → `guncar:done` (3 waves) → IRONHORN defeated → `PartClear` scene, 175 s, no page errors (`/tmp/kbe-level/bot2f.log`).
  - **Part III:** start → across the lake (13 crack tiles cracked/opened/refrozen) → `labgate:done` (3 waves) → MOOSEZILLA defeated
    → `Results`, 107 s, no page errors (`/tmp/kbe-level/bot3c.log`).
  - **Part I:** the bridge arena cleared by play with its members now inside the view (`bridge:done`). The full run was stopped at the
    Lead's request (the bot kept fixating on the unreachable grunt on top of the outpost's structure C); the yard Snowcat was checked
    with `shot.mjs` (gate rumble → smash → WARDEN'S SNOWCAT spawns, HUD bar up).
  - The bot dies in car gaps and thin ice often; that's its crude jumping, not the layout (validator traversal + manual checks).
- Focused probes: low bridge standing on a roof = 1 hit, crouching = 0 hits (it also smashed the roof grenadier); tunnel darkness
  (FX `mode: tunnel`); standing on `crack_m` → water → death; `boss:stomp {power:2}` → two arena tiles open, refreeze 5 s later.
- Screenshots: `/tmp/kbe-level/final/` (`p1_snowcat`, `p2_start`, `p2_low_bridge`, `p2_tunnel`, `p2_guncar_arena`, `p2_ironhorn`,
  `p3_crash_site`, `p3_lake_floes`, `p3_labgate`, `p3_stomp_hole`), map previews `/tmp/kbe-level/<map>/`.

### Known issues
- IRONHORN stands on the end car's deck (y 304), so the locomotive looks carried on a flatcar. On the rails (y 352) its shell/cinder
  markers would land 48 px under the player: `MachineBoss.arc` probes the floor from `this.y - 16`.
- The low-bridge girder and trackside DUCK! sign are level sprites drawn at fixed depths (girder over everything, sign behind the cars).
- Thin-ice tiles are telegraphed (darker, hairline web) but subtle at 1×; the THIN ICE! signs and prompt carry the lesson.
- Part I outpost: the grunt on structure C's roof (hidden-1UP route) can't be reached or shot from the tunnel below (by design; players walk on).

### Requests for other teams (Phase E)
- **Enemies:** let `MachineBoss` find the floor from higher up (e.g. `groundBelow(target, this.y - 96, 160)`) so Levels can stand
  IRONHORN on the rails (y 352) with the player's deck at 304. Moosezilla's stomp `x` drives the ice holes (done, works).
- **UI/Audio:** sfx keys used (silent until added): `train_horn`, `bridge_whoosh`, `ice_crack`, `ice_break`, `train_whistle`
  (Part I clear); music `music_m1p2`, `music_m1p3`.
- **Engine:** `fx:ambience.kind` still types only snow/embers/fireflies (Levels casts for `train`/`tunnel`/`blizzard`); `fx:emit` lacks
  `width`/`duration` (FX reads them; Levels casts). `LEVEL.map.key` is now `m1p1` (GameScene's fallback still works). The engine
  selftest's map regex already accepts `m1p1`.
- **QA:** use `?part=1-2|1-3`; arenas `guncar`, `labgate`; debug fields `train`, `ice`, `level.map`. `cheats.boss()` warps to each part's `cp_boss`.
