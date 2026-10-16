// 🔒 Shared contract (owned by Engine). Typed event bus + the full event catalog.
// Cross-team communication goes ONLY through these events. Gameplay emits; FX/UI/Audio listen.
import Phaser from 'phaser';
import type { Difficulty, ExplosionSize, HitInfo, ImpactMaterial, ShakeTier, Team } from './contracts';

type Empty = Record<string, never>;
interface Pos { x: number; y: number }
interface PlayerPos extends Pos { /** Player index (0 = P1). Omitted means 0. */ index?: number }
interface Value { value: number }
interface BossInfo { name: string; hp: number; maxHp: number; phase: number }

/** The event catalog. Payload shapes are fixed; add new events here (Engine) rather than ad-hoc strings. */
export interface GameEvents {
    // stage / level
    'stage:start': { stage: number; name?: string };
    'stage:clear': { stage: number };
    'checkpoint': { x: number; y: number; id: string };
    'camera:lock': { x0: number; x1: number };
    'camera:unlock': Empty;

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

    // feel (anyone emits; Engine services react)
    'fx:shake': { tier: ShakeTier };
    'fx:hitstop': { ms: number };
    'fx:flash': { color: number; ms: number };
    'fx:slowmo': { scale: number; ms: number };
    /** Ambient particles requested by a level trigger (null = stop). FX listens. */
    'fx:ambience': { kind: 'snow' | 'embers' | 'fireflies' | null };
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
export class EventBus {
    private readonly ee = new Phaser.Events.EventEmitter();

    on<K extends EventKey>(key: K, fn: Handler<K>, context?: unknown): () => void {
        this.ee.on(key, fn, context);
        return () => { this.ee.off(key, fn, context); };
    }

    once<K extends EventKey>(key: K, fn: Handler<K>, context?: unknown): () => void {
        this.ee.once(key, fn, context);
        return () => { this.ee.off(key, fn, context); };
    }

    off<K extends EventKey>(key: K, fn?: Handler<K>, context?: unknown): void {
        this.ee.off(key, fn, context);
    }

    emit<K extends EventKey>(key: K, payload: GameEvents[K]): void {
        this.ee.emit(key, payload);
    }

    listenerCount(key: EventKey): number {
        return this.ee.listenerCount(key);
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
        this.ee.removeAllListeners();
    }
}
