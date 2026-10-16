// window.__KBE test/debug hooks (QA depends on these). Installed by main.ts before the game boots.
//   __KBE.ready, __KBE.game, __KBE.version, __KBE.state(), __KBE.press(action, ms)
//   __KBE.cheats.{god,warp,give,kill,killEnemies,hurt,bombs,boss}
// kill() kills the PLAYER (QA's death/game-over flow); killEnemies() clears every live enemy hurtbox.
// Cheats are gated by CHEATS_ENABLED (dev mode or ?debug=1): in a production build without ?debug=1 every cheat
// is a no-op that warns once. state(), press() and ready stay available everywhere (they can't change the run).
import Phaser from 'phaser';
import type { Action, DebugService, GameContext, HitInfo, Hurtbox } from '../contracts';
import { ACTIONS } from '../contracts';
import { liveInputs } from '../input';
import { CHEATS_ENABLED, PARAMS } from '../params';
import { isSandboxLevel } from '../dev/sandboxLevel';

type CheatFn = (...args: never[]) => void;

const extras = new Map<string, () => unknown>();
/** Keys registered through ctx.debug.register: run-scoped, dropped when the run ends. */
const runKeys = new Set<string>();
const cheatOverrides = new Map<string, CheatFn>();
const errors: string[] = (window as unknown as { __KBE_ERRORS?: string[] }).__KBE_ERRORS ??= [];
const MAX_ERRORS = 200;
/** Record an error, keeping only the newest MAX_ERRORS (a per-frame error must not grow memory forever). */
function noteError(m: string): void {
    errors.push(m);
    if (errors.length > MAX_ERRORS) errors.splice(0, errors.length - MAX_ERRORS);
}
/** Survives module re-evaluation (dev hot reload) because it lives on window. */
let globalTapped = (window as unknown as { __KBE_TAPPED?: boolean }).__KBE_TAPPED === true;
let active: GameContext | null = null;
let gameRef: Phaser.Game | null = null;
let bossHp: number | null = null;
let boss: { name: string; hp: number; maxHp: number; phase: number } | null = null;

/**
 * Add a field to __KBE.state() for the whole page lifetime (UI scenes, audio). Overwrites the same key.
 * Gameplay code should use `ctx.debug.register` instead: those fields are dropped when the run ends.
 */
export function registerDebug(key: string, fn: () => unknown): void {
    runKeys.delete(key);
    extras.set(key, fn);
}

export const debugService: DebugService = {
    register(key, fn) { extras.set(key, fn); runKeys.add(key); },
    cheat(name, fn) { cheatOverrides.set(name, fn); },
    get enabled() { return PARAMS.debug; },
    get cheatsEnabled() { return CHEATS_ENABLED; }
};

/** Engine: the GameScene's context (null when Game isn't running). */
export function setActiveContext(ctx: GameContext | null): void {
    active = ctx;
    bossHp = null;
    boss = null;
    if (!ctx) {
        // Run-scoped closures point at the run's (now destroyed) objects; every team re-registers next run.
        cheatOverrides.clear();
        for (const k of runKeys) extras.delete(k);
        runKeys.clear();
        return;
    }
    syncGodFlag(ctx.cheats.god);
    const track = (e: { name: string; hp: number; maxHp: number; phase: number }): void => {
        bossHp = e.hp;
        boss = { name: e.name, hp: e.hp, maxHp: e.maxHp, phase: e.phase };
    };
    ctx.events.on('boss:spawn', track);
    ctx.events.on('boss:hp', track);
    ctx.events.on('boss:phase', track);
    ctx.events.on('boss:defeated', e => { track(e); bossHp = 0; if (boss) boss.hp = 0; });
}

/** Mirror the god flag where QA looks for it: state().god and game.registry 'god'. */
function syncGodFlag(on: boolean): void {
    gameRef?.registry.set('god', on);
}

/** The player's own hurtbox: the one owned by the player sprite, else the first live player-team box. */
function playerHurtbox(ctx: GameContext, index = 0): Hurtbox | null {
    const p = ctx.player(index);
    let owned: Hurtbox | null = null, first: Hurtbox | null = null;
    ctx.damage.forEach(h => {
        if (h.team !== 'player' || !h.alive()) return;
        if (p && h.owner === p.sprite && !owned) owned = h;
        if (!first) first = h;
    });
    return owned ?? first;
}

