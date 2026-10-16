// Global gameplay time: hitstop (freeze, max-stacking), slow-mo, pause.
// Applies the effective scale to Arcade physics, animations, tweens and the scene clock, so gameplay that uses
// Phaser timers/tweens/anims respects it automatically. Manual movement should use `ctx.time.dt(delta)` or the
// scaled dt passed to `ctx.onUpdate(fn)`.
import Phaser from 'phaser';
import type { TimeService } from './contracts';
import { ENGINE } from '../config/tuning/engine';

export class GameTime implements TimeService {
    private hitstopMs = 0;
    private slowMs = 0;
    private slowScale = 1;
    private pausedFlag = false;
    private effective = 1;
    private applied = -1;
    private clock = 0;

    constructor(private readonly scene: Phaser.Scene) {
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.restore, this);
    }

    get scale(): number { return this.effective; }
    get frozen(): boolean { return this.effective === 0; }
    get paused(): boolean { return this.pausedFlag; }
    get now(): number { return this.clock; }

    hitstop(ms: number): void {
        this.hitstopMs = Math.max(this.hitstopMs, Math.min(ms, ENGINE.maxHitstopMs));
        this.refresh();
    }

    slowmo(scale: number, ms: number): void {
        this.slowScale = Phaser.Math.Clamp(scale, 0.05, 1);
        this.slowMs = ms;
        this.refresh();
    }

    setPaused(p: boolean): void {
        this.pausedFlag = p;
        this.refresh();
    }

    dt(rawDeltaMs: number): number {
        return Math.min(rawDeltaMs, ENGINE.maxDeltaMs) * this.effective;
    }

    /** Engine calls this once per frame (PRE_UPDATE) with real ms. */
    tick(rawDeltaMs: number): void {
        const d = Math.min(rawDeltaMs, ENGINE.maxDeltaMs);
        if (!this.pausedFlag) {
            if (this.hitstopMs > 0) this.hitstopMs = Math.max(0, this.hitstopMs - d);
            if (this.slowMs > 0) {
                this.slowMs -= d;
                if (this.slowMs <= 0) { this.slowMs = 0; this.slowScale = 1; }
            }
        }
        this.refresh();
        this.clock += d * this.effective;
    }

    private refresh(): void {
        this.effective = this.pausedFlag || this.hitstopMs > 0 ? 0 : this.slowScale;
        if (this.effective === this.applied) return;
        this.applied = this.effective;
        this.apply(this.effective);
    }

    private apply(s: number): void {
        const sc = this.scene;
        const world = sc.physics?.world;
        if (world) {
            if (s === 0) { if (!world.isPaused) world.pause(); }
            else {
                if (world.isPaused) world.resume();
                // Arcade timeScale is inverted: 2 = half speed.
                world.timeScale = 1 / s;
            }
        }
        sc.anims.globalTimeScale = s;
        sc.tweens.timeScale = s;
        sc.time.timeScale = s;
    }

    private restore(): void {
        // AnimationManager is global: don't leave other scenes frozen.
        this.scene.anims.globalTimeScale = 1;
    }
}
