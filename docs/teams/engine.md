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
- **Other calls:** `ctx.projectiles.clear('enemy')` clears enemy shots (respawn, boss death). It is safe from inside any projectile callback (a boss dying from `onHit`/`damage.deal`): shots are deactivated and hidden at once and recycled by the system. `p.kill()` is likewise safe anywhere. `forEach(fn)` iterates live shots (e.g. reflectors). `count` / `countTeam(team)` give live (active) totals.
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
follows vertically by **platform height** inside the level bounds (it holds through jumps and follows on landing or once a
fall drops below the window). It follows `ctx.player()` automatically, so you don't call `follow`. Grounded detection
reads the player sprite's Arcade body (`blocked.down || touching.down`).

**Shake** is a scroll-space offset the engine applies at POST_UPDATE (not Phaser's `cam.shake`). It never shows anything
outside the world bounds: an offset that would cross an edge is mirrored back inside, so shakes against the level
edges keep their full amplitude. `view()`, `leftEdge()`/`rightEdge()` and `clampX()` stay on the steady camera, so
gameplay never jitters with the shake. Camera-fixed layers (`scrollFactor 0`) don't shake, and parallax layers shake by
their scroll factor. **Levels:** no overscan is needed.

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

### Phase F: cinematic API (letterbox, zoom punch, focus) and the boss-intro cinematic

```ts
ctx.camera.letterbox(true, 400);     // black bars slide in (ENGINE.camera.letterboxPx = 14 px top and bottom); false = out
ctx.camera.zoomPunch(0.08, 220);     // brief zoom in and back (peak 1 + amount, capped at zoomPunchMax 0.12). No-op when
                                     // the screen-shake option is off. A weaker punch never cuts a stronger one short
ctx.camera.focus(x, y, 1200);        // ease the view toward a world point (capped at focusMaxPushX 96 / Y 32 px)
ctx.camera.release(800);             // ease back to the normal follow
ctx.camera.inCinematic();            // true while the auto boss-intro runs
```

- **All of it is cosmetic.** Like the shake, focus only moves the *rendered* scroll. `view()`, `leftEdge()`/`rightEdge()`,
  `clampX()`, forward-only `minScroll` and arena locks stay on the follow camera, so the arena audit, spawn ranges and
  lock-left behave exactly as without it. While a focus is active, the player always stays `focusPlayerMargin` (64 px)
  inside the rendered view, and the view stays inside the world bounds. The push is therefore zero against a map edge
  (the 1-1 boss yard sits at the map's right end, so that intro is bars only).
- **Timing.** Everything runs on the camera's real-time `update(rawDt)`: it is not slowed by hitstop or slow-mo, it
  stops while the Game scene is paused, and under `__KBE.sim.advance` it advances in sim steps like everything else.
- **Bars** are screen-fixed rectangles at `DEPTH.FX_TOP + 9`, compensated for the zoom punch so their inner edges stay
  on whole pixels. The HUD scene renders on top of them, so its top and bottom rows stay readable (UI: keep essential
  HUD info either inside the bars or more than 14 px from the screen edge).
- **Zoom.** The zoom punch uses `cam.setZoom` (non-integer zoom shimmers slightly, so keep punches short, ≤ 300 ms).

**Auto boss-intro cinematic** (no caller needed). On `boss:intro {name, x, y}`: bars in (450 ms), a slow push about 60%
of the way toward `(x, y)` over 1.4 s (bars only when the shake option is off), and `damage.playerShield = true`
(the player keeps full control but takes no hits). On `boss:spawn`: hold 1 s, then release (900 ms), bars out, shield
off. It also ends at once on `player:died`, `game:respawn` or any `snapTo()` (warp), and after a 9 s safety timeout if
`boss:spawn` never comes. Tuning: `ENGINE.camera.bossIntro`.

**Run lead.** On top of the facing look-ahead (36 px), the follow target leads `runLead` (10 px) in the direction the
player is actually moving (|vx| > 30 px/s), eased at `runLeadRate`. It is part of the follow position, so it is clamped
by arena locks and never scrolls back past forward-only.

---

## 9. Time: hitstop, slow-mo, pause

`ctx.fx.hitstop(70)` (or emit `fx:hitstop`) freezes physics, animations, tweens and scene timers. Overlapping requests
take the **max**, clamped to 250 ms. `ctx.fx.slowmo(0.3, 1000)` scales everything. Movement code should use scaled time:

- `ctx.onUpdate((dt) => ...)` already receives scaled ms.
- In a sprite's `preUpdate(t, delta)`, use `ctx.time.dt(delta)`.
- `ctx.time.now` is the scaled gameplay clock.
- `scene.time.delayedCall`, tweens and the Game scene's sprite animations are scaled automatically. Animations are
  scaled per sprite (`sprite.anims.timeScale`, set by the engine), **not** via the game-wide `anims.globalTimeScale`,
  so HUD/Pause/menu animations keep running during hitstop and pause. Don't set `anims.timeScale` on gameplay sprites
  yourself (the engine overwrites it on every time-scale change).
- Slow-mo keeps Arcade bodies stepping every frame (smaller fixed step), so bodies don't stutter at low scales.
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
- **Stage clear (Phase E: parts):** the engine fills `part`/`final` on the `stage:clear` payload if the emitter left them
  out, then waits 3.5 s. **Not final:** it stops HUD/Intro/Pause/Continue and starts `'PartClear'` with
  `{ from, next, result, carry }` (`PartClearData`), or `'Game'` with `{ part: next.id, carry }` when there's no PartClear
  scene. **Final:** it starts `'Results'` with `{ stage, score, rescued, kills, deaths, accuracy, timeMs, difficulty }`
  (mission totals over every part; `score`/`rescued` are the run's values) plus `{ mission, part, parts, shots, hits }`
  (`MissionResultsData`). If there's no Results scene, it shows "MISSION COMPLETE!". See **13. Campaign parts**.
- **Casual difficulty:** HP per life is the player team's job (`ctx.state.difficulty`). Only emit `player:died` when a life is actually lost.

---

## 11. Debug and test hooks

- **URL params:** `?scene=Game&stage=1&part=1-2&x=2400&god=1&debug=1&mute=1&seed=42&difficulty=casual&fast=1&turbo=8`.
  - `turbo=n` (cheat-gated) runs n fixed gameplay steps per browser frame (§14).
  - `x` warps the player on start (inside the current part).
  - `part` starts that part (cheat-gated like `?x`). It applies to every Game start without scene data, Title's included.
  - **Production gating:** cheats (`?god`, `?x` and every `__KBE.cheats.*`) are live in dev mode (`npm run dev`, QA's
    Playwright server) or with `?debug=1`. A production build (`npm run build`) without `?debug=1` ignores `?god`/`?x`,
    and each cheat becomes a no-op that warns once. Check with `__KBE.cheatsEnabled` (page) or `ctx.debug.cheatsEnabled`
    (game code). Gate your own QA-only fixtures on `ctx.debug.cheatsEnabled`. The read-only hooks (`ready`, `state()`,
    `press()`) and the dev sandbox fallback stay in production, which is harmless: the sandbox only builds when no
    level registered.
  - `fast` is read by the UI team to skip intros (`ctx.params.fast` / `PARAMS.fast`).
- **`?debug=1` overlay:**
  - FPS, time scale, camera/lock, player position, projectile count and hurtbox counts.
  - Arcade physics debug.
  - Hurtboxes colored by team: green = player, red = enemy, yellow = neutral.
  - Camera left edge and arena walls.
  - **F2** toggles the overlay.
- **`window.__KBE`:**
  - `ready`, `game`, `version`
  - `state()` returns `{scene, scenes, fps, player:{x,y,alive,weapon,ammo,bombs,lives}, score, rescued, enemies, cameraX, bossHp, boss, bossPhase, god, projectiles, enemyProjectiles, shotsFired, level:{stage,name,sandbox}, errors}` plus every `registerDebug` field (team fields win over engine defaults with the same key)
  - `cheats.god(on)`, `warp(x)`, `give(weapon, ammo?)`, `kill()` (**kills the player**), `killEnemies()` (every live
    enemy, even frozen off-screen ones), `killVisible()` (only enemies whose hurtbox is inside the view; see §14),
    `damageBoss(amount)` (a normal hit on the boss; see §14), `hurt(dmg?)`, `bombs(n)`, `boss()`,
    `part(id, keepRun?)` (restart into a part; fresh run state unless `keepRun`), `clearPart()` (emits `stage:clear` for the current part)
  - `state().part`: the current part id (`'1-2'`), `null` when Game isn't running.
  - `press(action, ms)` reaches every live input, menus included.
  - `state().loadErrors`: `[]` normally. Non-empty only on Preload's load-error screen: `[{kind:'pack'|'file', team, key, url, reason}]`, with `ready` false and no Game running.
- **Add state fields:** gameplay code: `ctx.debug.register('grunts', () => count)` (run-scoped: dropped when the run
  ends, so stale closures never outlive a restart). Page-lifetime code (UI scenes, audio): `registerDebug(key, fn)`.
- `state().errors` holds the last 20 of at most 200 recorded errors (window errors, unhandled rejections, `console.error`).
- **Override cheats when the engine default is too generic:**
  - Player: `ctx.debug.cheat('give', (w: string) => this.equip(w))`.
  - Levels: `ctx.debug.cheat('boss', () => warpToArena())`.
- `bossHp` is tracked from `boss:spawn` / `boss:hp` / `boss:defeated`.

---

## 12. Misc

- **Depth:** `DEPTH.PLAYER`, `DEPTH.ENEMIES + 1`, ... (`src/core/depth.ts`).
- **Engine textures:** `TEX.px` (1×1 white), `TEX.missing`, `TEX.bullet`, `TEX.enemyBullet`. Palette constants: `PAL`.
- **Asset packs:** `public/assets/packs/<team>.json`. URLs are relative to `index.html` (`assets/sprites/...`). Every `aseprite` entry automatically gets its tags turned into valid global animations by Preload (`createAsepriteAnims`, see **Animations** below), so **tag names are anim keys** and must be globally unique (prefix them: `grunt_run`). A pack that isn't deployed (404, or the dev server's HTML fallback) is skipped with a `console.info`. **Every file listed in a deployed pack is required:** a failed pack fetch or file is retried (3 attempts, 0.5 s / 1.5 s backoff), and if it still fails Preload shows the load-error screen instead of routing (see **Changelog (E04)**).
- **Animations (`src/core/anims.ts`, exported from core):** Phaser 4.2.1's `anims.createFromAseprite` makes **zero-frame**
  animations for our `<key>#N` frame names (`exists()` is true, `play()` throws). Preload does not use it: every tag is
  built from the Aseprite JSON with the exact per-frame ms, `reverse`/`pingpong` honored, `repeat: 0` (Phaser's default).
  ```ts
  import { hasAnim, playAnim, tagFrame, frameOf, createAsepriteAnims } from '../core';
  if (hasAnim(scene, 'ui_cursor')) s.play({ key: 'ui_cursor', repeat: -1 }); // exists AND has frames; never use anims.exists()
  playAnim(sprite, 'grunt_run');                 // plays if valid, else stop(); never throws; returns whether it plays
  img.setTexture('ui_icons', tagFrame(scene, 'icon_hmg'));      // texture frame of a tag's first (or i-th) frame
  img.setTexture('knotz_full', frameOf(scene, 'knotz_full', 3)); // 'knotz_full#3', or undefined if absent
  createAsepriteAnims(scene, key, tag => /_loop$/.test(tag) ? -1 : 0); // idempotent; only for atlases loaded outside packs
  ```
  Loop policy: pass `repeat` to `play()` (`sprite.play({ key, repeat: -1 })`), or keep your own rebuild. An animation
  that already has frames is never touched again, so a team that recreates its tags with its own `repeat` keeps them.
- **Settings:** `settings.get()` / `settings.update({...})` / `settings.onChange(fn)` (persisted to localStorage). Fields: `musicVolume`, `sfxVolume`, `mute`, `crt`, `shake`, `difficulty`, `keys`, `pad`. `?mute=1` / `?difficulty=` override without saving.
- **Audio:** `src/audio/index.ts` (UI/audio team) exports `createAudioService(scene)`. The engine's `FallbackAudio` is exported from core if you want to wrap it.
- **Dev sandbox source:** `src/core/dev/`. It's a compact working reference for player movement, a grenade, a turret shooting enemy projectiles, and an arena lock.

---

## 13. Campaign parts (Phase E, `docs/CAMPAIGN.md`)

**Data:** `src/config/campaign.ts` (🔒 Engine): `CAMPAIGN`, `PartId`, `PartDef`, `MissionDef`, `partById(id)`,
`nextPart(id)` (same mission, else null), `missionOf(id)`, `FIRST_PART`, plus the scene-data types `CarryState`,
`PartResult`, `PartClearData`, `GameStartData`. Everything is also exported from `core`.

| Part | Title | Map key | Music | Final |
|---|---|---|---|---|
| 1-1 | THE CAMP | `m1p1` | `music_stage1` | no |
| 1-2 | TIMBER EXPRESS | `m1p2` | `music_m1p2` | no |
| 1-3 | MOOSE LAKE | `m1p3` | `music_m1p3` | yes |

**`ctx.part: PartDef`** is the part being played. Levels: load `ctx.part.map`. Until `m1p1` is in the cache, part
1-1's `ctx.part.map` is `LEVEL.map.key` (the old Mission 1 map), so 1-1 stays playable; another part whose map is
missing keeps its key (warning logged), and the level should leave the dev sandbox in place as it does today.

**Starting a part:** `scene.start('Game', { part: '1-2', carry })`. Game resolves the part from `data.part`, then
`?part=`, then `'1-1'`. Without `carry` the run state is fresh. The data is consumed in `init()`, so a later
`scene.start('Game')` with no data (Title) is a fresh run and doesn't replay the old part.
`carry` restores score, lives, bombs, weapon, ammo (`Infinity` stays `Infinity`; `-1`/`null` also read as Infinity
via `decodeAmmo`; use `encodeAmmo` if you JSON it), rescued, difficulty and `parts` (earlier results). It goes into
the store **before** any team registers, so no `*:changed` events fire and the HUD just reads the carried values.

**Events:** `part:start { id, mission, part, title, location, briefing, final }` right after `stage:start` (UI title
card, Audio part music). `stage:clear` gains `part?`/`final?` (filled by Engine before any team listener runs).
`boss:stomp { x, y, power }` (bosses emit; Levels/FX/Audio listen).

**Per-part stats:** `PartResult { id, score, rescued, kills, deaths, shots, hits, timeMs }`. `score` is the score
earned in that part (a continue's reset doesn't subtract), `rescued` the POWs freed in it, `timeMs` the gameplay
clock from part start to the `stage:clear`.

**Continue** still respawns in place inside the current part; **Quit** goes to Title.

**Progress (`src/core/progress.ts`):** `loadProgress(): { unlocked, best }` ('1-1' always unlocked, campaign order),
`unlockPart(id)`, `recordBest(id, score)`, `isUnlocked(id)`, `resetProgress()`. Stored in
`localStorage['kbe.progress.v1']`; without storage it keeps progress in memory and never throws. The flow unlocks the
next part at the clear and records the part's best score when it moves on. Title's PART SELECT reads `loadProgress()`
and starts `scene.start('Game', { part })` (fresh run state).

**Physics:** `ctx.physics.surfaceAt(x, y): string | null` is the raw `material` tile property on the ground layer
(`'ice'`), or null (no tile / no property). Probe under the feet: `surfaceAt(x, body.bottom + 1)`. A level can
override it with `LevelQuery.surfaceAt`.

---

## 14. Turbo simulation and the level audits

Verifying a part used to mean a keyboard bot walking the map in real time on SwiftShader, which took over an hour per
part. Now there are two fast tools, plus a test-only turbo stepper that makes them possible.

### `__KBE.sim` (cheat-gated: dev or `?debug=1`; `null` otherwise) — `src/core/debug/sim.ts`

| Call | What it does |
|---|---|
| `sim.freeze()` | Stops the browser's RAF loop. The game now moves only when a test advances it, so runs are deterministic. |
| `sim.advance(ms, { every?, onStep?, until?, budgetMs? })` | Runs `ms` of gameplay in fixed 1000/60 ms steps (`game.headlessStep`: no rendering), as fast as the CPU allows, all inside one JS task. `onStep(simMs)` fires every `every` ms; `until()` stops early; `budgetMs` (default 20 s) caps wall time. Returns `{ simMs, steps, wallMs, speedup, stopped }`. |
| `sim.render()` | Draws one frame now (for screenshots while frozen). |
| `sim.resume()` | Back to real time. |
| `sim.turbo(n)` / `?turbo=n` | Still on RAF and still rendering, but each browser frame runs n fixed steps (n−1 headless). |
| `sim.events(since?)` | The run's recorded `boss:*`, `stage:*`, `part:start`, `camera:lock/unlock`, `player:died`, `game:respawn` and `game:over` events, as `{ t, name, data }`. |
| `sim.actors()` | Every live enemy-team hurtbox owner: `{ kind, type, lock, wave, mapId, x, y, state, hp, visible, inView, frozen, boss }`. `lock`/`wave`/`mapId` come from the spawn props (the engine now tags every `ctx.spawn` result). `frozen` means more than 32 px off the view and not in an entry state, which is Enemy.ts's freeze rule. |
| `sim.view()` | `{ x, y, w, h, locked }` of the camera. |
| `sim.stats()` | `{ simMs, steps, wallMs, speedup, frozen, turbo, now }` |

**How time stays consistent.** Once the sim is engaged, the loop callback is wrapped: scenes get a virtual clock
(real deltas on RAF, fixed steps when advancing), and `Date.now()` follows the same clock, because Phaser's
TweenManager measures its delta with `Date.now()`. Scene clocks and timers, Arcade physics, sprite anims, tweens,
`ctx.time` (hitstop and slow-mo) and programmatic `press()` all run off the step's `(time, delta)`, so they all
advance. `game.loop.frame` is bumped each step; bosses use it to group explosion hits. After an advance, the RAF
delta is reset so the next real frame isn't one huge step. Camera shake now uses its own `?seed=` RNG instead of
`Math.random`, so seeded runs see the same view every time. The page is untouched until a test calls `sim`.

**Measured (headless Chromium, SwiftShader, this machine):** `advance()` runs at **100–250× real time** (a 6 s wave
cycle takes 24–60 ms; full-audit average is 115–155×). `?turbo=8` runs at **8.09×** real time while still rendering
at 59 fps.

### `killVisible()` and `damageBoss(amount)`

- `cheats.killVisible()` hits every live enemy hurtbox overlapping the camera view with a 9999 explosion through
  `damage.deal` (the normal path: score, `enemy:killed`, death anims). Parachute boxes and the boss are skipped.
  Off-screen enemies survive, just as they would against a player; that's how the audit finds stranded ones.
- `cheats.damageBoss(amount = 5)` deals one normal player bullet hit to the active boss (the object spawned as type
  `boss`, or a hurtbox of kind `snowcat`/`ironhorn`/`moosezilla`). It aims at the most recently registered live box
  in view (Ironhorn's turrets in phase 1, MOOSEZILLA's core in phase 3, the snowcat's warden), else any box in view,
  else any box. Armour, multipliers and phase thresholds apply as in play.

### `npm --prefix game run audit:arenas` — `tools/arena-audit.mjs --part 1-1|1-2|1-3|all`

For every `camera_lock` arena in the part's TMJ, in x order: warp 120 px before it, god mode, then walk right (jump
when blocked) until it locks. **Wave arenas:** repeat {simulate 6 s, sampling every 100 ms; checkpoint: every live
wave member must be inside the locked view and not frozen; `killVisible()`} until the arena reports done.
**Boss arenas:** `damageBoss(5)` every 200 ms (25 HP/s), `killVisible()` every 3 s; then wait for `stage:clear` and the
next scene.

| Result | When |
|---|---|
| **FAIL** `off-view>2s` | A wave member stays outside the view for more than 2 s of game time. |
| **FAIL** `checkpoint-off-view` / `checkpoint-frozen` | A member is off-view or frozen at a 6 s checkpoint. |
| **FAIL** `not-done-in-90s` | The arena isn't done 90 s after it locks. |
| **FAIL** `never-locked` | The arena never started after the warp and walk. |
| **FAIL** boss | Boss off-view for more than 2 s, no HP change for 15 s, phases 2/3 not reached, not dead in 90 s, `stage:clear` count or `{ part, final }` wrong, or the next scene (PartClear, or Results after the final part) not started. |
| **FAIL** errors | Page or console errors. |
| **WARN** `pulled-into-view` | The level's off-view safety net had to pull a member back. |
| **WARN** `vanished-off-view` | A member disappeared while off-view. |
| **WARN** `members-unaccounted` | Fewer members died than the map places. |
| **WARN** `waves-not-all-seen` | Not every wave in the map ran. |
| info | Members that died on screen without being shot, such as a drone crashing in its dive. |

Output is a table, plus `tests/artifacts/arena-audit-<part>.json` and a PNG per failing arena. Exit codes: 1 if
anything failed, 2 for bad arguments or a tool crash, 3 if the hard watchdog fired. Every part has a 90 s wall
budget (`--budget`), each page call times out, and a whole-run watchdog kills the process, so it never hangs. A page
load that fails with a network error (WSL `ERR_NETWORK_CHANGED`) is retried once.

Options:

- `--strict` turns the level's off-view safety net off for the run (runtime tuning only), so drift fails instead of
  being pulled back.
- `--cycle <s>` sets the seconds between kills; longer values make a soak test.
- `--verbose` prints every cycle.
- `--inject-stray` checks the audit itself. It disables the net and pushes one live wave member 40 px past the locked
  view, which is the original stall bug. The audit **must FAIL**. It does: `off-view>2s` (frozen), the checkpoint
  failure and `not-done-in-90s`, in 2.3 s of wall time.

### `npm --prefix game run audit:reach` — `tools/reach-check.mjs --part 1-1|1-2|1-3|all [--tmj file] [--verbose]`

Static, no browser, about 0.2 s for all three parts. It reads the TMJ ground layer:

- `collides` without `oneway` is solid.
- `oneway` is a platform you can land on from above or drop through (down+jump).
- `hazard=water|spikes` is deadly.
- `crack=true` and `crack=stomp` ice count as ground.

It reads the player tuning from `src/config/tuning/player.ts` (run 105, jump 318, gravity 900, jump cut 120, body
12×30) and the 520 fall cap from the controller. Jump arcs use Arcade's 60 Hz semi-implicit Euler, so the apex is
53.5 px (measured in game: 53.6), not the continuous 56. Flat jump distance is 74 px.

BFS runs from `player_start` over standable cells (a surface with 2 free tiles above). Moves are walking, walk-offs,
drop-throughs, and jumps (full, short and tap, at full, half and zero run speed, from the column centre and from the
overhang edge). It checks that every arena, checkpoint and the `stage_end` is reachable, and **fails** with a
reason, such as `64 px wall at x=640, standing at y=336; a full jump clears 53 px, no step within reach` or
`96 px gap from x=2000 to x=2096 (landing 0 px higher); jump reach on the flat is ~74 px`.

POWs and pickups out of reach are **warnings**. `--verbose` also lists unreachable ledges as info. Writes
`tests/artifacts/reach-check-<part>.json`. `--tmj` checks a work-in-progress map as a given part.

It ignores props (crates and sandbags can be shot; gates open), trains and sweeps, camera lock-left, coyote time
(which makes it conservative) and turning around in the air. Mutation-tested: on the 1-1 floor at x=640, a 48 px
wall passes and a 64 px wall fails; an 80 px gap passes (the body's 12 px overhang leaves 70 px of travel) and a
96 px gap fails.

`npm --prefix game run audit` runs both for all parts, in about 6 s of wall time.

---

## Changelog (fast level audits, 2026-10-17)

- `src/core/debug/sim.ts`: `__KBE.sim` turbo simulation (freeze/advance/render/resume/turbo/events/actors/view/stats),
  `?turbo=n` (`UrlParams.turbo`). Measured 100–250× real time when advancing, 8× with `?turbo=8` while rendering.
- `cheats.killVisible()`, `cheats.damageBoss(amount)`.
- `core/spawn.ts`: every `ctx.spawn` result is tagged with `{ type, kind, lock, wave, mapId }` (`spawnTagOf(obj)`).
- `core/camera.ts`: shake jitter uses a seeded RNG (`?seed=`) instead of `Math.random`.
- New tools `tools/arena-audit.mjs` and `tools/reach-check.mjs`; npm scripts `audit:arenas`, `audit:reach` and `audit`.
  The old `arena-bot.mjs` and `flow-check.mjs` are superseded (kept for reference).

## Changelog (Phase E: campaign parts, 2026-10-16)

- `src/config/campaign.ts`: campaign data and scene-data types (CAMPAIGN.md contract).
- `ctx.part`; GameScene `init({ part, carry })`; Mission 1 map fallback for 1-1; stale scene data consumed.
- `RunStateStore.restore(carry)`, `partResult()`, `carry()`, per-part score (`partScore`).
- Events `part:start`, `boss:stomp`; `stage:clear { part?, final? }` filled by the flow.
- Flow: PartClear / next part / mission Results with `parts`; Game teardown also stops `Intro`, `Pause`, `Continue`.
- `src/core/progress.ts`; `ctx.physics.surfaceAt`; `EventBus.totalListeners()`.
- `?part=`, `__KBE.cheats.part(id, keepRun?)`, `__KBE.cheats.clearPart()`, `state().part`; `PartClear` in `state().scene` priority.
- Selftest `campaign` section (`node game/tools/engine-selftest.mjs --only campaign`): 1-1 → 1-2 → 1-3 → Results through
  the flow, carry (Infinity and finite ammo), PartClear data, Results parts, progress, fresh Title start, the 1-1 boss
  killed in play advancing to 1-2, `?part=` with localStorage blocked, and leak counters (bus listeners, updaters,
  Game/HUD/game/input/sound emitters, window listeners, audio loops) flat across 3 restarts.

## Changelog (E04: asset load failures, 2026-10-16)

- **Required assets that fail to load no longer route into a crashing Game** (QA KBE-QA-E04; `BootScene.ts`,
  `PreloadScene.ts`). Before, Boot skipped a pack on any fetch error and Preload only warned on a failed file, then
  routed anyway; HUD's `bitmapText` threw on the missing `font_hud_gold` (`reading 'data'`), the view froze on the
  loading bar and the player never respawned. Host network churn (`ERR_NETWORK_CHANGED`) triggered it organically.
- **Retries:** Boot retries each pack fetch (3 attempts, 0.5 s then 1.5 s backoff). It now tells *not deployed* (404 or
  other 4xx, HTML fallback: skipped quietly, as before) from *failed* (network error, 408/429/5xx, truncated JSON:
  retried, then reported). Preload sets `load.maxRetries = 0` (Phaser's retry fires instantly, inside the same network
  blip) and runs its own rounds instead: after each pass, every pack entry not in its cache, plus any failed request,
  is re-queued under its own pack section, up to 3 attempts with the same backoff. A partly loaded MultiFile (font
  PNG fine, XML failed) is re-queued whole; Phaser never cached its half.
- **Load-error screen:** if anything still fails, Preload stays put. It shows *LOAD FAILED: CHECK CONNECTION*, the
  failed file/pack count, up to three keys, and *PRESS ENTER / CLICK TO RETRY* (gamepad: any button). Retry re-fetches
  only the failed packs and re-loads only the failed files (a fresh 3-attempt cycle), then routes normally. After three
  failed manual retries the prompt becomes *... TO RELOAD* and reloads the page. Aseprite anims are created once,
  after everything has loaded. `__KBE.ready` stays false and `state().loadErrors` lists the failures (otherwise `[]`).
- **Selftest** (`engine-selftest.mjs`, now 17 checks): `hud_gold.xml` aborted once → recovered, real level, HUD up,
  kill → respawn; aborted for good → 3 attempts, error screen, `ready=false`, no Game, no errors; then un-block +
  Enter → only `hud_gold.png/.xml` requested, Game + HUD up, respawn works; `ui.json` aborted once → Boot refetches it.
- **Note for QA:** the browser itself still logs `Failed to load resource: net::ERR_...` for every failed attempt, even
  ones a retry recovers. A console guard that counts those will still flag network churn; `state().errors` stays
  empty and the run is healthy. For load health, check `ready` and `state().loadErrors` instead.

## Changelog (Phase D, UI/Audio follow-up)

- **Held keys from the opening menu are ignored until released** (`core/input.ts`, UI request). The cause: a Game
  keyboard created while Enter is held never sees the original keydown. Its Key went down on the first OS auto-repeat
  (about 0.5–1 s later), which read as a fresh `pause` press. Every `InputService` now applies three rules, and all
  existing call sites work unchanged:
  - A Key whose down came from an auto-repeat keydown (`event.repeat`) counts as held over and reads as up until it
    is released. This covers a new scene, a paused scene and a window refocus.
  - `latchHeld()` (new, public): every action held right now (keyboard or pad) reads as up until the hardware releases
    it. Programmatic `press()` is exempt. It runs automatically on scene `CREATE`, which covers the Game and any UI
    scene built with `createInput`, and from `flow.continueGame()` through the new export `latchHeldInputs(scene)`.
    The Enter/Z that confirmed CONTINUE therefore can't pause, jump or shoot the respawned player.
  - `RESUME`/`WAKE` keep their old rebaseline (no `justDown` on the resume frame), and `flow`'s `pauseLatch` is
    unchanged.

  **UI:** the release-wait workaround in Title/Continue is no longer needed and can be removed.
- **`LevelQuery.powTotal?: number`** (additive, optional): the number of POWs placed in the level. The UI can read
  `ctx.level.powTotal` for the Results rank and fall back to its estimate when the value is absent.
- **Selftest:** `engine-selftest.mjs` has three `input:` checks on a second page. The first sends 1.5 s of
  repeat-only Enter keydowns to a fresh Game and expects no pause. The second checks that `latchHeld()` ignores a held
  X until release and that a fresh press still works. The third holds Enter through `continueGame()` and expects no
  pause or confirm, then expects a fresh Enter to pause. With the repeat check disabled, the first two fail.

## Changelog (Phase D)

- **KBE-QA-E02 fixed (camera shake strips).** The engine owns the shake now (see §8): a scroll-space offset mirrored
  inside the world bounds, using the same tiers and amplitudes (`intensity × view size`, tier 4 = ±8.4 × ±4.75 px) and a
  √ ease-out envelope that holds near full for the first frames. A weaker shake never cuts a stronger one short. It runs
  on real time, so it keeps shaking through hitstop. Evidence: `fx.shake(4)` at `x=32` (camera 0,168, the world's
  bottom-left corner) and after `warp(6680)` (camera 6336,168, bottom-right corner). Six captures each show no strips.
  Sampled offsets were `+1..+7 x / −4..0 y` on the left and `−8..0 x / −4..0 y` on the right: full amplitude, folded
  inward. Probe: `/tmp/kbe-engine/shake.mjs`.
- **Camera feel pass (tuning `ENGINE.camera`).** Measured with the real player on the keyboard (hold right plus hops or
  held jumps, a turn-around, 8 s per section; probe `/tmp/kbe-engine/camfeel.mjs`):

  | Section (start x) | Camera y movement during same-level hops, before → after | Max cam y step/frame, before → after |
  |---|---|---|
  | Camp (420) | 0 (clamped at the bottom) → ≤6.7 px (landing on a higher deck) | 0 → 0.95 |
  | Forest (1000) | 16.4 → 4.0 px | 0.93 → 0.49 |
  | Pines climb (1900) | 14.5 → 0 px | 0.84 → 0 |
  | Bridge (2760) | 37.4 → only the real fall through the x≈3000 gap | 1.98 → 6.5 (that fall) |
  | Outpost catwalks (4250) | 46.2 → only real roof drops | 5.1 → 8.7 (a 110 px roof drop, tracked at fall speed) |

  The cause was that vertical follow tracked the airborne player through an 18 px deadzone, so every jump bobbed the
  view. The camera now follows the standing center (feet − 16, so crouching doesn't move it) only while grounded
  (`deadzoneY` 6). In the air it holds unless the player rises more than `airUp` 72 (a full jump is about 56) or drops
  more than `airDown` 24 below. Falls catch up at `followRateFall` 9 and other moves at `followRateY` 3.5. Hard margins
  (`marginBottom` 28, `marginTop` 24) keep the player on screen in long drops. Horizontal tuning is unchanged: it was
  already steady. Caught up, the player sits at 37% of the view width (p10–p90 33–39%), with max horizontal scroll
  2.3 px/frame and no backward drift when turning to shoot behind.
- **Production build verified.** `npm --prefix game run build` produces `game/dist` (index 211 kB, phaser 1.37 MB).
  `vite preview` (Title, and Game at `?scene=Game`) and a plain static server under the sub-path `/games/kbe/` both
  load every asset with the `./` base. There are no failed requests and no console errors.
- **Missing `engine` asset pack added** (`public/assets/packs/engine.json`, empty). Boot always fetched it. Vite's
  dev/preview SPA fallback hid this, but a real static host answered with a 404 console error.
- **Cheats gated in production** (see §11): `CHEATS_ENABLED` in `params.ts`, `__KBE.cheatsEnabled`, and
  `ctx.debug.cheatsEnabled` (new, additive in `DebugService`).
- **`camera.snapTo()` is a hard cut now (Levels' Phase D report).** It finishes any running lock/unlock blend and
  restarts the forward-only left edge from the new view. Before this, `unlock()` then `snapTo()` let the unlock blend
  drag the view back to the old arena (QA bot: "camera moved left 3494 → 3252"). While locked, a snap point inside
  the arena lands the view inside it at once. A snap point outside the arena is treated as a teleport out and is not
  pulled back. Either order of `snapTo()`/`unlock()` works, so Levels' snap-first warp workaround still works and is
  now just redundant. `debugInfo()` also reports `blend`. Selftest: three new `camera:` checks on their own page
  (the input checks leave the Game paused). They fail against the old `snapTo()`.

## Requests for other teams (Phase D)

- **Lead:** `package.json` already has `"selftest": "node tools/engine-selftest.mjs"`. Please keep it, and consider
  adding `npm run selftest` to `check` or CI. It boots its own Vite server and takes about 15 s.
- **Enemies:** `?enemytest=` (and `window.__KBE_ENEMYTEST`, which can set the boss HP) is live in production builds.
  Gate it with `if (test && ctx.debug.cheatsEnabled && ...)` in `src/entities/enemies/index.ts`.
- **Levels:** no shake overscan is needed (E02 is fixed in the engine). New: please set
  `query.powTotal = <number of POW objects>` on the `LevelQuery` you pass to `ctx.setLevel()` (in `level/map.ts`,
  after `createTileLevelQuery`), so the Results rank can use the real count.

## Changelog (Phase C: rules review fixes, `docs/teams/rules-review.md`)

No signature changed; all fixes are internal or additive.
- **E1 (S1) `projectiles.clear()` re-entrancy:** fixed. `clear()`/`p.kill()` during `update()` only deactivate and
  hide; `update()` (or the next hit-stop frame) recycles. Release is idempotent (`Projectile.pooled`). Before the fix a
  boss killed by a projectile (MOOSEZILLA's lethal hit calls `clear('enemy')`) threw `TypeError ... reading 'active'`
  every frame or put a projectile in the pool twice. `count`/`countTeam()` count active shots only; `countTeam()` with
  no team counts both.
- **E2 (S2) Aseprite animations:** new `src/core/anims.ts` (`createAsepriteAnims`, `hasAnim`, `playAnim`, `tagFrame`,
  `frameOf`, all exported from core). Preload uses it for every aseprite pack entry instead of `createFromAseprite`, so
  all 315 tags (player, enemies, boss, props, FX, UI icons/cursor/logo) are valid animations before any scene starts.
  Per-frame ms are exact (in 4.2.1 a frame lasts `frame.duration` ms, it is **not** added to `msPerFrame`; the review's
  `d - 1` would be 1 ms short). Idempotent: anims with frames are kept, zero-frame ones are replaced (or removed if
  the atlas has no frames for the tag, so `exists()` can't lie).
- **E3:** `ProjectileSpec.anim` is played only if `hasAnim()`.
- **E4:** the `__KBE` error log is capped at 200 entries.
- **E5:** slow-mo steps Arcade every frame (`world.setFPS(base / s)` with `timeScale = 1 / s`, restored at 1× and on
  shutdown). Animation time scale is per Game-scene sprite instead of the global `anims.globalTimeScale`: the Pause
  menu cursor and HUD animations no longer freeze during pause/hitstop.
- **E6:** `InputService` reference-counts the keyboard keys it creates per scene and removes the ones nobody binds any
  more on rebind/destroy (keys it didn't create are never removed). `destroy()` is idempotent.
- **Flow (found while verifying):** the Enter/Esc that closes Continue or Pause (both are bound to `pause`) could
  re-pause the Game on the following frames; QA's "game over offers continue" e2e test landed in Pause. `flow` now
  ignores `pause` after `resume()`/`continueGame()` until it's released. That test now passes (it failed with or
  without the other fixes).
- **E7:** `ctx.debug.register` fields are run-scoped (dropped on Game shutdown); `registerDebug` stays page-lifetime.
- **Regression test:** `node game/tools/engine-selftest.mjs [--shots dir]` (own server, ~20 s): every animation has
  frames that resolve to a texture, and E1 driven through the real path (`?enemytest=boss`, HP 1, live enemy shots, a
  player shot spawned last kills the boss inside `update()`): no error, no hole, no double-pooled projectile. Fails on
  the Phase B code (zero-frame FX tags + the `TypeError`), passes now.

## Requests for other teams (Phase C)
- **Player** (`entities/player/animations.ts`), **Enemies** (`entities/enemies/animations.ts`), **Level**
  (`level/animations.ts`): you can delete your atlas rebuild code and keep only your loop policy. Preload already
  built every tag with `repeat: 0`, so either pass `repeat` at `play()` time (`play({ key, repeat: -1 })`) or set it once
  at registration: `const a = scene.anims.get(tag); if (a) a.repeat = -1;`. Player/enemies currently
  `remove`+`create` every run (P2/N3): still works, just wasteful; player's durations are exact, enemies' are 1 ms
  short (`d - 1`), level's skip-if-valid pass is now a no-op.
- **UI:** `hasAnim`/`playAnim`/`tagFrame` from core replace the `anims.exists` guards and `widgets.frameOf`. The HUD
  boss bar looked empty at full HP in `?enemytest=boss` screenshots (`boss:spawn` hp 400): worth a check.
- **Enemies:** N1 (steam vent) should now be able to play; nothing else needed for E1 (the engine fix covers the
  re-entrant `clear('enemy')` from `setHp`).
- **FX:** your `fx_*` tags are now valid global animations, if you ever want `play()` over the clip pool.
- **QA:** add `node game/tools/engine-selftest.mjs` to the suite if you like; `state().errors` is now capped.
  `flow.spec.ts` "Title → Game → Pause → resume" is still flaky (failed 5 of 6 times in a probe, and also on the
  Phase B engine): the second Escape is pressed 3 ms after the first is released, before Pause's `MenuInput` arms
  (arming needs one sampled frame with no menu key held), so the press is swallowed. No extra `game:pause` fires, so
  this is not an engine re-pause. Wait for the menu to be ready (e.g. ~150 ms, or poll a `ui` debug field) before the
  second press, or **UI** could arm on the opening key's `keyup` event (`ui/keys.ts` already tracks it) instead of a
  per-frame sample.

## Changelog (Phase B)

All changes are **additive**: no existing name, signature or payload changed. Code written against the Phase A API
still compiles and behaves the same, except the two deliberate fixes marked ⚠.

### QA fixes
- ⚠ **`__KBE.cheats.kill()` now kills the player** (QA's death and game-over flows depend on it). The default
  implementation calls the player's own hurtbox `hit()` with a 9999-damage `contact` hit, **bypassing god mode and
  i-frames**, and emits `entity:hurt`. The player team already overrides it with `ctx.debug.cheat('kill', ...)`, which
  is the preferred path. The old "kill every enemy" behavior moved to **`cheats.killEnemies()`**.
- New **`cheats.hurt(damage = 1)`**: a normal enemy hit on the player through `damage.deal`, so it respects god mode and
  i-frames. QA can use it to automate the god-immunity test.
- **`?mute=1` now mutes the global Phaser sound manager from boot**, in every scene (Title included), whichever
  AudioService is installed. `bindGlobalMute(game)` (core/audio.ts, called from main.ts) applies `settings.muted` on
  READY, on every settings change and after the AudioContext unlocks. New helper **`applyMute(sound, muted)`**: WebAudio's
  `mute` setter uses `setValueAtTime`, which doesn't update `gain.value` while the context is suspended (no user gesture
  yet), so `sound.mute` kept reading `false`. The helper also writes `gain.value` directly. UI/audio: use it if your
  service sets mute itself.
- **Observable god flag:** `state().god`, and `game.registry.get('god')` is kept in sync (URL `?god=1`, `cheats.god()`).
- **Readiness race fixed:** `PreloadScene` set `__KBE.ready` one frame before the routed scene started, so `state().scene`
  could still read `'Preload'`. Now Game sets ready at the end of its `create()`, and any other target (Title...) flips it
  on its scene `CREATE` event.
- **`state().player` always comes from `ctx.player()`**, the registered PlayerQuery (whichever team provides it).
  `alive` is `PlayerQuery.alive()`, so it is false for exactly as long as the player reports itself dead.
- **Deaths are deduplicated:** a second `player:died` for the same player index before the engine's `game:respawn`
  is ignored. So exactly one life is lost per death even if a death path fires twice. New `ctx.flow.isDead(index?)`.
- Engine default state fields (team `registerDebug` keys with the same name override them): `shotsFired` (monotonic count
  of `player:shoot`), `projectiles` / `enemyProjectiles` (live counts), `boss {name,hp,maxHp,phase}` and `bossPhase`
  (tracked from the `boss:*` events), `level {stage,name,sandbox}`.

### New events (`events.ts`)
| Event | Payload | Who |
|---|---|---|
| `fx:emit` | `{ effect, x, y, angle?, count?, scale?, material?, team? }` | anyone → FX. Generic spatial one-shot. Suggested ids: `dust_run dust_skid dust_land splash waterfall vent_steam debris shield_spark shockwave muzzle_enemy casing scorch`. FX ignores unknown ids |
| `fx:zone` | `{ id, kind, x, y, width, height, active }` | Levels → FX. Ambient zone registry: `active:true` adds/updates the zone `id`, `false` removes it |
| `enemy:shoot` | `{ kind, weapon?, x, y, angle }` | Enemies → FX (enemy muzzle flash), Audio. x/y = muzzle socket |
| `level:ready` | `{ x, y, width, height, stage, name?, sandbox }` | Engine, on every `ctx.setLevel` |
- `boss:spawn/hp/phase/defeated` payloads gained optional **`x?, y?`** (boss body position for FX).

### Contracts (`contracts.ts`), all optional or engine-implemented
- `ProjectileSpec.rehitMs?`: with `pierce`, the same hurtbox can be hit again after N ms of projectile age. This gives
  flame tick damage per target: `pierce: Infinity, rehitMs: 120`.
- `ProjectileSpec.onHit?(p, impact)`: called on **every** connected hurtbox hit, including pierced ones. `onImpact` still
  only sees the hit that stops or bounces the projectile.
- `ctx.projectiles.countTeam(team)`.
- Pierce memory went from 8 to 32 hurtboxes. When full, the oldest entry is dropped. Before, the 9th pierced target was
  re-hit on every sub-step.
- `ctx.physics.waterSurfaceAt(x)`: water surface y or null. Uses the optional new `LevelQuery.waterSurfaceAt?(x)` when the
  level provides it (also accepted by `createTileLevelQuery({ waterSurfaceAt })`), otherwise scans `hazard=water` tiles.
- `ctx.flow.safeSpot(nearX)`: the engine's safe respawn query (ground, no hazard, inside the camera).
  `ctx.flow.isDead(index?)`.
- `Settings.reducedFlash` (default false): `fx:flash` is dimmed to 35% and halved in duration. The UI options screen can
  expose it, and FX may read it for its own flashes.

### Robustness
- **Event bus:** a listener that throws is logged as `[events] a '<event>' listener threw` and the other listeners
  (and the emitter's code) keep running. The bus is now a small copy-on-write emitter: `emit` doesn't allocate, and
  handlers may subscribe/unsubscribe while an event is being emitted. Public API unchanged.
- **Registration:** a throwing `register*()` logs `[game] registerX() from the '<team>' team threw...` and the scene
  continues. Whatever is missing falls back to the sandbox.
- **Spawns:** a factory that throws logs one `console.error` per key and places the magenta placeholder. Unknown keys
  still log one warning.
- **Per-frame:** a throwing `ctx.onUpdate` subscriber is logged once and doesn't stop the others. Subscribers may
  unsubscribe themselves mid-frame without the next one being skipped. A throwing projectile callback removes only that
  projectile (logged once per team:weapon).
- **Hot reload:** `main.ts` disposes the old Phaser.Game on Vite HMR. The `__KBE` window/console error taps are installed
  once per page, so a reload never doubles them.
- Created `src/vite-env.d.ts`. Removed the triple-slash reference from `core/context.ts`.

### Dev sandbox steps aside
- When a real player calls `ctx.setPlayer(q)` while the dev box soldier holds that slot, the box soldier is destroyed.
- When a real level calls `ctx.setLevel` after the sandbox was built, every sandbox display object (tiles, backdrop,
  dummies) is destroyed and the dev arena trigger disarms. `state().level.sandbox` tells QA which one is running.
- Unchanged: the sandbox is only built when nobody calls `setLevel` during registration. The box soldier is only the
  default `player_start` factory, which the player team already replaces.

### Answers to Phase A questions from other teams
- **Player:** `ctx.player()` is filled by **`ctx.setPlayer(query, index)`**, called by your code. That's what you
  already do. Rocket/seek: `onUpdate`. Flame: `pierce: Infinity, rehitMs`. Grenade bounces: `data` + `onImpact`
  returning true. Melee/POW interception: `damage.queryRect / queryCircle / deal`. Safe respawn: `flow.safeSpot`.
  Aseprite pack entries are auto-registered with `createFromAseprite` in Preload (tags = global anim keys).
- **FX:** **Preload owns `createFromAseprite`** for every `aseprite` pack entry, so FX doesn't call it again. Hitstop:
  overlapping requests take the max (clamped 250 ms) and freeze physics, anims, tweens and timers. Use `rawDt` for
  anything that should keep moving. Shake has tiers 1–4 and respects `settings.shake`. Everything is torn down on Game
  SHUTDOWN (event bus cleared, updaters cleared).
- **Enemies:** atlas per-frame durations are preserved (Phaser's aseprite loader). Scaled time: `ctx.onUpdate` dt /
  `ctx.time.dt(delta)` / scene timers all freeze during hitstop. Wave-clear counting belongs to the Levels trigger
  logic, not the engine.

## Requests for other teams (Phase B)
- **Player:** keep `alive()` false from the lethal hit until `game:respawn` (your current `state==='dead'` does this).
  Your `kill` cheat override calls `die()`. That's good. Consider `rehitMs`/`onHit` for the flame.
- **Enemies:** emit `enemy:shoot` at the muzzle socket. Add `x, y` to `boss:*` payloads. Your `boss`/`bossPhase` debug
  fields override the engine defaults, which is intended.
- **FX:** listen to `fx:emit`, `fx:zone`, `enemy:shoot`, `level:ready`. Optionally honor `settings.get().reducedFlash`.
- **Levels:** call `ctx.setLevel` synchronously in `registerLevel` if you can (late calls work but rebuild colliders).
  Emit `fx:zone` for ambience rects. Supply `waterSurfaceAt` if water isn't tile-based.
- **UI/audio:** expose `reducedFlash` in Options. If your AudioService sets mute, use `applyMute` from core.
- **QA:** `kill()` = player death, `killEnemies()` = old behavior, `hurt(n)` = immunity test, `state().god`,
  `state().level.sandbox`.
