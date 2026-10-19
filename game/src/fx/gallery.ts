import type { ExplosionSize, GameContext } from '../core';
import { ambience, type SpatialFx } from './campaign';
import type { FxDirector } from './director';

/** Opt-in dev visual QA. Uses catalog events; never applies damage or replaces level/player code. */
export function installGallery(ctx: GameContext, fx: FxDirector): void {
    const mode = new URLSearchParams(location.search).get('fxtest');
    // Opt-in palette fixture: actual lake physics/actors, flat dusk sky and dark water for FX contrast review.
    if (new URLSearchParams(location.search).get('fxbackdrop') === 'dark') {
        const sky = ctx.scene.add.graphics().setDepth(17).setScrollFactor(0);
        const water = ctx.scene.add.graphics().setDepth(37).setScrollFactor(0);
        const off = ctx.onUpdate(() => {
            const v = ctx.camera.view(), cam = ctx.scene.cameras.main;
            const floor = (ctx.physics.groundBelow(v.left + v.width / 2, v.top, v.height) ?? v.bottom - 24) - cam.scrollY;
            sky.clear().fillStyle(0x3a4a6e, 1).fillRect(-16, -16, cam.width + 32, cam.height + 32);
            water.clear().fillStyle(0x1c2433, 1).fillRect(-16, floor, cam.width + 32, cam.height - floor + 16);
        });
        ctx.scene.events.once('shutdown', () => { off(); sky.destroy(); water.destroy(); });
    }
    const weather = ambience(mode);
    if (weather) fx.preview(weather);
    if (mode === 'clear') fx.preview(null);
    if (mode === 'phasee' || mode === 'derail') fx.preview(mode === 'derail' ? 'train' : 'blizzard');
    const sizes: ExplosionSize[] = ['s', 'm', 'l', 'xl'];
    const backgrounds = ['bg_flak', 'bg_explosion', 'bg_lightning', 'aurora', 'bg_birds', 'bg_smoke_plume', 'bg_avalanche', 'bg_mist', 'bg_wisp', 'bg_fireflies_swarm', 'bg_splash', 'bg_fire', 'bg_rain_curtain'];
    const bayou = ['bubbles', 'shotgun_pump', 'wake', 'drip', 'paddle_spray', 'bow_spray', 'mud_splat', 'gas_bubble', 'gas_cloud', 'gas_flame', 'flame_jet'];
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
        if (weather || mode === 'clear') { step++; return; }
        if (mode === 'water') {
            ctx.events.emit('water:splash', { x, y, size: sizes[step % 4], kind: step % 2 ? 'surface' : 'sink' });
        } else if (mode === 'shotgun') {
            ctx.events.emit('player:shoot', { weapon: 'shotgun', x, y: y - 16, angle: (step % 8) * Math.PI / 4 });
        } else if (mode === 'bayou' || bayou.includes(mode ?? '')) {
            emit({ effect: mode === 'bayou' ? bayou[step % bayou.length] : mode!, x, y, angle: 0 });
        } else if (mode === 'background' || backgrounds.includes(mode ?? '')) {
            const effect = mode === 'background' ? backgrounds[step % backgrounds.length] : mode!;
            const cam = ctx.scene.cameras.main, sf = .3;
            emit({ effect, x: x - cam.scrollX * (1 - sf), y: view.top + (effect === 'bg_smoke_plume' || effect === 'bg_mist' ? 100 : 38) - cam.scrollY * (1 - sf),
                bg: true, scrollFactor: sf, duration: effect === 'aurora' ? 18000 : undefined });
        } else if (mode === 'phasef') {
            const materials = ['flesh', 'metal', 'wood', 'snow'] as const;
            for (let i = 0; i < materials.length; i++) ctx.events.emit('projectile:impact', { x: view.left + 80 + i * 48, y: y - 12, material: materials[i], team: 'player', weapon: i === 1 ? 'hmg' : 'pistol' });
            emit({ effect: 'ice_impact', x: view.left + 280, y: y - 12 });
            if (step % 3 === 0) ctx.events.emit('enemy:killed', { x: view.left + 110, y, kind: 'grunt', cause: 'bullet', score: 0 });
            if (step % 3 === 1) ctx.events.emit('explosion', { x, y, size: sizes[step % 4], team: 'neutral' });
            if (step % 3 === 2) ctx.events.emit('player:shoot', { weapon: 'laser', x: view.left + 100, y: y - 18, angle: 0 });
        } else if (mode === 'phasee') {
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
