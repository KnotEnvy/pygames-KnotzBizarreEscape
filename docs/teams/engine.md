# Engine API guide (for every gameplay team)

This guide covers what you code against in Phase B. Everything below is real and typechecked. Your types live in
`game/src/core/contracts.ts` (🔒) and `game/src/core/events.ts` (🔒). Import from the barrel:

```ts
import { DEPTH, type RegisterContext, type Hurtbox, createInput, getContext, registerDebug } from '../core';
// (from src/entities/<x>/ use '../../core')
```

To see the engine running with no team content: `node game/tools/shot.mjs --out /tmp/x.png --query "scene=Game&debug=1&mute=1"`.
That loads the **dev sandbox**: a test arena, a box-soldier placeholder player and dummy targets. As soon as your team
registers real content, your content replaces the placeholder automatically.

---

## 1. Registering

Each team exports one function from its index file, and `GameScene.create()` calls them in this order:

| Order | File | Function | Typical job |
|---|---|---|---|
| 1 | `src/fx/index.ts` | `registerFx(ctx)` | subscribe to events (impacts, explosions, hitstop feel) |
| 2 | `src/ui/index.ts` | `registerUi(ctx)` | in-world UI listeners (popups, prompts). HUD is its own scene |
| 3 | `src/entities/player/index.ts` | `registerPlayer(ctx)` | register the `player_start`, `pickup:*`, and `pow` factories |
| 4 | `src/entities/enemies/index.ts` | `registerEnemies(ctx)` | register the `enemy:<kind>` and `boss:moosezilla` factories |
| 5 | `src/level/index.ts` | `registerLevel(ctx)` | build the tilemap, `ctx.setLevel(query)`, then spawn every object |

Listeners come first and spawners last, so nothing misses an event. Everything runs **synchronously** inside
`create()`; assets are already loaded by then. If your function throws, the engine logs it and carries on.

After registration, the engine fills in anything that's missing:
- If nobody called `ctx.setLevel`, the dev sandbox arena is built.
- If no player exists, the engine calls `ctx.spawn('player_start', '', {}, level.playerStart)`. The engine's default factory is the box soldier, so registering your own `player_start` replaces it.

```ts
// src/entities/enemies/index.ts
import type { RegisterContext } from '../../core';
import { spawnGrunt } from './grunt';
export function registerEnemies(ctx: RegisterContext): void {
    ctx.registry.register('enemy:grunt', spawnGrunt);
    ctx.registry.register('boss:moosezilla', spawnMoosezilla);
}
```

### Spawn registry
`ctx.spawn(type, kind, props, x, y)` looks up factories in this order: `'<type>:<kind>'`, then `'<type>:*'`, then `'<type>'`.
When the kind is empty, it tries `'<type>'` first. The last registration for a key wins. An unknown key logs **one**
warning per key and places a magenta 16×16 box (it never crashes).

```ts
type SpawnFactory = (ctx: GameContext, x: number, y: number, props: Record<string, unknown>) => GameObject | void;
```
- Levels: call `ctx.spawn(obj.type, props.kind ?? '', props, x, y)` for every Tiled object. Here `x` is the object's x and `y` is its **bottom**, i.e. the feet. Sprites use origin (0.5, 1).
- Built-in engine keys: `player_start` (placeholder), `dev:target`, `dev:turret`, `dev:arena`.

---

## 2. The GameContext (`ctx`)

