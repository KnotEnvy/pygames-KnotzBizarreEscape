import type { ExplosionSize, GameContext } from '../core';
import { ambience, type SpatialFx } from './campaign';
import type { FxDirector } from './director';

/** Opt-in dev visual QA. Uses catalog events; never applies damage or replaces level/player code. */
export function installGallery(ctx: GameContext, fx: FxDirector): void {
    const mode = new URLSearchParams(location.search).get('fxtest');
    const weather = ambience(mode);
    if (weather) fx.preview(weather);
    if (mode === 'phasee' || mode === 'derail') fx.preview(mode === 'derail' ? 'train' : 'blizzard');
    const sizes: ExplosionSize[] = ['s', 'm', 'l', 'xl'];
    let elapsed = 0, step = 0;
    ctx.debug.register('fxGallery', () => ({ mode, step }));
    ctx.onUpdate(dt => {
        elapsed += dt;
        if (elapsed < (mode === 'derail' ? 5200 : 1200)) return;
        elapsed = 0;
        const view = ctx.camera.view();
        const x = view.left + view.width * 0.62;
        const y = (ctx.physics.groundBelow(x, view.top) ?? view.bottom - 20) - 12;
        const emit = (e: SpatialFx): void => ctx.events.emit('fx:emit', e);
        if (mode === 'phasee') {
            switch (step % 8) {
                case 0: emit({ effect: 'ice_skid', x, y: y + 12, count: 8 }); break;
                case 1: emit({ effect: 'ice_crack', x, y: y + 12, width: 64, duration: 1100 }); break;
                case 2: emit({ effect: 'ice_shatter', x, y: y + 12 }); break;
                case 3: emit({ effect: 'steam', x, y }); emit({ effect: 'smoke_stack', x: x + 48, y }); break;
                case 4: emit({ effect: 'cinder', x, y: y - 80 }); emit({ effect: 'mortar_marker', x, y: y + 12, duration: 1100 }); break;
                case 5: ctx.events.emit('boss:stomp', { x, y: y + 12, power: 2 }); break;
                case 6: emit({ effect: 'boss_chain', x: x - 56, y: y - 64, width: 112, height: 64, duration: 1000 }); break;
                case 7: emit({ effect: 'ground_marker', x, y: y + 12, duration: 1100 }); break;
            }
        } else if (mode === 'derail') emit({ effect: 'derail', x, y: y - 20 });
        else {
            ctx.events.emit('explosion', { x, y, size: sizes[step % 4], team: 'neutral' });
            if (step % 4 === 3) fx.splash(view.left + 80, y + 12);
        }
        step++;
    });
}
