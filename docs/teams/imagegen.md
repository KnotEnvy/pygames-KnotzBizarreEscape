# Generated Mission 1 background art

Original high-resolution artwork generated with the built-in image generation tool. No legacy artwork reused. Sources and exact generation prompts are in `game/art-src/backgrounds/gen/`; rebuild with:

```sh
/home/knotz2/.local/bin/uv run --with pillow,numpy python game/art-src/backgrounds/gen/process.py
```

All final opaque pixels use the 59-color master palette. BOX downsampling, nearest palette color without dithering, binary alpha. Horizontal strips use a 48-pixel premultiplied wrap overlap before quantization. Lighting is from top-left; distant art has no outlines.

Offsets below are canvas top-left screen coordinates at the default camera, with origin (0,0). Draw sky first, then mountains, far pines, mid pines. Outpost replaces mid pines in the later section. These are suggested composition values for Levels to tune to terrain and vertical camera movement.

| File (under game/public/assets/) | Pixels | Scroll factor X | Y offset | Notes |
|---|---:|---:|---:|---|
| backgrounds/stage1/gen_sky.png | 384×216 | 0.015 | 0 | Opaque cold morning clouds; horizontal repeat |
| backgrounds/stage1/gen_mountains.png | 768×140 | 0.08 | 34 | Snowy blue alpine peaks; transparent sky |
| backgrounds/stage1/gen_pines_far.png | 768×110 | 0.18 | 91 | Hazy forest band; transparent canopy |
| backgrounds/stage1/gen_pines_mid.png | 768×150 | 0.34 | 90 | Darker forest and snow accents; extends below viewport |
| backgrounds/stage1/gen_outpost_far.png | 768×140 | 0.23 | 67 | Evening industrial fortress, smoke, spiral-eye banners |
| ui/keyart/title_bg.png | 384×216 | 0 | 0 | Dusk fortress, searchlights, looming mechanical moose; calm center-top for logo. Static, not a tile. |

Preview outputs are rebuilt in `/tmp/kbe-imagegen/`: `parallax_forest_384x216.png`, `parallax_outpost_384x216.png`, enlarged nearest-neighbor versions, individual `tiled_*.png` strips, and `final_contact.png`.

## Requests for other teams

Levels: register the five `gen_*` textures in its asset pack and use them in the stage parallax. UI: register `ui/keyart/title_bg.png` and overlay the title logo. No runtime files or asset packs were edited by Imagegen.

## Validation

Viewed all final assets, all five side-by-side tiled strip previews, and both 384×216 composites. Sky received a 3×3 median cleanup before quantization to remove fine cloud speckles. Rebuild asserts palette membership and binary alpha for every output. No dithering or extra palette colors.

The local uv cache is read-only and network DNS is unavailable in this session. Processing succeeded with a copy of the installed uv cache under `/tmp/kbe-imagegen/uv-cache` and `UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache uv run --offline --with pillow,numpy python ...`.

Repository checks were attempted: `check:phaser4` cannot run because `game/tools/check-phaser4.mjs` is absent; `typecheck` fails on existing missing `src/core/events` and `src/core/projectiles` modules. This delivery changes art and its processing script only. No game integration screenshot is claimed; Levels/UI must register the textures first.

## Part II — TIMBER EXPRESS

Files available for Levels now. Canvas origin is top-left; draw in table order. Apply continuous drift at train speed scaled by the suggested X factor. All four layers repeat horizontally.

| File (under backgrounds/m1p2/) | Pixel size | Scroll factor X | Y offset | Tiles | Notes |
|---|---:|---:|---:|---|---|
| gen_sky.png | 384×216 | 0.015 | 0 | Yes | Opaque muted late-afternoon clouds |
| gen_peaks.png | 768×140 | 0.08 | 30 | Yes | Transparent sky; distant snowy peaks without outlines |
| gen_slopes.png | 768×126 | 0.22 | 80 | Yes | Transparent skyline; valley pines and subdued river glint |
| gen_near_pines.png | 768×142 | 0.42 | 104 | Yes | Transparent canopy; darker trunks, extends below screen |

## Part III — MOOSE LAKE

Files available for Levels. Draw sky, mountains, lake, then the lab near the end of the map. Lab is a distant backdrop, not collision geometry.

| File (under backgrounds/m1p3/) | Pixel size | Scroll factor X | Y offset | Tiles | Notes |
|---|---:|---:|---:|---|---|
| gen_sky.png | 384×216 | 0.015 | 0 | Yes | Opaque stormy dusk clouds |
| gen_mountains.png | 768×132 | 0.08 | 35 | Yes | Transparent sky; hazy snow silhouettes |
| gen_lake_far.png | 768×104 | 0.16 | 112 | Yes | Transparent shoreline skyline; quiet frozen ice expanse |
| gen_lab_far.png | 768×160 | 0.24 | 38 | No | Transparent compound, lit windows, searchlights, antler antennas and spiral-eye banners; place near map end |

