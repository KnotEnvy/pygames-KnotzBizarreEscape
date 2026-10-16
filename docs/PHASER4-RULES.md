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
| `BitmapMask`, `GeometryMask` via `setMask()` | The `Mask` filter (`filters.internal.addMask(...)`). `BitmapMask` is gone; `GeometryMask`/`setMask`/`createGeometryMask` are still *declared* but work in the Canvas renderer only, so they silently do nothing for us |
| `setTintFill(c)`, `tintFill = true` | `setTint(c).setTintMode(Phaser.TintModes.FILL)`; reset with `clearTint()` (it also resets the mode to MULTIPLY). **`setTintFill()` still exists as a deprecated no-op, so the compiler won't catch it and nothing flashes.** |
| `Phaser.Geom.Point` | `Phaser.Math.Vector2` |
| `Phaser.Structs.Set` (removed), `Phaser.Structs.Map` (legacy class, still declared in 4.2.1) | native `Set` / `Map` |
| `Phaser.Math.PI2` | `Phaser.Math.TAU` (now = 2π; π/2 is `Phaser.Math.PI_OVER_2`. Old v3 `TAU` meant π/2) |
| `Mesh`, `Plane` (`add.mesh`, `add.plane`) | (removed). A new `Mesh2D` exists (`add.mesh2d(x, y, texture, vertices, indices)`); prefer Sprite/Rope. (`RenderTexture` still exists; see "Changed behavior" for `.render()`.) |
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

---

## Verified API cheatsheet (4.2.1)

Every snippet below was **type-checked with `tsc --strict` against the installed `phaser.d.ts`** (scratch file
`/tmp/kbe-rules/tscheck/snippets.ts`), and behavior notes were read from `node_modules/phaser/src` or the package's
bundled skill docs (`node_modules/phaser/skills/*/SKILL.md`, the best offline reference). **Not run in a browser**:
anything about how an effect *looks* or *performs* is marked ⚠ *unverified*. `import Phaser from 'phaser'` is assumed.

### Game-object filters (replace preFX/postFX/masks)
```ts
sprite.enableFilters();                        // REQUIRED on game objects. Cameras have filters already. Returns this.
sprite.filters!.internal                       // FilterList: object-local space, cheap (object-sized texture)
sprite.filters!.external                       // FilterList: screen/context space, full-screen cost
// FilterList: add(ctrl, index?) / remove(ctrl) / clear() / getActive() / list[]; every addX returns its controller.
```
| Method (on a `FilterList`) | Exact signature (4.2.1) | Notes |
|---|---|---|
| `addGlow` | `(color?, outerStrength?, innerStrength?, scale?, knockout?, quality?, distance?)` | `quality` and `distance` are fixed at creation: recreate to change. Mutable: `outerStrength`, `innerStrength`, `scale`, `knockout`, `color` |
| `addBlur` | `(quality?, x?, y?, strength?, color?, steps?)` | quality 0 low / 1 medium / 2 high |
| `addShadow` | `(x?, y?, decay?, power?, color?, samples?, intensity?)` | |
| `addColorMatrix` | `()` | methods live on `.colorMatrix`: `cm.colorMatrix.sepia() / grayscale(1) / brightness(.2) / saturate(-.3) / hue(90) / contrast() / negative() / night(.5)` (**not** `cm.sepia()` as in v3) |
| `addVignette` | `(x?, y?, radius?, strength?, color?, blendMode?)` | x,y centre 0..1; `color` number/string/Color; mutable `x y radius strength color blendMode` |
| `addBarrel` | `(amount?)` | 1 = neutral (per bundled docs) |
| `addPixelate` | `(amount?)` | block size = 2 + amount, blends colours; `addBlocky({size, offset})` keeps colours |
| `addDisplacement` | `(texture?: string, x?, y?)` | tiny values (≈0.005); texture is a key |
| `addMask` | `(mask?: string \| GameObject, invert?, viewCamera?, viewTransform?: 'local'\|'world', scaleFactor?)` | see below |
| `addThreshold` / `addWipe` / `addParallelFilters` / `addBlend` / `addBokeh` / `addTiltShift` / `addQuantize` / `addGradientMap` / `addKey` / `addSampler` … | see `FilterList` in phaser.d.ts | |

