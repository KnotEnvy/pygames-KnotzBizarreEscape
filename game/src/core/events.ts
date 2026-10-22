// 🔒 Shared contract (owned by Engine). Typed event bus + the full event catalog.
// Cross-team communication goes ONLY through these events. Gameplay emits; FX/UI/Audio listen.
import Phaser from 'phaser';
import type { Difficulty, ExplosionSize, HitInfo, ImpactMaterial, ShakeTier, Team } from './contracts';
import type { PartId } from '../config/campaign';

type Empty = Record<string, never>;
interface Pos { x: number; y: number }
interface PlayerPos extends Pos { /** Player index (0 = P1). Omitted means 0. */ index?: number }
interface Value { value: number }
interface BossInfo {
    name: string; hp: number; maxHp: number; phase: number;
    /** Optional (Phase B): boss body position, so FX can place vents/explosions without guessing. */
    x?: number; y?: number;
}
/** World rect in px (plain data, safe to keep). */
interface Rect { x: number; y: number; width: number; height: number }

/** The event catalog. Payload shapes are fixed; add new events here (Engine) rather than ad-hoc strings. */
export interface GameEvents {
    // stage / level
    'stage:start': { stage: number; name?: string };
    /**
     * Phase E: `part`/`final` are filled by the Engine when the emitter leaves them out (listeners registered after
     * the engine's flow see them; the flow is created first, so every team listener does).
     */
    'stage:clear': { stage: number; part?: PartId; final?: boolean };
    /** Phase E: Engine emits right after stage:start, once every team registered. UI title card, Audio. */
    'part:start': { id: PartId; mission: number; part: number; title: string; location: string; briefing: string[]; final: boolean };
    'checkpoint': { x: number; y: number; id: string };
    'camera:lock': { x0: number; x1: number };
    'camera:unlock': Empty;
    /** Engine emits whenever ctx.setLevel publishes a level (sandbox included: stage 0). Phase B. */
    'level:ready': Rect & { stage: number; name?: string; sandbox: boolean };

    // player
    'player:spawn': PlayerPos;
    'player:died': PlayerPos;
    'player:respawn': PlayerPos;
    /** angle in radians (0 = right, -PI/2 = up). */
    'player:shoot': { weapon: string; x: number; y: number; angle: number };
    'player:jump': PlayerPos & { vy?: number };
    'player:land': PlayerPos & { vy?: number };
    'player:melee': Pos & { facing: 1 | -1 };
    'player:grenade': Pos;
    'weapon:changed': { weapon: string; ammo: number };
    /** Enemies emit at the muzzle socket when an enemy fires (FX: enemy muzzle flash; Audio). angle in radians. Phase B. */
    'enemy:shoot': { kind: string; weapon?: string; x: number; y: number; angle: number };

    // run state (emitted by the RunState store whenever the value changes)
    'ammo:changed': Value;
    'bombs:changed': Value;
    'score:changed': Value;
    'lives:changed': Value;
    'rescued:changed': Value;

    // combat
    'projectile:impact': Pos & { material: ImpactMaterial; weapon?: string; team: Team };
    'entity:hurt': Pos & { team: Team; kind: HitInfo['kind']; material: ImpactMaterial; damage: number; entity?: string };
    /** Enemies emit. Engine adds `score` to the run score. */
    'enemy:killed': Pos & { kind: string; score: number; cause: HitInfo['kind'] | string };
    /** Visual/audio only. Damage is separate: call ctx.damage.applyRadial. */
    'explosion': Pos & { size: ExplosionSize; team: Team };
    'pickup:collected': Pos & { kind: string };
    /** POW team emits. Engine adds +1 rescued and +100 score. */
    'pow:freed': Pos & { item: string };

    // boss
    'boss:spawn': BossInfo;
    'boss:hp': BossInfo;
    'boss:phase': BossInfo;
    'boss:defeated': BossInfo;
    /** Phase E: a boss stomp/slam landed at (x, y). Levels (ice cracks), FX, Audio. `power` ≈ 1 normal, 2+ heavy. */
    'boss:stomp': Pos & { power: number };
    /** Phase F (docs/JUICE.md): arena lifecycle from the level's ArenaController. */
    'arena:start': { id: string; x0: number; x1: number; boss: boolean };
    'arena:wave': { id: string; wave: number; waves: number };
    'arena:clear': { id: string };
    /** A boss arena's intro begins (gate rumble), before boss:spawn. Drives the camera cinematic, WARNING banner, siren. */
    'boss:intro': { name: string; x: number; y: number };
    /** The level's background director played a background moment (zeppelin, avalanche, ...). */
    'bg:event': { id: string; x?: number; y?: number };

