import Phaser from 'phaser';
import { settings, type GameContext } from '../core';
import { bounded, type SpatialFx } from './campaign';
import type { FxPool } from './pool';

const METAL = ['fx_debris_metal_v1', 'fx_debris_metal_v2', 'fx_debris_metal_v3', 'fx_debris_metal_v4'];

/** Cosmetic machine recipes. Fixed shared slots, per-recipe live caps, no timers or emitters. */
export class MachineFx {
    constructor(private readonly ctx: GameContext, private readonly pool: FxPool) {}

    emit(e: SpatialFx): boolean {
        const id = e.effect;
        if (id !== 'rotor_wash' && id !== 'boat_wake' && id !== 'mech_pop' && id !== 'smoke_trail') return false;
        this.pool.recipeScope = id;
        try {
            const scale = bounded(e.scale, 1, .5, 1.5);
            if (id === 'rotor_wash') this.wash(e);
            else if (id === 'boat_wake') this.wake(e, scale);
            else if (id === 'mech_pop') this.pop(e, scale);
            else this.smoke(e.x, e.y, scale);
        } finally { this.pool.recipeScope = undefined; }
        return true;
    }

    private wash(e: SpatialFx): void {
        const strength = bounded(e.count, 1, 0, 1);
        if (strength === 0) return;
        const width = bounded(e.width, 64, 16, 160), water = e.material === 'water';
        const snow = e.material === 'snow', dust = e.material === 'dirt' || e.material === 'mud';
        if (water) {
            const ring = this.pool.spawn('combat', 'fx_water_ripple_expand', e.x, e.y, 0, width / 32);
            if (ring) { ring.image.setScale(width / 32, .45); ring.alpha = .3 + strength * .35; ring.life = 330; }
        }
        // Opposed pairs outline a flattened radial ring, leaving the centre clear.
        const pairs = strength < .4 ? 1 : 2;
        for (let i = 0; i < pairs * 2; i++) {
            const dir = i % 2 ? 1 : -1;
            const tag = dust ? 'fx_dust_run' : water || snow ? 'fx_snow_v1' : 'fx_debris_rock_v1';
            const s = this.pool.spawn('combat', tag, e.x + dir * width * (.16 + Math.floor(i / 2) * .14), e.y - 1);
            if (!s) break;
            s.vx = dir * (30 + 65 * strength); s.vy = -4 - strength * 9;
            s.life = dust ? 280 : 240; s.fade = 150; s.alpha = .35 + strength * .4;
            s.image.setScale(dust ? .55 : snow || water ? 2.5 : .45, dust ? .32 : .65);
            const color = water ? 0xa8d4f0 : snow ? 0xf4f0f6 : e.material === 'mud' ? 0x6e4628 : dust || e.material === 'wood' ? 0xa88c52 : 0x75899c;
            s.image.setTint(color).setTintMode(Phaser.TintModes.FILL);
        }
    }

    private wake(e: SpatialFx, scale: number): void {
        const a = bounded(e.angle, 0, -Math.PI * 2, Math.PI * 2), dx = Math.cos(a), dy = Math.sin(a);
        const bow = this.pool.spawn('combat', 'fx_boat_foam_bow', e.x + dx * 28 * scale, e.y + dy * 28 * scale, 0, scale);
        if (bow) {
            bow.image.setOrigin(.5, .75).setFlipX(dx < 0).setRotation(dx < 0 ? a - Math.PI : a); bow.life = 260; bow.fade = 100;
            bow.vx = dx * 12; bow.vy = dy * 12; bow.alpha = .85;
        }
        const foam = this.pool.spawn('combat', 'fx_boat_foam_stern', e.x - dx * 30 * scale, e.y - dy * 30 * scale, 0, scale);
        if (foam) {
            foam.image.setRotation(a).setScale(scale * 1.2, scale * .65);
            foam.life = 600; foam.fade = 300; foam.alpha = .8;
            foam.vx = -dx * 23; foam.vy = -dy * 23; foam.growX = .6; foam.growY = .15;
        }
    }

    private pop(e: SpatialFx, scale: number): void {
        // Hardware before sparks: a saturated swarm keeps its mechanical silhouette.
        const count = scale < .75 ? 3 : 5;
        for (let i = 0; i < count + 3; i++) {
            const spring = i === count, glass = i > count;
            const s = this.pool.spawn('combat', spring ? 'fx_machine_bits_spring' : glass ? 'fx_machine_bits_glass' : i === 0 ? 'fx_machine_bits_bolt' : METAL[i % 4], e.x, e.y, 0, scale);
            if (!s) break;
            s.vx = this.ctx.rng.range(-85, 85) * scale; s.vy = this.ctx.rng.range(-135, -55) * scale;
            s.gravity = 330; s.bounce = spring ? 3 : 2; s.spin = true;
            s.life = spring ? 850 : 650; s.fade = 180;
        }
        const reduced = settings.get().reducedFlash;
        for (let i = 0; i < (reduced ? 3 : 6); i++) {
            const s = this.pool.spawn('combat', 'fx_sparks_v1', e.x, e.y, 0, scale);
            if (!s) break;
            const a = this.ctx.rng.range(-Math.PI, 0);
            s.vx = Math.cos(a) * 95 * scale; s.vy = Math.sin(a) * 95 * scale;
            s.gravity = 220; s.life = 220; s.fade = 130; s.alpha = reduced ? .4 : .8;
            s.image.setRotation(a);
        }
        this.smoke(e.x, e.y, scale * .8);
    }

    private smoke(x: number, y: number, scale: number): void {
        const s = this.pool.spawn('smoke', 'fx_smoke_drift', x, y, 0, scale * .55);
        if (!s) return;
        s.vx = this.ctx.rng.range(-8, 8); s.vy = -18; s.life = 600; s.fade = 260; s.alpha = .28;
        s.growX = .18 * scale; s.growY = .48 * scale;
        s.image.setTint(0x9a93a8);
    }
}
