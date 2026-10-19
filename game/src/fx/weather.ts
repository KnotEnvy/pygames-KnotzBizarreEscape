import Phaser from 'phaser';
import { DEPTH, settings, type GameContext } from '../core';
import { FX } from '../config/tuning/fx';
import { bounded, type Ambience } from './campaign';
import type { FxPool } from './pool';

const LAMP_TEXTURE = 'fx_tunnel_lamplight';
const LAMP_WIDTH = 160, LAMP_HEIGHT = 216;

/** Reused weather geometry and five light sprites, all below combat silhouettes. */
export class FxWeather {
    private readonly veil: Phaser.GameObjects.Graphics;
    private readonly lamps: Phaser.GameObjects.Image[] = [];
    private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    private lampCount = 0;
    private clock = 0;
    private drift = FX.weather.drift as number;
    private distance = 0;
    private sparkDebt = 0;
    readonly stats = { drift: 180, gust: 0, mode: null as Ambience, lamps: 0, lampPulse: 0 };
    constructor(private readonly ctx: GameContext, private readonly pool: FxPool) {
        this.veil = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES - 2);
        this.makeLamplight();
        for (let i = 0; i < 5; i++) this.lamps.push(ctx.scene.add.image(0, 0, LAMP_TEXTURE)
            .setOrigin(0, 0).setDepth(DEPTH.ENEMIES - 1.5).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    }
    /** Bake continuous lateral/vertical falloff once; no filter or canvas upload in the frame loop. */
    private makeLamplight(): void {
        const textures = this.ctx.scene.textures;
        if (textures.exists(LAMP_TEXTURE)) return;
        const texture = textures.createCanvas(LAMP_TEXTURE, LAMP_WIDTH, LAMP_HEIGHT)!;
        const paint = texture.getContext(), pixels = paint.createImageData(LAMP_WIDTH, LAMP_HEIGHT);
        for (let y = 0; y < LAMP_HEIGHT; y++) for (let x = 0; x < LAMP_WIDTH; x++) {
            const dx = x - LAMP_WIDTH / 2, down = y - 43;
            const spread = 7 + Math.max(0, down) * 0.34;
            const side = Math.max(0, 1 - (dx / spread) ** 2) ** 2;
            const cone = down > 0 ? side * Math.min(1, down / 12) * Math.max(0, 1 - down / 164) * 0.38 : 0;
            const halo = Math.exp(-((dx / 17) ** 2 + ((y - 45) / 13) ** 2) * 2) * 0.72;
            const pool = Math.exp(-((dx / 52) ** 2 + ((y - 151) / 13) ** 2) * 2) * 0.24;
            // Amber/orange light rather than pale neutral fog; transparent edges never form bars.
            const index = (y * LAMP_WIDTH + x) * 4;
            pixels.data[index] = 255; pixels.data[index + 1] = 148; pixels.data[index + 2] = 46;
            pixels.data[index + 3] = Math.round(Math.min(1, cone + halo + pool) * 255);
        }
        paint.putImageData(pixels, 0, 0);
        texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
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
        for (const lamp of this.lamps) lamp.setVisible(false);
        this.lampCount = this.stats.lamps = this.stats.lampPulse = 0;
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
            g.fillStyle(0x080a14, FX.weather.tunnelAlpha).fillRect(left, top, width, height);
            // World-anchored lamps pass left at exactly map drift, also respecting camera travel.
            const spacing = FX.weather.lampSpacing, phase = ((this.distance % spacing) + spacing) % spacing;
            const start = Math.floor(left / spacing) * spacing - phase;
            const flashAllowed = !settings.get().reducedFlash && !this.reducedMotion.matches;
            const playerX = this.ctx.player()?.x ?? (left + width * 0.35);
            for (let x = start; x < right + spacing; x += spacing) {
                const lampX = Math.round(x), sourceLeft = lampX - LAMP_WIDTH / 2;
                const beamLeft = Math.max(left, sourceLeft), beamRight = Math.min(right, sourceLeft + LAMP_WIDTH);
                if (beamRight <= beamLeft) continue;
                const lamp = this.lamps[this.lampCount++];
                if (!lamp) break;
                // A local ~140 ms warm lift as a lamp passes Knotz. Never a camera/bullet flash.
                const pulse = flashAllowed ? Math.max(0, 1 - Math.abs(x - playerX) / 18) ** 2 : 0;
                lamp.setPosition(sourceLeft, lampTop).setAlpha(0.72 + pulse * 0.28)
                    .setCrop(beamLeft - sourceLeft, 0, beamRight - beamLeft, Math.min(LAMP_HEIGHT, bottom - lampTop)).setVisible(true);
                this.stats.lamps++;
                this.stats.lampPulse = Math.max(this.stats.lampPulse, pulse);
                if (lampX - 5 >= left && lampX + 5 < right) {
                    g.fillStyle(0x392219, 1).fillRect(lampX - 6, lampTop + 40, 12, 6);
                    g.fillStyle(0xffad42, 1).fillRect(lampX - 4, lampTop + 43, 8, 2);
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
        const streak = this.ctx.rng.chance(train ? 0.55 : 0.25);
        const s = this.pool.spawn('ambient', streak ? 'fx_snow_v1' : 'fx_snow_v2', x, y);
        if (!s) return true;
        s.vx = direction * speed * this.ctx.rng.range(0.8, 1.2);
        s.vy = train ? this.ctx.rng.range(3, 12) : this.ctx.rng.range(32, 60);
        s.life = Math.min(4200, (right - left + 90) / speed * 1000); s.fade = 220;
        s.alpha = train ? streak ? 0.78 : 0.62 : 0.6; s.image.setDepth(DEPTH.ENEMIES - 3);
        s.image.setScale(streak ? train ? bounded(speed / 22, 10, 8, 17) : bounded(speed / 65, 3, 2, 6) : 1, 1);
        if (train && streak) s.image.setTint(0xe2f3ff).setTintMode(Phaser.TintModes.FILL);
        s.image.setRotation(train ? 0 : -0.2);
        return true;
    }
    destroy(): void { this.veil.destroy(); for (const lamp of this.lamps) lamp.destroy(); }
}
