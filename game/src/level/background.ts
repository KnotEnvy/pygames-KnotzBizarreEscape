// Background director (Phase F, docs/JUICE.md): short, readable moments that play BEHIND gameplay.
//   - Tiled `bg_event` triggers (`id`, `once`, default once=true). A zone id (see ZONES) runs while the camera view
//     overlaps the rect (searchlights, waterfall, flak, aurora, ...); any other id is a one-shot fired when the
//     player's feet enter the rect (zeppelin, plane, gorge, ice fissure, ...).
//   - Hooks on arena:start / arena:wave / arena:clear, explosion (crows) and the train's tunnel zones (avalanche).
//   - Every moment emits `bg:event {id, x, y}` (world-ish x/y for panning) so Audio and FX can respond.
// Actors are camera-fixed sprites (scrollFactor 0) placed like the parallax layers: screen x = ax - (camX + drift·t)·sf,
// screen y = ay + (restScrollY - camY)·sfY, updated at PRE_RENDER with rounded positions. They sit at fractional depths
// inside the parallax bands (e.g. behind the outpost skyline), stay dim/low-contrast and never use gameplay depths.
// FX's background particles are used through `fx:emit {bg: true, scrollFactor}` (Phaser scroll semantics: world x =
// screen x + camX·sf). Missing textures/animations just skip that actor, so the director degrades gracefully.
import Phaser from 'phaser';
import { DEPTH, hasAnim, settings, type GameContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import type { Parallax } from './parallax';
import { bool, num, str, type LevelObject } from './types';

/** Shared zero offset for actors without an orbit/bob (no per-frame allocation). */
const NO_OFFSET: readonly [number, number] = [0, 0];

const B = LEVEL.bg;
const FAR = DEPTH.BG_FAR, NEAR = DEPTH.BG_NEAR;

interface ActorOpts {
    key: string;
    anim?: string;
    frame?: string | number;
    sf: number;
    sfY?: number;
    /** Screen position at spawn (or use ax for a fixed parallax anchor). */
    sx?: number;
    sy: number;
    ax?: number;
    vx?: number;
    vy?: number;
    depth: number;
    alpha?: number;
    add?: boolean;
    /** Multiplies the sprite colour (e.g. darken a grey plume into black smoke). */
    tint?: number;
    flip?: boolean;
    origin?: [number, number];
    life?: number;
    fadeIn?: number;
    fadeOut?: number;
    /** Moves with the train's drift like the landscape (Part II far scenery). */
    drift?: boolean;
    /** Removed once it has left the screen in its direction of travel. */
    exitOff?: boolean;
    /** Play the animation once and hold the last frame (bolts, toppling debris). */
    once?: boolean;
    zone?: Zone;
    tick?: (a: Actor, dt: number) => void;
    /** Extra screen offset applied after the parallax position (orbits, bobbing). */
    offset?: (a: Actor) => readonly [number, number];
}

class Actor {
    readonly sprite: Phaser.GameObjects.Sprite;
    ax = 0; ay = 0; age = 0; dead = false; extraAlpha = 1;
    constructor(readonly o: ActorOpts, sprite: Phaser.GameObjects.Sprite) { this.sprite = sprite; }
}

interface Zone {
    id: string;
    x0: number;
    x1: number;
    f: number;
    on: boolean;
    t: number;
    state: Record<string, unknown>;
}

interface ZoneImpl {
    enter(d: BackgroundDirector, z: Zone): void;
    tick?(d: BackgroundDirector, z: Zone, dt: number): void;
}

/** Deterministic visual-only RNG (never touches the gameplay rng). */
function mulberry(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class BackgroundDirector {
    readonly scene: Phaser.Scene;
    private readonly actors: Actor[] = [];
    private readonly zones: Zone[] = [];
    private readonly shots: { o: LevelObject; id: string; once: boolean; armed: boolean; done: boolean }[] = [];
    private readonly timers: { at: number; fn: () => void }[] = [];
    private readonly tunnels = new Set<string>();
    private readonly offs: (() => void)[] = [];
    private tunnelEnds = 0;
    private last: number;
    private clock = 0;
    readonly rnd = mulberry(0x6b6265);
    readonly fired: string[] = [];
    readonly flags = new Set<string>();
    /** Small per-moment scratch state (counters for moments that wait for the camera). */
    readonly state: Record<string, number> = {};
    private crowCool = 0;
    gorgeLeft = 0;
    gorgeF = 0;
    /** Mission 2 lightning: flash pulse time (ms since the strike, -1 idle) and its peak (reduced flash dims it). */
    flashT = -1;
    flashPeak = 1;
    /** 2-2 storm front: the storm sky's cover (0..1) fading in. */
    stormF = 0;
    stormOn = false;

    constructor(readonly ctx: GameContext, readonly mapKey: string, triggers: LevelObject[], readonly parallax: Parallax,
        readonly setWeather: (kind: 'rain' | 'storm' | null) => void = () => undefined) {
        this.scene = ctx.scene;
        this.last = ctx.time.now;
        for (const t of triggers) {
            if (t.type !== 'bg_event') continue;
            const id = str(t.props.id);
            if (!id) continue;
            if (ZONES[id]) this.zones.push({ id, x0: t.x, x1: t.x + t.width, f: 0, on: false, t: 0, state: {} });
            else this.shots.push({ o: t, id, once: t.props.once === undefined ? true : bool(t.props.once), armed: true, done: false });
        }
        const ev = ctx.events;
        this.offs.push(ev.on('arena:start', e => this.hook(`start:${e.id}`)));
        this.offs.push(ev.on('arena:wave', e => this.hook(`wave:${e.id}:${e.wave}`)));
        this.offs.push(ev.on('arena:clear', e => this.hook(`clear:${e.id}`)));
        this.offs.push(ev.on('explosion', e => this.explosion(e.x, e.y)));
        this.offs.push(ev.on('fx:zone', e => {
            if (e.kind !== 'tunnel') return;
            if (e.active) { this.tunnels.add(e.id); return; }
            if (this.tunnels.delete(e.id)) this.hook(`tunnel_end:${++this.tunnelEnds}`);
        }));
        this.scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.render, this);
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    }

    get inTunnel(): boolean { return this.tunnels.size > 0; }

    /** A running zone by id (its actors fade with it). */
    zone(id: string): Zone | undefined { return this.zones.find(q => q.id === id && q.f > 0); }

    // ------------------------------------------------------------------------------------------------ frame
    update(dt: number): void {
        this.clock += dt;
        const p = this.ctx.player();
        if (p) {
            for (const s of this.shots) {
                if (s.done) continue;
                const inside = p.x >= s.o.x && p.x <= s.o.x + s.o.width;
                if (inside && s.armed) { s.armed = false; if (s.once) s.done = true; this.fire(s.id, s.o); }
                else if (!inside) s.armed = true;
            }
        }
        const v = this.ctx.camera.view();
        for (const z of this.zones) {
            const on = v.right > z.x0 && v.x < z.x1;
            if (on && !z.on && z.f <= 0) { z.state = {}; z.t = 0; ZONES[z.id].enter(this, z); this.announce(z.id); }
            z.on = on;
            z.f = Phaser.Math.Clamp(z.f + (on ? dt : -dt) / B.zoneFadeMs, 0, 1);
            if (z.f > 0) { z.t += dt; ZONES[z.id].tick?.(this, z, dt); }
        }
        for (let i = this.timers.length - 1; i >= 0; i--) {
            if (this.clock < this.timers[i].at) continue;
            const fn = this.timers[i].fn;
            this.timers.splice(i, 1);
            fn();
        }
        this.crowCool -= dt;
        // Part II gorge: background drops away for `gorgeLeft` ms (a tunnel cuts it short).
        if (this.gorgeLeft > 0 && !this.inTunnel) this.gorgeLeft -= dt;
        else if (this.inTunnel) this.gorgeLeft = Math.min(this.gorgeLeft, 0);
        this.tickWeather(dt);
        const target = this.gorgeLeft > 0 ? 1 : 0;
        if (this.gorgeF !== target) {
            this.gorgeF = Phaser.Math.Clamp(this.gorgeF + (target ? dt : -dt) / B.gorge.fadeMs, 0, 1);
            this.parallax.setCover('gorge', this.gorgeF);
        }
    }

    /** Lightning flash pulse (cover group 'flash': the lit sky variant) and the storm sky fading in. */
    private tickWeather(dt: number): void {
        if (this.flashT >= 0) {
            const L = B.lightning;
            this.flashT += dt;
            const t = this.flashT;
            const f = t < L.upMs ? t / L.upMs : t < L.upMs + L.holdMs ? 1 : 1 - (t - L.upMs - L.holdMs) / L.downMs;
            if (f <= 0) { this.flashT = -1; this.parallax.setCover('flash', 0); }
            else this.parallax.setCover('flash', f * this.flashPeak);
        }
        if (this.stormOn && this.stormF < 1) {
            this.stormF = Math.min(1, this.stormF + dt / B.storm.fadeMs);
            this.parallax.setCover('storm', this.stormF);
        }
    }

    /** One lightning strike: sky flash (dimmed with reduced flash), a bolt on the horizon, thunder (bg:event). */
    strike(sx?: number): void {
        const L = B.lightning;
        const reduced = this.reducedFlash;
        this.flashT = 0;
        this.flashPeak = reduced ? L.reducedPeak : L.peak;
        const x = sx ?? this.rand(40, 344);
        this.actor({ key: 'bg_bolt', anim: 'bg_bolt_strike', once: true, sf: L.boltSf, sx: x, sy: L.boltY, origin: [0.5, 0], depth: FAR + 1.2, alpha: reduced ? 0.35 : L.boltAlpha, add: true, life: 260, flip: this.rnd() < 0.5 });
        if (!this.scene.textures.exists('bg_bolt')) this.fx('bg_lightning', x, L.boltY + 30, L.boltSf, { scale: 0.8 });
        this.after(L.thunderMs, () => this.announce('lightning', x, 40));
    }

    /** Moves every actor from the final camera scroll (after the engine camera ran), like the parallax layers. */
    private render(): void {
        const now = this.ctx.time.now;
        const dt = Math.max(0, Math.min(100, now - this.last));
        this.last = now;
        const cam = this.scene.cameras.main;
        const camX = cam.scrollX, camY = cam.scrollY, w = cam.width;
        const travelled = this.parallax.travelled;
        for (let i = this.actors.length - 1; i >= 0; i--) {
            const a = this.actors[i], o = a.o;
            a.age += dt;
            o.tick?.(a, dt);
            if (a.dead || (o.life !== undefined && a.age >= o.life) || (o.zone && !o.zone.on && o.zone.f <= 0)) { this.kill(i); continue; }
            const eff = camX + (o.drift ? travelled : 0);
            const x = a.ax - eff * o.sf + (o.vx ?? 0) * a.age / 1000;
            const y = a.ay + (LEVEL.parallax.restScrollY - camY) * (o.sfY ?? 0) + (o.vy ?? 0) * a.age / 1000;
            const s = a.sprite;
            const off = o.offset ? o.offset(a) : NO_OFFSET;
            s.setPosition(Math.round(x + off[0]), Math.round(y + off[1]));
            if (o.exitOff && a.age > 300) {
                const vx = o.vx ?? 0, half = s.displayWidth;
                if ((vx > 0 && x - half > w + 8) || (vx < 0 && x + half < -8)) { this.kill(i); continue; }
            }
            let al = (o.alpha ?? 1) * a.extraAlpha;
            if (o.fadeIn) al *= Math.min(1, a.age / o.fadeIn);
            if (o.fadeOut && o.life !== undefined) al *= Math.min(1, Math.max(0, (o.life - a.age) / o.fadeOut));
            if (o.zone) al *= o.zone.f;
            s.setAlpha(al).setVisible(al > 0.01);
        }
    }

    private kill(i: number): void {
        this.actors[i].sprite.destroy();
        this.actors.splice(i, 1);
    }

    // ------------------------------------------------------------------------------------------------ helpers
    /** Spawns an actor; returns null when its texture is missing (art not landed yet). */
    actor(o: ActorOpts): Actor | null {
        if (!this.scene.textures.exists(o.key)) return null;
        const cam = this.scene.cameras.main;
        const s = this.scene.add.sprite(0, 0, o.key, o.frame).setScrollFactor(0).setDepth(o.depth);
        s.setOrigin(...(o.origin ?? [0.5, 1]));
        if (o.flip) s.setFlipX(true);
        if (o.add) s.setBlendMode(Phaser.BlendModes.ADD);
        if (o.tint !== undefined) s.setTint(o.tint);
        if (o.anim) {
            if (hasAnim(this.scene, o.anim)) {
                // Tags are created with repeat 0 (core/anims.ts): actors loop unless they play once (spawn-time only).
                s.play({ key: o.anim, repeat: o.once ? 0 : -1 });
                const n = s.anims.getTotalFrames();
                if (n > 1 && !o.frame && !o.once) s.anims.setProgress(this.rnd());
            }
        }
        const a = new Actor(o, s);
        const eff = cam.scrollX + (o.drift ? this.parallax.travelled : 0);
        a.ax = o.ax ?? (o.sx ?? 0) + eff * o.sf;
        a.ay = o.sy - (LEVEL.parallax.restScrollY - cam.scrollY) * (o.sfY ?? 0);
        s.setAlpha(0).setVisible(false);
        this.actors.push(a);
        return a;
    }

    /** Current screen x of a parallax anchor at scroll factor sf. */
    screenX(ax: number, sf: number, drift = false): number {
        return ax - (this.scene.cameras.main.scrollX + (drift ? this.parallax.travelled : 0)) * sf;
    }

    /** FX background particles at a screen position for a layer at scroll factor sf. */
    fx(effect: string, sx: number, sy: number, sf: number, extra: Record<string, number> = {}): void {
        const cam = this.scene.cameras.main;
        this.ctx.events.emit('fx:emit', { effect, x: sx + cam.scrollX * sf, y: sy + cam.scrollY * sf, bg: true, scrollFactor: sf, ...extra });
    }

    /** Tell Audio/FX a background moment played. x/y: world position of the screen point (for panning). */
    announce(id: string, sx = 192, sy = 60): void {
        const cam = this.scene.cameras.main;
        this.fired.push(id);
        if (this.fired.length > 24) this.fired.shift();
        this.ctx.events.emit('bg:event', { id, x: Math.round(cam.scrollX + sx), y: Math.round(cam.scrollY + sy) });
    }

    after(ms: number, fn: () => void): void { this.timers.push({ at: this.clock + ms, fn }); }

    rand(a: number, b: number): number { return a + (b - a) * this.rnd(); }

    get reducedFlash(): boolean { return !!settings.get().reducedFlash; }

    /** Plays a one-shot moment by id (bg_event trigger, hook, or the `bg` cheat). */
    fire(id: string, o?: LevelObject): boolean {
        const fn = SHOTS[id];
        if (fn) { fn(this, o); return true; }
        const z = ZONES[id];
        if (z) { const zone: Zone = { id, x0: -1e9, x1: 1e9, f: 0, on: true, t: 0, state: {} }; this.zones.push(zone); z.enter(this, zone); this.announce(id); return true; }
        return false;
    }

    private hook(key: string): void {
        const ids = (B.hooks as Record<string, Record<string, string[]>>)[this.mapKey]?.[key];
        if (!ids) return;
        for (const id of ids) {
            const [name, delay] = id.split('@');
            if (delay) this.after(Number(delay), () => this.fire(name)); else this.fire(name);
        }
    }

    private explosion(x: number, y: number): void {
        if (this.crowCool > 0) return;
        // Birds burst from the far trees at a nearby explosion: crows (Mission 1), herons (2-1).
        const z = this.zones.find(q => (q.id === 'crows' || q.id === 'herons') && q.on);
        if (!z) return;
        const v = this.ctx.camera.view();
        if (x < v.x - 64 || x > v.right + 64) return;
        this.crowCool = z.id === 'herons' ? B.herons.cooldownMs : B.crows.cooldownMs;
        SHOTS[z.id](this, undefined, { sx: Phaser.Math.Clamp(x - v.x, 40, v.width - 40), sy: y - v.y });
    }

    debug(): unknown {
        return {
            actors: this.actors.length,
            zones: this.zones.filter(z => z.f > 0).map(z => z.id).join(' ') || null,
            fired: this.fired.slice(-8).join(' ') || null,
            shots: this.shots.filter(s => !s.done).length,
            tunnel: this.inTunnel, gorge: Math.round(this.gorgeF * 100) / 100
        };
    }

    destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.render, this);
        for (const off of this.offs) off();
        this.offs.length = 0;
        for (const a of this.actors) a.sprite.destroy();
        this.actors.length = 0;
    }
}

