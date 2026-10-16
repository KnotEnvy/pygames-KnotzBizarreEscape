// Parallax backdrop: camera-fixed TileSprites (scrollFactor 0) driven from the final camera scroll each frame.
// Updated at the scene's PRE_RENDER (after the engine camera runs at POST_UPDATE) so layers never lag the tiles,
// and every offset is rounded so nothing shimmers at integer zoom.
import Phaser from 'phaser';
import { DEPTH, type GameContext } from '../core';
import { LEVEL } from '../config/tuning/level';

interface Layer {
    sprite: Phaser.GameObjects.TileSprite;
    sfX: number;
    sfY: number;
    y: number;
    alpha: number;
    fade?: 'in' | 'out';
}

export function createParallax(ctx: GameContext): { destroy(): void } {
    const scene = ctx.scene;
    const cam = scene.cameras.main;
    const P = LEVEL.parallax;
    const layers: Layer[] = [];
    for (const def of P.layers) {
        if (!scene.textures.exists(def.key)) { console.warn(`[level] parallax texture '${def.key}' missing`); continue; }
        const src = scene.textures.get(def.key).getSourceImage() as { width: number; height: number };
        const sprite = scene.add.tileSprite(0, 0, cam.width, src.height, def.key)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.BG_FAR + def.depth);
        const alpha = 'alpha' in def ? def.alpha : 1;
        sprite.setAlpha(alpha);
        layers.push({ sprite, sfX: def.sfX, sfY: def.sfY, y: def.y, alpha, fade: 'fade' in def ? def.fade : undefined });
    }

    const update = (): void => {
        const camX = cam.scrollX, camY = cam.scrollY;
        const t = Phaser.Math.Clamp((camX - P.crossfade.from) / (P.crossfade.to - P.crossfade.from), 0, 1);
        for (const l of layers) {
            l.sprite.tilePositionX = Math.round(camX * l.sfX);
            l.sprite.y = Math.round(l.y + (P.restScrollY - camY) * l.sfY);
            if (l.fade) {
                const a = l.fade === 'in' ? t : 1 - t;
                l.sprite.setAlpha(a * l.alpha).setVisible(a > 0.001);
            }
        }
    };
    update();
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, update);
    const destroy = (): void => { scene.events.off(Phaser.Scenes.Events.PRE_RENDER, update); };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
    return { destroy };
}
