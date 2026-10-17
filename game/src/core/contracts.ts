// 🔒 Shared contract (owned by Engine). Other teams: propose changes in your report, don't edit.
// Every cross-team type lives here. Implementations live in the sibling modules of src/core/.
import type Phaser from 'phaser';
import type { EventBus } from './events';
import type { PartDef } from '../config/campaign';

export type Team = 'player' | 'enemy' | 'neutral';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'grenade' | 'aimlock' | 'pause' | 'confirm' | 'back';
export const ACTIONS: readonly Action[] = ['left', 'right', 'up', 'down', 'jump', 'shoot', 'grenade', 'aimlock', 'pause', 'confirm', 'back'];

export type Difficulty = 'arcade' | 'casual';

/** Materials a hurtbox can be made of. */
export type HurtMaterial = 'flesh' | 'metal' | 'wood' | 'shield';
/** Materials terrain can be made of (tile property `material`, default 'dirt'). */
export type TerrainMaterial = 'dirt' | 'stone' | 'metal' | 'wood' | 'snow' | 'water';
/** What a projectile hit (hurtbox material, or terrain material for tiles). */
export type ImpactMaterial = HurtMaterial | TerrainMaterial;

export type HazardKind = 'water' | 'spikes';
export type ExplosionSize = 's' | 'm' | 'l' | 'xl';
export type ShakeTier = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------- input

export interface Aim { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 }

/** One per player index (P2-ready). Edge states (justDown/justUp) are valid for the whole frame. */
export interface InputState {
    isDown(a: Action): boolean;
    justDown(a: Action): boolean;
    justUp(a: Action): boolean;
    /** Raw 8-way direction from d-pad / stick / arrow keys. The returned object is reused: read it, don't keep it. */
    aim(): Aim;
    /** Programmatic press (tests, cheats, demos). Holds the action down for `ms` real milliseconds. */
    press(a: Action, ms?: number): void;
    /** Milliseconds the action has been held (0 when up). Handy for charge mechanics. */
    heldMs(a: Action): number;
}

// ---------------------------------------------------------------- damage

export interface HitInfo {
    damage: number;
    source: Team;
    x: number;
    y: number;
    /** Normalized direction the hit travels (e.g. bullet velocity). Explosions: away from the center. */
    dirX: number;
    dirY: number;
    kind: 'bullet' | 'melee' | 'explosion' | 'flame' | 'contact';
    weapon?: string;
}

export type HurtboxShape = Phaser.Physics.Arcade.Body | Phaser.Geom.Rectangle | (() => Phaser.Geom.Rectangle);

/** Anything damageable registers one with `ctx.damage.register(h)`. */
export interface Hurtbox {
    team: Team;
    body: HurtboxShape;
    /**
     * Apply damage, flash, etc. The `info` object is reused by the engine: copy what you need, don't keep it.
     * Return `false` to say "the hit didn't connect" (projectile passes through, no entity:hurt event).
     */
    hit(info: HitInfo): void | boolean;
    alive(): boolean;
    material?: HurtMaterial;
    invulnerable?(): boolean;
    /** Optional label for debugging and `__KBE.state()` (e.g. 'grunt', 'knotz', 'crate'). */
    kind?: string;
    /** Optional: the game object that owns this hurtbox (debug overlay, warp, etc.). */
    owner?: Phaser.GameObjects.GameObject;
}