// ================================================================================================ moments
// Screen y reference at rest (camera on the map bottom): HUD 0-28, sky 28-90, far treeline ~95-130, action lane
// ~110-184. Sky actors stay above ~80; everything else hides behind the parallax/tile layers it belongs to.

/** A sweeping searchlight beam from a fixed parallax anchor. */
function beam(d: BackgroundDirector, z: Zone, ax: number, sy: number, sf: number, depth: number, phase: number, base = 0, sweep: number = B.beam.sweepDeg, drift = false): void {
    d.actor({ key: 'bg_beam', sf, sfY: sf * 0.45, ax, sy, depth, alpha: B.beam.alpha, add: true, origin: [0.5, 1], zone: z, drift, fadeIn: 300,
        tick: act => { act.sprite.setAngle(base + Math.sin((act.age / B.beam.periodMs + phase) * Math.PI * 2) * sweep); } });
}

const SHOTS: Record<string, (d: BackgroundDirector, o?: LevelObject, at?: { sx: number; sy: number }) => void> = {
    // ---------------------------------------------------------------- Part I
    zeppelin: d => {
        const Z = B.zeppelin;
        if (d.actor({ key: 'bg_zeppelin', origin: [0.5, 0.5], anim: 'bg_zeppelin_fly', sf: Z.sf, sfY: 0.02, sx: 384 + 48, sy: Z.y, vx: -Z.speed, depth: FAR + 1.5, alpha: Z.alpha, fadeIn: 800, exitOff: true }))
            d.announce('zeppelin', 330, Z.y);
    },
    plane: d => {
        const P = B.plane;
        if (!d.actor({ key: 'bg_plane', origin: [0.5, 0.5], anim: 'bg_plane_fly', sf: P.sf, sfY: 0.1, sx: -48, sy: P.y, vx: P.speed, depth: NEAR + 2, alpha: P.alpha, exitOff: true })) return;
        d.announce('plane', 60, P.y);
    },
    crows: (d, _o, at) => {
        // A flock bursts up out of the trees, fans out, climbs, then levels off and glides away to both sides.
        const C = B.crows;
        const sx = at?.sx ?? 192, n = C.count;
        for (let i = 0; i < n; i++) {
            const dir = i % 2 ? -1 : 1;
            const spd = d.rand(C.speed[0], C.speed[1]), rise = d.rand(C.rise[0], C.rise[1]);
            const k = 1 / (C.burstS * d.rand(0.8, 1.25)), ph = d.rand(0, 6.28), delay = d.rand(0, 220);
            d.actor({ key: 'bg_crow', origin: [0.5, 0.5], anim: 'bg_crow_flap', sf: C.sf, sfY: 0.08, sx: sx + d.rand(-14, 14), sy: C.y + d.rand(-4, 4),
                flip: dir < 0, depth: FAR + 2.5, alpha: C.alpha, life: C.lifeMs, fadeIn: 120, fadeOut: 900,
                // frantic flapping in the burst, slowing to a glide
                tick: a => { a.sprite.anims.timeScale = 1 + 1.4 * Math.exp(-a.age / 700); },
                offset: a => {
                    const t = Math.max(0, a.age - delay) / 1000, e = 1 - Math.exp(-t * k);
                    // fast launch that eases into level flight, plus a slight bob
                    return [dir * (spd * 0.45 * e / k * 2 + spd * 0.55 * t), -rise * e + Math.sin(t * 5 + ph) * 1.5];
                } });
        }
        d.announce('crows', sx, C.y);
    },
    tower_lights: d => {
        // arena:start bridge: the far towers' lamps snap on one after another and their beams start sweeping.
        const T = B.towers;
        const tz = d.zone('towers');
        if (!tz || tz.state.lit) return;
        tz.state.lit = true;
        const list = (tz.state.towers as (Actor | null)[] | undefined) ?? [];
        list.forEach((a, i) => d.after(i * T.staggerMs, () => {
            if (!a || !a.sprite.active) return;
            if (hasAnim(d.scene, 'bg_tower_on')) a.sprite.play({ key: 'bg_tower_on', repeat: -1 });
            beam(d, tz, a.ax, T.y - T.lampUp, T.sf, FAR + 2.3, i * 0.29, i % 2 ? 12 : -12, 20);
        }));
        d.announce('tower_lights', 192, T.y - 40);
    },
    snowcat_roar: d => {
        // The yard's engine roars (Audio) and a burst of black smoke rises behind the gatehouse (FX plume above it).
        d.announce('snowcat_roar', 330, 60);
        d.fx('bg_smoke_plume', 330, 70, 0.6, { duration: 6000, scale: 0.8 });
    },

    // ---------------------------------------------------------------- Part II
    gorge: (d, o) => {
        d.gorgeLeft = num(o?.props.ms, B.gorge.ms);
        d.announce('gorge', 192, 120);
        d.after(B.gorge.fadeMs + 400, () => d.fx('bg_mist', 192, 190, 0.3, { width: 360, height: 30, duration: Math.max(1000, d.gorgeLeft - 800) }));
    },
    buzzard_circle: d => {
        const Z = B.buzzard;
        const cx = d.rand(230, 300), cy = Z.y, w = Math.PI * 2 / Z.periodS;
        d.actor({ key: 'bg_buzzard', origin: [0.5, 0.5], anim: 'bg_buzzard_fly', sf: Z.sf, sfY: 0.05, sx: cx, sy: cy, depth: FAR + 2.5, alpha: Z.alpha, fadeIn: 600, life: Z.lifeMs, fadeOut: 500,
            // two lazy circles, then it peels off to the right (toward the train) and out of view
            tick: act => act.sprite.setFlipX(Math.cos(w * act.age / 1000) < 0 && act.age < Z.lifeMs - 1600),
            offset: act => {
                const t = act.age / 1000, leave = Math.max(0, act.age - (Z.lifeMs - 1600)) / 1000;
                return [Math.sin(w * t) * Z.rx + leave * leave * 140, Math.cos(w * t) * Z.ry + leave * 24];
            } });
        d.announce('buzzard_circle', cx, cy);
    },
    armored_train: d => d.fire('armored_train_ltr'),
    armored_train_ltr: d => {
        const T = B.armTrain;
        if (d.actor({ key: 'bg_armtrain', anim: 'bg_armtrain_roll', sf: 0, sx: -130, sy: T.y, vx: T.speed, depth: NEAR + 1, alpha: T.alpha, exitOff: true })) d.announce('armored_train', 40, T.y - 16);
    },
    armored_train_rtl: d => {
        const T = B.armTrain;
        if (d.actor({ key: 'bg_armtrain', anim: 'bg_armtrain_roll', sf: 0, sx: 384 + 130, sy: T.y, vx: -T.speed * 0.8, flip: true, depth: NEAR + 1, alpha: T.alpha, exitOff: true })) d.announce('armored_train', 344, T.y - 16);
    },
    avalanche: d => {
        if (d.flags.has('avalanche')) return;
        d.flags.add('avalanche');
        const A = B.avalanche;
        d.actor({ key: 'bg_avalanche', anim: 'bg_avalanche_slide', sf: 0.08, sfY: 0.04, sx: A.sx, sy: A.y, depth: FAR + 1.5, alpha: A.alpha, drift: true, life: A.lifeMs, fadeOut: 1200 });
        d.announce('avalanche', A.sx, A.y - 30);
    },

    // ---------------------------------------------------------------- Part III
    ice_fissure: d => {
        const F = B.fissure;
        d.actor({ key: 'bg_fissure', anim: 'bg_fissure_crack', sf: 0.16, sfY: 0.08, sx: F.sx, sy: F.y, origin: [0, 0.5], depth: FAR + 2.5, alpha: F.alpha, life: F.lifeMs, fadeOut: 1500 });
        d.announce('ice_fissure', F.sx + 80, F.y);
        d.ctx.events.emit('fx:shake', { tier: 1 });
        d.after(420, () => d.fx('bg_mist', F.sx + 80, F.y - 4, 0.16, { width: 150, height: 14, duration: 2400 }));
    },
    tesla: d => {
        // One arc burst on a visible coil tip of the closer lab towers (bg3_lab_towers), sometimes with sky lightning.
        const L = B.tesla;
        const tips = L.tips.map(([ix, iy]) => ({ ax: L.once + ix, sy: L.y + iy })).filter(t => { const x = d.screenX(t.ax, L.sf); return x > 8 && x < 376; });
        if (!tips.length) return;
        const { ax, sy } = tips[Math.floor(d.rnd() * tips.length)];
        const sx = d.screenX(ax, L.sf), flip = d.rnd() < 0.5;
        const alpha = d.reducedFlash ? 0.45 : L.alpha;
        d.actor({ key: 'bg_arc', anim: 'bg_arc_zap', sf: L.sf, sfY: L.sf / 2, ax, sy, origin: [0.5, 0], flip, depth: FAR + 3.6, alpha, add: true, life: 260 });
        d.after(90, () => d.actor({ key: 'bg_arc', anim: 'bg_arc_zap', sf: L.sf, sfY: L.sf / 2, ax: ax + 1, sy, origin: [0.5, 0], flip: !flip, depth: FAR + 3.6, alpha: alpha * 0.8, add: true, life: 200 }));
        if (d.rnd() < L.skyChance) d.fx('bg_lightning', sx, sy - 30, L.sf, { scale: 0.7 });
        d.announce('tesla', sx, sy);
    },
    moosezilla: d => {
        const M = B.moosezilla;
        let roared = false;
        const a = d.actor({ key: 'bg_moosezilla', anim: 'bg_moosezilla_walk', sf: 0.24, sfY: 0.12, sx: 384 + 70, sy: M.y, depth: FAR + 2.9, alpha: M.alpha, life: M.lifeMs, fadeIn: 400, fadeOut: 1400,
            tick: (act, dt) => {
                // walk in (left), stop and roar, then turn back and stomp off to the right
                const t = act.age;
                if (t < M.walkInMs) act.ax -= M.speed * dt / 1000;
                else if (t < M.walkInMs + M.roarMs) {
                    if (!roared) {
                        roared = true;
                        if (hasAnim(d.scene, 'bg_moosezilla_roar')) act.sprite.play({ key: 'bg_moosezilla_roar', repeat: -1 });
                        d.announce('moosezilla_roar', d.screenX(act.ax, 0.24), M.y - 60);
                        d.ctx.events.emit('fx:shake', { tier: 2 });
                    }
                } else {
                    if (!act.sprite.flipX) { act.sprite.setFlipX(true); if (hasAnim(d.scene, 'bg_moosezilla_walk')) act.sprite.play({ key: 'bg_moosezilla_walk', repeat: -1 }); }
                    act.ax += M.speed * 1.2 * dt / 1000;
                }
            } });
        if (a) d.announce('moosezilla', 330, M.y - 40);
    }
};

