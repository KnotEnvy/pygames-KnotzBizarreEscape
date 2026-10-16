import Phaser from 'phaser';
import { DEPTH, settings, type GameContext, type GameEvents, type ImpactMaterial, type ExplosionSize, type ShakeTier } from '../core';
import { FX } from '../config/tuning/fx';
import { FxPool } from './pool';
import { FxFilters } from './filters';

type Ambience = 'snow' | 'embers' | 'fireflies' | 'steam' | null;
const MACHINE = /turret|drone|tank|moose|machine/;
const MUZZLES: Record<string, readonly [string, string]> = {
    pistol: ['fx_muzzle_pistol_right', 'fx_muzzle_pistol_diag'], hmg: ['fx_muzzle_hmg_right', 'fx_muzzle_hmg_diag'],
    spread: ['fx_muzzle_spread_right', 'fx_muzzle_spread_diag'], rocket: ['fx_muzzle_rocket_right', 'fx_muzzle_rocket_diag'],
    flame: ['fx_muzzle_flame_right', 'fx_muzzle_flame_diag']
};
const EXPLOSIONS = { s: 'fx_explosion_s_burst', m: 'fx_explosion_m_burst', l: 'fx_explosion_l_burst', xl: 'fx_explosion_xl_burst' };
const METAL = ['fx_debris_metal_v1', 'fx_debris_metal_v2', 'fx_debris_metal_v3', 'fx_debris_metal_v4'];
const ROCK = ['fx_debris_rock_v1', 'fx_debris_rock_v2', 'fx_debris_rock_v3', 'fx_debris_rock_v4'];
const WOOD = ['fx_debris_wood_v1', 'fx_debris_wood_v2', 'fx_debris_wood_v3', 'fx_debris_wood_v4'];
const SPARKS = ['fx_sparks_v1', 'fx_sparks_v2', 'fx_sparks_v3', 'fx_sparks_v4'];
const EMBERS = ['fx_embers_v1', 'fx_embers_v2', 'fx_embers_v3', 'fx_embers_v4'];
const SNOW = ['fx_snow_v1', 'fx_snow_v2', 'fx_snow_v3'];

