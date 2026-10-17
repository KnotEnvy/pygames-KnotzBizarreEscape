import Phaser from 'phaser';
import { DEPTH, type GameContext, type Projectile } from '../../core';
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
    constructor(private ctx: GameContext) {
        for (const texture of ['laser_muzzle', 'laser_impact'] as const) {
            for (let i = 0; i < 2; i++) {
                const spr = ctx.scene.add.sprite(0, 0, texture)
                    .setDepth(DEPTH.PROJECTILES + 1).setActive(false).setVisible(false);
                spr.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.setActive(false).setVisible(false));
                this.flashes[texture].push(spr);
            }
        }
        ctx.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const pool of Object.values(this.flashes)) {
                for (const spr of pool) spr.destroy();
                pool.length = 0;
            }
        });
    }
    equip(name: string, ammo?: number): void {
        if (!isWeapon(name)) return;
        this.flameLeft = 0;
        this.ctx.state.setWeapon(name, name === 'pistol' ? Infinity : Math.max(0, ammo ?? T.ammo[name]));
        this.sinceShot = Infinity;
    }
    update(dt: number, muzzle: { x: number; y: number }): void {
        this.sinceShot += dt;
        if (this.flameLeft > 0) {
            this.flameLeft -= dt; this.flameTick -= dt;
            if (this.flameTick <= 0) { this.flameTick += T.flameTickMs; this.flame(muzzle.x, muzzle.y, this.flameAngle); }
        }
    }
    cancel(): void { this.flameLeft = 0; }
    fire(x: number, y: number, angle: number, tapped: boolean): boolean {
        const ctx = this.ctx;
        const w: Weapon = isWeapon(ctx.state.weapon) ? ctx.state.weapon : 'pistol';
        const interval = w === 'pistol' ? (tapped ? T.pistolTapMs : T.pistolHoldMs) :
            w === 'laser' ? T.laserMs : w === 'hmg' ? T.hmgMs : w === 'spread' ? T.spreadMs : w === 'rocket' ? T.rocketMs : T.flameMs;
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
        else if (w === 'laser') this.laser(x, y, angle);
        else if (w === 'rocket') this.rocket(x, y, angle);
        else if (w === 'flame') { this.flameLeft = T.flameBurstMs; this.flameAngle = angle; this.flameTick = T.flameTickMs; this.flame(x, y, angle); }
        else this.bullet(x, y, shotAngle, w);
        this.shotsFired++;
        ctx.events.emit('player:shoot', { weapon: w, x, y, angle: shotAngle });
        ctx.audio.sfx(w, { x });
        if (w !== 'pistol') {
            ctx.fx.shake(1);
            const remaining = ctx.state.ammo - 1;
            if (remaining <= 0) ctx.state.setWeapon('pistol', Infinity);
            else ctx.state.ammo = remaining;
        }
        return true;
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
        this.ctx.projectiles.spawn({ x: x + Math.cos(angle) * 22, y: y + Math.sin(angle) * 22, vx: Math.cos(angle) * 240, vy: Math.sin(angle) * 240,
            team: 'player', damage: 0.4, kind: 'flame', weapon: 'flame', texture: 'flame', anim: 'flame_flow',
            pierce: Infinity, radius: 7, lifetime: (T.flameReach - 22) / 240 * 1000, silent: true });
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