const ZONES: Record<string, ZoneImpl> = {
    // ---------------------------------------------------------------- Part I
    camp_searchlights: {
        enter: (d, z) => {
            const S = B.campBeams;
            S.anchors.forEach((ax, i) => beam(d, z, ax, S.y, S.sf, FAR + 1.6, i * 0.37, i % 2 ? 8 : -8));
        }
    },
    crows: { enter: () => undefined },
    waterfall: {
        enter: (d, z) => {
            const W = B.waterfall;
            // Imagegen's painted cliff already has the falls: then only the mist runs. Otherwise our animated waterfall.
            if (!d.scene.textures.exists(W.cliffKey)) d.actor({ key: 'bg_waterfall', anim: 'bg_waterfall_flow', sf: W.sf, sfY: 0.12, ax: W.ax, sy: W.y, depth: FAR + 2.5, alpha: W.alpha, zone: z });
            z.state.mist = 0;
        },
        tick: (d, z, dt) => {
            const W = B.waterfall;
            if (((z.state.mist as number) -= dt) > 0) return;
            z.state.mist = W.mistEveryMs;
            const sx = d.screenX(W.ax, W.sf);
            if (sx > -40 && sx < 424) d.fx('bg_mist', sx, W.y - 6, W.sf, { width: 56, height: 18, duration: W.mistEveryMs + 600 });
        }
    },
    towers: {
        enter: (d, z) => {
            const T = B.towers;
            z.state.towers = T.anchors.map(ax => d.actor({ key: 'bg_tower', anim: 'bg_tower_off', sf: T.sf, sfY: 0.08, ax, sy: T.y, depth: FAR + 2.4, alpha: T.alpha, zone: z }));
        }
    },
    flak: {
        enter: (_d, z) => { z.state.next = 600; },
        tick: (d, z, dt) => {
            const F = B.flak;
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = d.rand(F.minMs, F.maxMs);
            const sx = d.rand(24, 360), sy = d.rand(F.yMin, F.yMax);
            const n = d.rnd() < 0.35 ? 2 : 1;
            for (let i = 0; i < n; i++) d.after(i * 140, () =>
                d.actor({ key: 'bg_flak', anim: 'bg_flak_pop', sf: F.sf, sfY: 0.12, sx: sx + i * d.rand(-14, 14), sy: sy + i * 6, origin: [0.5, 0.5], depth: FAR + 2.9, alpha: d.reducedFlash ? 0.5 : F.alpha, life: 420 }));
            // Now and then a heavier burst high in the sky from FX.
            if (d.rnd() < F.fxChance) d.fx(d.rnd() < 0.5 ? 'bg_flak' : 'bg_explosion', d.rand(40, 344), d.rand(36, 60), 0.15, { scale: 0.6 });
            if ((z.state.calls = ((z.state.calls as number) ?? 0) + 1) as number % 3 === 1) d.announce('flak', sx, sy);
        }
    },
    yard_smoke: {
        enter: (d, z) => {
            const Y = B.yardSmoke;
            d.actor({ key: 'bg_plume', anim: 'bg_plume_rise', sf: Y.sf, sfY: 0.4, ax: Y.ax, sy: Y.y, depth: NEAR + 3, alpha: Y.alpha, tint: Y.tint, zone: z, fadeIn: 1200 });
            d.actor({ key: 'bg_plume', anim: 'bg_plume_rise', sf: Y.sf, sfY: 0.4, ax: Y.ax + 26, sy: Y.y + 6, depth: NEAR + 3, alpha: Y.alpha * 0.8, tint: Y.tint, zone: z, fadeIn: 1600 });
        }
    },

    // ---------------------------------------------------------------- Part II
    ironhorn_plume: {
        enter: (d, z) => {
            const I = B.ironPlume;
            const a = d.actor({ key: 'bg_plume', anim: 'bg_plume_rise', sf: 0, sx: I.x0, sy: I.y0, depth: FAR + 1.5, alpha: I.alpha, zone: z, fadeIn: 1500,
                tick: (act) => {
                    // grows closer through the coal cars: slides left and rises further above the slopes
                    const v = d.ctx.camera.view();
                    const p = Phaser.Math.Clamp((v.x - z.x0) / Math.max(1, z.x1 - z.x0 - v.width), 0, 1);
                    act.ax = Phaser.Math.Linear(I.x0, I.x1, p);
                    act.ay = Phaser.Math.Linear(I.y0, I.y1, p);
                    act.extraAlpha = Phaser.Math.Linear(0.65, 1, p);
                } });
            if (a) d.announce('ironhorn_plume', I.x0, I.y0 - 60);
        }
    },

    // ---------------------------------------------------------------- Part III
    aurora: {
        enter: (d, z) => {
            const A = B.aurora;
            if (!d.scene.textures.exists('bg_aurora')) { d.fx('aurora', 192, A.y + 20, A.sf, { width: 384, duration: 120000 }); return; }
            for (let i = 0; i < A.tiles; i++)
                d.actor({ key: 'bg_aurora', anim: 'bg_aurora_shimmer', sf: A.sf, ax: i * 128, sy: A.y, origin: [0, 0], depth: FAR + 0.5, alpha: A.alpha, add: true, zone: z,
                    tick: (act) => {
                        // wrap the strip so it always covers the screen; breathe slowly
                        const span = A.tiles * 128;
                        const sx = d.screenX(act.ax, A.sf);
                        if (sx < -128) act.ax += span; else if (sx > span - 128) act.ax -= span;
                        act.extraAlpha = 0.75 + 0.25 * Math.sin(act.age / 2300 + i);
                    } });
        }
    },
    lab_searchlights: {
        enter: (d, z) => {
            const L = B.labBeams;
            L.anchors.forEach(([ix, iy], i) => beam(d, z, L.once + ix, L.labY + iy, 0.24, FAR + 2.95, i * 0.41, i % 2 ? 28 : -28, 24));
        }
    },
    lab_tesla: {
        enter: (_d, z) => { z.state.next = 500; },
        tick: (d, z, dt) => {
            const L = B.tesla;
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = d.rand(L.minMs, L.maxMs);
            SHOTS.tesla(d);
        }
    }
};