export class FxDirector {
    readonly pool: FxPool;
    readonly filters: FxFilters;
    private readonly impacts = Array.from({ length: FX.impactsPerFrame }, () => ({ x: 0, y: 0, material: 'flesh' as ImpactMaterial, primary: false }));
    private impactCount = 0;
    private frameCpu = 0;
    private readonly zones = Array.from({ length: 32 }, () => ({ id: '', kind: null as Ambience, active: false, x: 0, y: 0, width: 0, height: 0, debt: 0 }));
    private ambientEnabled = true;
    private explicitDustUntil = 0;
    private lastSplash = -1000; private splashX = 0; private splashY = 0;
    private readonly popups: { text: Phaser.GameObjects.Text; age: number; y: number }[] = [];
    private readonly stats = { active: 0, peak: 0, dropped: 0, cpuMs: 0, cpuPeakMs: 0, filters: 'plain', ambience: null as Ambience, popups: 0, impacts: 0, explosions: 0, splashes: 0, combat: null as FxPool['combatLive'] | null, coverage: 0, cloudCoverage: 0, cues: 0 };
    private readonly offUpdate: () => void;
    private ambience: Ambience = null;
    private ambientDebt = 0;
    private shake = 0; private stop = 0;
    private realClock = 0; private lastShake = -1000; private lastTier = 0; private lastFlash = -1000;
    private lastStop = -1000; private criticalStop = false;
    private lastCasing = -1000; private lastHmg = -1000; private lastFlameHurt = -1000;
    private bossDying = false; private bossPhase = -1; private slowPending = false;
    private lastX = NaN; private lastY = NaN; private lastVx = 0; private lastDust = 0; private wasWater = false;
    private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    constructor(readonly ctx: GameContext) {
        this.pool = new FxPool(ctx);
        this.stats.combat = this.pool.combatLive;
        this.filters = new FxFilters(ctx);
        for (let i = 0; i < FX.popup.cap; i++) {
            this.popups.push({ text: ctx.scene.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '8px', color: '#ffe066', stroke: '#1a1220', strokeThickness: 2
            }).setOrigin(0.5).setDepth(DEPTH.FX_TOP).setVisible(false), age: FX.popup.life, y: 0 });
        }
        const bus = ctx.events.scoped(ctx.scene);
        const on = <K extends keyof GameEvents>(key: K, handler: (e: GameEvents[K]) => unknown): void => {
            bus.on(key, e => { const start = performance.now(); handler(e); this.frameCpu += performance.now() - start; });
        };
        on('player:shoot', e => this.shoot(e));
        on('enemy:shoot', e => this.shoot(e, true));
        on('fx:emit', e => this.spatial(e));
        on('fx:zone', e => this.zone(e));
        on('projectile:impact', e => this.queueImpact(e.x, e.y, e.material, true));
        on('entity:hurt', e => {
            if (e.kind === 'flame') {
                if (this.realClock - this.lastFlameHurt < 100) return;
                this.lastFlameHurt = this.realClock;
                this.scatter(e.x, e.y, EMBERS, 2, 35, 35, 220, false);
            }
            this.queueImpact(e.x, e.y, e.material, false);
            if (e.kind === 'melee') this.feel(1, 0);
        });
        on('explosion', e => this.explosion(e.x, e.y, e.size));
        on('enemy:killed', e => {
            const machine = MACHINE.test(e.kind);
            this.feel(0, this.bossDying ? 0 : machine ? FX.feel.machineKill : e.cause === 'melee' ? FX.feel.meleeKill : FX.feel.kill);
            if (machine) this.scatter(e.x, e.y, METAL, 6, 75, 320, 700, true);
            else {
                this.pool.spawn('dust', 'fx_death_poof_burst', e.x, e.y - 8, 120)?.image.setDepth(DEPTH.ENEMIES - 1);
                this.scatter(e.x, e.y, ROCK, 4, 35, 120, 260, false);
            }
        });
        on('player:jump', e => this.dust(e.x, e.y, 'run', 0.75));
        on('player:land', e => {
            const speed = Math.abs(e.vy ?? 180);
            if (ctx.physics.hazardAt(e.x, e.y) === 'water') this.splash(e.x, e.y);
            else this.dust(e.x, e.y, 'land', speed < 120 ? 0.7 : speed > 260 ? 1.2 : 1);
            if (speed > 260) { this.feel(1, 0); this.scatter(e.x, e.y - 2, ROCK, 3, 35, 250, 250, false); }
        });
        on('player:melee', e => this.pool.spawn('impact', 'fx_hit_pop_burst', e.x + 8 * e.facing, e.y, 0, 0.6));
        on('player:grenade', e => this.dust(e.x, e.y, 'run', 0.4));
        on('player:spawn', e => this.dust(e.x, e.y, 'land', 1));
        on('player:respawn', e => { this.dust(e.x, e.y, 'land', 1); this.celebrate(e.x, e.y - 12, 8); this.wasWater = false; });
        on('player:died', e => {
            if (ctx.physics.hazardAt(e.x, e.y) === 'water') { if (!this.wasWater) this.splash(e.x, this.waterline(e.x, e.y)); this.wasWater = true; }
            else { this.pool.spawn('impact', 'fx_hit_pop_burst', e.x, e.y - 16); this.pool.spawn('dust', 'fx_death_poof_burst', e.x, e.y - 12, 160); }
            this.criticalStop = true; this.feel(2, FX.feel.death);
        });
        on('pickup:collected', e => this.celebrate(e.x, e.y, e.kind === 'life' ? 10 : 6));
        on('pow:freed', e => this.celebrate(e.x, e.y - 16, 6));
        on('checkpoint', e => this.celebrate(e.x, e.y - 8, 4));
        on('boss:spawn', e => { this.bossPhase = e.phase; this.bossDying = false; this.feel(3, 0); });
        on('boss:phase', e => { if (this.bossPhase !== e.phase) { this.bossPhase = e.phase; this.clearCues(); this.feel(3, FX.feel.phase); } });
        on('boss:hp', e => { if (e.hp <= 0) { this.bossDying = true; this.clearCues(); } });
        // Current boss emits defeated AFTER its destruction bursts. Start slow motion after the final stop.
        on('boss:defeated', e => {
            // Body choreography remains boss-owned. One final core burst follows its chain.
            if (e.x !== undefined && e.y !== undefined) this.explosion(e.x, e.y - 48, 'xl', true);
            this.bossDying = false; this.slowPending = true;
        });
        on('fx:ambience', e => this.setAmbience(e.kind));
        on('ui:popup', e => this.popup(e));
        on('settings:changed', () => this.filters.applySettings());
        on('stage:clear', () => { this.setAmbience(null); this.ambientEnabled = false; });
        on('game:over', () => { this.ambientEnabled = false; this.setAmbience(null); this.slowPending = false; this.shake = this.stop = 0; });
        on('game:continue', () => this.reset());
        on('stage:start', () => { this.pool.clear(); this.impactCount = 0; this.ambientEnabled = true; });
        this.offUpdate = ctx.onUpdate((dt, rawDt) => this.update(dt, rawDt));
        // Flush after gameplay/projectiles, so damage and impact pairs coalesce within the same frame.
        ctx.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.flush, this);
        ctx.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
        ctx.debug.register('fx', () => this.stats);
    }

    private feel(shake: number, stop: number): void { this.shake = Math.max(this.shake, shake); this.stop = Math.max(this.stop, stop); }
    private queueImpact(x: number, y: number, material: ImpactMaterial, primary: boolean): void {
        for (let i = 0; i < this.impactCount; i++) {
            const r = this.impacts[i];
            if (Math.abs(x - r.x) <= 4 && Math.abs(y - r.y) <= 4 && (r.material === material || primary !== r.primary)) {
                if (primary) { r.x = x; r.y = y; r.material = material; r.primary = true; } return;
            }
        }
        if (this.impactCount === this.impacts.length) { this.pool.dropped++; return; }
        const r = this.impacts[this.impactCount++]; r.x = x; r.y = y; r.material = material; r.primary = primary;
    }
    private flush(): void {
        const start = performance.now();
        for (let i = 0; i < this.impactCount; i++) { const r = this.impacts[i]; this.impact(r.x, r.y, r.material); }
        this.impactCount = 0;
        if (this.stop > 0 && (this.criticalStop || this.realClock - this.lastStop >= FX.feel.stopGate)) {
            this.ctx.fx.hitstop(this.stop); this.lastStop = this.realClock;
        }
        this.criticalStop = false;
        this.pool.present();
        this.stats.coverage = this.pool.coverage; this.stats.cloudCoverage = this.pool.cloudCoverage;
        if (this.shake > 0 && (this.shake > this.lastTier || this.realClock - this.lastShake >= FX.feel.shakeGate)) {
            if (settings.get().shake) this.ctx.fx.shake(this.shake as ShakeTier);
            this.lastShake = this.realClock; this.lastTier = this.shake;
        }
        this.stop = this.shake = 0;
        this.frameCpu += performance.now() - start;
        this.stats.cpuMs = this.stats.cpuMs * 0.95 + this.frameCpu * 0.05;
        this.stats.cpuPeakMs = Math.max(this.stats.cpuPeakMs, this.frameCpu);
        this.frameCpu = 0;
    }
    private impact(x: number, y: number, material: ImpactMaterial): void {
        this.stats.impacts++;
        if (material === 'water') { this.pool.spawn('impact', 'fx_water_ripple_expand', x, y); return; }
        if (material === 'snow') {
            const puff = this.pool.spawn('impact', 'fx_impact_snow_burst', x, y, 0, 1, true);
            if (puff) { puff.image.setOrigin(0.5, 20 / 24); puff.alpha = 0.7; }
            this.scatter(x, y, SNOW, 4, 35, 110, 300, false);
            return;
        }
        const metal = material === 'metal' || material === 'shield';
        const wood = material === 'wood';
        const dirt = material === 'dirt' || material === 'stone';
        const s = this.pool.spawn('impact', metal ? material === 'shield' ? 'fx_impact_shield_tink' : 'fx_impact_metal_burst' : wood ? 'fx_impact_wood_burst' : dirt ? 'fx_impact_dirt_burst' : 'fx_hit_pop_burst', x, y, 0, 1, true);
        if (s && (wood || dirt)) s.image.setOrigin(0.5, 20 / 24);
        if (metal || wood || dirt) this.scatter(x, y, metal ? SPARKS : wood ? WOOD : ROCK, metal ? material === 'shield' ? 2 : 4 : wood ? 3 : 2, metal ? 95 : 45, 250, metal ? 240 : 340, !metal);
    }

    private shoot(e: { weapon?: string; x: number; y: number; angle: number }, enemy = false): void {
        const weapon = e.weapon && MUZZLES[e.weapon] ? e.weapon : 'pistol';
        if (weapon === 'flame') for (const s of this.pool.slots) {
            if (s.live && s.category === 'muzzle' && s.clip?.texture === 'fx_muzzle_flame' && s.age < 100 && Math.abs(s.image.x - e.x) < 12 && Math.abs(s.image.y - e.y) < 12) return;
        }
        const angle = e.angle + (weapon === 'rocket' ? Math.PI : 0);
        const diagonal = Math.abs(Math.round(angle / (Math.PI / 4))) % 2 === 1;
        // Reuse the current socket's flash, never stack HMG muzzles in one place.
        for (const s of this.pool.slots) if (s.live && s.category === 'muzzle' && Math.abs(s.image.x - e.x) < 12 && Math.abs(s.image.y - e.y) < 12) this.pool.release(s);
        const s = this.pool.spawn('muzzle', MUZZLES[weapon][diagonal ? 1 : 0], e.x, e.y, 0, 1, true);
        if (s) { s.image.setOrigin(8 / 48, 0.5).setRotation(angle + (diagonal ? Math.PI / 4 : 0)); s.fade = 0; }
        if (weapon === 'pistol' || weapon === 'hmg' || weapon === 'spread') {
            const flare = this.pool.spawn('glow', 'fx_flare_still', e.x + Math.cos(e.angle) * 12, e.y + Math.sin(e.angle) * 12);
            if (flare) { flare.life = 35; flare.fade = 35; flare.alpha = 0.35; flare.image.setRotation(e.angle).setBlendMode(Phaser.BlendModes.ADD); }
            if (weapon !== 'hmg' || this.realClock - this.lastCasing >= FX.casing.interval) {
                this.lastCasing = this.realClock;
                const c = this.pool.spawn('casing', 'fx_casing_spin', e.x - Math.cos(e.angle) * 9, e.y, 0, 1, true);
                if (c) { c.life = FX.casing.life; c.fade = 120; c.vx = -Math.cos(e.angle) * this.ctx.rng.range(35, 55); c.vy = this.ctx.rng.range(-100, -70); c.gravity = FX.casing.gravity; c.bounce = 2; c.spin = true; }
            }
        }
        if (!enemy && weapon === 'hmg' && this.realClock - this.lastHmg >= 160) { this.feel(1, 0); this.lastHmg = this.realClock; }
        if (!enemy && weapon === 'spread') this.feel(1, 0);
        if (weapon === 'rocket') {
            if (!enemy) this.feel(2, 0);
            this.smoke(e.x, e.y, 0, 0.5); this.smoke(e.x, e.y, 45, 0.5);
        }
        if (weapon === 'flame') { this.scatter(e.x, e.y, EMBERS, 2, 45, 35, 220, false); this.glow(e.x, e.y, 0.6, 0.15); }
    }

    explosion(x: number, y: number, size: ExplosionSize, finale = false): void {
        if (size === 'xl' && this.pool.countTexture('fx_explosion_xl') >= 2) {
            if (!finale) size = 'l';
            else {
                // Reserve the cinematic XL without exceeding the two-hero-burst cap.
                let oldest;
                for (const s of this.pool.slots) if (s.live && s.clip?.texture === 'fx_explosion_xl' && (!oldest || s.age > oldest.age)) oldest = s;
                if (oldest) this.pool.release(oldest);
            }
        }
        const recipe = FX.explosion[size];
        const burst = this.pool.spawn('explosion', EXPLOSIONS[size], x, y, 0, 1, true);
        if (!burst) return; // Offscreen combat does not consume visual/feel budgets.
        burst.hot = true; burst.fade = 140;
        this.stats.explosions++;
        this.glow(x, y, recipe.glow, 0.22);
        for (let i = 0; i < recipe.smoke; i++) this.smoke(x + this.ctx.rng.range(-10, 10), y - 8, recipe.delay + i * 60, size === 's' ? 0.6 : size === 'xl' ? 1.3 : 1);
        const material = this.ctx.physics.materialAt(x, y + 12);
        this.scatter(x, y, material === 'metal' ? METAL : material === 'wood' ? WOOD : ROCK, recipe.debris, 100, 320, 750, true);
        this.scatter(x, y, EMBERS, recipe.embers, 85, 35, 550, false);
        const ground = this.ctx.physics.groundBelow(x, y, 24);
        if (ground !== null && recipe.ring > 0 && this.ctx.physics.materialAt(x, ground) !== 'water' && this.ctx.physics.hazardAt(x, ground) !== 'water' && !this.ctx.physics.oneWayAt(x, ground)) {
            this.pool.spawn('dust', 'fx_shockwave_expand', x, ground, 0, recipe.ring)?.image.setDepth(DEPTH.DECALS + 1);
            const decal = this.pool.spawn('decal', 'fx_scorch_round', x, ground, 0, recipe.scorch, true);
            if (decal) { decal.life = FX.decalMs; decal.alpha = 0.65; decal.fade = 1500; decal.image.setDepth(DEPTH.DECALS); }
        }
        this.feel(recipe.shake, finale ? 120 : this.bossDying ? 0 : recipe.stop);
        if (finale) { this.criticalStop = true; this.ctx.audio.sfx('explo_xl', { x }); }
        if (size === 'xl' && (!this.bossDying || finale)) {
            // Engine also gates its camera flash; honor reduced motion for our own requests.
            if (!settings.get().reducedFlash && !this.reducedMotion.matches && this.realClock - this.lastFlash >= FX.feel.flashGate) {
                this.ctx.fx.flash(finale ? 0xffffff : 0xfff1cf, 45); this.lastFlash = this.realClock;
            }
        }
    }
    private glow(x: number, y: number, scale: number, alpha: number): void {
        const s = this.pool.spawn('glow', 'fx_glow_32_still', x, y, 0, scale);
        if (s) { s.life = 160; s.fade = 160; s.alpha = alpha; s.hot = true; s.image.setBlendMode(Phaser.BlendModes.ADD); }
    }
    private smoke(x: number, y: number, delay: number, scale: number): void {
        const s = this.pool.spawn('smoke', 'fx_smoke_drift', x, y, delay, scale);
        if (s) { s.image.setDepth(DEPTH.ENEMIES - 1); s.alpha = FX.readability.smokeAlpha; s.vy = this.ctx.rng.range(-24, -12); s.vx = this.ctx.rng.range(-8, 8); s.fade = 180; }
    }
    private scatter(x: number, y: number, tags: readonly string[], count: number, speed: number, gravity: number, life: number, bounce: boolean): void {
        // Sub-budgets keep loose embers sparse even during stacked XL bursts.
        const kind = tags === EMBERS ? 'embers' : tags === SPARKS ? 'sparks' : tags === SNOW ? 'snow' : 'debris';
        const cap = kind === 'embers' ? 16 : kind === 'sparks' ? 80 : kind === 'snow' ? 16 : 64;
        count = Math.min(count, cap - this.pool.combatLive[kind]);
        for (let i = 0; i < count; i++) {
            const s = this.pool.spawn('combat', this.ctx.rng.pick(tags), x, y);
            if (!s) break;
            const angle = this.ctx.rng.range(-Math.PI, 0), velocity = this.ctx.rng.range(speed * 0.4, speed * 1.3);
            s.vx = Math.cos(angle) * velocity; s.vy = Math.sin(angle) * velocity - 15;
            s.gravity = gravity; s.life = life * this.ctx.rng.range(0.65, 1.15); s.fade = 140; s.bounce = bounce ? 2 : 0;
            s.image.setDepth(DEPTH.ENEMIES - 1);
            if (tags === EMBERS) { s.alpha = 0.55; s.image.setScale(0.75); }
        }
    }
    private dust(x: number, y: number, kind: 'land' | 'run' | 'skid', scale: number): void {
        const s = this.pool.spawn('dust', kind === 'land' ? 'fx_dust_land' : kind === 'run' ? 'fx_dust_run' : 'fx_dust_skid', x, y, 0, scale);
        if (s) { s.image.setOrigin(kind === 'land' ? 0.5 : 26 / 32, 0.8).setDepth(DEPTH.ENEMIES - 1).setFlipX(this.lastVx < 0); s.alpha = 0.75; }
    }
    splash(x: number, y: number): void {
        if (this.realClock - this.lastSplash < 180 && Math.abs(x - this.splashX) < 12 && Math.abs(y - this.splashY) < 20) return;
        this.lastSplash = this.realClock; this.splashX = x; this.splashY = y;
        this.stats.splashes++;
        this.pool.spawn('dust', 'fx_water_splash_fall', x, y)?.image.setOrigin(0.5, 47 / 56);
        const ripple = this.pool.spawn('impact', 'fx_water_ripple_expand', x, y, 100, 1.8);
        if (ripple) ripple.image.setDepth(DEPTH.FX);
    }
    private waterline(x: number, y: number): number {
        for (let dy = 0; dy < 64; dy += 2) if (this.ctx.physics.hazardAt(x, y - dy - 2) !== 'water') return y - dy;
        return y;
    }
    private celebrate(x: number, y: number, count: number): void { this.scatter(x, y, SPARKS, count, 30, -10, 450, false); }
    setAmbience(kind: Ambience): void { this.ambience = kind; this.ambientDebt = 0; }
    private emitAmbient(kind: Ambience, left: number, top: number, right: number, bottom: number): void {
        if (!kind) return;
        const cap = kind === 'snow' ? 32 : kind === 'steam' ? 6 : 12;
        const texture = kind === 'snow' ? 'fx_snow' : kind === 'steam' ? 'fx_steam' : kind === 'fireflies' ? 'fx_firefly' : 'fx_embers';
        let count = 0;
        for (const s of this.pool.slots) if (s.live && (s.category === 'ambient' || kind === 'steam') && s.clip?.texture === texture) count++;
        if (count >= cap) return;
        const x = this.ctx.rng.range(left, right);
        const y = kind === 'snow' ? top : kind === 'steam' ? bottom : this.ctx.rng.range(top, bottom);
        const tag = kind === 'snow' ? this.ctx.rng.pick(SNOW) : kind === 'fireflies' ? 'fx_firefly_pulse' : kind === 'steam' ? 'fx_steam_vent' : this.ctx.rng.pick(EMBERS);
        const s = this.pool.spawn('ambient', tag, x, y);
        if (!s) return;
        s.life = kind === 'steam' ? 770 : kind === 'snow' ? 10000 : 3000;
        s.vx = kind === 'snow' ? this.ctx.rng.range(-16, -8) : this.ctx.rng.range(-6, 6);
        s.vy = kind === 'snow' ? this.ctx.rng.range(12, 22) : kind === 'fireflies' ? this.ctx.rng.range(-4, 4) : this.ctx.rng.range(-28, -15);
        s.alpha = kind === 'steam' ? 0.35 : 0.65; s.fade = 500;
        s.loop = kind === 'fireflies';
        s.image.setDepth(DEPTH.PROPS - 1);
        if (kind === 'steam') s.image.setOrigin(0.5, 44 / 48);
        if (kind === 'embers') { s.alpha = 0.45; s.image.setScale(0.75); }
        if (kind === 'fireflies') s.image.setBlendMode(Phaser.BlendModes.ADD);
    }
    private zone(e: GameEvents['fx:zone']): void {
        let slot;
        for (const z of this.zones) if (z.id === e.id) { slot = z; break; }
        if (!slot && e.active) for (const z of this.zones) if (!z.active) { slot = z; break; }
        if (!slot) return;
        slot.id = e.id; slot.active = e.active;
        slot.kind = e.kind === 'snow' || e.kind === 'embers' || e.kind === 'fireflies' || e.kind === 'steam' ? e.kind : null;
        slot.x = e.x; slot.y = e.y; slot.width = e.width; slot.height = e.height; slot.debt = 0;
    }
    private spatial(e: GameEvents['fx:emit']): void {
        const scale = Math.max(0.25, Math.min(2, e.scale ?? 1));
        switch (e.effect) {
            case 'boss_cannon_charge': case 'boss_flame_reach': case 'boss_charge_lane':
                this.anticipate(e); break;
            case 'dust_run': case 'dust_skid': case 'dust_land':
                this.explicitDustUntil = this.ctx.time.now + 250;
                this.dust(e.x, e.y, e.effect === 'dust_run' ? 'run' : e.effect === 'dust_skid' ? 'skid' : 'land', scale); break;
            case 'splash': case 'waterfall': this.splash(e.x, e.y); break;
            case 'vent_steam': {
                let vents = 0;
                for (const slot of this.pool.slots) if (slot.live && slot.clip?.texture === 'fx_steam') vents++;
                if (vents >= 6) break;
                const s = this.pool.spawn('smoke', 'fx_steam_vent', e.x, e.y, 0, scale);
                if (s) { s.image.setOrigin(0.5, 44 / 48).setDepth(DEPTH.ENEMIES - 1); s.alpha = 0.45; }
                break;
            }
            case 'debris': this.scatter(e.x, e.y, e.material === 'metal' ? METAL : e.material === 'wood' ? WOOD : ROCK, Math.min(24, e.count ?? 6), 90, 320, 700, true); break;
            case 'shield_spark': this.queueImpact(e.x, e.y, 'shield', true); break;
            case 'shockwave': this.pool.spawn('dust', 'fx_shockwave_expand', e.x, e.y, 0, scale)?.image.setDepth(DEPTH.DECALS + 1); break;
            case 'muzzle_enemy': {
                const s = this.pool.spawn('muzzle', 'fx_muzzle_pistol_right', e.x, e.y, 0, scale, true);
                if (s) s.image.setOrigin(8 / 48, 0.5).setRotation(e.angle ?? 0);
                break;
            }
            case 'casing': {
                const s = this.pool.spawn('casing', 'fx_casing_spin', e.x, e.y, 0, scale, true);
                if (s) { s.life = FX.casing.life; s.fade = 120; s.vx = -Math.cos(e.angle ?? 0) * 45; s.vy = -85; s.gravity = FX.casing.gravity; s.bounce = 2; s.spin = true; }
                break;
            }
            case 'scorch': {
                const ground = this.ctx.physics.groundBelow(e.x, e.y, 24);
                if (ground === null || this.ctx.physics.hazardAt(e.x, ground) === 'water' || this.ctx.physics.oneWayAt(e.x, ground)) break;
                const s = this.pool.spawn('decal', 'fx_scorch_round', e.x, ground, 0, scale, true);
                if (s) { s.life = FX.decalMs; s.fade = 1500; s.alpha = 0.65; s.image.setDepth(DEPTH.DECALS); }
                break;
            }
        }
    }
    private clearCues(): void { for (const s of this.pool.slots) if (s.live && s.cue) this.pool.release(s); }

    /** One event at windup start. angle = committed attack direction; scale = reach multiplier.
     * Separate pooled silhouettes: converging cannon sparks, rising heat streaks, low dust lane. */
    private anticipate(e: GameEvents['fx:emit']): void {
        const angle = e.angle ?? Math.PI;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const scale = Math.max(0.25, Math.min(2, e.scale ?? 1));
        this.stats.cues++;
        if (e.effect === 'boss_cannon_charge') {
            const s = this.pool.spawn('glow', 'fx_glow_32_still', e.x, e.y, 0, 0.7, true);
            if (s) { s.cue = true; s.life = 320; s.fade = 70; s.alpha = 0.4; s.image.setDepth(DEPTH.ENEMIES + 1).setBlendMode(Phaser.BlendModes.ADD); }
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2;
                const spark = this.pool.spawn('impact', SPARKS[i], e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12, 0, 0.7, true);
                if (spark) { spark.cue = true; spark.image.setDepth(DEPTH.ENEMIES + 1); spark.life = 300; spark.vx = -Math.cos(a) * 36; spark.vy = -Math.sin(a) * 36; spark.alpha = 0.65; }
            }
        } else if (e.effect === 'boss_flame_reach') {
            for (let i = 0; i < 5; i++) {
                const s = this.pool.spawn('dust', 'fx_heat_reach', e.x + dx * (12 + i * 18) * scale,
                    e.y + dy * (12 + i * 18) * scale, i * 18, 1, true);
                if (s) { s.cue = true; s.alpha = 0.65; s.vy = -8; s.image.setBlendMode(Phaser.BlendModes.ADD); s.life = 400 - i * 18; s.fade = 100; }
            }
        } else {
            for (let i = 0; i < 7; i++) {
                const s = this.pool.spawn('dust', 'fx_dust_skid', e.x + dx * (16 + i * 24) * scale,
                    e.y, i * 30, 0.65, true);
                if (s) { s.cue = true; s.image.setOrigin(0.5, 0.8).setFlipX(dx > 0); s.alpha = 0.55; s.life = 500 - i * 30; s.fade = 100; }
            }
        }
    }
    private observeMovement(dt: number): void {
        const player = this.ctx.player();
        if (!player || dt === 0) return;
        const x = player.x, y = player.y;
        if (Number.isFinite(this.lastX) && Math.abs(x - this.lastX) < 24 && Math.abs(y - this.lastY) < 40) {
            const vx = (x - this.lastX) * 1000 / dt;
            const water = this.ctx.physics.hazardAt(x, y) === 'water';
            if (water && !this.wasWater) this.splash(x, this.waterline(x, y));
            this.wasWater = water;
            const ground = this.ctx.physics.groundBelow(x, y - 2, 5);
            if (player.alive() && ground !== null && !water && this.ctx.time.now >= this.explicitDustUntil && this.ctx.time.now - this.lastDust > 140) {
                if (Math.abs(this.lastVx) > 40 && (Math.sign(vx) !== Math.sign(this.lastVx) || Math.abs(vx) < 10)) { this.dust(x, y, 'skid', 0.8); this.lastDust = this.ctx.time.now; }
                else if (Math.abs(vx) > 60 && this.ctx.time.now - this.lastDust > 220) { this.dust(x, y, 'run', 0.55); this.lastDust = this.ctx.time.now; }
            }
            this.lastVx = vx;
        }
        this.lastX = x; this.lastY = y;
    }
    private popup(e: GameEvents['ui:popup']): void {
        if (!FX.popup.enabled || this.ctx.scene.registry.get('fx.popups') === false || this.ctx.events.listenerCount('ui:popup') > 1) return;
        for (const p of this.popups) if (p.age >= FX.popup.life) {
            p.age = 0; p.y = e.y;
            p.text.setText(e.text).setPosition(e.x, e.y).setColor(`#${(e.color ?? 0xffe066).toString(16).padStart(6, '0')}`).setAlpha(1).setVisible(true); return;
        }
    }
    private update(dt: number, rawDt: number): void {
        const start = performance.now();
        if (!this.ctx.time.paused) this.realClock += rawDt;
        if (this.slowPending && this.stop === 0 && !this.ctx.time.frozen) { this.ctx.fx.slowmo(0.35, 900); this.slowPending = false; }
        this.pool.update(dt);
        this.observeMovement(dt);
        const view = this.ctx.camera.view();
        let hasZone = false;
        if (this.ambientEnabled && dt > 0) for (const z of this.zones) {
            if (!z.active || !z.kind) continue;
            const left = Math.max(z.x, view.left), right = Math.min(z.x + z.width, view.right);
            const top = Math.max(z.y, view.top), bottom = Math.min(z.y + z.height, view.bottom);
            if (left >= right || top >= bottom) { z.debt = 0; continue; }
            hasZone = true;
            z.debt += dt * FX.ambientRate[z.kind] / 1000;
            if (z.debt >= 1) { z.debt -= 1; this.emitAmbient(z.kind, left, top, right, bottom); }
        }
        if (this.ambientEnabled && !hasZone && this.ambience && dt > 0) {
            this.ambientDebt += dt * FX.ambientRate[this.ambience] / 1000;
            if (this.ambientDebt >= 1) { this.ambientDebt -= 1; this.emitAmbient(this.ambience, view.left, view.top, view.right, view.bottom); }
        }
        let popups = 0;
        for (const p of this.popups) if (p.age < FX.popup.life) {
            p.age += dt; p.text.y = p.y - 20 * p.age / FX.popup.life;
            p.text.alpha = Math.min(1, (FX.popup.life - p.age) / 200); p.text.setVisible(p.age < FX.popup.life); popups++;
        }
        this.filters.update(this.pool.hot);
        this.stats.active = this.pool.active; this.stats.peak = this.pool.peak; this.stats.dropped = this.pool.dropped;
        this.stats.filters = this.filters.mode; this.stats.ambience = this.ambience; this.stats.popups = popups;
        const elapsed = performance.now() - start;
        this.frameCpu += elapsed;
    }
    private reset(): void {
        this.pool.clear(); this.impactCount = 0; this.shake = this.stop = 0; this.bossDying = this.slowPending = this.criticalStop = false; this.lastStop = -1000;
        this.lastX = this.lastY = NaN; this.wasWater = false; this.ambientEnabled = true;
        for (const p of this.popups) { p.age = FX.popup.life; p.text.setVisible(false); }
    }
    private destroy(): void {
        this.offUpdate(); this.ctx.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.flush, this);
        this.filters.destroy(); this.pool.destroy();
        for (const p of this.popups) p.text.destroy();
    }
}
