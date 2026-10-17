// Tilemap construction: the four tile layers at their depths, the LevelQuery, and Tiled object parsing.
// Water tile animations run natively: Phaser 4's TilemapLayer advances `timeElapsed` in preUpdate and the WebGL
// renderer draws `tileset.getAnimatedTileId(index, timeElapsed)`, so no index-cycling fallback is needed.
import Phaser from 'phaser';
import { DEPTH, createTileLevelQuery, type LevelQuery } from '../core';
import { LEVEL } from '../config/tuning/level';
import type { LevelObject } from './types';

export interface BuiltMap {
    key: string;
    map: Phaser.Tilemaps.Tilemap;
    ground: Phaser.Tilemaps.TilemapLayer;
    query: LevelQuery;
    bounds: Phaser.Geom.Rectangle;
    spawns: LevelObject[];
    triggers: LevelObject[];
    props: Record<string, unknown>;
}

/** Layer name → depth. `ground` sits just above the back-layer decor props, under gameplay props and actors. */
const LAYERS: Array<[name: string, depth: number]> = [
    ['bg_far_deco', DEPTH.TILES_BACK - 2],
    ['back', DEPTH.TILES_BACK],
    ['ground', DEPTH.TILES_BACK + 2],
    ['front', DEPTH.TILES_FRONT]
];

/** Depth for back-layer decor props (watchtowers, flags): in front of the back tiles, behind the ground layer. */
export const DECOR_BACK_DEPTH = DEPTH.TILES_BACK + 1;

export function flattenProps(raw: unknown): Record<string, unknown> {
    if (Array.isArray(raw)) {
        const out: Record<string, unknown> = {};
        for (const p of raw as Array<{ name: string; value: unknown }>) out[p.name] = p.value;
        return out;
    }
    return raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
}

function readObjects(map: Phaser.Tilemaps.Tilemap, layer: string): LevelObject[] {
    const objs = map.getObjectLayer(layer)?.objects ?? [];
    return objs.map(o => ({
        id: o.id,
        type: String(o.type ?? (o as { class?: string }).class ?? ''),
        name: o.name ?? '',
        x: o.x ?? 0,
        y: o.y ?? 0,
        width: o.width ?? 0,
        height: o.height ?? 0,
        props: flattenProps(o.properties)
    }));
}

export function buildMap(scene: Phaser.Scene, key: string, extraColliders: Phaser.GameObjects.GameObject[], stage: number): BuiltMap {
    const map = scene.make.tilemap({ key });
    // Every tileset embedded in the map (stage1 + the part's own: m1_train, m1_lake) → texture `tiles_<name>`.
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    for (const ts of map.tilesets) {
        const tex = LEVEL.texturePrefix + ts.name;
        const added = scene.textures.exists(tex) ? map.addTilesetImage(ts.name, tex) : null;
        if (added) tilesets.push(added); else console.warn(`[level] tileset '${ts.name}' has no texture '${tex}'`);
    }
    if (!tilesets.length) throw new Error(`[level] map '${key}': no tileset textures`);

    let ground: Phaser.Tilemaps.TilemapLayer | null = null;
    for (const [name, depth] of LAYERS) {
        if (map.getLayerIndex(name) === null) { console.warn(`[level] map has no '${name}' layer`); continue; }
        const layer = map.createLayer(name, tilesets, 0, 0) as Phaser.Tilemaps.TilemapLayer | null;
        if (!layer) continue;
        layer.setDepth(depth);
        if (name === 'ground') ground = layer;
    }
    if (!ground) throw new Error('[level] map has no ground layer');

    const bounds = new Phaser.Geom.Rectangle(0, 0, map.widthInPixels, map.heightInPixels);
    const spawns = readObjects(map, 'spawns');
    const triggers = readObjects(map, 'triggers');
    const props = flattenProps(map.properties);
    const start = spawns.find(o => o.type === 'player_start');

    // Water surface at a column: top of the first water tile, scanned live (cracking ice opens new water at runtime).
    const waterSurfaceAt = (x: number): number | null => {
        const tx = Math.floor(x / map.tileWidth);
        for (let ty = 0; ty < map.height; ty++) {
            const t = ground!.getTileAt(tx, ty);
            if (t && t.properties?.hazard === 'water') return ty * map.tileHeight;
        }
        return null;
    };

    const query = createTileLevelQuery({
        ground,
        extraColliders,
        bounds,
        playerStart: start ? { x: start.x, y: start.y } : undefined,
        stage,
        name: String(props.name ?? 'Pine Ridge Breakout'),
        waterSurfaceAt
    });
    query.powTotal = spawns.filter(o => o.type === 'pow').length;
    return { key, map, ground, query, bounds, spawns, triggers, props };
}

/** `sections` map property ("name:t0-t1,...", tiles) → sorted px ranges. */
export function parseSections(raw: unknown, tile: number): Array<{ name: string; x0: number; x1: number }> {
    return String(raw ?? '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [name, range] = s.split(':');
        const [a, b] = (range ?? '0-0').split('-').map(Number);
        return { name, x0: a * tile, x1: b * tile };
    }).sort((p, q) => p.x0 - q.x0);
}
