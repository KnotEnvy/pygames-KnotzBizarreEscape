// Runtime tile swaps shared by the cracking ice / breaking pier (ice.ts) and the sinking logs (water.ts): replace a
// ground tile's index, copy the new tile's tileset properties onto it and rebuild its collision faces.
import type Phaser from 'phaser';

/** Tileset properties of a gid as a plain object (Tiled exports them as an array or an object). */
export function tilePropsOf(map: Phaser.Tilemaps.Tilemap, gid: number): Record<string, unknown> {
    const ts = map.tilesets.find(s => s.containsTileIndex(gid));
    const raw = ts?.getTileProperties(gid) as unknown;
    const props: Record<string, unknown> = {};
    if (Array.isArray(raw)) for (const p of raw as Array<{ name: string; value: unknown }>) props[p.name] = p.value;
    else if (raw && typeof raw === 'object') Object.assign(props, raw);
    return props;
}

/** Swap the tile at (tx, ty) to `gid`; `extra` props are merged over the tileset's (e.g. keep a crack marker). */
export function swapTile(layer: Phaser.Tilemaps.TilemapLayer, map: Phaser.Tilemaps.Tilemap, tx: number, ty: number, gid: number,
    extra?: Record<string, unknown>): void {
    const tile = layer.getTileAt(tx, ty, true);
    if (!tile) return;
    tile.index = gid;
    const props = tilePropsOf(map, gid);
    if (extra) Object.assign(props, extra);
    tile.properties = props;
    if (props.collides === true) {
        if (props.oneway) tile.setCollision(false, false, true, false, true);
        else tile.setCollision(true, true, true, true, true);
    } else tile.resetCollision(true);
}