export interface DamageService {
    /** Register a hurtbox. Returns an unregister fn (also call it on destroy). */
    register(h: Hurtbox): () => void;
    /** First live hurtbox at the point that `source` is allowed to hit, or null. */
    queryPoint(x: number, y: number, source: Team): Hurtbox | null;
    /** First live hurtbox touching the circle that `source` may hit, skipping `exclude` entries. */
    queryCircle(x: number, y: number, r: number, source: Team, exclude?: readonly Hurtbox[]): Hurtbox | null;
    /** All live hurtboxes overlapping the rect that `source` may hit. Returns a shared array: valid until the next call. */
    queryRect(r: Phaser.Geom.Rectangle, source: Team): readonly Hurtbox[];
    /** Damage every hittable hurtbox touching the circle (full damage, no falloff). Returns the number of hits. */
    applyRadial(x: number, y: number, radius: number, damage: number, source: Team, kind?: HitInfo['kind'], weapon?: string): number;
    /** Deal a hit to a specific hurtbox (checks alive/invulnerable/god, emits entity:hurt). Returns true if it connected. */
    deal(h: Hurtbox, info: HitInfo): boolean;
    /** Team filter: player hits enemy+neutral, enemy hits player only, neutral hits everyone. */
    canHit(source: Team, target: Team): boolean;
    /** Number of live hurtboxes of a team. */
    count(team: Team): number;
    forEach(fn: (h: Hurtbox) => void): void;
    /** Resolve a hurtbox's shape into world space (shared rect, valid until the next call). */
    rectOf(h: Hurtbox): Phaser.Geom.Rectangle;
}

// ---------------------------------------------------------------- spawn / registration

export interface SpawnFactory {
    (ctx: GameContext, x: number, y: number, props: Record<string, unknown>): Phaser.GameObjects.GameObject | void;
}

export interface SpawnRegistry {
    /** Key is `'<type>:<kind>'` (e.g. 'enemy:grunt'), `'<type>:*'` (fallback for any kind), or `'<type>'` (no kind). Last registration wins. */
    register(key: string, f: SpawnFactory): void;
    has(key: string): boolean;
}

export interface RegisterContext extends GameContext {
    registry: SpawnRegistry;
}

// ---------------------------------------------------------------- queries filled by other teams

export interface PlayerQuery {
    x: number;
    y: number;
    alive(): boolean;
    centerY: number;
    facing: 1 | -1;
    sprite: Phaser.GameObjects.GameObject;
    /** Optional: teleport (used by warp cheat / ?x=). Engine falls back to moving `sprite` + its body. */
    teleport?(x: number, y: number): void;
}

export interface LevelQuery {
    /** Solid for bullets and walls. One-way platforms are NOT solid. */
    solidAt(x: number, y: number): boolean;
    groundLayer?: Phaser.Tilemaps.TilemapLayer;
    bounds: Phaser.Geom.Rectangle;
    /** Everything actors collide with: tilemap layers (one-way handled by the engine) and/or static bodies. */
    colliders(): Phaser.GameObjects.GameObject[];
    /** One-way (jump-through) platform at the point? */
    oneWayAt?(x: number, y: number): boolean;
    hazardAt?(x: number, y: number): HazardKind | null;
    materialAt?(x: number, y: number): TerrainMaterial;
    /** Optional (Phase B): world y of the water surface at x, or null if there is no water column there. */
    waterSurfaceAt?(x: number): number | null;
    /** Where the player starts (used when the level never spawns a `player_start`). */
    playerStart?: { x: number; y: number };
    /** Level name/number, for stage:start. */
    stage?: number;
    name?: string;
    /** Optional (Phase E): raw `material` tile property at the point, or null. Engine falls back to groundLayer. */
    surfaceAt?(x: number, y: number): string | null;
    /** Optional (Phase E): raw `material` tile property at the point, or null. Engine falls back to groundLayer. */
    surfaceAt?(x: number, y: number): string | null;
    /** Optional: number of POWs placed in the level (Results rank uses it; falls back to UI's estimate when absent). */
    powTotal?: number;
}

// ---------------------------------------------------------------- services

export interface CameraService {
    /** Lock the camera to an arena [x0, x1] (world px). Tweens there, clamps the player's walkable range. Emits camera:lock. */
    lock(x0: number, x1: number): void;
    /** Release the arena. Forward scrolling resumes. Emits camera:unlock. */
    unlock(): void;
    follow(t: Phaser.GameObjects.GameObject | null): void;
    shake(tier: ShakeTier): void;
    /** World x of the visible left edge. Players must not walk left of it (Metal Slug lock-left). */
    leftEdge(): number;
    /** World x of the visible right edge (arena lock right wall when locked). */
    rightEdge(): number;
    /** Clamp an x so an actor of half-width `halfW` stays inside the walkable camera range. */
    clampX(x: number, halfW?: number): number;
    isLocked(): boolean;
    /** Jump the camera to look at a point (warp, respawn), resetting the forward-only limit. */
    snapTo(x: number, y: number): void;
    /** Visible world rect (shared object, updated every frame). */
    view(): Phaser.Geom.Rectangle;
}

