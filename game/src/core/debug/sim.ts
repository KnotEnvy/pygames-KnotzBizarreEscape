// Test-only turbo simulation: __KBE.sim (cheat-gated: dev mode or ?debug=1).
//   sim.freeze()        stop the browser's RAF loop: the game only moves when a test advances it (deterministic)
//   sim.advance(ms, o?) run gameplay for `ms` of game time in fixed 1000/60 ms steps, as fast as the CPU allows,
//                       without rendering. o.every + o.onStep(simMs) call back every `every` ms (in-page probes),
//                       o.until() stops early, o.budgetMs caps the wall-clock time (default 20 s). Returns stats.
//   sim.render()        draw one frame now (screenshots while frozen)
//   sim.resume()        back to real time (RAF)
//   sim.turbo(n)        while running on RAF, every browser frame runs n fixed steps (n-1 headless + 1 rendered).
//                       Also ?turbo=n. 0/1 = off.
//   sim.events()        events recorded on the active run's bus (boss/stage/camera/part/player), oldest first
//   sim.actors()        every live enemy-team owner: kind, spawn tag (type/lock/wave), x/y, state, hp, view flags
//   sim.view()          camera view rect + locked flag
//   sim.stats()         { simMs, steps, wallMs, speedup, frozen, turbo }
// How time stays consistent: once the sim is engaged, the loop callback is wrapped so scenes see a virtual clock
// (real deltas while on RAF, fixed steps while advancing), and Date.now() follows the same clock (Phaser's
// TweenManager measures its delta with Date.now()). Scene clocks, timers, Arcade physics, anims, ctx.time (hitstop
// and slow-mo) all run off the step's (time, delta), so they all advance. game.loop.frame is bumped per step.
import Phaser from 'phaser';
import type { GameContext } from '../contracts';
import { spawnTagOf, type SpawnTag } from '../spawn';

export const SIM_DT = 1000 / 60;

export interface AdvanceOpts {
    /** Call onStep every `every` ms of game time (rounded to steps). */
    every?: number;
    onStep?: (simMs: number) => void;
    /** Stop early when this returns true (checked every step). */
    until?: () => boolean;
    /** Wall-clock cap (ms). The advance stops there and reports `aborted: 'budget'`. */
    budgetMs?: number;
}

export interface AdvanceResult { simMs: number; steps: number; wallMs: number; speedup: number; stopped: 'done' | 'until' | 'budget' | 'error'; error?: string }

export interface SimEvent { t: number; name: string; data: Record<string, unknown> }

export interface ActorInfo {
    kind: string; type: string; lock: string | null; wave: number | null; mapId: number | null;
    x: number; y: number; state: string; hp: number | null;
    /** Hurtbox rect overlaps the camera view (what killVisible would hit). */
    visible: boolean;
    /** Position inside the view (x in [left,right], y in [top-24, bottom+8], the arena's own in-view test). */
    inView: boolean;
    /** More than 32 px off the view (Enemy.ts stops updating it) and not in an exempt state. */
    frozen: boolean;
    boss: boolean;
}

export interface SimHandle {
    freeze(): void;
    resume(): void;
    advance(ms: number, opts?: AdvanceOpts): AdvanceResult;
    render(): void;
    turbo(n: number): void;
    events(since?: number): SimEvent[];
    actors(): ActorInfo[];
    /** The camera view rect (world px) and whether it's locked; null when Game isn't running. */
    view(): { x: number; y: number; w: number; h: number; locked: boolean } | null;
    stats(): { simMs: number; steps: number; wallMs: number; speedup: number; frozen: boolean; turbo: number; now: number };
}

/** States in which Enemy.ts keeps updating an off-view enemy (entry moves). */
const FREEZE_EXEMPT = new Set(['dead', 'descent', 'land', 'leap_entry']);
const RECORDED = ['boss:spawn', 'boss:phase', 'boss:defeated', 'stage:clear', 'stage:start', 'part:start', 'camera:lock', 'camera:unlock', 'player:died', 'game:respawn', 'game:over'] as const;
const MAX_EVENTS = 400;

type LoopCb = (time: number, delta: number) => void;
type GameInternals = Phaser.Game & { headlessStep(time: number, delta: number): void; loop: Phaser.Core.TimeStep & { callback: LoopCb; frame: number } };

