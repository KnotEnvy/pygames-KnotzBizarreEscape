// Camera-lock arenas and their waves, plus the boss arena sequence.
//   wave arena: camera reaches the arena → ctx.camera.lock → wave 1 (members honour `delay`, `from=door`)
//               → every member dead → next wave → after the last wave (release=clear) unlock (camera:unlock → "GO!").
//               release=time unlocks after `time` seconds instead. Each wave start of a multi-wave arena shows a
//               short ui:prompt ("WAVE 1/3", "FINAL WAVE!").
//   boss arena: camera reaches it → the gate rumbles → gate bursts → ctx.spawn('boss', ...) with arenaX0/X1.
//               Moosezilla locks the camera itself and unlocks on boss:defeated.
// If something else unlocks the camera mid-arena (warp cheat), the arena relocks while the player is still
// inside it, otherwise it's abandoned.
import Phaser from 'phaser';
import type { GameContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import { spawnObject } from './spawner';
import { num, str, type LevelObject, type LevelRuntime } from './types';

type ArenaState = 'idle' | 'intro' | 'active' | 'boss' | 'releasing' | 'done' | 'skipped';

interface Member { obj: LevelObject; delay: number; doorOpened: boolean; go: Phaser.GameObjects.GameObject | null; spawned: boolean }

interface Arena {
    id: string;
    x0: number;
    x1: number;
    lockX0: number;
    release: 'clear' | 'time';
    timeMs: number;
    elapsed: number;
    waves: LevelObject[][];
    wave: number;
    members: Member[];
    timer: number;
    state: ArenaState;
    boss: LevelObject | null;
}

type Listener = () => void;

/** Tiny lock/unlock listener registry props subscribe to (alarm lights). */
export class ArenaHookSet {
    private readonly locks = new Map<string, Listener[]>();
    private readonly unlocks = new Map<string, Listener[]>();
    onLock(id: string, fn: Listener): void { (this.locks.get(id) ?? this.locks.set(id, []).get(id)!).push(fn); }
    onUnlock(id: string, fn: Listener): void { (this.unlocks.get(id) ?? this.unlocks.set(id, []).get(id)!).push(fn); }
    fire(id: string, locked: boolean): void { for (const fn of (locked ? this.locks : this.unlocks).get(id) ?? []) fn(); }
}

function isDead(go: Phaser.GameObjects.GameObject): boolean {
    if (!go.active) return true;
    const hp = (go as unknown as { hp?: unknown }).hp;
    return typeof hp === 'number' && hp <= 0;
}

export class ArenaController {
    readonly arenas: Arena[] = [];

    constructor(private readonly ctx: GameContext, private readonly rt: LevelRuntime, private readonly hooks: ArenaHookSet,
        triggers: LevelObject[], members: LevelObject[]) {
        for (const t of triggers) {
            if (t.type !== 'camera_lock') continue;
            const id = str(t.props.id, `lock${t.id}`);
            const mine = members.filter(m => str(m.props.lock) === id);
            const boss = mine.find(m => m.type === 'boss') ?? null;
            const byWave = new Map<number, LevelObject[]>();
            for (const m of mine) {
                if (m === boss) continue;
                const w = num(m.props.wave, 1);
                (byWave.get(w) ?? byWave.set(w, []).get(w)!).push(m);
            }
            const waves = [...byWave.keys()].sort((a, b) => a - b).map(k => byWave.get(k)!);
            this.arenas.push({
                id, x0: t.x, x1: t.x + t.width, lockX0: t.x,
                release: str(t.props.release, 'clear') === 'time' ? 'time' : 'clear',
                timeMs: num(t.props.time, LEVEL.arena.defaultReleaseSec) * 1000, elapsed: 0,
                waves, wave: -1, members: [], timer: 0, state: 'idle', boss
            });
        }
        this.arenas.sort((a, b) => a.x0 - b.x0);
        ctx.events.on('boss:spawn', () => { if (this.rt.gate && !this.rt.gate.smashed) this.rt.gate.smash(); });
        ctx.events.on('boss:defeated', () => {
            for (const a of this.arenas) {
                if (!a.boss) continue;
                if (a.state === 'boss' || a.state === 'intro') this.finish(a, false);
                // A boss spawned outside the arena flow (?enemytest=boss) must not leave the arena to re-run its intro
                // and spawn a second MOOSEZILLA after the clear.
                else if (a.state === 'idle') { a.state = 'done'; if (this.rt.gate && !this.rt.gate.smashed) this.rt.gate.smash(); }
            }
        });
    }

    /** First arena that is running (for debug / QA). */
    current(): Arena | null {
        return this.arenas.find(a => a.state === 'intro' || a.state === 'active' || a.state === 'boss' || a.state === 'releasing') ?? null;
    }

    /** Left edge of the arena with this id (boss cheat). */
    find(id: string): Arena | undefined { return this.arenas.find(a => a.id === id); }

    update(dt: number): void {
        const cam = this.ctx.camera;
        const v = cam.view();
        for (const a of this.arenas) {
            switch (a.state) {
                case 'idle':
                    // Boss arenas start once the gate is on screen (so its rumble is seen); wave arenas as the camera arrives.
                    if (a.boss ? v.right < (this.rt.gate?.x ?? a.x0 + v.width) + LEVEL.boss.gateOnScreen : v.x < a.x0 - LEVEL.arena.lockLead) break;
                    if (v.x > a.x1 - v.width + LEVEL.arena.skipPast && !a.boss) { a.state = 'skipped'; break; }
                    this.begin(a, v.x);
                    break;
                case 'intro':
                    if ((a.timer -= dt) <= 0) this.spawnBoss(a);
                    break;
                case 'active':
                    this.guardLock(a);
                    this.tickWave(a, dt);
                    break;
                case 'boss':
                    this.guardLock(a);
                    break;
                case 'releasing':
                    if ((a.timer -= dt) <= 0) this.finish(a, true);
                    break;
            }
        }
    }

    private begin(a: Arena, viewX: number): void {
        if (a.boss) {
            a.state = 'intro';
            a.timer = this.rt.gate ? LEVEL.boss.rumbleMs : 0;
            this.rt.gate?.rumble();
            this.hooks.fire(a.id, true);
            return;
        }
        // A warp can drop the camera inside the arena: lock from where it is so it never scrolls back left.
        a.lockX0 = Math.max(a.x0, Math.ceil(viewX));
        this.ctx.camera.lock(a.lockX0, a.x1);
        this.hooks.fire(a.id, true);
        a.state = 'active';
        this.startWave(a, 0);
    }

    private spawnBoss(a: Arena): void {
        this.rt.gate?.smash();
        const b = a.boss!;
        a.state = 'boss';
        spawnObject(this.ctx, { ...b, props: { ...b.props, arenaX0: a.x0, arenaX1: a.x1, facing: str(b.props.facing, 'left') } });
        if (!this.ctx.camera.isLocked()) this.ctx.camera.lock(a.x0, a.x1);
    }

    private startWave(a: Arena, i: number): void {
        a.wave = i;
        a.members = (a.waves[i] ?? []).map(obj => ({ obj, delay: num(obj.props.delay, 0), doorOpened: false, go: null, spawned: false }));
        if (a.members.length === 0) { this.waveCleared(a); return; }
        // Wave progress for the player: "WAVE 1/3" ... "FINAL WAVE!" (the unlock then shows the UI's GO!).
        const n = a.waves.length;
        if (n > 1) this.ctx.events.emit('ui:prompt', { text: i === n - 1 ? 'FINAL WAVE!' : `WAVE ${i + 1}/${n}`, ms: LEVEL.arena.waveCallMs });
    }

    private tickWave(a: Arena, dt: number): void {
        if (a.release === 'time' && (a.elapsed += dt) >= a.timeMs) { this.release(a); return; }
        if (a.timer > 0) {
            if ((a.timer -= dt) <= 0) this.startWave(a, a.wave + 1);
            return;
        }
        let allDead = true;
        for (const m of a.members) {
            if (!m.spawned) {
                allDead = false;
                if ((m.delay -= dt) > 0) continue;
                if (str(m.obj.props.from) === 'door' && !m.doorOpened) {
                    m.doorOpened = true;
                    const door = this.nearestDoor(m.obj.x);
                    if (door) { door.open(); m.delay = LEVEL.arena.doorDelayMs; continue; }
                }
                m.go = this.spawnMember(a, m.obj);
                if (m.go) m.spawned = true;
                else m.delay = LEVEL.activation.retryMs; // enemy cap: try again shortly
                continue;
            }
            if (m.go && !isDead(m.go)) allDead = false;
        }
        if (allDead) this.waveCleared(a);
    }

    private waveCleared(a: Arena): void {
        if (a.wave + 1 < a.waves.length) { a.timer = LEVEL.arena.waveGapMs; return; }
        if (a.release === 'clear') this.release(a);
    }

    private release(a: Arena): void {
        a.state = 'releasing';
        a.timer = LEVEL.arena.releaseDelayMs;
    }

    private finish(a: Arena, unlock: boolean): void {
        a.state = 'done';
        if (unlock && this.ctx.camera.isLocked()) this.ctx.camera.unlock();
        this.hooks.fire(a.id, false);
    }

    /** Someone else unlocked the camera (warp): relock while the player is inside, otherwise abandon a wave arena. */
    private guardLock(a: Arena): void {
        if (this.ctx.camera.isLocked()) return;
        const p = this.ctx.player();
        if (p && p.x >= a.x0 && p.x <= a.x1) {
            const v = this.ctx.camera.view();
            a.lockX0 = Math.max(a.x0, Math.min(Math.ceil(v.x), a.x1 - v.width));
            this.ctx.camera.lock(a.lockX0, a.x1);
            return;
        }
        if (a.boss) return; // the boss is still alive: relock when the player comes back
        a.state = 'skipped';
        this.hooks.fire(a.id, false);
    }

    private nearestDoor(x: number): { x: number; open(): void } | null {
        let best: { x: number; open(): void } | null = null;
        for (const d of this.rt.doors) if (Math.abs(d.x - x) <= 48 && (!best || Math.abs(d.x - x) < Math.abs(best.x - x))) best = d;
        return best;
    }

    /**
     * Wave members placed beyond the arena walls are pulled just inside them with a short patrol: enemies don't
     * walk toward the player and freeze >32 px off-view, so a member left outside would stall the wave forever.
     */
    private spawnMember(a: Arena, o: LevelObject): Phaser.GameObjects.GameObject | null {
        const e = LEVEL.arena.edgeInset;
        const right = Math.max(a.x1, a.lockX0 + this.ctx.camera.view().width);
        const x = Phaser.Math.Clamp(o.x, a.lockX0 + e, right - e);
        if (x === o.x) return spawnObject(this.ctx, o);
        let y = o.y;
        const kind = str(o.props.kind);
        if (kind !== 'drone' && kind !== 'paratrooper') y = this.ctx.physics.groundBelow(x, o.y - 48, 160) ?? o.y;
        const patrol = Math.min(num(o.props.patrol, LEVEL.arena.edgePatrol), LEVEL.arena.edgePatrol);
        return spawnObject(this.ctx, { ...o, props: { ...o.props, patrol } }, x, y);
    }

    debug(): unknown {
        const a = this.current();
        const all = this.arenas.map(r => `${r.id}:${r.state}`).join(' ');
        if (!a) return { active: null, arenas: all };
        const alive = a.members.filter(m => m.spawned && m.go && !isDead(m.go)).length;
        const pending = a.members.filter(m => !m.spawned).length;
        return { active: a.id, state: a.state, wave: a.wave + 1, waves: a.waves.length, alive, pending, x0: a.lockX0, x1: a.x1, arenas: all };
    }
}
