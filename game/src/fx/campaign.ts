import Phaser from 'phaser';
import { DEPTH, settings, type GameContext, type GameEvents, type ExplosionSize } from '../core';
import { FX } from '../config/tuning/fx';
import type { FxPool } from './pool';

/** Additive local contract while other teams update the shared event catalog. */
export type SpatialFx = GameEvents['fx:emit'] & {
    duration?: number; durationMs?: number; width?: number; height?: number; speed?: number;
};
export function bounded(value: number | undefined, fallback: number, low: number, high: number): number {
    return Number.isFinite(value) ? Math.max(low, Math.min(high, value!)) : fallback;
}
export type Ambience = 'snow' | 'embers' | 'fireflies' | 'steam' | 'train' | 'tunnel' | 'blizzard' | 'swamp' | 'rain' | 'storm' | 'fog' | 'river' | null;
export function ambience(value: unknown): Ambience {
    return value === 'snow' || value === 'embers' || value === 'fireflies' || value === 'steam' ||
        value === 'train' || value === 'tunnel' || value === 'blizzard' || value === 'swamp' ||
        value === 'rain' || value === 'storm' || value === 'fog' || value === 'river' ? value : null;
}

/** Fixed-capacity spatial drawings and crash schedule; no gameplay timers or damage. */
export class CampaignFx {
    private readonly marks = Array.from({ length: 20 }, () => ({ active: false, crack: false, x: 0, y: 0, width: 0, age: 0, life: 1 }));
    private readonly bursts = Array.from({ length: 32 }, () => ({ active: false, x: 0, y: 0, due: 0, size: 'm' as ExplosionSize, finale: false }));
    private readonly ground: Phaser.GameObjects.Graphics;
    private readonly reveal: Phaser.GameObjects.Graphics;
    private revealAge = Infinity;
    private revealDuration = FX.campaign.revealMs as number;
    private shakeAge = Infinity;
    private shakeDuration = 1;
    private shakeDebt = 0;
    private clock = 0;
    private lastDerail = -Infinity;
    readonly stats = { markers: 0, cracks: 0, scheduled: 0, reveals: 0, derails: 0, stomp: 0, reveal: false };