function playerHit(ctx: GameContext, damage: number, kind: HitInfo['kind']): HitInfo {
    const p = ctx.player();
    const x = p?.x ?? 0, y = p?.centerY ?? 0;
    return { damage, source: 'enemy', x, y, dirX: -(p?.facing ?? 1), dirY: 0, kind, weapon: 'cheat' };
}

export function getActiveContext(): GameContext | null {
    return active;
}

function teleportPlayer(ctx: GameContext, x: number): void {
    const p = ctx.player();
    const view = ctx.camera.view();
    const top = Math.max(ctx.level.bounds.y, view.y - 64);
    const y = ctx.physics.groundBelow(x, top) ?? ctx.physics.groundBelow(x, ctx.level.bounds.y) ?? view.y + 32;
    ctx.camera.unlock();
    ctx.camera.snapTo(x, y - 18);
    if (!p) return;
    if (p.teleport) { p.teleport(x, y); return; }
    const s = p.sprite as Phaser.GameObjects.GameObject & { x: number; y: number; body?: Phaser.Physics.Arcade.Body };
    if (s.body && 'reset' in s.body) s.body.reset(x, y);
    else { s.x = x; s.y = y; }
}

const defaultCheats = {
    god(on = true): void {
        if (active) active.cheats.god = on;
        syncGodFlag(on);
    },
    warp(x: number): void {
        if (active) teleportPlayer(active, x);
    },
    give(weapon: string, ammo?: number): void {
        if (!active) return;
        active.state.setWeapon(weapon, ammo ?? (weapon === 'pistol' ? Infinity : 999));
    },
    /**
     * Kill the player now: a lethal hit straight to the player's hurtbox, bypassing god mode and i-frames (the
     * engine then counts exactly one life via player:died). The player team may override it with
     * ctx.debug.cheat('kill', ...) if its death needs more than a lethal hit.
     */
    kill(): void {
        if (!active) return;
        const ctx = active;
        const p = ctx.player();
        if (!p || !p.alive()) return;
        const h = playerHurtbox(ctx);
        if (!h) { console.warn('[__KBE.cheats.kill] the player has no registered hurtbox'); return; }
        const info = playerHit(ctx, 9999, 'contact');
        if (h.hit(info) !== false) {
            ctx.events.emit('entity:hurt', { x: info.x, y: info.y, team: 'player', kind: info.kind, material: h.material ?? 'flesh', damage: info.damage, entity: h.kind });
        }
    },
    /** A normal enemy hit on the player (respects god mode and i-frames): for immunity tests. */
    hurt(damage = 1): void {
        if (!active) return;
        const h = playerHurtbox(active);
        if (h) active.damage.deal(h, playerHit(active, damage, 'bullet'));
    },
    /** Kill every live enemy-team hurtbox (the pre-Phase-B meaning of kill()). */
    killEnemies(): void {
        if (!active) return;
        const ctx = active;
        ctx.damage.forEach(h => {
            if (h.team === 'enemy' && h.alive()) {
                const r = ctx.damage.rectOf(h);
                ctx.damage.deal(h, { damage: 9999, source: 'player', x: r.centerX, y: r.centerY, dirX: 0, dirY: -1, kind: 'explosion', weapon: 'cheat' });
            }
        });
    },
    bombs(n = 30): void {
        if (active) active.state.bombs = n;
    },
    boss(): void {
        if (active) teleportPlayer(active, active.level.bounds.right - 60 * 16);
    }
};

let cheatWarned = false;

function cheat<K extends keyof typeof defaultCheats>(name: K): (typeof defaultCheats)[K] {
    return ((...args: unknown[]) => {
        if (!CHEATS_ENABLED) {
            if (!cheatWarned) { cheatWarned = true; console.warn('[__KBE.cheats] disabled in this build; add ?debug=1 to the URL'); }
            return;
        }
        const o = cheatOverrides.get(name);
        if (o) (o as (...a: unknown[]) => void)(...args);
        else (defaultCheats[name] as (...a: unknown[]) => void)(...args);
    }) as (typeof defaultCheats)[K];
}

