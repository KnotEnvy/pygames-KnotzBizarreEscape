import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo, type Hurtbox } from '../../core';
import { ENEMIES, type EnemyKind } from '../../config/tuning/enemies';

export function animate(s: Phaser.GameObjects.Sprite, key: string, loop = false): void {
    if (s.anims.currentAnim?.key === key && s.anims.isPlaying) return;
    if (s.scene?.anims.get(key)?.frames.length) s.play({ key, repeat: loop ? -1 : 0 }, true);
}
export function visible(ctx: GameContext, x: number, y: number, margin = 0): boolean {
    const v = ctx.camera.view();
    return x >= v.left - margin && x <= v.right + margin && y >= v.top - margin && y <= v.bottom + margin;
}
export function lineOfSight(ctx: GameContext, x: number, y: number, tx: number, ty: number): boolean {
    const n = Math.ceil(Math.hypot(tx - x, ty - y) / 8);
    for (let i = 1; i < n; i++) if (ctx.level.solidAt(x + (tx - x) * i / n, y + (ty - y) * i / n)) return false;
    return true;
}

/** One scaled state clock owns every release; no delayed callbacks survive a death. */
export class Enemy extends Phaser.GameObjects.Sprite {
    hp: number;
    state = 'patrol';
    facing: 1 | -1;
    readonly wave: unknown;
    private clock = 0;
    private age = 0;
    private flash = 0;
    private cooldown = 0;
    private burst = 0;
    private aimAngle = 0;
    private vx = 0;
    private vy = 0;
    private shieldHp = 10;
    private chute: Phaser.GameObjects.Sprite | null = null;
    private chuteAlive = true;
    private chuteTear = 0;
    private crouch = false;
    private deathCause = '';
    private alertedUntil = 0;
    private readonly startX: number;
    private readonly startY: number;
    private readonly patrol: number;
    private readonly rect = new Phaser.Geom.Rectangle();
    private readonly offs: Array<() => void> = [];
    private readonly box: Hurtbox;
    constructor(private readonly ctx: GameContext, readonly kind: EnemyKind, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y, kind);
        ctx.scene.add.existing(this);
        this.setOrigin(.5, kind === 'drone' ? .5 : 1).setDepth(DEPTH.ENEMIES);
        this.hp = ENEMIES[kind].hp;
        this.startX = x; this.startY = y;
        this.facing = props.facing === 'right' || Number(props.facing) === 1 ? 1 : -1;
        this.wave = props.wave;
        this.patrol = props.patrol === false ? 0 : Number.isFinite(Number(props.patrol)) ? Math.abs(Number(props.patrol)) : 48;
        this.box = { team: 'enemy', body: () => this.bounds(), hit: h => this.hit(h), alive: () => this.active && this.hp > 0, material: kind === 'shield' ? 'shield' : kind === 'turret' || kind === 'drone' ? 'metal' : 'flesh', kind, owner: this };
        if (kind === 'paratrooper') {
            this.state = 'descent';
            this.chute = ctx.scene.add.sprite(x, y - 33, 'parachute').setOrigin(.5, 1).setDepth(DEPTH.ENEMIES + .1);
            animate(this.chute, 'parachute_descent', true);
            const r = new Phaser.Geom.Rectangle();
            this.offs.push(ctx.damage.register({ team: 'enemy', body: () => r.setTo(this.x - 21, this.y - 76, 42, 18), material: 'flesh', kind: 'chute', alive: () => this.active && this.hp > 0 && this.chuteAlive && this.state === 'descent', hit: () => { this.chuteAlive = false; this.chuteTear = 350; this.pose('chute_torn'); animate(this.chute!, 'parachute_torn'); this.ctx.audio.sfx('chute_tear'); } }));
        }
        this.offs.push(ctx.damage.register(this.box), ctx.onUpdate(dt => this.tick(dt)), ctx.events.on('enemy:killed', e => {
            if (this.hp > 0 && this.state !== 'panic' && this.state !== 'descent' && this.state !== 'land' && kind !== 'turret' && kind !== 'drone' && Math.hypot(e.x - this.x, e.y - this.y) < 72 && ctx.rng.chance(.3)) {
                this.facing = e.x < this.x ? 1 : -1; this.enter('panic', 900); ctx.audio.sfx('enemy_panic');
            }
        }));
        this.once('destroy', () => { for (const off of this.offs) off(); this.chute?.destroy(); });
        this.pose(kind === 'drone' ? 'fly' : kind === 'paratrooper' ? 'descent' : 'idle', true);
    }
    private bounds(): Phaser.Geom.Rectangle {
        return this.rect.setTo(this.x - (this.kind === 'turret' ? 10 : 8), this.y - (this.kind === 'drone' ? 7 : 34), this.kind === 'drone' ? 20 : 16, this.kind === 'drone' ? 15 : 34);
    }
    private pose(tag: string, loop = false): void { animate(this, `${this.kind === 'paratrooper' && this.state !== 'descent' && this.state !== 'land' ? 'grunt' : this.kind}_${tag}`, loop); }
    private enter(state: string, ms: number): void { this.state = state; this.clock = ms; }
    hit(h: HitInfo): boolean {
        if (this.hp <= 0) return false;
        if (this.kind === 'shield' && this.shieldHp > 0 && this.state !== 'recover' && !(this.state === 'windup' && this.clock < 100) && h.kind === 'bullet' && !/rocket/i.test(h.weapon ?? '') && h.dirX * this.facing < -.4 && Math.abs(h.dirY) < .65 && h.y > this.y - 32) {
            this.box.material = 'shield'; this.shieldHp -= h.damage; this.pose(this.shieldHp <= 0 ? 'shield_break' : 'block');
            this.ctx.events.emit('projectile:impact', { x: h.x, y: h.y, material: 'shield', team: h.source }); this.ctx.audio.sfx('shield_tink');
            this.ctx.projectiles.forEach(p => { if (p.team === h.source && Math.hypot(p.x - h.x, p.y - h.y) < 4) p.kill(); });
            return false;
        }
        if (this.kind === 'shield') this.box.material = 'flesh';
        this.hp -= h.damage; this.flash = 60; this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        if (this.hp <= 0) {
            this.ctx.events.emit('enemy:killed', { x: this.x, y: this.y, kind: this.kind, score: ENEMIES[this.kind].score, cause: h.kind });
            this.ctx.audio.sfx('enemy_die'); this.chute?.setVisible(false);
            this.deathCause = h.kind; this.enter('dead', ENEMIES.corpseMs); this.vx = h.dirX * this.ctx.rng.range(70, 110); this.vy = h.kind === 'flame' ? -35 : -240;
            this.pose(this.kind === 'turret' || this.kind === 'drone' ? 'destroyed' : h.kind === 'flame' ? 'death_flame' : h.kind === 'explosion' ? 'death_explosion' : 'death_launched');
            if (this.kind === 'turret' || this.kind === 'drone') this.ctx.events.emit('explosion', { x: this.x, y: this.y - 12, size: 's', team: 'enemy' });
        }
        return true;
    }
    private move(speed: number, dt: number): void {
        const nx = this.x + speed * dt / 1000;
        const ground = this.ctx.physics.groundBelow(nx + Math.sign(speed) * 8, this.y - 12, 30);
        if (ground === null || this.ctx.level.solidAt(nx + Math.sign(speed) * 10, this.y - 18) || this.ctx.physics.hazardAt(nx, this.y + 2)) { this.facing = this.facing === 1 ? -1 : 1; return; }
        this.x = nx; this.y = ground;
    }
    private fire(): void {
        const p = this.ctx.player(); if (!p?.alive() || !visible(this.ctx, this.x, this.y - 20) || !lineOfSight(this.ctx, this.x, this.y - 22, p.x, p.centerY) || Math.abs(p.x - this.x) < 18) return;
        const turret = this.kind === 'turret';
        const a = turret ? this.aimAngle : Math.atan2(p.centerY - (this.y - (this.crouch ? 14 : 22)), p.x - this.x);
        this.ctx.projectiles.spawn({ x: this.x + Math.cos(a) * 18, y: this.y - (this.crouch ? 14 : 22), vx: Math.cos(a) * (turret ? 130 : ENEMIES.bulletSpeed), vy: Math.sin(a) * (turret ? 130 : ENEMIES.bulletSpeed), team: 'enemy', damage: 1, texture: turret ? 'turret_bullet' : 'enemy_bullet', anim: turret ? 'turret_bullet_fly' : 'enemy_bullet_fly', rotate: false, lifetime: 2600 });
        if (turret) this.pose(`fire_${(Math.round(-this.aimAngle / (Math.PI / 4)) + 8) % 8}`);
        this.ctx.events.emit('enemy:shoot', { kind: this.kind, weapon: 'rifle', x: this.x + Math.cos(a) * 18, y: this.y - (this.crouch ? 14 : 22), angle: a });
        this.ctx.audio.sfx('enemy_shoot');
    }
    private grenade(): void {
        const ctx = this.ctx; let bounced = false;
        const boom = (x: number, y: number) => { ctx.damage.applyRadial(x, y, 26, 1, 'enemy', 'explosion'); ctx.events.emit('explosion', { x, y, size: 's', team: 'enemy' }); };
        if (ctx.level.solidAt(this.x + this.facing * 10, this.y - 40)) return;
        ctx.projectiles.spawn({ x: this.x + this.facing * 10, y: this.y - 35, vx: this.facing * 105, vy: -230, gravity: 650, lifetime: 1650, team: 'enemy', damage: 0, texture: 'enemy_grenade', anim: 'enemy_grenade_fuse', rotate: false, silent: true,
            onImpact: (p, i) => { if (i.hurtbox) { boom(p.x, p.y); return false; } if (!bounced) { bounced = true; if (i.normalY) p.vy *= -.35; else p.vx *= -.35; } else { p.vx = 0; p.vy = 0; p.gravity = 0; } return true; }, onExpire: p => boom(p.x, p.y) });
        ctx.audio.sfx('grenade_throw');
    }
    private tick(dt: number): void {
        if (!dt || !this.active) return;
        if (this.state !== 'dead' && this.x < this.ctx.camera.leftEdge() - 96) { this.destroy(); return; }
        if (this.state !== 'dead' && !visible(this.ctx, this.x, this.y, 32)) return;
        this.age += dt; this.clock -= dt; this.cooldown -= dt; this.flash -= dt;
        if (this.flash <= 0) this.clearTint();
        if (this.state === 'dead') {
            if (this.deathCause !== 'flame' && this.kind !== 'turret') { this.vy += 900 * dt / 1000; this.x += this.vx * dt / 1000; this.y += this.vy * dt / 1000; }
            if (this.clock <= 0) this.destroy(); return;
        }
        this.setFlipX(this.kind !== 'turret' && this.facing < 0);
        if (this.state === 'descent') {
            this.vy = this.chuteAlive ? 28 : Math.min(190, this.vy + 550 * dt / 1000);
            const floor = this.ctx.physics.groundBelow(this.x, this.y, this.vy * dt / 1000 + 3);
            this.y += this.vy * dt / 1000; this.chuteTear -= dt; this.chute?.setPosition(this.x + Math.sin(this.age / 500) * 4, this.y - 33).setVisible(this.chuteAlive || this.chuteTear > 0);
            if (floor !== null && this.y >= floor - 2) { this.y = floor; this.chute?.setVisible(false); this.enter('land', 660); this.pose('landing'); }
            return;
        }
        if (this.state === 'land') { if (this.clock <= 0) { this.setTexture('grunt'); this.enter('patrol', 0); } return; }
        if (this.state === 'panic') { this.pose('panic', true); this.move(this.facing * 72, dt); if (this.clock <= 0) this.enter('patrol', 0); return; }
        const p = this.ctx.player(); const cfg = ENEMIES[this.kind];
        const dx = p ? p.x - this.x : 9999;
        const inCone = this.kind === 'drone' || this.kind === 'turret' || this.age < this.alertedUntil || (dx * this.facing >= 0 && Math.abs((p?.centerY ?? this.y) - (this.y - 22)) <= Math.abs(dx) * 1.43);
        const sees = inCone && !!p?.alive() && Math.hypot(dx, p.centerY - (this.y - 22)) <= cfg.sight && lineOfSight(this.ctx, this.x, this.y - 22, p.x, p.centerY);
        if (this.kind === 'drone') {
            if (this.state === 'windup' && this.clock <= 0) { this.enter('dive', 700); this.vx = Math.cos(this.aimAngle) * 125; this.vy = Math.sin(this.aimAngle) * 125; this.pose('dive'); }
            else if (this.state === 'dive') { this.x += this.vx * dt / 1000; this.y += this.vy * dt / 1000; this.ctx.damage.applyRadial(this.x, this.y, 9, 1, 'enemy', 'contact'); if (this.ctx.level.solidAt(this.x, this.y + 8)) this.hit({ damage: this.hp, source: 'neutral', x: this.x, y: this.y, dirX: this.facing, dirY: 1, kind: 'contact' }); else if (this.clock <= 0) this.enter('recover', 900); }
            else if (this.state === 'recover') { this.x += (this.startX - this.x) * Math.min(1, dt / 600); this.y += (this.startY - this.y) * Math.min(1, dt / 300); if (this.clock <= 0) { this.enter('patrol', 0); this.cooldown = 1800; } }
            else if (this.state !== 'windup') { this.pose('fly', true); this.y = this.startY + Math.sin(this.age / 1800 * Math.PI * 2) * 12; this.x += this.facing * 44 * dt / 1000; if (Math.abs(this.x - this.startX) > Math.max(48, this.patrol)) this.facing = this.x > this.startX ? -1 : 1; if (sees && this.cooldown <= 0) { this.aimAngle = Math.atan2(p!.centerY - this.y, dx); this.enter('windup', 320); this.pose('dive'); this.ctx.audio.sfx('drone_buzz'); } }
            return;
        }
        if (this.state === 'windup' && this.clock <= 0) {
            if (this.kind === 'grenadier') { this.grenade(); this.enter('recover', cfg.cooldown + this.ctx.rng.range(-250, 250)); }
            else { this.burst = this.kind === 'turret' ? 5 : this.kind === 'shield' ? 1 : this.ctx.rng.int(1, 3); this.enter('burst', 0); }
        }
        if (this.state === 'burst' && this.clock <= 0) { this.fire(); this.burst--; this.clock += this.kind === 'turret' ? 120 : 180; if (!this.burst) this.enter('recover', cfg.cooldown); return; }
        if (this.state === 'recover') { if (this.kind === 'grenadier' && p?.alive() && Math.abs(dx) < 112) { this.facing = dx < 0 ? -1 : 1; this.pose('retreat', true); this.move(-this.facing * 52, dt); } if (this.clock <= 0) this.enter('patrol', 0); else return; }
        if (this.state === 'alert') { if (this.clock <= 0) { this.enter('windup', cfg.windup); this.crouch = this.kind === 'grunt' && this.ctx.rng.chance(.25); this.pose(this.kind === 'grenadier' ? 'throw' : this.crouch ? 'crouch_shoot' : 'shoot'); } return; }
        if (this.state === 'windup' || this.state === 'burst') return;
        if (sees) {
            this.alertedUntil = this.age + 800;
            this.facing = dx < 0 ? -1 : 1;
            if (this.kind === 'grenadier' && Math.abs(dx) > 140) { this.pose('walk', true); this.move(this.facing * 24, dt); return; }
            if (this.kind === 'grenadier' && Math.abs(dx) < 80) { this.pose('retreat', true); this.move(-this.facing * 52, dt); return; }
            if (this.kind === 'turret') { this.aimAngle = Math.round(Math.atan2(p!.centerY - (this.y - 18), dx) / (Math.PI / 4)) * Math.PI / 4; const d = (Math.round(-this.aimAngle / (Math.PI / 4)) + 8) % 8; this.enter('windup', 580); this.pose(`windup_${d}`); this.ctx.audio.sfx('turret_windup'); }
            else { this.enter('alert', 360); this.pose('alert'); this.ctx.events.emit('ui:popup', { x: this.x, y: this.y - 40, text: '!', color: 0xffe478 }); this.ctx.audio.sfx('enemy_shout'); }
        } else if (this.kind === 'turret') this.pose('aim_4', true);
        else { if (Math.abs(this.x - this.startX) >= this.patrol) this.facing = this.x > this.startX ? -1 : 1; if (this.patrol) { this.move(this.facing * cfg.speed, dt); this.pose('walk', true); } else this.pose('idle', true); }
    }
    snapshot(): unknown { return { kind: this.kind, x: this.x, y: this.y, hp: this.hp, state: this.state, wave: this.wave, chute: this.chuteAlive }; }
}
