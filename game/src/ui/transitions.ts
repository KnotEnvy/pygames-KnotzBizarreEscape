// Scene transitions: a hard-edged wipe (two bands, one half-transparent trailing) and plain fades.
// Each helper creates its own screen-space objects at a very high depth and removes them when done.
import Phaser from 'phaser';
import { UI } from '../config/tuning/ui';
import { C, H, W } from './widgets';

const DEPTH = 5000;

function band(scene: Phaser.Scene, x: number, alpha: number, color: number): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(x, 0, W + 32, H, color, 1).setOrigin(0, 0).setAlpha(alpha).setScrollFactor(0).setDepth(DEPTH);
}

/** Cover the screen left → right, then call `onDone` (start the next scene there). */
export function wipeOut(scene: Phaser.Scene, onDone: () => void, ms: number = UI.transition.wipeMs, color: number = C.outline): void {
    const solid = band(scene, -(W + 32), 1, color);
    const soft = band(scene, -(W + 32) - 24, 0.5, color);
    scene.tweens.add({ targets: soft, x: -24, duration: ms, ease: 'Quad.easeIn' });
    scene.tweens.add({ targets: solid, x: 0, duration: ms, ease: 'Quad.easeIn', onComplete: () => onDone() });
}

/** Start covered, uncover left → right. Safe to call in any scene's create(). */
export function wipeIn(scene: Phaser.Scene, ms: number = UI.transition.wipeMs, color: number = C.outline, onDone?: () => void): void {
    const solid = band(scene, 0, 1, color);
    const soft = band(scene, -24, 0.5, color);
    scene.tweens.add({ targets: soft, x: W + 8, duration: ms, ease: 'Quad.easeOut', onComplete: () => soft.destroy() });
    scene.tweens.add({ targets: solid, x: W + 32, duration: ms, ease: 'Quad.easeOut', onComplete: () => { solid.destroy(); onDone?.(); } });
}

export function fadeOut(scene: Phaser.Scene, onDone: () => void, ms: number = UI.transition.fadeMs, color: number = C.dim): Phaser.GameObjects.Rectangle {
    const r = band(scene, 0, 0, color);
    scene.tweens.add({ targets: r, alpha: 1, duration: ms, onComplete: () => onDone() });
    return r;
}

export function fadeIn(scene: Phaser.Scene, ms: number = UI.transition.fadeMs, color: number = C.dim): void {
    const r = band(scene, 0, 1, color);
    scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
}
