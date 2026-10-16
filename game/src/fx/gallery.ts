import type { ExplosionSize, GameContext } from '../core';
import type { FxDirector } from './director';

/** Opt-in visual QA only. Uses real catalog events, never applies damage or replaces level/player code. */
export function installGallery(ctx: GameContext, fx: FxDirector): void {
    const sizes: ExplosionSize[] = ['s', 'm', 'l', 'xl'];
    let elapsed = 0, step = 0;
    ctx.debug.register('fxGallery', () => step);
    ctx.onUpdate(dt => {
        elapsed += dt;
        if (elapsed < 1200) return;
        elapsed = 0;
        const view = ctx.camera.view();
        const x = view.left + view.width * 0.62;
        const y = (ctx.physics.groundBelow(x, view.top) ?? view.bottom - 20) - 12;
        ctx.events.emit('explosion', { x, y, size: sizes[step % 4], team: 'neutral' });
        if (step % 4 === 3) fx.splash(view.left + 80, y + 12);
        step++;
    });
}
