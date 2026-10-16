// Dev sandbox arena, built from an in-code tile array when no level team registered a level.
// Exercises: ground, steps, a bottomless gap, one-way planks, a water pit, spikes, a wall, and an arena lock.
import Phaser from 'phaser';
import type { GameContext } from '../contracts';
import { createTileLevelQuery } from '../physics';
import { DEPTH } from '../depth';
import { PAL, TEX } from '../textures';

const W = 150;
const H = 18;
const GROUND = 14; // top row of the ground

// Tile indexes in TEX.devTiles
const DIRT = 0, GRASS = 1, PLANK = 2, WATER = 3, STEEL = 4, SPIKES = 5, EMPTY = -1;

const PROPS: Record<number, Record<string, unknown>> = {
    [DIRT]: { collides: true, material: 'dirt' },
    [GRASS]: { collides: true, material: 'dirt' },
    [PLANK]: { oneway: true, material: 'wood' },
    [WATER]: { hazard: 'water', material: 'water' },
    [STEEL]: { collides: true, material: 'metal' },
    [SPIKES]: { hazard: 'spikes', material: 'metal' }
};

export const SANDBOX_ARENA = { x0: 112 * 16, x1: 112 * 16 + 384 };

function buildGrid(): number[][] {
    const g: number[][] = [];
    for (let y = 0; y < H; y++) g.push(new Array<number>(W).fill(EMPTY));
    const fillCol = (x: number, top: number, tile = DIRT) => {
        for (let y = top; y < H; y++) g[y][x] = y === top && tile === DIRT ? GRASS : tile;
    };
    for (let x = 0; x < W; x++) fillCol(x, GROUND);
    // steps up and down
    for (let x = 20; x < 24; x++) fillCol(x, GROUND - 1);
    for (let x = 24; x < 28; x++) fillCol(x, GROUND - 2);
    for (let x = 28; x < 32; x++) fillCol(x, GROUND - 3);
    // bottomless gap
    for (let x = 36; x < 39; x++) for (let y = 0; y < H; y++) g[y][x] = EMPTY;
    // one-way planks (staircase up)
    for (let x = 44; x < 51; x++) g[GROUND - 3][x] = PLANK;
    for (let x = 52; x < 58; x++) g[GROUND - 6][x] = PLANK;
    for (let x = 60; x < 64; x++) g[GROUND - 9][x] = PLANK;
    // water pit
    for (let x = 68; x < 74; x++) { for (let y = GROUND; y < H; y++) g[y][x] = WATER; }
    for (let x = 69; x < 73; x++) g[GROUND - 3][x] = PLANK;
    // steel wall
    for (let y = GROUND - 3; y < GROUND; y++) g[y][82] = STEEL;
    for (let y = GROUND - 3; y < GROUND; y++) g[y][83] = STEEL;
    // spikes
    for (let x = 90; x < 93; x++) g[GROUND - 1][x] = SPIKES;
    // high ledge (vertical camera follow)
    for (let x = 98; x < 106; x++) g[GROUND - 7][x] = STEEL;
    for (let x = 96; x < 98; x++) g[GROUND - 4][x] = PLANK;
    // arena walls are implicit (camera lock); a back wall at the start
    for (let y = 0; y < GROUND; y++) g[y][0] = STEEL;
    return g;
}

function drawBackdrop(scene: Phaser.Scene, width: number, height: number): void {
    scene.cameras.main.setBackgroundColor(PAL.sky3);
    const far = scene.add.graphics().setScrollFactor(0.2, 0.1).setDepth(0);
    far.fillStyle(PAL.sky4).fillRect(0, 0, width, 120);
    far.fillStyle(PAL.sky5).fillRect(0, 0, width, 40);
    far.fillStyle(PAL.ink3);
    for (let i = 0; i < 24; i++) {
        const x = i * 70 - 40;
        far.fillTriangle(x, 170, x + 55, 70 + ((i * 37) % 40), x + 110, 170);
    }
    far.fillStyle(PAL.ink5);
    for (let i = 0; i < 24; i++) {
        const x = i * 70 - 40, peak = 70 + ((i * 37) % 40);
        far.fillTriangle(x + 40, peak + 15, x + 55, peak, x + 70, peak + 15);
    }
    const near = scene.add.graphics().setScrollFactor(0.5, 0.3).setDepth(10);
    near.fillStyle(PAL.leaf3);
    for (let i = 0; i < Math.ceil(width / 30); i++) {
        const x = i * 30;
        near.fillTriangle(x, 230, x + 12, 150 + ((i * 53) % 30), x + 24, 230);
    }
    void height;
}

/** Builds the sandbox tilemap and hands it to ctx.setLevel. Returns the player start. */
export function buildSandboxLevel(ctx: GameContext): { x: number; y: number } {
    const scene = ctx.scene;
    const map = scene.make.tilemap({ data: buildGrid(), tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage(TEX.devTiles, TEX.devTiles, 16, 16, 0, 0);
    if (!tiles) throw new Error('sandbox tileset failed');
    const layer = map.createLayer(0, tiles, 0, 0);
    if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) throw new Error('sandbox layer failed');
    layer.setDepth(DEPTH.TILES_BACK);
    layer.forEachTile(t => {
        const p = PROPS[t.index];
        if (p) t.properties = { ...p };
    });
    drawBackdrop(scene, map.widthInPixels, map.heightInPixels);

    const start = { x: 48, y: GROUND * 16 };
    ctx.setLevel(createTileLevelQuery({
        ground: layer,
        bounds: new Phaser.Geom.Rectangle(0, 0, map.widthInPixels, map.heightInPixels),
        playerStart: start,
        stage: 0,
        name: 'Dev Sandbox'
    }));

    // Targets: some static dummies plus an enemy turret inside the lock arena.
    const ground = GROUND * 16;
    ctx.spawn('dev', 'target', {}, 15 * 16, ground);
    ctx.spawn('dev', 'target', {}, 26 * 16, ground - 32);
    ctx.spawn('dev', 'target', { respawn: false }, 54 * 16, ground - 96);
    ctx.spawn('dev', 'target', {}, 86 * 16, ground);
    ctx.spawn('dev', 'arena', { x0: SANDBOX_ARENA.x0, x1: SANDBOX_ARENA.x1 }, SANDBOX_ARENA.x0 + 120, ground);
    if (ctx.params.debug) ctx.spawn('prop', 'mystery_box', {}, 10 * 16, ground);
    return start;
}
