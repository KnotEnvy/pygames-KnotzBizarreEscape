import Phaser from 'phaser';
import { settings, type GameContext } from '../core';
import { FX } from '../config/tuning/fx';
import { bounded, type SpatialFx } from './campaign';

// duration ms, mote count, width px, height px, speed px/s, travel angle radians.
const RECIPES = {
    bg_wisp: [2400, 5, 32, 24, 10, -1.57],
    bg_fireflies_swarm: [4000, 16, 100, 40, 12, 0],
    bg_splash: [800, 10, 36, 20, 30, -1.57],
    bg_fire: [5000, 12, 40, 40, 20, -1.57],
    bg_rain_curtain: [5000, 24, 160, 110, 100, 1.7],
    bg_flak: [650, 7, 24, 24, 32, -1.57],
    bg_explosion: [1400, 12, 42, 48, 36, -1.57],
    bg_lightning: [420, 9, 40, 90, 0, 0],
    aurora: [30000, 0, 320, 48, 0, 0],
    bg_birds: [2200, 7, 45, 24, 38, -2.1],
    bg_smoke_plume: [12000, 10, 24, 96, 14, -1.57],
    bg_avalanche: [3200, 18, 130, 65, 38, .65],
    bg_mist: [8000, 12, 64, 30, 10, -1.57]
} as const;
type Effect = keyof typeof RECIPES;
interface Mote { x: number; y: number; speed: number; phase: number }
interface Backdrop {
    g: Phaser.GameObjects.Graphics;
    effect: Effect; active: boolean; age: number; remaining: number; life: number;
    width: number; height: number; count: number; speed: number; angle: number;
    flash: boolean; motes: Mote[];
}

/** Eight prewarmed drawings, 96 analytic motes total. No timers, gameplay bodies or camera effects.
 * Native scroll factors keep the layer attached through camera shake/zoom/scroll and hitstop. */
export class BackgroundFx {
    private readonly slots: Backdrop[];
    private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    private clock = 0;
    private redraw = 0;
    private lastFlash = -Infinity;
    readonly stats = { active: 0, motes: 0, peak: 0, dropped: 0, emitted: 0, skyFlash: false };

    constructor(private readonly ctx: GameContext) {
        this.slots = Array.from({ length: FX.background.slots }, () => ({
            g: ctx.scene.add.graphics().setDepth(FX.background.depth).setVisible(false),
            effect: 'bg_flak', active: false, age: 0, remaining: 0, life: 1,
            width: 0, height: 0, count: 0, speed: 0, angle: 0, flash: false,
            motes: Array.from({ length: FX.background.perEffect }, () => ({ x: 0, y: 0, speed: 0, phase: 0 }))
        }));
    }

