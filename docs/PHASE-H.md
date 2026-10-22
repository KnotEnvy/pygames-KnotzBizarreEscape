# Phase H: Enemy facelift and visual polish (Missions 1–2)

**Owner's ask (2026-10-20):** Mission 2 looks incredible. Before Mission 3, do a couple of rounds that bring the newer
enemies up to (or above) the rest of the game's art. Use reference images from Imagegen, then recreate them in our
Aseprite workflow. Named: the **frog (hopper) is rough**, the **helicopter (Buzzard) needs another pass**, the **airboats
could be improved**. Also improve anything else in the visual arena that keeps Missions 1–2 top of the line.

**Lead's survey (`/tmp/kbe-lead/polish/`):**
- The soldiers, props, tiles, backgrounds, MOOSEZILLA, SHELLSHOCK and GATORGEDDON hold the bar.
- The newer small enemies don't:
  - The **hopper**, **airboat**, **piranha** and **gnat** all share one generic 42-frame tag template (`idle/cue/attack/tongue_cue/tongue/fire/death`).
    The frames barely change between tags, and each death is a red slash drawn over the idle.
  - The hopper is a flat face, and its "tongue" is a pink blob. The airboat is a flat green slab with faceless crew.
  - The **Buzzard** (Mission 1 gunship, also flown in 2-1 and 2-2) is a blocky toy:
    - the rotor is a static line;
    - it has no tilt;
    - it cruises up against Hazel's radio strip.
  - The **hound** (1-3) has bar legs and a placeholder death. The **lurker**'s moss is noisy.
- **MEGA-SKEETER** reads as a beetle more than a mosquito: an opaque bar for wings and a fat body.
- **GATORGEDDON**'s legs are thin pistons under a huge body.
- **Title card and radio:** Hazel's radio box opens while the part's title card is still up, so the box covers the title text (UI).

## Rules for this phase
- **Visual first: don't change gameplay.** Keep these unless a change is needed to match the new art:
  - hurtbox sizes (within about ±4 px);
  - attack timings, telegraph durations, damage, HP and scoring;
  - spawn and entry behaviour.
  If the art needs a change, keep it small and say so in your report. `npm --prefix game run audit` must still pass for every part.