| Field | What it is |
|---|---|
| `scene` | The Game scene |
| `events` | Typed event bus (§3) |
| `input` / `inputFor(i)` | P1 input / player *i* input (§4) |
| `damage` | Hurtbox registry and hit queries (§5) |
| `projectiles` | Pooled ProjectileSystem (§6) |
| `physics` | `collideLevel`, one-way platforms, hazards, ground probes (§7) |
| `camera` | Forward-only camera, arena lock, shake (§8) |
| `time` | Hitstop, slow-mo, pause, scaled dt (§9) |
| `fx` | Thin facade that **emits events**: `fx.shake(2)`, `fx.hitstop(60)`, `fx.flash(0xffffff, 80)`, `fx.slowmo(0.3, 800)`, `fx.explosion(x,y,'m',team)`, `fx.popup(x,y,'+100')` |
| `state` | Run state (§10) |
| `audio` | `audio.sfx(key, {volume, detune, x})`, `audio.music(key \| null, {fade})`. Missing keys are silently ignored |
| `rng` | Seeded RNG (`?seed=`): `next() range() int() chance() pick() sign()` |
| `pools` | `pools.create(key, factory, reset?, prealloc?)` returns `{ get(), release(item) }` |
| `level` | Current `LevelQuery` (bounds, solidAt, ...) |
| `setLevel(q)` / `hasLevel()` | Level team publishes its level |
| `player(i?)` / `setPlayer(q, i?)` | Player team publishes a `PlayerQuery`. Enemies read it for targeting |
| `spawn(...)` / `registry` | Spawn registry (§1) |
| `onUpdate(fn)` | Per-frame callback `(dt, rawDt)` in ms. `dt` is **scaled** (0 during hitstop/pause). Returns an unsubscribe fn and is cleared automatically on scene shutdown |
| `flow` | `continueGame()`, `quit()`, `pause()`, `resume()`, `over` |
| `params` | Parsed URL params (`stage, x, god, debug, mute, seed, difficulty, fast, scene`) |
| `tuning` | All tuning modules: `ctx.tuning.player` is the namespace of `src/config/tuning/player.ts` |
| `cheats.god` | God mode flag (enforced by the damage service) |
| `debug` | `debug.register(key, fn)` adds a field to `__KBE.state()`. `debug.cheat(name, fn)` overrides a cheat |

From **other scenes** (HUD, Pause, Continue), use `getContext()`. It returns the running Game's ctx, or `null`.

---

## 3. Events

The full catalog lives in `src/core/events.ts` (`GameEvents`), and payloads are type-checked:

```ts
ctx.events.emit('enemy:killed', { x, y, kind: 'grunt', score: 100, cause: info.kind });
const off = ctx.events.on('projectile:impact', e => spawnSpark(e.x, e.y, e.material));
// From another scene (HUD): listeners auto-removed when that scene shuts down
getContext()?.events.scoped(this).on('score:changed', e => this.setScore(e.value));
```

Who does what with events:
- **Emitted by the engine:** `entity:hurt` (damage service), `projectile:impact` (ProjectileSystem), every `*:changed` (state store), `camera:lock` / `camera:unlock` (camera service), `game:over`, `game:continue`, `game:respawn`, `game:pause`.
- **Handled by the engine:** `fx:shake`, `fx:flash` (camera), `fx:hitstop`, `fx:slowmo` (time).
- **Engine bookkeeping:** `enemy:killed` adds its `score` to the run score. `pow:freed` adds +1 rescued and +100 score. `checkpoint` sets `state.checkpoint`. **So don't add those scores yourself.**
- **New events I added beyond ARCHITECTURE.md:**
  - `game:respawn {x,y,index}`: engine → player, meaning "revive here".
  - `game:pause {paused}`
  - `ui:prompt {text, ms?}`: level prompt trigger → UI.
  - `fx:ambience {kind}`: level ambience trigger → FX.
  - `settings:changed`
  - `entity:hurt` now also carries `damage` and `entity` (the hurtbox `kind`).

Payloads emitted by the engine are fresh objects, so you may keep them. The `HitInfo` passed to `Hurtbox.hit` and the
`ImpactInfo` passed to projectile hooks are **reused**, so copy what you need.

---

## 4. Input

Actions: `left right up down jump shoot grenade aimlock pause confirm back`. Keys follow GDD §11. Arrow keys and WASD,
Z/Space, X/J, C/K, Shift/L, Esc/Enter. The pad uses the standard mapping (A jump, X shoot, B grenade, RB aim-lock,
Start pause, plus the d-pad and left stick).

```ts
const inp = ctx.input;                 // P1; ctx.inputFor(1) = P2 (pad 1)
if (inp.justDown('jump')) ...          // edge states are stable for the whole frame
if (inp.isDown('shoot')) ...
const a = inp.aim();                   // { x: -1|0|1, y: -1|0|1 } (reused object, read immediately)
inp.heldMs('shoot');                   // hold duration (charge mechanics)
inp.press('jump', 120);                // programmatic press (tests, demos)
```
Sampling happens at `PRE_UPDATE`, so `preUpdate()` of your sprites, `ctx.onUpdate` and `scene.update` all see the same
frame state. **UI scenes:** `const input = createInput(this)` gives a menu scene its own sampled InputState with the same
bindings. Bindings come from `settings.get().keys/pad`. To rebind, call `settings.update({ keys: {...} })` and every live
input rebinds automatically.

---

## 5. Damage and hurtboxes