// ================================================================================================ Mission 2 "Bayou Blackout"
// Depths: actors on the far water sit in front of the painted band that would hide them (2-1's cypress_mid is FAR+7,
// bog_pump FAR+5) and behind the near roots (BG_NEAR+2).
// 2-1 CYPRESS DEEP (dusk → night), 2-2 RIVER RUN (drift 200, moon → storm), 2-3 GATOR'S DEN (storm). Screen y at rest; the
// painted far water line sits around y 150. Every id announced here has a sound mapping in UI.audio.bgEvents.

/** A flock lifting off the far marsh (herons): fan out, climb, glide away to both sides. */
function flock(d: BackgroundDirector, sx: number): void {
    const H = B.herons;
    for (let i = 0; i < H.count; i++) {
        const dir = i % 2 ? -1 : 1;
        const spd = d.rand(H.speed[0], H.speed[1]), rise = d.rand(H.rise[0], H.rise[1]);
        const k = 1 / (H.burstS * d.rand(0.8, 1.25)), ph = d.rand(0, 6.28), delay = d.rand(0, 360);
        d.actor({ key: 'bg_heron', origin: [0.5, 0.5], anim: 'bg_heron_flap', sf: H.sf, sfY: 0.08, sx: sx + d.rand(-20, 20), sy: H.y + d.rand(-3, 3),
            flip: dir < 0, depth: FAR + 4.5, alpha: H.alpha, life: H.lifeMs, fadeIn: 200, fadeOut: 1200,
            tick: a => { a.sprite.anims.timeScale = 0.8 + 0.9 * Math.exp(-a.age / 900); },
            offset: a => {
                const t = Math.max(0, a.age - delay) / 1000, e = 1 - Math.exp(-t * k);
                return [dir * (spd * 0.4 * e / k * 2 + spd * 0.6 * t), -rise * e + Math.sin(t * 3 + ph) * 1.5];
            } });
    }
    d.announce('herons', sx, H.y - 20);
}