export function createSim(game: Phaser.Game, getCtx: () => GameContext | null): SimHandle {
    const g = game as GameInternals;
    const realDateNow = Date.now.bind(Date);
    let engaged = false;
    let vt = 0;               // virtual game time handed to scenes
    let dateBase = 0;         // Date.now() = dateBase + vt once engaged
    let frozen = false;
    let turboN = 0;
    let simMs = 0, steps = 0, wallMs = 0;
    let stepping = false;
    const log: SimEvent[] = [];

    function engage(): boolean {
        if (engaged) return true;
        const loop = g.loop;
        if (!loop || typeof loop.callback !== 'function' || loop.callback === Phaser.Utils.NOOP) return false;
        const original = loop.callback;
        vt = loop.now || performance.now();
        dateBase = realDateNow() - vt;
        Date.now = () => Math.floor(dateBase + vt);
        loop.callback = (_time: number, delta: number): void => {
            if (stepping) return;
            if (turboN > 1) {
                const t0 = performance.now();
                for (let i = 0; i < turboN - 1; i++) headless();
                vt += SIM_DT; simMs += SIM_DT; steps++;
                g.loop.frame++;
                original(vt, SIM_DT);
                wallMs += performance.now() - t0;
                return;
            }
            vt += delta;
            original(vt, delta);
        };
        engaged = true;
        return true;
    }

    function headless(): void {
        vt += SIM_DT;
        simMs += SIM_DT;
        steps++;
        g.loop.frame++;
        g.headlessStep(vt, SIM_DT);
    }

    function attachRecorder(ctx: GameContext): void {
        for (const name of RECORDED) {
            ctx.events.on(name, (e: unknown) => {
                log.push({ t: Math.round(vt), name, data: plain(e) });
                if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS);
            });
        }
    }
    simRecorders.push(attachRecorder);

    const handle: SimHandle = {
        freeze() {
            if (!engage()) { console.warn('[__KBE.sim] the game loop has not started yet'); return; }
            g.loop.sleep();
            frozen = true;
        },
        resume() {
            if (!frozen) return;
            frozen = false;
            g.loop.wake();
            g.loop.resetDelta();
        },
        advance(ms, opts = {}) {
            if (!engage()) return { simMs: 0, steps: 0, wallMs: 0, speedup: 0, stopped: 'error', error: 'game loop not started' };
            if (stepping) return { simMs: 0, steps: 0, wallMs: 0, speedup: 0, stopped: 'error', error: 'advance() re-entered' };
            const n = Math.max(1, Math.round(ms / SIM_DT));
            const every = opts.every ? Math.max(1, Math.round(opts.every / SIM_DT)) : 0;
            const budget = opts.budgetMs ?? 20000;
            const t0 = performance.now();
            let i = 0;
            let stopped: AdvanceResult['stopped'] = 'done';
            let error: string | undefined;
            stepping = true;
            try {
                for (; i < n; i++) {
                    headless();
                    if (every && opts.onStep && (i + 1) % every === 0) opts.onStep(simMs);
                    if (opts.until && opts.until()) { i++; stopped = 'until'; break; }
                    if ((i & 7) === 7 && performance.now() - t0 > budget) { i++; stopped = 'budget'; break; }
                }
            } catch (e) {
                stopped = 'error';
                error = (e as Error)?.stack ?? String(e);
            } finally {
                stepping = false;
            }
            const wall = performance.now() - t0;
            wallMs += wall;
            // The RAF loop must not see the whole blocked interval as one giant frame.
            g.loop.resetDelta();
            const sim = i * SIM_DT;
            return { simMs: Math.round(sim), steps: i, wallMs: Math.round(wall), speedup: wall > 0 ? +(sim / wall).toFixed(2) : 0, stopped, error };
        },
        render() {
            const r = game.renderer;
            if (!r) return;
            r.preRender();
            game.scene.render(r);
            r.postRender();
        },
        turbo(n) {
            turboN = Math.max(0, Math.floor(Number(n) || 0));
            if (turboN > 1 && !engage()) game.events.once(Phaser.Core.Events.POST_STEP, () => { engage(); });
        },
        events(since = 0) { return log.filter(e => e.t >= since); },
        actors() { const ctx = getCtx(); return ctx ? listActors(ctx) : []; },
        view() {
            const ctx = getCtx();
            if (!ctx) return null;
            const v = ctx.camera.view();
            return { x: Math.round(v.x), y: Math.round(v.y), w: Math.round(v.width), h: Math.round(v.height), locked: ctx.camera.isLocked() };
        },
        stats() {
            return { simMs: Math.round(simMs), steps, wallMs: Math.round(wallMs), speedup: wallMs > 0 ? +(simMs / wallMs).toFixed(2) : 0, frozen, turbo: turboN, now: Math.round(vt) };
        }
    };
    return handle;
}

/** Recorder hooks: hooks.ts calls notifySimContext(ctx) when a run starts. */
const simRecorders: Array<(ctx: GameContext) => void> = [];
export function notifySimContext(ctx: GameContext): void {
    for (const f of simRecorders) f(ctx);
}

function plain(e: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!e || typeof e !== 'object') return out;
    for (const [k, v] of Object.entries(e as Record<string, unknown>)) {
        if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v;
    }
    return out;
}

type Owner = Phaser.GameObjects.GameObject & { x?: number; y?: number; hp?: number; state?: unknown; kind?: string };

/** Live enemy-team hurtbox owners (one entry per owner), with their spawn tag and view status. */
export function listActors(ctx: GameContext): ActorInfo[] {
    const v = ctx.camera.view();
    const seen = new Map<object, ActorInfo>();
    ctx.damage.forEach(h => {
        if (h.team !== 'enemy' || !h.alive() || !h.owner) return;
        const o = h.owner as Owner;
        const r = ctx.damage.rectOf(h);
        const vis = r.right >= v.left && r.x <= v.right && r.bottom >= v.top && r.y <= v.bottom;
        const prev = seen.get(o);
        if (prev) { prev.visible ||= vis; return; }
        const tag: SpawnTag | undefined = spawnTagOf(o);
        const x = o.x ?? r.centerX, y = o.y ?? r.bottom;
        const state = String(o.state ?? '');
        const m = 32;
        const near = x >= v.left - m && x <= v.right + m && y >= v.top - m && y <= v.bottom + m;
        seen.set(o, {
            kind: String(o.kind ?? h.kind ?? tag?.kind ?? '?'), type: tag?.type ?? '?',
            lock: tag?.lock ?? null, wave: tag?.wave ?? null, mapId: tag?.mapId ?? null,
            x: Math.round(x), y: Math.round(y), state, hp: typeof o.hp === 'number' ? Math.round(o.hp * 100) / 100 : null,
            visible: vis,
            inView: x >= v.left && x <= v.right && y >= v.top - 24 && y <= v.bottom + 8,
            frozen: !near && !FREEZE_EXEMPT.has(state),
            boss: tag?.type === 'boss'
        });
    });
    return [...seen.values()];
}
