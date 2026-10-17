import Phaser from 'phaser';
import { BossDebris } from './BossDebris';
import { DEPTH, type GameContext, type HitInfo, type Hurtbox } from '../../core';
import { MIDBOSSES } from '../../config/tuning/enemies';
import { animate } from '../enemies/Enemy';

// Local sockets for the right-facing engine; rear guns sit on the left tender.
const IRON_GUNS = [{ x: -68, y: -40 }, { x: -43, y: -55 }] as const;
const IRON_STACK = { x: 49, y: -98 };
const IRON_DRIVER = { x: -17, y: -49 };
const IRON_CORE = { x: 16, y: -36 };

type Kind = keyof typeof MIDBOSSES;
type Shell = { sprite: Phaser.GameObjects.Sprite; x0: number; y0: number; x1: number; y1: number; age: number; ms: number; lift: number; radius: number };

/** Shared scaled-clock lifecycle. All ordnance/markers belong to this boss and cancel on death. */
export class MachineBoss extends Phaser.GameObjects.Container {
    hp: number;
    phase = 1;
    state = 'intro';
    readonly kind: Kind;
    private elapsed = 0;
    private duration = 1100;
    private introMs = 1100;
    private lifeMs = 0;
    private damageTier = 0;
    private ventMs = 0;
    private readonly heavyDebris: BossDebris;
    private cycle = 0;
    private fired = 0;
    private flash = 0;
    private contactMs = 0;
    private smokeMs = 0;
    private direction = -1;
    private readonly arena0: number;
    private readonly arena1: number;
    private readonly home: number;
    private readonly hull: Phaser.GameObjects.Sprite;
    private readonly operator: Phaser.GameObjects.Sprite;
    private readonly turrets: Phaser.GameObjects.Sprite[] = [];
    private readonly turretHp = [40, 40];
    private readonly cue: Phaser.GameObjects.Graphics;
    private readonly shells: Shell[] = [];
    private readonly marks: number[] = [];
    private readonly boxes: Hurtbox[] = [];
    private readonly offs: Array<() => void> = [];
    private areaFrame = -1;
    private areaHit: HitInfo | null = null;
    private readonly areaShapes = new Set<number>();
    private readonly scraps: Phaser.GameObjects.Sprite[] = [];
    constructor(private readonly ctx: GameContext, kind: Kind, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y);
        this.heavyDebris = new BossDebris(ctx);
        this.kind = kind; this.hp = MIDBOSSES[kind].hp;
        // The train map spawns enemies on the 304px deck; the engine runs on the rails below it.
        if (kind === 'ironhorn' && ctx.part.map === 'm1p2') this.y = 352;
        ctx.scene.add.existing(this); this.setDepth(DEPTH.ENEMIES);
        this.arena0 = Number(props.arenaX0 ?? ctx.camera.leftEdge());
        this.arena1 = Number(props.arenaX1 ?? this.arena0 + ctx.camera.view().width);
        ctx.camera.lock(this.arena0, this.arena1);
        this.x = Phaser.Math.Clamp(x, this.arena0 + 104, Math.min(this.arena1, this.arena0 + ctx.camera.view().width) - 70);
        if (kind === 'ironhorn') this.x = Math.min(this.x, Math.min(this.arena1, this.arena0 + ctx.camera.view().width) - 98);
        this.home = this.x;
        this.hull = ctx.scene.add.sprite(0, 0, kind).setOrigin(.5, 1); this.add(this.hull);
        this.operator = ctx.scene.add.sprite(kind === 'snowcat' ? 0 : IRON_DRIVER.x, kind === 'snowcat' ? -36 : IRON_DRIVER.y, kind === 'snowcat' ? 'warden' : 'driver').setOrigin(.5, 1); this.add(this.operator); this.operator.setVisible(kind === 'snowcat');
        animate(this.hull, `${kind}_intro`); animate(this.operator, `${this.operator.texture.key}_salute`);
        if (kind === 'ironhorn') for (let i = 0; i < 2; i++) {
            const s = ctx.scene.add.sprite(IRON_GUNS[i].x, IRON_GUNS[i].y, 'ironhorn_turret').setOrigin(.5, 1); this.add(s); this.turrets.push(s); animate(s, 'ironhorn_turret_intro');
        }
        this.cue = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES + 1);
        if (kind === 'snowcat') this.box(-52, -40, 104, 40, 'hull');
        else this.box(-88, -65, 176, 65, 'hull');
        this.box(-11, -68, 23, 29, 'warden');
        if (kind === 'ironhorn') {
            // Register the two independent turrets last so direct shots prefer them over the hull.
            for (let i = 0; i < 2; i++) this.box(IRON_GUNS[i].x - 12, IRON_GUNS[i].y - 24, 27, 22, `turret${i}`);
        }
        this.offs.push(ctx.onUpdate(dt => this.tick(dt)));
        this.once('destroy', () => { this.heavyDebris.destroy(); for (const off of this.offs) off(); this.clearShells(); this.cue.destroy(); for (const s of this.scraps) s.destroy(); });
        ctx.events.emit('boss:spawn', this.info());
        ctx.audio.sfx(kind === 'snowcat' ? 'snowcat_engine' : 'loco_steam');
        if (kind === 'ironhorn') ctx.events.emit('fx:emit', { effect: 'steam', x: this.x + 22, y: this.y - 70, scale: 1.2 });
        else ctx.events.emit('fx:emit', { effect: 'debris', x: this.x - 48, y: this.y - 20, material: 'wood', count: 8 });
        // boss:intro normally precedes construction; spawn always starts the same safe animation.
        this.offs.push(ctx.events.on('boss:intro', e => {
            if (e.name.toUpperCase() === this.info().name && this.lifeMs < 1100) this.introMs = Math.max(this.introMs, 1100);
        }));
    }
    private info() { return { name: this.kind === 'snowcat' ? "WARDEN'S SNOWCAT" : 'IRONHORN', hp: this.hp, maxHp: MIDBOSSES[this.kind].hp, phase: this.phase, x: this.x, y: this.y }; }
    private box(x: number, y: number, w: number, h: number, part: string): void {
        const rect = new Phaser.Geom.Rectangle(), shape = this.boxes.length;
        const b: Hurtbox = { team: 'enemy', material: 'metal', owner: this, kind: this.kind,
            body: () => rect.setTo(this.x + x, this.y + y, w, h),
            alive: () => this.active && this.hp > 0 && (part !== 'warden' || this.kind === 'snowcat') && (!part.startsWith('turret') || (this.phase === 1 && this.turretHp[Number(part.slice(-1))] > 0)),
            hit: h => this.hit(h, part, shape) };
        this.boxes.push(b); this.offs.push(this.ctx.damage.register(b));
    }
    private hit(h: HitInfo, part: string, shape: number): boolean {
        if (this.hp <= 0) return false;
        if (h.kind === 'explosion' || h.kind === 'melee') {
            const frame = this.ctx.scene.game.loop.frame;
            const sameSwing = h.kind === 'melee' && this.areaHit?.kind === 'melee' && this.areaHit.x === h.x && this.areaHit.y === h.y && this.areaHit.damage === h.damage && this.areaHit.weapon === h.weapon;
            if (this.areaFrame !== frame || (this.areaHit !== h && !sameSwing) || this.areaShapes.has(shape)) { this.areaFrame = frame; this.areaHit = h; this.areaShapes.clear(); }
            else if (this.areaShapes.size) { this.areaShapes.add(shape); return false; }
            this.areaShapes.add(shape);
        }
        this.ctx.projectiles.forEach(p => {
            if (p.team === h.source && Math.abs(p.x - h.x) < .01 && Math.abs(p.y - h.y) < .01)
                for (const b of this.boxes) if (!p.hitList.includes(b)) p.remember(b);
        });
        let damage = h.damage;
        if (this.kind === 'snowcat') {
            if (part === 'warden' || h.y < this.y - 40) damage *= 2;
            else if (h.x > this.x + 26 && h.y < this.y - 12) damage *= 1.5;
        } else if (this.phase === 1) {
            const i = part.startsWith('turret') ? Number(part.slice(-1)) : this.turretHp[0] > 0 ? 0 : 1;
            damage = Math.min(damage, Math.max(0, this.turretHp[i])); this.turretHp[i] -= damage;
            if (this.turretHp[i] <= 0 && damage > 0) { animate(this.turrets[i], 'ironhorn_turret_broken'); this.boom(this.x + IRON_GUNS[i].x, this.y + IRON_GUNS[i].y - 14, 'm'); }
        } else if (this.phase === 3 && Math.abs(h.x - this.x - IRON_CORE.x) < 13 && Math.abs(h.y - this.y - IRON_CORE.y) < 13) damage *= 2;
        this.setHp(this.hp - damage);
        this.flash = 60; this.hull.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        return damage > 0;
    }
    setHp(value: number): void {
        if (this.hp <= 0) return;
        this.hp = Phaser.Math.Clamp(value, 0, MIDBOSSES[this.kind].hp);
        this.ctx.events.emit('boss:hp', this.info());
        const tier = this.hp <= MIDBOSSES[this.kind].hp / 3 ? 2 : this.hp <= MIDBOSSES[this.kind].hp * 2 / 3 ? 1 : 0;
        if (tier > this.damageTier && this.hp > 0) {
            this.heavyDebris.burst(this.x + (this.kind === 'ironhorn' ? 75 : 18), this.y - 45, this.y, 3, this.kind === 'ironhorn');
            this.ctx.events.emit('fx:emit', { effect: 'shield_spark', x: this.x + 18, y: this.y - 40, count: 8, material: 'metal' });
        }
        this.damageTier = tier;
        const next = this.kind === 'ironhorn' ? (this.hp <= 70 ? 3 : this.hp <= 140 ? 2 : 1) : this.hp <= 50 ? 3 : this.hp <= 100 ? 2 : 1;
        while (this.phase < next) {
            this.phase++; this.ctx.events.emit('boss:phase', this.info());
            if (this.kind === 'ironhorn') { if (this.phase === 2) { this.turretHp.fill(0); this.turrets.forEach(s => animate(s, 'ironhorn_turret_broken')); } this.enter('intro', 800); if (this.phase === 3) { this.operator.setVisible(true); this.bringToTop(this.operator); } animate(this.hull, `ironhorn_${this.phase === 3 ? 'core' : 'damaged'}`, true); }
        }
        if (this.hp <= 0) {
            this.heavyDebris.burst(this.x, this.y - 48, this.y, 12, this.kind === 'ironhorn');
            this.enter('death', MIDBOSSES[this.kind].deathMs); this.clearShells(); this.ctx.projectiles.clear('enemy'); this.cue.clear();
            animate(this.hull, `${this.kind}_death`, true); animate(this.operator, `${this.operator.texture.key}_${this.kind === 'snowcat' ? 'eject' : 'panic'}`, true);
            this.ctx.events.emit('fx:shake', { tier: 4 }); this.ctx.audio.sfx(this.kind === 'snowcat' ? 'snowcat_engine' : 'loco_steam');
            if (this.kind === 'snowcat') {
                for (let i = 0; i < 2; i++) { const s = this.ctx.scene.add.sprite(this.x + (i ? 25 : -25), this.y - 6, 'snowcat_tread').setDepth(DEPTH.ENEMIES + 1); animate(s, 'snowcat_tread_roll', true); this.scraps.push(s); }
            }
        }
    }
    private enter(state: string, ms: number): void { this.state = state; this.duration = ms; this.elapsed = 0; this.fired = 0; this.marks.length = 0; }
    private boom(x: number, y: number, size: 's' | 'm' | 'l' | 'xl' = 's'): void { this.ctx.events.emit('explosion', { x, y, size, team: 'enemy' }); }
    private clearShells(): void { for (const s of this.shells) s.sprite.destroy(); this.shells.length = 0; }
    private attackFloor(target: number): number {
        // Look above the flatcar deck even when the locomotive's wheels are on the rails.
        return this.ctx.physics.groundBelow(target, this.y - (this.kind === 'ironhorn' ? 96 : 16), 120) ?? this.y;
    }
    private arc(x: number, y: number, target: number, ms: number, lift: number, radius: number, texture = 'enemy_grenade'): void {
        const floor = this.attackFloor(target);
        const sprite = this.ctx.scene.add.sprite(x, y, texture).setDepth(DEPTH.PROJECTILES); animate(sprite, `${texture}_fuse`, true);
        this.shells.push({ sprite, x0: x, y0: y, x1: target, y1: floor - 2, age: 0, ms, lift, radius });
    }
    private limits(inset = 18): [number, number] { const v = this.ctx.camera.view(); return [Math.max(this.arena0, v.left) + inset, Math.min(this.arena1, v.right) - inset]; }
    private target(offset: number): number { const [a, b] = this.limits(30); return Phaser.Math.Clamp((this.ctx.player()?.x ?? this.x - 100) + offset, a, b); }
    private shoot(x: number, y: number, vx: number, vy: number, radius = 2): void {
        this.ctx.projectiles.spawn({ x, y, vx, vy, radius, team: 'enemy', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', rotate: false, lifetime: 4000, collideTiles: true });
        this.ctx.events.emit('enemy:shoot', { kind: this.kind, weapon: this.state, x, y, angle: Math.atan2(vy, vx) });
    }
    private attack(): void {
        if (this.kind === 'snowcat') {
            const attack = ['charge', 'mortar', 'mg'][this.cycle++ % 3];
            this.direction = attack === 'charge' || (this.ctx.player()?.x ?? 0) < this.x ? -1 : 1;
            this.enter(attack, attack === 'charge' ? 2100 : attack === 'mortar' ? 1800 : 1600);
            animate(this.hull, `snowcat_${attack}${this.damageTier === 2 ? '_critical' : this.damageTier === 1 ? '_damaged' : ''}`, true); animate(this.operator, `warden_${attack === 'mg' ? 'aim' : 'taunt'}`, true);
            this.ctx.audio.sfx(attack === 'charge' ? 'snowcat_engine' : attack === 'mortar' ? 'mortar_thump' : 'turret_windup');
            if (attack === 'mortar') this.marks.push(this.target(-48), this.target(0), this.target(48));
            if (attack === 'mg') this.ctx.events.emit('ui:prompt', { text: 'DUCK!', ms: 900 });
        } else {
            const attack = this.phase === 1 ? 'cannon' : this.phase === 2 ? 'cinder' : this.cycle++ % 2 ? 'grenade' : 'coal';
            this.enter(attack, attack === 'cannon' ? 1550 : attack === 'cinder' ? 2100 : 1700);
            if (attack === 'cannon') for (let i = 0; i < 2; i++) if (this.turretHp[i] > 0) animate(this.turrets[i], 'ironhorn_turret_aim', true);
            animate(this.operator, `driver_${this.phase === 3 ? 'throw' : 'taunt'}`, true);
            if (attack !== 'cannon') this.marks.push(...(attack === 'cinder' ? [-90, -30, 30, 90] : [0]).map(d => this.target(d)));
            this.ctx.audio.sfx('loco_steam');
        }
    }
    private draw(): void {
        const g = this.cue; g.clear(); if (this.hp <= 0) return;
        g.lineStyle(1, Math.floor(this.elapsed / 100) % 2 ? 0xffe066 : 0xf07a5a, 1);
        for (const x of this.marks) {
            const floor = this.kind === 'ironhorn' ? this.attackFloor(x) : this.y;
            g.strokeEllipse(x, floor - 2, 24, 6).lineBetween(x, floor - 11, x, floor - 5);
        }
        for (const s of this.shells) g.strokeEllipse(s.x1, s.y1, s.radius * 2, 6);
        if (this.state === 'mg' && this.elapsed < MIDBOSSES.snowcat.mgCue) { const [a, b] = this.limits(6); g.lineBetween(a, this.y - 24, b, this.y - 24); }
        if (this.state === 'charge' && this.elapsed < MIDBOSSES.snowcat.chargeCue) { const [a, b] = this.limits(48); for (let x = a; x < b; x += 18) g.lineBetween(x, this.y - 3, x + 9, this.y - 3); }
        if (this.state === 'cannon' && this.elapsed < MIDBOSSES.ironhorn.cannonCue) {
            for (let i = 0; i < 2; i++) if (this.turretHp[i] > 0) g.strokeCircle(this.x + IRON_GUNS[i].x - 22, this.y + IRON_GUNS[i].y - 14, 7);
        }
    }
    private tick(dt: number): void {
        if (!dt || !this.active || this.state === 'defeated') return;
        if (this.hp > 0 && !this.ctx.player()?.alive()) return;
        this.heavyDebris.update(dt);
        this.lifeMs += dt; this.introMs = Math.max(0, this.introMs - dt);
        this.elapsed += dt; this.contactMs -= dt;
        if (this.hp > 0) {
            this.ventMs -= dt;
            if (this.ventMs <= 0) {
                this.ventMs = this.damageTier ? 650 : 1050;
                const x = this.x + (this.kind === 'ironhorn' ? 71 : 52), y = this.y - (this.kind === 'ironhorn' ? 28 : 42);
                this.ctx.events.emit('fx:emit', { effect: this.damageTier ? 'smoke_stack' : 'steam', x, y, scale: this.damageTier ? .65 : .4 });
                if (this.damageTier) this.ctx.events.emit('fx:emit', { effect: 'shield_spark', x: x - 28, y: y + 6, count: this.damageTier + 1 });
            }
            // Source-space engine vibration leaves every world hurtbox/socket unchanged.
            const entry = this.introMs > 0 ? Math.round(18 * (this.introMs / 1100) ** 2) : 0;
            this.hull.x = this.kind === 'snowcat' ? entry : 0;
            if (this.kind === 'snowcat') this.operator.x = entry;
            this.hull.y = this.kind === 'snowcat' && Math.floor(this.lifeMs / 90) % 2 ? -1 : 0;
            if (this.lifeMs >= 1100) {
                const pose = this.state === 'death' ? 'death' : this.kind === 'snowcat' && ['charge','mortar','mg'].includes(this.state) ? this.state : this.kind === 'ironhorn' && this.phase === 3 ? 'core' : this.damageTier === 2 ? 'critical' : this.damageTier === 1 ? 'damaged' : 'idle';
                const tag = `${this.kind}_${pose}${this.kind === 'snowcat' && ['charge','mortar','mg'].includes(pose) && this.damageTier ? this.damageTier === 2 ? '_critical' : '_damaged' : ''}`;
                if (this.hull.anims.currentAnim?.key !== tag) animate(this.hull, tag, true);
            }
        }
        if (this.kind === 'ironhorn' && this.hp > 0) {
            this.smokeMs -= dt;
            if (this.smokeMs <= 0) {
                this.smokeMs = 320;
                this.ctx.events.emit('fx:emit', { effect: 'smoke_stack', x: this.x + IRON_STACK.x, y: this.y + IRON_STACK.y, count: 2, scale: .8 });
            }
        }
        if (this.flash > 0 && (this.flash -= dt) <= 0) this.hull.clearTint();
        if (this.state === 'death') {
            if (this.elapsed >= this.fired * 240 && this.fired < 13) { this.boom(this.x + this.ctx.rng.range(-47, 47), this.y - this.ctx.rng.range(5, 55), this.fired++ % 3 ? 'm' : 'l'); }
            if (this.kind === 'snowcat') {
                this.operator.setPosition(Math.sin(this.elapsed / 300) * 10, -36 - Math.min(42, this.elapsed * .09));
                for (let i = 0; i < this.scraps.length; i++) { this.scraps[i].x += (i ? 1 : -1) * dt * .035; this.scraps[i].rotation += (i ? 1 : -1) * dt * .004; }
            } else { this.hull.rotation = Math.sin(this.elapsed / 90) * .025; if (this.elapsed > 2000) { this.y += dt * .018; this.hull.rotation -= (this.elapsed - 2000) * .00007; } }
            if (this.elapsed >= this.duration) {
                this.state = 'defeated'; this.hull.setVisible(false); this.turrets.forEach(s => s.setVisible(false)); if (this.kind === 'ironhorn') this.operator.setVisible(false);
                this.ctx.events.emit('enemy:killed', { x: this.x, y: this.y, kind: this.kind, score: MIDBOSSES[this.kind].score, cause: 'explosion' });
                this.ctx.events.emit('boss:defeated', this.info()); this.ctx.camera.unlock();
            }
            return;
        }
        // Keep the whole machine visible even when the arena is wider than a single viewport.
        const [a, b] = this.limits(this.kind === 'ironhorn' ? 98 : 56); this.x = this.kind === 'ironhorn' ? b : Phaser.Math.Clamp(this.x, a, b);
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i]; s.age += dt; const t = Math.min(1, s.age / s.ms);
            s.sprite.setPosition(s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t - Math.sin(t * Math.PI) * s.lift);
            if (t >= 1) { this.ctx.damage.applyRadial(s.x1, s.y1, s.radius, 1, 'enemy', 'explosion'); this.boom(s.x1, s.y1); s.sprite.destroy(); this.shells.splice(i, 1); }
        }
        this.draw();
        if (!this.ctx.player()?.alive()) return;
        if (this.state === 'charge' && this.elapsed >= MIDBOSSES.snowcat.chargeCue) {
            const [lo, hi] = this.limits(104); this.x = Phaser.Math.Clamp(this.x + this.direction * dt * .18, lo, hi);
            if (this.contactMs <= 0) { this.ctx.damage.applyRadial(this.x + this.direction * 43, this.y - 10, 13, 1, 'enemy', 'contact'); this.contactMs = 100; }
            if (!this.fired) { this.fired++; this.ctx.audio.sfx('snowcat_tread'); }
        }
        if (this.state === 'mortar' && this.fired < 3 && this.elapsed >= MIDBOSSES.snowcat.mortarCue + this.fired * 180) {
            this.arc(this.x + 15, this.y - 45, this.marks[this.fired++], 850, 70, 17); this.ctx.audio.sfx('mortar_thump');
        }
        if (this.state === 'mg' && this.fired < 8 && this.elapsed >= MIDBOSSES.snowcat.mgCue + this.fired * 100) {
            this.fired++; animate(this.operator, 'warden_fire', true); this.operator.setFlipX(this.direction > 0);
            this.shoot(this.x + this.direction * 55, this.y - 24, this.direction * 155, 0);
        }
        if (this.state === 'cannon' && this.fired < 2 && this.elapsed >= MIDBOSSES.ironhorn.cannonCue + this.fired * 250) {
            const i = this.fired++; if (this.turretHp[i] > 0) {
                animate(this.turrets[i], 'ironhorn_turret_fire');
                const x = this.x + IRON_GUNS[i].x - 22, y = this.y + IRON_GUNS[i].y - 14;
                const target = this.target(0), targetY = this.ctx.player()?.centerY ?? this.attackFloor(target) - 20;
                const angle = Math.atan2(targetY - y, target - x);
                this.shoot(x, y, Math.cos(angle) * 104, Math.sin(angle) * 104); this.ctx.audio.sfx('loco_cannon');
            }
        }
        if (this.state === 'cinder' && this.fired < 4 && this.elapsed >= MIDBOSSES.ironhorn.cinderCue + this.fired * 200) {
            this.arc(this.x + IRON_STACK.x, this.y + IRON_STACK.y, this.marks[this.fired++], 900, 40, 16, 'cinder'); this.ctx.audio.sfx('cinder');
        }
        if ((this.state === 'coal' || this.state === 'grenade') && !this.fired && this.elapsed >= MIDBOSSES.ironhorn.throwCue) {
            this.fired++; this.arc(this.x + IRON_DRIVER.x - 10, this.y + IRON_DRIVER.y - 20, this.marks[0], this.state === 'coal' ? 650 : 1100, 45, this.state === 'coal' ? 13 : 24, this.state === 'coal' ? 'coal' : 'enemy_grenade');
        }
        if (this.state === 'recover' && this.kind === 'snowcat') this.x += (Phaser.Math.Clamp(this.home, a, b) - this.x) * Math.min(1, dt / 300);
        if (this.elapsed < this.duration) return;
        if (this.introMs > 0) return;
        if (this.state === 'intro' && this.lifeMs < 1200) {
            animate(this.operator, `${this.operator.texture.key}_idle`, true);
            for (let i = 0; i < this.turrets.length; i++) if (this.turretHp[i] > 0) animate(this.turrets[i], 'ironhorn_turret_idle', true);
        }
        if (this.state === 'intro' || this.state === 'recover') this.attack();
        else { this.enter('recover', 850); animate(this.hull, `${this.kind}_${this.kind === 'ironhorn' ? (this.phase === 3 ? 'core' : this.phase === 2 ? 'damaged' : 'idle') : 'idle'}`, true); }
    }
    snapshot(): unknown { return { kind: this.kind, name: this.info().name, hp: this.hp, phase: this.phase, state: this.state, elapsed: this.elapsed, damageTier: this.damageTier, introMs: this.introMs, x: this.x, y: this.y, arenaX0: this.arena0, arenaX1: this.arena1, turretHp: [...this.turretHp], markers: [...this.marks], shells: this.shells.length, mgY: this.y - 24, hurtboxes: this.boxes.filter(b => b.alive()).map(b => { const r = (b.body as () => Phaser.Geom.Rectangle)(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) }; }
}
