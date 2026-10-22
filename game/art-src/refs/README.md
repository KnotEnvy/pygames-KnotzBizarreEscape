# Phase H enemy design references

All nine kinds are available in `manifest.json`. Hopper, airboat and Buzzard were published individually first, in that order. Paths in the manifest are relative to this directory. These are design guides for the Enemies/Levels Aseprite redraw, not runtime sprites or finished animation frames.

Each kind has `concept.png`, `pixel.png`, `pixel_4x.png`, `poses.png`, and `poses_pixel.png`. Hopper, airboat, Buzzard, hound, skeeter and Gatorgeddon legs also have `parts.png` and `parts_pixel.png`. Hound parts show natural anatomy plus removable armour; piranha, gnat and lurker use the pose-only option. `sheet_<kind>.png` shows the reference beside actual first-frame grunt and Knotz atlas crops, at 1x and 4x. The player first frame is its current raised-arm idle pose.

Every source image was made with the built-in image generation tool. Unmodified originals are retained as `raw_<kind>_<role>.png`; all exact prompts are in `prompts.json`. Concepts establish proportions, silhouette and material grouping. Pixel sources are edits of those concepts. Poses and exploded parts are also edits of the same concept. Sources have real generated alpha; the dark appearance in some image viewers is invisible RGB behind zero alpha, not an opaque backdrop.

## Sizes and verdicts

| Kind | Pixel envelope | Read at 1x |
|---|---|---|
| hopper | 40x32 | Frog eyes, folded thigh and cream sac are distinct; final redraw should simplify flank rivets. |
| airboat | 88x44 | Round stern cage, raised driver and bow gunner separate clearly. |
| buzzard | 96x40 | Tail/canopy/skids/pod silhouette is clear; 96 includes rotor envelope, hull target remains about 88x40. |
| piranha | 30x20 | Jaw and propeller tail read; keep teeth as large clusters in final art. |
| gnat | 22x18 | Pale wings, red fuel bulb and needle read; legs need deliberate one-pixel strokes in animation. |
| hound | 36x24 | Natural haunches and paws read as a living dog; antler detail is secondary. |
| lurker | 22x34 | Olive clumps separate from red sleeves and sand trousers; use original soldier anatomy in final redraw. |
| skeeter | 144x104 | Strong mosquito silhouette with needle, long abdomen and hanging legs. Provisional full wing/leg envelope. |
| gatorgeddon_legs | 88x64 | Thick front/hind pair, heavy knees and broad claws read. Provisional pair envelope, not a hurtbox change. |

PHASE-H gives no numeric envelope for the last two; these are reference canvases. Match the existing boss body, pivots and gameplay bounds when rebuilding, rather than scaling collision from these files.

## Rebuild

From repo root:

```sh
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python3 -I game/art-src/refs/process_refs.py
```

Pass one or more kind names to rebuild just those entries. The processor crops to alpha>=128, quantizes without dithering to `docs/palette.gpl`, samples the modal palette RGBA in each target grid cell (no blur), removes disconnected single-pixel specks, and writes binary alpha. It asserts exact palette membership and binary alpha for every pixel reference, pose reference and parts reference. `pixel_4x.png` is nearest neighbour. The same palette/alpha code pattern comes from `backgrounds/gen/process_g.py`.

Pose/part pixel sheets preserve their source aspect ratio, with their total visible height equal to the kind's pixel envelope height; they are visual pose guides, not normalized sprite frames. Sources may contain perspective depth and slight pose overlap. In particular, isolate the hopper's extended cable from its adjacent cue pose, redraw the full 64px tongue, and preserve full frame margins when constructing animation. Buzzard's first parts attempt used two rows and was rejected; `raw_buzzard_parts_v1.png` retains it, while the selected revision puts the nine components in one row. Its exact revision prompt is recorded separately.

## Pose order

- Hopper: idle, croak, crouch, airborne, landing squash, tongue cue, tongue full reach, hurt, spring-eye mechanical death.
- Airboat: cruise, gun cue, fire, hit, damaged, nose-dipping breakup with launched crew.
- Buzzard: cruise, approximately 12-degree nose-down strafe, downward turret aim, damaged, snapped-tail/bent-rotor death.
- Piranha: swim, leap, bite, loose-scales/dropped-jaw death.
- Gnat: wings up, wings down, dive, broken-wings/fuel-bulb death.
- Hound: run contact, run extension, crouch, leap, land, helmet-off comic tumble (no gore).
- Lurker: idle, walk, rise, fire (cleanup guide; retain existing soldier's other poses).
- Skeeter: hover, drill dive, tank cue, mechanical breakup (silhouette guide; existing boss attack timing remains).
- Gatorgeddon legs: plant, walk, crouch, stomp (front/hind pair).

## Handoff

Enemies: redraw and clean these references in the house Aseprite workflow, preserving gameplay timing/hurtboxes and adding real animation. Keep materials to 3-4 selected tones in final sprites; reference quantization uses the whole master palette. Levels: match the fan cage, gunship silhouette and narrow mosquito abdomen in far actors. No runtime files, packs, final enemy sprites or git state were changed by this delivery.
