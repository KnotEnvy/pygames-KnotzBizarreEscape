import Phaser from 'phaser';
import { BossDebris } from './BossDebris';
import { BossFlash } from './BossFlash';
import { DEPTH, type GameContext, type HitInfo, type Hurtbox } from '../../core';
import { ENEMIES } from '../../config/tuning/enemies';
import { animate, visible } from '../enemies/Enemy';

type RigPart = { id: string; key: string; sourceSize: [number, number]; pivot: [number, number]; attach: [number, number]; z: number; idleTag: string };
type Socket = { part?: string; point?: [number, number]; rootPoint?: [number, number] };
type Rig = { parts: RigPart[]; sockets: Record<string, Socket> };
type FlyingPart = { sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; spin: number; head: boolean; age: number };

export class Moosezilla extends Phaser.GameObjects.Container {
    hp: number = ENEMIES.boss.hp;
    phase = 1;
    state = 'intro';
    private clock = 1100;
    private introMs = 1100;
    private lifeMs = 0;
    private damageTier = 0;
    private ventMs = 0;
    private readonly heavyDebris: BossDebris;
    private elapsed = 0;
    private cycle = 0;
    private fired = 0;
    private readonly flash = new BossFlash();
    private tickDamage = 0;
    private readonly cue: Phaser.GameObjects.Graphics;
    private readonly boxes: Hurtbox[] = [];
    private areaInfo: HitInfo | null = null;
    private areaFrame = -1;
    private readonly areaParts = new Set<number>();
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
    private readonly offs: Array<() => void> = [];
    constructor(private readonly ctx: GameContext, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y);
        this.heavyDebris = new BossDebris(ctx);
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
        for (const id of ['body', 'head', 'legs_front', 'legs_back', 'antler_l', 'antler_r']) this.pose(id, 'intro');
        this.pose('jaw', 'open');
        this.setScale(this.facing, 1);
        this.cue = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES - .1);
        // Source-space rectangles follow the attached rig pieces, including moving feet.
        // Register core last so it wins a direct query where it overlaps the hull.
        const shapes: Array<[string, number, number, number, number]> = [
            ['body', 6, 27, 102, 31], ['body', 12, 7, 42, 22],
            ['head', 16, 7, 27, 25], ['head', 28, 22, 33, 25],
            ['legs_back', 12, 7, 18, 38], ['legs_back', 69, 7, 18, 38],
            ['legs_front', 12, 7, 18, 40], ['legs_front', 69, 7, 18, 40],
            ['antler_l', 59, 29, 17, 16], ['antler_l', 10, 12, 57, 17],
            ['antler_r', 59, 29, 17, 16], ['antler_r', 10, 12, 57, 17],
            ['core', 5, 5, 22, 22]
        ];
        for (const [id, sx, sy, w, h] of shapes) {
            const r = new Phaser.Geom.Rectangle();
            const part = this.rig.parts.find(p => p.id === id)!;
            const shape = this.boxes.length;
            const box: Hurtbox = { team: 'enemy', material: 'metal', kind: 'moosezilla', owner: this,
                body: () => {
                    const sprite = this.parts.get(id);
                    const lx = (sprite?.x ?? part.attach[0]) + sx - part.pivot[0];
                    return r.setTo(this.x + (this.facing > 0 ? lx : -lx - w), this.y + (sprite?.y ?? part.attach[1]) + sy - part.pivot[1], w, h);
                },
                alive: () => this.active && this.hp > 0 && this.parts.has(id) && (id !== 'core' || this.phase === 3) && (!id.startsWith('antler') || sy > 28 || this.antlers[id] > 0),
                hit: info => this.hit(info, id, shape)
            };
            this.boxes.push(box); this.offs.push(ctx.damage.register(box));
        }
        this.offs.push(ctx.onUpdate((dt, rawDt) => { this.flash.update(rawDt); this.updateBoss(dt); }));
        this.once('destroy', () => this.flash.clear());
        this.once('destroy', () => { this.heavyDebris.destroy(); for (const off of this.offs) off(); for (const d of this.debris) d.sprite.destroy(); for (const s of this.headAntlers) s.destroy(); this.cue.destroy(); });
        ctx.events.emit('boss:spawn', this.info()); ctx.audio.sfx('boss_roar');
        ctx.events.emit('fx:emit', { effect: 'debris', x, y: y - 12, material: 'stone', count: 12 });
        this.steam();
        this.offs.push(ctx.events.on('boss:intro', e => {
            if (e.name.toUpperCase() === 'MOOSEZILLA' && this.lifeMs < 1100) this.introMs = Math.max(this.introMs, 1100);
        }));
    }
    private info(): { name: string; hp: number; maxHp: number; phase: number; x: number; y: number } { return { name: 'MOOSEZILLA', hp: this.hp, maxHp: ENEMIES.boss.hp, phase: this.phase, x: this.x, y: this.y }; }
    private pose(id: string, tag: string, loop = false): void { if (id.startsWith('antler') && this.antlers[id] <= 0 && tag !== 'broken') return; if (id.startsWith('antler') && this.damageTier && this.phase === 1 && (tag === 'idle' || tag === 'fire')) tag = tag === 'idle' ? 'damaged' : 'fire_damaged'; const s = this.parts.get(id); if (s) animate(s, `${s.texture.key}_${tag}`, loop); }
    private socket(key: string): { x: number; y: number } {
        const s = this.rig.sockets[key];
        if (s.rootPoint) return { x: this.x + s.rootPoint[0] * this.facing, y: this.y + s.rootPoint[1] };
        const p = this.rig.parts.find(p => p.id === s.part)!;
        return { x: this.x + (p.attach[0] + s.point![0] - p.pivot[0]) * this.facing, y: this.y + p.attach[1] + s.point![1] - p.pivot[1] };
    }
    private detach(id: string): void {
        const s = this.parts.get(id); if (!s?.visible) return;
        this.remove(s); s.clearTint().setPosition(this.x + s.x * this.facing, this.y + s.y).setScale(this.facing, 1).setDepth(DEPTH.ENEMIES + .5); s.stop();
        this.debris.push({ sprite: s, vx: this.ctx.rng.range(-90, 90), vy: this.ctx.rng.range(-220, -130), spin: this.ctx.rng.range(-3, 3), head: id === 'head', age: 0 });
        this.parts.delete(id);
    }
    private hit(h: HitInfo, part: string, shape: number): boolean {
        if (this.hp <= 0) return false;
        // Projectile memory covers the entire assembly, so piercing shots hit the pool once.
        // Radial queries share one HitInfo and visit multiple parts synchronously.
        if (h.kind === 'explosion' || h.kind === 'melee') {
            const frame = this.ctx.scene.game.loop.frame;
            const sameSwing = h.kind === 'melee' && this.areaInfo?.kind === 'melee' && this.areaInfo.x === h.x && this.areaInfo.y === h.y && this.areaInfo.weapon === h.weapon && this.areaInfo.damage === h.damage;
            if (this.areaFrame !== frame || (this.areaInfo !== h && !sameSwing) || this.areaParts.has(shape)) {
                this.areaFrame = frame; this.areaInfo = h; this.areaParts.clear();
            } else if (this.areaParts.size) { this.areaParts.add(shape); return false; }
            this.areaParts.add(shape);
        }
        this.ctx.projectiles.forEach(p => {
            if (p.team === h.source && Math.abs(p.x - h.x) < .01 && Math.abs(p.y - h.y) < .01)
                for (const box of this.boxes) if (!p.hitList.includes(box)) p.remember(box);
        });
        let multiplier = part === 'core' && this.phase === 3 ? 2 : 1;
        if (this.phase === 3) { const c = this.socket('core'); if (Math.hypot(h.x - c.x, h.y - c.y) <= 15) multiplier = 2; }
        if (part.startsWith('antler') && this.phase === 1 && this.antlers[part] > 0) {
            this.antlers[part] -= h.damage;
            if (this.antlers[part] <= 0) {
                this.pose(part, 'broken');
                this.ctx.events.emit('enemy:killed', { x: h.x, y: h.y, kind: 'moosezilla_antler', score: ENEMIES.boss.antlerScore, cause: h.kind });
                this.ctx.events.emit('explosion', { x: h.x, y: h.y, size: 'm', team: 'enemy' });
            }
        }
        this.setHp(this.hp - h.damage * multiplier);
        return true;
    }
    /** Deterministic QA phase/damage control; exposed only through the enemytest hook. */
    setHp(value: number): void {
        if (this.hp <= 0) return;
        const flashingParts = [...this.parts.values()];
        this.hp = Phaser.Math.Clamp(value, 0, ENEMIES.boss.hp);
        this.ctx.events.emit('boss:hp', this.info());
        const tier = this.hp <= ENEMIES.boss.hp / 3 ? 2 : this.hp <= ENEMIES.boss.hp * 2 / 3 ? 1 : 0;
        if (tier > this.damageTier && this.hp > 0) {
            this.heavyDebris.burst(this.x - 16 * this.facing, this.y - 70, this.y, 4, tier === 1);
            this.ctx.events.emit('fx:emit', { effect: 'shield_spark', ...this.socket('core'), count: 8 });
        }
        if (tier !== this.damageTier) this.pose('armor', tier === 2 ? 'critical' : tier === 1 ? 'damaged' : 'intact', true);
        this.damageTier = tier;
        // Emit every crossed threshold, including a single large lethal hit.
        while (this.phase < 3 && this.hp <= (this.phase === 1 ? 240 : 100)) {
            this.phase++; this.ctx.events.emit('boss:phase', this.info());
            this.enter('roar', 700); this.cycle = 0; this.pose('head', 'roar'); this.ctx.audio.sfx('boss_roar');
            if (this.phase === 2) { this.detach('antler_l'); this.detach('antler_r'); this.pose('body', 'damaged', true); }
            else { this.detach('armor'); this.parts.get('core')?.setDepth(9); this.bringToTop(this.parts.get('core')!); this.pose('body', 'critical', true); for (const fly of this.flies) fly.destroy(); }
        }
        if (this.hp <= 0) {
            this.heavyDebris.burst(this.x, this.y - 75, this.y, 14, true);
            this.enter('death', ENEMIES.boss.deathMs); this.ctx.projectiles.clear('enemy');
            for (const fly of this.flies) fly.destroy();
            this.ctx.events.emit('fx:slowmo', { scale: .45, ms: 1000 }); this.ctx.events.emit('fx:flash', { color: 0xffffff, ms: 100 }); this.ctx.events.emit('fx:shake', { tier: 4 }); this.ctx.events.emit('fx:hitstop', { ms: 150 });
            this.ctx.audio.sfx('boss_death'); this.detach('armor'); this.detach('jaw'); this.detach('head'); this.detach('antler_l'); this.detach('antler_r');
            for (const key of ['moosezilla_antler_l', 'moosezilla_antler_r']) {
                const part = this.rig.parts.find(p => p.key === key)!;
                const s = this.ctx.scene.add.sprite(this.x, this.y, key).setOrigin(part.pivot[0] / part.sourceSize[0], part.pivot[1] / part.sourceSize[1]).setScale(this.facing, 1).setDepth(DEPTH.ENEMIES + .6);
                animate(s, `${key}_broken`); this.headAntlers.push(s);
            }
            flashingParts.push(...this.headAntlers);
        }
        this.flash.start(flashingParts, this.hp <= 0);
    }
    private enter(state: string, ms: number): void { this.state = state; this.clock = ms; this.elapsed = 0; this.fired = 0; }
    private steam(): void {
        const at = this.socket('steam');
        this.ctx.events.emit('fx:emit', { effect: 'vent_steam', x: at.x, y: at.y });
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
        const at = this.socket('stomp'); this.ctx.events.emit('boss:stomp', { ...at, power: this.phase === 3 ? 2 : 1 }); this.ctx.events.emit('fx:shake', { tier: 3 }); this.ctx.audio.sfx('boss_stomp');
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
        this.updateDebris(dt); this.heavyDebris.update(dt);
        if (this.state === 'defeated') return;
        if (this.state !== 'death' && (!visible(this.ctx, this.x, this.y, 32) || !this.ctx.player()?.alive())) return;
        this.lifeMs += dt; this.introMs = Math.max(0, this.introMs - dt);
        if (this.hp > 0) {
            this.ventMs -= dt;
            if (this.ventMs <= 0) {
                this.ventMs = this.damageTier ? 650 : 1000; this.steam();
                if (this.damageTier) {
                    const at = this.socket('core');
                    this.ctx.events.emit('fx:emit', { effect: 'smoke_stack', x: at.x + 24 * this.facing, y: at.y - 8, scale: .7 });
                    this.ctx.events.emit('fx:emit', { effect: 'shield_spark', ...at, count: this.damageTier + 1 });
                }
            }
            if (this.lifeMs >= 1100) {
                const body = this.parts.get('body');
                const tag = this.damageTier === 2 ? 'critical' : this.damageTier === 1 ? 'damaged' : 'idle';
                if (this.state !== 'flies' && body?.anims.currentAnim?.key !== `moosezilla_body_${tag}`) this.pose('body', tag, true);
            }
        }
        this.drawCue();
        this.clock -= dt; this.elapsed += dt; this.tickDamage -= dt;
        if (this.state === 'death') {
            while (this.fired < 17 && this.elapsed >= this.fired * 180) { const part = this.rig.parts[this.fired % this.rig.parts.length]; this.ctx.events.emit('explosion', { x: this.x + part.attach[0] * this.facing, y: this.y + part.attach[1], size: this.fired % 4 === 0 ? 'xl' : 'm', team: 'enemy' }); this.fired++; }
            if (this.clock <= 0) { this.state = 'defeated'; for (const s of this.parts.values()) s.setVisible(false); this.ctx.events.emit('enemy:killed', { x: this.x, y: this.y, kind: 'moosezilla', score: ENEMIES.boss.score, cause: 'explosion' }); this.ctx.events.emit('boss:defeated', this.info()); this.ctx.camera.unlock(); }
            return;
        }
        if (this.state === 'cannon') { if (this.elapsed >= 250 && this.elapsed - dt < 250) { this.pose('antler_r', 'fire'); if (this.antlers.antler_r > 0) this.ctx.events.emit('fx:emit', { effect: 'boss_cannon_charge', ...this.socket('cannon_r'), angle: this.facing > 0 ? 0 : Math.PI }); } if (this.elapsed >= 320 && this.fired === 0) { this.volley(0); this.fired++; } if (this.elapsed >= 570 && this.fired === 1) { this.volley(1); this.fired++; } }
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
        if (this.introMs > 0 || this.clock > 0) return;
        if (this.state !== 'recover' && this.state !== 'roar' && this.state !== 'intro') { this.enter('recover', 700); if (this.phase === 1) { this.pose('legs_front', 'walk', true); this.pose('legs_back', 'walk', true); } this.steam(); this.pose('head', 'idle', true); this.pose('jaw', 'closed'); this.pose('antler_l', 'idle', true); this.pose('antler_r', 'idle', true); return; }
        if (this.state === 'intro') {
            for (const id of ['legs_front', 'legs_back']) this.pose(id, 'idle', true);
            for (const id of ['antler_l', 'antler_r']) this.pose(id, this.damageTier ? 'damaged' : 'idle', true);
            this.pose('jaw', 'closed');
        }
        const p = this.ctx.player()!; this.direction = p.x < this.x ? -1 : 1;
        let attack = this.phase === 1 ? (this.cycle++ % 3 === 2 ? 'stomp' : 'cannon') : this.phase === 2 ? ['flame', 'flies', 'stomp'][this.cycle++ % 3] : ['charge', 'flame', 'stomp'][this.cycle++ % 3];
        if (attack === 'flies' && this.flies.size > 0) attack = 'stomp';
        if (attack === 'cannon') { this.enter('cannon', 1300); this.pose('head', 'jaw'); this.ctx.audio.sfx('turret_windup'); this.pose('antler_l', 'fire'); this.pose('antler_r', 'idle'); if (this.antlers.antler_l > 0) this.ctx.events.emit('fx:emit', { effect: 'boss_cannon_charge', ...this.socket('cannon_l'), angle: this.facing > 0 ? 0 : Math.PI }); }
        if (attack === 'stomp') { this.enter('stomp', 850); this.pose('legs_front', 'stomp'); this.pose('legs_back', 'stomp'); }
        if (attack === 'flame') { this.enter('flame', 1300); this.pose('head', 'flame'); this.pose('jaw', 'open'); this.ctx.audio.sfx('flame_start'); this.ctx.events.emit('fx:emit', { effect: 'boss_flame_reach', ...this.socket('mouth'), angle: this.facing > 0 ? 0 : Math.PI, scale: 88 / 84 }); }
        if (attack === 'flies') { this.enter('flies', 1500); this.pose('body', 'vent'); this.steam(); }
        if (attack === 'charge') { this.enter('charge', 1700); this.pose('head', 'roar'); this.ctx.audio.sfx('boss_charge'); this.ctx.events.emit('fx:emit', { effect: 'boss_charge_lane', x: this.x + this.direction * 55, y: this.y, angle: this.direction > 0 ? 0 : Math.PI }); this.pose('legs_front', 'paw'); this.pose('legs_back', 'paw'); this.ctx.events.emit('ui:popup', { x: this.x, y: this.y - 120, text: '!!', color: 0xffe478 }); }
    }
    private drawCue(): void {
        const g = this.cue; g.clear();
        const anticipating = (this.state === 'cannon' && this.elapsed < 570) || (this.state === 'flame' && this.elapsed < 400) || (this.state === 'charge' && this.elapsed < 500) || (this.state === 'stomp' && this.elapsed < 360);
        if (!anticipating || this.hp <= 0) return;
        const color = this.state === 'charge' ? 0xf07a5a : this.state === 'flame' ? 0xffae22 : 0xffe478;
        let x = this.x - 12, width = 24;
        if (this.state === 'charge') { x = this.arena0 + 8; width = this.arena1 - this.arena0 - 16; }
        if (this.state === 'flame') { const mouth = this.socket('mouth'); x = this.facing < 0 ? mouth.x - 88 : mouth.x; width = 88; }
        if (this.state === 'cannon') { x = (this.ctx.player()?.x ?? this.x) - 12; width = 24; }
        if (this.state === 'stomp') x = this.socket('stomp').x - 12;
        g.fillStyle(0x1a1220, .95).fillRect(x - 1, this.y - 4, width + 2, 5);
        g.fillStyle(color, .8);
        for (let at = x; at < x + width; at += 8) g.fillRect(at, this.y - 3, Math.min(5, x + width - at), 2);
        if (this.state === 'cannon') {
            g.lineStyle(1, color).strokeRect(x, this.y - 10, width, 7);
            g.fillRect(x + width / 2 - 1, this.y - 14, 2, 5);
        }
        if (this.state === 'charge') for (let at = x + 10; at < x + width; at += 26) {
            g.lineStyle(1, color).beginPath().moveTo(at - this.direction * 3, this.y - 10).lineTo(at + this.direction * 3, this.y - 7).lineTo(at - this.direction * 3, this.y - 4).strokePath();
        }
    }
    snapshot(): unknown { return { hp: this.hp, phase: this.phase, damageTier: this.damageTier, introMs: this.introMs, elapsed: this.elapsed, state: this.state, x: this.x, y: this.y, antlers: this.antlers, hurtboxes: this.boxes.filter(b => b.alive()).map(b => { const r = typeof b.body === 'function' ? b.body() : b.body; return { x: r.x, y: r.y, width: r.width, height: r.height }; }) }; }
}
