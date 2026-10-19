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

---

# Phase E review (`9e0ce80..HEAD`, 63 files in `game/src`, 3563+ / 342-)

Method: `npm --prefix game run check` (tsc + `check-phaser4`: **clean, 0 errors**, 98 files), then a read of every new/changed file for listeners, timers, tweens, pooling and Phaser 4 API use, checked against `node_modules/phaser/src`. Static read only; nothing was run in a browser.

Verified OK (no action):
- No preFX/postFX, `setTintFill`, pipelines, masks, `createEmitter`, `textures.generate` or `Phaser.CANVAS` in the diff. All flashes use `setTint(c).setTintMode(Phaser.TintModes.FILL)` and reset with `clearTint()` (v4 `clearTint` also restores `MULTIPLY`, `Tint.js:154`). `fx/pool.ts:106` resets tint, origin, depth, flip and blend on reuse, so the FILL tints and `setOrigin`/`setDepth` overrides in `fx/campaign.ts:95,111,120` don't leak between pool users.
- Arcade `world.timeScale = 1 / s` stays correct in `core/time.ts:85`. The new code adds no other `timeScale` writes.
- Aseprite anim keys for the laser (`laser_muzzle_flash`, `laser_impact_flash`, `laser_beam_fly`) exist as frame tags in the sprite JSON.
- `ctx.events` is a fresh `EventBus` per `createGameContext` and `teardown()` calls `ctx.events.destroy()`. So every `ctx.events.on(...)` without an `off` (`level/triggers.ts:38`, `level/arenas.ts:80,83`, `level/ice.ts:39`, `core/flow.ts:43`, `core/state.ts:38-42`, `fx/director.ts` `on(...)`, `core/debug/hooks.ts:74-77`) dies with the part, so there is no part-restart leak. `HudScene` uses `ctx.events.scoped(this)`, which is auto-removed on SHUTDOWN.
- Scene-level hooks are all removed: `parallax.ts:75-77`, `train.ts:46,174-175,206-215` (PRE_RENDER draw is off'd in `endTunnel` and on SHUTDOWN), `fx/director.ts:136-137,482`, `GameScene.ts:78,99-100,150-151`, `Enemy.ts:101-102`, `AssaultEnemy.ts:38-39`, `PartClearScene.ts:95`, `level/props.ts:135` (fall tween is now `.stop()`ped, which closes L1 from the Phase C review).
- `core/debug/sim.ts` patches `game.loop.callback` and `Date.now` page-globally. `headlessStep`, `loop.sleep/wake/resetDelta/frame` and `renderer.preRender/postRender` all exist in 4.2.1 (`Game.js:523`, `TimeStep.js`, `WebGLRenderer.js:1960,2027`). It is dev/cheats-only (`CHEATS_ENABLED`), so it doesn't ship.
- `level/ice.ts` mutates `tile.index` plus `setCollision(l,r,u,d,recalc)` / `resetCollision(true)`. Both signatures match `Tile.js:647,708`, and the CPU `TilemapLayer` re-reads `tile.index` on render. There is no GPU layer in use (`level/map.ts:68` uses `createLayer`).

## Findings

| # | Sev | Where | Owner | Finding | Fix |
|---|---|---|---|---|---|
| P1 | W | `ui/routemap.ts:106-109` with `scenes/ui/PartClearScene.ts:128-133` | UI | Pressing confirm *while the marker is travelling*: `skipAll()` calls `map.finish()`, which returns immediately because `travelled` is already true, then `onArrive()`. The travel tween keeps running and its `onComplete` fires `onArrive()` a second time: `readyAt` is reset (the auto-advance timer restarts), the NEXT-line tween is re-added, and the pin, `map_pin` anim and `radio_blip` sfx replay. The knotz marker visibly keeps crawling under the PRESS START prompt. | Store the tween in `travel()` (`this.tw = this.scene.tweens.add(...)`). In `finish()`: `this.tw?.stop(); this.tw = null;` and drop the `if (this.travelled) return` guard, or guard only the pin and dot work. Make `onArrive()` idempotent: `if (this.phase === 'ready' || this.phase === 'leaving') return;`. |
| P2 | W | `entities/weapons/index.ts` (new `flash()` / `laser()`, about lines 40-60) | Player | Each laser shot allocates a sprite via `scene.add.sprite` + `delayedCall(120, destroy)`, and `onHit` does the same for every enemy pierced (`pierce: Infinity`). At `laserMs: 100` that is 10+ GameObjects and timers per second, more when it pierces a crowd, all garbage. The project pools everything else (`ctx.pools`, `fx/pool.ts`). | Route the muzzle/impact flashes through FX (`ctx.events.emit('fx:emit', …)` with the existing pooled clips) or `ctx.pools`. Failing that, keep 2 pre-made sprites per kind and `play()`/`setVisible(false)` on `ANIMATION_COMPLETE`. A time-based cap (≤4 live flashes) also works. |
| P3 | W | `scenes/ui/ResultsScene.ts:117` | UI | `audio.events.once('music:ended', …)` is registered on the *game-level* audio emitter and never removed. If the player leaves Results before the jingle ends, the stale listener fires later on a new run's Results visit (`this.scene.isActive()` is true again) and double-starts `music_title`. | Keep the handler and remove it on SHUTDOWN: `const h = () => {…}; audio.events.once('music:ended', h); this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => audio.events.off('music:ended', h));`. |
| P4 | W | `ui/titlecard.ts:67-84`, `ui/radio.ts:75,138`, `scenes/ui/IntroScene.ts:41-59` | UI | Tweens and delayed calls are scene-owned, so they die with the scene (OK). The risk is the in-run overlays: `TitleCard.hide()` kills the mission-line/location tweens but not the Radio's `open`/`close` tween callbacks. `radio.close()` kills tweens on the container before re-adding, so that case is fine. `radio.ts:75`'s `onComplete` checks `phase === 'opening'`, which is correct. No leak; this is a note that the guards are load-bearing, so keep them if the class is refactored. | None. |
| P5 | I | `core/debug/hooks.ts:362-363` | Engine | `window.addEventListener('error' / 'unhandledrejection')` with no remove. It is guarded by `globalTapped` (once per page), so no stacking. The new lint rule `window-listener-no-remove` flags the two lines as warnings. | Append `// phaser4-ok: once per page, guarded by globalTapped` to both lines to silence the warning. |
| P6 | I | `core/debug/sim.ts:90` | Engine | `Date.now = …` is replaced globally and never restored (there is no `disengage`). Fine for a QA kit gated on `CHEATS_ENABLED`; just keep that gate, since a shipped build must never replace `Date.now`. | Optionally add `sim.release()` that restores `realDateNow` and the original `loop.callback`. |
| P7 | I | `fx/director.ts:222-237` (Phase C F1) | FX | Still open: `scatter()` re-counts live slots per call. The new `pool.combatLive.debris/embers` counters used in `fx/campaign.ts:81,106` show the counter approach already exists. | Reuse `combatLive` in `scatter()`. |
| P8 | I | `level/triggers.ts:42`, `core/flow.ts:65-67,168`, `ui/radio.ts`, `HudScene.ts:237,312` | Level / Engine / UI | `scene.time.delayedCall` callbacks are cancelled on scene shutdown. They don't outlive a part restart. | None. |

No E (will-break) findings: nothing in the Phase E diff crashes, and nothing uses a removed/hallucinated Phaser 4 API. Part-restart listener hygiene is clean; the only sticky global (`window` error taps, `Date.now` in sim) is deliberate and guarded.

## Linter change

`game/tools/check-phaser4.mjs` gained one rule (warn, suppressible with `// phaser4-ok: <reason>`):

| Rule | Catches |
|---|---|
| `window-listener-no-remove` | `window.addEventListener(` / `document.addEventListener(` in a file with no `removeEventListener(`. The listener outlives scene shutdown, and each part restart that re-runs `create()` stacks another copy. |

Tests: `/tmp/kbe-rules/e-bad` (1 warning expected) and `/tmp/kbe-rules/e-good` (clean: add+remove pair, plus a `phaser4-ok`-suppressed once-per-page install). On the current tree it reports 2 warnings, both `core/debug/hooks.ts` (P5, guarded; Engine can suppress them). The pre-existing `ui/keys.ts` and `OptionsScene.ts` pair their listeners with removes, so they stay clean.
Not automatable without false positives (left to review): `audio.events.once` handlers without SHUTDOWN removal (P3), per-shot `add.sprite` + `delayedCall` (P2), idempotency of tween `onComplete` callbacks (P1).

## Counts
E: 0 · W: 4 (P1–P4; P4 is a note with no change needed) · I: 4 (P5–P8). Linter: 1 new rule; `npm run check` passes (0 errors, 2 warnings, both P5).

---

# Phase F review (`75900ec..1ce8abc`, 268 files; about 40 in `game/src`)

Method: `npm --prefix game run check` (tsc + `check-phaser4`: **clean, 0 errors, 0 warnings**, 102 files), then a full read of `core/camera.ts`, `level/background.ts`, `fx/background.ts`, `ui/warning.ts`, the audio wiring (`audio/events.ts`, engine loop/endRun), and the diffs of `fx/director.ts`, `fx/pool.ts`, `scenes/ui/HudScene.ts`, `level/{index,parallax,arenas}.ts`, `entities/bosses/BossDebris.ts`. FILL-tint suspects were checked by decoding the PNG alpha channels. Static read only; nothing was run in a browser. UI (score blink, callout, lab sounds), Enemies (boss flash) and Levels (flyers, crows) are editing right now, so some line numbers may have moved.

Verified OK (no action):
- **API use is v4-correct.** There is no preFX/postFX, `setTintFill`, pipeline, mask, `createEmitter` or `textures.generate`. `cam.flash(ms, r, g, b, force)`, `anims.setProgress/getTotalFrames/timeScale`, `tweens.killTweensOf([..])`, `'Back.easeOut'`/`'Bounce.easeOut'` strings and `setTintMode(Phaser.TintModes.*)` all exist in 4.2.1.
- **Camera zoom bookkeeping.** `setBounds` clamps with `displayWidth` in `clampX/Y`, so zoom >= 1 never exposes the edge. The HUD scene has its own camera. The letterbox bars compensate for zoom: `barTop.y = cy + (edge - cy)/z - h`, which lands the inner edge on a whole screen pixel. `Ramp`, `punchEnv` and `reflect` are allocation-free. The bars are scene-owned, so they die on shutdown. All listeners are on `ctx.events` (rebuilt per run). Death/respawn/`snapTo` end the cinematic through `endCinematic(0)`. The 9 s timeout guards a boss that never spawns.
- **No leaks across part restarts** from `BackgroundDirector` (PRE_RENDER `off`'d, `ctx.events` offs collected, actors destroyed on SHUTDOWN), `BackgroundFx` (8 prewarmed Graphics, destroyed in `FxDirector.destroy`; `reset()` on stage:start/game:over/continue; no timers), `WarningBanner` (scene-owned tweens; `show` and `hide` both `killTweensOf`), `BossDebris` (destroyed on boss `destroy`), `__KBE_LEVEL` (deleted on SHUTDOWN).
- **Canvas texture bakes are guarded** (`fx/pool.ts:61`, `fx/weather.ts:31`, `ui/warning.ts:21` each check `textures.exists`), so a second part start does not get `null`.
- **Audio.** `wireAudioEvents` uses `ctx.events.scoped(scene)`. The section bed, ambience and ducking are closure state that dies with the run, and `endRun()` (via the audio service `destroy`) fades every loop, so no loop outlives a part. `engine.loop` with `pan` skips distance falloff as documented.
- **FILL tints added in Phase F are safe.** `iconPop`/`setRescued` on `ui_icons` frames (18-48% opaque), `scoreText` on the HUD font (13.8% opaque), the FX glint on `fx_hit_pop` (1-11% opaque) and the pooled `fx_light_pool` (alpha-gradient canvas, ADD blend) cannot make white blocks. `pool.spawn` resets tint, blend and scroll factor on reuse.
- **Part-restart hygiene of long-lived sprites.** The camera bars, HUD banner and FX pool are all scene objects.

## Findings

| # | Sev | Where | Owner | Finding | Fix |
|---|---|---|---|---|---|
| F1 | W | `scenes/ui/HudScene.ts:425` (pre-Phase F, `751a5046`) | UI | **FILL tint on an opaque texture.** The boss-bar phase flash does `bossFrame.setTint(white).setTintMode(FILL)` every 65 ms on `ui_bossbar_frame`, which is **99.9% opaque** (204x14). Every "on" phase paints a solid white slab behind the fill, the same artefact as the two the Lead already found. | Flash with MULTIPLY/ADD instead: `bossFrame.setTint(0xff7a6a)` (MULTIPLY, leave the mode alone), or tween a 1 px white border rectangle, or flash `bossName`/`bossFill` only. Reset with `clearTint()`. |
| F2 | W | `level/background.ts:187` | Levels | **Per-frame allocation in the render hot path.** `const [ox, oy] = o.offset ? o.offset(a) : [0, 0]` allocates a fresh `[0, 0]` for *every actor every frame* (the common case), and each `offset` closure (crows x N, buzzard, orbit/bob) returns a new tuple (`:337` area, the buzzard and crow `offset`s). A 10-crow flock is about 600 arrays/s, plus any zone actors. | Add a module-level `const ZERO` and make `offset` write into scratch fields instead: `offset?: (a: Actor) => void` setting `a.ox/a.oy` (reset to 0 each frame), or return into one shared `out: [number, number]`. |
| F3 | W | `core/camera.ts:375` (`setZoom`), `config/tuning/engine.ts` `zoomPunchMax: 0.12` | Engine | **Fractional zoom on pixel art.** `setZoom(1 + 0.12*env)` renders sprites at 1.00 to 1.12x with nearest sampling: texels visibly swim/shimmer for the ~220 ms of every punch (`setRoundPixels(true)` snaps positions, not scaled texel size). It is transient and gated by the shake option, so this is a W (look), not a bug. | Cap `zoomPunchMax` at about 0.05-0.06 and keep punches <= 180 ms (the swim is proportional to the delta from 1.0), or make the big beats a held *integer* look (no zoom, a bar-in only). Keep the reduced-motion gate. The new lint rule `camera-zoom-outside-controller` stops anyone else adding more. |
| F4 | I | `core/camera.ts:325-338` | Engine | The focus offset (`rx/ry`, up to `focusMaxPushX` 96 px) is clamped only to the *level* bounds, not to the arena lock `[lockX0, lockX1 - w]`. A boss intro push toward a gate near an arena edge shows up to 96 px of world outside the arena. `view()` and the spawner/FX cull stay on the steady camera, so that margin has no live enemies or FX in it (cull margin 128 covers it). | Intentional for the gate reveal, so fine as is. If the extra strip ever looks wrong, clamp `rx` to the lock range while `locked`. |
| F5 | I | `level/background.ts:262` (`fire()` of a ZONES id) | Levels | `fire('camp_searchlights')` (the `bg` cheat, or a future hook listing a zone id) pushes a new `Zone` with `x0 -1e9 / x1 1e9`. It is never removed and is always `on`, so its actors never die and repeated calls stack beams until SHUTDOWN. Today `B.hooks` only names SHOTS ids and `__KBE_LEVEL` is cheats-only, so no live path. | Dedupe: `if (this.zones.some(q => q.id === id && q.x0 === -1e9)) return true;` before pushing, or reuse the zone, and give hook-fired zones a `life`. |
| F6 | I | `audio/events.ts:87` / `:71-90` | Audio | `bed` is kept when `handle.active` goes false (a voice stolen by the per-key `max`, or killed by the engine). `(bed?.key ?? null) === key` then short-circuits and the section bed stays silent until the section changes. `engine.bedKey` is also not reset by `endRun()` (debug only). | At the top of `updateBed`: `if (bed && !bed.handle.active) { bed = null; engine.bedKey = null; }` so the next poll restarts it. |
| F7 | I | `audio/events.ts:31` vs `audio/index.ts:10` | Audio | Two `setListener` calls with different definitions of the listener x (`view().centerX` vs `scrollX + width/2`); the last registration wins and `endRun()` nulls it. Equivalent today, but a zoom or focus offset would make them differ. | Keep only the `view().centerX` one (the steady camera) and drop the one in `createAudioService`. |
| F8 | I | `scenes/ui/HudScene.ts:221-223`, `:238-241` | UI | `iconPop` and the new-POW pop each schedule `delayedCall(..., clearTint)`. Two weapon swaps inside `flashMs` let the first timer clear the second flash early (harmless). The new-POW tween targets an icon that the next `setRescued` destroys, which is harmless for a destroyed object. | Optionally keep the timer and `remove()` it before re-arming; `killTweensOf(fresh)` before `destroy()` in `setRescued`. |
| F9 | I | `fx/background.ts:106-175` | FX | `draw()` runs at 30 Hz for every active slot; the aurora redraws 48 columns x 3 `fillRect` plus `fillStyle` each time (about 150 commands). Fine at 8 slots, but `Graphics` has no cache. The Graphics layers also ignore `roundPixels` and sit on fractional positions at scrollFactor < 1, so thin lines (lightning, birds) can shimmer by a pixel. | If the CPU profile shows it: draw aurora at 10 Hz (its motion is slow) or bake it into a CanvasTexture ribbon. Round `s.g.setPosition(Math.round(...))` each redraw. |
| F10 | I | `fx/{director,weather,background,campaign}.ts` | FX | Four separate `matchMedia('(prefers-reduced-motion: reduce)')` objects, each created per scene start. Harmless; they have no listeners to leak. | Share one module-level `reducedMotion()` helper. |

**Cross-team notes, no change required:** the WARNING banner is correctly self-contained (`killTweensOf` before re-arm, hidden on `game:over` and `stage:clear`, y band 92-132 clear of the combo callout at y 66 and the boss bar at y 198). Its `ui_hazard_stripes` canvas is guarded. The `tilePositionX` sweep uses fractional offsets with NEAREST filtering, which just snaps. `BossFlash` (Enemies) is correct: FILL on boss sprites with a MULTIPLY fallback under reduced flash and a `clearTint()` on end. Its sprites are body art with transparent surrounds, but Enemies should re-check opaque fractions of the larger boss sheets, as with F1.

No E (will-break) findings: nothing in the Phase F diff crashes, uses a removed/hallucinated Phaser 4 API, or leaks across a part restart.

## Linter changes (`game/tools/check-phaser4.mjs`)

Two new rules (warn, suppressible with `// phaser4-ok: <reason>`):

| Rule | Catches |
|---|---|
| `canvas-texture-no-exists-guard` | `textures.createCanvas(` / `addCanvas(` in a file with no `textures.exists(` or `textures.remove(`. The texture outlives `scene.restart()`, `createCanvas` then returns `null` and the usual `!` crashes on the second part. |
| `camera-zoom-outside-controller` | `.setZoom(`, `.zoomTo(` or `cam.zoom =` anywhere except `core/camera.ts`. Fractional zoom shimmers pixel art and bypasses the zoom-punch and reduced-motion bookkeeping. |

Tests: `/tmp/kbe-rules/f-bad` (3 warnings expected: 1 canvas, 2 zoom) and `/tmp/kbe-rules/f-good` (clean: guarded `createCanvas`, `phaser4-ok`-suppressed integer zoom, a `==` compare, and a `core/camera.ts` zoom). The earlier fixtures (`new-bad` 1 error + 14 warnings, `new-good`, `e-bad` 1 warning, `e-good`) are unchanged. On the current tree the new rules report **0 hits**, because all three canvas bakes are guarded and only `core/camera.ts` zooms.
Not automatable without false positives (left to review): FILL tint on opaque textures (F1, needs the PNG alpha, which I decoded by hand with `/tmp/kbe-alpha.mjs`), per-frame tuple returns (F2), audio loop handles that went inactive (F6).

## Counts
E: 0 · W: 3 (F1-F3) · I: 7 (F4-F10). Linter: 2 new rules; `npm run check` passes (0 errors, 0 warnings). `docs/PHASER4-RULES.md` gained "Added in the Phase F rules review".

---

# Phase G review (`4546df2..2bb8267`, Mission 2 "Bayou Blackout": 63 files, about 4800+ / 320-)

Method: `npm --prefix game run check` (tsc + `check-phaser4`: **0 errors**, 112 files, 0 warnings before the new rules), then a read of every new or changed file in `src/` (`core/missionPacks.ts`, `PreloadScene`/`GameScene`/`BootScene`/`flow.ts`, `bosses/{Gatorgeddon,BayouBoss}.ts`, `enemies/{BayouEnemy,Enemy,index}.ts`, `level/{water,vents,tiles,train,ice,arenas,props,parallax,background,triggers,index}.ts`, `fx/{bayou,weather,background,director,gallery}.ts`, `audio/events.ts`, `entities/player/controller.ts`, `entities/weapons/index.ts`, Results/Title/PartClear/routemap/warning/titlecard) against `node_modules/phaser/src`. Static reading only: nothing was run in a browser here (QA's `engine-selftest.mjs` covers the double-Preload hand-off and the mission chain, see the first block below).

Verified OK (no action):
- **No Phaser 3 habits or wrong 4.x APIs** in the diff: no preFX/postFX, `setTintFill`, pipelines, masks, `createEmitter`, `textures.generate`, `Phaser.CANVAS`, hand-rolled camera matrix math or `setZoom`. All flashes are `setTint(c).setTintMode(FILL)` + `clearTint()` (`BossFlash`).
- **FILL tint on opaque backing (LESSONS §2): none.** Decoded the PNG alpha of every texture that gets a FILL tint: `gatorgeddon_*` 20-62% opaque (creature silhouettes), `shellshock` 47%, `shellshock_head` 43%, `skeeter` 36%, `piranha` 48%, `hopper` 46%, `gnat` 35%, `airboat` 42%, `lurker` 27% (sheet-wide, transparent corners). `fx_snow/water_ripple/impact_dirt/debris_rock/smoke/muzzle_flame/casing` (the `BayouFx`/shotgun-casing tints) are 5-30%. The opaque textures (`bg_*_sky` 100%, `m2p1_wade` 98%, `m2p3_channel` 98%) only get `setAlpha`, never FILL. `FxPool.spawn` resets tint, origin, scale, flip, blend mode and scroll factor on reuse, so the pooled tinted images (`mud_splat`, `gas_bubble`, `gas_cloud`, droplets, shell casing) cannot leak a tint or a mutated origin into the next effect.
- **Scene-restart and mission chain.** `GameScene.init` hands off to Preload by calling `scene.start('Preload')` from `init()`. That is sound: `ScenePlugin#start` only queues `stop` + `start` ops, `create()` and `update()` are guarded by `loadingMission`, no hook is registered before the guard, and `Systems#shutdown` is unconditional (see the rules doc). Preload's `load.on(...)` listeners are removed by `LoaderPlugin#shutdown` (`removeAllListeners`), so the second Preload start does not stack them. `load.once(COMPLETE)` is registered before `load.start()`, and an empty queue completes synchronously. `markMissionLoaded` runs only from `finish()`, which is reached only with zero load errors, so a failed download never marks the mission loaded. Retry, continue and part restart of a loaded mission skip Preload (`missionsToLoad` filters on the module `loaded` set). Between the main packs and the `*.m2.json` packs there are **0 Aseprite tag clashes (518 vs 228 tags) and 0 texture/cache key clashes**, so `createAsepriteAnims`' "leave existing anims alone" rule cannot make Mission 2 play Mission 1 art.
- **Listeners, timers and loops are released.** `BayouBoss`, `BayouEnemy` and `Gatorgeddon` unregister every hurtbox and `onUpdate` in `once('destroy')`, destroy their `Graphics`/sprites, stop their positional loop, and remove the `'shutdown'` handler they added. `registerEnemies`/`registerGatorgeddon` stop `approachWhine` on shutdown and when the boss appears (the engine's per-key `max: 1` makes the boss' own `skeeter_whine` steal the approach one first; harmless). `Weapons` destroys its 5 tracer sprites on SHUTDOWN. `TrainSystem` destroys fog lanterns in `endFog`. The Gatorgeddon fixture removes `__KBE_GATORTEST`, its collider and its signs on shutdown, and is gated on `cheatsEnabled` + `?enemytest=`. `ctx.onUpdate` removal during iteration is safe (`GameScene.update` re-checks `ups[i] !== fn`).
- **Pools and growth.** Rockets (4), eggs (3), tracers (5) and the `BackgroundFx` slots (8, 96 motes) are fixed. Boss adds are bounded by the gnat cap in `enemies/index.ts:43` (4 live) and `maxEnemies` 24. FX bursts are bounded by `FX.caps`/`FxPool.dropped`. `BackgroundDirector.fired` is capped at 24 and its actors by `life`/`exitOff`.
- **Tile swaps** (`level/tiles.ts`, sinking logs, den pier) mutate the Tilemap instance only, so a part restart rebuilds the authored map.
- **Depth.** Fractional offsets stay inside their bands (`TILES_BACK + .5/1/1.2/2.25`, `ENEMIES + .1/1`); `WADE_DEPTH` (59) is between the player and projectiles on purpose.

## Findings

| # | Sev | Where | Owner | Finding | Fix |
|---|---|---|---|---|---|
| G1 | W | `level/background.ts:610,628,681,753` (type at `:55`, consumer `render()` `:230`) | Levels | **Per-frame tuple allocation, Phase F F2 again.** The `offset` callback is called once per actor per frame and the four new Mission 2 sites return a fresh array: the heron flock (7 actors, block body `return [..]`), the patrol-boat lamp, `skeeter_swarm` (30 actors, `offset: a => [0, Math.sin(..)]`) and the wisps. The skeeter swarm alone is about 1,800 arrays/s for 11 s. F2's fix (`NO_OFFSET`) only covered the no-offset case. | Change the callback to write into the actor (`a.ox`, `a.oy`) or take an out-parameter: `offset?: (a: Actor, out: { x: number; y: number }) => void` with one scratch object in `render()`. New lint rule `offset-returns-array` catches the arrow form (3 hits); the block-bodied heron one at `:610` needs the same change. |
| G2 | W | `entities/bosses/BayouBoss.ts:122`, `entities/enemies/BayouEnemy.ts:102` (same pattern in M1 `entities/enemies/AssaultEnemy.ts:78`) | Enemies B | **The positional loop is never re-acquired.** `if (!this.loop && !audio.locked) this.loop = audio.loop(...)` only null-checks. `AudioEngine#loop` (`engine.ts:301-318`) returns a permanently inactive no-op handle when the voice budget is full or the key is unknown, and kills the *oldest* voice at the per-key `max` (`gnat_buzz` 4, `airboat_motor` 2, `skeeter_whine` 1, `shell_spin` 1). The actor then stays silent for the rest of its life (an airboat when a third one spawns; a boss whine after the approach loop and the boss' own loop race). Phase F F6 was the same bug in `audio/events.ts`. (`Enemy.ts:191` is fine: it checks `.active`.) | `if (!this.loop?.active && !audio.locked && this.retry <= 0) { this.loop = audio.loop(...); this.retry = 500; }` and `this.retry -= dt` in `tick`. New lint rule `loop-handle-no-active-check` (3 hits). |
| G3 | N | `scenes/PreloadScene.ts:215-243` (`showError`), `:95-107` (mission `create`) | Engine | **Mission mode has no way back.** If a Mission 2 pack still fails after the 3 automatic rounds (offline between Results and the first Mission 2 part), the player gets RETRY, then after 3 manual retries RELOAD, which reloads the page and drops the carried run (score, lives, weapon) to a cold Boot. Nothing offers the Title. | In mission mode add `ESC` / pad B → `scene.start('Title')` and print `ESC: TITLE` in the error panel (the progress already saved the unlock). |
| G4 | N | `fx/weather.ts:96-108`, `level/background.ts:205-211` (`strike`), `fx/background.ts` (`bg_lightning`) | FX / Levels | **Lightning has no combined flash budget.** The storm veil (alpha .32, optional second pulse at 380 ms), the sky-cover pulse from `BackgroundDirector.strike()` (50+70+520 ms every 3.5-8 s) and the `bg_lightning` fx each rate-limit themselves; the timers are independent. Worst case in 2-2/2-3 is the veil's two pulses plus one sky pulse inside 1 s, which is exactly 3 and leaves no margin for the `bg_lightning` flash. Reduced-flash handling is correct in all three. | Give them one gate: `strike()` skips the cover pulse (keeps the bolt and thunder) while `fx.weather.stats.lightningAlpha > 0`, or expose a single `ctx.fx.flashAllowed()` cooldown (>= 350 ms between any two full-screen pulses). |
| G5 | N | `fx/weather.ts:80-81` | FX | `begin()` walks every `pool.slots` entry each frame only to count the live `ambient` ones. `FxPool` already keeps `combatLive` counters for the same reason (Phase C F1, still open as P7). | Keep `ambientLive` in `FxPool.spawn`/`release` next to `combatLive` and read that. |
| G6 | N | `entities/enemies/BayouEnemy.ts:43` | Enemies B | One `Graphics` per `BayouEnemy` (`cue`), cleared and redrawn every frame, even when idle and offscreen. Each is its own batch break and `maxEnemies` is 24. | Create it lazily in the first state that draws, or share one scene-level `Graphics` redrawn from a small list; at minimum skip `cue.clear()` when nothing was drawn last frame. |
| G7 | N | `entities/bosses/BayouBoss.ts:79-83`, `entities/enemies/BayouEnemy.ts:52`, `entities/player/controller.ts:348-349` | Enemies B / Player | Per-frame string building in hot paths: `pose()` builds `` `${kind}_${tag}${tier}` `` (and the head key) before comparing it, and `Knotz.render()` builds `` `knotz_torso_${weaponVariant}` `` and calls `textures.exists` every frame. About 3-4 short strings per frame; no leak. | Compare the cheap inputs first (`tag`/`phase`/`weapon` against the last values) and only then build the key; cache the variant when `weapon:changed` fires. |
| G8 | N | `entities/bosses/Gatorgeddon.ts:136`, `BayouBoss.ts:98` (also `Moosezilla.ts:124`, `MachineBoss.ts:109`) | Enemies A / B | The "penetrating round hits a shared health pool once" block allocates a closure per hit and is copy-pasted four times. Correct and cheap at HMG rates, but a fifth boss will copy it again. | Hoist into `bosses/` (next to `BossFlash`): `rememberHit(projectiles, h, boxes)`; B owns the helper, A calls it. |
| G9 | N | `entities/weapons/index.ts:136` | Player | `coneTargets.push({ h, x, y, distance })` allocates a record per target per shot (at most `shotgunMaxTargets`). Fine at the shotgun's fire rate. | Optional: a fixed array of 5 reusable records. |
| G10 | N | `scenes/ui/ResultsScene.ts:231` | UI | After 22 s idle the Results screen now auto-*continues* into the next mission (it used to leave for the Title). An unattended player is dropped into 2-1 with the carried lives. | Keep the auto-advance for the Title choice only, or make the idle default QUIT TO TITLE. |
| G11 | N | `fx/weather.ts` constructor (`nearRain` at `DEPTH.PLAYER + 1`) | FX | Ties with the Knotz torso/full sprites (`controller.ts`, also `PLAYER + 1`); the order within the tie follows creation order, so rain may draw over or under the torso inconsistently between scene starts. | Use `DEPTH.PLAYER + 1.5`. |

**Cross-team notes, no change required:** the Preload mission mode skips undeployed packs quietly (`fetchPack` MissingPack), so on a build without `*.m2.json` the mission "loads" nothing and Game falls back to the sandbox; this is by design and logged. The Results → Game hand-off passes `carry` through two scene starts; `GameScene.init` copies it into the Preload data, so it survives. `vents.ts` registers one `ANIMATION_COMPLETE` `once` per phase change on the flame sprite; a stale one is consumed by the next completion and every callback is guarded by `vent.phase`, so nothing accumulates.

No E (will-break) findings: nothing in the Phase G diff crashes, uses a removed or hallucinated Phaser 4 API, paints a FILL tint onto an opaque texture, or leaks across a part restart or the mission chain.

## Linter changes (`game/tools/check-phaser4.mjs`)

Four new rules (warn, suppressible with `// phaser4-ok: <reason>`):

| Rule | Catches |
|---|---|
| `raw-timer` | `setTimeout(` / `setInterval(` / `requestAnimationFrame(` in `src/` (the file `scenes/BootScene.ts`, which runs before any scene exists, is exempt). They fire after shutdown/restart, ignore hitstop and pause. Use `scene.time.delayedCall`. |
| `offset-returns-array` | `offset: a => [x, y]` (arrow returning an array literal). A per-frame, per-actor allocation (G1). |
| `loop-handle-no-active-check` | `if (!x && ...) x = <audio>.loop(...)` where the file never reads `x.active` / `x?.active` (G2). |
| `update-play-config-object` | `sprite.play({ ... })` inside `update`/`tick`/`on*Update`/`onUpdate` bodies (config object per call; Phase C rule). |

Tests: `/tmp/kbe-rules/g-bad` (5 warnings expected: one per rule plus the second `offset`) and `/tmp/kbe-rules/g-good` (clean: `?.active` retry, scratch/helper `offset`, `scene.time.delayedCall`, string-form `play`, a `phaser4-ok`-suppressed `window.setTimeout`, and `setTimeout(`/`offset: a => [` inside a comment and a string). On the current tree: 0 errors, 6 warnings (3 `offset-returns-array` G1, 3 `loop-handle-no-active-check` G2).
Not automatable without false positives (left to review): FILL tint on opaque textures (needs the PNG alpha; this phase decoded them with a throwaway script), combined flash budget (G4), pool-slot scans (G5), per-actor `Graphics` (G6), key-string building in hot paths (G7).

## Counts
E: 0 · W: 2 (G1-G2) · N: 9 (G3-G11). Linter: 4 new rules; `npm run check` passes (0 errors, 6 warnings, all in G1/G2). `docs/PHASER4-RULES.md` gained "Added in the Phase G rules review".
