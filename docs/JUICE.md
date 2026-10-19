# Phase F: Details and Juice (Stage 1)

**Goal:** Mission 1 looks and feels like a finished Metal Slug-tier stage. The owner asked for three things:
1. The **hero and bosses** look great.
2. **Much richer parallax**, with **things happening in the background** at key moments.
3. The usual late-build **touch-ups and tweaks**.

**Rules for every team:**
- Verify with `npm run check`, `npm run audit` (about 4 s) and targeted `tools/shot.mjs` screenshots plus contact sheets, and look at them.
- **No real-time bot playthroughs.** Keep each verification attempt to about 10 minutes.
- **Readability beats detail.** Enemy bullets, Knotz and telegraphs must stay instantly readable. Background detail stays lower in contrast than the gameplay layer.
- Accessibility: big flashes respect **reduced flash**, and shake respects the **screen-shake** option.
- Hold **60 FPS** on SwiftShader.

## Shared contract (Engine adds the types first)

New events (in `events.ts`):

| Event | Payload | Emitted by → used by |
|---|---|---|
| `arena:start` | `{ id, x0, x1, boss }` | Levels (ArenaController) → background director, FX, Audio |
| `arena:wave` | `{ id, wave, waves }` | Levels → background director, UI |
| `arena:clear` | `{ id }` | Levels → background director, Audio |
| `boss:intro` | `{ name, x, y }` | Levels, when a boss arena's intro starts (gate rumble), before `boss:spawn` → Engine camera cinematic, UI WARNING banner, Audio siren, Enemies intro anim |
| `bg:event` | `{ id, x?, y? }` | Levels' background director, when it plays a background moment → FX, Audio |

`fx:emit` gains an optional `scrollFactor?: number` and `bg?: boolean` field for background effects. These render behind the gameplay layer at that parallax scroll factor.

Engine camera API, also used by its auto boss-intro cinematic:
- `ctx.camera.letterbox(on, ms)`
- `ctx.camera.zoomPunch(amount, ms)`
- `ctx.camera.focus(x, y, ms)` / `release(ms)`

## Background moments (Levels directs; Imagegen/Levels art, FX particles, Audio sound)
Levels runs a **background director**: Tiled `bg_event` triggers (`id`, `once`) plus hooks on the events above. Each moment is short and readable, and it never covers gameplay.

**Part I, "The Camp"**
- Camp searchlights sweep the far sky.
- When the bridge arena locks, distant watchtower lights snap on with a far siren.
- A Regime **zeppelin** with the spiral-eye logo drifts across the far sky over the forest.
- **Crows** burst from the far pines when an explosion goes off nearby.
- A **waterfall with mist** beside the bridge.
- A **transport plane** passes overhead just before paratroopers drop.
- **Artillery and flak flashes** on the outpost horizon.
- **Smoke and an engine roar** rise behind the Snowcat yard gate (foreshadowing).

**Part II, "Timber Express"**
- Ironhorn's **smoke plume** is visible far ahead and grows closer through the coal cars (foreshadowing).
- A Buzzard **circles in the far background** before it attacks.
- An enemy **armored train roars past** on a parallel track during the gun-car arena.
- A **trestle over a gorge**: the background drops away to a deep valley and river.
- An **avalanche** slides down a far mountain after tunnel 2.

**Part III, "Moose Lake"**
- An **aurora** shimmers in the sky.
- **Tesla coils** on the lab towers arc and flash.
- **Lab searchlights** sweep the lake.
- A distant **ice fissure** booms across the far lake.
- When the lab-gate arena clears, **MOOSEZILLA's silhouette** stomps across behind the lab compound and roars (foreshadowing).

## Team assignments
| Team | Phase F work |
|---|---|
| Engine | Event types first; camera API; auto boss-intro cinematic (letterbox, slow push toward the gate, release after the boss lands); light camera lookahead in run direction; keep `audit` working |
| Player | **Hero art pass**: a richer Knotz with idle breathing, blink and bandana flutter, an 8-frame run with arm swing, jump squash and stretch, per-weapon recoil kick, a distinct gun silhouette per weapon (pistol, HMG, laser, rocket, flame), a better death, and a victory pose |
| Enemies | **Boss art pass** on the Snowcat, Ironhorn and especially MOOSEZILLA: more detail and shading, idle loops, an intro animation on `boss:intro`, **damage states** at about 66% and 33% (smoke, sparks, parts breaking off), and death debris. Small polish on regular enemies |
| Levels | Background director plus the moments above; background actors in Aseprite (zeppelin, transport plane, parallel train, crows, MOOSEZILLA silhouette, searchlights, waterfall); integrate Imagegen's richer layers; emit the arena events and `boss:intro`; map dressing touch-ups |
| Imagegen | **Richer parallax**: more layers and detail for all three parts (camp and watchtower silhouettes, waterfall, outpost chimneys, gorge and trestle set, aurora sky, closer lab towers), plus transparent stills Levels can animate |
| FX | **Juice pass**: impact sparks per material, enemy death pops, layered explosions with debris and dust rings, light pools from explosions and muzzles in dark areas, weapon-specific feel; **background effects** (`bg_flak`, `bg_explosion`, `bg_lightning`, `aurora`, `bg_birds`, `bg_smoke_plume`, `bg_avalanche`, `bg_mist`) |
| UI/Audio | Metal Slug-style **WARNING** banner and siren on `boss:intro`; HUD juice (score tick, low-ammo blink, pickup icon pop, multi-kill callouts); **sounds for every background moment**; weapon sound layering; ambient beds per section |
| QA, then Rules | After integration: audit, a visual review gallery, and a Phaser 4 review |
