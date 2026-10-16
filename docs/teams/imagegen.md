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
