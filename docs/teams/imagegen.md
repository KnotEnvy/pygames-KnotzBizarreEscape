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