### Parts II/III source and rebuild

Eight original sources are retained as `game/art-src/backgrounds/gen/raw_m1p{2,3}_*.png`; exact built-in imagegen prompts are in `prompts_parts.json`. Rebuild only these parts with:

```sh
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python game/art-src/backgrounds/gen/process_parts.py
```

Optional `m1p2` or `m1p3` argument rebuilds one set. BOX resize, restrained contrast around slate atmospheric colors, 48 px premultiplied overlap on repeating layers, nearest master-palette color without dithering, alpha threshold 128. Every rebuild asserts palette membership and binary alpha; every non-sky output must contain transparency. Top-left illumination and no outlines on distant layers.

Previews: `/tmp/kbe-imagegen/m1p2_composite_384x216.png`, `m1p3_composite_384x216.png`, corresponding `_3x.png`, alternate `_phase384_384x216.png` / `_phase384_3x.png`, `m1p{2,3}_readability_3x.png`, and `m1p{2,3}_tiled_*.png`. Readability previews overlay simplified red-uniform palette silhouettes and 6 px yellow/white bullets, not runtime sprites. Blizzard particles remain a runtime FX responsibility so baked white flakes do not compete with bullets.

Validation completed: viewed native composites, nearest-neighbor enlarged readability previews, both scroll phases, all landscape strips together, and repeated terrain joins. All eight outputs pass palette and binary-alpha assertions. Red-uniform swatches and bright yellow/white bullet cores remain distinct. Sources use actual alpha, not a keyed checkerboard. No git operations or runtime files changed.

Known limits: these are art-only composites, not in-engine captures. Searchlights and small spiral-eye markings are deliberately subdued at native scale; runtime searchlight/blizzard FX can reinforce them. Scroll factors and offsets are suggested and need Levels' final terrain/camera alignment. The lab does not repeat; never use it as a tileSprite.


<!-- phase-f-assets:start -->
## Phase F — richer parallax and actors

Files below are available now. Paths are relative to `game/public/assets/backgrounds/`. Coordinates use top-left origin, Y is screen-space canvas top. Actors are stills for Levels to move; none has collision. All except the aurora sky have real transparent pixels. Suggested factors and offsets need terrain alignment.

| File | Size | Scroll X | Y offset | Tiles | Notes |
|---|---:|---:|---:|---|---|
| stage1/gen_camp_far.png | 768×132 | 0.13 | 65 | Yes | Watchtowers, tiny lit windows; behind forest. FX may overlay searchlights. |
| stage1/gen_waterfall_cliff.png | 176×190 | 0.29 | 26 | No | Bridge-side cliff; anchor base to river. Overlay bg_mist at foot. |
| stage1/gen_outpost_chimneys.png | 384×150 | 0.25 | 45 | No | Outpost horizon; overlay smoke at stack mouths. |
| stage1/gen_pines_rich.png | 768×156 | 0.34 | 82 | Yes | Richer mid forest; use instead of old mid pines. |
| m1p2/gen_gorge_walls.png | 768×158 | 0.1 | 56 | Yes | Trestle section far canyon; behind valley river. |
| m1p2/gen_valley_river.png | 768×114 | 0.18 | 114 | Yes | Deep valley below trestle; keep terrain foreground absent here. |
| m1p2/gen_near_pines_rich.png | 768×150 | 0.42 | 100 | Yes | Pines and snowbanks; fade out over open gorge. |
| m1p3/gen_sky_aurora.png | 384×216 | 0.015 | 0 | Yes | Opaque sky variant; muted aurora, FX shimmer optional. |
| m1p3/gen_lab_towers.png | 512×178 | 0.28 | 30 | No | Closer coils and antler antennas; animate arcs separately. |
| m1p3/gen_ice_ridges.png | 768×74 | 0.3 | 153 | Yes | Quiet shore ice, behind gameplay snow. |
| stage1/gen_actor_zeppelin.png | 256×92 | 0.09 | 18 | No | Animate horizontal drift; spiral-eye insignia on hull. |
| stage1/gen_actor_transport.png | 208×72 | 0.12 | 22 | No | Twin-prop transport; animate flypast before paratroopers. |
| m1p2/gen_actor_armored_train.png | 640×98 | 0.3 | 95 | No | Locomotive plus three cars; move as one actor on parallel line. |
| m1p3/gen_actor_moosezilla.png | 224×148 | 0.2 | 42 | No | 148 px canvas; move behind compound for foreshadowing. |