Common controller API: `ctrl.active` / `ctrl.setActive(bool)`, `ctrl.setPaddingOverride(l,t,r,b)` (null clears), `ctrl.ignoreDestroy`.
Glow/Blur/Shadow auto-pad the render area; override padding if edges clip.

```ts
// Mask filter (replaces BitmapMask/GeometryMask). Source may be a texture key or a game object.
const m = sprite.filters!.internal.addMask(this.add.circle(0, 0, 20, 0xffffff), /*invert*/ false);
m.autoUpdate = false; m.needsUpdate = true;   // static mask: render once. Default autoUpdate=true re-renders every frame (costly)
m.invert = true; m.setTexture('key'); m.setGameObject(go);
Phaser.Actions.AddMaskShape(items, cfg);       // helper for common shape masks (see Types.Actions.AddMaskShapeConfig)
```

### Camera filters / bloom
```ts
const cam = this.cameras.main;
cam.filters.external.addVignette(0.5, 0.5, 0.7, 0.5);     // screen-space; subtle default
cam.filters.internal.addColorMatrix().colorMatrix.saturate(-0.2);
cam.filters.internal.addBlur(0, 2, 2, 1);                  // internal = camera-local
cam.setForceComposite(true);                               // needed for CaptureFrame (add.captureFrame) / forcing a framebuffer
cam.getPaddingWrapper(/*x*/ 8)                             // ⚠ unverified usage: proxy to render extra world beyond screen edge

// Bloom is an Action (no Bloom filter exists). Adds Threshold + Blur inside a ParallelFilters to the EXTERNAL list by default.
const [b] = Phaser.Actions.AddEffectBloom(cam /* or object(s) */, {
  threshold: 0.6,      // 0-1, lower brightness cut-off
  blurRadius: 2,       // spread
  blurSteps: 4,        // integer
  blurQuality: 1,      // 0 low / 1 med / 2 high
  blendAmount: 0.5,    // 0..1+ strength over original
  blendMode: Phaser.BlendModes.ADD,
  useInternal: false,  // true → internal list instead of external
});                    // returns [{ item, parallelFilters, threshold, blur }] → tweak b.blur.strength etc. later
```
Perf rule of thumb (⚠ unverified numbers): filters create extra draw calls per object. Use camera filters or a few hero objects; never per-bullet.

### Tint modes
```ts
sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);   // hit flash (white silhouette)
sprite.clearTint();                                            // resets colour AND mode to MULTIPLY
// enum Phaser.TintModes: MULTIPLY, FILL, ADD, SCREEN, OVERLAY, HARD_LIGHT, MULTIPLY_TWO   (setTintMode(mode: number | TintModes))
// setTintFill() exists only as a deprecated no-op: never use it.
```

### Lighting
```ts
this.lights.enable().setAmbientColor(0x333355);          // scene LightsPlugin; setAmbientColor(rgb: number)
const l = this.lights.addLight(x, y, radius, 0xffddaa, intensity, z);   // (x?, y?, radius?, rgb?, intensity?, z?) → Light { color, intensity, z }
this.lights.addPointLight(x, y, 0xff8800, 32, 1, 0.1);   // (x,y,color?,radius?,intensity?,attenuation?) → PointLight game object (no normal map needed)
this.lights.removeLight(l); this.lights.disable();
sprite.setLighting(true);                                 // per-object opt-in (many objects: Sprite, Image, Text, TilemapLayer, Particles, Graphics…)
sprite.setSelfShadow(true, penumbra?, diffuseFlatThreshold?);   // optional pseudo self-shadow from texture brightness
```
Lighting changes the shader and breaks batches: opt in only the objects that need it. Normal maps are optional (`texture` data).
⚠ unverified: visual result with our pixel-art scale.