```ts
const hb: Hurtbox = {
    team: 'enemy',
    body: sprite.body as Phaser.Physics.Arcade.Body,  // or a Geom.Rectangle, or () => Rectangle
    kind: 'grunt', owner: sprite, material: 'flesh',  // 'flesh'|'metal'|'wood'|'shield'
    alive: () => this.hp > 0,
    invulnerable: () => this.spawning,
    hit: (info) => {                                   // info is reused: copy what you need
        if (this.dying) return false;                  // didn't connect: bullet flies on, no entity:hurt
        if (this.shieldBlocks(info)) { hb.material = 'shield'; return; } // stops the bullet, impact reports 'shield'
        hb.material = 'flesh';
        this.hp -= info.damage; this.flash();
        if (this.hp <= 0) this.die(info);
    }
};
const unregister = ctx.damage.register(hb);
sprite.once('destroy', unregister);
```
- **Team rules:** player hits enemy and neutral; enemy hits player only; neutral (explosive barrels) hits everyone. Use `team: 'neutral'` for crates and barrels.
- When `hit()` returns `false`, the hit didn't connect: no `entity:hurt` event, and the projectile flies on. For a shield **block** that should still stop the bullet and spark, *don't* return false. Set `material: 'shield'` (or switch it dynamically) and return nothing. The impact then reports `material: 'shield'`, so FX can draw a "tink".
- Queries are always "what can **source** hit":
  - `queryPoint(x, y, source)`
  - `queryCircle(x, y, r, source, exclude?)`
  - `queryRect(rect, source)` (returns a shared array)
- `applyRadial(x, y, radius, damage, source, kind='explosion', weapon?)` deals full damage to everything the circle touches and returns the number of hits. **Explosion visuals are separate:** `ctx.fx.explosion(x, y, 'm', team)`.
- `deal(h, info)` hits one specific hurtbox (melee knife, contact damage). It checks alive, invulnerable and god mode, calls `hit`, and emits `entity:hurt`.
- God mode (`?god=1` / `__KBE.cheats.god()`) makes player-team hurtboxes ignore all hits.

Melee example (player knife):
```ts
const r = new Phaser.Geom.Rectangle(x + facing * 4, y - 30, 18 * facing, 26); // normalize width if negative
for (const h of ctx.damage.queryRect(r, 'player')) ctx.damage.deal(h, { damage: 5, source: 'player', x, y: y - 16, dirX: facing, dirY: 0, kind: 'melee' });
```

---

## 6. ProjectileSystem (player AND enemies)

