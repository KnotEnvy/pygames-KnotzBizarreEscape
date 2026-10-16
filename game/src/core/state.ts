// Run state with change events. Assigning a field emits its *:changed event:
//   ctx.state.score += 100   → 'score:changed' { value }
//   ctx.state.weapon = 'hmg' → 'weapon:changed' { weapon, ammo }
// The engine also listens for enemy:killed (adds score), pow:freed (+1 rescued, +100) and checkpoint.
import type { Difficulty, RunState } from './contracts';
import type { EventBus } from './events';
import { ENGINE } from '../config/tuning/engine';

export class RunStateStore implements RunState {
    private _score = 0;
    private _lives: number = ENGINE.run.startLives;
    private _bombs: number = ENGINE.run.startBombs;
    private _weapon: string = ENGINE.run.startWeapon;
    private _ammo = Infinity;
    private _rescued = 0;
    difficulty: Difficulty;
    checkpoint: { x: number; y: number; id?: string } | null = null;
    /** Extra run stats for the results screen. */
    readonly stats = { kills: 0, shots: 0, hits: 0, startedAt: 0, deaths: 0 };

    constructor(private readonly events: EventBus, difficulty: Difficulty) {
        this.difficulty = difficulty;
        events.on('enemy:killed', e => { this.score += e.score; this.stats.kills++; });
        events.on('pow:freed', () => { this.rescued += 1; this.score += ENGINE.run.powScore; });
        events.on('checkpoint', e => { this.checkpoint = { x: e.x, y: e.y, id: e.id }; });
        events.on('player:shoot', () => { this.stats.shots++; });
        events.on('entity:hurt', e => { if (e.team !== 'player' && e.kind !== 'explosion') this.stats.hits++; });
    }

    get score(): number { return this._score; }
    set score(v: number) { v = Math.max(0, Math.floor(v)); if (v !== this._score) { this._score = v; this.events.emit('score:changed', { value: v }); } }

    get lives(): number { return this._lives; }
    set lives(v: number) { v = Math.max(0, v); if (v !== this._lives) { this._lives = v; this.events.emit('lives:changed', { value: v }); } }

    get bombs(): number { return this._bombs; }
    set bombs(v: number) {
        v = Math.max(0, Math.min(ENGINE.run.maxBombs, v));
        if (v !== this._bombs) { this._bombs = v; this.events.emit('bombs:changed', { value: v }); }
    }

    get weapon(): string { return this._weapon; }
    set weapon(w: string) { if (w !== this._weapon) { this._weapon = w; this.events.emit('weapon:changed', { weapon: w, ammo: this._ammo }); } }

    /** Infinity for the pistol. */
    get ammo(): number { return this._ammo; }
    set ammo(v: number) { v = Math.max(0, v); if (v !== this._ammo) { this._ammo = v; this.events.emit('ammo:changed', { value: v }); } }

    get rescued(): number { return this._rescued; }
    set rescued(v: number) { if (v !== this._rescued) { this._rescued = v; this.events.emit('rescued:changed', { value: v }); } }

    /** Switch weapon and ammo together (one weapon:changed with the right ammo). */
    setWeapon(weapon: string, ammo: number): void {
        this._ammo = ammo;
        this._weapon = '';
        this.weapon = weapon;
        this.events.emit('ammo:changed', { value: ammo });
    }

    /** Continue after game over: score resets (GDD), lives/bombs/weapon back to start. */
    resetForContinue(): void {
        this.score = 0;
        this.lives = ENGINE.run.startLives;
        this.bombs = ENGINE.run.startBombs;
        this.setWeapon(ENGINE.run.startWeapon, Infinity);
    }

    snapshot(): Omit<RunState, 'setWeapon'> {
        return {
            score: this._score, lives: this._lives, bombs: this._bombs, weapon: this._weapon, ammo: this._ammo,
            rescued: this._rescued, difficulty: this.difficulty, checkpoint: this.checkpoint
        };
    }
}
