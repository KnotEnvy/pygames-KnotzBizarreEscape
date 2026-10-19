import Phaser from 'phaser';
import { DEPTH, type GameContext } from '../core';

const VEIL = 'fx_fog_feather', WISP = 'fx_fog_edge_wisp';
const EDGE = 64, SIZE = EDGE * 2 + 1;
export type FogBounds = { x: number; y: number; width: number; height: number };

/** Fixed-capacity, world-anchored fog. Nine quads preserve a 64 px feather at any bank size. */
export class FxFog {
    private readonly veils: Phaser.GameObjects.NineSlice[] = [];
    private readonly wisps: Phaser.GameObjects.Image[] = [];
    private veilCount = 0;
    private wispCount = 0;
    constructor(private readonly ctx: GameContext) {
        this.bake();
        for (let i = 0; i < 32; i++) {
            this.veils.push(ctx.scene.add.nineslice(0, 0, VEIL, undefined, SIZE, SIZE, EDGE, EDGE, EDGE, EDGE)
                .setOrigin(0, 0).setDepth(DEPTH.ENEMIES - 2.1).setAlpha(.42).setVisible(false));
            this.wisps.push(ctx.scene.add.image(0, 0, WISP).setDepth(DEPTH.ENEMIES - 1.9).setVisible(false));
        }
    }
    private bake(): void {
        const textures = this.ctx.scene.textures;
        if (!textures.exists(VEIL)) {
            const texture = textures.createCanvas(VEIL, SIZE, SIZE)!;
            const paint = texture.getContext(), pixels = paint.createImageData(SIZE, SIZE);
            for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
                const u = Math.min(x, SIZE - 1 - x) / EDGE, v = Math.min(y, SIZE - 1 - y) / EDGE;
                const i = (y * SIZE + x) * 4;
                pixels.data[i] = 8; pixels.data[i + 1] = 10; pixels.data[i + 2] = 20;
                pixels.data[i + 3] = Math.round(255 * u * u * (3 - 2 * u) * v * v * (3 - 2 * v));
            }
            paint.putImageData(pixels, 0, 0); texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        if (!textures.exists(WISP)) {
            const texture = textures.createCanvas(WISP, 64, 32)!;
            const paint = texture.getContext(), pixels = paint.createImageData(64, 32);
            for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
                const r = Math.max(0, 1 - ((x - 31.5) / 31.5) ** 2 - ((y - 15.5) / 15.5) ** 2);
                const i = (y * 64 + x) * 4;
                pixels.data[i] = 106; pixels.data[i + 1] = 185; pixels.data[i + 2] = 164;
                pixels.data[i + 3] = Math.round(255 * r * r);
            }
            paint.putImageData(pixels, 0, 0); texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
    }
    begin(): void {
        for (let i = 0; i < this.veilCount; i++) this.veils[i].setVisible(false);
        for (let i = 0; i < this.wispCount; i++) this.wisps[i].setVisible(false);
        this.veilCount = this.wispCount = 0;
    }
    draw(left: number, top: number, right: number, bottom: number, clock: number, budget: number): number {
        const veil = this.veils[this.veilCount];
        if (!veil || right <= left || bottom <= top) return 0;
        this.veilCount++;
        const width = right - left, height = bottom - top;
        // NineSlice's minimum is 128: scale tiny authored zones down instead of enlarging their footprint.
        const meshWidth = Math.max(EDGE * 2, width), meshHeight = Math.max(EDGE * 2, height);
        if (veil.width !== meshWidth || veil.height !== meshHeight) veil.setSize(meshWidth, meshHeight);
        veil.setScale(Math.min(1, width / (EDGE * 2)), Math.min(1, height / (EDGE * 2)))
            .setPosition(left, top).setVisible(true);
        const view = this.ctx.camera.view(), t = clock / 1000;
        let used = 0;
        // Three wisps per side and three across the top. Their centres wander across the true boundary.
        for (let i = 0; i < 9 && used < budget && this.wispCount < this.wisps.length; i++) {
            const upper = i >= 6, side = i < 3 ? left : right, phase = i * 2.399;
            const x = upper ? left + width * (i - 5.5) / 3 + Math.sin(t * .31 + phase) * 18
                : side + Math.sin(t * .43 + phase) * 20;
            const y = upper ? top + Math.sin(t * .37 + phase) * 9
                : top + height * ((i % 3) + .5) / 3 + Math.sin(t * .29 + phase) * 14;
            if (x + 56 < view.left || x - 56 > view.right || y + 24 < view.top || y - 24 > view.bottom) continue;
            this.wisps[this.wispCount++].setPosition(x, y).setDisplaySize(96 + Math.sin(t * .23 + phase) * 16, 32)
                .setAlpha(.12 + .035 * Math.sin(t * .41 + phase)).setVisible(true);
            used++;
        }
        return used;
    }
    destroy(): void {
        for (const veil of this.veils) veil.destroy();
        for (const wisp of this.wisps) wisp.destroy();
    }
}