Rebuild: `UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python game/art-src/backgrounds/gen/process_f.py`. Optional asset IDs select a subset. Retained `raw_f_*.png` sources and `prompts_f.json` record built-in generation. Processing uses BOX (plus 3×3 median cleanup on the aurora sky), restrained atmospheric contrast, 48 px premultiplied wrap, nearest master palette without dithering, alpha threshold 128. Rebuild asserts palette, binary alpha, transparency, and matching wrap-edge columns.

Previews: `/tmp/kbe-imagegen/f-stage1.png`, `f-m1p2.png`, `f-m1p3.png`, their `-3x.png` versions, `f-actors.png`, and `f-tiles.png`. Composites are art-only integration suggestions; runtime FX and actors remain Levels work.
<!-- phase-f-assets:end -->


### Phase F validation and handoff

All 14 new assets rebuilt successfully and pass exact palette membership and binary-alpha assertions. Thirteen contain transparency; only `m1p3/gen_sky_aurora.png` is opaque. All seven repeating assets pass identical left/right edge-column assertions. MOOSEZILLA has a 148 px canvas with approximately 134 px visible height. No existing generated layer was replaced.

Viewed the final three part composites, red-enemy / yellow-white bullet readability swatches, repeated strips, isolated feature sheet (`/tmp/kbe-imagegen/f-features.png`), and all four actors together. The first aurora source was rejected for excessive texture after reduction; its retained `_v1` source is unused. The selected source has broad, cleaner aurora curtains. Exact prompts are retained in `prompts_f.json`; built-in image generation was used throughout.

`npm run check` and `npm run audit` passed (all three parts). The audit and screenshot initially hit sandbox localhost restrictions and passed after running with local-server access. Viewed `/tmp/kbe-imagegen/f-runtime-stage1.png`; console clean. That screenshot verifies the current build only, not integration of these additional textures. No runtime registration, actor motion, FX, git index, branch, or commit changes were made by Imagegen.

## Phase G — BAYOU BLACKOUT

Delivered 18 painterly layers across m2p1/m2p2/m2p3, including river drift strips, the BAYOU QUEEN far view, Drowned Mill, den, storm front and lightning sky. Built-in imagegen was used for every source. No small actors were painted. Sources `raw_g_*.png`, exact generation/edit prompts `prompts_g.json`, offline processor `process_g.py`, and machine-readable `manifest_g.json` live in `game/art-src/backgrounds/gen/`. The original dusk sky is retained as `raw_g_m2p1_sky_v1.png`; its selected revision makes the low moon survive quantization.

Paths below are relative to `game/public/assets/backgrounds/`. X/Y origin is top-left. Y is suggested screen-space top at the default camera. Draw by depth; all depths are below TILES_BACK=20. Scroll Y should follow the existing background convention; listed factors are X. These are integration suggestions, not collision geometry.

| File | Size | Scroll X | Y | Depth band/value | Tiles horizontally |
|---|---:|---:|---:|---|---|
| m2p1/gen_sky.png | 384×216 | 0.015 | 0 | BG_FAR 0 | Yes |
| m2p1/gen_cypress_far.png | 768×124 | 0.1 | 65 | BG_FAR 2 | Yes |
| m2p1/gen_village_far.png | 768×104 | 0.17 | 91 | BG_FAR 4 | No (once) |
| m2p1/gen_bog_pump.png | 768×100 | 0.2 | 115 | BG_FAR 5 | Yes |
| m2p1/gen_cypress_mid.png | 768×150 | 0.28 | 77 | BG_FAR 7 | Yes |
| m2p1/gen_roots_near.png | 768×74 | 0.42 | 153 | BG_NEAR 12 | Yes |
| m2p2/gen_sky.png | 384×216 | 0.015 | 0 | BG_FAR 0 | Yes |
| m2p2/gen_sky_storm.png | 384×216 | 0.015 | 0 | BG_FAR 0 | Yes |
| m2p2/gen_riverbank_far.png | 768×116 | 0.1 | 73 | BG_FAR 2 | Yes |
| m2p2/gen_bayou_queen_far.png | 320×90 | 0.16 | 91 | BG_FAR 4 | No (once) |
| m2p2/gen_riverbank_mid.png | 768×106 | 0.23 | 110 | BG_FAR 7 | Yes |
| m2p2/gen_river_surface.png | 768×64 | 0.36 | 153 | BG_NEAR 11 | Yes |
| m2p3/gen_sky.png | 384×216 | 0.015 | 0 | BG_FAR 0 | Yes |
| m2p3/gen_sky_lightning.png | 384×216 | 0.015 | 0 | BG_FAR 0 | Yes |
| m2p3/gen_forest_far.png | 768×126 | 0.1 | 63 | BG_FAR 2 | Yes |
| m2p3/gen_mill_far.png | 768×148 | 0.2 | 62 | BG_FAR 6 | No (once) |
| m2p3/gen_den_backdrop.png | 768×132 | 0.24 | 83 | BG_FAR 8 | No (once) |
| m2p3/gen_roots_near.png | 768×78 | 0.4 | 151 | BG_NEAR 12 | Yes |