    constructor(private readonly ctx: GameContext, private readonly pool: FxPool,
        private readonly explode: (x: number, y: number, size: ExplosionSize) => void,
        private readonly finale: (x: number, y: number) => void,
        private readonly feel: (tier: number, stop: number) => void,
        private readonly splash: (x: number, y: number) => void) {
        this.ground = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES - 1);
        // Short in-Game curtain at part entry; HUD belongs to its separate Scene.
        this.reveal = ctx.scene.add.graphics().setDepth(DEPTH.FX_TOP).setScrollFactor(0);
    }

    get derailRecent(): boolean { return this.clock - this.lastDerail < 5000; }
    startPart(): void {
        this.reset();
        this.revealAge = 0;
        this.revealDuration = settings.get().reducedFlash || matchMedia('(prefers-reduced-motion: reduce)').matches ? 160 : FX.campaign.revealMs;
        this.stats.reveals++;
        this.drawReveal();
    }
    private drawReveal(): void {
        this.reveal.clear();
        this.stats.reveal = this.revealAge < this.revealDuration;
        if (!this.stats.reveal) return;
        const cam = this.ctx.scene.cameras.main;
        const progress = Math.min(1, this.revealAge / this.revealDuration);
        const width = Math.ceil(cam.width * (1 - progress) ** 2 / 2);
        this.reveal.fillStyle(0x1a1220, settings.get().reducedFlash ? 0.6 : 1);
        this.reveal.fillRect(0, 0, width, cam.height).fillRect(cam.width - width, 0, width, cam.height);
    }
    emit(e: SpatialFx): boolean {
        const scale = bounded(e.scale, 1, 0.25, 2);
        const duration = bounded(e.duration ?? e.durationMs, e.effect === 'ice_crack' ? 600 : 900, 80, 8000);
        switch (e.effect) {
            case 'ice_skid':
                this.ice(e.x, e.y, bounded(e.count, 5, 0, 16), scale, e.angle ?? 0, false); return true;
            case 'ice_shatter':
                for (const m of this.marks) if (m.active && m.crack && Math.abs(m.x - e.x) <= bounded(e.width, 32, 8, 256) && Math.abs(m.y - e.y) < 16) m.active = false;
                this.ice(e.x, e.y, bounded(e.count, 10, 0, 24), scale, 0, true);
                this.splash(e.x, e.y); return true;
            case 'ice_crack': case 'mortar_marker': case 'ground_marker': {
                let m = this.marks.find(m => !m.active);
                // Coalesce repeated crack/marker updates at the same target; never evict unrelated warning markers.
                const crack = e.effect === 'ice_crack';
                m = this.marks.find(m => m.active && m.crack === crack && Math.abs(m.x - e.x) < 4 && Math.abs(m.y - e.y) < 4) ?? m;
                if (m) { m.active = true; m.crack = crack; m.x = e.x; m.y = e.y; m.width = bounded(e.width, crack ? 32 : 28, 8, 256) * scale; m.age = 0; m.life = duration; }
                return true;
            }
            case 'cinder': {
                if (this.pool.combatLive.embers >= 16) return true;
                const s = this.pool.spawn('combat', 'fx_embers_v2', e.x, e.y, 0, scale);
                if (s) {
                    const speed = bounded(e.speed, 55, 0, 400), angle = e.angle ?? Math.PI / 2;
                    s.vx = Math.cos(angle) * speed; s.vy = Math.sin(angle) * speed; s.gravity = 65;
                    s.life = duration; s.fade = 180; s.alpha = 0.7; s.loop = true;
                    s.image.setBlendMode(Phaser.BlendModes.ADD);
                }
                return true;
            }
            case 'smoke_stack': {
                for (let i = 0; i < bounded(e.count, 2, 0, 4); i++) {
                    const s = this.pool.spawn('smoke', 'fx_smoke_drift', e.x, e.y, i * 90, scale);
                    if (!s) break;
                    s.image.setTint(0x48405a).setTintMode(Phaser.TintModes.FILL);
                    s.alpha = 0.28; s.vx = -30; s.vy = -28; s.fade = 220;
                }
                return true;
            }
            case 'boss_chain': case 'derail': this.chain(e); return true;
            default: return false;
        }
    }
    private ice(x: number, y: number, count: number, scale: number, angle: number, shatter: boolean): void {
        const puff = this.pool.spawn('dust', 'fx_impact_snow_burst', x, y, 0, scale);
        if (puff) { puff.alpha = 0.65; puff.image.setOrigin(0.5, 20 / 24); }
        count = Math.min(count, 64 - this.pool.combatLive.debris);
        for (let i = 0; i < count; i++) {
            const s = this.pool.spawn('combat', i % 2 ? 'fx_debris_rock_v1' : 'fx_debris_rock_v3', x, y - 1, 0, scale * 0.7);
            if (!s) break;
            s.image.setTint(i % 2 ? 0xa8d4f0 : 0x6aa2dc).setTintMode(Phaser.TintModes.FILL);
            s.vx = shatter ? this.ctx.rng.range(-90, 90) : -Math.cos(angle) * this.ctx.rng.range(20, 65);
            s.vy = this.ctx.rng.range(shatter ? -125 : -50, -20); s.gravity = 300;
            s.life = shatter ? 650 : 320; s.fade = 130; s.alpha = 0.85;
        }
    }
    stomp(x: number, y: number, power: number): void {
        const p = bounded(power, 1, 0.25, 3);
        const ring = this.pool.spawn('dust', 'fx_shockwave_expand', x, y, 0, 0.7 + p * 0.35);
        if (ring) { ring.alpha = 0.65; ring.image.setDepth(DEPTH.DECALS + 1).setTint(0xc9c3d1).setTintMode(Phaser.TintModes.FILL); }
        for (const side of [-1, 1]) {
            const s = this.pool.spawn('dust', 'fx_dust_land', x + side * 12, y, 0, 0.5 + p * 0.25);
            if (s) { s.vx = side * 35 * p; s.alpha = 0.6; s.image.setOrigin(0.5, 0.8); }
        }
        this.feel(Math.min(4, Math.ceil(p + 1)), 0); this.stats.stomp++;
    }
    private chain(e: SpatialFx): void {
        const derail = e.effect === 'derail';
        if (derail && this.derailRecent) return;
        const count = Math.round(bounded(e.count, derail ? 10 : 7, 1, 16));
        const duration = bounded(e.duration ?? e.durationMs, derail ? 1800 : 1400, 300, 4000);
        const width = bounded(e.width, derail ? 220 : 112, 8, 480), height = bounded(e.height, derail ? 80 : 64, 8, 192);
        const left = e.x - (derail ? width / 2 : 0), top = e.y - (derail ? height / 2 : 0);
        // Reserve finale first even when the optional schedule is already busy.
        if (derail) {
            this.lastDerail = this.clock; this.stats.derails++;
            this.schedule(e.x, e.y, duration, 'xl', true);
            this.shakeAge = 0; this.shakeDuration = duration + 300; this.shakeDebt = 0;
            this.feel(4, 75);
            for (let i = 0; i < 14 && this.pool.combatLive.debris < 64; i++) {
                const s = this.pool.spawn('combat', i % 2 ? 'fx_debris_metal_v1' : 'fx_debris_metal_v3', e.x, e.y);
                if (!s) break;
                s.vx = this.ctx.rng.range(-170, 130); s.vy = this.ctx.rng.range(-170, -60);
                s.gravity = 300; s.life = 1400; s.fade = 260; s.bounce = 2;
            }
        }
        for (let i = 0; i < count; i++) {
            const x = left + this.ctx.rng.range(0, width), y = top + this.ctx.rng.range(0, height);
            this.schedule(x, y, i * duration / count, i % 3 === 2 ? 'l' : 'm', false);
            if (derail && i % 3 === 0 && this.pool.countTexture('fx_steam') < 6) {
                const s = this.pool.spawn('smoke', 'fx_steam_vent', x, y, i * duration / count, 1.4);
                if (s) { s.alpha = 0.28; s.vy = -30; s.vx = -35; s.image.setOrigin(0.5, 44 / 48); }
            }
        }
    }
    private schedule(x: number, y: number, delay: number, size: ExplosionSize, finale: boolean): void {
        const slot = this.bursts.find(b => !b.active) ?? (finale ? this.bursts.find(b => !b.finale) : undefined);
        if (!slot) return;
        slot.active = true; slot.x = x; slot.y = y; slot.due = delay; slot.size = size; slot.finale = finale;
    }
    update(dt: number, realDt: number): void {
        this.clock += dt;
        for (const b of this.bursts) if (b.active) {
            b.due -= dt;
            if (b.due > 0 || dt === 0) continue;
            b.active = false;
            if (b.finale) this.finale(b.x, b.y); else this.explode(b.x, b.y, b.size);
        }
        if (this.shakeAge < this.shakeDuration) {
            this.shakeAge += realDt; this.shakeDebt -= realDt;
            if (this.shakeDebt <= 0) { this.feel(this.shakeAge < this.shakeDuration * 0.6 ? 3 : 2, 0); this.shakeDebt = 160; }
        }
        this.revealAge += realDt;
        this.drawReveal();
        this.drawMarks(dt);
        this.stats.scheduled = this.bursts.reduce((n, b) => n + Number(b.active), 0);
    }
    private drawMarks(dt: number): void {
        const g = this.ground.clear();
        const reduced = settings.get().reducedFlash;
        this.stats.markers = this.stats.cracks = 0;
        const view = this.ctx.camera.view();
        for (const m of this.marks) {
            if (!m.active) continue;
            m.age += dt;
            if (m.age >= m.life) { m.active = false; continue; }
            if (m.crack) this.stats.cracks++; else this.stats.markers++;
            if (m.x + m.width < view.left || m.x - m.width > view.right || m.y < view.top || m.y > view.bottom) continue;
            const x = Math.round(m.x), y = Math.round(m.y), half = Math.round(m.width / 2);
            if (m.crack) {
                const stage = Math.min(3, 1 + Math.floor(3 * m.age / m.life));
                const reach = Math.round(half * stage / 3);
                g.lineStyle(2, 0x1c2433, 0.95).beginPath().moveTo(x - reach, y).lineTo(x - 3, y + 2).lineTo(x + 3, y - 1).lineTo(x + reach, y + 1).strokePath();
                g.lineStyle(1, 0xa8d4f0, 0.9).beginPath().moveTo(x - reach, y - 1).lineTo(x - 3, y + 1).lineTo(x + 3, y - 2).lineTo(x + reach, y).strokePath();
                if (stage > 1) g.lineStyle(1, 0x1c2433, 1).lineBetween(x - 3, y + 2, x - 8, y + 5).lineBetween(x + 3, y - 2, x + 9, y - 5);
            } else {
                // Persistent outline, slower dim/bright fill: never disappears between blinks.
                const alpha = reduced ? 0.85 : 0.55 + 0.35 * Math.sin(m.age * Math.PI / 360) ** 2;
                g.lineStyle(3, 0x1a1220, 0.95).strokeEllipse(x, y, m.width, 6);
                g.lineStyle(1, 0xffae22, alpha).strokeEllipse(x, y, m.width, 6);
                g.lineBetween(x - half - 3, y - 4, x - half - 3, y + 3).lineBetween(x + half + 3, y - 4, x + half + 3, y + 3);
                g.lineBetween(x - 3, y, x + 3, y).lineBetween(x, y - 3, x, y + 2);
            }
        }
    }
    clearCombat(): void {
        for (const m of this.marks) m.active = false;
        this.ground.clear();
    }
    reset(): void {
        this.clearCombat();
        for (const b of this.bursts) b.active = false;
        this.revealAge = this.shakeAge = Infinity; this.lastDerail = -Infinity;
        this.reveal.clear();
    }
    destroy(): void { this.reset(); this.ground.destroy(); this.reveal.destroy(); }
}
