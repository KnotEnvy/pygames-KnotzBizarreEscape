import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo, type Hurtbox } from '../../core';
import { getAudio, type LoopHandle } from '../../audio';
import { BAYOU_BOSSES } from '../../config/tuning/enemies';
import { animate } from '../enemies/Enemy';
import { BossFlash } from './BossFlash';
import { BossDebris } from './BossDebris';

type Kind = keyof typeof BAYOU_BOSSES;
type Egg = { sprite: Phaser.GameObjects.Sprite; live: boolean; landed: boolean; age: number; x0: number; y0: number; x1: number; y1: number; rect: Phaser.Geom.Rectangle; off: () => void; beep: number };
/** Bayou mid-boss lifecycle. Local ordnance is preallocated and cancelled atomically on death. */
export class BayouBoss extends Phaser.GameObjects.Container {
    hp: number;
    phase = 1;
    state = 'intro';
    private elapsed = 0;
    private duration = 1100;
    private life = 0;
    private cycle = 0;
    private fired = 0;
    private direction = -1;
    private high = true;
    private extension = 0;
    private contactMs = 0;
    private ventMs = 0;
    private deathPops = 0;
    private spinBounces = 0;
    private targetX = 0;
    private targetY = 0;
    private fromX = 0;
    private fromY = 0;
    private floor: number;
    private readonly arena0: number;
    private readonly arena1: number;
    private readonly hull: Phaser.GameObjects.Sprite;
    private readonly head: Phaser.GameObjects.Sprite | null;
    private readonly cue: Phaser.GameObjects.Graphics;
    private readonly flash = new BossFlash();
    private readonly debris: BossDebris;
    private readonly eggs: Egg[] = [];
    private readonly adds = new Set<Phaser.GameObjects.GameObject>();
    private readonly marks: number[] = [];
    private readonly boxes: Hurtbox[] = [];
    private readonly attack = new Phaser.Geom.Rectangle();
    private readonly offs: Array<() => void> = [];
    private loop: LoopHandle | null = null;
    private loopKey = '';
    private poseKey = '';
    private areaFrame = -1;
    private readonly areaShapes = new Set<number>();
    constructor(private readonly ctx: GameContext, readonly kind: Kind, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y); ctx.scene.add.existing(this); this.setDepth(DEPTH.ENEMIES);
        this.hp = BAYOU_BOSSES[kind].hp; this.floor = Number(props.floorY ?? y);
        this.arena0 = Number(props.arenaX0 ?? ctx.camera.leftEdge()); this.arena1 = Number(props.arenaX1 ?? this.arena0 + ctx.camera.view().width);
        ctx.camera.lock(this.arena0, this.arena1);
        this.hull = ctx.scene.add.sprite(0, 0, kind).setOrigin(.5, kind === 'shellshock' ? 1 : .5); this.add(this.hull);
        this.head = kind === 'shellshock' ? ctx.scene.add.sprite(-48, -27, 'shellshock_head') : null; if (this.head) this.add(this.head);
        this.cue = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES + 1); this.debris = new BossDebris(ctx);
        if (kind === 'skeeter') this.y = this.floor - 90;
        this.clamp(); this.fromY = this.y;
        this.box('hull'); if (this.head) this.box('head'); else this.box('tank');
        // Fixed three-slot magazine; shooting eggs disarms them and awards 25 points.
        for (let i = 0; i < 3; i++) {
            const egg: Egg = { sprite: ctx.scene.add.sprite(0, 0, 'turtle_egg').setDepth(DEPTH.PROJECTILES).setVisible(false), live: false, landed: false, age: 0, x0: 0, y0: 0, x1: 0, y1: 0, rect: new Phaser.Geom.Rectangle(), off: () => {}, beep: 0 };
            animate(egg.sprite, 'turtle_egg_blink', true);
            egg.off = ctx.damage.register({ team: 'enemy', kind: kind === 'shellshock' ? 'egg' : 'larva', material: 'metal', body: () => egg.rect.setTo(egg.sprite.x - 6, egg.sprite.y - 8, 12, 16), alive: () => egg.live && this.hp > 0, hit: h => { if (!egg.live) return false; this.disarm(egg); ctx.events.emit('explosion', { x: h.x, y: h.y, size: 's', team: 'player' }); ctx.events.emit('enemy:killed', { kind: 'egg', x: h.x, y: h.y, score: 25, cause: h.kind }); return true; } });
            this.eggs.push(egg);
        }
        this.offs.push(ctx.onUpdate((dt, raw) => { this.flash.update(raw); this.tick(dt); }));
        const stop = () => this.stopLoop(); ctx.scene.events.once('shutdown', stop);
        this.once('destroy', () => { this.stopLoop(); this.flash.clear(); this.debris.destroy(); this.clearOrdnance(); this.cue.destroy(); for (const e of this.eggs) { e.off(); e.sprite.destroy(); } for (const off of this.offs) off(); ctx.scene.events.off('shutdown', stop); });
        this.pose('intro'); ctx.events.emit('boss:spawn', this.info());
        ctx.audio.sfx(kind === 'shellshock' ? 'turtle_hiss' : 'skeeter_laser', { x: this.x });
        if (kind === 'shellshock') ctx.events.emit('water:splash', { x: this.x, y: this.floor, size: 'xl', kind: 'surface' });
        else for (let i = 0; i < 3; i++) this.spawnGnat(this.x - 45 + i * 32, this.y - 16);
    }
    private info() { return { name: this.kind === 'shellshock' ? 'SHELLSHOCK' : 'MEGA-SKEETER', hp: this.hp, maxHp: BAYOU_BOSSES[this.kind].hp, phase: this.phase, x: this.x, y: this.y }; }
    private enter(state: string, duration: number): void { this.state = state; this.duration = duration; this.elapsed = 0; this.fired = 0; this.poseKey = ''; this.cue.clear(); }
    private pose(tag: string): void {
        const tier = this.phase === 3 ? '_critical' : this.phase === 2 ? '_damaged' : '';
        const key = `${this.kind}_${tag}${tier}`; if (key !== this.poseKey) { animate(this.hull, key, true); this.poseKey = key; }
        if (this.head) animate(this.head, `shellshock_head_${this.state === 'snap' ? 'snap' : this.state === 'snap_cue' ? this.high ? 'cue_high' : 'cue_low' : this.state === 'intro' ? 'hiss' : this.state === 'death' ? 'death' : 'idle'}${tier}`, true);
    }
    private box(part: 'hull' | 'head' | 'tank'): void {
        const r = new Phaser.Geom.Rectangle(), shape = this.boxes.length;
        const b: Hurtbox = { team: 'enemy', material: 'metal', owner: this, kind: this.kind, body: () => {
            if (part === 'head' && this.head) return r.setTo(this.x + this.head.x - 22, this.y + this.head.y - 13, 44, 27);
            if (part === 'tank') return r.setTo(this.x + 1, this.y - 24, 48, 40);
            return this.kind === 'shellshock' ? r.setTo(this.x - 49, this.y - (this.state === 'spin' ? 30 : 64), 98, this.state === 'spin' ? 30 : 62) : r.setTo(this.x - 56, this.y - 24, 110, 55);
        }, alive: () => this.active && this.hp > 0 && !(part === 'head' && (this.state === 'spin' || this.state === 'spin_cue' || (this.state === 'intro' && this.elapsed < 600))), hit: h => this.hit(h, part, shape) };
        this.boxes.push(b); this.offs.push(this.ctx.damage.register(b));
    }
    private hit(h: HitInfo, part: string, shape: number): boolean {
        if (this.hp <= 0) return false;
        if (this.kind === 'shellshock' && this.state === 'spin') { this.ctx.audio.sfx('shell_clank', { x: h.x }); this.ctx.events.emit('projectile:impact', { x: h.x, y: h.y, material: 'shield', team: h.source }); this.ctx.events.emit('fx:emit', { effect: 'shield_spark', x: h.x, y: h.y, count: 3 }); return true; }
        // Area damage and piercing pellets must not hit two parts of the same health pool.
        if (h.kind === 'explosion' || h.kind === 'melee') { const f = this.ctx.scene.game.loop.frame; if (f !== this.areaFrame || this.areaShapes.has(shape)) { this.areaFrame = f; this.areaShapes.clear(); } else if (this.areaShapes.size) { this.areaShapes.add(shape); return false; } this.areaShapes.add(shape); }
        this.ctx.projectiles.forEach(p => { if (p.team === h.source && Math.abs(p.x - h.x) < .01 && Math.abs(p.y - h.y) < .01) for (const box of this.boxes) if (!p.hitList.includes(box)) p.remember(box); });
        let mult = 1;
        if (this.kind === 'shellshock') { if ((part === 'head' && this.state === 'snap') || (this.phase === 3 && Math.abs(h.x - this.x) < 23 && h.y < this.y - 18 && h.y > this.y - 53)) mult = 2; }
        else if (part === 'tank' || (h.x > this.x && h.x < this.x + 51 && h.y > this.y - 25 && h.y < this.y + 19)) mult = this.phase === 3 ? 2 : 1.5;
        this.setHp(this.hp - h.damage * mult); return true;
    }
    setHp(value: number): void {
        if (this.hp <= 0) return;
        this.hp = Phaser.Math.Clamp(value, 0, BAYOU_BOSSES[this.kind].hp); this.ctx.events.emit('boss:hp', this.info());
        const next = this.hp <= BAYOU_BOSSES[this.kind].hp / 3 ? 3 : this.hp <= BAYOU_BOSSES[this.kind].hp * 2 / 3 ? 2 : 1;
        while (this.phase < next) { this.phase++; this.debris.burst(this.x, this.y - 30, this.floor, 4); this.poseKey = ''; this.ctx.events.emit('boss:phase', this.info()); }
        if (this.hp <= 0) {
            this.enter('death', BAYOU_BOSSES[this.kind].deathMs); this.clearOrdnance(); this.ctx.projectiles.clear('enemy'); this.stopLoop(); this.debris.burst(this.x, this.y - 30, this.floor, 12); this.ctx.events.emit('fx:shake', { tier: 4 }); this.ctx.events.emit('fx:slowmo', { scale: .45, ms: 450 }); this.fromX = this.x; this.fromY = this.y;
        }
        this.flash.start(this.head ? [this.hull, this.head] : [this.hull], this.hp <= 0);
    }
    private spawnGnat(x: number, y: number): void {
        const a = this.ctx.spawn('enemy', 'gnat', { patrol: 28, graceMs: this.state === 'intro' ? 1600 : 900 }, x, y);
        if (a instanceof Phaser.GameObjects.GameObject) { this.adds.add(a); a.once('destroy', () => this.adds.delete(a)); }
    }
    private stopLoop(): void { this.loop?.stop(0); this.loop = null; this.loopKey = ''; }
    private updateLoop(): void {
        const key = this.hp <= 0 ? '' : this.kind === 'skeeter' ? 'skeeter_whine' : this.state === 'spin' || this.state === 'spin_cue' ? 'shell_spin' : '';
        if (key !== this.loopKey) this.stopLoop();
        if (key) { const audio = getAudio(this.ctx.scene); if (!this.loop && !audio.locked) { this.loop = audio.loop(key, { x: this.x }); this.loopKey = key; } this.loop?.setX(this.x); }
    }
    private clamp(): void {
        const v = this.ctx.camera.view(); const left = Math.max(this.arena0, v.left), right = Math.min(this.arena1, v.right);
        // A turtle snap extends 112px toward the player. The opposite edge retains a 48px refuge.
        const l = this.kind === 'shellshock' ? this.state === 'spin' ? 104 : this.direction < 0 ? 124 : 64 : 80;
        const r = this.kind === 'shellshock' ? this.state === 'spin' ? 104 : this.direction > 0 ? 124 : 64 : 80;
        this.x = Phaser.Math.Clamp(this.x, left + l, Math.max(left + l, right - r));
        if (this.kind === 'skeeter') this.y = Phaser.Math.Clamp(this.y, v.top + 100, v.bottom - 48);
    }
    private disarm(e: Egg): void { e.live = false; e.sprite.setVisible(false); }
    private clearOrdnance(): void { for (const e of this.eggs) this.disarm(e); this.marks.length = 0; this.cue.clear(); for (const a of this.adds) if (a.active) a.destroy(); this.adds.clear(); }
    private mark(x: number, y: number, radius = 12): void { const on = Math.floor(this.life / 120) % 2 === 0; this.cue.lineStyle(1, on ? 0xffe066 : 0xd4483a, .9).strokeEllipse(Math.round(x), Math.round(y - 2), radius * 2, 5); this.cue.lineBetween(x - 5, y - 7, x + 5, y + 3).lineBetween(x + 5, y - 7, x - 5, y + 3); }
    private prepareEggs(): void {
        this.marks.length = 0; const v = this.ctx.camera.view(), p = this.ctx.player();
        for (let i = 0; i < 3; i++) this.marks.push(Phaser.Math.Clamp((p?.x ?? this.x - 100) + (i - 1) * 52, v.left + 24, v.right - 24));
    }
    private launchEgg(index: number): void {
        const e = this.eggs[index]; if (e.live) return;
        e.live = true; e.landed = false; e.age = 0; e.beep = 0; e.x0 = this.x; e.y0 = this.y - (this.kind === 'shellshock' ? 67 : 0); e.x1 = this.marks[index]; e.y1 = this.ctx.physics.groundBelow(e.x1, this.floor - 96, 128) ?? this.floor; e.sprite.setPosition(e.x0, e.y0).setVisible(true).setAlpha(1);
        this.ctx.audio.sfx(this.kind === 'shellshock' ? 'egg_lob' : 'larva_pop', { x: this.x });
    }
    private updateEggs(dt: number): void {
        for (const e of this.eggs) {
            if (!e.live) continue; e.age += dt;
            if (!e.landed) { const t = Math.min(1, e.age / 850); e.sprite.setPosition(Phaser.Math.Linear(e.x0, e.x1, t), Phaser.Math.Linear(e.y0, e.y1 - 8, t) - Math.sin(t * Math.PI) * 70); this.mark(e.x1, e.y1); if (t >= 1) { e.landed = true; e.age = 0; } }
            else { if (this.kind === 'skeeter') e.sprite.y = e.y1 - 8 - Math.sin(Math.min(1, e.age / 220) * Math.PI) * 8; this.mark(e.x1, e.y1, 18); if ((e.beep -= dt) <= 0) { e.beep = e.age > 800 ? 120 : 320; this.ctx.audio.sfx(this.kind === 'shellshock' ? 'egg_beep' : 'larva_pop', { x: e.x1 }); }
                if (e.age >= (this.kind === 'shellshock' ? 1200 : 600)) { this.disarm(e); if (this.kind === 'shellshock') { this.ctx.damage.applyRadial(e.x1, e.y1 - 4, 22, 1, 'enemy', 'explosion'); this.boom(e.x1, e.y1 - 6, 's'); }
                    else this.spawnGnat(e.x1, e.y1 - 70);
                }
            }
        }
    }
    private boom(x: number, y: number, size: 's' | 'm' | 'l' | 'xl'): void { this.ctx.events.emit('explosion', { x, y, size, team: 'enemy' }); }
    private touch(r: Phaser.Geom.Rectangle): void {
        if (this.contactMs > 0) return;
        for (const b of this.ctx.damage.queryRect(r, 'enemy')) this.ctx.damage.deal(b, { x: r.centerX, y: r.centerY, damage: 1, source: 'enemy', kind: 'contact', dirX: this.direction, dirY: 0 });
        this.contactMs = 130;
    }
    private tick(dt: number): void {
        if (!this.active) return; this.updateLoop(); if (!dt) return;
        this.elapsed += dt; this.life += dt; this.contactMs -= dt; this.ventMs -= dt; this.debris.update(dt); this.cue.clear();
        if (this.state === 'death') {
            this.pose('death');
            if (this.kind === 'shellshock') { this.hull.setFlipY(true); this.hull.y = -12 + Math.sin(this.elapsed / 120) * Math.max(0, 8 - this.elapsed / 400); if (this.head) { this.head.x = -55 - Math.min(35, Math.max(0, this.elapsed - 1800) / 18); this.head.y = -30 - Math.max(0, Math.sin(Math.max(0, this.elapsed - 1800) / 900 * Math.PI)) * 40; this.head.rotation = -.2; } }
            else { const t = Math.min(1, this.elapsed / this.duration); this.x = this.fromX + Math.sin(t * Math.PI) * 55; this.y = this.fromY + (this.floor + 55 - this.fromY) * t; this.hull.rotation += dt * .006; this.hull.setAlpha(1 - Math.max(0, t - .7) / .3); if (!this.fired && t > .75) { this.fired++; const v = this.ctx.camera.view(); this.ctx.events.emit('water:splash', { x: Math.min(v.right - 24, this.x + 50), y: this.floor + 32, size: 'xl', kind: 'sink' }); this.boom(this.x, this.floor + 16, 'xl'); } }
            if (this.elapsed >= this.deathPops * 260 && this.deathPops < 10) { this.deathPops++; this.boom(this.x + this.ctx.rng.range(-45, 45), this.y - this.ctx.rng.range(5, 50), this.deathPops % 3 === 0 ? 'm' : 's'); }
            if (this.elapsed >= this.duration) { this.ctx.events.emit('enemy:killed', { kind: this.kind, x: this.x, y: this.y, score: BAYOU_BOSSES[this.kind].score, cause: 'explosion' }); this.ctx.events.emit('boss:defeated', this.info()); this.destroy(); } return;
        }
        this.clamp(); this.updateEggs(dt);
        if (this.ventMs <= 0) { this.ventMs = this.phase === 3 ? 260 : this.phase === 2 ? 450 : 800; this.ctx.events.emit('fx:emit', { effect: this.phase > 1 ? 'smoke_stack' : 'steam', x: this.x + 18, y: this.y - (this.kind === 'shellshock' ? 57 : 15), count: this.phase, scale: .5 }); }
        if (this.state === 'intro') {
            this.pose('intro'); if (this.head) { this.head.setVisible(this.elapsed > 600); this.hull.y = Math.max(0, 24 * (1 - this.elapsed / 850)); }
            else this.hull.y = -Math.min(36, Math.max(0, this.y - this.ctx.camera.view().top - 100)) * Math.max(0, 1 - this.elapsed / 1100);
            if (this.elapsed >= 1100) { this.hull.y = 0; this.enter('idle', 800); this.pose('idle'); } return;
        }
        const p = this.ctx.player();
        if (this.head) {
            const hidden = this.state === 'spin_cue' || this.state === 'spin'; this.head.setVisible(!hidden); this.hull.setFlipX(this.direction > 0); this.head.setFlipX(this.direction > 0);
            this.head.setPosition(this.direction * (48 + this.extension), this.high ? -27 : -10); this.head.rotation = this.state === 'snap_cue' ? (this.high ? .25 : -.25) * -this.direction : 0;
        }
        if (this.kind === 'shellshock') {
            if (this.state === 'idle') {
                this.extension = 0; this.pose('idle');
                if (this.elapsed >= this.duration && p?.alive()) { this.direction = p.x < this.x ? -1 : 1; this.clamp(); const attack = this.cycle++ % 4;
                    if (attack === 0 || attack === 2) { this.high = attack === 0; this.enter('snap_cue', 650); this.pose('idle'); this.ctx.audio.sfx('turtle_hiss', { x: this.x }); }
                    else if (attack === 1) { this.prepareEggs(); this.enter('eggs', 1350); this.pose('eggs'); }
                    else { this.enter('spin_cue', 700); this.pose('spin_cue'); this.spinBounces = 0; }
                }
            } else if (this.state === 'snap_cue') {
                this.pose('idle'); const y = this.y - (this.high ? 24 : 6); this.cue.lineStyle(1, 0xd4483a, .65).lineBetween(this.x + this.direction * 45, y, this.x + this.direction * 112, y);
                if (this.elapsed >= 650) { this.enter('snap', 350); this.pose('idle'); this.ctx.audio.sfx('turtle_snap', { x: this.x }); }
            } else if (this.state === 'snap') { const t = Math.min(1, this.elapsed / 350); this.extension = Math.sin(t * Math.PI) * 40; this.pose('idle'); const reach = 52 + this.extension + 20; this.touch(this.attack.setTo(this.x + (this.direction < 0 ? -reach : 30), this.y - (this.high ? 29 : 10), reach - 30, this.high ? 9 : 8)); if (t >= 1) { this.extension = 0; this.enter('idle', 950); } }
            else if (this.state === 'eggs') { this.pose('eggs'); for (const x of this.marks) this.mark(x, this.ctx.physics.groundBelow(x, this.floor - 96, 128) ?? this.floor); if (this.elapsed >= 650 + this.fired * 180 && this.fired < 3) this.launchEgg(this.fired++); if (this.elapsed >= this.duration) { this.marks.length = 0; this.enter('idle', 1800); } }
            else if (this.state === 'spin_cue') { this.pose('spin_cue'); this.cue.lineStyle(1, 0xffe066).strokeEllipse(this.x, this.y - 5, 112, 9); if (this.elapsed >= 700) { this.enter('spin', 4200); this.pose('spin'); } }
            else if (this.state === 'spin') { this.pose('spin'); const v = this.ctx.camera.view(), min = Math.max(this.arena0, v.left) + 104, max = Math.min(this.arena1, v.right) - 104; this.x += this.direction * dt * (this.phase === 3 ? .24 : .19);
                if (this.x <= min || this.x >= max) { this.x = Phaser.Math.Clamp(this.x, min, max); this.direction *= -1; this.spinBounces++; this.ctx.audio.sfx('shell_clank', { x: this.x }); }
                this.touch(this.attack.setTo(this.x - 48, this.y - 23, 96, 23)); if (this.spinBounces >= 3 || this.elapsed >= this.duration) { this.enter('idle', 1150); this.pose('idle'); }
            }
        } else {
            if (this.state === 'idle') { this.pose('idle'); this.y = this.floor - 90 + Math.sin(this.life / (this.phase === 3 ? 140 : 450)) * (this.phase === 3 ? 10 : 5); this.x += Math.sin(this.life / 850) * dt * .012; this.clamp();
                if (this.elapsed >= this.duration && p?.alive()) { const a = this.cycle++ % 3;
                    if (a === 0) { this.targetX = Phaser.Math.Clamp(p.x + 62, this.ctx.camera.view().left + 80, this.ctx.camera.view().right - 80); this.targetY = this.floor - 33; this.fromX = this.x; this.fromY = this.y; this.enter('laser', 700); this.pose('laser'); this.ctx.audio.sfx('skeeter_laser', { x: this.x }); }
                    else if (a === 1) { this.prepareEggs(); this.enter('larva', 1350); this.pose('larva'); }
                    else { this.targetX = p.x; this.targetY = p.centerY; this.enter('fan_cue', 600); this.pose('fan_cue'); this.ctx.audio.sfx('stinger_fire', { x: this.x }); }
                }
            } else if (this.state === 'laser') {
                this.pose('laser'); this.cue.lineStyle(1, 0xd4483a, .9).lineBetween(this.x - 62, this.y + 31, this.targetX - 62, this.floor); this.mark(this.targetX - 62, this.floor, 18);
                if (this.elapsed >= 700) { this.enter('dive', this.phase === 3 ? 340 : 440); this.pose('dive'); this.ctx.audio.sfx('skeeter_dive', { x: this.x }); }
            } else if (this.state === 'dive') { const t = Math.min(1, this.elapsed / this.duration); this.x = Phaser.Math.Linear(this.fromX, this.targetX, t); this.y = Phaser.Math.Linear(this.fromY, this.targetY, t); this.touch(this.attack.setTo(this.x - 68, this.y + 13, 20, 28)); this.clamp(); if (t >= 1) { this.enter('stuck', 700); this.pose('stuck'); this.ctx.audio.sfx('skeeter_drill', { x: this.x }); this.ctx.events.emit('fx:shake', { tier: 2 }); } }
            else if (this.state === 'stuck') { this.pose('stuck'); this.hull.y = Math.sin(this.life / 35); if (this.elapsed >= 700) { this.hull.y = 0; this.enter('recover', 700); this.pose('idle'); } }
            else if (this.state === 'recover') { this.y += (this.floor - 90 - this.y) * Math.min(1, dt / 220); if (this.elapsed >= 700) this.enter('idle', 750); }
            else if (this.state === 'larva') { this.pose('larva'); for (const x of this.marks) this.mark(x, this.floor); if (this.elapsed >= 650 + this.fired * 180 && this.fired < 3) this.launchEgg(this.fired++); if (this.elapsed >= this.duration) { this.marks.length = 0; this.enter('idle', 1400); } }
            else if (this.state === 'fan_cue') { this.pose('fan_cue'); const a = Math.atan2(this.targetY - this.y, this.targetX - this.x); for (let i = -2; i <= 2; i++) this.cue.lineStyle(1, 0xffe066, .45).lineBetween(this.x, this.y + 25, this.x + Math.cos(a + i * .3) * 70, this.y + 25 + Math.sin(a + i * .3) * 70); if (this.elapsed >= 600) { this.enter('fan', 400); this.pose('fan'); const a = Math.atan2(this.targetY - (this.y + 25), this.targetX - this.x); for (let i = -2; i <= 2; i++) this.ctx.projectiles.spawn({ x: this.x, y: this.y + 25, vx: Math.cos(a + i * .32) * 92, vy: Math.sin(a + i * .32) * 92, team: 'enemy', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', rotate: false, lifetime: 3800 }); this.ctx.audio.sfx('stinger_fire', { x: this.x }); } }
            else if (this.state === 'fan') { this.pose('fan'); if (this.elapsed >= 400) this.enter('idle', 1200); }
        }
        this.clamp();
    }
    snapshot(): unknown { return { name: this.info().name, kind: this.kind, hp: this.hp, maxHp: BAYOU_BOSSES[this.kind].hp, phase: this.phase, state: this.state, x: this.x, y: this.y, floor: this.floor, elapsed: this.elapsed, duration: this.duration, targetX: this.targetX, targetY: this.targetY, high: this.high, extension: this.extension, spinBounces: this.spinBounces, eggs: this.eggs.filter(e => e.live).length, adds: this.adds.size }; }
}
