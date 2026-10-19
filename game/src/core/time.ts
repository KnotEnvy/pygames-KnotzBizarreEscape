// Global gameplay time: hitstop (freeze, max-stacking), slow-mo, pause.
// Applies the effective scale to Arcade physics, this scene's sprite animations, tweens and the scene clock, so
// gameplay that uses Phaser timers/tweens/anims respects it automatically. Animations are scaled per sprite
// (`sprite.anims.timeScale`) for THIS scene only: the AnimationManager's globalTimeScale is game-wide and would also
// freeze HUD/Pause menu animations during hitstop or pause. Manual movement should use `ctx.time.dt(delta)` or the
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
    /** The world's configured step rate, restored when slow-mo ends. */
    private baseFps = 0;

    constructor(private readonly scene: Phaser.Scene) {
        scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
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
                // Arcade timeScale is inverted: 2 = half speed. It stretches the real time between fixed steps, so at
                // 0.35× bodies would only step at ~21 Hz (visible stutter). Shrinking the step by the same factor
                // (fps / s) keeps one step per real 1/fps s, each advancing s/fps of game time: smooth slow-mo.
                if (this.baseFps === 0) this.baseFps = world.fps;
                world.setFPS(this.baseFps / s);
                world.timeScale = 1 / s;
            }
        }
        const list = sc.sys.updateList.getActive();
        for (let i = 0; i < list.length; i++) this.scaleAnims(list[i]);
        sc.tweens.timeScale = s;
        sc.time.timeScale = s;
    }

    private scaleAnims(go: Phaser.GameObjects.GameObject): void {
        const a = (go as Partial<Phaser.GameObjects.Sprite>).anims;
        if (a) a.timeScale = this.effective;
    }

    /** Sprites created during hitstop/slow-mo start at the current scale. */
    private onAdded(go: Phaser.GameObjects.GameObject): void {
        if (this.effective !== 1) this.scaleAnims(go);
    }

    private restore(): void {
        this.scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
        const world = this.scene.physics?.world;
        if (world && this.baseFps > 0) { world.setFPS(this.baseFps); world.timeScale = 1; }
    }
}
