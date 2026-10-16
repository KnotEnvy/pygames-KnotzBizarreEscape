# Rules team: Phaser 4 checker and review checklist

Owner: Phaser 4 rules checker. Files: `game/tools/check-phaser4.mjs`, additions to `docs/PHASER4-RULES.md`, this file.

## Run it
```bash
cd game
npm run check:phaser4                       # scans game/src/**/*.ts, exit 1 on errors, 0 otherwise (<100 ms)
npm run check:phaser4 -- --json             # machine-readable
npm run check:phaser4 -- --strict           # warnings also fail
npm run check:phaser4 -- --root /some/dir   # scan another directory (used for the self-test fixtures)
npm run check:phaser4 -- --list-rules
```
Output line: `file:line:col  error|warn  rule  message  → suggested fix`.
Suppress a single finding with a trailing comment **with a reason**: `foo.bar(); // phaser4-ok: raw GL needed for X, wrapped in Extern`.
A bare `// phaser4-ok` is itself an error (`suppress-no-reason`).
The checker blanks comments, strings, template text and regex literals before matching, so mentions in docs/comments don't trigger it.
`npm run typecheck` (tsc) remains the main guard for real API typos; this tool catches what TypeScript cannot
(deprecated-but-still-declared no-ops like `setTintFill`, Canvas-only APIs like `setMask`, and Phaser 3 idioms).

## Rules
| Rule | Sev | Catches | Fix |
|---|---|---|---|
| `fx-prefx-postfx` | error | `.preFX`, `.postFX` | `enableFilters()` + `filters.internal/external.add*` |
| `fx-removed-add` | error | `.addBloom/.addShine/.addGradient/.addReveal(` | `Phaser.Actions.AddEffectBloom/AddEffectShine`, `Gradient` object |
| `pipeline-api` | error | `setPipeline`, `resetPipeline`, `setPostPipeline`, … | Filters / `setLighting(true)` |
| `pipeline-class` | error | `PostFXPipeline`, `WebGLPipeline`, `renderer.pipelines`, … | RenderNodes / Filters |
| `mask-removed` | error | `BitmapMask`, `GeometryMask`, `setMask`, `clearMask`, `createBitmapMask/GeometryMask` | `filters.internal.addMask()` |
| `tint-fill` | error | `setTintFill()` (v4 stub: `console.error`s, sets nothing), `.tintFill` | `setTint(c).setTintMode(Phaser.TintModes.FILL)` |
| `geom-point` | error | `Phaser.Geom.Point*` | `Phaser.Math.Vector2` |
| `structs-set` / `structs-map` | error / warn | `Phaser.Structs.Set` (removed) / `.Map` (legacy) | native `Set` / `Map` |
| `math-pi2` | error | `Phaser.Math.PI2` | `Phaser.Math.TAU` |
| `math-tau-half` | warn | `TAU / 2`, `TAU * 0.5` | `Phaser.Math.PI_OVER_2` |
| `mesh-plane`, `mesh-plane-factory` | error | `GameObjects.Mesh/Plane`, `add.mesh/add.plane` | Sprite/TileSprite, or `add.mesh2d` |
| `create-removed`, `textures-generate` | error | `Phaser.Create`, `textures.generate()` | `Graphics#generateTexture` or PNG |
| `canvas-renderer` | error | `Phaser.CANVAS` | `Phaser.WEBGL` |
| `create-emitter` | error | `.createEmitter(` | `this.add.particles(x, y, tex, cfg)` |
| `tilemap-v3-layers` | error | `createStaticLayer/createDynamicLayer` | `map.createLayer()` |
| `spine-plugin` | error | `add.spine`, `load.spine` | n/a (plugin removed) |
| `raw-gl` | error | `renderer.gl`, `gl.bind*()` etc. | `Extern` game object |
| `hallucinated-method` | error | curated names that don't exist: `setDeadZone`, `setFollow`, `shakeCamera`, `isOnFloor`, `onGround`, `setVelocityXY`, `setGravityScale`, `loadAseprite`, `createFromAsepriteTags`, `tilemapJSON`, … | cheatsheet in `PHASER4-RULES.md` |
| `phantom-api` | error | any `Phaser.A.B.C` chain whose namespace path is not declared in `phaser.d.ts` (reports "did you mean …?") | grep the d.ts |
| `camera-matrix` | warn | `camera.matrix` | `camera.getWorldPoint()` |
| `shader-ctor` | warn | `add.shader(` | check `ShaderQuadConfig` |
| `rendertexture-render` | warn | RenderTexture/DynamicTexture in a file with no `.render()` | call `.render()` after drawing |
| `filters-need-enable` | warn | `x.filters.internal/external` on a non-camera in a file with no `enableFilters()` | `obj.enableFilters()` first |
| `anims-exists-zero-frame` | warn | `anims.exists(k)` on a line with no `.frames` / `.remove(`: true for the zero-frame animations `createFromAseprite` leaves behind, and `play()` on those throws | `anims.get(k)?.frames.length` |
| `world-timescale-inverted` | warn | `world.timeScale = x` where `x` is not `1` / `1 / …` | `1 / slowdown` |
| `scene-events-no-off` | warn | `scene.events.on(…)` in a file with no `.events.off(` and no `SHUTDOWN` handler (scene emitters survive restart) | remove in a `SHUTDOWN` handler |
| `update-new-phaser-object` | warn | `new Phaser.Geom/Math.Vector*/Display.Color/Structs…` inside `update*/tick*/preUpdate/postUpdate/step*/on*Update` bodies or `ctx.onUpdate(() => {…})` | scratch instance, `.setTo()` |
| `update-creates-gameobject` | warn | `.add.sprite/image/text/graphics/…` in those bodies | create once / pool |
| `update-adds-collider` | warn | `.add.collider/overlap` in those bodies | create once, keep the `Collider` |
| `update-adds-filter` | warn | `filters.*.add*`, `Actions.AddEffect*`, `new Filters.Controller` in those bodies | add once, toggle `.active` |
| `suppress-no-reason` | error | `// phaser4-ok` without a reason | add one |

