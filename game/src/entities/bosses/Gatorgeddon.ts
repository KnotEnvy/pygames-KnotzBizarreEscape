import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo, type Hurtbox, type RegisterContext } from '../../core';
import { GATORGEDDON as T } from '../../config/tuning/gatorgeddon';
import { BossDebris } from './BossDebris';
import { BossFlash } from './BossFlash';
import { animate } from '../enemies/Enemy';

/** Shared registerEnemies boss/debug contract. */
export interface TrackedBoss extends Phaser.GameObjects.GameObject {
    phase: number;
    snapshot(): unknown;
    setHp(value: number): void;
}

type PartId = 'legs_back' | 'tail' | 'body' | 'legs_front' | 'head' | 'jaw' | 'pod';
type Joint = { id: PartId; w: number; h: number; px: number; py: number; x: number; y: number };
/** Authoritative rig, in right-facing source pixels. Root is on the pier. */
const RIG: readonly Joint[] = [
    { id: 'legs_back', w: 112, h: 40, px: 56, py: 40, x: -4, y: -3 },
    { id: 'tail', w: 88, h: 40, px: 80, py: 22, x: -50, y: -32 },
    { id: 'body', w: 112, h: 64, px: 56, py: 60, x: -12, y: -14 },
    { id: 'legs_front', w: 112, h: 40, px: 56, py: 40, x: -10, y: 0 },
    { id: 'head', w: 88, h: 48, px: 12, py: 24, x: 36, y: -34 },
    { id: 'jaw', w: 88, h: 24, px: 8, py: 6, x: 40, y: -22 },
    { id: 'pod', w: 40, h: 48, px: 20, py: 28, x: -8, y: -68 },
];
type Rocket = { sprite: Phaser.GameObjects.Sprite; active: boolean; age: number; x0: number; y0: number; x1: number; y1: number };
type Scrap = { sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; age: number };

