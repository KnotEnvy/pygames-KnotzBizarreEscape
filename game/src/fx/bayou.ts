import Phaser from 'phaser';
import type { GameContext, GameEvents } from '../core';
import type { SpatialFx } from './campaign';
import type { FxPool } from './pool';

/** Mission 2 recipes share the fixed pools and authored Mission 1 pixel library. */
export class BayouFx {
    constructor(private readonly ctx: GameContext, private readonly pool: FxPool) {}
    water(e: GameEvents['water:splash']): void {
        const scale = { s: .35, m: .7, l: 1, xl: 1.8 }[e.size];
        const splash = this.pool.spawn('dust', 'fx_water_splash_fall', e.x, e.y, 0, scale);
        splash?.image.setOrigin(.5, 47 / 56);
        for (let i = 0; i < (e.size === 'xl' ? 3 : 1); i++) {
            const ring = this.pool.spawn('impact', 'fx_water_ripple_expand', e.x, e.y, 90 + i * 120, scale * (1.5 + i * .4));
            if (ring) ring.alpha = .7;
        }
        this.drops(e.x, e.y, e.size === 'xl' ? 20 : e.size === 'l' ? 10 : e.size === 'm' ? 5 : 2, scale);
        if (e.kind === 'surface' || e.kind === 'sink') for (let i = 0; i < 6; i++) {
            const bubble = this.pool.spawn('combat', 'fx_water_ripple_expand', e.x + this.ctx.rng.range(-20, 20) * scale, e.y + 8, i * 65, .12);
            if (bubble) { bubble.life = 500; bubble.vy = -18; bubble.alpha = .6; }
        }
        if (e.size === 'xl' && e.kind === 'surface') for (let i = -2; i <= 2; i++) {
            const fall = this.pool.spawn('dust', 'fx_water_splash_fall', e.x + i * 24, e.y - 30, 100 + Math.abs(i) * 60, .7);
            if (fall) { fall.image.setOrigin(.5, 47 / 56); fall.vy = 65; fall.alpha = .7; }
        }
    }
    private drops(x: number, y: number, count: number, scale: number, angle?: number): void {
        for (let i = 0; i < count; i++) {
            const s = this.pool.spawn('combat', 'fx_snow_v1', x, y);
            if (!s) break;
            const a = angle === undefined ? this.ctx.rng.range(-2.9, -.25) : angle + this.ctx.rng.range(-.45, .45);
            const speed = this.ctx.rng.range(35, 100) * scale;
            s.vx = Math.cos(a) * speed; s.vy = Math.sin(a) * speed; s.gravity = 230;
            s.life = 500; s.fade = 170; s.alpha = .8;
            s.image.setScale(1, 2).setTint(0x82cddd).setTintMode(Phaser.TintModes.FILL);
        }
    }
    emit(e: SpatialFx): boolean {
        const scale = Math.max(.25, Math.min(2, e.scale ?? 1));
        switch (e.effect) {
            case 'bubbles':
                for (let i = 0; i < Math.max(1, Math.min(6, e.count ?? 2)); i++) {
                    const s = this.pool.spawn('combat', 'fx_water_ripple_expand', e.x + this.ctx.rng.range(-5, 5), e.y, i * 35, .14 * scale);
                    if (s) { s.life = 420; s.vy = -22; s.vx = this.ctx.rng.range(-4, 4); s.alpha = .8; s.fade = 160; s.image.setScale(.14 * scale, .3 * scale); }
                }
                return true;
            case 'wake': {
                const s = this.pool.spawn('impact', 'fx_water_ripple_expand', e.x, e.y, 0, scale);
                if (s) { s.vx = -Math.cos(e.angle ?? 0) * 20; s.alpha = .6; s.image.setScale(scale * 2, scale * .6); }
                return true;
            }
            case 'drip': case 'water_drip': case 'paddle_spray': case 'bow_spray':
                this.drops(e.x, e.y, e.effect.includes('drip') ? 2 : 8, scale, e.angle ?? (e.effect.includes('drip') ? Math.PI / 2 : e.effect === 'bow_spray' ? -2.4 : -1.2)); return true;
            case 'mud_splat': {
                const s = this.pool.spawn('impact', 'fx_impact_dirt_burst', e.x, e.y, 0, scale);
                s?.image.setOrigin(.5, 20 / 24).setTint(0x392219).setTintMode(Phaser.TintModes.FILL);
                for (let i = 0; i < 4; i++) {
                    const chip = this.pool.spawn('combat', 'fx_debris_rock_v1', e.x, e.y, 0, .6);
                    if (chip) { chip.vx = this.ctx.rng.range(-35, 35); chip.vy = this.ctx.rng.range(-55, -20); chip.gravity = 250; chip.life = 350; chip.image.setTint(0x392219).setTintMode(Phaser.TintModes.FILL); }
                }
                return true;
            }
            case 'gas_bubble':
                for (let i = 0; i < 4; i++) {
                    const s = this.pool.spawn('impact', 'fx_water_ripple_expand', e.x + (i - 1.5) * 6, e.y, i * 130, .25);
                    if (s) { s.life = 300; s.vy = -6; s.image.setTint(0x6ab9a4).setTintMode(Phaser.TintModes.FILL); }
                }
                return true;
            case 'gas_cloud': case 'gas_flame': case 'flame_jet': {
                const cloud = e.effect === 'gas_cloud';
                for (let i = 0; i < (cloud ? 4 : 6); i++) {
                    const jet = e.effect === 'flame_jet', a = e.angle ?? 0;
                    const x = e.x + (jet ? Math.cos(a) * i * 13 : (i % 2 ? -1 : 1) * 5);
                    const y = e.y + (jet ? Math.sin(a) * i * 13 : -i * 9);
                    const s = this.pool.spawn(cloud ? 'smoke' : 'dust', cloud ? 'fx_smoke_drift' : 'fx_muzzle_flame_right', x, y, i * 30, scale);
                    if (s) { s.life = cloud ? 900 : 450; s.fade = 220; s.vy = -12; s.alpha = cloud ? .25 : .7; if (cloud) s.image.setTint(0x6ab9a4).setTintMode(Phaser.TintModes.FILL);
                        else { s.loop = true; s.image.setOrigin(8 / 48, .5).setRotation(jet ? a : -Math.PI / 2).setScale(scale * .65); } }
                }
                return true;
            }
            default: return false;
        }
    }
}