The pool is shared, there are no Arcade bodies, and movement is sub-stepped so nothing tunnels. Shots collide with solid
tiles (one-way platforms don't stop bullets) and with hurtboxes of the other team. Impacts emit `projectile:impact` with
the material that was hit.

```ts
ctx.projectiles.spawn({
    x, y, vx: 420 * facing, vy: 0,          // px/s
    team: 'player', damage: 1, weapon: 'pistol',
    texture: 'pistol_bullet', frame?, anim?, // missing texture → engine fallback bullet
    gravity?: 0, lifetime?: 2000, pierce?: 0, radius?: 2,
    kind?: 'bullet', collideTiles?: true, rotate?: true, silent?: false,
    depth?, scale?, tint?, alpha?, data?: {},
    onUpdate?(p, dtSec) { /* seek: p.vx += ... ; return false to kill */ },
    onImpact?(p, impact) { /* impact.{x,y,material,hurtbox,normalX,normalY}; return true to keep alive */ },
    onExpire?(p) { /* lifetime ran out */ }
});
```
- **Rotation:** the sprite faces its velocity. It's recomputed each frame only when `gravity` or `onUpdate` can change the velocity.
- **Pierce:** passes through N hurtboxes and hits each box once. Use `pierce: Infinity` for flame streams.
- **Grenade bounce:**
  ```ts
  onImpact: (p, i) => {
      if (i.hurtbox || p.data!.b++ >= 1) { boom(p.x, p.y); return false; }
      if (i.normalY) p.vy *= -0.45; else p.vx *= -0.5;
      return true;
  }
  ```
  For a full grenade, see `src/core/dev/sandboxPlayer.ts`.
- **Rocket:** in `onUpdate`, accelerate `p.vx`. On impact, call `ctx.damage.applyRadial(...)` and `ctx.fx.explosion(...)`. Use `silent: true` if you don't want the generic impact spark.
- **Enemy shots:** `team: 'enemy'`, `rotate: false` for round bullets. The engine fallback texture `kbe_ebullet` is bright red and yellow.
- **Other calls:** `ctx.projectiles.clear('enemy')` clears enemy shots (respawn, boss death). `forEach(fn)` iterates live shots (e.g. reflectors). `count` gives the live total.
- **Budget:** 512 live projectiles, pool prewarmed to 64, cleaned up automatically 48 px outside the camera.

---

## 7. Level collision: `ctx.physics`

```ts
ctx.physics.collideLevel(sprite);               // solid tiles + one-way platforms + level static colliders
ctx.physics.collideLevel(debris, { oneWay: false }); // ignore one-way platforms entirely
if (input.isDown('down') && input.justDown('jump') && ctx.physics.onOneWay(sprite)) ctx.physics.dropThrough(sprite); // 260 ms
ctx.physics.hazardAt(x, feetY - 2);             // 'water' | 'spikes' | null
ctx.physics.solidAt(x, y); ctx.physics.oneWayAt(x, y); ctx.physics.materialAt(x, y);
ctx.physics.groundBelow(x, fromY);              // y of the first standable surface top, or null
```
`collideLevel` works before *or* after the level exists, because colliders are rebuilt on `setLevel`. It cleans up on
destroy and returns a remover. One-way rule: the body lands only if it's moving down and its feet were at or above the
platform top on the previous step.

**Levels team: plugging in.** Build your map, then:
```ts
import { createTileLevelQuery } from '../core';
const ground = map.createLayer('ground', tileset)!;   // tile props: collides / oneway / hazard / material
ctx.setLevel(createTileLevelQuery({
    ground, extraColliders: [propsStaticGroup], bounds: new Phaser.Geom.Rectangle(0, 0, map.widthInPixels, map.heightInPixels),
    playerStart: { x, y }, stage: 1, name: 'Pine Ridge Breakout'
}));
// then spawn objects: ctx.spawn('player_start', '', props, x, y); ctx.spawn('enemy', 'grunt', props, x, y); ...
```
`prepareTileLayer` runs automatically. It applies `collides=true` as solid and `oneway=true` as top-face-only. Tile props
the engine reads:
- `collides` (bool)
- `oneway` (bool)
- `hazard` (`water` | `spikes`)
- `material` (`dirt` | `stone` | `metal` | `wood` | `snow` | `water`, default `dirt`)

You can also implement `LevelQuery` yourself. `solidAt` must return **false** for one-way tiles.

---

## 8. Camera: `ctx.camera`

The camera has Metal Slug behavior: it **never scrolls back left**, follows smoothly with a deadzone and look-ahead, and
follows vertically inside the level bounds. It follows `ctx.player()` automatically, so you don't call `follow`.

```ts
ctx.camera.lock(x0, x1);   // arena: eased transition there, emits camera:lock. Levels call this from camera_lock triggers
ctx.camera.unlock();       // emits camera:unlock (UI shows "GO!")
ctx.camera.shake(3);       // tiers 1..4, respects the options shake flag; or ctx.fx.shake(3) / emit 'fx:shake'
ctx.camera.leftEdge(); ctx.camera.rightEdge(); // walkable range (arena walls while locked)
sprite.x = ctx.camera.clampX(sprite.x, halfWidth); // player team: keep Knotz on screen (lock-left)
ctx.camera.view();         // visible world rect (shared). Use it for "enemy enters camera range +32 px"
ctx.camera.snapTo(x, y);   // instant jump (warps)
```
Tuning lives in `src/config/tuning/engine.ts` under `camera` and `shake`.

---

## 9. Time: hitstop, slow-mo, pause

`ctx.fx.hitstop(70)` (or emit `fx:hitstop`) freezes physics, animations, tweens and scene timers. Overlapping requests
take the **max**, clamped to 250 ms. `ctx.fx.slowmo(0.3, 1000)` scales everything. Movement code should use scaled time:

- `ctx.onUpdate((dt) => ...)` already receives scaled ms.
- In a sprite's `preUpdate(t, delta)`, use `ctx.time.dt(delta)`.
- `ctx.time.now` is the scaled gameplay clock.
- `scene.time.delayedCall`, tweens and anims are scaled automatically.
- Need **real** time (UI blink during pause)? Use the `rawDt` argument.

Arcade bodies are scaled by the engine, so you don't need to do anything for velocity/gravity.

---

## 10. Run state, lives and the death flow

`ctx.state`: `score lives bombs weapon ammo rescued difficulty checkpoint`. **Assigning a field emits its event:**
`ctx.state.bombs -= 1` emits `bombs:changed`. `ammo` is `Infinity` for the pistol (`__KBE.state()` reports `-1`).
Switch weapons with `ctx.state.setWeapon('hmg', 200)` so `weapon:changed` carries the new ammo. `lives` counts **including** the current
life (it starts at 3).

The flow (Engine-owned):
1. Player emits `player:died {x,y}`. The engine decrements lives.
2. After 1.2 s, the engine emits `game:respawn {x, y}`. Here `y` is a safe ground surface near the death spot, inside the camera.
3. Player revives there, gives itself i-frames, and emits `player:respawn`.
4. At 0 lives, the engine emits `game:over`. If a `'Continue'` scene exists, it launches it. That scene calls `getContext()!.flow.continueGame()` (which resets score, lives and bombs, emits `game:continue`, then respawns) or `flow.quit()`.
5. With no Continue scene, the engine shows a built-in 9-second countdown.

Other flow behavior:
- **Pause:** `pause` on P1 calls `flow.pause()`. That launches `'Pause'` and pauses Game if the Pause scene exists. Otherwise there's an internal freeze overlay. The Pause scene resumes with `getContext()!.flow.resume()`.
- **Stage clear:** when `stage:clear` is emitted, the engine waits 3.5 s, then starts `'Results'` with `{ stage, score, rescued, kills, deaths, accuracy, timeMs, difficulty }`. If there's no Results scene, it shows "MISSION COMPLETE!".
- **Casual difficulty:** HP per life is the player team's job (`ctx.state.difficulty`). Only emit `player:died` when a life is actually lost.

---

## 11. Debug and test hooks

- **URL params:** `?scene=Game&stage=1&x=2400&god=1&debug=1&mute=1&seed=42&difficulty=casual&fast=1`.
  - `x` warps the player on start.
  - `fast` is read by the UI team to skip intros (`ctx.params.fast` / `PARAMS.fast`).
- **`?debug=1` overlay:**
  - FPS, time scale, camera/lock, player position, projectile count and hurtbox counts.
  - Arcade physics debug.
  - Hurtboxes colored by team: green = player, red = enemy, yellow = neutral.
  - Camera left edge and arena walls.
  - **F2** toggles the overlay.
- **`window.__KBE`:**
  - `ready`, `game`, `version`
  - `state()` returns `{scene, scenes, fps, player:{x,y,alive,weapon,ammo,bombs,lives}, score, rescued, enemies, cameraX, bossHp, errors}`
  - `cheats.god(on)`, `warp(x)`, `give(weapon, ammo?)`, `kill()`, `bombs(n)`, `boss()`
  - `press(action, ms)` reaches every live input, menus included.
- **Add state fields:** `registerDebug('grunts', () => count)`.
- **Override cheats when the engine default is too generic:**
  - Player: `ctx.debug.cheat('give', (w: string) => this.equip(w))`.
  - Levels: `ctx.debug.cheat('boss', () => warpToArena())`.
- `bossHp` is tracked from `boss:spawn` / `boss:hp` / `boss:defeated`.

---

## 12. Misc

- **Depth:** `DEPTH.PLAYER`, `DEPTH.ENEMIES + 1`, ... (`src/core/depth.ts`).
- **Engine textures:** `TEX.px` (1×1 white), `TEX.missing`, `TEX.bullet`, `TEX.enemyBullet`. Palette constants: `PAL`.
- **Asset packs:** `public/assets/packs/<team>.json`. URLs are relative to `index.html` (`assets/sprites/...`). Every `aseprite` entry automatically gets `anims.createFromAseprite(key)` after loading, so **tag names are anim keys** and must be globally unique (prefix them: `grunt_run`). A missing pack is skipped with a `console.info`.
- **Settings:** `settings.get()` / `settings.update({...})` / `settings.onChange(fn)` (persisted to localStorage). Fields: `musicVolume`, `sfxVolume`, `mute`, `crt`, `shake`, `difficulty`, `keys`, `pad`. `?mute=1` / `?difficulty=` override without saving.
- **Audio:** `src/audio/index.ts` (UI/audio team) exports `createAudioService(scene)`. The engine's `FallbackAudio` is exported from core if you want to wrap it.
- **Dev sandbox source:** `src/core/dev/`. It's a compact working reference for player movement, a grenade, a turret shooting enemy projectiles, and an arena lock.
