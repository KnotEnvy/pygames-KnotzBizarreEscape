import Phaser from 'phaser';
import { DEPTH, settings, type GameContext } from '../core';
import { FX } from '../config/tuning/fx';
import { bounded, type Ambience } from './campaign';
import type { FxPool } from './pool';

/** One reused geometry batch, plus the existing ambient pool. Always below combat silhouettes. */
export class FxWeather {
    private readonly veil: Phaser.GameObjects.Graphics;
    private clock = 0;
    private drift = FX.weather.drift as number;
    private distance = 0;
    private sparkDebt = 0;
    readonly stats = { drift: 180, gust: 0, mode: null as Ambience };
    constructor(private readonly ctx: GameContext, private readonly pool: FxPool) {
        this.veil = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES - 2);
    }
    readDrift(): void {
        const map = this.ctx.level.groundLayer?.tilemap;
        const props = map?.properties as { name: string; value: unknown }[] | Record<string, unknown> | undefined;
        let value: unknown = Array.isArray(props) ? props.find(p => p.name === 'drift')?.value : props?.drift;
        if (value === undefined) {
            const key = (this.ctx as { part?: { map: string } }).part?.map;
            const cached = key ? this.ctx.scene.cache.tilemap.get(key)?.data : undefined;
            value = cached?.properties?.find((p: { name: string }) => p.name === 'drift')?.value;
        }
        this.drift = bounded(typeof value === 'number' ? value : undefined, FX.weather.drift, -600, 600);
        this.stats.drift = this.drift;
    }
    begin(dt: number): void {
        this.clock += dt;
        this.distance += this.drift * dt / 1000;
        this.sparkDebt += dt;
        this.veil.clear(); this.stats.mode = null;
        this.stats.gust = Math.max(0, Math.sin(this.clock / 1100)) ** 4;
    }
    region(kind: Ambience, left: number, top: number, right: number, bottom: number): void {
        if (kind !== 'train' && kind !== 'tunnel' && kind !== 'blizzard') return;
        if (this.stats.mode !== 'tunnel') this.stats.mode = kind;
        const g = this.veil;
        // Engine view() excludes shake; overscan only viewport edges so dark weather never exposes bright gutters.
        const view = this.ctx.camera.view();
        const lampTop = top;
        if (kind !== 'train') {
            if (left <= view.left) left -= 16;
            if (right >= view.right) right += 16;
            if (top <= view.top) top -= 16;
            if (bottom >= view.bottom) bottom += 16;
        }
        const width = right - left, height = bottom - top;
        const gust = this.stats.gust;
        if (kind === 'tunnel') {
            g.fillStyle(0x1a1220, FX.weather.tunnelAlpha).fillRect(left, top, width, height);
            // World-anchored lamps travel left with the map drift. Flat stepped light, no camera filter.
            const spacing = 160, phase = ((this.distance % spacing) + spacing) % spacing;
            const start = Math.floor(left / spacing) * spacing - phase;
            for (let x = start; x < right + spacing; x += spacing) {
                const lampX = Math.round(x), beamLeft = Math.max(left, lampX - 28), beamRight = Math.min(right, lampX + 28);
                if (beamRight <= beamLeft) continue;
                g.fillStyle(0xf0e0a8, settings.get().reducedFlash ? 0.07 : 0.13).fillRect(beamLeft, lampTop + 8, beamRight - beamLeft, bottom - lampTop - 8);
                if (lampX >= left && lampX + 8 < right) {
                    g.fillStyle(0x7a6236, 1).fillRect(lampX - 1, lampTop + 5, 10, 4);
                    g.fillStyle(0xf0e0a8, 0.85).fillRect(lampX, lampTop + 6, 8, 2);
                }
            }
        } else if (kind === 'blizzard') {
            g.fillStyle(0xa8d4f0, FX.weather.blizzardAlpha * gust).fillRect(left, top, width, height);
            for (let i = 0; i < 3; i++) {
                const y = top + ((this.clock * 0.016 + i * 71) % Math.max(1, height));
                g.fillStyle(0xa8d4f0, 0.035 * gust).fillRect(left, Math.floor(y), width, Math.min(9, bottom - y));
            }
        }
        if (kind === 'train' && this.sparkDebt >= 650 && this.pool.combatLive.sparks < 80) {
            this.sparkDebt = 0;
            const x = this.ctx.rng.range(left, right);
            const y = this.ctx.physics.groundBelow(x, top, height) ?? bottom - 8;
            const s = this.pool.spawn('combat', 'fx_sparks_v3', x, Math.min(bottom - 2, y + 8));
            if (s) { s.vx = -this.drift * 0.7; s.vy = -22; s.gravity = 180; s.life = 230; s.fade = 100; s.alpha = 0.6; }
        }
    }
    emit(kind: Ambience, left: number, top: number, right: number, bottom: number): boolean {
        if (kind !== 'train' && kind !== 'blizzard' && kind !== 'tunnel') return false;
        if (kind === 'tunnel') return true;
        if (this.pool.countTexture('fx_snow') >= FX.weather.snowCap) return true;
        const train = kind === 'train', gust = this.stats.gust;
        const drift = train ? this.drift : 145;
        const direction = drift < 0 ? 1 : -1;
        const speed = Math.max(25, Math.abs(drift)) * (train ? 0.85 : 1.15) * (1 + gust * 0.6);
        // Seed across the view and top/right edges; no new emitter, body or filter per flake.
        const x = this.ctx.rng.chance(0.65) ? direction < 0 ? right + 6 : left - 6 : this.ctx.rng.range(left, right);
        const y = this.ctx.rng.range(top - 6, bottom);
        const streak = this.ctx.rng.chance(train ? 0.4 : 0.25);
        const s = this.pool.spawn('ambient', streak ? 'fx_snow_v1' : 'fx_snow_v2', x, y);
        if (!s) return true;
        s.vx = direction * speed * this.ctx.rng.range(0.8, 1.2);
        s.vy = train ? this.ctx.rng.range(3, 12) : this.ctx.rng.range(32, 60);
        s.life = Math.min(4200, (right - left + 90) / speed * 1000); s.fade = 220;
        s.alpha = train ? 0.48 : 0.6; s.image.setDepth(DEPTH.ENEMIES - 3);
        s.image.setScale(streak ? bounded(speed / 65, 3, 2, 6) : 1, 1);
        s.image.setRotation(train ? 0 : -0.2);
        return true;
    }
    destroy(): void { this.veil.destroy(); }
}
