// Parallax backdrop: camera-fixed TileSprites (scrollFactor 0) driven from the final camera scroll each frame.
// The set comes from the map's `parallax` property. A map `drift` (px/s, the moving train) adds drift * t to the
// camera x every layer sees, so far layers crawl and near ones whip past at train speed (the world itself is static).
// Updated at the scene's PRE_RENDER (after the engine camera runs at POST_UPDATE) so layers never lag the tiles,
// and every offset is rounded so nothing shimmers at integer zoom.
import Phaser from 'phaser';
import { DEPTH, type GameContext } from '../core';
import { LEVEL, type ParallaxLayerDef } from '../config/tuning/level';

interface Layer {
    def: ParallaxLayerDef;
    sprite: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Image;
    alpha: number;
}

export interface Parallax {
    destroy(): void;
    /** 0..1: how much of the view a tunnel covers (layers flagged `tunnelHide` fade out). */
    setTunnelCover(f: number): void;
    /** 0..1 for a named cover group (layers with `hideIn` containing it fade out, `showIn` layers fade in). */
    setCover(group: string, f: number): void;
    /** Distance the train has travelled (px): drift * scaled seconds. */
    readonly travelled: number;
}

const BAND: Record<NonNullable<ParallaxLayerDef['band']>, number> = {
    far: DEPTH.BG_FAR,
    near: DEPTH.BG_NEAR,
    track: DEPTH.TILES_BACK + 0.5,
    front: DEPTH.TILES_FRONT + 2
};

export function createParallax(ctx: GameContext, setId: string, drift: number): Parallax {
    const scene = ctx.scene;
    const cam = scene.cameras.main;
    const P = LEVEL.parallax;
    const set = P.sets[setId] ?? P.sets.stage1;
    if (!P.sets[setId]) console.warn(`[level] unknown parallax set '${setId}': using stage1`);
    const layers: Layer[] = [];
    for (const def of set.layers) {
        if (!scene.textures.exists(def.key)) { console.warn(`[level] parallax texture '${def.key}' missing`); continue; }
        const src = scene.textures.get(def.key).getSourceImage() as { width: number; height: number };
        const depth = BAND[def.band ?? 'far'] + def.depth;
        const sprite = def.once !== undefined
            ? scene.add.image(0, 0, def.key).setOrigin(0, 0)
            : scene.add.tileSprite(0, 0, cam.width, src.height, def.key).setOrigin(0, 0);
        sprite.setScrollFactor(0).setDepth(depth);
        const alpha = def.alpha ?? 1;
        sprite.setAlpha(alpha);
        layers.push({ def, sprite, alpha });
    }

    let travelled = 0;
    let cover = 0;
    const covers: Record<string, number> = {};
    let last = ctx.time.now;
    const update = (): void => {
        // Scaled gameplay clock: the drift stops during hitstop/pause like everything else.
        const now = ctx.time.now;
        travelled += drift * Math.max(0, now - last) / 1000;
        last = now;
        const camX = cam.scrollX, camY = cam.scrollY;
        const cf = set.crossfade;
        const t = cf ? Phaser.Math.Clamp((camX - cf.from) / (cf.to - cf.from), 0, 1) : 0;
        for (const l of layers) {
            const d = l.def;
            const x = camX + travelled * (d.drift ?? 1);
            if (l.sprite instanceof Phaser.GameObjects.TileSprite) l.sprite.tilePositionX = Math.round(x * d.sfX);
            else l.sprite.x = Math.round(d.once! - x * d.sfX);
            l.sprite.y = Math.round(d.y + (P.restScrollY - camY) * d.sfY);
            let a = l.alpha;
            if (d.fade) a *= d.fade === 'in' ? t : 1 - t;
            if (d.tunnelHide) a *= 1 - cover;
            if (d.hideIn) for (const g of d.hideIn) a *= 1 - (covers[g] ?? 0);
            if (d.showIn) a *= covers[d.showIn] ?? 0;
            if (d.span) {
                const [from, to, fadePx] = d.span;
                a *= Phaser.Math.Clamp(Math.min(camX - from, to - camX) / Math.max(1, fadePx) + 1, 0, 1);
            }
            l.sprite.setAlpha(a).setVisible(a > 0.001);
        }
    };
    update();
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, update);
    const destroy = (): void => { scene.events.off(Phaser.Scenes.Events.PRE_RENDER, update); };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
    return {
        destroy,
        setTunnelCover: (f: number) => { cover = Phaser.Math.Clamp(f, 0, 1); },
        setCover: (group: string, f: number) => { covers[group] = Phaser.Math.Clamp(f, 0, 1); },
        get travelled() { return travelled; }
    };
}
