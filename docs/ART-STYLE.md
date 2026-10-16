# Art Style Guide: Knotz Bizarre Escape

**Look:** Metal Slug-inspired pixel art at 384×216. Chunky, rounded, expressive, cartoon-military. Every
sprite should read in silhouette at 1×. Lots of animation frames on things that matter (player, explosions,
boss); clean hard pixels; no anti-aliased blur, no gradients except hand-dithered ones.

## Global rules
1. **Palette:** use the master palette (`docs/palette.gpl`, and the Lua names in `tools/aseprite/kbe.lua` → `K.PAL`).
   Ramps are named `<ramp><1..5>`, where 1 = darkest. Exceptional extra colors need a note in your report.
2. **Outlines:** characters, enemies, pickups and projectiles get a 1 px outline in `outline` (#1a1220), but **selective**:
   the lit edge (top/front) may use the ramp's darkest color instead of `outline`. Backgrounds and far parallax have **no** outlines.
3. **Light:** comes from **top-left**. Shade bottom-right. 3–4 tones per material (base, shadow, deep shadow, highlight).
4. **Scale and anchors:** 1 art pixel = 1 game pixel. Never scale sprites in-engine except for FX tweens.
   Characters are anchored **bottom-center** (feet), with origin (0.5, 1) in Phaser. Keep the same canvas size across all frames of a sprite.
5. **Readability:** player = olive green + skin + khaki; enemies = **red** ramps + sand; machines = steel;
   "bizarre" tech = weird purple/neon green. **Enemy bullets** = bright `fire5`/`white` core with `red4` rim, 4–6 px, which must pop on
   every background. **Player bullets** = `sand5`/`white` small streaks.
6. **Animation timing:** run cycles 8 frames at 70–80 ms; idle 4–6 frames at 120–160 ms (breathing, gun bob);
   explosions 8–14 frames at 40–60 ms; anticipation frames before attacks.
7. **No text baked into sprites** except signs/diegetic art and the logo. UI text uses the bitmap font.

## Target sizes
| Thing | Visible size | Frame canvas |
|---|---|---|
| Knotz (player) | ~24×36 | 48×48 (split legs/torso recommended, both 48×48 sharing a pivot) |
| Grunt / grenadier / shield | ~22×34 | 48×48 |
| Drone | ~24×16 | 32×24 |
| Turret | ~24×20 | 32×32 |
| POW | ~20×30 | 32×40 |
| MOOSEZILLA | ~160×120, multi-part (body, head, antlers L/R, legs, jaw, core) | parts on their own canvases |
| Tiles | 16×16 | tilesets as single images (one per tileset), 0 spacing |
| Pickup crates | 16×16 (letter crate), points items 12×12 | |
| Explosions | S 32×32, M 48×48, L 80×80, XL 128×128 | |
| Bullets | 4–8 px | |

## Toolchain (verified installed)
- Aseprite 1.3.18.6: `/home/knotz2/.local/bin/aseprite` (batch Lua, no display needed)
- Tiled 1.12.2: `/home/knotz2/.local/bin/tiled-headless` (scripts, export), `/home/knotz2/.local/bin/tmxrasterizer-headless` (map previews), `/home/knotz2/.local/bin/tiled` (GUI)
- Reference: `/home/knotz2/.local/opt/pixel-tools/PIXEL-TOOLS.md`

### KBE art pipeline (use it)
- Write a Lua build script in `art-src/<area>/<name>.lua` that calls `K.build{...}` (see `art-src/_examples/example.lua`
  and the doc comment at the top of `tools/aseprite/kbe.lua`). Draw with **palette-keyed text grids** (one char per pixel),
  with code (`K.rect`, `K.disc`, `K.line`, `K.outline`, `K.px`), or a mix. Helper functions that generate frames
  (for example, a run cycle from limb poses) are encouraged.
- Each build writes an editable **`.aseprite` source** (next to the Lua, in `art-src/`) and a packed sheet `.png` + Aseprite `.json`
  (with `frameTags`) into `public/assets/sprites/<area>/`. Phaser loads it with `this.load.aseprite(key, png, json)` and
  `this.anims.createFromAseprite(key)`, so **tag names become animation keys**; name tags `<sprite>_<anim>` or document the mapping.
- Build: `bash tools/build-art.sh art-src/<area>/<name>.lua` (or no args to build all). Check the output PNG
  by viewing it. Also export a contact sheet/GIF to `/tmp/kbe-<team>/` with
  `aseprite --batch file.aseprite --scale 4 --save-as /tmp/kbe-<team>/preview.gif` and view frames to judge the animation.
- Legacy sprites (`archive/pygame-original/img/`) are reference for identity/proportion only. They're unlicensed, so don't ship them.

### AI image generation (optional, via Lead)
The Lead can commission GPT image generation (with transparent backgrounds) for **painterly parallax backgrounds, the title key art,
and the logo**. Generated images must be downscaled and **palette-quantized** to the master palette before use, and
never used for animated characters (frame consistency). Request it in your report if you want it.

## Palette (hex)
```
outline #1a1220
ink    #2b2635 #48405a #6e6680 #9a93a8 #c9c3d1 #f4f0f6
skin   #5a2e22 #8e4b32 #c47a52 #e8a878 #ffd6b0
olive  #1f2a14 #34461f #4f6b2b #73903c #a2b85a
sand   #4a3a22 #7a6236 #a88c52 #d2b878 #f0e0a8
red    #3a0f14 #6b1a1e #a02a26 #d4483a #f07a5a
steel  #1c2433 #2f3d52 #4c6075 #75899c #a9bccb
dirt   #2a1a12 #4a2e1c #6e4628 #9a6a3c #c49258
leaf   #0f2418 #1a3d24 #2a5e30 #44843c #6eae4c
sky    #12234a #1f3f7a #3a6cb0 #6aa2dc #a8d4f0
fire   #5c1408 #b8320c #f06a10 #ffae22 #ffe066 #fff8d0
weird  #3c1452 #6e2a8c #a64cc4 #39d98a #b6ff6a
white  #ffffff
```