    emit(e: SpatialFx): boolean {
        if (!Object.hasOwn(RECIPES, e.effect)) return false;
        const effect = e.effect as Effect, recipe = RECIPES[effect];
        if (effect === 'bg_lightning' && this.clock - this.lastFlash < (settings.get().reducedFlash || this.reducedMotion.matches ? 6000 : 1200)) return true;
        const factor = bounded(e.scrollFactor, .3, 0, 1);
        const persistent = effect === 'aurora' || effect === 'bg_smoke_plume' || effect === 'bg_mist';
        let slot = persistent ? this.slots.find(s => s.active && s.effect === effect && s.g.scrollFactorX === factor) : undefined;
        if ((e.duration ?? e.durationMs) === 0) {
            if (slot) { slot.active = false; slot.g.clear().setVisible(false); }
            this.count();
            return true;
        }
        const refresh = !!slot;
        slot ??= this.slots.find(s => !s.active);
        if (!slot) { this.stats.dropped++; return true; }
        const s = slot;
        const scale = bounded(e.scale, 1, .25, 2);
        const wanted = Math.round(bounded(e.count, recipe[1], 0, FX.background.perEffect));
        const available = FX.background.motes - this.stats.motes + (refresh ? s.count : 0);
        s.count = effect === 'aurora' ? 0 : Math.min(wanted, available);
        if (effect === 'bg_lightning') {
            if (available < 9) { this.stats.dropped++; return true; }
            s.count = 9;
        }
        s.width = bounded(e.width, recipe[2], 8, 512);
        s.height = bounded(e.height, recipe[3], 8, 192);
        s.speed = bounded(e.speed, recipe[4], 0, 120);
        s.angle = bounded(e.angle, recipe[5], -Math.PI * 2, Math.PI * 2);
        s.life = bounded(e.duration ?? e.durationMs, recipe[0], 120, 120000);
        s.remaining = s.life;
        s.g.setPosition(e.x, e.y).setScale(scale).setScrollFactor(factor).setVisible(true);
        s.g.setBlendMode(effect === 'aurora' || effect === 'bg_lightning' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
        if (!refresh) {
            s.effect = effect; s.age = 0; s.active = true;
            s.flash = effect === 'bg_lightning' && this.clock - this.lastFlash >= 1200;
            if (s.flash) this.lastFlash = this.clock;
            for (const m of s.motes) {
                m.x = this.ctx.rng.range(-.5, .5); m.y = this.ctx.rng.range(0, 1);
                m.speed = this.ctx.rng.range(.65, 1.35); m.phase = this.ctx.rng.range(0, Math.PI * 2);
            }
        }
        this.stats.emitted++;
        this.draw(s); this.count();
        return true;
    }

    update(dt: number): void {
        this.clock += dt;
        this.redraw += dt;
        const redraw = this.redraw >= FX.background.redrawMs;
        if (redraw) this.redraw %= FX.background.redrawMs;
        this.stats.skyFlash = false;
        for (const s of this.slots) {
            if (!s.active) continue;
            s.age += dt; s.remaining -= dt;
            if (s.remaining <= 0) { s.active = false; s.g.clear().setVisible(false); continue; }
            // Refresh even during hitstop when accessibility changes; no independent animation clock.
            if (redraw || s.effect === 'bg_lightning') this.draw(s);
        }
        this.count();
    }

    private count(): void {
        let active = 0, motes = 0;
        for (const s of this.slots) if (s.active) { active++; motes += s.count; }
        this.stats.active = active; this.stats.motes = motes; this.stats.peak = Math.max(this.stats.peak, active);
    }

    private cloud(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha: number): void {
        // Stepped pixel silhouette, without a per-puff filter or texture upload.
        x = Math.round(x); y = Math.round(y); w = Math.max(4, Math.round(w)); h = Math.max(3, Math.round(h));
        g.fillStyle(color, alpha).fillRect(x - w * .35, y - h * .5, w * .7, h)
            .fillRect(x - w * .5, y - h * .28, w, h * .56);
    }

    private draw(s: Backdrop): void {
        const g = s.g.clear(), seconds = s.age / 1000;
        const fade = Math.min(1, s.remaining / Math.min(650, s.life * .4));
        const reduced = settings.get().reducedFlash || this.reducedMotion.matches;
        g.setAlpha(fade);
        if (s.effect === 'aurora') {
            const enter = Math.min(1, s.age / 1200);
            // Three translucent ribbons; never a luminous foreground curtain.
            for (let i = 0; i < 48; i++) {
                const u = i / 47, x = Math.round((i / 48 - .5) * s.width);
                const strip = Math.round(((i + 1) / 48 - .5) * s.width) - x;
                const wave = Math.sin(u * 9 + seconds * .18) * s.height * .2 + Math.sin(u * 17 - seconds * .12) * 3;
                const edge = Math.sin(u * Math.PI);
                const h = s.height * (.55 + .16 * Math.sin(u * 12 + seconds * .3));
                const alpha = enter * edge * (reduced ? .10 : .12 + .025 * Math.sin(u * 8 + seconds * .7));
                // Adjacent strips meet but never overlap (overlap made bright fence-like seams).
                g.fillStyle(0x446c93, alpha * .6).fillRect(x, wave - h * .7, strip, h);
                g.fillStyle(0x6ab9a4, alpha).fillRect(x, wave - h * .3, strip, h * .6);
                g.fillStyle(0xa7b6b8, alpha * .5).fillRect(x, wave + h * .25, strip, 2);
            }
            return;
        }
        if (s.effect === 'bg_lightning') {
            const flash = !reduced && s.flash && s.age < 110;
            this.stats.skyFlash ||= flash;
            if (flash) for (let band = 0; band < 5; band++) {
                g.fillStyle(0x678da4, .012 * (1 - s.age / 110)).fillEllipse(0, s.height * .35, 320 - band * 48, Math.min(100, s.height) - band * 12);
            }
            // One monotonic fade, no strobe/restrike; dim steady geometry in reduced flash mode.
            g.lineStyle(1, 0xa8c5d1, reduced ? .3 : .85 * Math.max(.2, 1 - s.age / s.life));
            let x = 0, y = 0;
            for (let i = 0; i < 9; i++) {
                const nx = s.motes[i].x * s.width, ny = (i + 1) / 9 * s.height;
                g.lineBetween(x, y, nx, ny);
                if (i === 3 || i === 6) g.lineBetween(nx, ny, nx + s.width * .3, ny + s.height * .18);
                x = nx; y = ny;
            }
            return;
        }
        if (s.effect === 'bg_wisp' || s.effect === 'bg_fireflies_swarm' || s.effect === 'bg_splash' || s.effect === 'bg_fire' || s.effect === 'bg_rain_curtain') {
            for (let i = 0; i < s.count; i++) {
                const m = s.motes[i], u = (m.y + seconds * .6) % 1;
                const x = Math.round(m.x * s.width + Math.sin(seconds + m.phase) * 4);
                if (s.effect === 'bg_fireflies_swarm') {
                    const fx = Math.round(x + seconds * s.speed), fy = Math.round(-m.y * s.height + Math.sin(seconds * 2 + m.phase) * 3);
                    const pulse = .5 + .35 * Math.sin(seconds * 2 + m.phase) ** 2;
                    g.fillStyle(0x6ab9a4, .12).fillRect(fx - 2, fy - 2, 5, 5);
                    g.fillStyle(0xb6ff6a, pulse).fillRect(fx, fy, 2, 1);
                } else if (s.effect === 'bg_rain_curtain') {
                    const y = u * s.height; g.lineStyle(1, 0x82cddd, .38).lineBetween(x, y, x - 4, y + 12);
                } else if (s.effect === 'bg_splash') {
                    const t = s.age / s.life;
                    g.fillStyle(0x82cddd, .75 * (1 - t)).fillRect(x * t, -Math.sin(t * Math.PI) * m.y * s.height, 2, 3);
                    if (i === 0) g.lineStyle(1, 0x82cddd, .55 * (1 - t)).strokeEllipse(0, 0, 12 + t * s.width, 3 + t * 6);
                } else {
                    const fire = s.effect === 'bg_fire';
                    const base = Math.round(m.x * s.width * .65), height = (fire ? .45 : .35) * s.height * (1 + .25 * Math.sin(seconds * 7 + m.phase));
                    const tip = base + Math.sin(seconds * 4 + m.phase) * 4;
                    g.fillStyle(fire ? 0xae6d45 : 0x446c93, .22).fillEllipse(base, -height * .3, 18, height * 1.4);
                    g.fillStyle(fire ? 0xffae22 : 0x39d98a, .60).fillTriangle(base - 4, 0, tip, -height, base + 5, -2);
                    g.fillStyle(fire ? 0xe1bc7a : 0xb6ff6a, .65).fillTriangle(base - 2, -1, tip + 1, -height * .6, base + 2, -1);
                }
            }
            return;
        }
        if (s.effect === 'bg_birds') {
            g.lineStyle(1, 0x263641, .8);
            for (let i = 0; i < s.count; i++) {
                const m = s.motes[i], travel = seconds * s.speed * m.speed;
                const x = Math.round(m.x * s.width + Math.cos(s.angle) * travel);
                const y = Math.round(-m.y * s.height + Math.sin(s.angle) * travel);
                const wing = Math.sin(seconds * 15 + m.phase) > 0 ? -3 : 2;
                g.lineBetween(x - 3, y + wing, x, y).lineBetween(x, y, x + 3, y + wing);
                g.fillStyle(0x263641, .8).fillRect(x, y, 1, 2);
            }
            return;
        }
        if (s.effect === 'bg_smoke_plume' || s.effect === 'bg_mist') {
            const mist = s.effect === 'bg_mist', enter = Math.min(1, s.age / 650);
            for (let i = 0; i < s.count; i++) {
                const m = s.motes[i], u = (m.y + seconds * s.speed / s.height) % 1;
                const x = m.x * s.width * (mist ? 1 : .3 + u) + Math.sin(u * 5 + m.phase) * u * 6;
                const y = -u * s.height;
                this.cloud(g, x, y, (mist ? 12 : 9) + u * s.width * .65, 7 + u * 13,
                    mist ? 0x9cbac7 : 0x344352, enter * Math.sin(u * Math.PI) * (mist ? .14 : .24));
                if (mist && i % 2 === 0) g.fillStyle(0xa5c6d3, .28 * (1 - u)).fillRect(Math.round(x), Math.round(y), 1, 2);
            }
            return;
        }
        if (s.effect === 'bg_avalanche') {
            const advance = seconds * s.speed, dx = Math.cos(s.angle), dy = Math.sin(s.angle);
            for (let i = 0; i < s.count; i++) {
                const m = s.motes[i], behind = m.y * Math.min(advance + 8, s.width);
                const x = dx * (advance - behind) + m.x * s.width * .45;
                const y = dy * (advance - behind) + m.x * s.height * .3;
                this.cloud(g, x, y, 12 + m.y * 20, 8 + m.y * 14, 0x9caebb, .13 + (1 - m.y) * .08);
                g.fillStyle(0xc1d2d8, .38).fillRect(Math.round(x + Math.sin(seconds * 5 + m.phase) * 4), Math.round(y), 2, 2);
            }
            return;
        }
        // Distant artillery: compact fire head, smoke, then falling debris; no world flash.
        const large = s.effect === 'bg_explosion', ignition = Math.max(0, 1 - s.age / (large ? 380 : 200));
        const radius = (large ? 14 : 7) * (1 - ignition * .55);
        if (ignition > 0) {
            this.cloud(g, 0, 0, radius * 2, radius * 1.6, 0xae6d45, .65 * ignition);
            this.cloud(g, -2, -2, radius, radius * .8, 0xe1bc7a, .7 * ignition);
        }
        for (let i = 0; i < s.count; i++) {
            const m = s.motes[i];
            const x = m.x * seconds * s.speed * 2;
            const y = -m.speed * seconds * s.speed + 20 * seconds * seconds;
            if (i % 3 === 0) this.cloud(g, x * .5, -seconds * 16 - m.y * 6, 10 + seconds * 10, 8 + seconds * 8, 0x344150, .22);
            else g.fillStyle(s.age < 200 ? 0xc5a06d : 0x52616c, .5).fillRect(Math.round(x), Math.round(y), 1, large ? 2 : 1);
        }
    }

    reset(): void {
        for (const s of this.slots) { s.active = false; s.g.clear().setVisible(false); }
        this.lastFlash = -Infinity; this.stats.skyFlash = false; this.count();
    }
    destroy(): void { this.reset(); for (const s of this.slots) s.g.destroy(); }
}