export interface AudioService {
    sfx(key: string, opts?: { volume?: number; detune?: number; x?: number }): void;
    music(key: string | null, opts?: { fade?: number }): void;
    /** Re-read volumes/mute from settings. */
    applySettings?(): void;
    destroy?(): void;
}

export interface RunState {
    score: number;
    lives: number;
    bombs: number;
    weapon: string;
    ammo: number;
    rescued: number;
    difficulty: Difficulty;
    checkpoint: { x: number; y: number; id?: string } | null;
    /** Switch weapon and ammo together (one weapon:changed carrying the new ammo). Pistol ammo = Infinity. */
    setWeapon(weapon: string, ammo: number): void;
}

export interface Rng {
    readonly seed: number;
    /** [0, 1) */
    next(): number;
    /** [min, max) float */
    range(min: number, max: number): number;
    /** [min, max] integer */
    int(min: number, max: number): number;
    chance(p: number): boolean;
    pick<T>(arr: readonly T[]): T;
    sign(): 1 | -1;
}

export interface Pool<T> {
    get(): T;
    release(item: T): void;
    readonly size: number;
    readonly free: number;
}

export interface PoolService {
    /** Create (or fetch, if the key exists) a pool. `reset` runs on release. */
    create<T>(key: string, factory: () => T, reset?: (item: T) => void, prealloc?: number): Pool<T>;
    get<T>(key: string): Pool<T> | undefined;
}

export interface TimeService {
    /** Effective gameplay time scale right now (0 during hitstop/pause). */
    readonly scale: number;
    /** True during hitstop or pause. */
    readonly frozen: boolean;
    readonly paused: boolean;
    /** Scaled gameplay clock in ms (stops during hitstop/pause). */
    readonly now: number;
    /** Freeze physics/anims/tweens/timers for `ms` real ms. Overlapping calls take the max. */
    hitstop(ms: number): void;
    /** Slow everything to `scale` (0..1) for `ms` real ms. */
    slowmo(scale: number, ms: number): void;
    /** Scale a raw `delta` (ms) by the current time scale. */
    dt(rawDeltaMs: number): number;
    setPaused(p: boolean): void;
}

export interface FxFacade {
    shake(tier: ShakeTier): void;
    hitstop(ms: number): void;
    flash(color: number, ms: number): void;
    slowmo(scale: number, ms: number): void;
    explosion(x: number, y: number, size: ExplosionSize, team: Team): void;
    popup(x: number, y: number, text: string, color?: number): void;
}

export interface LevelPhysics {
    /** Make `obj` (must have an Arcade body) collide with the level (solid + one-way tiles + level colliders). Returns a remover. */
    collideLevel(obj: Phaser.GameObjects.GameObject, opts?: { oneWay?: boolean }): () => void;
    /** Ignore one-way platforms for `ms` (drop-through on down+jump). */
    dropThrough(obj: Phaser.GameObjects.GameObject, ms?: number): void;
    /** True if the body is standing on a one-way platform (so down+jump should drop through). */
    onOneWay(obj: Phaser.GameObjects.GameObject): boolean;
    solidAt(x: number, y: number): boolean;
    oneWayAt(x: number, y: number): boolean;
    hazardAt(x: number, y: number): HazardKind | null;
    materialAt(x: number, y: number): TerrainMaterial;
    /** World y of the first standable surface (solid or one-way top) at x, scanning down from `fromY`. null if none. */
    groundBelow(x: number, fromY: number, maxDist?: number): number | null;
    /**
     * Phase B: world y of the water surface at x (top of the first `hazard=water` tile scanning down from the top
     * of the level), or null. Uses `LevelQuery.waterSurfaceAt` when the level provides it.
     */
    waterSurfaceAt(x: number): number | null;
    /**
     * Phase E: the raw `material` tile property at (x, y) on the ground/collision layer (e.g. 'ice'), or null when
     * there's no tile or no property. Unlike materialAt it doesn't default to 'dirt'. Probe just under the feet: (x, bottom + 1).
     */
    surfaceAt(x: number, y: number): string | null;
}

