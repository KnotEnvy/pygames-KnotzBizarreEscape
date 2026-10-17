// Builds the GameContext for one GameScene run. Every service hangs off it; teams receive it in register().
import Phaser from 'phaser';
import type { FxFacade, GameContext, LevelQuery, PlayerQuery, RegisterContext } from './contracts';
import { EventBus } from './events';
import { InputService } from './input';
import { GameTime } from './time';
import { DamageRegistry } from './damage';
import { CameraController } from './camera';
import { RunStateStore } from './state';
import { PoolRegistry } from './pools';
import { createRng } from './rng';
import { LevelCollision } from './physics';
import { ProjectileSystem } from './projectiles';
import { SpawnTable } from './spawn';
import { GameFlow } from './flow';
import { PARAMS } from './params';
import { settings } from './settings';
import { debugService, getActiveContext } from './debug/hooks';
import { createAudioService } from '../audio';
import { isSandboxLevel } from './dev/sandboxLevel';
import { ENGINE } from '../config/tuning/engine';
import { FIRST_PART, type PartDef } from '../config/campaign';

/** All tuning files, keyed by file name: ctx.tuning.engine, ctx.tuning.player, ... (module namespaces). */
const tuningModules = import.meta.glob('../config/tuning/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
const TUNING: Record<string, unknown> = {};
for (const [path, mod] of Object.entries(tuningModules)) {
    const name = path.split('/').pop()!.replace(/\.ts$/, '');
    TUNING[name] = mod;
}

/** Engine-internal handles (GameScene drives these each frame). */
export interface EngineInternals {
    time: GameTime;
    camera: CameraController;
    damage: DamageRegistry;
    physics: LevelCollision;
    projectiles: ProjectileSystem;
    spawns: SpawnTable;
    flow: GameFlow;
    store: RunStateStore;
    inputs: InputService[];
    updaters: Array<(dt: number, rawDt: number) => void>;
    levelSet: boolean;
}

const DEV_PLAYER_NAME = 'dev-player';

function emptyLevel(): LevelQuery {
    const bounds = new Phaser.Geom.Rectangle(0, 0, ENGINE.width, ENGINE.height);
    return { bounds, solidAt: () => false, colliders: () => [] };
}

export function createGameContext(scene: Phaser.Scene, part: PartDef = FIRST_PART): { ctx: RegisterContext; internals: EngineInternals } {
    const events = new EventBus();
    const cheats = { god: PARAMS.god };
    const time = new GameTime(scene);
    const store = new RunStateStore(events, settings.difficulty);
    const damage = new DamageRegistry(events, cheats);
    const physics = new LevelCollision(scene);
    const spawns = new SpawnTable();
    const players: Array<PlayerQuery | null> = [];
    const inputs: InputService[] = [new InputService(scene, 0)];
    const updaters: Array<(dt: number, rawDt: number) => void> = [];
    const camera = new CameraController(scene, events, () => players[0] ?? null);

    events.on('fx:hitstop', e => time.hitstop(e.ms));
    events.on('fx:slowmo', e => time.slowmo(e.scale, e.ms));

    const fx: FxFacade = {
        shake: tier => events.emit('fx:shake', { tier }),
        hitstop: ms => events.emit('fx:hitstop', { ms }),
        flash: (color, ms) => events.emit('fx:flash', { color, ms }),
        slowmo: (scale, ms) => events.emit('fx:slowmo', { scale, ms }),
        explosion: (x, y, size, team) => events.emit('explosion', { x, y, size, team }),
        popup: (x, y, text, color) => events.emit('ui:popup', { x, y, text, color })
    };

    const internals = {} as EngineInternals;
    const ctx = {
        scene,
        part,
        events,
        input: inputs[0],
        inputFor(i: number) {
            if (!inputs[i]) inputs[i] = new InputService(scene, i);
            return inputs[i];
        },
        damage,
        audio: createAudioService(scene),
        rng: createRng(PARAMS.seed),
        state: store,
        pools: new PoolRegistry(),
        camera,
        time,
        fx,
        physics,
        projectiles: undefined as unknown as ProjectileSystem,
        flow: undefined as unknown as GameFlow,
        debug: debugService,
        params: PARAMS,
        tuning: TUNING,
        cheats,
        level: emptyLevel(),
        registry: spawns,
        setLevel(q: LevelQuery) {
            ctx.level = q;
            internals.levelSet = true;
            physics.setLevel(q);
            camera.setBounds(q.bounds);
            scene.physics.world.setBounds(q.bounds.x, q.bounds.y, q.bounds.width, q.bounds.height + 64, true, true, false, false);
            const b = q.bounds;
            events.emit('level:ready', { x: b.x, y: b.y, width: b.width, height: b.height, stage: q.stage ?? PARAMS.stage, name: q.name, sandbox: isSandboxLevel(q) });
        },
        hasLevel: () => internals.levelSet,
        player: (i = 0) => players[i] ?? null,
        setPlayer(q: PlayerQuery | null, i = 0) {
            const prev = players[i];
            players[i] = q;
            // The dev placeholder steps aside when a real player registers in its slot.
            if (q && prev && prev.sprite !== q.sprite && prev.sprite.name === DEV_PLAYER_NAME && prev.sprite.scene) {
                prev.sprite.destroy();
                console.info('[sandbox] a real player registered: dev placeholder player removed');
            }
            if (i === 0) camera.follow(q ? q.sprite : null);
        },
        spawn(type: string, kind: string, props: Record<string, unknown>, x: number, y: number) {
            return spawns.spawn(ctx, type, kind, props ?? {}, x, y);
        },
        onUpdate(fn: (dt: number, rawDt: number) => void) {
            updaters.push(fn);
            return () => { const i = updaters.indexOf(fn); if (i >= 0) updaters.splice(i, 1); };
        }
    } satisfies RegisterContext as RegisterContext;

    const projectiles = new ProjectileSystem(scene, events, damage, physics, camera);
    const flow = new GameFlow(ctx, store);
    ctx.projectiles = projectiles;
    ctx.flow = flow;

    Object.assign(internals, { time, camera, damage, physics, projectiles, spawns, flow, store, inputs, updaters, levelSet: false });
    return { ctx, internals };
}

/** The running GameScene's context, from any scene (HUD, Pause, Continue...). Null when Game isn't running. */
export function getContext(): GameContext | null {
    return getActiveContext();
}
