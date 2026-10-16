// GameScene: builds the GameContext, lets every team register, falls back to the dev sandbox for anything
// missing, launches the HUD, and drives the per-frame engine loop:
//   PRE_UPDATE  input sample → time tick (hitstop/slow-mo)
//   update      flow (pause/continue) → ctx.onUpdate subscribers (scaled dt) → projectiles
//   POST_UPDATE camera (after physics) → debug overlay
import Phaser from 'phaser';
import type { RegisterContext } from '../core/contracts';
import { createGameContext, type EngineInternals } from '../core/context';
import { sceneExists } from '../core/flow';
import { setActiveContext, setReady } from '../core/debug/hooks';
import { DebugOverlay } from '../core/debug/overlay';
import { buildSandboxLevel, installDevFx, registerEngineDefaults } from '../core/dev';
import { registerPlayer } from '../entities/player';
import { registerEnemies } from '../entities/enemies';
import { registerLevel } from '../level';
import { registerFx } from '../fx';
import { registerUi } from '../ui';

type Registrar = [name: string, fn: (ctx: RegisterContext) => void];

/** Order matters: listeners (fx, ui) first, then factories (player, enemies), then the level, which spawns. */
const REGISTRARS: Registrar[] = [
    ['fx', registerFx],
    ['ui', registerUi],
    ['player', registerPlayer],
    ['enemies', registerEnemies],
    ['level', registerLevel]
];

export class GameScene extends Phaser.Scene {
    private ctx!: RegisterContext;
    private internals!: EngineInternals;
    private overlay: DebugOverlay | null = null;

    constructor() { super('Game'); }

    create(): void {
        const { ctx, internals } = createGameContext(this);
        this.ctx = ctx;
        this.internals = internals;
        setActiveContext(ctx);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);

        registerEngineDefaults(ctx);
        for (const [name, fn] of REGISTRARS) {
            try {
                fn(ctx);
            } catch (e) {
                console.error(`[game] register ${name} failed:`, e);
            }
        }

        if (!ctx.hasLevel()) buildSandboxLevel(ctx);
        if (!ctx.player()) {
            const start = ctx.level.playerStart ?? { x: ctx.level.bounds.x + 48, y: ctx.level.bounds.y + ctx.level.bounds.height / 2 };
            ctx.spawn('player_start', '', {}, start.x, start.y);
        }
        installDevFx(ctx);
        internals.projectiles.prewarm(64);

        this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.preUpdate, this);
        this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);

        if (ctx.params.x !== undefined) this.time.delayedCall(0, () => window.__KBE.cheats.warp(ctx.params.x!));
        if (ctx.params.debug) this.overlay = new DebugOverlay(ctx, internals);

        if (sceneExists(this, 'HUD')) this.scene.launch('HUD');
        internals.store.stats.startedAt = ctx.time.now;
        ctx.events.emit('stage:start', { stage: ctx.level.stage ?? ctx.params.stage, name: ctx.level.name });
        setReady(true);
    }

    private preUpdate(_time: number, delta: number): void {
        this.internals.time.tick(delta);
    }

    update(_time: number, delta: number): void {
        const { ctx, internals } = this;
        internals.flow.update(delta);
        const dt = ctx.time.dt(delta);
        const ups = internals.updaters;
        for (let i = 0; i < ups.length; i++) ups[i](dt, delta);
        internals.projectiles.update(dt);
    }

    private postUpdate(_time: number, delta: number): void {
        this.internals.camera.update(delta);
        this.overlay?.update();
    }

    private teardown(): void {
        this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.preUpdate, this);
        this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
        const { ctx, internals } = this;
        if (this.scene.isActive('HUD')) this.scene.stop('HUD');
        internals.physics.destroy();
        internals.damage.clear();
        internals.updaters.length = 0;
        ctx.audio.destroy?.();
        setActiveContext(null);
        ctx.events.destroy();
        this.overlay = null;
    }
}