const M2_SHOTS: Record<string, (d: BackgroundDirector, o?: LevelObject, at?: { sx: number; sy: number }) => void> = {
    // ---------------------------------------------------------------- 2-1
    herons: (d, _o, at) => flock(d, at?.sx ?? 260),
    patrol_boat: d => {
        // A Regime patrol boat glides along a far channel, its searchlight sweeping the trees.
        const P = B.patrolBoat;
        const boat = d.actor({ key: 'bg_patrolboat', anim: 'bg_patrolboat_idle', sf: P.sf, sfY: 0.08, sx: -40, sy: P.y, vx: P.speed, depth: FAR + 7.5, alpha: P.alpha, life: P.lifeMs, fadeIn: 600, fadeOut: 1500 });
        if (!boat) return;
        const lamp = d.actor({ key: 'bg_beam', sf: P.sf, sfY: 0.08, sx: -40, sy: P.y, vx: P.speed, depth: FAR + 7.45, alpha: B.beam.alpha, add: true, origin: [0.5, 1], life: P.lifeMs, fadeIn: 900, fadeOut: 1500,
            tick: a => a.sprite.setAngle(P.beamBase + Math.sin(a.age / 2600 * Math.PI * 2) * P.beamSweep),
            offset: () => [P.lamp[0] - 32, P.lamp[1] - 22] });
        void lamp;
        d.announce('patrol_boat', 60, P.y - 10);
    },
    gator_glimpse: d => {
        // Lightning reveals GATORGEDDON's silhouette far across the swamp, then it's gone (foreshadowing).
        const G = B.gatorSil;
        d.strike(G.sx + d.rand(-40, 40));
        const a = d.actor({ key: 'bg_gator_sil', anim: 'bg_gator_sil_lit', sf: G.sf, sfY: 0.06, sx: G.sx, sy: G.y, depth: FAR + 5.5, alpha: G.alpha,
            life: G.litMs + G.darkMs + G.fadeMs, fadeOut: G.fadeMs });
        if (!a) return;
        d.after(G.litMs, () => { if (a.sprite.active && hasAnim(d.scene, 'bg_gator_sil_dark')) a.sprite.play({ key: 'bg_gator_sil_dark', repeat: -1 }); });
        d.announce('gator_glimpse', G.sx, G.y - 20);
        d.ctx.events.emit('fx:shake', { tier: 1 });
    },
    pond_shell: d => {
        const W = B.pondWake;
        const sx = W.sx + W.speed * W.shellAtMs / 1000;
        const a = d.actor({ key: 'bg_shell', anim: 'bg_shell_rise', once: true, sf: W.sf, sfY: 0.1, sx, sy: W.y, depth: FAR + 7.6, alpha: W.alpha, life: 900 + W.shellHoldMs + 600, fadeOut: 300 });
        if (!a) return;
        d.after(900 + W.shellHoldMs, () => { if (a.sprite.active && hasAnim(d.scene, 'bg_shell_sink')) a.sprite.play({ key: 'bg_shell_sink', repeat: 0 }); });
        d.fx('bg_splash', sx, W.y - 4, W.sf, { scale: 1 });
        d.announce('pond_shell', sx, W.y - 10);
    },

    // ---------------------------------------------------------------- 2-2
    gator_pod: d => {
        // A pod of mech-gator ridges cruises past in the far water (slower than the boat: they slide by).
        const G = B.gatorPod;
        for (let i = 0; i < G.count; i++)
            d.actor({ key: 'bg_gator_ridge', anim: 'bg_gator_ridge_swim', sf: G.sf, sfY: 0.18, sx: 400 + i * d.rand(26, 40), sy: G.y + (i % 2) * 3, vx: G.vx, drift: true,
                depth: NEAR + 1.5, alpha: G.alpha, exitOff: true, fadeIn: 400 });
        d.announce('gator_pod', 340, G.y);
    },
    burning_barge: d => {
        const Bb = B.burningBarge;
        const a = d.actor({ key: 'bg_barge_fire', anim: 'bg_barge_fire_burn', sf: Bb.sf, sfY: 0.11, sx: 410, sy: Bb.y, vx: Bb.vx, drift: true, depth: FAR + 5.5, alpha: Bb.alpha, life: Bb.lifeMs, fadeIn: 500, fadeOut: 1000 });
        if (!a) return;
        d.announce('burning_barge', 380, Bb.y - 20);
        d.after(Bb.blastMs, () => {
            if (!a.sprite.active) return;
            const sx = a.sprite.x;
            d.fx('bg_explosion', sx, Bb.y - 18, Bb.sf, { scale: 0.8 });
            d.fx('bg_smoke_plume', sx, Bb.y - 24, Bb.sf, { duration: 7000, scale: 0.7 });
            d.announce('barge_blast', sx, Bb.y - 20);
        });
    },
    skeeter_swarm: d => {
        // A dark cloud of mech mosquitos crosses the moon with a distant whine (MEGA-SKEETER foreshadowing).
        const S = B.skeeters;
        for (let i = 0; i < S.count; i++) {
            const ox = d.rand(-S.spread[0], S.spread[0]), oy = d.rand(-S.spread[1], S.spread[1]), ph = d.rand(0, 6.28), w = d.rand(1.5, 3.5);
            d.actor({ key: 'bg_skeeter', anim: 'bg_skeeter_buzz', origin: [0.5, 0.5], sf: S.sf, sx: 440 + ox, sy: S.y + oy, vx: S.speed * d.rand(0.85, 1.15), depth: FAR + 1.4,
                alpha: S.alpha, life: S.lifeMs, fadeIn: 500, fadeOut: 1200, offset: a => [0, Math.sin(a.age / 1000 * w + ph) * 4] });
        }
        d.announce('skeeter_swarm', 330, S.y);
    },
    storm_front: d => {
        // Lightning on the horizon, the storm sky rolls in, rain starts; strikes keep coming for the rest of the part.
        if (d.stormOn) return;
        d.stormOn = true;
        d.strike(B.storm.boltSx);
        d.announce('storm_front', B.storm.boltSx, 40);
        d.setWeather('rain');
        d.after(B.storm.lightningAfterMs, () => d.fire('lightning'));
    },
    airboat_race: d => {
        const R = B.airboatRace;
        for (let i = 0; i < R.count; i++)
            d.actor({ key: 'bg_airboat', anim: 'bg_airboat_run', sf: R.sf, sfY: 0.11, sx: -40 - i * 46, sy: R.y + (i % 2) * 4, vx: R.speed * (1 + i * 0.08),
                depth: FAR + 5.6, alpha: R.alpha, exitOff: true });
        d.announce('airboat_race', 40, R.y);
    },

    // ---------------------------------------------------------------- 2-3
    gator_wake: d => {
        // After the mill falls: GATORGEDDON's ridges slide through the far water, the tail breaks the surface, a far roar.
        const G = B.gatorWake;
        if (d.ctx.camera.view().x < G.minCamX && (d.state.gatorWait = (d.state.gatorWait ?? 0) + 400) < G.waitMs) {
            d.after(400, () => d.fire('gator_wake'));
            return;
        }
        const a = d.actor({ key: 'bg_gator_wake', anim: 'bg_gator_wake_swim', sf: G.sf, sfY: 0.1, sx: G.sx, sy: G.y, vx: G.speed, depth: FAR + 6.5, alpha: G.alpha, life: G.lifeMs, fadeIn: 700, fadeOut: 1500 });
        if (!a) return;
        d.announce('gator_wake', G.sx - 60, G.y - 10);
        d.after(G.tailAtMs, () => {
            if (!a.sprite.active) return;
            if (hasAnim(d.scene, 'bg_gator_wake_tail')) a.sprite.play({ key: 'bg_gator_wake_tail', repeat: 0 });
            d.fx('bg_splash', a.sprite.x + 40, G.y - 6, G.sf, { scale: 1.2 });
            d.announce('gator_roar', a.sprite.x, G.y - 20);
            d.ctx.events.emit('fx:shake', { tier: 2 });
        });
    },
    boat_wreck: d => {
        const W = B.boatWreck;
        const a = d.actor({ key: 'bg_debris', anim: 'bg_debris_fall', once: true, sf: W.sf, sfY: 0.15, sx: W.sx, sy: W.y, depth: NEAR + 1, alpha: W.alpha, life: 2600, fadeOut: 500 });
        if (!a) return;
        d.announce('boat_wreck', W.sx, W.y - 30);
        d.after(820, () => { d.fx('bg_splash', W.sx, W.y - 4, W.sf, { scale: 1.3 }); d.fx('bg_smoke_plume', W.sx, W.y - 30, W.sf, { duration: 5000, scale: 0.6 }); });
    }
};
Object.assign(SHOTS, M2_SHOTS);