The Mission 2 pack is `game/public/assets/packs/imagegen.m2.json`, with keys `bg_<map>_<name>` (e.g. `bg_m2p1_sky`, `bg_m2p3_den_backdrop`; omit the filename's `gen_`). It contains all 18 textures. Engine's current `MISSION_PACK_TEAMS` does not yet include `imagegen`; request below.

### Rebuild and visual inspection

```sh
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python game/art-src/backgrounds/gen/process_g.py
```

BOX downsampling, restrained atmospheric contrast, nearest master-palette quantization with no dithering, and alpha threshold 128. Repeats use a 48 px premultiplied overlap before quantization plus identical boundary columns. All non-sky sources retain real generated transparency; no color-keying or checkerboard removal. No palette additions.

Opened and inspected every final layer in `/tmp/kbe-imagegen/g-m2p1-layers.png`, `g-m2p2-layers.png`, `g-m2p3-layers.png`; every repeating layer in the corresponding `g-m2p1-repeats.png`, `g-m2p2-repeats.png`, `g-m2p3-repeats.png` (three horizontal copies). No hard wrap seam observed.

Inspected native 384×216 composites, including both horizontal phases and every local set-piece/weather variant, in:

- `/tmp/kbe-imagegen/g-m2p1-native-gallery.png` (forest, village, bog)
- `/tmp/kbe-imagegen/g-m2p2-native-gallery.png` (moon, storm, boat)
- `/tmp/kbe-imagegen/g-m2p3-native-gallery.png` (forest, mill, den, lightning)

Opened enlarged composites:

- `/tmp/kbe-imagegen/g-m2p1-forest-p0-3x.png`
- `/tmp/kbe-imagegen/g-m2p2-boat-p0-3x.png`
- `/tmp/kbe-imagegen/g-m2p3-mill-p0-3x.png`
- `/tmp/kbe-imagegen/g-m2p3-den-p0-3x.png`
- `/tmp/kbe-imagegen/g-m2p3-lightning-p0-3x.png`

Also inspected `g-m2p1-forest-p0-readability.png`, `g-m2p2-boat-p0-readability.png`, `g-m2p3-den-p0-readability.png` under the same scratch directory: simple red enemy/khaki head and 4–6 px bright bullet swatches stay distinct. These are art-only compositions and swatches, not in-engine captures.

### Integration/tuning

Use village and bog as local alternatives to the dense mid cypress band, so the architecture remains visible. Roots remain the lowest visual band behind gameplay. Riverbanks and water can drift continuously at the listed factors. The BAYOU QUEEN is a large once-only set piece, not a small animated actor. The mill is a 768 px panorama: its wheel is on the left and crane on the right, so reveal it through scrolling rather than trying to show the entire building in one 384 px view. Den and mill are separate local backdrops. Sky variants share output dimensions and scroll factor; use identical tile position when crossfading. Lightning was generated as an illumination edit of the storm source; clouds remain closely aligned. Reduced-flash gating belongs to Levels/FX. Rain streaks in the storm source are deliberately subtle and largely disappear at palette/native scale; FX supplies readable animated rain.

### Validation and limits

All 18 outputs passed exact master-palette membership and binary-alpha assertions; all 13 non-skies contain transparent pixels, and all 14 repeating layers pass identical left/right RGBA-column assertions. `npm --prefix game run check` passed again at handoff (109 Phaser files, zero errors/warnings). All 18 pack URLs exist and keys are unique across currently deployed packs; final PNG payload totals 289,888 bytes. `node game/tools/arena-audit.mjs --part 2-1` currently exits 2: unknown part; its local PARTS table still only contains Mission 1. No runtime integration or Mission 2 arena acceptance is claimed. No git state changes, gameplay files, dev servers or browser processes were made/started by this team.

### Requests for other teams

- Engine: add `imagegen` to `MISSION_PACK_TEAMS` so `packs/imagegen.m2.json` loads on demand.
- Levels: integrate the pack keys using the table; tune Y against terrain/camera, reveal once-only village/boat/mill/den locally, and crossfade sky variants with reduced-flash settings. Animate wheel, glow, rain and small background actors separately.
- Engine/QA: extend arena audit to Mission 2, then run acceptance after map and art integration. Runtime inspection URLs after integration: `/?scene=Game&part=2-1&fast=1&god=1&mute=1`, likewise `part=2-2` and `part=2-3`.