### Particles (v4/3.60+ API)
```ts
// add.particles(x?, y?, texture?, config?) → the ParticleEmitter itself (there is NO manager/createEmitter anymore)
const em = this.add.particles(0, 0, 'spark', {
  speed: { min: 40, max: 120 }, angle: { min: 200, max: 340 }, lifespan: 300,
  scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 300,
  quantity: 1, frequency: -1,           // frequency -1 (or emitting:false) = only emit when told to
  emitting: false, blendMode: 'ADD', tintMode: Phaser.TintModes.ADD, maxAliveParticles: 64,
}).setDepth(70);
em.explode(12, x, y);          // explode(count?, x?, y?)   → one-shot burst at x,y
em.emitParticleAt(x, y, 3);    // emitParticleAt(x?, y?, count?)
em.emitParticle(count, x, y);  // emitParticle(count?, x?, y?)   (note: different arg order from emitParticleAt)
em.startFollow(sprite, offX, offY, trackVisible);  em.stopFollow();   // target: any {x,y}
em.flow(frequencyMs, count, stopAfter?); em.start(); em.stop(kill?); em.killAll();
em.timeScale = s;              // per-emitter time scale (hitstop!)
```
Other config keys (all in `Phaser.Types.GameObjects.Particles.ParticleEmitterConfig`): `speedX/Y, accelerationX/Y, rotate, color[] + colorEase, tint, frame (array = random), anim, emitZone, deathZone, bounds, collide*/bounce, radial, advance, duration, stopAfter, sortProperty/sortOrderAsc, particleBringToTop, reserve, follow, followOffset, trackVisible`. Values accept `number | [a,b,c] | {min,max} | {start,end,ease} | (particle, key, t, value) => number`. For a pooled "explosion puff", create one emitter per effect kind with `emitting:false` and reuse `explode()`; don't `new` an emitter per hit.

### Aseprite
```ts
// preload — json must be Aseprite's "Array"/tag-bearing export with meta.frameTags
this.load.aseprite('knotz', 'assets/sprites/player/knotz.png', 'assets/sprites/player/knotz.json');
// or in a pack file: { "type": "aseprite", "key": "knotz", "textureURL": "…png", "atlasURL": "…json" }
// create
this.anims.createFromAseprite('knotz');                 // (key, tags?: string[], target?) → Animation[]
sprite.play('run');                                     // anim key == the TAG NAME
this.anims.createFromAseprite('knotz', ['run'], sprite);// with `target`: created on that sprite only (sprite-local anims)
```
Gotcha (read from `AnimationManager.createFromAseprite`): without `target`, animations are **global and keyed by bare tag name**, so two characters that both have an `idle` tag will clash/overwrite. Either give tags unique prefixes in Aseprite (`knotz_idle`), or pass `target`. Frame duration comes from the JSON per frame; `direction: reverse` reverses, `pingpong` becomes `yoyo`.

### Pack files (`public/assets/packs/<team>.json`)
```json
{
  "player": {                                  // section name (any); optional per-section "path"/"baseURL"/"prefix"
    "files": [
      { "type": "aseprite", "key": "knotz", "textureURL": "assets/sprites/player/knotz.png", "atlasURL": "assets/sprites/player/knotz.json" },
      { "type": "image", "key": "tiles", "url": "assets/tiles/tiles.png" },
      { "type": "atlas", "key": "ui", "textureURL": "ui.png", "atlasURL": "ui.json" },
      { "type": "bitmapFont", "key": "pixel", "textureURL": "assets/fonts/pixel.png", "fontDataURL": "assets/fonts/pixel.xml" },
      { "type": "tilemapTiledJSON", "key": "stage1", "url": "assets/maps/stage1.tmj" },
      { "type": "audio", "key": "shot", "url": ["assets/audio/sfx/shot.ogg", "assets/audio/sfx/shot.mp3"] }
    ]
  }
}
```
Load with `this.load.pack(key, url)` (`pack(key, url?, dataKey?, xhrSettings?)`; `dataKey` selects one top-level section). `type` is the loader method name (`image, spritesheet, atlas, aseprite, bitmapFont, tilemapTiledJSON, audio, audioSprite, json, …`). Keys must be unique across packs.

### Bitmap fonts
```ts
this.load.bitmapFont('pixel', 'pixel.png', 'pixel.xml');   // (key, textureURL?, fontDataURL?) BMFont XML. ⚠ JSON font data unverified
const t = this.add.bitmapText(x, y, 'pixel', 'SCORE 0', 8, /*align*/ 0);  // (x, y, font, text?, size?, align?)
t.setText('…').setTint(0xffff00).setLetterSpacing(1).setOrigin(0.5);       // tint works correctly in v4
```
Use integer sizes matching the font's native size to keep pixels crisp.