    // feel (anyone emits; Engine services react)
    'fx:shake': { tier: ShakeTier };
    'fx:hitstop': { ms: number };
    'fx:flash': { color: number; ms: number };
    'fx:slowmo': { scale: number; ms: number };
    /** Ambient particles requested by a level trigger (null = stop). FX listens. */
    'fx:ambience': { kind: 'snow' | 'embers' | 'fireflies' | 'train' | 'tunnel' | 'blizzard' | 'swamp' | 'rain' | 'storm' | 'fog' | 'river' | null; drift?: number };
    /**
     * Phase G (docs/MISSION2.md): something touched water. Player (wading steps, landing, sinking), Enemies (piranha leaps,
     * lurkers rising, bosses surfacing/submerging), Levels (sinking logs) emit; FX (splash + rings) and Audio (splash_s..xl) listen.
     */
    'water:splash': Pos & { size: 's' | 'm' | 'l' | 'xl'; kind?: 'step' | 'enter' | 'leap' | 'surface' | 'sink' };
    /**
     * Phase G fix round: FX emits this when a lightning flash actually happens. FX is the single gate for lightning
     * (global rate limit, reduced flash). Others request lightning via `fx:emit { effect: 'bg_lightning' }` and react
     * here (Levels' sky crossfade, Audio's thunder). `strength` is 0..1 after reduced-flash dimming.
     */
    'fx:lightning': { x?: number; y?: number; strength: number; double?: boolean };
    /**
     * Generic spatial one-shot effect (Phase B). Anyone emits; FX listens and maps `effect` to a recipe.
     * Suggested effect ids: 'dust_run', 'dust_skid', 'dust_land', 'splash', 'waterfall', 'vent_steam', 'debris',
     * 'shield_spark', 'shockwave', 'muzzle_enemy', 'casing', 'scorch'. Unknown ids are ignored by FX.
     * `angle` in radians, `count` = intensity hint, `scale` = size multiplier.
     */
    'fx:emit': { effect: string; x: number; y: number; angle?: number; count?: number; scale?: number; material?: ImpactMaterial; team?: Team; width?: number; height?: number; duration?: number; speed?: number; scrollFactor?: number; bg?: boolean };
    /**
     * Ambient zone add/remove (Phase B). Levels emit `active: true` when a zone exists (usually at load) and
     * `active: false` to remove it; FX keeps a registry keyed by `id` and runs the zone while it's on camera.
     */
    'fx:zone': Rect & { id: string; kind: 'snow' | 'embers' | 'fireflies' | string; active: boolean };
    'ui:popup': Pos & { text: string; color?: number };
    /** Level "prompt" trigger (diegetic tutorial text). UI listens. */
    'ui:prompt': { text: string; ms?: number };

    // flow (Engine emits)
    'game:over': Empty;
    'game:continue': Empty;
    /** Engine → Player: revive at (x, y) (y = ground surface under the feet). Player then emits player:respawn. */
    'game:respawn': PlayerPos;
    'game:pause': { paused: boolean };
    'settings:changed': { difficulty: Difficulty };
}

export type EventKey = keyof GameEvents;
export type Handler<K extends EventKey> = (payload: GameEvents[K]) => void;

/**
 * Strongly typed event bus. One bus per GameScene run (created by the engine, destroyed with the scene),
 * reachable from any scene via `getContext(game)?.events`.
 *
 *   ctx.events.on('enemy:killed', e => ..., this);       // returns an off() fn
 *   ctx.events.emit('explosion', { x, y, size: 'm', team: 'player' });
 *   ctx.events.scoped(this).on(...)                       // auto-removed when `this` scene shuts down
 */
interface Listener { fn: (payload: never) => void; context: unknown; once: boolean }

export class EventBus {
    /** key → listeners. Arrays are copy-on-write so emit never allocates and handlers may on/off while emitting. */
    private readonly map = new Map<string, Listener[]>();

    on<K extends EventKey>(key: K, fn: Handler<K>, context?: unknown): () => void {
        this.add(key, fn, context, false);
        return () => { this.off(key, fn, context); };
    }

    once<K extends EventKey>(key: K, fn: Handler<K>, context?: unknown): () => void {
        this.add(key, fn, context, true);
        return () => { this.off(key, fn, context); };
    }

    /** Remove `fn` (all of the key's listeners when omitted). With `context`, only that fn+context pair. */
    off<K extends EventKey>(key: K, fn?: Handler<K>, context?: unknown): void {
        const list = this.map.get(key);
        if (!list) return;
        if (!fn) { this.map.delete(key); return; }
        const next = list.filter(l => l.fn !== fn || (context !== undefined && l.context !== context));
        if (next.length === 0) this.map.delete(key);
        else if (next.length !== list.length) this.map.set(key, next);
    }

    /**
     * Call every listener. A listener that throws is logged (naming the event) and the remaining listeners
     * still run, so one team's bug can't break another team's reaction or the emitter's own code.
     */
    emit<K extends EventKey>(key: K, payload: GameEvents[K]): void {
        const list = this.map.get(key);
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
            const l = list[i];
            if (l.once) this.removeListener(key, l);
            try {
                (l.fn as (p: GameEvents[K]) => void).call(l.context, payload);
            } catch (e) {
                console.error(`[events] a '${key}' listener threw:`, e);
            }
        }
    }

    listenerCount(key: EventKey): number {
        return this.map.get(key)?.length ?? 0;
    }

    /** Listeners on every key (leak checks across part restarts). */
    totalListeners(): number {
        let n = 0;
        for (const l of this.map.values()) n += l.length;
        return n;
    }

    /** A view of this bus whose listeners are removed automatically when `scene` shuts down. */
    scoped(scene: Phaser.Scene): Pick<EventBus, 'on' | 'once' | 'emit'> {
        const offs: Array<() => void> = [];
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { for (const off of offs) off(); offs.length = 0; });
        return {
            on: (key, fn, context) => { const off = this.on(key, fn, context); offs.push(off); return off; },
            once: (key, fn, context) => { const off = this.once(key, fn, context); offs.push(off); return off; },
            emit: (key, payload) => this.emit(key, payload)
        };
    }

    destroy(): void {
        this.map.clear();
    }

    private add(key: string, fn: unknown, context: unknown, once: boolean): void {
        const list = this.map.get(key);
        const l: Listener = { fn: fn as Listener['fn'], context, once };
        this.map.set(key, list ? [...list, l] : [l]);
    }

    private removeListener(key: string, l: Listener): void {
        const list = this.map.get(key);
        if (!list) return;
        const next = list.filter(x => x !== l);
        if (next.length === 0) this.map.delete(key); else this.map.set(key, next);
    }
}