function topScene(game: Phaser.Game): string {
    const scenes = game.scene.getScenes(true);
    const names = scenes.map(s => s.scene.key);
    for (const k of ['Pause', 'Continue', 'Results', 'Game', 'Intro', 'Title', 'Options', 'Credits', 'Preload', 'Boot']) {
        if (names.includes(k)) return k;
    }
    return names[names.length - 1] ?? '';
}

function snapshot(): Record<string, unknown> {
    const game = gameRef;
    const ctx = active;
    const p = ctx?.player() ?? null;
    const st = ctx?.state;
    const ammo = st ? (Number.isFinite(st.ammo) ? st.ammo : -1) : null;
    const out: Record<string, unknown> = {
        scene: game ? topScene(game) : '',
        scenes: game ? game.scene.getScenes(true).map(s => s.scene.key) : [],
        fps: game ? Math.round(game.loop.actualFps) : 0,
        player: p && st ? {
            x: Math.round(p.x), y: Math.round(p.y), alive: p.alive(), weapon: st.weapon, ammo, bombs: st.bombs, lives: st.lives
        } : null,
        score: st?.score ?? 0,
        rescued: st?.rescued ?? 0,
        enemies: ctx ? ctx.damage.count('enemy') : 0,
        cameraX: ctx ? Math.round(ctx.camera.view().x) : 0,
        bossHp,
        boss,
        bossPhase: boss?.phase ?? null,
        god: ctx ? ctx.cheats.god : PARAMS.god,
        projectiles: ctx ? ctx.projectiles.countTeam('player') : 0,
        enemyProjectiles: ctx ? ctx.projectiles.countTeam('enemy') : 0,
        shotsFired: ctx ? (ctx.state as { stats?: { shots: number } }).stats?.shots ?? 0 : 0,
        level: ctx ? { stage: ctx.level.stage ?? null, name: ctx.level.name ?? null, sandbox: isSandboxLevel(ctx.level) } : null,
        errors: errors.slice(-20)
    };
    for (const [k, fn] of extras) {
        try { out[k] = fn(); } catch (e) { out[k] = `error: ${(e as Error).message}`; }
    }
    return out;
}

export interface KbeHandle {
    ready: boolean;
    game: Phaser.Game | null;
    version: string;
    state(): Record<string, unknown>;
    /** False in a production build without ?debug=1: every cheat is then a no-op. */
    cheatsEnabled: boolean;
    cheats: {
        god(on?: boolean): void; warp(x: number): void; give(weapon: string, ammo?: number): void; kill(): void;
        killEnemies(): void; hurt(damage?: number): void; bombs(n?: number): void; boss(): void;
    };
    press(action: Action, ms?: number): void;
    params: unknown;
}

declare global {
    interface Window { __KBE: KbeHandle }
}

export function installKbe(game: Phaser.Game, version: string): KbeHandle {
    gameRef = game;
    syncGodFlag(PARAMS.god);
    const handle: KbeHandle = {
        ready: false,
        game,
        version,
        state: snapshot,
        cheatsEnabled: CHEATS_ENABLED,
        cheats: {
            god: cheat('god'), warp: cheat('warp'), give: cheat('give'), kill: cheat('kill'), killEnemies: cheat('killEnemies'),
            hurt: cheat('hurt'), bombs: cheat('bombs'), boss: cheat('boss')
        },
        press(action: Action, ms?: number) {
            if (!ACTIONS.includes(action)) { console.warn(`[__KBE.press] unknown action '${action}'`); return; }
            for (const inp of liveInputs) if (inp.index === 0) inp.press(action, ms);
        },
        params: PARAMS
    };
    window.__KBE = handle;
    // Global listeners and the console.error tap are installed once per page, even if a dev hot-reload
    // re-runs this module (otherwise every error would be recorded once per reload).
    if (!globalTapped) {
        globalTapped = true;
        (window as unknown as { __KBE_TAPPED?: boolean }).__KBE_TAPPED = true;
        window.addEventListener('error', e => { noteError(String(e.message)); });
        window.addEventListener('unhandledrejection', e => { noteError(`unhandledrejection: ${String(e.reason)}`); });
        const origError = console.error.bind(console);
        console.error = (...args: unknown[]) => { noteError(args.map(String).join(' ').slice(0, 300)); origError(...args); };
    }
    return handle;
}

export function setReady(ready: boolean): void {
    if (window.__KBE) window.__KBE.ready = ready;
}