### Tilemap (Tiled JSON), collision, one-way tiles
```ts
this.load.tilemapTiledJSON('stage1', 'assets/maps/stage1.tmj'); this.load.image('tiles', 'assets/tiles/tiles.png');
const map = this.make.tilemap({ key: 'stage1' });                    // add.tilemap(key,…) also exists
const ts = map.addTilesetImage('tiles', 'tiles')!;                   // (tilesetNameInTiled, textureKey, tileW?, tileH?, margin?, spacing?)
const ground = map.createLayer('ground', ts, 0, 0) as Phaser.Tilemaps.TilemapLayer;  // (layerId, tileset, x?, y?, gpu?) → TilemapLayer | TilemapGPULayer
ground.setCollisionByProperty({ collides: true });                   // (props: object, collides?, recalculateFaces?)
this.physics.add.collider(player, ground);
// other: setCollision(indexes), setCollisionBetween(a,b), setCollisionByExclusion([..]), setTileIndexCallback(idx, cb, ctx)
const objs = map.getObjectLayer('spawns')?.objects ?? [];            // Tiled objects; props are array [{name,type,value}] in raw data
map.widthInPixels; map.heightInPixels;
```
**One-way (jump-through) platforms**: Arcade resolves tiles per face. Read from `TileCheckY`: moving **down** collides if `tile.collideUp`, moving **up** only if `tile.collideDown`. So after the normal pass, narrow the tiles that carry `oneway=true` to their top face:
```ts
ground.setCollisionByProperty({ collides: true });                   // do this FIRST (it would overwrite the one-way setting)
ground.forEachTile((t) => { if (t.properties?.oneway) t.setCollision(false, false, true, false, true); }); // (left,right,up,down,recalculateFaces)
```
Side walls of those tiles pass through (faces off), and re-calling `setCollisionByProperty` later resets them. For "drop down through" hold-down logic, use a `processCallback` on the collider that returns false while the player is dropping, or temporarily set `body.checkCollision.down = false` (⚠ unverified in-game; the face logic above was confirmed by reading source only). Slopes do not exist in Arcade. `forEachTile(cb, ctx, tileX, tileY, w, h, filteringOptions)` also exists on the layer.
Layer data must be uncompressed (base64 OK, compression is skipped with a warning); external `.tsx` tilesets are rejected (`set.source`).

### Arcade body API for platformers
```ts
this.physics.add.existing(sprite);  const b = sprite.body as Phaser.Physics.Arcade.Body;
b.setMaxVelocity(160, 400)            // (x, y?)  also setMaxVelocityX/Y, setMaxSpeed
 .setGravityY(0).setDragX(900)        // setDrag(x,y?) / setDragX/Y; setDamping(bool); setAccelerationX/Y; setBounce(x,y?)
 .setCollideWorldBounds(true)         // (value?, bounceX?, bounceY?, onWorldBounds?)
 .setSize(10, 20)                     // (width?, height?, center?)  
 .setOffset(3, 2);                    // (x, y?)  — hitbox relative to the sprite's top-left
b.blocked.down  /* touching a static/world/tile surface (per-step flag; true when standing on tiles) */
b.touching.down /* also true when touching another body */
b.onFloor() /* = blocked.down */   b.onCeiling()   b.onWall()   b.deltaY()   b.velocity.y   b.allowGravity   b.immovable   b.pushable
b.checkCollision.up = false;         // body no longer collides with things ABOVE it (per-face enable: up/down/left/right/none). TileCheckY consults it
b.enable = false; b.moves = false;   // disable body / stop integrating
// World: this.physics.world.setBounds(x,y,w,h, checkL?,checkR?,checkU?,checkD?); .setBoundsCollision(l,r,u,d); .pause()/.resume(); .isPaused; .step(delta); .setFPS(n)
```
Use `blocked.down` (or `onFloor()`) for grounded checks and coyote time; read it **after** the physics step (e.g. in `update()` of the next frame, or `world.on('worldstep')`). No such methods as `isOnFloor`/`onGround`/`setVelocityXY`/`setGravityScale`: the checker flags them.

