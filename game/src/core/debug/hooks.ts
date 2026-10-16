// window.__KBE test/debug hooks (QA depends on these). Installed by main.ts before the game boots.
//   __KBE.ready, __KBE.game, __KBE.version, __KBE.state(), __KBE.cheats.{god,warp,give,kill,bombs,boss}, __KBE.press(action, ms)
import Phaser from 'phaser';
import type { Action, DebugService, GameContext } from '../contracts';
import { ACTIONS } from '../contracts';
import { liveInputs } from '../input';
import { PARAMS } from '../params';

type CheatFn = (...args: never[]) => void;

const extras = new Map<string, () => unknown>();
const cheatOverrides = new Map<string, CheatFn>();
const errors: string[] = [];
let active: GameContext | null = null;
let gameRef: Phaser.Game | null = null;
let bossHp: number | null = null;

/** Add a field to __KBE.state(). Safe to call any time (overwrites the same key). */
export function registerDebug(key: string, fn: () => unknown): void {
    extras.set(key, fn);
}

export const debugService: DebugService = {
    register: registerDebug,
    cheat(name, fn) { cheatOverrides.set(name, fn); },
    get enabled() { return PARAMS.debug; }
};

/** Engine: the GameScene's context (null when Game isn't running). */
export function setActiveContext(ctx: GameContext | null): void {
    active = ctx;
    bossHp = null;
    if (!ctx) {
        cheatOverrides.clear();
        return;
    }
    ctx.events.on('boss:hp', e => { bossHp = e.hp; });
    ctx.events.on('boss:spawn', e => { bossHp = e.hp; });
    ctx.events.on('boss:defeated', () => { bossHp = 0; });
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
    },
    warp(x: number): void {
        if (active) teleportPlayer(active, x);
    },
    give(weapon: string, ammo?: number): void {
        if (!active) return;
        active.state.setWeapon(weapon, ammo ?? (weapon === 'pistol' ? Infinity : 999));
    },
    kill(): void {
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

function cheat<K extends keyof typeof defaultCheats>(name: K): (typeof defaultCheats)[K] {
    return ((...args: unknown[]) => {
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
    cheats: { god(on?: boolean): void; warp(x: number): void; give(weapon: string, ammo?: number): void; kill(): void; bombs(n?: number): void; boss(): void };
    press(action: Action, ms?: number): void;
    params: unknown;
}

declare global {
    interface Window { __KBE: KbeHandle }
}

export function installKbe(game: Phaser.Game, version: string): KbeHandle {
    gameRef = game;
    const handle: KbeHandle = {
        ready: false,
        game,
        version,
        state: snapshot,
        cheats: {
            god: cheat('god'), warp: cheat('warp'), give: cheat('give'), kill: cheat('kill'), bombs: cheat('bombs'), boss: cheat('boss')
        },
        press(action: Action, ms?: number) {
            if (!ACTIONS.includes(action)) { console.warn(`[__KBE.press] unknown action '${action}'`); return; }
            for (const inp of liveInputs) if (inp.index === 0) inp.press(action, ms);
        },
        params: PARAMS
    };
    window.__KBE = handle;
    window.addEventListener('error', e => { errors.push(String(e.message)); });
    window.addEventListener('unhandledrejection', e => { errors.push(`unhandledrejection: ${String(e.reason)}`); });
    const origError = console.error.bind(console);
    console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ').slice(0, 300)); origError(...args); };
    return handle;
}

export function setReady(ready: boolean): void {
    if (window.__KBE) window.__KBE.ready = ready;
}
