# Architecture and Team Contracts

Everything lives in `game/`. Teams work **in parallel in one shared checkout**, so **file ownership is strict**:
edit only the paths your team owns. If you need a change in someone else's area, don't make it. Write
the request in your final report under **"Requests for other teams"** and the Lead will route it.
Shared contract files (marked 🔒) are owned by the Engine team; others propose changes in their reports.

## Directory ownership

| Path (under `game/`) | Owner |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Lead (ask for deps in your report) |
| `src/main.ts`, `src/core/**`, `src/scenes/BootScene.ts`, `src/scenes/PreloadScene.ts`, `src/scenes/GameScene.ts` | Engine |
| `src/core/contracts.ts` 🔒, `src/core/events.ts` 🔒 | Engine (shared contract) |
| `src/config/campaign.ts` 🔒 (missions/parts data), `src/core/campaign.ts`, `src/core/progress.ts` | Engine (content values from `docs/CAMPAIGN.md`) |
| `src/config/tuning/<team>.ts` | Each team owns its own tuning file (`player.ts`, `enemies.ts`, `fx.ts`, `ui.ts`, `level.ts`) |
| `src/entities/player/**`, `src/entities/weapons/**`, `src/entities/pickups/**`, `src/entities/pow/**` | Player and weapons |
| `src/entities/enemies/**`, `src/entities/bosses/**` | Enemies, AI and bosses |
| `src/level/**`, `public/assets/maps/**`, `public/assets/tiles/**`, `public/assets/backgrounds/**`, `art-src/tiles/**`, `art-src/props/**`, `art-src/maps/**` | Levels and content |
| `src/fx/**` | Effects and game feel |
| `src/scenes/ui/**` (Title, HUD, Pause, Intro, Results, GameOver/Continue, Options), `src/ui/**`, `src/audio/**`, `public/assets/ui/**`, `public/assets/fonts/**`, `public/assets/audio/**`, `art-src/ui/**`, `tools/audio/**` | UI, HUD and audio |
| `public/assets/sprites/player/**`, `art-src/player/**` | Player and weapons (includes weapon, bullet and pickup sprites) |
| `public/assets/sprites/enemies/**`, `art-src/enemies/**` | Enemies |
| `public/assets/sprites/fx/**`, `art-src/fx/**` | Effects |
| `public/assets/packs/<team>.json` | Each team owns its Phaser asset-pack file |
| `public/assets/sprites/props/**` | Levels and content (props such as watchtowers, crates, barrels, gates, signs) |
| `public/assets/backgrounds/*/gen_*`, `art-src/backgrounds/gen/**`, `public/assets/ui/keyart/**` | Image generation |
| `docs/teams/<team>.md` | Each team's notes and design decisions (player, enemies, level, fx, ui-audio, qa, rules, engine, imagegen) |
| `tests/**`, `playwright.config.ts` | QA |
| `tools/check-phaser4.mjs`, `docs/PHASER4-RULES.md` (additions) | Phaser 4 rules checker |
| `tools/shot.mjs`, `tools/build-art.sh`, `tools/aseprite/kbe.lua`, `docs/*.md` | Lead |

**Campaign (Phase E):** missions have 3 parts. See [`docs/CAMPAIGN.md`](CAMPAIGN.md) for the part contract (`ctx.part`,
`part:start`, `stage:clear {part, final}`, the PartClear scene data, `?part=`, progress save).

## Integration pattern (how teams plug in without touching each other's files)

1. **Asset packs.** Each team lists its assets in `public/assets/packs/<team>.json` (Phaser pack-file format).
   `PreloadScene` loads every pack in the list `PACKS = ['engine','player','enemies','level','fx','ui']`.
   A missing pack file must not crash the game (Engine handles it gracefully).
2. **Registration.** Each team exposes one `register(ctx: RegisterContext)` function from its index file:
   - `src/entities/player/index.ts` → `registerPlayer`
   - `src/entities/enemies/index.ts` → `registerEnemies`
   - `src/level/index.ts` → `registerLevel`
   - `src/fx/index.ts` → `registerFx`
   - `src/ui/index.ts` → `registerUi`
   Engine creates no-op stubs of these at bootstrap so imports always resolve. Each team replaces its own stub.
   `GameScene` calls them all in `create()`.
3. **Spawn registry.** Levels place Tiled objects. The level loader calls `ctx.spawn(type, kind, props, x, y)`,
   which looks up a factory registered with `ctx.registry.register('<type>:<kind>', factory)`. Teams register
   their own factories. Unknown keys log a warning and spawn a magenta placeholder box (never crash).
4. **Event bus.** Cross-team communication goes **only** through the typed event bus (`src/core/events.ts`),
   never by importing another team's classes. Effects/UI/Audio listen; gameplay emits.
