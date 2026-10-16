# Phase C: Phaser 4 compliance and correctness review

Reviewer: Rules team. Scope: `game/src` (63 `.ts` files at the start, 79 at the end: `src/ui/*`, `src/audio/*`, `scenes/ui/{Hud,Title,Intro}Scene.ts` landed mid-review). `scenes/ui/index.ts` still exports an empty `uiScenes` and Pause/Continue/Results/Options/Credits do not exist yet, so those were **not** reviewable. Re-run this review when the UI team is done.
Phaser 4.2.1. Every claim below was checked against `node_modules/phaser/src` or the shipped `phaser.d.ts`; nothing was run in a browser (so anything about how it *looks* is marked ⚠).

| Check | Result |
|---|---|
| `npm run check:phaser4 -- --strict` (before my rule changes) | 63 files, 0 findings |
| `npm run typecheck` (`tsc --noEmit`) | clean |
| `npm run check:phaser4 -- --strict` (after my rule changes, 79 files by the end of the review) | 0 errors, 6 warnings, all six are `anims-exists-zero-frame`: E3 (1) and U1 (5) below |

Severity: **S1** broken (crash/softlock/feature unusable) · **S2** wrong/fragile, will bite soon · **S3** real bug or leak with limited reach · **S4** nit/perf/hygiene.

## Counts

| Team | S1 | S2 | S3 | S4 | Total |
|---|---|---|---|---|---|
| Engine (`core`, `scenes`, `config`) | 1 | 1 | 2 | 3 | 7 |
| UI/Audio (`ui`, `audio`) | 1 (provisional) | 0 | 0 | 1 | 2 |
| Enemies/Boss | 0 | 0 | 1 | 2 | 3 |
| Player/Weapons/Pickups/POW | 0 | 0 | 0 | 3 | 3 |
| Level | 0 | 0 | 0 | 1 | 1 |
| FX | 0 | 0 | 0 | 2 | 2 |
| **Total** | **2** | **1** | **3** | **12** | **18** |

**Top issues, in order:** E1 (killing the boss with a projectile corrupts or crashes the projectile system), E2/U1 (every `ui_*` Aseprite tag is a zero-frame animation: menu cursor throws, every `icon()` renders the magenta missing texture), N1 (the boss steam vent can never show), E3, E4.

What was **not** wrong (verified, so nobody re-checks): no `preFX/postFX/setPipeline/masks/createEmitter/RenderTexture/textures.generate/setTintFill` anywhere; the camera filters (bloom + custom CRT RenderNode) are created once and toggled via `active`; teardown order of `FxFilters.destroy()` vs `CameraManager.shutdown()` is safe (`FilterList#remove` of an already-destroyed list is a no-op); the inverted `world.timeScale = 1 / s` is correct; one-way tile setup order (`setCollisionByProperty` first, per-tile `setCollision(false,false,true,false)` second, then `calculateFacesWithin`) is correct; `LevelCollision.rebuild()` destroys old colliders (no accumulation); every `scene.events.on` in `src` is removed on shutdown/destroy; `Container#remove` re-adds detached boss parts to the display list; `layer.getTileAtWorldXY` is allocation-free and correct for a scrollFactor-1 layer; all 264 Aseprite tag names are globally unique (no key collisions) and none uses `reverse`/`pingpong`; largest texture is 515×515 (no real-GPU size risk); FX uses fixed prewarmed pools (no emitter/tween/timer per particle).

---

## Engine team

### E1 · S1 · `core/projectiles.ts:308` `clear()` re-enters `update()` (triggered at `entities/bosses/Moosezilla.ts:98`)
**What:** `Moosezilla.setHp()` calls `ctx.projectiles.clear('enemy')` when HP hits 0. That `setHp` runs synchronously inside `ProjectileSystem.update()`: `step` → `hurtboxImpact` (line 261) → `damage.deal` → `Moosezilla.hit` → `setHp`. `clear()` swap-removes from `this.live` while `update()` (line 186) is iterating it by index, then `update()` does `this.live[i] = this.live[this.live.length - 1]; this.live.pop()` for the killing projectile using its *stale* index.
**Failure:** reproduced with an exact replica of the two methods (`/tmp/kbe-rules/repro-clear.mjs`):
- `live = [enemyBullet, killerShot]` (killing shot is the newest): the killer ends up in the pool **twice**, so two later `spawn()` calls hand out the same sprite;
- `live = [enemyBullet, enemyBullet, killerShot]` (a normal boss volley, killer newest): after the frame `live` has a hole, and the next `update()` throws `TypeError: Cannot read properties of undefined (reading 'active')` **every frame** (outside the per-projectile `try`), so `GameScene.update` dies at the boss kill.
Condition: number of enemy projectiles removed ≥ 1 + number of projectiles after the killer in the array. A rocket/grenade/flame kill or a lone bullet qualifies.
**Fix (Engine, `projectiles.ts`):** make `clear()` safe during iteration.
```ts
private updating = false;
update(dtMs: number): void {
    if (dtMs <= 0) return;
    this.updating = true;
    try { /* existing loop, unchanged */ } finally { this.updating = false; }
}
clear(team?: Team): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
        const p = this.live[i];
        if (team && p.team !== team) continue;
        if (this.updating) { p.active = false; p.sprite.setVisible(false); continue; }   // update() recycles it
        this.recycle(p); this.live[i] = this.live[this.live.length - 1]; this.live.pop();
    }
}
```
(Entries marked inactive during hit-stop are recycled by the next `update()`; `countTeam` already filters on `active`.) Enemies team may additionally defer the call to the next `updateBoss` tick, but the engine fix is the real one: `clear()` is public API.