export interface FlowService {
    /** Continue after game over (UI Continue scene calls this). Resets score/lives/bombs, respawns. */
    continueGame(): void;
    /** Give up after game over: goes to Title (or restarts Game). */
    quit(): void;
    pause(): void;
    resume(): void;
    readonly over: boolean;
    /** Phase B: safe standing spot near `nearX` (on ground, not a hazard, inside the camera). y = ground surface. */
    safeSpot(nearX: number): { x: number; y: number };
    /** Phase B: true between a counted death of player `index` and the engine's game:respawn for it. */
    isDead(index?: number): boolean;
}

export interface DebugService {
    /** Add a field to `__KBE.state()`. */
    register(key: string, fn: () => unknown): void;
    /**
     * Override a cheat implementation: god, warp, give, kill (kills the player), killEnemies, hurt (normal hit
     * on the player, respects god/i-frames), bombs, boss.
     */
    cheat(name: string, fn: (...args: never[]) => void): void;
    /** ?debug=1 is on (debug overlay, physics debug). */
    readonly enabled: boolean;
    /** Dev mode or ?debug=1: cheats and ?god/?x are live. Gate QA-only fixtures (e.g. ?enemytest) on this. */
    readonly cheatsEnabled: boolean;
}

export interface UrlParams {
    scene?: string;
    stage: number;
    x?: number;
    god: boolean;
    debug: boolean;
    mute: boolean;
    seed?: number;
    difficulty?: Difficulty;
    fast: boolean;
    /** Phase E: ?part=1-2 (dev or ?debug=1 only; validated against CAMPAIGN). */
    part?: string;
    /** Test only: ?turbo=8 runs 8 fixed 1000/60 ms steps per browser frame (dev or ?debug=1). See __KBE.sim. */
    turbo?: number;
}

// ---------------------------------------------------------------- the context

export interface GameContext {
    scene: Phaser.Scene;
    /** Phase E: the campaign part being played (from scene data, ?part=, else '1-1'). The level loads `part.map`. */
    part: PartDef;
    events: EventBus;
    /** Player 1 input. */
    input: InputState;
    inputFor(i: number): InputState;
    damage: DamageService;
    audio: AudioService;
    rng: Rng;
    state: RunState;
    pools: PoolService;
    camera: CameraService;
    time: TimeService;
    fx: FxFacade;
    physics: LevelPhysics;
    projectiles: import('./projectiles').ProjectileSystem;
    flow: FlowService;
    debug: DebugService;
    params: UrlParams;
    /** Read-only view of all tuning files: tuning.engine, tuning.player, ... (whatever exists). */
    tuning: Record<string, unknown>;
    /** Engine cheat flags (god mode is enforced by the damage service). */
    cheats: { god: boolean };
    level: LevelQuery;
    /** Level team calls this once its map is built. */
    setLevel(q: LevelQuery): void;
    /** True once a real level (or the dev sandbox) called setLevel. */
    hasLevel(): boolean;
    player(i?: number): PlayerQuery | null;
    /** Player team calls this when its player exists (and `null` when it's removed). */
    setPlayer(q: PlayerQuery | null, i?: number): void;
    spawn(type: string, kind: string, props: Record<string, unknown>, x: number, y: number): unknown;
    /** Per-frame callback with scaled dt (ms, 0 during hitstop) and raw dt (ms). Returns an unsubscribe fn. Auto-cleared on scene shutdown. */
    onUpdate(fn: (dt: number, rawDt: number) => void): () => void;
}
