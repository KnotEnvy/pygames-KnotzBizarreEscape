// Proximity spawner: enemies, POWs and pickups are held back until the camera view (+ margin) reaches them,
// then spawned once per run through ctx.spawn(type, kind, props, x, feetY). Objects left behind by a warp are
// skipped. Wave members (`lock` + `wave`) and the boss are owned by the arena controller instead.
import type Phaser from 'phaser';
import type { GameContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import { str, type LevelObject } from './types';

interface Pending { obj: LevelObject; kind: string; margin: number; done: boolean; retryAt: number }

export function kindOf(o: LevelObject): string {
    return str(o.props.kind ?? (o.type === 'pow' ? o.props.item : undefined));
}

/** Spawn one map object. Returns the created object, or null if the factory declined (e.g. enemy cap). */
export function spawnObject(ctx: GameContext, o: LevelObject, x = o.x, y = o.y): Phaser.GameObjects.GameObject | null {
    const kind = kindOf(o);
    let sy = y;
    if (o.type === 'enemy' && kind === 'paratrooper') sy = Math.max(y, ctx.camera.view().top - LEVEL.activation.paraAboveView);
    const r = ctx.spawn(o.type, kind, { ...o.props, mapId: o.id }, x, sy);
    return r && typeof r === 'object' ? (r as Phaser.GameObjects.GameObject) : null;
}

function marginFor(o: LevelObject): number {
    const A = LEVEL.activation;
    if (o.type !== 'enemy') return A.margin;
    const kind = kindOf(o);
    return kind === 'paratrooper' ? -A.paraInside : kind === 'drone' ? A.flyingMargin : A.margin;
}

export class ProximitySpawner {
    private readonly list: Pending[];
    private head = 0;
    spawned = 0;
    skipped = 0;

    constructor(private readonly ctx: GameContext, objects: LevelObject[]) {
        this.list = objects
            .map(obj => ({ obj, kind: kindOf(obj), margin: marginFor(obj), done: false, retryAt: 0 }))
            .sort((a, b) => a.obj.x - b.obj.x);
    }

    get pending(): number { return this.list.length - this.spawned - this.skipped; }

    update(): void {
        const A = LEVEL.activation;
        const v = this.ctx.camera.view();
        const now = this.ctx.time.now;
        const reach = v.right + Math.max(A.margin, A.flyingMargin);
        for (let i = this.head; i < this.list.length; i++) {
            const p = this.list[i];
            if (p.obj.x > reach) break;
            if (p.done || now < p.retryAt) continue;
            if (p.obj.x < v.left - A.behindMargin) { p.done = true; this.skipped++; continue; }
            if (p.obj.x > v.right + p.margin) continue;
            const made = spawnObject(this.ctx, p.obj);
            if (!made && p.obj.type === 'enemy') { p.retryAt = now + A.retryMs; continue; }
            p.done = true;
            this.spawned++;
        }
        while (this.head < this.list.length && this.list[this.head].done) this.head++;
    }
}