### E2 · S2 · `scenes/PreloadScene.ts:64` `createFromAseprite` produces zero-frame animations that every team re-fixes differently
**What:** `AnimationManager#createFromAseprite` looks frames up by the numeric key (`frames['0']`); our exports are `<key>#N`, so **every tag of every atlas becomes an animation with `frames: []`** (verified in `AnimationManager.js`; `Animation#getFrames` returns `[]` for an empty list). Player (`entities/player/animations.ts`), Enemies (`entities/enemies/animations.ts`) and Level (`level/animations.ts`) each rebuild their own atlases with three slightly different copies of the same code:
| copy | per-frame `duration` | `reverse`/`pingpong` | skip if already repaired |
|---|---|---|---|
| player (`:15,:17`) | `d` (each frame lasts `d + 1` ms with `frameRate: 1000`) | ignored | no (remove + recreate every run) |
| enemies (`:12-14`) | `d - 1` | handled | no |
| level (`:24-26`) | `max(1, d - 1)` | handled | yes |
FX and UI repair nothing (FX uses its own clip pool, so its tags stay zero-frame; UI does not know, see U1; Moosezilla hits it too, see N1).
**Fix (Engine owns Preload):** one helper in `core/aseprite.ts`, called from `PreloadScene` instead of `createFromAseprite`, then delete the three copies (teams keep only their `repeat` policy):
```ts
export function createAsepriteAnims(scene: Phaser.Scene, key: string, repeatOf: (tag: string) => number = () => -1): void {
    const atlas = scene.cache.json.get(key) as { frames: Record<string, { duration: number }>; meta?: { frameTags?: { name: string; from: number; to: number; direction?: string }[] } } | undefined;
    if (!atlas?.meta?.frameTags) return;
    const names = Object.keys(atlas.frames);            // 'key#N' is a non-integer string, so insertion order = frame order
    for (const tag of atlas.meta.frameTags) {
        const old = scene.anims.get(tag.name);
        if (old?.frames.length) continue;
        if (old) scene.anims.remove(tag.name);
        const frames = names.slice(tag.from, tag.to + 1).map(frame => ({ key, frame, duration: Math.max(1, atlas.frames[frame].duration - 1) }));
        if (tag.direction === 'reverse') frames.reverse();
        scene.anims.create({ key: tag.name, frames, frameRate: 1000, repeat: repeatOf(tag.name), yoyo: tag.direction === 'pingpong' });
    }
}
```
Because animations are global and created once at Preload, the per-run rebuild in player/enemies (also S4, P2/N3) disappears.

