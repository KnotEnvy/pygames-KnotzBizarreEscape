// Level collision for actors: solid tiles, one-way (jump-through) platforms with drop-through, hazard/material
// queries. One shared actor array per collider keeps it allocation-free: ctx.physics.collideLevel(sprite).
import Phaser from 'phaser';
import type { HazardKind, LevelPhysics, LevelQuery, TerrainMaterial } from './contracts';
import { ENGINE } from '../config/tuning/engine';

type Actor = Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body | null };

export class LevelCollision implements LevelPhysics {
    /** Actors colliding with everything including one-way tiles. */
    private readonly actors: Actor[] = [];
    /** Actors that ignore one-way tiles entirely. */
    private readonly solidOnly: Actor[] = [];
    private colliders: Phaser.Physics.Arcade.Collider[] = [];
    private readonly dropUntil = new Map<Phaser.GameObjects.GameObject, number>();
    private level: LevelQuery | null = null;

    constructor(private readonly scene: Phaser.Scene) {}

    /** Engine calls this when the level changes. */
    setLevel(level: LevelQuery): void {
        this.level = level;
        for (const c of level.colliders()) {
            if (c instanceof Phaser.Tilemaps.TilemapLayer) prepareTileLayer(c);
        }
        this.rebuild();
    }

    private rebuild(): void {
        for (const c of this.colliders) c.destroy();
        this.colliders = [];
        if (!this.level) return;
        const add = this.scene.physics.add;
        for (const obj of this.level.colliders()) {
            this.colliders.push(add.collider(this.actors, obj, undefined, this.processOneWay, this));
            this.colliders.push(add.collider(this.solidOnly, obj, undefined, this.processSolidOnly, this));
        }
    }

    collideLevel(obj: Phaser.GameObjects.GameObject, opts?: { oneWay?: boolean }): () => void {
        const list = opts?.oneWay === false ? this.solidOnly : this.actors;
        const a = obj as Actor;
        if (!a.body) console.warn('[physics] collideLevel: object has no arcade body', obj.name);
        if (list.indexOf(a) < 0) list.push(a);
        const remove = (): void => {
            const i = list.indexOf(a);
            if (i >= 0) list.splice(i, 1);
            this.dropUntil.delete(obj);
        };
        obj.once(Phaser.GameObjects.Events.DESTROY, remove);
        return remove;
    }

    dropThrough(obj: Phaser.GameObjects.GameObject, ms: number = ENGINE.oneWay.dropMs): void {
        this.dropUntil.set(obj, this.scene.time.now + ms);
    }

    onOneWay(obj: Phaser.GameObjects.GameObject): boolean {
        const b = (obj as Actor).body;
        if (!b || !b.blocked.down) return false;
        const y = b.bottom + 1;
        // Standing on one-way if any foot sample is one-way and none is solid.
        let one = false;
        for (let i = 0; i < 3; i++) {
            const x = b.x + 1 + ((b.width - 2) * i) / 2;
            if (this.solidAt(x, y)) return false;
            if (this.oneWayAt(x, y)) one = true;
        }
        return one;
    }

    solidAt(x: number, y: number): boolean { return this.level?.solidAt(x, y) ?? false; }
    oneWayAt(x: number, y: number): boolean { return this.level?.oneWayAt?.(x, y) ?? false; }
    hazardAt(x: number, y: number): HazardKind | null { return this.level?.hazardAt?.(x, y) ?? null; }
    materialAt(x: number, y: number): TerrainMaterial { return this.level?.materialAt?.(x, y) ?? 'dirt'; }

    groundBelow(x: number, fromY: number, maxDist = 2000): number | null {
        const tile = ENGINE.tile;
        const end = fromY + maxDist;
        // Start on a tile boundary so we land exactly on tile tops.
        let y = Math.floor(fromY / tile) * tile;
        let prevFree = !this.solidAt(x, y - 1) && !this.oneWayAt(x, y - 1);
        for (; y <= end; y += tile) {
            const solid = this.solidAt(x, y + 1) || this.oneWayAt(x, y + 1);
            if (solid && prevFree) return y;
            prevFree = !solid && !this.hazardAt(x, y + 1);
        }
        return null;
    }

