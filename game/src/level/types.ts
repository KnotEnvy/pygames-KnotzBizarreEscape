// Shared level-runtime types: parsed Tiled objects and the small state object the level modules share.
import type Phaser from 'phaser';

/** A Tiled object with its properties flattened. x/y are the object's feet (points) or top-left (rects). */
export interface LevelObject {
    id: number;
    type: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    props: Record<string, unknown>;
}

/** Hooks props use to react to arena state (alarm lights, bunker doors). Keyed by arena id. */
export interface ArenaHooks {
    onLock(id: string, fn: () => void): void;
    onUnlock(id: string, fn: () => void): void;
}

export interface DoorHandle {
    x: number;
    y: number;
    open(): void;
}

export interface GateHandle { x: number; y: number; lock: string; smash(): void; rumble(): void; smashed: boolean }

/** Runtime registry the level modules share (doors for `from=door`, gates keyed by their arena's lock id). */
export interface LevelRuntime {
    doors: DoorHandle[];
    /** Gate props by `lock` (default 'boss'): a boss arena bursts its gate for the boss; a wave arena smashes it open on clear. */
    gates: Map<string, GateHandle>;
    /** Static bodies of solid props (crates, barrels, sandbags, the gate). Listed in LevelQuery.colliders(). */
    solids: Phaser.Physics.Arcade.StaticGroup;
    hooks: ArenaHooks;
}

export function str(v: unknown, fallback = ''): string {
    return v === undefined || v === null ? fallback : String(v);
}

export function num(v: unknown, fallback: number): number {
    const n = Number(v);
    return v === undefined || v === null || v === '' || !Number.isFinite(n) ? fallback : n;
}

export function bool(v: unknown): boolean {
    return v === true || v === 'true' || v === 1 || v === '1';
}