### E3 · S3 · `core/projectiles.ts:178` `anims.exists(s.anim)` is not a safe guard
**What:** with E2 unfixed (and for any future tag nobody repairs) `exists()` is `true` for a zero-frame animation and `spr.play()` then throws `TypeError` (`Animation#getFirstTick` reads `state.currentFrame.duration`, verified), from inside `ProjectileSystem.spawn` and therefore from whichever team called it (not caught).
**Fix:** `const a = s.anim ? this.scene.anims.get(s.anim) : undefined; if (a && a.frames.length) spr.play(s.anim!); else spr.stop();`
New linter rule `anims-exists-zero-frame` flags this line (and U1's five).

### E4 · S3 · `core/debug/hooks.ts:241-244` the error log grows without bound
**What:** `errors.push(...)` on every `error` event, `unhandledrejection` and every `console.error` (the tap is installed in production, not only `?debug`). A per-frame error (see E1) pushes ~60 strings/s forever; `state()` only ever reads `slice(-20)`.
**Fix:** `const note = (m: string): void => { errors.push(m); if (errors.length > 200) errors.splice(0, errors.length - 200); };` and use it in the three places.

### E5 · S4 · `core/time.ts:76,79` slow-mo granularity and a global animation scale
- `world.timeScale = 1 / s` is correct, but `World#update` (verified) takes a fixed step every `(1000 / fps) * timeScale` ms (fps 60): with `s = 0.35` that is one step per ~48 ms, i.e. ~21 Hz, so body-driven actors (Knotz, POW) stutter during the 0.35× boss-defeat slow-mo while manual-`dt` code (projectiles, enemies, camera) stays smooth. Acceptable for a ~1 s scripted moment; do not extend slow-mo to normal gameplay without re-thinking it.
- `sc.anims.globalTimeScale` is the **game-wide** AnimationManager, so hit-stop/slow-mo also slows any HUD/menu animation playing in other scenes. `restore()` only resets it on shutdown. If HUD animations must stay real-time, scale per sprite (`sprite.anims.timeScale`) for the game scene's sprites instead.

### E6 · S4 · `core/input.ts:50` rebinding leaks `Key` objects
`bind()` re-runs on every `settings.update` and calls `kb.addKey(...)` for the new bindings but never `kb.removeKey()` for the old ones, so after a few rebinds the keyboard plugin polls dead keys. Fix: remember the codes added by this service and `kb.removeKey(code)` the ones no longer bound before re-adding.

### E7 · S4 · `core/debug/hooks.ts:14,26` `extras` outlives the run
`registerDebug` closures (`playerController`, `fx`, `enemyAI`…) keep pointing at destroyed objects after a restart until a same-named key overwrites them (e.g. `enemyTest` only exists in some runs). Fix: `extras.clear()` in `setActiveContext(null)` (every team re-registers at the start of each run).

---

## UI/Audio team (provisional: `scenes/ui` is still a stub)

### U1 · S1 · UI code assumes `createFromAseprite` worked (every site below breaks until E2 lands)
- `ui/widgets.ts:43-54` `frameOf()`/`icon()` read `anims.get(tag)?.frames[0]?.frame.name`; for every `ui_*` tag `frames` is `[]` (E2), so `icon()` always falls back to `TEX.missing`: **every weapon/life/POW/skull/rank/prompt icon, and the HUD 1UP badge (`HudScene.ts:105-115,128,171,186`), render as the magenta missing-texture box**; `HudScene.setWeapon` never changes `weaponIcon`.
- `ui/menu.ts:59`: `anims.exists('ui_cursor')` is true, so `s.play({ key: 'ui_cursor', repeat: -1 })` throws `TypeError` whenever a `Menu` is constructed (Title, and the future Pause/Options/Continue).
- `scenes/ui/TitleScene.ts:46`: `if (anims.exists('logo_idle')) this.logo.play('logo_idle')` throws inside `create()`, so the Title scene cannot be created; `:112` (glitch) throws every few seconds inside `update()`.
- `scenes/ui/HudScene.ts:194`: the GO! arrow's `play('hud_go')` throws inside the `camera:unlock` handler (the `EventBus` catches and logs it; the arrow stays a static, wrong frame).
- `ui/widgets.ts:58` `playTag()` ("missing art never throws") has the same guard and does throw.
**Fix:** land E2 (it repairs `ui_icons`, `ui_hud`, `ui_prompts`, `ui_rank`, `ui_countdown`, `logo`), then change the guards to `.frames.length` (`const a = scene.anims.get(tag); if (!a?.frames.length) return false;`). Linter rule `anims-exists-zero-frame` flags all five `exists` sites.

### U2 · S4 · `ui/keys.ts:13-19` page-level key listeners are never removed
`install()` adds capture-phase `keydown`/`keyup`/`blur` listeners once; the `installed` flag is module-level, so a Vite HMR re-evaluation adds a second set. Harmless (a `Set` of codes) but put them behind `import.meta.hot.dispose` or on `game.events.once(DESTROY)`.

---

## Enemies team

### N1 · S3 · `entities/bosses/Moosezilla.ts:111` the steam vent can never play
**What:** `steam()` only creates its sprite if `anims.get('fx_steam_vent')?.frames.length` is truthy, but `fx_steam_vent` is a zero-frame animation (FX uses its clip pool and nobody repairs the `fx_*` atlases; E2). Result: the boss's steam telegraph (phase 2 `flies`, post-attack recover) is audio-only, silently.
**Fix:** drop the own sprite and use the FX contract that already handles it (`fx/director.ts:293`): `this.ctx.events.emit('fx:emit', { effect: 'vent_steam', x: at.x, y: at.y });`, remove the `vent` field (and its destroy at `:51`), and delete the `this.ctx.audio.sfx('steam')` call: `audio/events.ts:79` now plays `steam_hiss` on that event, so keeping both doubles the sound.

### N2 · S4 · `entities/bosses/Moosezilla.ts:151`, `entities/enemies/Enemy.ts:123` tint reset every frame
Both call `clearTint()` on every tick after the flash has expired (Moosezilla also allocates a `Map` iterator per frame via `this.parts.values()`). `clearTint()` is correct (it resets the tint *mode* to MULTIPLY too, verified), it just doesn't need to run when nothing changed. Fix: `if (this.flash > 0 && (this.flash -= dt) <= 0) { …clearTint… }`.

### N3 · S4 · `entities/enemies/Enemy.ts:74` + `enemies/animations.ts:11`
`pose()` builds a template string on every tick for walking/idle enemies, then `animate()` compares keys. Cache the last pose string (`if (tag === this.lastTag) return`). And `registerEnemyAnimations` removes/recreates 20 atlases' animations on every `GameScene.create` (goes away with E2).

---

## Player team (player, weapons, pickups, POW)

### P1 · S4 · per-frame allocations in `entities/player/controller.ts` and `entities/weapons/index.ts`
- `controller.ts:103` `muzzle()` returns a fresh `{x,y}` and is called 2× per frame (`:178`, `:182`); reuse one scratch object.
- `controller.ts:129` `for (const dx of [-6, 0, 6])` allocates an array when un-crouching; `:205-213` build 3 anim-key template strings per frame (cache per state change).
- `weapons/index.ts:68-79` rocket `onUpdate` allocates a closure and `damage.forEach` (`boxes.slice()`) per rocket per frame; use a plain loop via `ctx.damage.queryRect` (shared array) or a pre-bound method.
None of this shows up at one player + a few rockets; fix when touching the files.

### P2 · S4 · `entities/player/animations.ts:14-17` see E2 (per-run rebuild, durations off by 1 ms per frame, `direction` ignored).

### P3 · S4 · `entities/pickups/index.ts:12` one `ctx.onUpdate` closure per pickup, forever
Uncollected pickups keep a per-frame closure (`Math.sin`, player query) alive for the whole level even when far off-screen. Skip work when `Math.abs(spr.x - view.centerX) > 320`, or share one updater over a `Set`.

---

## Level team

### L1 · S4 · `level/props.ts:59-62` fall tween outlives a broken prop
`dropResting` starts a tween on `p.sprite`; if that crate is then destroyed mid-fall (`breakProp`), the tween keeps running (Phaser tweens don't watch their targets): `onUpdate` calls `moveZone(p)` on a destroyed sprite/zone and `onComplete` still emits `fx:emit dust_land` at the destroyed prop's x. Fix: keep the tween and `tween.stop()` in `breakProp`, or guard both callbacks with `if (!p.sprite.active) return;`.

---

## FX team (no S1-S3; the most Phaser-4-clean module)

### F1 · S4 · `fx/director.ts:222-237` `scatter()` re-counts live slots on every call
Each call scans all pool slots (~344 across the 10 caps) with `startsWith('fx_debris')`/texture compares to compute the sub-budget; explosions and impacts call it several times per frame. Keep per-kind live counters in `FxPool.spawn/release` (the `Slot` already knows its clip).

### F2 · S4 · `fx/director.ts:345` popup `setTint` multiplies the text colour
`Text` fill is already `#ffe066`; `setTint(e.color)` multiplies, so any colour other than yellow comes out dark/wrong. Currently dead code because `registerUi` sets `registry 'fx.popups' = false`; use `text.setColor(hex)` if the fallback is ever used.

---

## Linter changes (`game/tools/check-phaser4.mjs`)
All new rules are `warn`, lexical, suppressible with `// phaser4-ok: <reason>`, and tested with `/tmp/kbe-rules/new-bad` (1 error + 14 warnings expected) and `/tmp/kbe-rules/new-good` (clean). Zero false positives on the current tree (the 6 hits are real: E3 and the five U1 sites).

| Rule | Catches |
|---|---|
| `anims-exists-zero-frame` | `anims.exists(k)` on a line without `.frames` / `.remove(` (E3, U1) |
| `world-timescale-inverted` | `world.timeScale = <anything but 1 or 1 / x>` |
| `scene-events-no-off` | `scene.events.on(…)` / `this.events.on(Phaser.Scenes.Events.…)` in a file with no `.events.off(` and no `SHUTDOWN` mention |
| `update-new-phaser-object` | `new Phaser.Geom.* / Math.Vector* / Display.Color / Structs.*` inside `update*/tick*/preUpdate/postUpdate/step*/on*Update` bodies and `ctx.onUpdate(() => {…})` arrows |
| `update-creates-gameobject` | `.add.sprite/image/text/graphics/…` in the same bodies |
| `update-adds-collider` | `.add.collider/overlap` in the same bodies |
| `update-adds-filter` | `filters.*.add*`, `Actions.AddEffect*`, `new Filters.Controller` in the same bodies |
Also: the `tint-fill` message is corrected (it `console.error`s and does nothing; it is not silent).
Not automatable without false positives (left to review): re-entrant mutation of a pool during iteration (E1), repair of Aseprite animations (E2), per-frame string/closure allocations.