/** Multipart boss with a channel behind the pier, independent pod and deterministic attack clocks. */
export class Gatorgeddon extends Phaser.GameObjects.Container implements TrackedBoss {
    hp: number = T.hp;
    phase = 1;
    state = 'intro';
    private elapsed = 0;
    private duration: number = T.introMs;
    private lifeMs = 0;
    private cycle = 0;
    private fired = 0;
    private damageTier = 0;
    private swappingLegTier = false;
    private podHp: number = T.podHp;
    private direction: 1 | -1 = -1;
    private targetX = 0;
    private fromX = 0;
    private toX = 0;
    private ambushes = 0;
    private contactMs = 0;
    private ventMs = 0;
    private defeated = false;
    private readonly floor: number;
    private readonly waterY: number;
    private readonly arena0: number;
    private readonly arena1: number;
    private readonly parts = new Map<PartId, Phaser.GameObjects.Sprite>();
    private readonly boxes: Hurtbox[] = [];
    private readonly offs: Array<() => void> = [];
    private readonly marks: number[] = [];
    private readonly rootLimits: [number, number] = [0, 0];
    private readonly rockets: Rocket[] = [];
    private readonly scraps: Scrap[] = [];
    private readonly cue: Phaser.GameObjects.Graphics;
    private readonly wake: Phaser.GameObjects.Graphics;
    private readonly flash = new BossFlash();
    private readonly debris: BossDebris;
    private areaInfo: HitInfo | null = null;
    private areaFrame = -1;
    private readonly areaParts = new Set<number>();
    constructor(private readonly ctx: GameContext, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y);
        this.floor = y; this.waterY = y - 8;
        this.arena0 = Number(props.arenaX0 ?? ctx.camera.leftEdge());
        this.arena1 = Number(props.arenaX1 ?? this.arena0 + 512);
        this.direction = props.facing === 'right' || props.facing === 1 ? 1 : -1;
        ctx.scene.add.existing(this); this.setDepth(DEPTH.TILES_BACK + .5);
        ctx.camera.lock(this.arena0, this.arena1);
        this.clampRoot(); this.setScale(this.direction, 1);
        this.debris = new BossDebris(ctx);
        for (const p of RIG) {
            const s = ctx.scene.add.sprite(p.x, p.y, `gatorgeddon_${p.id}`).setOrigin(p.px / p.w, p.py / p.h);
            this.parts.set(p.id, s); this.add(s); this.pose(p.id, 'idle');
            if (p.id === 'legs_front' || p.id === 'legs_back') {
                const plant = () => this.footfall(p.id, s);
                s.on('animationstart', plant); s.on('animationupdate', plant);
            }
        }
        this.cue = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES + 1);
        this.wake = ctx.scene.add.graphics().setDepth(DEPTH.TILES_BACK + 1.2);
        // Four reusable local rockets: no timer, tween, sprite or collider churn per volley.
        for (let i = 0; i < 4; i++) {
            const sprite = ctx.scene.add.sprite(0, 0, 'gatorgeddon_rocket').setDepth(DEPTH.PROJECTILES).setVisible(false);
            animate(sprite, 'gatorgeddon_rocket_fly', true);
            this.rockets.push({ sprite, active: false, age: 0, x0: 0, y0: 0, x1: 0, y1: 0 });
        }
        this.box(-61, -53, 102, 41, 'body');
        this.box(-54, -27, 22, 27, 'legs_front'); this.box(16, -27, 25, 27, 'legs_front');
        this.box(26, -49, 85, 38, 'head');
        this.box(-7, -50, 34, 23, 'reactor');
        this.box(-25, -92, 32, 23, 'pod');
        this.offs.push(ctx.onUpdate((dt, rawDt) => { this.flash.update(rawDt); this.tick(dt); }));
        this.once('destroy', () => {
            this.flash.clear(); this.debris.destroy(); this.cue.destroy(); this.wake.destroy();
            for (const off of this.offs) off();
            for (const r of this.rockets) r.sprite.destroy();
            for (const s of this.scraps) s.sprite.destroy();
        });
        this.underwater(true); this.pose('head', 'cue');
        ctx.events.emit('boss:spawn', this.info());
        this.offs.push(ctx.events.on('boss:intro', e => {
            if (e.name === 'GATORGEDDON' && this.lifeMs < T.spawnGraceMs) this.duration = Math.max(this.duration, this.elapsed + T.spawnGraceMs);
        }));
    }
    private info() { return { name: 'GATORGEDDON', hp: this.hp, maxHp: T.hp, phase: this.phase, x: this.x, y: this.floor }; }
    private pose(id: PartId, tag: string): void {
        const s = this.parts.get(id); if (!s || !s.active) return;
        const leg = id === 'legs_front' || id === 'legs_back';
        const suffix = leg && tag !== 'death' ? this.damageTier === 2 ? '_critical' : this.damageTier === 1 ? '_damaged' : '' : '';
        const key = `gatorgeddon_${id}_${tag}${suffix}`;
        if (s.anims.currentAnim?.key === key) return;
        // A damage repaint is not a new step, even though the animation restarts.
        this.swappingLegTier = leg && tag === 'walk' && !!s.anims.currentAnim?.key.includes('_walk');
        try { animate(s, key, !leg || (tag === 'idle' || tag === 'walk')); }
        finally { this.swappingLegTier = false; }
    }
    /** The animation's contact frames own cosmetic plants; no collision or attack clock changes. */
    private footfall(id: PartId, sprite: Phaser.GameObjects.Sprite): void {
        if (this.swappingLegTier || this.hp <= 0 || !sprite.visible || this.isUnder() || Math.abs(this.y - this.floor) > 2) return;
        if (!sprite.anims.currentAnim?.key.includes('_walk')) return;
        const frame = sprite.anims.currentFrame?.index;
        if (frame !== 1 && frame !== 5) return;
        const far = id === 'legs_back';
        const j = (frame === 1 ? 0 : 1) ^ (far ? 1 : 0);
        this.plant(id, j, .55);
    }
    private plant(id: PartId, foot: number, scale: number): void {
        // Walk contact is stride -4; match the art's toe fan centre, not the old tread.
        const localX = (id === 'legs_back' ? -4 : -10) - 56 + 25 + foot * 63 - 8;
        this.ctx.events.emit('fx:emit', { effect: 'dust_land', x: this.x + localX * this.direction, y: this.floor, scale, material: 'wood' });
    }
    private plantAll(scale: number): void {
        for (const id of ['legs_back', 'legs_front'] as const) {
            this.plant(id, 0, scale); this.plant(id, 1, scale);
        }
    }
    private isUnder(): boolean {
        return (this.state === 'roll' && this.elapsed >= T.rollCue) || this.state === 'wake' || this.state === 'ambush_cue' || (this.state === 'dive' && this.elapsed >= 300) || (this.state === 'intro' && this.elapsed < 650);
    }
    private box(x: number, y: number, w: number, h: number, part: string): void {
        const rect = new Phaser.Geom.Rectangle(), shape = this.boxes.length;
        const box: Hurtbox = { team: 'enemy', material: 'metal', kind: 'gatorgeddon', owner: this,
            body: () => rect.setTo(this.x + (this.direction > 0 ? x : -x - w), this.y + y, w, h),
            alive: () => this.active && this.hp > 0 && !this.isUnder() && this.state !== 'climb' && (this.state !== 'intro' || this.elapsed >= 1100) && (part !== 'pod' || this.podHp > 0) && (part !== 'reactor' || this.phase === 3),
            hit: info => this.hit(info, part, shape) };
        this.boxes.push(box); this.offs.push(this.ctx.damage.register(box));
    }
    private hit(h: HitInfo, part: string, shape: number): boolean {
        if (this.hp <= 0 || this.isUnder()) return false;
        if (h.kind === 'explosion' || h.kind === 'melee') {
            const frame = this.ctx.scene.game.loop.frame;
            const sameSwing = h.kind === 'melee' && this.areaInfo?.kind === 'melee' && this.areaInfo.x === h.x && this.areaInfo.y === h.y && this.areaInfo.weapon === h.weapon && this.areaInfo.damage === h.damage;
            if (frame !== this.areaFrame || (h !== this.areaInfo && !sameSwing) || this.areaParts.has(shape)) {
                this.areaFrame = frame; this.areaInfo = h; this.areaParts.clear();
            } else if (this.areaParts.size) { this.areaParts.add(shape); return false; }
            this.areaParts.add(shape);
        }
        // A penetrating round hits this shared pool once, even across overlapping pieces.
        this.ctx.projectiles.forEach(p => {
            if (p.team === h.source && Math.abs(p.x - h.x) < .01 && Math.abs(p.y - h.y) < .01)
                for (const b of this.boxes) if (!p.hitList.includes(b)) p.remember(b);
        });
        if (part === 'pod') {
            this.podHp = Math.max(0, this.podHp - h.damage);
            if (!this.podHp) {
                this.pose('pod', 'broken'); this.boom(this.x - 8 * this.direction, this.y - 80, 'm');
                this.debris.burst(this.x, this.y - 80, this.floor, 4);
                if (this.state === 'missiles') this.enter('recover', T.recoveryMs);
            }
            this.flash.start(this.parts.values()); return true;
        }
        const localX = (h.x - this.x) * this.direction;
        const reactor = this.phase === 3 && localX >= -7 && localX <= 27 && h.y >= this.y - 50 && h.y <= this.y - 27;
        this.setHp(this.hp - h.damage * (reactor || part === 'reactor' ? 2 : part === 'head' ? 1.5 : 1));
        return true;
    }
    setHp(value: number): void {
        if (this.hp <= 0 || !Number.isFinite(value)) return;
        this.hp = Phaser.Math.Clamp(value, 0, T.hp);
        const tier = this.hp <= T.phase3 ? 2 : this.hp <= T.phase2 ? 1 : 0;
        if (tier > this.damageTier && this.hp > 0) {
            this.debris.burst(this.x, this.y - 55, this.floor, 5);
            this.ctx.events.emit('fx:emit', { effect: 'shield_spark', x: this.x, y: this.y - 50, count: 7 });
        }
        this.damageTier = tier;
        while (this.phase < 3 && this.hp <= (this.phase === 1 ? T.phase2 : T.phase3)) {
            this.phase++; this.cycle = 0;
            this.ctx.events.emit('boss:phase', this.info());
            this.clearOrdnance(); this.underwater(false); this.rotation = 0; const hull = this.parts.get('body'); if (hull) hull.rotation = 0; this.y = this.floor;
            this.enter('roar', 900); this.ctx.audio.sfx('gator_roar');
        }
        this.ctx.events.emit('boss:hp', this.info());
        this.pose('body', tier === 2 ? 'critical' : tier === 1 ? 'damaged' : 'idle');
        for (const id of ['legs_back', 'legs_front'] as const) {
            const key = this.parts.get(id)?.anims.currentAnim?.key ?? '';
            this.pose(id, !this.hp ? 'death' : key.includes('_walk') ? 'walk' : key.includes('_stomp') ? 'stomp' : key.includes('_crouch') ? 'crouch' : 'idle');
        }
        if (!this.hp) {
            this.enter('death', T.deathMs); this.y = this.floor; this.rotation = 0; const hull = this.parts.get('body'); if (hull) hull.rotation = 0; this.underwater(false);
            this.clearOrdnance(); this.ctx.projectiles.clear('enemy');
            this.debris.burst(this.x, this.floor - 52, this.floor, 14);
            this.ctx.audio.sfx('gator_death');
            this.ctx.events.emit('fx:slowmo', { scale: .4, ms: 1100 });
            this.ctx.events.emit('fx:hitstop', { ms: 120 });
            this.ctx.events.emit('fx:flash', { color: 0xffe066, ms: 100 });
            this.ctx.events.emit('fx:shake', { tier: 4 });
            this.detachJaw(); this.plantAll(.9);
        }
        if (!this.hp) this.flash.start([...this.parts.values(), ...this.scraps.map(s => s.sprite)], true);
        else this.flash.start(this.parts.values());
    }
    private detachJaw(): void {
        const s = this.parts.get('jaw'); if (!s) return;
        this.remove(s); this.parts.delete('jaw'); s.clearTint().stop();
        s.setPosition(this.x + s.x * this.direction, this.y + s.y).setScale(this.direction, 1).setDepth(DEPTH.ENEMIES + .6);
        this.scraps.push({ sprite: s, vx: this.direction * 65, vy: -145, age: 0 });
    }
    private clearOrdnance(): void {
        this.marks.length = 0; this.cue.clear();
        for (const r of this.rockets) { r.active = false; r.sprite.setVisible(false); }
    }
    private enter(state: string, ms: number): void {
        this.state = state; this.duration = ms; this.elapsed = 0; this.fired = 0; this.contactMs = 0; this.marks.length = 0;
    }
    private underwater(on: boolean): void {
        this.setDepth(on ? DEPTH.TILES_BACK + .5 : DEPTH.ENEMIES);
        for (const [id, s] of this.parts) s.setVisible(!on || id === 'body' || id === 'tail');
        if (!on) this.wake.clear();
    }
    private limits(gap: number = T.wallGap): [number, number] {
        const v = this.ctx.camera.view();
        const left = Math.max(this.arena0, v.left), right = Math.min(this.arena1, v.right);
        const front = this.direction > 0 ? 130 : 112, rear = this.direction > 0 ? 112 : 130;
        const a = Math.max(this.arena0 + front + gap, left + front + T.viewInset);
        const b = Math.min(this.arena1 - rear - gap, right - rear - T.viewInset);
        // During camera easing the view can be narrower than the authored arena. Preserve full art in it.
        this.rootLimits[0] = a > b ? (left + right) / 2 : a;
        this.rootLimits[1] = a > b ? (left + right) / 2 : b;
        return this.rootLimits;
    }
    private clampRoot(): void { const [a, b] = this.limits(T.viewInset); this.x = Phaser.Math.Clamp(this.x, a, b); }
    private target(offset = 0): number {
        const v = this.ctx.camera.view();
        return Phaser.Math.Clamp((this.ctx.player()?.x ?? this.x) + offset, Math.max(this.arena0, v.left) + 48, Math.min(this.arena1, v.right) - 48);
    }
    private attackFloor(x: number): number { return Math.min(this.floor, this.ctx.physics.groundBelow(x, this.floor - 96, 120) ?? this.floor); }
    private splash(kind: 'surface' | 'sink'): void {
        this.ctx.events.emit('water:splash', { x: this.x, y: this.waterY, size: 'xl', kind });
        this.ctx.audio.sfx(kind === 'surface' ? 'gator_surface' : 'gator_submerge');
    }
    private boom(x: number, y: number, size: 's' | 'm' | 'l' | 'xl'): void { this.ctx.events.emit('explosion', { x, y, size, team: 'enemy' }); }
    private attack(): void {
        const playerX = this.ctx.player()?.x ?? this.x - 150;
        const behind = (playerX - this.x) * this.direction < -50;
        let attack = this.phase === 1 ? (this.cycle++ % 2 === 0 || this.podHp <= 0 ? 'lunge' : 'missiles') : this.phase === 2 ? (this.cycle++ % 2 === 0 ? 'dive' : 'gatling') : ['roll', 'slam', 'gas', 'lunge'][this.cycle++ % 4];
        if (behind && this.phase === 1) attack = 'tail';
        if (attack !== 'tail') this.direction = attack === 'slam' ? (playerX < this.x ? 1 : -1) : (playerX < this.x ? -1 : 1);
        this.setScale(this.direction, 1); this.clampRoot(); this.targetX = this.target(); this.fromX = this.x;
        const [a, b] = this.limits();
        this.toX = Phaser.Math.Clamp(this.x + this.direction * T.lungeDistance, a, b);
        const cue = this.phase === 3 ? T.fastLungeCue : T.lungeCue;
        this.enter(attack, attack === 'lunge' ? cue + T.lungeMs : attack === 'missiles' ? 2150 : attack === 'tail' ? 1150 : attack === 'dive' ? T.diveMs : attack === 'gatling' ? 1850 : attack === 'roll' ? 1600 : attack === 'slam' ? 1350 : 1850);
        this.pose('head', 'cue'); this.pose('legs_front', 'crouch'); this.pose('legs_back', 'crouch');
        this.ctx.audio.sfx(attack === 'missiles' ? 'gator_missile' : attack === 'tail' || attack === 'slam' ? 'gator_tail' : attack === 'roll' ? 'gator_roll' : attack === 'gas' ? 'gator_gas' : 'gator_hiss');
        if (attack === 'missiles') {
            for (const dx of [-72, -24, 24, 72]) this.marks.push(this.target(dx));
            this.pose('pod', 'cue');
        }
        if (attack === 'tail' || attack === 'slam') this.pose('tail', 'coil');
        if (attack === 'slam') {
            this.toX = Phaser.Math.Clamp(this.targetX + this.direction * 112, a, b);
            this.targetX = this.toX - this.direction * 112; this.marks.push(this.targetX);
        }
        if (attack === 'gatling') this.ctx.events.emit('ui:prompt', { text: 'DUCK!', ms: 1000 });
        if (attack === 'gas') this.ctx.events.emit('ui:prompt', { text: 'JUMP THE FLAME!', ms: 1100 });
        if (attack === 'dive') { this.ambushes = 0; this.splash('sink'); }
    }
    private recover(): void {
        this.enter('recover', T.recoveryMs); this.underwater(false); this.y = this.floor;
        for (const id of ['head', 'jaw', 'tail', 'legs_front', 'legs_back'] as const) this.pose(id, 'idle');
        this.pose('pod', this.podHp > 0 ? 'idle' : 'broken');
    }
    private beginWake(): void {
        this.enter('wake', T.wakeMs); this.underwater(true); this.y = this.floor + 56;
    }
    private fireRocket(i: number): void {
        const r = this.rockets[i]; r.active = true; r.age = 0;
        r.x0 = this.x - 8 * this.direction; r.y0 = this.floor - 88;
        r.x1 = this.marks[i]; r.y1 = this.attackFloor(r.x1) - 2;
        r.sprite.setPosition(r.x0, r.y0).setVisible(true).setFlipX(this.direction < 0);
        this.ctx.audio.sfx('gator_missile');
    }
    private projectile(x: number, y: number, vx: number, texture = 'enemy_bullet', radius = 2, life = 2500): void {
        const projectile = this.ctx.projectiles.spawn({ x, y, vx, vy: 0, team: 'enemy', damage: 1, texture, anim: `${texture}_fly`, radius, lifetime: life, rotate: false, collideTiles: false });
        if (texture === 'gatorgeddon_wave') projectile?.sprite.setFlipX(vx < 0);
    }
    private damage(x: number, y: number, radius: number): void {
        if (this.contactMs > 0) return;
        this.ctx.damage.applyRadial(x, y, radius, 1, 'enemy', 'contact'); this.contactMs = 180;
    }
    private tick(dt: number): void {
        if (!this.active || !dt) return;
        this.debris.update(dt);
        for (const s of this.scraps) {
            s.age += dt; s.vy += dt * .45; s.sprite.x += s.vx * dt / 1000; s.sprite.y += s.vy * dt / 1000; s.sprite.rotation += dt * .003;
            if (s.sprite.y > this.floor - 4 && s.vy > 0) { s.sprite.y = this.floor - 4; s.vy *= -.25; s.vx *= .6; }
            if (s.age > 2000) s.sprite.setAlpha(Math.max(0, (3000 - s.age) / 1000));
        }
        if (this.defeated || (!this.ctx.player()?.alive() && this.hp > 0)) return;
        this.elapsed += dt; this.lifeMs += dt; this.contactMs -= dt;
        if (this.state === 'death') { this.death(); this.draw(); return; }
        this.clampRoot(); this.idleLife(dt); this.updateRockets(dt);
        const e = this.elapsed, cue = this.phase === 3 ? T.fastLungeCue : T.lungeCue;
        if (this.state === 'intro') {
            this.y = this.floor + 56 * (1 - Phaser.Math.Clamp((e - 650) / 700, 0, 1));
            if (e >= 650 && !this.fired) { this.fired++; this.underwater(false); this.splash('surface'); this.pose('head', 'roar'); this.pose('jaw', 'open'); this.ctx.audio.sfx('gator_roar'); }
            if (e >= this.duration) { this.plantAll(.7); this.recover(); }
        } else if (this.state === 'lunge') {
            if (e >= cue) {
                if (!this.fired) { this.fired++; this.pose('head', 'roar'); this.pose('jaw', 'open'); this.ctx.audio.sfx('gator_snap'); this.pose('legs_front', 'walk'); this.pose('legs_back', 'walk'); }
                const t = Phaser.Math.Clamp((e - cue) / T.lungeMs, 0, 1);
                this.x = Phaser.Math.Linear(this.fromX, this.toX, 1 - (1 - t) ** 2);
                this.damage(this.x + 85 * this.direction, this.floor - 9, 13);
            }
            if (e >= this.duration) this.recover();
        } else if (this.state === 'missiles') {
            while (this.podHp > 0 && this.fired < 4 && e >= T.missileCue + this.fired * T.missileSpacing) this.fireRocket(this.fired++);
            if (e >= this.duration) this.recover();
        } else if (this.state === 'tail') {
            if (e >= T.tailCue) { this.pose('tail', 'slam'); this.damage(this.x - 112 * this.direction, this.floor - 9, 24); }
            if (e >= this.duration) this.recover();
        } else if (this.state === 'dive') {
            this.y = this.floor + Math.min(56, e / T.diveMs * 56);
            if (e >= 300) this.underwater(true);
            if (e >= this.duration) this.beginWake();
        } else if (this.state === 'wake') {
            const [a, b] = this.limits(T.viewInset);
            const root = Phaser.Math.Clamp(this.target() - this.direction * 85, a, b);
            this.x += (root - this.x) * Math.min(1, dt / 160);
            if (e >= this.duration) {
                this.targetX = this.x + this.direction * 85;
                this.enter('ambush_cue', T.ambushCue); this.marks.push(this.targetX);
            }
        } else if (this.state === 'ambush_cue') {
            if (e >= this.duration) {
                this.enter('burst', T.burstMs); this.underwater(false); this.splash('surface'); this.pose('head', 'roar'); this.pose('jaw', 'open'); this.ctx.audio.sfx('gator_snap');
            }
        } else if (this.state === 'burst') {
            this.y = this.floor + Math.max(0, 56 * (1 - e / 220));
            if (e >= 220 && e < 600) this.damage(this.targetX, this.floor - 13, 21);
            if (e >= this.duration) {
                this.ambushes++;
                if (this.ambushes < 3) { this.splash('sink'); this.beginWake(); }
                else { this.enter('climb', T.climbMs); this.y = this.floor + 45; this.pose('legs_front', 'walk'); this.pose('legs_back', 'walk'); }
            }
        } else if (this.state === 'climb') {
            this.y = this.floor + Math.max(0, 45 * (1 - e / this.duration));
            if (e >= this.duration) this.recover();
        } else if (this.state === 'gatling') {
            if (e >= T.gatlingCue && this.fired < 9 && e >= T.gatlingCue + this.fired * T.gatlingSpacing) {
                this.fired++; this.pose('head', 'gun'); this.pose('jaw', 'open');
                this.projectile(this.x + 75 * this.direction, this.floor - 25, this.direction * 170);
                this.ctx.audio.sfx('gator_gatling');
            }
            if (e >= this.duration) this.recover();
        } else if (this.state === 'roll') {
            if (e >= T.rollCue) {
                if (!this.fired) {
                    this.fired++; this.splash('sink'); this.underwater(true);
                    this.projectile(this.x + this.direction * 90, this.floor - 7, this.direction * 120, 'gatorgeddon_wave', 5, 4000);
                    this.ctx.events.emit('fx:emit', { effect: 'shockwave', x: this.x + this.direction * 90, y: this.floor - 3 });
                }
                this.y = this.floor + 56; this.rotation = 0;
                const hull = this.parts.get('body'); if (hull) hull.rotation = this.direction * (e - T.rollCue) / 850 * Math.PI * 2;
                const [a, b] = this.limits(); this.x = Phaser.Math.Clamp(this.fromX + this.direction * (e - T.rollCue) * .13, a, b);
            }
            if (e >= this.duration) { this.rotation = 0; const hull = this.parts.get('body'); if (hull) hull.rotation = 0; this.splash('surface'); this.recover(); }
        } else if (this.state === 'slam') {
            this.x = Phaser.Math.Linear(this.fromX, this.toX, Math.min(1, e / T.slamCue));
            if (e >= T.slamCue && !this.fired) {
                this.fired++; this.pose('tail', 'slam'); this.pose('legs_front', 'stomp'); this.pose('legs_back', 'stomp'); this.plantAll(.95);
                this.ctx.events.emit('boss:stomp', { x: this.targetX, y: this.floor, power: 2 });
                this.ctx.events.emit('fx:shake', { tier: 3 }); this.ctx.audio.sfx('gator_tail');
                this.ctx.events.emit('fx:emit', { effect: 'debris', x: this.targetX, y: this.floor, count: 8, material: 'wood' });
                this.damage(this.targetX, this.floor - 7, 22);
            }
            if (e >= this.duration) this.recover();
        } else if (this.state === 'gas') {
            this.pose('head', 'gas'); this.pose('jaw', 'open');
            if (e >= T.gasCue && !this.fired) { this.fired++; this.ctx.audio.sfx('gator_flame'); }
            if (e >= T.gasCue && e < 1650) {
                const mouth = this.x + this.direction * 100;
                this.damage(mouth + this.direction * 37, this.floor - 8, 26);
            }
            if (e >= this.duration) this.recover();
        } else if (this.state === 'recover' || this.state === 'roar') {
            if (this.state === 'roar') {
                this.pose('head', 'roar'); this.pose('jaw', 'open');
                this.pose('legs_front', 'idle'); this.pose('legs_back', 'idle');
            }
            else {
                const [a, b] = this.limits(); const home = this.direction < 0 ? b : a;
                const moving = Math.abs(home - this.x) > 1;
                this.x += Phaser.Math.Clamp(home - this.x, -dt * .06, dt * .06);
                this.pose('legs_front', moving ? 'walk' : 'idle'); this.pose('legs_back', moving ? 'walk' : 'idle');
            }
            if (e >= this.duration && this.lifeMs >= T.spawnGraceMs) this.attack();
        }
        this.draw();
    }
    private idleLife(dt: number): void {
        const tail = this.parts.get('tail');
        if (tail) {
            const striking = this.state === 'tail' || this.state === 'slam';
            const cue = this.state === 'slam' ? T.slamCue : T.tailCue;
            tail.rotation = striking ? (this.elapsed < cue ? .16 * this.elapsed / cue : -.4) : 0;
        }
        const body = this.parts.get('body'); if (body) body.y = -14 + (Math.floor(this.lifeMs / 160) % 4 === 1 ? -1 : 0);
        this.ventMs -= dt;
        if (this.ventMs <= 0) {
            this.ventMs = this.isUnder() ? 220 : this.damageTier ? 500 : 1050;
            if (this.isUnder()) this.ctx.events.emit('fx:emit', { effect: 'gas_bubble', x: this.x + this.ctx.rng.range(-60, 60), y: this.waterY, count: 2 });
            else {
                this.ctx.events.emit('fx:emit', { effect: this.damageTier || !this.podHp ? 'smoke_stack' : 'vent_steam', x: this.x - 14 * this.direction, y: this.y - 60, scale: .4 });
                if (this.damageTier) {
                    this.ctx.events.emit('fx:emit', { effect: 'shield_spark', x: this.x + 8, y: this.y - 40, count: 2 });
                    this.ctx.events.emit('fx:emit', { effect: 'mud_splat', x: this.x - 42 * this.direction, y: this.floor - 2, scale: .25 });
                    if (this.damageTier === 2) this.ctx.events.emit('fx:emit', { effect: 'shield_spark', x: this.x + 22 * this.direction, y: this.y - 21, count: 2 });
                }
            }
        }
    }
    private updateRockets(dt: number): void {
        for (const r of this.rockets) {
            if (!r.active) continue;
            r.age += dt; const t = Math.min(1, r.age / T.missileFlight);
            r.sprite.setPosition(Phaser.Math.Linear(r.x0, r.x1, t), Phaser.Math.Linear(r.y0, r.y1, t) - Math.sin(t * Math.PI) * 62);
            if (t === 1) {
                r.active = false; r.sprite.setVisible(false); this.boom(r.x1, r.y1, 's');
                this.ctx.damage.applyRadial(r.x1, r.y1, T.missileRadius, 1, 'enemy', 'explosion');
            }
        }
    }
    private death(): void {
        const e = this.elapsed;
        while (this.fired < 13 && e >= this.fired * 200) {
            this.boom(this.x + (-100 + this.fired * 17) * this.direction, this.floor - 25 - (this.fired % 3) * 16, this.fired % 4 ? 'm' : 'l'); this.fired++;
        }
        this.rotation = Math.sin(e / 90) * .025;
        const hull = this.parts.get('body'); if (hull) hull.y = -14 + Math.min(9, e / 150);
        if (e >= 1800) {
            this.setScale(this.direction, -1); this.y = this.floor - 65 + Math.max(0, e - 2200) * .065;
            if (e >= 2600) { this.setDepth(DEPTH.TILES_BACK + .5); this.setAlpha(Math.max(0, (4000 - e) / 1400)); }
            if (e - 2600 >= 0 && this.fired === 13) { this.fired++; this.splash('sink'); }
        }
        if (e >= T.deathMs && !this.defeated) {
            this.defeated = true; this.state = 'defeated'; this.setVisible(false); this.cue.clear(); this.wake.clear();
            this.ctx.events.emit('enemy:killed', { x: this.x, y: this.floor, kind: 'gatorgeddon', score: T.score, cause: 'explosion' });
            this.ctx.events.emit('boss:defeated', this.info()); this.ctx.camera.unlock();
        }
    }
    private draw(): void {
        const g = this.cue, w = this.wake; g.clear(); w.clear();
        if (this.defeated) return;
        const e = this.elapsed, blink = Math.floor(e / 100) % 2 === 0;
        if (this.hp > 0) {
            g.lineStyle(1, blink ? 0xffe066 : 0xf07a5a);
            for (const x of this.marks) {
                const y = this.attackFloor(x);
                g.strokeEllipse(x, y - 2, this.state === 'ambush_cue' ? 48 : 30, 7).lineBetween(x, y - 14, x, y - 6);
            }
            for (const r of this.rockets) if (r.active) g.strokeEllipse(r.x1, r.y1, T.missileRadius * 2, 6);
            if (this.state === 'lunge' && e < (this.phase === 3 ? T.fastLungeCue : T.lungeCue)) {
                const x0 = this.fromX + this.direction * 84, x1 = this.toX + this.direction * 84;
                for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 14) g.lineBetween(x, this.floor - 3, x + 7, this.floor - 3);
            }
            if (this.state === 'gatling' && e < T.gatlingCue) g.lineBetween(this.x + this.direction * 80, this.floor - 25, this.targetX, this.floor - 25);
            if (this.state === 'roll' && e < T.rollCue) {
                for (let x = this.arena0 + 48; x < this.arena1 - 48; x += 22) g.strokeEllipse(x, this.floor - 5, 12, 6);
            }
            if (this.state === 'tail' && e < T.tailCue) g.strokeEllipse(this.x - 112 * this.direction, this.floor - 3, 72, 7);
            if (this.state === 'gas') {
                const x = this.x + this.direction * 100, active = e >= T.gasCue;
                for (let i = 0; i < 9; i++) {
                    const xx = x + this.direction * (i * 9), yy = this.floor - 9 - Math.sin(this.lifeMs / 100 + i) * (active ? 3 : 8);
                    g.fillStyle(active ? (i % 2 ? 0xffae22 : 0xf06a10) : 0x39d98a, active ? .9 : .5).fillEllipse(xx, yy, active ? 14 : 19, active ? 12 : 16);
                    if (active) g.fillStyle(0xffe066).fillRect(xx - 3, this.floor - 6, 6, 4);
                }
            }
        }
        if (this.isUnder() || this.state === 'roll' || this.state === 'dive' || (this.state === 'death' && e > 2600)) {
            const y = this.waterY - 2;
            w.lineStyle(1, 0xa8d4f0, .95);
            w.strokeEllipse(this.x, y - 1, 132 + Math.sin(this.lifeMs / 140) * 7, 9);
            for (let i = 0; i < 5; i++) {
                const x = this.x - 68 + i * 31, p = (this.lifeMs / 300 + i) % 1;
                w.strokeEllipse(x, y - p * 8, 4 + p * 6, 2 + p * 4);
                w.lineBetween(x - 9, y, x + 9, y);
            }
            // Two lamps above the water line remain legible even behind the ground layer.
            if ((this.state !== 'intro' || e > 280) && (this.state !== 'death' || e < 3900)) w.fillStyle(0xffe066, this.state === 'death' ? Math.max(0, (3900 - e) / 1300) : .9).fillRect(this.x + 71 * this.direction - 3, y - 3, 6, 2);
        }
    }
    snapshot(): unknown {
        return { kind: 'gatorgeddon', name: 'GATORGEDDON', hp: this.hp, maxHp: T.hp, phase: this.phase, damageTier: this.damageTier,
            podHp: this.podHp, state: this.state, elapsed: this.elapsed, introMs: Math.max(0, T.spawnGraceMs - this.lifeMs),
            x: this.x, y: this.y, floorY: this.floor, arenaX0: this.arena0, arenaX1: this.arena1, depth: this.depth, submerged: this.isUnder(),
            direction: this.direction, targetX: this.targetX, ambushes: this.ambushes, markers: [...this.marks], shells: this.rockets.filter(r => r.active).length,
            hurtboxes: this.boxes.filter(b => b.alive()).map(b => { const r = (b.body as () => Phaser.Geom.Rectangle)(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) };
    }
}

/** Factory, intro foreshadowing and opt-in fixture stay inside Enemies A's ownership. */
export function registerGatorgeddon(ctx: RegisterContext, track: (boss: TrackedBoss) => void): void {
    let boss: Gatorgeddon | null = null;
    ctx.registry.register('boss:gatorgeddon', (c, x, y, props) => {
        if (boss?.active) return boss;
        boss = new Gatorgeddon(c, x, y, props); track(boss); return boss;
    });
    let approach: { x: number; y: number; ms: number; pulse: number } | null = null;
    const offIntro = ctx.events.on('boss:intro', e => {
        if (e.name !== 'GATORGEDDON' || boss?.active) return;
        approach = { x: e.x, y: e.y - 8, ms: 0, pulse: 0 };
        ctx.audio.sfx('gator_submerge');
    });
    const offApproach = ctx.onUpdate(dt => {
        if (!approach || !dt) return;
        approach.ms += dt; approach.pulse -= dt;
        if (boss?.active || approach.ms > 2000) { approach = null; return; }
        if (approach.pulse <= 0) { approach.pulse = 180; ctx.events.emit('fx:emit', { effect: 'gas_bubble', x: approach.x + ctx.rng.range(-45, 45), y: approach.y, count: 3 }); }
    });
    ctx.scene.events.once('shutdown', () => { offIntro(); offApproach(); });
    if (!ctx.debug.cheatsEnabled || new URLSearchParams(location.search).get('enemytest') !== 'gatorgeddon') return;
    let spawned = false;
    const water = ctx.scene.add.graphics().setDepth(DEPTH.TILES_BACK + 1);
    const deck = ctx.scene.add.graphics().setDepth(DEPTH.TILES_BACK + 2.25);
    let deckBody: Phaser.GameObjects.Rectangle | null = null;
    let deckCollider: Phaser.Physics.Arcade.Collider | null = null;
    const observed = { kills: 0, score: 0, phases: [] as number[], defeated: 0, stomps: 0 };
    const offs = [ctx.events.on('enemy:killed', e => { if (e.kind === 'gatorgeddon') { observed.kills++; observed.score += e.score; } }),
        ctx.events.on('boss:phase', e => { if (e.name === 'GATORGEDDON') observed.phases.push(e.phase); }),
        ctx.events.on('boss:defeated', e => { if (e.name === 'GATORGEDDON') observed.defeated++; }),
        ctx.events.on('boss:stomp', () => observed.stomps++)];
    let x0 = 0, floor = 0, clock = 0;
    const hiddenSigns: Array<{ sprite: Phaser.GameObjects.Sprite; visible: boolean }> = [];
    const spawnFixture = (): void => {
        const p = ctx.player(); if (!p) return;
        spawned = true; x0 = Math.max(0, p.x - 48);
        floor = Math.min(ctx.physics.groundBelow(p.x, p.y - 96, 300) ?? p.y, ctx.physics.groundBelow(p.x + 210, p.y - 96, 300) ?? p.y);
        p.teleport?.(p.x, floor);
        // Flat test pier: old maps have uneven floors. The water continues below the deck
        // to conceal the submerged hull, just as the real arena's ground layer does.
        // The production arena uses only Levels' own pier/collisions.
        deckBody = ctx.scene.add.rectangle(x0 + 256, floor + 8, 512, 16, 0, 0);
        ctx.scene.physics.add.existing(deckBody, true);
        deckCollider = ctx.scene.physics.add.collider(p.sprite, deckBody);
        deck.fillStyle(0x4a2e1c).fillRect(x0, floor, 512, 16).fillStyle(0xa88c52).fillRect(x0, floor, 512, 2);
        for (let i = 0; i < 32; i++) {
            const x = x0 + i * 16;
            deck.fillStyle(0x2a1a12).fillRect(x, floor + 3, 1, 13).fillRect(x + 3, floor + 9, 9, 1);
            deck.fillStyle(0xa9bccb).fillRect(x + 3, floor + 3, 1, 1).fillRect(x + 12, floor + 3, 1, 1);
        }
        for (const child of ctx.scene.children.list) {
            if (child instanceof Phaser.GameObjects.Sprite && child.name.startsWith('prop:sign_') && child.x >= x0 && child.x <= x0 + 512) {
                hiddenSigns.push({ sprite: child, visible: child.visible }); child.setVisible(false);
            }
        }
        ctx.spawn('boss', 'gatorgeddon', { facing: -1, arenaX0: x0, arenaX1: x0 + 512 }, p.x + 210, floor);
    };
    offs.push(ctx.onUpdate(dt => {
        clock += dt;
        const p = ctx.player();
        if (!spawned && p && ctx.hasLevel()) spawnFixture();
        if (!spawned) return;
        water.clear().fillStyle(0x1a3d24).fillRect(x0, floor - 10, 512, 128).fillStyle(0x4c6075).fillRect(x0, floor - 10, 512, 1);
        water.fillStyle(0x75899c);
        for (let i = 0; i < 22; i++) water.fillRect(x0 + (i * 27 + Math.floor(clock / 140) % 8) % 508, floor - 8 + i % 3, 9, 1);
    }));
    ctx.debug.register('gatorTest', () => ({ kind: 'gatorgeddon', ready: spawned, ...observed }));
    const api = { bossHp: (n: number) => boss?.setHp(n),
        hitAt: (x: number, y: number, damage = 1, kind: HitInfo['kind'] = 'bullet', dirX = 1, dirY = 0, weapon = 'pistol') => {
            const box = ctx.damage.queryPoint(x, y, 'player');
            return box ? ctx.damage.deal(box, { x, y, damage, kind, dirX, dirY, weapon, source: 'player' }) : false;
        } };
    Object.assign(window, { __KBE_GATORTEST: api });
    ctx.scene.events.once('shutdown', () => { for (const off of offs) off(); water.destroy(); deckCollider?.destroy(); deckBody?.destroy(); deck.destroy(); for (const p of hiddenSigns) if (p.sprite.active) p.sprite.setVisible(p.visible); delete (window as unknown as Record<string, unknown>).__KBE_GATORTEST; });
}
