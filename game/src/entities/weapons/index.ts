import Phaser from 'phaser';
import { DEPTH, type GameContext, type Projectile, type Hurtbox } from '../../core';
import { PLAYER as T, isWeapon, type Weapon } from '../../config/tuning/player';

export class Weapons {
    shotsFired = 0;
    private sinceShot = Infinity;
    private lastAngle = 0;
    private flameLeft = 0;
    private flameTick = 0;
    private flameAngle = 0;
    private seekRect = new Phaser.Geom.Rectangle();
    private flashes: Record<'laser_muzzle' | 'laser_impact', Phaser.GameObjects.Sprite[]> = {
        laser_muzzle: [], laser_impact: [],
    };
    private flashNext = { laser_muzzle: 0, laser_impact: 0 };
    private pumpAge = -1;
    private pumpEjected = false;
    private pumpAngle = 0;
    private pellets: { sprite: Phaser.GameObjects.Sprite; x: number; y: number; dx: number; dy: number; age: number; limit: number }[] = [];
    private coneTargets: { h: Hurtbox; x: number; y: number; distance: number }[] = [];
    private coneOwners = new Set<unknown>();
    get pumping(): boolean { return this.pumpAge >= T.shotgunPumpMs - 90 && this.pumpAge < T.shotgunPumpEndMs; }
    constructor(private ctx: GameContext) {
        for (const texture of ['laser_muzzle', 'laser_impact'] as const) {
            for (let i = 0; i < 2; i++) {
                const spr = ctx.scene.add.sprite(0, 0, texture)
                    .setDepth(DEPTH.PROJECTILES + 1).setActive(false).setVisible(false);
                spr.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.setActive(false).setVisible(false));
                this.flashes[texture].push(spr);
            }
        }
        // Tracers are visual only: cone damage is resolved exactly once at the trigger.
        for (let i = 0; i < 5; i++) this.pellets.push({
            sprite: ctx.scene.add.sprite(0, 0, ctx.scene.textures.exists('shotgun_pellet') ? 'shotgun_pellet' : 'pistol_bullet').setDepth(DEPTH.PROJECTILES).setVisible(false),
            x: 0, y: 0, dx: 0, dy: 0, age: -1, limit: 0,
        });
        ctx.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const p of this.pellets) p.sprite.destroy();
            this.pellets.length = 0;
            for (const pool of Object.values(this.flashes)) {
                for (const spr of pool) spr.destroy();
                pool.length = 0;
            }
        });
    }
    equip(name: string, ammo?: number): void {
        if (!isWeapon(name)) return;
        this.cancel();
        this.ctx.state.setWeapon(name, name === 'pistol' ? Infinity : Math.max(0, ammo ?? T.ammo[name]));
        this.sinceShot = Infinity;
    }
    update(dt: number, muzzle: { x: number; y: number }): void {
        this.sinceShot += dt;
        if (this.ctx.state.weapon !== 'shotgun') this.pumpAge = -1;
        if (this.pumpAge >= 0) {
            this.pumpAge += dt;
            if (!this.pumpEjected && this.pumpAge >= T.shotgunPumpMs) {
                this.pumpEjected = true;
                this.ctx.events.emit('fx:emit', { effect: 'shotgun_pump', x: muzzle.x, y: muzzle.y, angle: this.pumpAngle, team: 'player' });
                this.ctx.events.emit('fx:emit', { effect: 'casing', x: muzzle.x - Math.cos(this.pumpAngle) * 10, y: muzzle.y, angle: this.pumpAngle, scale: 1.3, count: 1, team: 'player' });
            }
            if (this.pumpAge >= T.shotgunMs) {
                this.pumpAge = -1;
                if (this.ctx.state.weapon === 'shotgun' && this.ctx.state.ammo <= 0) this.ctx.state.setWeapon('pistol', Infinity);
            }
        }
        for (const p of this.pellets) {
            if (p.age < 0) continue;
            p.age += dt;
            const distance = p.age * 0.9;
            if (distance >= p.limit) { p.age = -1; p.sprite.setVisible(false); }
            else p.sprite.setPosition(p.x + p.dx * distance, p.y + p.dy * distance);
        }
        if (this.flameLeft > 0) {
            this.flameLeft -= dt; this.flameTick -= dt;
            if (this.flameTick <= 0) { this.flameTick += T.flameTickMs; this.flame(muzzle.x, muzzle.y, this.flameAngle); }
        }
    }
    cancel(): void {
        this.flameLeft = 0; this.pumpAge = -1;
        for (const p of this.pellets) { p.age = -1; p.sprite.setVisible(false); }
    }
    fire(x: number, y: number, angle: number, tapped: boolean): boolean {
        const ctx = this.ctx;
        const w: Weapon = isWeapon(ctx.state.weapon) ? ctx.state.weapon : 'pistol';
        const interval = w === 'pistol' ? (tapped ? T.pistolTapMs : T.pistolHoldMs) :
            w === 'shotgun' ? T.shotgunMs : w === 'laser' ? T.laserMs : w === 'hmg' ? T.hmgMs : w === 'spread' ? T.spreadMs : w === 'rocket' ? T.rocketMs : T.flameMs;
        if (this.sinceShot < interval) return false;
        if (w !== 'pistol' && ctx.state.ammo <= 0) { this.equip('pistol'); return false; }
        let shotAngle = angle;
        if (w === 'hmg') {
            const diff = Math.atan2(Math.sin(angle - this.lastAngle), Math.cos(angle - this.lastAngle));
            shotAngle = this.sinceShot > T.sweepMs * 2 ? angle : this.lastAngle + diff * Math.min(1, this.sinceShot / T.sweepMs);
            shotAngle += ctx.rng.range(-2, 2) * Math.PI / 180;
        }
        this.lastAngle = shotAngle;
        this.sinceShot = 0;
        if (w === 'spread') for (let i = -2; i <= 2; i++) this.bullet(x, y, angle + i * Math.PI / 18, w);
        else if (w === 'shotgun') this.shotgun(x, y, angle);
        else if (w === 'laser') this.laser(x, y, angle);
        else if (w === 'rocket') this.rocket(x, y, angle);
        else if (w === 'flame') { this.flameLeft = T.flameBurstMs; this.flameAngle = angle; this.flameTick = T.flameTickMs; this.flame(x, y, angle); }
        else this.bullet(x, y, shotAngle, w);
        this.shotsFired++;
        ctx.events.emit('player:shoot', { weapon: w, x, y, angle: shotAngle });
        if (w !== 'shotgun') ctx.audio.sfx(w, { x }); // Shotgun fire/pump are event-driven by Audio.
        if (w !== 'pistol') {
            ctx.fx.shake(1);
            const remaining = ctx.state.ammo - 1;
            // Let the last shotgun round finish its recoil and pump before drawing the pistol.
            if (remaining <= 0 && w !== 'shotgun') ctx.state.setWeapon('pistol', Infinity);
            else ctx.state.ammo = remaining;
        }
        return true;
    }
    private clearRay(x: number, y: number, dx: number, dy: number, distance: number): number {
        for (let d = 0; d <= distance; d += 2) if (this.ctx.physics.solidAt(x + dx * d, y + dy * d)) return d;
        return distance;
    }
    private shotgun(x: number, y: number, angle: number): void {
        const ctx = this.ctx, range = T.shotgunRange, dx = Math.cos(angle), dy = Math.sin(angle);
        this.pumpAge = 0; this.pumpEjected = false; this.pumpAngle = angle;
        this.seekRect.setTo(x - range, y - range, range * 2, range * 2);
        // Snapshot before hit callbacks reuse DamageService's query buffers.
        this.coneTargets.length = 0; this.coneOwners.clear();
        for (const h of ctx.damage.queryRect(this.seekRect, 'player')) {
            const r = ctx.damage.rectOf(h);
            const along = Math.max(0, Math.min(range, (r.centerX - x) * dx + (r.centerY - y) * dy));
            const hx = Math.max(r.left, Math.min(r.right, x + dx * along));
            const hy = Math.max(r.top, Math.min(r.bottom, y + dy * along));
            const vx = hx - x, vy = hy - y, distance = Math.hypot(vx, vy);
            const dot = vx * dx + vy * dy;
            if (distance > range || dot < 0 || (distance > 2 && dot / distance < Math.cos(T.shotgunHalfAngle))) continue;
            if (distance > 0 && this.clearRay(x, y, vx / distance, vy / distance, distance) < distance - 1) continue;
            this.coneTargets.push({ h, x: hx, y: hy, distance });
        }
        this.coneTargets.sort((a, b) => a.distance - b.distance);
        let hits = 0;
        for (const target of this.coneTargets) {
            const owner = target.h.owner ?? target.h;
            if (this.coneOwners.has(owner)) continue;
            const damage = target.distance <= 24 ? T.shotgunCloseDamage : target.distance <= 48 ? T.shotgunMidDamage : T.shotgunFarDamage;
            if (ctx.damage.deal(target.h, { damage, source: 'player', x: target.x, y: target.y, dirX: dx, dirY: dy, kind: 'bullet', weapon: 'shotgun' })) {
                this.coneOwners.add(owner);
                ctx.events.emit('projectile:impact', { x: target.x, y: target.y, material: target.h.material ?? 'flesh', team: 'player', weapon: 'shotgun' });
                if (++hits >= T.shotgunMaxTargets) break;
            }
        }
        for (let i = 0; i < this.pellets.length; i++) {
            const p = this.pellets[i], a = angle + (i - 2) * T.shotgunHalfAngle / 2;
            p.x = x; p.y = y; p.dx = Math.cos(a); p.dy = Math.sin(a); p.age = 0;
            p.limit = this.clearRay(x, y, p.dx, p.dy, T.shotgunTracerRange - Math.abs(i - 2) * 4);
            p.sprite.setPosition(x, y).setRotation(a).setVisible(p.limit > 0);
        }
    }
    private bullet(x: number, y: number, angle: number, weapon: Weapon): void {
        const texture = weapon === 'hmg' ? 'hmg_bullet' : weapon === 'spread' ? 'spread_bullet' : 'pistol_bullet';
        this.ctx.projectiles.spawn({ x, y, vx: Math.cos(angle) * T.bulletSpeed, vy: Math.sin(angle) * T.bulletSpeed,
            team: 'player', damage: 1, weapon, texture, anim: `${texture}_fly`, lifetime: 1400 });
    }
    private flash(texture: 'laser_muzzle' | 'laser_impact', x: number, y: number, angle: number): void {
        const pool = this.flashes[texture];
        if (!pool.length) return;
        const spr = pool[this.flashNext[texture]];
        this.flashNext[texture] = (this.flashNext[texture] + 1) % pool.length;
        // Replaying also restarts a live slot when a piercing pulse exhausts the pool.
        spr.setPosition(x, y).setRotation(angle).setActive(true).setVisible(true);
        spr.play(`${texture}_flash`);
    }
    private laser(x: number, y: number, angle: number): void {
        this.flash('laser_muzzle', x, y, angle);
        this.ctx.projectiles.spawn({ x, y, vx: Math.cos(angle) * T.laserSpeed, vy: Math.sin(angle) * T.laserSpeed,
            team: 'player', damage: T.laserDamage, weapon: 'laser', texture: 'laser_beam', anim: 'laser_beam_fly',
            pierce: Infinity, radius: 2, lifetime: T.laserLifetimeMs,
            onHit: (_p, hit) => this.flash('laser_impact', hit.x, hit.y, angle),
            onImpact: (_p, hit) => { if (!hit.hurtbox) this.flash('laser_impact', hit.x, hit.y, angle); } });
    }
    private boom(x: number, y: number, radius: number, damage: number, weapon: string): void {
        this.ctx.damage.applyRadial(x, y, radius, damage, 'player', 'explosion', weapon);
        this.ctx.fx.explosion(x, y, weapon === 'rocket' ? 's' : 'm', 'player');
    }
    private rocket(x: number, y: number, angle: number): void {
        this.ctx.projectiles.spawn({ x, y, vx: Math.cos(angle) * T.rocketStart, vy: Math.sin(angle) * T.rocketStart,
            team: 'player', damage: 0, weapon: 'rocket', texture: 'rocket', anim: 'rocket_fly', radius: 3, silent: true,
            onUpdate: (p, dt) => {
                let heading = Math.atan2(p.vy, p.vx), best = 120 * 120, targetAngle = heading;
                this.seekRect.setTo(p.x - 120, p.y - 120, 240, 240);
                for (const h of this.ctx.damage.queryRect(this.seekRect, 'player')) {
                    if (h.team !== 'enemy' || !h.alive()) continue;
                    const r = this.ctx.damage.rectOf(h), dx = r.centerX - p.x, dy = r.centerY - p.y;
                    const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - heading), Math.cos(Math.atan2(dy, dx) - heading));
                    if (dx * dx + dy * dy < best && Math.abs(delta) < Math.PI / 3) { best = dx * dx + dy * dy; targetAngle = heading + delta; }
                }
                heading += Math.max(-T.rocketSeek * dt, Math.min(T.rocketSeek * dt, targetAngle - heading));
                const speed = Math.min(T.rocketMax, Math.hypot(p.vx, p.vy) + T.rocketAcceleration * dt);
                p.vx = Math.cos(heading) * speed; p.vy = Math.sin(heading) * speed;
            },
            onImpact: p => { this.boom(p.x, p.y, 20, 6, 'rocket'); },
            onExpire: p => this.boom(p.x, p.y, 20, 6, 'rocket') });
    }
    private flame(x: number, y: number, angle: number): void {
        // The centered flame art starts 22 px past its emitter. Sweep that initial
        // gap with the same solid query as projectiles so low shots cannot skip a floor.
        for (let distance = 0; distance <= 22; distance += 1) {
            const px = x + Math.cos(angle) * distance, py = y + Math.sin(angle) * distance;
            if (this.ctx.physics.solidAt(px, py)) {
                this.ctx.events.emit('projectile:impact', { x: px, y: py, material: this.ctx.physics.materialAt(px, py), weapon: 'flame', team: 'player' });
                return;
            }
        }
        this.ctx.projectiles.spawn({ x: x + Math.cos(angle) * 22, y: y + Math.sin(angle) * 22, vx: Math.cos(angle) * 240, vy: Math.sin(angle) * 240,
            team: 'player', damage: 0.4, kind: 'flame', weapon: 'flame', texture: 'flame', anim: 'flame_flow',
            pierce: Infinity, radius: 7, lifetime: (T.flameReach - 22) / 240 * 1000 });
    }
    grenade(x: number, y: number, facing: 1 | -1): void {
        const ctx = this.ctx;
        ctx.events.emit('player:grenade', { x, y }); ctx.audio.sfx('grenade_throw', { x });
        let bounces = 0, bounceAge = -1;
        const boom = (p: Projectile): void => this.boom(p.x, p.y, T.grenadeRadius, T.grenadeDamage, 'grenade');
        ctx.projectiles.spawn({ x, y, vx: facing * T.grenadeSpeed, vy: -T.grenadeUp, gravity: T.gravity,
            team: 'player', damage: 0, kind: 'explosion', weapon: 'grenade', texture: 'grenade', anim: 'grenade_spin',
            lifetime: T.grenadeFuseMs, radius: 3, silent: true,
            onImpact: (p, hit) => {
                // Engine substeps retain this frame's displacement after a bounce. Ignore repeated contacts in that same step.
                if (!hit.hurtbox && p.age === bounceAge) return true;
                if (hit.hurtbox || bounces++ >= 1) { boom(p); return false; }
                bounceAge = p.age;
                if (hit.normalY) p.vy *= -0.35; else p.vx *= -0.5;
                p.vx *= 0.7; return true;
            }, onExpire: boom });
    }
}