5. **Services.** Engine exposes services on the `GameContext` (see below): `damage`, `fx` (thin facade that
   emits events), `audio` (play by key, no-op if missing), `rng` (seeded), `pools`, `camera`, `input`, `state`.

## Core contract (Engine implements; signatures may be refined but keep names)

```ts
// src/core/contracts.ts
export type Team = 'player' | 'enemy' | 'neutral';
export type Action = 'left'|'right'|'up'|'down'|'jump'|'shoot'|'grenade'|'aimlock'|'pause'|'confirm'|'back';
export interface InputState {                 // one per player index (P2-ready)
  isDown(a: Action): boolean; justDown(a: Action): boolean; justUp(a: Action): boolean;
  aim(): { x: -1|0|1; y: -1|0|1 };              // raw 8-way direction from the d-pad/stick
}
export interface Hurtbox {                     // anything damageable registers one
  team: Team; body: Phaser.Physics.Arcade.Body | Phaser.Geom.Rectangle | (() => Phaser.Geom.Rectangle);
  hit(info: HitInfo): void;                    // apply damage, flash, etc.
  alive(): boolean; material?: 'flesh'|'metal'|'wood'|'shield';
  invulnerable?(): boolean;
}
export interface HitInfo { damage: number; source: Team; x: number; y: number; dirX: number; dirY: number; kind: 'bullet'|'melee'|'explosion'|'flame'|'contact'; weapon?: string }
export interface DamageService {
  register(h: Hurtbox): () => void;            // returns an unregister fn
  queryPoint(x: number, y: number, against: Team): Hurtbox | null;
  queryRect(r: Phaser.Geom.Rectangle, against: Team): Hurtbox[];
  applyRadial(x: number, y: number, radius: number, damage: number, source: Team, kind?: HitInfo['kind']): number; // returns hits
}
export interface SpawnFactory { (ctx: GameContext, x: number, y: number, props: Record<string, unknown>): Phaser.GameObjects.GameObject | void }
export interface RegisterContext extends GameContext { registry: { register(key: string, f: SpawnFactory): void } }
export interface GameContext {
  scene: Phaser.Scene; events: EventBus; input: InputState /* P1 */; inputFor(i: number): InputState;
  damage: DamageService; audio: AudioService; rng: Rng; state: RunState;
  pools: PoolService; camera: CameraService; tuning: Record<string, unknown>;
  level: LevelQuery;                           // filled by the level team's loader
  player(): PlayerQuery | null;                // filled by the player team's registration
  spawn(type: string, kind: string, props: Record<string, unknown>, x: number, y: number): unknown;
}
export interface PlayerQuery { x: number; y: number; alive(): boolean; centerY: number; facing: 1|-1; sprite: Phaser.GameObjects.GameObject }
export interface LevelQuery { solidAt(x: number, y: number): boolean; groundLayer?: Phaser.Tilemaps.TilemapLayer; bounds: Phaser.Geom.Rectangle; colliders(): Phaser.GameObjects.GameObject[] }
export interface CameraService { lock(x0: number, x1: number): void; unlock(): void; follow(t: Phaser.GameObjects.GameObject): void; shake(tier: 1|2|3|4): void; leftEdge(): number }
export interface AudioService { sfx(key: string, opts?: { volume?: number; detune?: number; x?: number }): void; music(key: string | null, opts?: { fade?: number }): void }
export interface RunState { score: number; lives: number; bombs: number; weapon: string; ammo: number; rescued: number; difficulty: 'arcade'|'casual'; checkpoint: { x: number; y: number } | null }
```

### Event catalog (`src/core/events.ts`): typed emitter, payload shapes fixed
| Event | Payload | Emitted by → typical listeners |
|---|---|---|
| `stage:start` / `stage:clear` | `{ stage }` | Engine/Level → UI, Audio |
| `checkpoint` | `{ x, y, id }` | Level → Engine state |
| `camera:lock` / `camera:unlock` | `{ x0, x1 }` / `{}` | Level → UI (the "GO!" arrow on unlock) |
| `player:spawn` / `player:died` / `player:respawn` | `{ x, y }` | Player → UI, FX, Audio |
| `player:shoot` | `{ weapon, x, y, angle }` | Player → FX (muzzle flash, casing), Audio |
| `player:jump` / `player:land` | `{ x, y, vy? }` | Player → FX (dust), Audio |
| `player:melee` | `{ x, y, facing }` | Player → FX, Audio |
| `player:grenade` | `{ x, y }` | Player → Audio |
| `weapon:changed` | `{ weapon, ammo }` | Player → UI (callout), Audio |
| `ammo:changed` / `bombs:changed` / `score:changed` / `lives:changed` / `rescued:changed` | `{ value }` | anyone → UI |
| `projectile:impact` | `{ x, y, material, weapon?, team }` | Player/Enemies → FX, Audio |
| `entity:hurt` | `{ x, y, team, kind, material }` | Damage service → FX (flash handled by entity) |
| `enemy:killed` | `{ x, y, kind, score, cause }` | Enemies → FX (hitstop), UI (popup), state |
| `explosion` | `{ x, y, size: 's'|'m'|'l'|'xl', team }` | anyone → FX (visual), Audio. **Damage is separate: call `damage.applyRadial`** |
| `pickup:collected` | `{ kind, x, y }` | Pickups → UI, Audio |
| `pow:freed` | `{ x, y, item }` | POW → UI, Audio |
| `boss:spawn` / `boss:hp` / `boss:phase` / `boss:defeated` | `{ name, hp, maxHp, phase }` | Enemies → UI (bar), FX, Audio |
| `fx:shake` | `{ tier: 1..4 }` | anyone → Camera service |
| `fx:hitstop` | `{ ms }` | anyone → Engine time scale |
| `fx:flash` | `{ color, ms }` | anyone → Camera |
| `fx:slowmo` | `{ scale, ms }` | anyone → Engine time |
| `ui:popup` | `{ x, y, text, color? }` | anyone → UI/FX |
| `game:over` / `game:continue` | `{}` | Engine → UI |

