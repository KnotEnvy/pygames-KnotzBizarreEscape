// Run state with change events. Assigning a field emits its *:changed event:
//   ctx.state.score += 100   → 'score:changed' { value }
//   ctx.state.weapon = 'hmg' → 'weapon:changed' { weapon, ammo }
// The engine also listens for enemy:killed (adds score), pow:freed (+1 rescued, +100) and checkpoint.
import type { Difficulty, RunState } from './contracts';
import type { EventBus } from './events';
import { ENGINE } from '../config/tuning/engine';
import type { CarryState, PartId, PartResult } from '../config/campaign';

/** JSON-safe ammo: Infinity ↔ -1 (also accepts null, which JSON.stringify makes of Infinity). */
export function encodeAmmo(a: number): number { return Number.isFinite(a) ? Math.max(0, a) : -1; }
export function decodeAmmo(a: unknown): number {
    if (a === null || a === undefined || a === -1 || a === Infinity) return Infinity;
    const n = Number(a);
    return Number.isFinite(n) && n >= 0 ? n : Infinity;
}

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
    /** Phase E: score earned in this part (positive score changes only; a continue's reset doesn't subtract). */
    partScore = 0;
    /** Phase E: rescued count when this part started (carry). */
    private rescuedAtStart = 0;
    /** Phase E: results of the parts cleared earlier this run (from the carry). */
    readonly earlierParts: PartResult[] = [];

    constructor(private readonly events: EventBus, difficulty: Difficulty) {
        this.difficulty = difficulty;
        events.on('enemy:killed', e => { this.score += e.score; this.stats.kills++; });
        events.on('pow:freed', () => { this.rescued += 1; this.score += ENGINE.run.powScore; });
        events.on('checkpoint', e => { this.checkpoint = { x: e.x, y: e.y, id: e.id }; });
        events.on('player:shoot', () => { this.stats.shots++; });
        events.on('entity:hurt', e => { if (e.team !== 'player' && e.kind !== 'explosion') this.stats.hits++; });
    }

    get score(): number { return this._score; }
    set score(v: number) {
        v = Math.max(0, Math.floor(v));
        if (v !== this._score) {
            if (v > this._score) this.partScore += v - this._score;
            this._score = v;
            this.events.emit('score:changed', { value: v });
        }
    }

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

    /**
     * Phase E: restore the run from the previous part's carry (before any team registers, so no events fire and
     * the HUD reads the carried values when it starts). Unknown/garbage fields fall back to the start values.
     */
    restore(c: CarryState): void {
        const int = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d);
        this._score = int(c.score, 0);
        this._lives = Math.max(1, int(c.lives, ENGINE.run.startLives));
        this._bombs = Math.min(ENGINE.run.maxBombs, int(c.bombs, ENGINE.run.startBombs));
        this._weapon = typeof c.weapon === 'string' && c.weapon ? c.weapon : ENGINE.run.startWeapon;
        this._ammo = decodeAmmo(c.ammo);
        this._rescued = int(c.rescued, 0);
        this.rescuedAtStart = this._rescued;
        if (c.difficulty === 'arcade' || c.difficulty === 'casual') this.difficulty = c.difficulty;
        this.earlierParts.length = 0;
        if (Array.isArray(c.parts)) this.earlierParts.push(...c.parts.map(p => ({ ...p })));
    }

    /** Phase E: this part's result so far. `timeMs` = gameplay clock since the part started. */
    partResult(id: PartId, nowMs: number): PartResult {
        const st = this.stats;
        return {
            id, score: this.partScore, rescued: Math.max(0, this._rescued - this.rescuedAtStart), kills: st.kills,
            deaths: st.deaths, shots: st.shots, hits: st.hits, timeMs: Math.max(0, Math.round(nowMs - st.startedAt))
        };
    }

    /**
     * Phase E: the carry for the next part. `result` (this part's) is appended to the earlier parts. Ammo is kept
     * as-is (Infinity survives scene data); use encodeAmmo() if you serialize it.
     */
    carry(result?: PartResult): CarryState {
        return {
            score: this._score, lives: this._lives, bombs: this._bombs, weapon: this._weapon, ammo: this._ammo,
            rescued: this._rescued, difficulty: this.difficulty,
            parts: [...this.earlierParts.map(p => ({ ...p })), ...(result ? [result] : [])]
        };
    }

    snapshot(): Omit<RunState, 'setWeapon'> {
        return {
            score: this._score, lives: this._lives, bombs: this._bombs, weapon: this._weapon, ammo: this._ammo,
            rescued: this._rescued, difficulty: this.difficulty, checkpoint: this.checkpoint
        };
    }
}