### Camera
```ts
cam.setBounds(0, 0, w, h)                                   // (x, y, width, height, centerOn?)
   .startFollow(target, roundPixels?, lerpX?, lerpY?, offsetX?, offsetY?)   // e.g. (player, true, 0.15, 0.15)
   .setDeadzone(40, 20)                                     // lowercase z. Pass no args to clear. stopFollow() to detach
   .setFollowOffset(-20, 0).setLerp(0.1, 0.1).setRoundPixels(true).setZoom(1).setBackgroundColor('#0b0810');
cam.shake(duration=100, intensity=0.05 | Vector2, force?, cb?, ctx?);      // intensity is a FRACTION of the viewport
cam.flash(duration=250, r=255, g=255, b=255, force?, cb?, ctx?);
cam.fade(duration=250, r=0, g=0, b=0, force?, cb?, ctx?);                  // fade OUT; fadeIn(...) exists too
cam.pan(x, y, duration, ease?, force?, cb?, ctx?); cam.centerOn(x, y); cam.setScroll(x, y?);
cam.getWorldPoint(x, y, out?)   // Vector2; also pointer.worldX/worldY
cam.worldView                   // Rectangle currently visible (use for culling/offscreen checks)
```
Camera effects have their own clocks (they are *not* slowed by `time.timeScale`). For a one-direction "camera lock" (Metal Slug style) clamp with `cam.setBounds` per segment or move `cam.scrollX` yourself with `setScroll` and disable follow.

### Time scale / hitstop
```ts
// slowdown factor s in (0,1]; 1 = normal
this.physics.world.timeScale = 1 / s;   // ⚠ INVERTED: Arcade World.timeScale is a *frame-time* multiplier: 2 = half speed, 0.5 = double speed
this.anims.globalTimeScale = s;         // AnimationManager: normal sense (0.5 = half speed). Per-sprite: sprite.anims.timeScale
this.tweens.timeScale = s;              // TweenManager: normal sense
this.time.timeScale = s;                // Clock: scales timer events (delayedCall/addEvent); NOT the update() delta you receive
emitter.timeScale = s;                  // per ParticleEmitter
// Full freeze for a few frames (hitstop): pause physics + anims, don't just set scale 0
this.physics.world.pause(); this.anims.pauseAll(); this.time.delayedCall(ms, () => { this.physics.world.resume(); this.anims.resumeAll(); });
```
Careful: `time.timeScale = 0` also freezes the very `delayedCall` that would restore it. Use a real-time source for un-pausing (e.g. count `delta` from `update(time, delta)`, or a native `setTimeout`/`performance.now()` in the TimeService). `docs/ARCHITECTURE.md` says slow-mo "scales `physics.world.timeScale`": remember the inversion. Tweens/animations created before the change follow the new scale immediately. Camera shake/flash/fade and `update()`'s `delta` are unaffected.

### Scale manager
```ts
new Phaser.Game({ type: Phaser.WEBGL, width: 384, height: 216, pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, zoom: Phaser.Scale.MAX_ZOOM /* or 1,2,3.. */ } });
// Phaser.Scale consts: NONE, FIT, ENVELOP, WIDTH_CONTROLS_HEIGHT, HEIGHT_CONTROLS_WIDTH, RESIZE, EXPAND; NO_CENTER, CENTER_BOTH, CENTER_HORIZONTALLY, CENTER_VERTICALLY; NO_ZOOM, ZOOM_2X, ZOOM_4X, MAX_ZOOM
this.scale.width / height / gameSize;  this.scale.setGameSize(w, h); this.scale.resize(w, h); this.scale.setZoom(n);
this.scale.setSnap(w?, h?); this.scale.refresh(); this.scale.toggleFullscreen(); this.scale.startFullscreen() / stopFullscreen();
this.scale.on('resize', (gameSize, baseSize, displaySize, prevW, prevH) => {…});   // args read from Scale RESIZE_EVENT.js
```
With `FIT` the canvas keeps 384×216 internal pixels and the browser stretches it (non-integer scale blurs/shimmers even with `pixelArt`; prefer `zoom: Phaser.Scale.MAX_ZOOM` or a CSS `image-rendering: pixelated` canvas if shimmering shows up: ⚠ unverified in-browser).

### Things I could **not** verify (treat as "check before relying")
- Visual/perf behavior of any filter, lighting, or particle config (nothing was rendered).
- `getPaddingWrapper` usage (it typechecks; behavior unread), JSON-format bitmap font data, and the in-game feel of the drop-through and `checkCollision.up` tricks (static source reading + typecheck only).
- `Phaser.Types.Actions.AddMaskShapeConfig` and `AddEffectShine` option details (see the type definitions at ~`phaser.d.ts:94886` and `:94976`).
- `Phaser.Scale.FIT`/`Phaser.Scale.CENTER_BOTH` are runtime aliases declared as `const` in `Phaser.Scale`; other `Phaser.*` constants not listed here may be declared differently from how they are used at runtime. The checker only verifies the namespace path, not enum members.
