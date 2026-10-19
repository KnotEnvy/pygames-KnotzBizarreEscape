import Phaser from 'phaser';
import { DEPTH, settings, type GameContext } from '../core';
import { FX } from '../config/tuning/fx';
import { bounded, type Ambience } from './campaign';
import type { FxPool } from './pool';
import { FxFog, type FogBounds } from './fog';

const LAMP_TEXTURE = 'fx_tunnel_lamplight';
const LAMP_WIDTH = 160, LAMP_HEIGHT = 216;

/** Reused weather geometry and five light sprites, all below combat silhouettes. */
export class FxWeather {
    private readonly farRain: Phaser.GameObjects.Graphics;
    private readonly nearRain: Phaser.GameObjects.Graphics;
    private readonly drops = Array.from({ length: 48 }, (_, i) => ({ phase: (i * .61803398875) % 1, floor: 0, sampled: -Infinity }));
    private readonly banks = Array.from({ length: 6 }, () => ({ floor: 0, sampled: -Infinity }));
    private weatherMotes = 0;
    private ambientOccupied = 0;
    private lightningStart = -Infinity;
    private doubleStrike = false;
    private readonly fog: FxFog;
    private readonly veil: Phaser.GameObjects.Graphics;
    private readonly lamps: Phaser.GameObjects.Image[] = [];
    private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    private lampCount = 0;
    private clock = 0;
    private drift = FX.weather.drift as number;
    private distance = 0;
    private sparkDebt = 0;
    private nextLightning = 6500;
    private lightningUntil = 0;
    readonly stats = { drift: 180, gust: 0, mode: null as Ambience, lamps: 0, lampPulse: 0, lightningAlpha: 0, strikes: 0, motes: 0, doubleStrike: false };
    constructor(private readonly ctx: GameContext, private readonly pool: FxPool) {
        this.veil = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES - 2);
        this.farRain = ctx.scene.add.graphics().setDepth(DEPTH.TILES_BACK - 1);
        this.nearRain = ctx.scene.add.graphics().setDepth(DEPTH.PLAYER + 1);
        this.fog = new FxFog(ctx);
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
        this.farRain.clear(); this.nearRain.clear(); this.weatherMotes = this.stats.motes = 0;
        this.ambientOccupied = 0;
        for (const s of this.pool.slots) if (s.live && s.category === 'ambient') this.ambientOccupied++;
        this.fog.begin();
        this.veil.clear(); this.stats.mode = null; this.stats.lightningAlpha = 0;
        for (const lamp of this.lamps) lamp.setVisible(false);
        this.lampCount = this.stats.lamps = this.stats.lampPulse = 0;
        this.stats.gust = Math.max(0, Math.sin(this.clock / 1100)) ** 4;
    }
    region(kind: Ambience, left: number, top: number, right: number, bottom: number, fogBounds?: FogBounds): void {
        if (kind === 'rain' || kind === 'storm') {
            const storm = kind === 'storm', reduced = settings.get().reducedFlash || this.reducedMotion.matches;
            this.veil.fillStyle(0x1c2433, storm ? .24 : .14).fillRect(left - 8, top - 8, right - left + 16, bottom - top + 16);
            if (storm) {
                if (this.clock >= this.nextLightning) {
                    this.lightningStart = this.clock;
                    this.doubleStrike = !reduced && this.ctx.rng.chance(.3);
                    this.lightningUntil = this.clock + (reduced ? 700 : this.doubleStrike ? 650 : 300);
                    this.ctx.audio.sfx('thunder', { volume: .45 }); this.stats.strikes++;
                    this.nextLightning = this.clock + (reduced ? 14000 : 6500) + this.ctx.rng.range(0, reduced ? 2500 : 6500);
                }
                const age = this.clock - this.lightningStart;
                // At most two separated pulses, never a strobe. Reduced mode has one long dim lift.
                let lift = Math.max(0, 1 - age / (reduced ? 700 : 300));
                if (!reduced && this.doubleStrike && age >= 380) lift = Math.max(lift, .65 * Math.max(0, 1 - (age - 380) / 270));
                this.stats.doubleStrike = this.doubleStrike && !reduced;
                this.stats.lightningAlpha = lift * (reduced ? .045 : .32);
                if (this.clock < this.lightningUntil) {
                    this.veil.fillStyle(0xa8d4f0, this.stats.lightningAlpha).fillRect(left - 8, top - 8, right - left + 16, bottom - top + 16);
                    const bx = left + (right - left) * .72;
                    const alpha = reduced ? .24 * lift : .8 * lift;
                    this.farRain.lineStyle(1, 0xa8d4f0, alpha).beginPath().moveTo(bx, top + 8)
                        .lineTo(bx - 12, top + 30).lineTo(bx + 2, top + 28).lineTo(bx - 18, top + 63)
                        .lineTo(bx - 10, top + 46).strokePath();
                }
            }
            this.rain(storm, left, top, right, bottom);
            this.stats.mode = kind; return;
        }
        if (kind === 'swamp' || kind === 'river') {
            this.marsh(kind === 'river', left, top, right, bottom);
            this.stats.mode = kind; return;
        }
        if (kind !== 'train' && kind !== 'tunnel' && kind !== 'blizzard' && kind !== 'fog') { if (kind) this.stats.mode = kind; return; }
        if (this.stats.mode !== 'tunnel') this.stats.mode = kind;
        const g = this.veil;
        // Engine view() excludes shake; overscan only viewport edges so dark weather never exposes bright gutters.
        const view = this.ctx.camera.view();
        const lampTop = top;
        if (kind === 'fog') {
            // The camera-clipped region is only for lamps/emission. Feather the authored world bounds.
            this.weatherMotes += this.fog.draw(fogBounds?.x ?? left - 80, fogBounds?.y ?? top - 80,
                fogBounds ? fogBounds.x + fogBounds.width : right + 80,
                fogBounds ? fogBounds.y + fogBounds.height : bottom + 80,
                this.clock, Math.max(0, 64 - this.weatherMotes - this.ambientOccupied));
            this.stats.motes = this.weatherMotes;
            if (left >= right || top >= bottom) return;
        }
        if (kind !== 'train') {
            if (left <= view.left) left -= 16;
            if (right >= view.right) right += 16;
            if (top <= view.top) top -= 16;
            if (bottom >= view.bottom) bottom += 16;
        }
        const width = right - left, height = bottom - top;
        const gust = this.stats.gust;
        if (kind === 'tunnel' || kind === 'fog') {
            if (kind === 'tunnel') g.fillStyle(0x080a14, FX.weather.tunnelAlpha).fillRect(left, top, width, height);
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
                const edge = kind === 'fog' && fogBounds
                    ? Math.max(0, Math.min(1, (x - fogBounds.x) / 64, (fogBounds.x + fogBounds.width - x) / 64)) : 1;
                const fade = edge * edge * (3 - 2 * edge);
                lamp.setPosition(sourceLeft, lampTop).setAlpha((0.72 + pulse * 0.28) * fade).setVisible(true);
                // Fog light spills naturally across the bank; cropping it would reintroduce a vertical seam.
                if (kind === 'fog') lamp.setCrop();
                else lamp.setCrop(beamLeft - sourceLeft, 0, beamRight - beamLeft, Math.min(LAMP_HEIGHT, bottom - lampTop));
                this.stats.lamps++;
                this.stats.lampPulse = Math.max(this.stats.lampPulse, pulse);
                if (lampX - 5 >= left && lampX + 5 < right) {
                    g.fillStyle(0x392219, fade).fillRect(lampX - 6, lampTop + 40, 12, 6);
                    g.fillStyle(0xffad42, fade).fillRect(lampX - 4, lampTop + 43, 8, 2);
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
        if (kind === 'swamp' || kind === 'fog' || kind === 'river' || kind === 'rain' || kind === 'storm') {
            const x = this.ctx.rng.range(left, right), rain = kind === 'rain' || kind === 'storm';
            if (rain) { return true;            } else {
                const mist = kind === 'fog' || ((kind === 'swamp' || kind === 'river') && this.ctx.rng.chance(.22));
                const fly = kind === 'swamp' && !mist && this.ctx.rng.chance(.5);
                const floor = this.ctx.physics.groundBelow(x, top, bottom - top) ?? bottom - 4;
                const s = this.pool.spawn('ambient', mist ? 'fx_smoke_drift' : fly ? 'fx_firefly_pulse' : 'fx_snow_v1', x, mist || kind === 'river' ? floor - this.ctx.rng.range(4, 12) : floor - this.ctx.rng.range(12, 60));
                if (s) {
                    s.life = mist ? 2300 : 1500; s.fade = 600; s.loop = fly;
                    s.vx = kind === 'river' ? -Math.max(40, Math.abs(this.drift)) * .6 : mist ? -16 : this.ctx.rng.range(-8, 8);
                    s.vy = mist ? -2 : this.ctx.rng.range(-4, 4); s.alpha = mist ? .22 : fly ? .95 : .5;
                    s.image.setDepth(DEPTH.ENEMIES - 1);
                    if (fly) s.image.setBlendMode(Phaser.BlendModes.ADD).setScale(1.3);
                    if (mist) s.image.setScale(2, .5).setTint(0x6ab9a4);
                    else if (kind === 'river') s.image.setScale(7, .5).setTint(0x82cddd);
                    else if (!fly) s.image.setScale(.5).setTint(0x6ab9a4);
                }
            }
            return true;
        }
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
    /** Fixed 32/48 analytic drops replace short-lived scaled snow pixels. No emitter or per-drop allocation. */
    private rain(storm: boolean, left: number, top: number, right: number, bottom: number): void {
        const count = storm ? 48 : 32, width = right - left;
        const wind = storm ? 5 + this.stats.gust * 9 : 4;
        for (let i = 0; i < count && this.weatherMotes + this.ambientOccupied < 64; i++, this.weatherMotes++) {
            const d = this.drops[i], far = i % 3 === 0;
            const x = left + ((i * .754877666 + .13) % 1) * width;
            if (this.clock - d.sampled > 250 || d.floor < top || d.floor > bottom) {
                d.floor = this.ctx.physics.groundBelow(x, top, bottom - top) ?? bottom;
                d.sampled = this.clock;
            }
            const cycle = far ? 1250 : storm ? 650 : 850;
            const u = (this.clock / cycle + d.phase) % 1;
            const floor = Math.min(bottom, d.floor), travel = Math.max(16, floor - top);
            const g = far ? this.farRain : this.nearRain;
            if (u < .86) {
                const y = top + u / .86 * travel;
                const len = far ? 5 : storm ? 14 : 10;
                const dx = far ? 2 : wind;
                g.lineStyle(1, 0x82cddd, far ? .3 : storm ? .65 : .55)
                    .lineBetween(Math.round(x + dx * (1 - u)), Math.round(y), Math.round(x + dx * (1 - u) - dx), Math.round(Math.min(floor, y + len)));
            } else if (!far && floor < bottom) {
                const spread = (u - .86) / .14 * 5;
                g.lineStyle(1, 0xa8d4f0, .6 * (1 - (u - .86) / .14))
                    .lineBetween(x - spread, floor - 1, x - spread - 2, floor - 3)
                    .lineBetween(x + spread, floor - 1, x + spread + 2, floor - 3);
            }
        }
        this.stats.motes = this.weatherMotes;
    }
    private marsh(river: boolean, left: number, top: number, right: number, bottom: number): void {
        const width = right - left, g = this.veil;
        for (let i = 0; i < 6 && this.weatherMotes + this.ambientOccupied < 64; i++, this.weatherMotes++) {
            const b = this.banks[i];
            const speed = river ? Math.max(40, Math.abs(this.drift)) * .5 : 12;
            const x = left + ((i * width / 6 - this.clock * speed / 1000) % (width + 80) + width + 80) % (width + 80) - 40;
            if (this.clock - b.sampled > 250 || b.floor < top || b.floor > bottom) {
                b.floor = this.ctx.physics.groundBelow(x, top, bottom - top) ?? this.ctx.physics.groundBelow((left + right) / 2, top, bottom - top) ?? bottom - 24; b.sampled = this.clock;
            }
            const floor = b.floor;
            // Three shallow overlapping contours; stays at feet rather than floating midway up the screen.
            g.fillStyle(0x6ab9a4, .16).fillEllipse(Math.round(x), floor - 5, 76, 12);
            g.fillStyle(0x82cddd, .14).fillEllipse(Math.round(x + 10), floor - 9, 50, 9);
            g.fillStyle(0x6ab9a4, .18).fillEllipse(Math.round(x - 8), floor - 3, 60, 6);
            if (!river) for (let j = 0; j < 3 && this.weatherMotes + this.ambientOccupied < 64; j++, this.weatherMotes++) {
                const t = this.clock / 1000;
                const gx = Math.round(x + 12 * Math.sin(t * 2 + i + j * 2));
                const gy = Math.round(floor - 18 - j * 4 + Math.sin(t * 4 + i * 3 + j) * 4);
                g.fillStyle(0xa7b6b8, .65).fillRect(gx, gy, 1, 1);
            }
            if (river) for (let j = 0; j < 3 && this.weatherMotes + this.ambientOccupied < 64; j++, this.weatherMotes++) {
                const rx = Math.round(x + j * 15), ry = Math.round(floor - 3 - j * 3);
                g.fillStyle(0x82cddd, .55).fillRect(rx, ry, 8 + j * 4, 1);
                g.fillStyle(0xa8d4f0, .35).fillRect(rx + 5, ry + 2, 5, 1);
            }
        }
        this.stats.motes = this.weatherMotes;
    }
    destroy(): void { this.fog.destroy(); this.farRain.destroy(); this.nearRain.destroy(); this.veil.destroy(); for (const lamp of this.lamps) lamp.destroy(); }
}
