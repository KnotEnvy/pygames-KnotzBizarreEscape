import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo } from '../../core';
import { ENEMIES } from '../../config/tuning/enemies';
import { animate, visible } from '../enemies/Enemy';

type RigPart = { id: string; key: string; sourceSize: [number, number]; pivot: [number, number]; attach: [number, number]; z: number; idleTag: string };
type Socket = { part?: string; point?: [number, number]; rootPoint?: [number, number] };
type Rig = { parts: RigPart[]; sockets: Record<string, Socket> };
type FlyingPart = { sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; spin: number; head: boolean; age: number };

export class Moosezilla extends Phaser.GameObjects.Container {
    hp: number = ENEMIES.boss.hp;
    phase = 1;
    state = 'roar';
    private clock = 900;
    private elapsed = 0;
    private cycle = 0;
    private fired = 0;
    private flash = 0;
    private tickDamage = 0;
    private vent: Phaser.GameObjects.Sprite | null = null;
    private direction: 1 | -1 = -1;
    private walkDirection = -1;
    private readonly facing: 1 | -1;
    private readonly arena0: number;
    private readonly arena1: number;
    private readonly rig: Rig;
    private readonly parts = new Map<string, Phaser.GameObjects.Sprite>();
    private readonly antlers: Record<string, number> = { antler_l: 45, antler_r: 45 };
    private readonly debris: FlyingPart[] = [];
    private readonly flies = new Set<Phaser.GameObjects.GameObject>();
    private readonly headAntlers: Phaser.GameObjects.Sprite[] = [];
    private readonly rect = new Phaser.Geom.Rectangle();
    private readonly offs: Array<() => void> = [];
    constructor(private readonly ctx: GameContext, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y);
        ctx.scene.add.existing(this); this.setDepth(DEPTH.ENEMIES);
        this.facing = props.facing === 'right' || Number(props.facing) === 1 ? 1 : -1;
        this.arena0 = Number(props.arenaX0 ?? Math.max(ctx.level.bounds.left, ctx.camera.leftEdge()));
        this.arena1 = Number(props.arenaX1 ?? Math.min(ctx.level.bounds.right, this.arena0 + 384));
        ctx.camera.lock(this.arena0, this.arena1);
        this.rig = ctx.scene.cache.json.get('moosezilla_rig') as Rig;
        for (const p of [...this.rig.parts].sort((a, b) => a.z - b.z)) {
            const s = ctx.scene.add.sprite(p.attach[0], p.attach[1], p.key).setOrigin(p.pivot[0] / p.sourceSize[0], p.pivot[1] / p.sourceSize[1]);
            this.add(s); this.parts.set(p.id, s); animate(s, p.id.startsWith('legs') ? `${p.key}_walk` : p.idleTag, true);
        }
        this.setScale(this.facing, 1);
        // A single silhouette hurtbox routes hits by location: radial/piercing attacks cannot
        // double-damage overlapping hull, core and cannon shapes.
        this.offs.push(ctx.damage.register({ team: 'enemy', body: () => this.rect.setTo(this.x - 76, this.y - 116, 152, 116), material: 'metal', kind: 'moosezilla', owner: this, alive: () => this.active && this.hp > 0, hit: h => this.hit(h) }), ctx.onUpdate(dt => this.updateBoss(dt)));
        this.once('destroy', () => { for (const off of this.offs) off(); for (const d of this.debris) d.sprite.destroy(); for (const s of this.headAntlers) s.destroy(); this.vent?.destroy(); });
        ctx.events.emit('boss:spawn', this.info()); ctx.audio.sfx('boss_roar');
    }
    private info(): { name: string; hp: number; maxHp: number; phase: number; x: number; y: number } { return { name: 'MOOSEZILLA', hp: this.hp, maxHp: ENEMIES.boss.hp, phase: this.phase, x: this.x, y: this.y }; }
    private pose(id: string, tag: string, loop = false): void { const s = this.parts.get(id); if (s) animate(s, `${s.texture.key}_${tag}`, loop); }
    private socket(key: string): { x: number; y: number } {
        const s = this.rig.sockets[key];
        if (s.rootPoint) return { x: this.x + s.rootPoint[0] * this.facing, y: this.y + s.rootPoint[1] };
        const p = this.rig.parts.find(p => p.id === s.part)!;
        return { x: this.x + (p.attach[0] + s.point![0] - p.pivot[0]) * this.facing, y: this.y + p.attach[1] + s.point![1] - p.pivot[1] };
    }
    private detach(id: string): void {
        const s = this.parts.get(id); if (!s?.visible) return;
        this.remove(s); s.setPosition(this.x + s.x * this.facing, this.y + s.y).setScale(this.facing, 1).setDepth(DEPTH.ENEMIES + .5); s.stop();
        this.debris.push({ sprite: s, vx: this.ctx.rng.range(-90, 90), vy: this.ctx.rng.range(-220, -130), spin: this.ctx.rng.range(-3, 3), head: id === 'head', age: 0 });
        this.parts.delete(id);
    }
    private hit(h: HitInfo): boolean {
        if (this.hp <= 0) return false;
        let multiplier = 1;
        if (this.phase === 3) { const c = this.socket('core'); if (Math.hypot(h.x - c.x, h.y - c.y) <= 19) multiplier = 2; }
        for (const id of ['antler_l', 'antler_r']) {
            const p = this.rig.parts.find(p => p.id === id)!;
            const px = this.x + (p.attach[0] + 18) * this.facing;
            if (this.phase === 1 && this.antlers[id] > 0 && Math.abs(h.x - px) < 30 && h.y < this.y - 80) {
                this.antlers[id] -= h.damage;
                if (this.antlers[id] <= 0) { this.pose(id, 'broken'); this.ctx.events.emit('enemy:killed', { x: px, y: this.y - 90, kind: 'moosezilla_antler', score: ENEMIES.boss.antlerScore, cause: h.kind }); this.ctx.events.emit('explosion', { x: px, y: this.y - 90, size: 'm', team: 'enemy' }); }
                break;
            }
        }
        this.setHp(this.hp - h.damage * multiplier);
        this.flash = 55; for (const s of this.parts.values()) s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        return true;
    }
    /** Deterministic QA phase/damage control; exposed only through the enemytest hook. */
    setHp(value: number): void {
        if (this.hp <= 0) return;
        this.hp = Phaser.Math.Clamp(value, 0, ENEMIES.boss.hp);
        this.ctx.events.emit('boss:hp', this.info());
        // Emit every crossed threshold, including a single large lethal hit.
        while (this.phase < 3 && this.hp <= (this.phase === 1 ? 240 : 100)) {
            this.phase++; this.ctx.events.emit('boss:phase', this.info());
            this.enter('roar', 700); this.cycle = 0; this.pose('head', 'roar'); this.ctx.audio.sfx('boss_roar');
            if (this.phase === 2) { this.detach('antler_l'); this.detach('antler_r'); this.pose('body', 'damaged', true); }
            else { this.detach('armor'); this.pose('body', 'critical', true); for (const fly of this.flies) fly.destroy(); }
        }
        if (this.hp <= 0) {
            this.enter('death', ENEMIES.boss.deathMs); this.ctx.projectiles.clear('enemy');
            for (const fly of this.flies) fly.destroy();
            this.ctx.events.emit('fx:slowmo', { scale: .45, ms: 1000 }); this.ctx.events.emit('fx:flash', { color: 0xffffff, ms: 160 }); this.ctx.events.emit('fx:shake', { tier: 4 }); this.ctx.events.emit('fx:hitstop', { ms: 150 });
            this.ctx.audio.sfx('boss_explode'); this.detach('armor'); this.detach('jaw'); this.detach('head'); this.detach('antler_l'); this.detach('antler_r');
            for (const key of ['moosezilla_antler_l', 'moosezilla_antler_r']) {
                const s = this.ctx.scene.add.sprite(this.x, this.y, key).setOrigin(8 / 56, 44 / 48).setScale(this.facing, 1).setDepth(DEPTH.ENEMIES + .6);
                animate(s, `${key}_broken`); this.headAntlers.push(s);
            }
        }
    }
    private enter(state: string, ms: number): void { this.state = state; this.clock = ms; this.elapsed = 0; this.fired = 0; }
    private steam(): void {
        const at = this.socket('steam');
        if (this.ctx.scene.anims.exists('fx_steam_vent') && this.ctx.scene.anims.get('fx_steam_vent')?.frames.length) {
            if (!this.vent) {
                this.vent = this.ctx.scene.add.sprite(at.x, at.y, 'fx_steam').setOrigin(.5, 44 / 48).setDepth(DEPTH.ENEMIES - 1);
                this.vent.on('animationcomplete', () => this.vent?.setVisible(false));
            }
            this.vent.setPosition(at.x, at.y).setVisible(true); animate(this.vent, 'fx_steam_vent');
        }
        this.ctx.audio.sfx('steam');
    }
    private volley(side: number): void {
        const id = side ? 'antler_r' : 'antler_l'; if (this.antlers[id] <= 0) return;
        const p = this.ctx.player(); const at = this.socket(side ? 'cannon_r' : 'cannon_l');
        const angle = Math.atan2((p?.centerY ?? at.y) - at.y, (p?.x ?? at.x - 100) - at.x);
        for (const offset of [-.314, 0, .314]) this.ctx.projectiles.spawn({ x: at.x, y: at.y, vx: Math.cos(angle + offset) * 105, vy: Math.sin(angle + offset) * 105, team: 'enemy', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', rotate: false, lifetime: 4000 });
        this.ctx.events.emit('enemy:shoot', { kind: 'moosezilla', weapon: 'cannon', ...at, angle });
        this.ctx.audio.sfx('boss_cannon');
    }
    private stomp(): void {
        const at = this.socket('stomp'); this.ctx.events.emit('fx:shake', { tier: 3 }); this.ctx.audio.sfx('boss_stomp');
        this.ctx.events.emit('explosion', { ...at, size: 's', team: 'enemy' });
        this.ctx.events.emit('fx:emit', { effect: 'shockwave', ...at, team: 'enemy' });
        // Low, bright ground projectile: jumping clears its 8px radius.
        this.ctx.projectiles.spawn({ x: at.x, y: this.y - 5, vx: this.direction * 90, vy: 0, team: 'enemy', damage: 1, texture: 'turret_bullet', anim: 'turret_bullet_fly', rotate: false, scale: 1.5, radius: 5, lifetime: 4000, collideTiles: false });
    }
    private flame(): void {
        const at = this.socket('mouth'); const a = (this.facing === 1 ? 0 : Math.PI) + (-.26 + .7 * Math.min(1, (this.elapsed - 400) / 900));
        this.ctx.projectiles.spawn({ x: at.x, y: at.y, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125, team: 'enemy', kind: 'flame', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', scale: 2, tint: 0xffae22, rotate: false, lifetime: 700, radius: 5 });
    }
    private updateDebris(dt: number): void {
        for (const d of this.debris) {
            d.age += dt; const s = d.sprite; if (!s.active) continue;
            d.vy += 500 * dt / 1000; s.x += d.vx * dt / 1000; if (d.head) s.x = Phaser.Math.Clamp(s.x, this.arena0 + 45, this.arena1 - 45); s.y += d.vy * dt / 1000; s.rotation += d.spin * dt / 1000;
            if (d.head && s.y >= this.y - 20) { s.y = this.y - 20; d.vy *= -.28; d.vx *= .6; d.spin = 0; s.rotation = Math.sin(d.age / 70) * .12 * Math.exp(-d.age / 1800); }
            if (d.head) for (let i = 0; i < this.headAntlers.length; i++) this.headAntlers[i].setPosition(s.x + (i ? 10 : 1) * this.facing, s.y - 16).setRotation(s.rotation + Math.sin(d.age / 65) * .1 * Math.exp(-d.age / 2000));
            if (!d.head && d.age > 1800) s.setVisible(false);
        }
    }
    private updateBoss(dt: number): void {
        if (!dt || !this.active) return;
        this.updateDebris(dt); this.flash -= dt;
        if (this.flash <= 0) for (const s of this.parts.values()) s.clearTint();
        if (this.state === 'defeated') return;
        if (this.state !== 'death' && (!visible(this.ctx, this.x, this.y, 32) || !this.ctx.player()?.alive())) return;
        this.clock -= dt; this.elapsed += dt; this.tickDamage -= dt;
        if (this.state === 'death') {
            while (this.fired < 17 && this.elapsed >= this.fired * 180) { const part = this.rig.parts[this.fired % this.rig.parts.length]; this.ctx.events.emit('explosion', { x: this.x + part.attach[0] * this.facing, y: this.y + part.attach[1], size: this.fired % 4 === 0 ? 'xl' : 'm', team: 'enemy' }); this.fired++; }
            if (this.clock <= 0) { this.state = 'defeated'; for (const s of this.parts.values()) s.setVisible(false); this.ctx.events.emit('enemy:killed', { x: this.x, y: this.y, kind: 'moosezilla', score: ENEMIES.boss.score, cause: 'explosion' }); this.ctx.events.emit('boss:defeated', this.info()); this.ctx.camera.unlock(); }
            return;
        }
        if (this.state === 'cannon') { if (this.elapsed >= 320 && this.fired === 0) { this.volley(0); this.fired++; } if (this.elapsed >= 570 && this.fired === 1) { this.volley(1); this.fired++; } }
        if (this.state === 'stomp' && this.elapsed >= 360 && !this.fired) { this.stomp(); this.fired++; }
        if (this.state === 'flame' && this.elapsed >= 400 && this.tickDamage <= 0) { this.flame(); this.tickDamage = 150; }
        if (this.state === 'flies' && this.elapsed >= 500 + this.fired * 450 && this.fired < 3) { if (this.flies.size < 3) { const at = this.socket('steam'); const fly = this.ctx.spawn('enemy', 'drone', { facing: this.facing, patrol: 64 }, at.x, at.y); if (fly instanceof Phaser.GameObjects.GameObject) { this.flies.add(fly); fly.once('destroy', () => this.flies.delete(fly)); } } this.fired++; }
        if (this.state === 'charge' && this.elapsed >= 500) {
            if (!this.fired) { this.pose('legs_front', 'walk', true); this.pose('legs_back', 'walk', true); this.fired++; }
            this.x = Phaser.Math.Clamp(this.x + this.direction * 130 * dt / 1000, this.arena0 + 80, this.arena1 - 80);
            if (this.tickDamage <= 0) { this.ctx.damage.applyRadial(this.x, this.y - 10, 28, 1, 'enemy', 'contact'); this.tickDamage = 160; }
        }
        if (this.state === 'recover' && this.phase === 1) {
            const nx = this.x + this.walkDirection * 18 * dt / 1000;
            if (nx <= this.arena0 + 90 || nx >= this.arena1 - 90) this.walkDirection *= -1;
            this.x = Phaser.Math.Clamp(nx, this.arena0 + 90, this.arena1 - 90);
        }
        if (this.clock > 0) return;
        if (this.state !== 'recover' && this.state !== 'roar') { this.enter('recover', 700); if (this.phase === 1) { this.pose('legs_front', 'walk', true); this.pose('legs_back', 'walk', true); } this.steam(); this.pose('head', 'idle', true); return; }
        const p = this.ctx.player()!; this.direction = p.x < this.x ? -1 : 1;
        let attack = this.phase === 1 ? (this.cycle++ % 3 === 2 ? 'stomp' : 'cannon') : this.phase === 2 ? ['flame', 'flies', 'stomp'][this.cycle++ % 3] : this.cycle++ % 2 === 0 ? 'charge' : 'flame';
        if (attack === 'flies' && this.flies.size > 0) attack = 'stomp';
        if (attack === 'cannon') { this.enter('cannon', 1300); this.pose('antler_l', 'fire'); this.pose('antler_r', 'fire'); }
        if (attack === 'stomp') { this.enter('stomp', 850); this.pose('legs_front', 'stomp'); this.pose('legs_back', 'stomp'); }
        if (attack === 'flame') { this.enter('flame', 1300); this.pose('head', 'flame'); this.pose('jaw', 'open'); this.ctx.audio.sfx('boss_flame'); }
        if (attack === 'flies') { this.enter('flies', 1500); this.pose('body', 'vent'); this.steam(); }
        if (attack === 'charge') { this.enter('charge', 1700); this.pose('legs_front', 'paw'); this.pose('legs_back', 'paw'); this.ctx.events.emit('ui:popup', { x: this.x, y: this.y - 120, text: '!!', color: 0xffe478 }); }
    }
    snapshot(): unknown { return { hp: this.hp, phase: this.phase, state: this.state, x: this.x, y: this.y, antlers: this.antlers }; }
}