### Hitstop and time
Engine owns a global `TimeService`: hitstop pauses physics and anims for N ms (stacking takes the max).
Slow-mo scales `anims.globalTimeScale`, `tweens.timeScale` and `time.timeScale` by `s` (<1 = slower), and
sets `physics.world.timeScale = 1 / s`. **Arcade's timeScale is inverted: 2 = half speed.**
Aseprite tag names are **global animation keys**, so every tag must be unique across all sheets (prefix it with the sprite key). Gameplay code
uses `delta` from `update(time, delta)` and Phaser timers, so it respects time scaling.

### Depth (z-order) bands: use these constants from `src/core/depth.ts`
`BG_FAR=0..9` (parallax), `BG_NEAR=10..19`, `TILES_BACK=20`, `DECALS=25`, `PROPS=30`, `ENEMIES=40`, `POW=45`,
`PLAYER=50`, `PROJECTILES=60`, `FX=70`, `TILES_FRONT=80`, `FX_TOP=90`, `HUD` lives in its own scene.

## Tiled map contract (Levels team produces; Engine and Levels load)
- Authored as `art-src/maps/stage1.tmx` with an **embedded** tileset. Exported to `public/assets/maps/stage1.tmj`
  with `tiled-headless --export-map` (JSON, uncompressed CSV layer data).
- Tile layers: `bg_far_deco`, `back` (no collision), **`ground`** (tile property `collides=true`; `oneway=true`
  for jump-through platforms; `hazard=water|spikes`), `front` (drawn over actors).
- Object layer **`spawns`**: point/rect objects with `type` (Tiled "class") and properties:
  `player_start`; `enemy` + `kind`(+ `facing`, `patrol`, `wave`); `pow` + `item`; `pickup` + `kind`;
  `boss` + `kind=moosezilla`; `prop` + `kind` (crate, barrel, sandbag, explosive_barrel).
- Object layer **`triggers`**: rects with `type`: `camera_lock` (`id`, `release=clear|time`, `waves`),
  `checkpoint` (`id`), `stage_end`, `music` (`key`), `prompt` (`text`), `ambience` (`fx=snow|embers|fireflies`).
- Map properties: `music`, `parallax` (background set id), `name`.

## Debug and test hooks (Engine implements; QA depends on them)
URL params: `?scene=Title|Game&stage=1&part=1-2&x=<warpX>&god=1&debug=1&mute=1&seed=<n>&difficulty=casual&fast=1` (fast skips intros).
`window.__KBE` = `{ ready: boolean, game, version, state(): {...snapshot}, cheats: { god(on), warp(x), give(weapon), kill(), killEnemies(), hurt(dmg?), bombs(n), boss(), part(id, keepRun?), clearPart() }, press(action, ms?) }`.
`state()` returns `{ scene, part, fps, player:{x,y,alive,weapon,ammo,bombs,lives}, score, rescued, enemies, cameraX, bossHp, errors }`.
Teams may add fields with `registerDebug(key, () => value)`.

## Rules for every agent
- Read `docs/PHASER4-RULES.md` before writing any Phaser code. Run `npm run check:phaser4` and `npm run typecheck` before finishing.
- Verify visually: `node tools/shot.mjs --out /tmp/<team>-x.png --query "scene=Game&fast=1&mute=1" --steps '[...]'` and look at the PNG.
- No `git commit`, `git reset`, `git checkout`, `git stash` or any other git state change. The Lead commits between phases.
- No new npm deps without asking. Don't edit files outside your ownership.
- Put scratch output in `/tmp/kbe-<team>/`.
- Final report: what you built (paths), how to see it (shot.mjs command), tuning decisions, known issues,
  **Requests for other teams**.
