# Phaser 4 Rules (read before writing Phaser code)

We use **Phaser 4.2.1** (`import Phaser from 'phaser'`, types bundled). The installed source is the final
authority: `game/node_modules/phaser/types/phaser.d.ts`, `game/node_modules/phaser/src/**`, and the migration guide
<https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md>. **If you're unsure an API exists,
grep `phaser.d.ts` before using it.** Most tutorials and model memory are Phaser 3, and they're wrong in the ways listed below.

## Banned (Phaser 3 only, removed or changed in 4) → use instead
| ❌ Don't | ✅ Do |
|---|---|
| `obj.preFX`, `obj.postFX`, `camera.postFX`, `addBloom()` via FX | **Filters**: `obj.enableFilters()` (game objects) then `obj.filters.internal.addGlow(...)` / `filters.external.add...`; cameras have `camera.filters.internal/external`. Bloom: `Phaser.Actions.AddEffectBloom(...)` |
| `setPipeline()`, `resetPipeline()`, custom `WebGLPipeline` / `PostFXPipeline` classes | RenderNodes / Filters. For custom shaders, see the Phaser 4 `Shader` / `ShaderQuadConfig` and Filter docs |
| `BitmapMask`, `GeometryMask` via `setMask()` | The `Mask` filter (`filters.internal.addMask(...)`) |
| `setTintFill(c)`, `tintFill = true` | `setTint(c).setTintMode(Phaser.TintModes.FILL)`; reset with `clearTint()` / `setTintMode(Phaser.TintModes.MULTIPLY)` |
| `Phaser.Geom.Point` | `Phaser.Math.Vector2` |
| `Phaser.Structs.Set` / `Phaser.Structs.Map` | native `Set` / `Map` |
| `Phaser.Math.PI2` | `Phaser.Math.TAU` (now = 2π) |
| `Mesh`, `Plane`, `this.make.renderTexture` patterns from P3 | (removed) |
| `this.textures.generate()`, `Create.GenerateTexture` | Draw with `Graphics` + `generateTexture()`, or ship a PNG |
| Direct `gl.*` state changes | `Extern` game object if you truly need raw GL |
| Assuming `roundPixels` defaults to true | `pixelArt: true` in the game config sets it, which we do. Per object: `vertexRoundMode` |
| Canvas renderer (`type: Phaser.CANVAS`) | WebGL only (`Phaser.WEBGL`). Canvas is deprecated |

## Changed behavior to watch
- **DynamicTexture / RenderTexture** buffer their draw commands: call `.render()` after drawing, or nothing appears.
- **Texture coordinates are Y-up** in shaders (Y=0 at the bottom). Only matters for custom shaders.
- **Camera matrix**: `camera.matrix` now includes scroll. Don't hand-roll world↔screen math; use
  `camera.getWorldPoint(x, y)` and the pointer's `worldX`/`worldY`.
- **Tint modes**: `Phaser.TintModes.MULTIPLY | FILL | ADD | SCREEN | OVERLAY | HARD_LIGHT`. Hit-flash = FILL white for ~50 ms.
- **Lighting**: `obj.setLighting(true)` per object and `this.lights.enable()`; lights have a `z`. Normal maps are optional.
  Use lighting sparingly and profile it.
- **Filters can be costly**: a filter on every bullet is a no-go. Prefer camera-level filters, or a few hero objects.
  Filters near screen edges may need padding (`filters.internal` padding options).
- **`TilemapGPULayer`** (fast, single tileset, orthogonal only) vs the normal `TilemapLayer` (flexible). Collision works on
  the normal layer. Use GPU layers only for big non-colliding decoration layers if profiling says so.
- **`SpriteGPULayer`**: thousands of mostly static/simple-animated sprites in 1 draw call (background crowds, foliage).
  Updating its members often is expensive.
- **Arcade physics has no slopes.** Tile collision is face-based. One-way platforms: set collision only on the tile's
  top face (`tile.setCollision(false, false, true, false)`) or use a process callback that ignores collision when moving up.
- **Tiled**: embedded tilesets only (external `.tsx` references aren't supported by the parser). Uncompressed layer data.
- **Aseprite**: `this.load.aseprite(key, png, json)` → `this.anims.createFromAseprite(key)` (tag names = anim keys).
  Optionally pass `tags` and a target sprite to scope the animations.
- **Audio**: Web Audio; it unlocks on the first user gesture. Don't assume sounds play before input. Audio sprites are supported.
- **Gamepad**: enable with `input: { gamepad: true }` in the config; `this.input.gamepad.pad1` etc.

## Patterns we use
```ts
// Config essentials (see src/main.ts)
{ type: Phaser.WEBGL, width: 384, height: 216, pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false } },
  input: { gamepad: true } }

// Hit flash
sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
scene.time.delayedCall(50, () => sprite.clearTint());

// Glow on a hero object (filters must be enabled on game objects first)
sprite.enableFilters();
sprite.filters!.internal.addGlow(0xffae22, 4, 0, 1);

// Camera post (subtle)
this.cameras.main.filters.external.addVignette?.(/* verify signature in phaser.d.ts first */);
```
Anything marked "verify" must be checked in `phaser.d.ts` before use. When a doc example and the installed
types disagree, **the installed types win**.

## Self-check
`npm run check:phaser4` scans `src/` for banned patterns. `npm run typecheck` must pass for your files.
