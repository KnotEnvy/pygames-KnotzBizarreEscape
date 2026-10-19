// Minimal stand-in visuals for impacts/explosions/popups, active only when nobody else listens to those events
// (i.e. before the FX/UI teams register). Pooled images; tweens are fine at dev volumes.
import Phaser from 'phaser';
import type { GameContext } from '../contracts';
import { DEPTH } from '../depth';
import { PAL, TEX } from '../textures';

export function installDevFx(ctx: GameContext): void {
    const scene = ctx.scene;
    const ev = ctx.events;
    const pool = ctx.pools.create('dev-fx', () => scene.add.image(0, 0, TEX.devSpark).setDepth(DEPTH.FX).setVisible(false));
    const puff = (x: number, y: number, scale: number, tint: number, ms: number): void => {
        const img = pool.get().setPosition(x, y).setScale(scale * 0.5).setAlpha(1).setTint(tint).setVisible(true);
        scene.tweens.add({ targets: img, scale, alpha: 0, duration: ms, onComplete: () => { img.setVisible(false); pool.release(img); } });
    };
    if (ev.listenerCount('projectile:impact') === 0) {
        ev.on('projectile:impact', e => puff(e.x, e.y, 1.2, e.team === 'enemy' ? PAL.red5 : e.material === 'flesh' ? PAL.white : PAL.sand4, 120));
    }
    if (ev.listenerCount('explosion') === 0) {
        const size = { s: 4, m: 7, l: 11, xl: 16 } as const;
        ev.on('explosion', e => {
            puff(e.x, e.y, size[e.size], PAL.fire4, 320);
            puff(e.x, e.y, size[e.size] * 0.6, PAL.fire6, 200);
        });
    }
    if (ev.listenerCount('ui:popup') === 0) {
        ev.on('ui:popup', e => {
            const t = scene.add.text(e.x, e.y, e.text, { fontFamily: 'monospace', fontSize: '8px', color: '#ffe066' })
                .setOrigin(0.5).setDepth(DEPTH.FX_TOP);
            scene.tweens.add({ targets: t, y: e.y - 16, alpha: 0, duration: 700, onComplete: () => t.destroy() });
        });
    }
    if (ev.listenerCount('ui:prompt') === 0) {
        ev.on('ui:prompt', e => {
            const t = scene.add.text(scene.scale.width / 2, 40, e.text, {
                fontFamily: 'monospace', fontSize: '9px', color: '#f4f0f6', backgroundColor: '#1a1220aa', padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.FX_TOP);
            scene.time.delayedCall(e.ms ?? 1500, () => t.destroy());
        });
    }
    void Phaser;
}
