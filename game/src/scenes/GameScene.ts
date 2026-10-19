// GameScene: resolves the campaign part (scene data → ?part= → '1-1') and the carried run state, builds the GameContext, lets every team register, falls back to the dev sandbox for anything
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
import { FIRST_PART, partById, type CarryState, type GameStartData, type PartDef } from '../config/campaign';
import { LEVEL } from '../config/tuning/level';
import { PARAMS } from '../core/params';
import { missionsToLoad, type MissionLoadData } from '../core/missionPacks';

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

    private startPart: PartDef = FIRST_PART;
    private startCarry: CarryState | null = null;
    /** This start only hands off to Preload to load a mission's packs (it restarts Game with the same data). */
    private loadingMission = false;

    constructor() { super('Game'); }

    /** `scene.start('Game', { part, carry })` (docs/CAMPAIGN.md). No data: ?part= (dev) or '1-1', fresh run state. */
    init(data?: GameStartData): void {
        const id = data?.part ?? PARAMS.part ?? FIRST_PART.id;
        const part = partById(id);
        if (!part) console.warn(`[game] unknown part '${id}': starting ${FIRST_PART.id}`);
        this.startPart = part ?? FIRST_PART;
        this.startCarry = data?.carry ?? null;
        // Phaser keeps the old settings.data when a later start() passes none (Title → Game after a Part II run):
        // consume it so that start is a fresh run, not a replay of the stale part + carry.
        this.sys.settings.data = {};
        // Phase G: mission N >= 2 packs load on demand (core/missionPacks.ts). Not loaded yet: let Preload load them
        // (its bar, retries and error screen), then it starts Game again with the same part and carry.
        const missions = missionsToLoad(this.startPart);
        this.loadingMission = missions.length > 0 && sceneExists(this, 'Preload');
        if (this.loadingMission) {
            setReady(false);
            const next: GameStartData = { part: this.startPart.id };
            if (this.startCarry) next.carry = this.startCarry;
            const load: MissionLoadData = { missions, next: { scene: 'Game', data: next } };
            this.scene.start('Preload', load);
        }
    }

    /**
     * The part as the level should load it. Until Levels ships `m1p1`, part 1-1 falls back to the old Mission 1
     * map key (LEVEL.map.key) so it stays playable; another part with a missing map keeps its key and the level
     * leaves the dev sandbox in place.
     */
    private resolvePart(part: PartDef): PartDef {
        const maps = this.cache.tilemap;
        if (maps.exists(part.map)) return part;
        if (part.id === FIRST_PART.id && maps.exists(LEVEL.map.key)) {
            console.info(`[game] map '${part.map}' not loaded: part ${part.id} uses '${LEVEL.map.key}'`);
            return { ...part, map: LEVEL.map.key };
        }
        console.warn(`[game] map '${part.map}' for part ${part.id} is not loaded`);
        return part;
    }

    create(): void {
        if (this.loadingMission) return; // Preload takes over at the next scene-manager step
        const { ctx, internals } = createGameContext(this, this.resolvePart(this.startPart));
        this.ctx = ctx;
        this.internals = internals;
        // Carried run state goes in before anyone registers: no change events, and the HUD reads the carried values.
        if (this.startCarry) internals.store.restore(this.startCarry);
        setActiveContext(ctx);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);

        registerEngineDefaults(ctx);
        for (const [name, fn] of REGISTRARS) {
            try {
                fn(ctx);
            } catch (e) {
                // One team's crash must not take the scene down: log it naming the team and keep going. Whatever it
                // registered before throwing stays; anything missing falls back to the dev sandbox below.
                console.error(`[game] register${name[0].toUpperCase()}${name.slice(1)}() from the '${name}' team threw; continuing without the rest of its registration:`, e);
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
        const p = ctx.part;
        ctx.events.emit('part:start', { id: p.id, mission: p.mission, part: p.part, title: p.title, location: p.location, briefing: [...p.briefing], final: p.final });
        setReady(true);
    }

    private preUpdate(_time: number, delta: number): void {
        this.internals.time.tick(delta);
    }

    update(_time: number, delta: number): void {
        if (this.loadingMission) return;
        const { ctx, internals } = this;
        internals.flow.update(delta);
        const dt = ctx.time.dt(delta);
        const ups = internals.updaters;
        for (let i = 0; i < ups.length; i++) {
            const fn = ups[i];
            try {
                fn(dt, delta);
            } catch (e) {
                this.updaterFailed(fn, e);
            }
            // It unsubscribed itself (or an earlier one) while running: the next subscriber slid into slot i.
            if (ups[i] !== fn) i--;
        }
        internals.projectiles.update(dt);
    }

    private readonly failedUpdaters = new WeakSet<object>();

    /** A ctx.onUpdate subscriber threw: log once per subscriber (with its error), keep the frame and the others running. */
    private updaterFailed(fn: object, e: unknown): void {
        if (this.failedUpdaters.has(fn)) return;
        this.failedUpdaters.add(fn);
        console.error('[game] a ctx.onUpdate subscriber threw (it keeps being called; further errors from it are muted):', e);
    }

    private postUpdate(_time: number, delta: number): void {
        this.internals.camera.update(delta);
        this.overlay?.update();
    }

    private teardown(): void {
        this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.preUpdate, this);
        this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
        const { ctx, internals } = this;
        // In-game overlays never outlive the run (part change, Results, Title, cheats.part).
        for (const k of ['HUD', 'Intro', 'Pause', 'Continue']) {
            if (sceneExists(this, k) && (this.scene.isActive(k) || this.scene.isPaused(k))) this.scene.stop(k);
        }
        internals.physics.destroy();
        internals.damage.clear();
        internals.updaters.length = 0;
        ctx.audio.destroy?.();
        setActiveContext(null);
        ctx.events.destroy();
        this.overlay = null;
    }
}