    waterSurfaceAt(x: number): number | null {
        const level = this.level;
        if (!level) return null;
        if (level.waterSurfaceAt) return level.waterSurfaceAt(x);
        const tile = ENGINE.tile;
        const b = level.bounds;
        for (let y = Math.floor(b.y / tile) * tile; y < b.bottom; y += tile) {
            if (this.hazardAt(x, y + tile / 2) === 'water') return y;
        }
        return null;
    }

    private processOneWay(a: unknown, b: unknown): boolean {
        if (!(b instanceof Phaser.Tilemaps.Tile)) return true;
        if (!b.properties?.oneway) return true;
        const obj = a as Actor;
        const until = this.dropUntil.get(obj);
        if (until !== undefined) {
            if (this.scene.time.now < until) return false;
            this.dropUntil.delete(obj);
        }
        const body = obj.body;
        if (!body || body.velocity.y < 0) return false;
        // Only land if the feet were at/above the platform top before this step.
        const prevBottom = body.bottom - body.deltaY();
        return prevBottom <= b.getTop() + 1;
    }

    private processSolidOnly(_a: unknown, b: unknown): boolean {
        return !(b instanceof Phaser.Tilemaps.Tile && b.properties?.oneway);
    }

    destroy(): void {
        for (const c of this.colliders) c.destroy();
        this.colliders = [];
        this.actors.length = 0;
        this.solidOnly.length = 0;
        this.dropUntil.clear();
    }
}

/**
 * Configure collision on a ground layer from tile properties: `collides=true` → solid, `oneway=true` → top face only.
 * Idempotent; the engine calls it for every TilemapLayer in LevelQuery.colliders().
 */
export function prepareTileLayer(layer: Phaser.Tilemaps.TilemapLayer): void {
    if (layer.getData('kbePrepared')) return;
    layer.setData('kbePrepared', true);
    layer.setCollisionByProperty({ collides: true }, true, false);
    layer.forEachTile(t => {
        if (t.properties?.oneway) t.setCollision(false, false, true, false, false);
    });
    layer.calculateFacesWithin(0, 0, layer.layer.width, layer.layer.height);
}

export interface TileLevelOptions {
    /** The collision layer (tile properties: collides, oneway, hazard, material). */
    ground: Phaser.Tilemaps.TilemapLayer;
    /** Extra static colliders (props, gates). */
    extraColliders?: Phaser.GameObjects.GameObject[];
    bounds?: Phaser.Geom.Rectangle;
    playerStart?: { x: number; y: number };
    stage?: number;
    name?: string;
    /** Optional water surface lookup (otherwise the engine scans for hazard=water tiles). */
    waterSurfaceAt?(x: number): number | null;
}

/**
 * Build a LevelQuery from a Tiled ground layer. Levels team: call this from your loader, then ctx.setLevel(query).
 * All lookups are allocation-free (getTileAtWorldXY on the ground layer).
 */
export function createTileLevelQuery(opts: TileLevelOptions): LevelQuery {
    const layer = opts.ground;
    prepareTileLayer(layer);
    const tileAt = (x: number, y: number): Phaser.Tilemaps.Tile | null => layer.getTileAtWorldXY(x, y, false) ?? null;
    const bounds = opts.bounds ?? new Phaser.Geom.Rectangle(layer.x, layer.y, layer.width, layer.height);
    const colliders: Phaser.GameObjects.GameObject[] = [layer, ...(opts.extraColliders ?? [])];
    return {
        groundLayer: layer,
        bounds,
        playerStart: opts.playerStart,
        stage: opts.stage,
        name: opts.name,
        waterSurfaceAt: opts.waterSurfaceAt,
        colliders: () => colliders,
        solidAt(x, y) {
            const t = tileAt(x, y);
            return !!t && t.index >= 0 && t.properties?.collides === true && !t.properties?.oneway;
        },
        oneWayAt(x, y) {
            const t = tileAt(x, y);
            return !!t && t.index >= 0 && t.properties?.oneway === true;
        },
        hazardAt(x, y) {
            const t = tileAt(x, y);
            const h = t && t.index >= 0 ? t.properties?.hazard : undefined;
            return h === 'water' || h === 'spikes' ? h : null;
        },
        materialAt(x, y) {
            const t = tileAt(x, y);
            return ((t && t.index >= 0 ? t.properties?.material : undefined) as TerrainMaterial | undefined) ?? 'dirt';
        }
    };
}