- **Reference → Aseprite pipeline** (the owner's request):
  1. Imagegen paints concept references, plus a pixel reference at game scale.
  2. Enemies rebuilds every sprite in Aseprite from those references, as layered, animated, hand-cleaned pixel art in the
     house style (`docs/ART-STYLE.md`):
     - selective 1 px outline;
     - top-left light;
     - 3–4 tones per material;
     - chunky clusters, no noise;
     - master palette only, binary alpha.
  - **Pasting a quantized generated image as the final sprite isn't enough.** The reference is a guide for silhouette, design
    and proportions. The final pixels are cleaned and animated by hand in the Lua or Aseprite pipeline.
- **Animation bar** (ART-STYLE §6, LESSONS §1):
  - idle 4–6 frames, with life in it;
  - locomotion 6–8 frames;
  - a real anticipation pose before every attack;
  - hit reaction readable;
  - **death at least 8 frames**, a mechanical break-up (plates, bolts, sparks, smoke), not an overlay.
  - Each kind gets **its own tag set**, named for what it does. The shared generic template is retired.
- **Readability:**
  - enemies stay higher-contrast than the backgrounds;
  - silhouettes read at 1×;
  - fliers cruise in screen y 62–110 (LESSONS §5), and nothing parks behind Hazel's strip (screen y 31–54).
- **Same checks as always:** `check`, `audit`, `selftest`, time-boxed `shot.mjs`, and contact sheets **beside a grunt and Knotz at 1× and 4×**,
  plus an **in-context shot in the enemy's real map location**. No real-time bot playthroughs.

## Contract (land your side; degrade gracefully if the other side isn't there yet)
### Reference art (Imagegen → Enemies, Levels)
Imagegen writes everything under **`game/art-src/refs/`** (a new folder; Imagegen owns it, everyone else reads it):
- `game/art-src/refs/<kind>/`:
  - `concept.png`: a clean side-view design, facing **right**, transparent background;
  - `pixel.png`: the game-scale pixel reference, master palette, binary alpha;
  - `pixel_4x.png`: a preview of `pixel.png`;
  - optional `poses*.png` and `parts*.png` (an exploded parts sheet for rigging).
- `game/art-src/refs/manifest.json`: `{ "<kind>": { "status": "ready", "visible": [w, h], "files": [...], "notes": "..." } }`.
  Imagegen updates it **as each kind lands**, in priority order:
  `hopper`, `airboat`, `buzzard`, `piranha`, `gnat`, `hound`, `lurker`, `skeeter`, `gatorgeddon_legs`.
- `game/art-src/refs/sheet_<kind>.png`: the pixel reference beside a grunt and Knotz at 1× and 4×.

### New `fx:emit` effect ids (FX implements; Enemies emits; unknown ids are ignored)
| effect | fields | meaning |
|---|---|---|
| `rotor_wash` | `x, y` (ground or water surface under the craft), `width`, `material` (`snow`/`dirt`/`water`/`wood`/`metal`), `count` (0–1 strength from altitude) | Dust, snow or spray ring blown out under a low helicopter. Emitted about every 120 ms while within about 90 px of a surface. |
| `boat_wake` | `x, y` (waterline), `angle` (travel direction in radians), `scale` | Bow spray plus a stern foam trail for a moving boat. Emitted about every 100 ms. |
| `mech_pop` | `x, y, scale` (0.5 gnat … 1.5 airboat or Buzzard), `material` | Small machine death burst: bolts, plates, a spring, glass bits, sparks and a puff of oily smoke. Emitted along with `explosion`. |
| `smoke_trail` | `x, y, scale` | One damaged-machine smoke puff (a damaged Buzzard or airboat emits about every 150 ms). |

FX also adds the Phase G kinds to its `MACHINE` kill-feel test: hopper, airboat, piranha, gnat, buzzard, hound, skeeter, shellshock and gatorgeddon.

### New sound keys (UI/Audio supplies; Enemies plays via `ctx.audio.sfx`; missing keys are silent)
| key | sound |
|---|---|
| `buzzard_gun` | The gunship's chin-gun burst (short, chunky, a little lower than the HMG). |
| `heli_crash` | Gunship death: rotor shriek winding down, metal tearing, a heavy impact. |
| `hopper_land` | A heavy hydraulic frog landing: thud, piston hiss, wet slap. |
| `mech_pop` | Small mech death: crunch, spring *boing*, glass tinkle (comic Metal Slug). |
| `airboat_sink` | Fan winding down, hiss, gurgle. |

## Rounds
- **H1 (build):**
  - Imagegen: references.
  - Enemies A: Buzzard and hound.
  - Enemies B: hopper, airboat, piranha, gnat, and the lurker cleanup.
  - FX: the four effects.
  - UI/Audio: the five sounds and the title card / radio overlap.
- **H2 (review and second pass):**
  - QA: a visual and regression review.
  - Rules: a Phaser 4 review.
  - Enemies B: MEGA-SKEETER silhouette pass.
  - Enemies A: GATORGEDDON leg and claw pass.
  - Levels: far background actors (`bg_airboat`, `bg_buzzard`, `bg_skeeter`) to match the new designs.
  - Then fixes.
- **H3 (fixes)** if review finds anything. Then owner playtest.

## Design direction (Imagegen paints it; Enemies builds it; Levels matches it far away)
Everything is cartoon-military Metal Slug: chunky, rounded, a little comic.
- **Regime colours:** red with sand, plus steel and the spiral-eye insignia.
- **Animal mechs:** keep their animal's colours (frog olive, piranha steel-blue), with Regime red accents.
- **Sizes:** the visible sizes below are the in-game targets, close to today's hurtboxes.

- **hopper, the mech bullfrog** (about 40×32 visible):
  - **Body:** squat and wide. Olive and moss armour plates with rivets, and a small red spiral-eye stencil on the flank.
  - **Head:** two big periscope eye lenses on top that glow amber and iris before attacks, and a wide flat mouth with a steel lip.
  - **Throat:** a pale rubbery throat sac that pulses at idle and balloons before the tongue.
  - **Legs:** Z-folded hydraulic hind legs with visible pistons and webbed steel feet; short splayed front legs.
  - **Exhaust:** a back vent that puffs steam.
  - **Tongue:** a segmented red-pink cable with a steel grabber tip, reaching **64 px** (its hit line).
  - **Poses:** idle, croak, crouch (squash, legs loaded), airborne (stretched), landing squash, tongue cue (sac full, mouth opening),
    tongue at full reach, hurt, death (plates fly off, the eye lenses pop out on springs).
- **airboat, a Regime swamp airboat** (about 88×44 visible):
  - **Hull:** flat-bottomed and riveted, olive drab over steel with rust streaks, a red stripe and a spiral-eye decal; the bow tips up.
  - **Stern:** a big round fan cage with a two-blade propeller, an engine block and an exhaust stack.
  - **Crew:**
    - a raised driver's seat in front of the cage, with a driver in the house soldier style (red uniform, cap, goggles);
    - a bow gunner behind a pintle MG with a small shield plate.
  - **Clutter:** jerrycans, a rope coil, and a whip antenna with a Regime pennant.
  - **Poses:** cruise, gun cue (the gunner leans in and swings), fire, hit, damaged, death (sparks from the cage, the nose dips, the crew is launched).
- **buzzard, the Regime gunship helicopter** (about 88×40 hull, rotor span about 96):
  - **Shape:** a stubby cartoon cross of Hind and Huey.
  - **Nose:** a bulbous tinted canopy with a visible pilot in a red cap, and a chin rotary-gun turret.
  - **Hull:** red and steel paint, a big spiral-eye on the tail boom, exhaust ports behind the mast, and skids.
  - **Wings:** stubs with rocket pods.
  - **Tail:** a long tapered boom with a fin and a tail rotor.
  - **Poses:** cruise, nose-down strafe (about 12°, drawn as art, not runtime rotation), aim (the turret swings down),
    damaged (holes, smoking ports), death (tail snapped, rotor bent).
- **piranha, the mech piranha** (about 30×20):
  - **Body:** steel-blue armoured scales and a red glowing eye.
  - **Jaw:** a bulldog underbite with jagged steel teeth.
  - **Fins:** a dorsal fin with a tiny periscope antenna, and a small ducted propeller for a tail.
  - **Poses:** swim (fin above the water), leap (arched, jaw wide), bite (jaw snapped shut), death (scales pop, the jaw drops off).
- **gnat, the mech mosquito drone** (about 22×18):
  - **Body:** skinny and segmented, with a long needle proboscis, a glowing red fuel-bulb abdomen and hair-thin dangling legs.
  - **Wings:** glassy, drawn as a steel or white rim around pale panes (binary alpha, so no real translucency).
  - **Poses:** hover (wings up and down), dive (proboscis forward), death (wings snap, the bulb pops).
- **hound, the Regime attack hound** (Mission 1, about 36×24): an **armoured dog, not a robot**, so keep its `flesh` material.
  - **Body:** lean, brown-grey, in a red armoured harness.
  - **Head:** a steel helmet with antler prongs (Von Antler's motif), one glowing goggle eye, and snapping jaws.
  - **Poses:** run (contact and extended), crouch (pounce cue), leap, land, death (comic: the helmet flies off and it tumbles out, no gore).
- **lurker:** keep the soldier, but turn the noisy moss into a clean ghillie:
  - a few big hanging clumps and reeds on the helmet and shoulders;
  - a wet mud hem and drips.
- **skeeter (MEGA-SKEETER, H2):** it must read as a **mosquito** at a glance.
  - **Body:**
    - a slim segmented thorax;
    - a long tapering abdomen that holds the glowing fuel tank (the weak point);
    - a long drill-needle proboscis and compound-eye domes.
  - **Legs:** six long jointed legs hanging below.
  - **Wings:** two pairs of big veined wings with steel rims and pale-blue panes.
  - **Accents:** Regime red and steel armour.
- **gatorgeddon_legs (H2):** thick armoured gator legs, matching the body's green and steel:
  - elbow plates and hydraulic rams;
  - big splayed three-claw feet;
  - front and back pairs.