Limits: `phantom-api` checks the namespace path only, not members of classes/enums (e.g. `Phaser.TintModes.FOO`) and not instance methods
(use `tsc` for those). The `update-*` rules are lexical: they only see code written directly inside the update-like body (not helper methods it calls) and will not catch allocation of plain arrays/closures/strings. `hallucinated-method` is name-based (no type info), so it can only list names that exist *nowhere* in 4.2.1.
If a legitimate use is flagged, suppress it with a reason and tell the Rules team so the rule can be tightened.

## Reviewer checklist (PRs and phase reviews)
- [ ] `npm run check:phaser4` and `npm run typecheck` both pass; every `phaser4-ok` has a believable reason.
- [ ] Any Phaser API that is new to the codebase was looked up in `phaser.d.ts` or the cheatsheet, not remembered from v3 tutorials.
- [ ] Hit flash uses `setTint(...).setTintMode(FILL)` and `clearTint()`; nothing calls `setTintFill`.
- [ ] Filters: `enableFilters()` before `.filters`; no per-bullet/per-particle filters; screen effects live on the camera; static mask objects set `autoUpdate = false`.
- [ ] Lighting only on objects that need it; no per-frame `setLighting` toggling.
- [ ] RenderTexture/DynamicTexture drawing is followed by `.render()`; textures are not generated with the removed `textures.generate`.
- [ ] Particles: one pooled emitter per effect (`add.particles(...)` returns the emitter), `explode()`/`emitParticleAt()` for bursts, no `createEmitter`.
- [ ] Tilemaps: collision via `setCollisionByProperty`; one-way tiles set *after* it with `tile.setCollision(false,false,true,false)`; embedded tilesets, uncompressed layers.
- [ ] Aseprite: animation keys are unique (global namespace) or created with a `target` sprite. `createFromAseprite` yields **zero-frame** animations for our `<key>#N` exports: guard with `anims.get(k)?.frames.length`, never `anims.exists(k)`, and never read `anims.get(k).frames[0]` unless the atlas was repaired.
- [ ] Anything hung on `scene.events` (or `game.events`, `registry`, `sound`, `settings.onChange`, `window`) is removed in a `SHUTDOWN` handler; it survives `scene.restart()`.
- [ ] No pool/array is mutated by a callback while its owner iterates it (`projectiles.clear()` from a hit callback was the Phase C S1).
- [ ] Hot paths (`update`, `onUpdate`, `tick`, projectile callbacks): no new arrays/objects/closures/template strings per frame; scratch objects on the class.
- [ ] Time effects: `physics.world.timeScale` is *inverted* (2 = half speed); un-pause logic doesn't depend on a clock it just paused.
- [ ] Camera maths uses `getWorldPoint` / `pointer.worldX`; nothing reads `camera.matrix` by hand.
- [ ] Scene objects use the depth constants from `src/core/depth.ts`; cross-team traffic goes through the event bus only.
- [ ] Nothing in the diff touches files owned by another team (`docs/ARCHITECTURE.md` ownership table).
- [ ] Visual proof: a `tools/shot.mjs` screenshot of the change was looked at.

## Self-test fixtures
`/tmp/kbe-rules/bad/bad.ts` (every Phase A rule, expected 21 errors + 4 warnings), `/tmp/kbe-rules/good/good.ts` (must be clean), `/tmp/kbe-rules/new-bad/new-bad.ts` (Phase C rules, expected 1 error + 14 warnings) and `/tmp/kbe-rules/new-good/new-good.ts` (must be clean), and
`/tmp/kbe-rules/corpus/skills.ts` (all `js` examples from Phaser's own bundled skill docs; only intentional "v3 → v4" snippets are flagged).
Re-create by running the checker with `--root` on any directory. These live in `/tmp` and are not part of the repo.

## Phase C review
`docs/teams/rules-review.md` holds the human-style compliance review (18 findings, grouped by owning team). The newest linter rules above came out of it.