const M2_ZONES: Record<string, ZoneImpl> = {
    // ---------------------------------------------------------------- 2-1
    fireflies_swarm: {
        enter: (_d, z) => { z.state.next = 300; },
        tick: (d, z, dt) => {
            const F = B.fireflies;
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = d.rand(F.minMs, F.maxMs);
            d.fx('bg_fireflies_swarm', d.rand(30, 354), d.rand(F.yMin, F.yMax), F.sf, { count: 10, width: 60, height: 26, duration: 4200 });
        }
    },
    herons: {
        enter: (d, z) => { d.after(B.herons.enterDelayMs, () => { if (z.on) flock(d, d.rand(220, 330)); }); }
    },
    wisps: {
        enter: (_d, z) => { z.state.next = 200; },
        tick: (d, z, dt) => {
            const Wp = B.wisps;
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = d.rand(Wp.minMs, Wp.maxMs);
            const life = d.rand(Wp.lifeMs[0], Wp.lifeMs[1]), ph = d.rand(0, 6.28);
            const a = d.actor({ key: 'bg_wisp', anim: 'bg_wisp_flicker', sf: Wp.sf, sfY: 0.1, sx: d.rand(20, 364), sy: d.rand(Wp.yMin, Wp.yMax), depth: FAR + 5.2, alpha: Wp.alpha, add: true,
                life, fadeIn: 400, fadeOut: 700, zone: z, offset: q => [Math.sin(q.age / 700 + ph) * 3, Math.sin(q.age / 430 + ph) * 2] });
            if (!a) d.fx('bg_wisp', d.rand(20, 364), d.rand(Wp.yMin, Wp.yMax), Wp.sf, { duration: life });
        }
    },
    pond_wake: {
        // A huge wake crosses the far pond, then a shell breaks the surface (SHELLSHOCK foreshadowing); repeats.
        enter: (_d, z) => { z.state.next = 600; },
        tick: (d, z, dt) => {
            const W = B.pondWake;
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = W.repeatMs;
            d.actor({ key: 'bg_wake', anim: 'bg_wake_run', sf: W.sf, sfY: 0.1, sx: W.sx, sy: W.y, vx: W.speed, depth: FAR + 7.5, alpha: W.alpha * 0.9, life: W.shellAtMs + 400, fadeIn: 400, fadeOut: 500 });
            d.after(W.shellAtMs, () => { if (z.on) SHOTS.pond_shell(d); });
        }
    },

    // ---------------------------------------------------------------- 2-2
    riverbank: {
        // Stilt shacks, jetties and wrecks pass on the far bank (they drift with the bank layer).
        enter: (_d, z) => { z.state.next = 800; z.state.n = 0; },
        tick: (d, z, dt) => {
            const R = B.riverbank;
            if (((z.state.next as number) -= dt) > 0 || !z.on || d.inTunnel) return;
            z.state.next = d.rand(R.minMs, R.maxMs);
            const n = (z.state.n = (z.state.n as number) + 1) as number;
            const key = n % 3 === 1 ? 'bg_jetty' : 'bg_shack';
            d.actor({ key, anim: `${key}_idle`, sf: R.sf, sfY: 0.11, sx: 384 + 40, sy: R.y + (key === 'bg_jetty' ? 2 : 0), drift: true, depth: FAR + 5.3, alpha: R.alpha, exitOff: true, vx: -1 });
        }
    },
    lightning: {
        // Storm flashes light up the far cypress silhouettes (the lit sky variant); dimmed with reduced flash.
        enter: (_d, z) => { z.state.next = 1200; },
        tick: (d, z, dt) => {
            const L = B.lightning;
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = d.rand(L.minMs, L.maxMs);
            d.strike();
        }
    },

    // ---------------------------------------------------------------- 2-3
    mill_wheel: {
        // The far mill's broken waterwheel turns over Imagegen's painted mill and creaks.
        enter: (d, z) => {
            const M = B.millWheel;
            d.actor({ key: 'bg_millwheel_big', anim: 'bg_millwheel_big_turn', origin: [0.5, 0.5], sf: M.sf, sfY: M.sfY, ax: M.ax, sy: M.y, depth: FAR + 4.1, alpha: M.alpha, zone: z, fadeIn: 400 });
            z.state.next = M.creakMs;
        },
        tick: (d, z, dt) => {
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = B.millWheel.creakMs;
            d.announce('mill_wheel', d.screenX(B.millWheel.ax, B.millWheel.sf), B.millWheel.y - 30);
        }
    },
    den_glow: {
        // Green reactor glow pulses from the far den, with chain rattles.
        enter: (d, z) => {
            const G = B.denGlow;
            d.actor({ key: 'bg_den_glow', anim: 'bg_den_glow_pulse', origin: [0.5, 0.5], sf: G.sf, sfY: 0.12, ax: G.ax, sy: G.y, depth: FAR + 6.2, alpha: G.alpha, add: true, zone: z, fadeIn: 900 });
            z.state.next = G.rattleMs;
        },
        tick: (d, z, dt) => {
            if (((z.state.next as number) -= dt) > 0 || !z.on) return;
            z.state.next = B.denGlow.rattleMs;
            d.announce('den_glow', d.screenX(B.denGlow.ax, B.denGlow.sf), B.denGlow.y);
        }
    }
};
Object.assign(ZONES, M2_ZONES);
