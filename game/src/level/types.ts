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

/** Runtime registry the level modules share (doors for `from=door`, the boss gate). */
export interface LevelRuntime {
    doors: DoorHandle[];
    gate: { x: number; y: number; smash(): void; rumble(): void; smashed: boolean } | null;
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
