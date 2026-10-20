# Your Phase H job: Imagegen, reference art for the enemy facelift
**Ownership:** you own the new folder **`game/art-src/refs/**`**, and nothing else this phase. Don't touch runtime files, packs or other teams' art.
Your earlier pipelines are in `game/art-src/backgrounds/gen/` (`process_g.py` and its siblings). Read them and reuse their palette and alpha code.

**Goal:** give Enemies and Levels references good enough that the rebuilt sprites jump a quality tier. The references are a
**design guide**: silhouette, proportions, details and colour blocking. Enemies redraws and animates the final pixels in Aseprite.

**For each kind,** in this priority order, `hopper`, `airboat`, `buzzard`, `piranha`, `gnat`, `hound`, `lurker`, `skeeter`, `gatorgeddon_legs`
(the design direction is in `docs/PHASE-H.md`):
1. **`concept.png`:** a clean, high-resolution side view **facing right** on real transparency, using the built-in image generation tool.
   - Cartoon-military Metal Slug style, a bold readable silhouette, even light from the top-left, no background or ground shadow.
   - It must be an original design. Don't name or imitate a specific copyrighted character or sprite.
   - Generate a couple of variants if the first doesn't read, and keep the best.
2. **`pixel.png`:** a game-scale pixel reference at the **visible size** listed in PHASE-H (the hopper is about 40×32).
   - Best results usually come from asking the generator for **chunky pixel art with a clear pixel grid**. Edit from the
     concept so the design stays the same. Then reduce it **by its grid** (mode or nearest per cell), not by blurring it down.
   - Then quantize to the master palette (`docs/palette.gpl`) with no dithering and binary alpha.
   - Clean obvious noise (single orphan pixels, muddy clusters) so it reads at 1×.
   - Also write `pixel_4x.png` (nearest neighbour).
3. **Poses:** `poses.png` and `poses_pixel.png`, the key poses PHASE-H lists for that kind, edited from the concept so they stay consistent.
   This matters most for the hopper, airboat, buzzard and hound. Lay the poses out in a row on transparency with gaps between them.
4. **Parts:** `parts.png` and `parts_pixel.png`, an exploded parts sheet for rigging, with gaps between the parts:
   - **hopper:** body, eye turrets, hind leg segments, front legs, throat sac, tongue segment and tip;
   - **airboat:** hull, fan cage, blades, driver, gunner, MG;
   - **buzzard:** fuselage, canopy, rotor hub, tail boom, tail rotor, skids, stub wing and pod, chin turret;
   - **skeeter:** thorax, abdomen tank, head and proboscis, a leg, a wing;
   - **gatorgeddon_legs:** thigh, shin and clawed foot, front and back.
   Skip it for the gnat, piranha and lurker if the poses are enough.
5. **`sheet_<kind>.png`:** the pixel reference beside a **grunt** and **Knotz** at 1× and 4×, so the scale is obvious.
   - Grunt frames: `game/public/assets/sprites/enemies/grunt.png` plus its `.json`.
   - Knotz: `game/public/assets/sprites/player/knotz_full.png` plus its `.json`.
   - Look at it. Does it read at 1×? Is it in the same family as the grunt, the props and SHELLSHOCK (see `/tmp/kbe-lead/polish/bosses1.png`)?
6. **Bookkeeping:**
   - Update **`game/art-src/refs/manifest.json`** right away (`status: "ready"`, `visible`, `files`, `notes`). **Enemies is waiting on it**,
     and the hopper, airboat and buzzard unblock them, so write each kind the moment it's done; don't batch.
   - Keep raw sources as `raw_<kind>_*.png`, every exact prompt in `game/art-src/refs/prompts.json`, and your offline processor as
     `game/art-src/refs/process_refs.py` (rerunnable, asserts palette membership and binary alpha).
   - Add `game/art-src/refs/README.md` explaining the files.

**Time:** aim to have the hopper, airboat and buzzard ready within about 30–40 minutes, and everything within about 90.
Quality matters more than speed for the first three.

**Notes:** write a short **Phase H** section in `docs/teams/imagegen.md`. Your final reply lists every kind, with its files and a one-line verdict on how well it reads.
