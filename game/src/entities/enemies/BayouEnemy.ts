import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo } from '../../core';
import { getAudio, type LoopHandle } from '../../audio';
import { ENEMIES } from '../../config/tuning/enemies';
import { animate, visible } from './Enemy';
import { BossFlash } from '../bosses/BossFlash';

export type BayouKind = 'piranha' | 'hopper' | 'gnat' | 'airboat';
/** Fixed targets, bounded entries and one clock per state; no timers outlive the actor. */
export class BayouEnemy extends Phaser.GameObjects.Sprite {
    hp: number;
    state = 'idle';
    readonly wave: unknown;
    private facing: number;
    private elapsed = 0;
    private duration = 900;
    private age = 0;
    private homeX: number;
    private floor: number;
    private fromX = 0;
    private fromY = 0;
    private targetX = 0;
    private targetY = 0;
    private turns = 0;
    private fired = 0;
    private dropped = 0;
    private contactMs = 0;
    private knockMs = 0;
    private knockDir = 0;
    private readonly patrol: number;
    private readonly testWater: boolean;
    private loop: LoopHandle | null = null;
    private loopRetryMs = 0;
    private poseTag = '';
    private hurtMs = 0;
    private landMs = 0;
    private splashMs = 0;
    private fireMs = 0;
    private wakeMs = 0;
    private smokeMs = 0;
    private readonly flash = new BossFlash();
    private readonly rect = new Phaser.Geom.Rectangle();
    private readonly attack = new Phaser.Geom.Rectangle();
    private cue: Phaser.GameObjects.Graphics | null = null;
    private cueUsed = false;
    private cueShape = '';
    private cueX = 0;
    private cueY = 0;
    private cueEndX = 0;
    private cueEndY = 0;
    private cueColor = 0;
    private cueAlpha = 0;
    private cueWidth = 0;
    private readonly offs: Array<() => void> = [];
    constructor(private readonly ctx: GameContext, readonly kind: BayouKind, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y, kind); ctx.scene.add.existing(this); this.setDepth(DEPTH.ENEMIES).setOrigin(.5, kind === 'gnat' || kind === 'piranha' ? .5 : 1);
        this.testWater = props.testWater === true; this.hp = ENEMIES[kind].hp; this.wave = props.wave; this.facing = props.facing === 'right' || Number(props.facing) === 1 ? 1 : -1; this.setFlipX(this.facing < 0);
        this.patrol = props.patrol === false ? 0 : Number.isFinite(Number(props.patrol)) ? Math.abs(Number(props.patrol)) : 48;
        this.homeX = x; this.floor = kind === 'airboat' ? Number(props.laneY ?? props.waterY ?? (ctx.part.id === '2-2' ? 344 : y)) : y; this.y = this.floor;
        this.offs.push(ctx.damage.register({ team: 'enemy', kind, owner: this, material: 'metal', body: () => this.bounds(), alive: () => this.active && this.hp > 0 && (kind !== 'piranha' || this.state === 'attack'), hit: h => this.hit(h) }), ctx.onUpdate((dt, raw) => { this.flash.update(raw); this.tick(dt, raw); }));
        if (props.from === 'door') this.enter('entry', 700);
        if (props.sleep || props.idle === 'sleep') this.enter('sleep', 0);
        const stop = () => this.stopLoop(); ctx.scene.events.once('shutdown', stop);
        this.once('destroy', () => { this.stopLoop(); this.flash.clear(); this.cue?.destroy(); for (const off of this.offs) off(); ctx.scene.events.off('shutdown', stop); });
        if (Number(props.graceMs) > 0) this.duration = Number(props.graceMs);
        this.updatePose(); this.clamp();
    }
    private pose(tag: string, loop = false, restart = false): void {
        if (tag === this.poseTag && !restart) return;
        if (restart) this.anims.stop();
        animate(this, `${this.kind}_${tag}`, loop); this.poseTag = tag;
    }
    /** Cosmetic poses sample the existing combat clock; they never delay an attack. */
    private updatePose(): void {
        if (this.hp <= 0) { this.pose(this.kind === 'airboat' ? 'sink' : this.kind === 'piranha' ? 'break' : this.kind === 'gnat' ? 'pop' : 'death'); return; }
        if (this.hurtMs > 0 && (this.kind === 'hopper' || this.kind === 'airboat' && this.fireMs <= 0)) { this.pose('hurt'); return; }
        if (this.kind === 'hopper') {
            this.pose(this.state === 'cue' ? this.elapsed < 150 ? 'croak' : 'crouch' : this.state === 'attack' ? 'hop' : this.state === 'tongue_cue' || this.state === 'tongue' ? this.state : this.landMs > 0 ? 'land' : 'idle', this.state === 'idle' && this.landMs <= 0);
        } else if (this.kind === 'piranha') {
            this.pose(this.state === 'cue' ? 'bulge' : this.state === 'attack' ? this.elapsed < 300 ? 'leap' : this.elapsed < 450 ? 'bite' : 'fall' : this.splashMs > 0 ? 'splash' : 'swim', this.state === 'idle' && this.splashMs <= 0);
        } else if (this.kind === 'gnat') {
            this.pose(this.state === 'cue' ? 'dive_cue' : this.state === 'attack' ? 'dive' : this.state === 'recover' ? 'recover' : 'hover', this.state !== 'cue');
        } else {
            const tag = this.fireMs > 0 ? 'fire' : this.state === 'cue' && this.fired === 0 ? 'gun_cue' : 'cruise';
            this.pose(this.hp <= ENEMIES.airboat.hp / 2 ? tag === 'fire' ? 'fire_damaged' : tag === 'gun_cue' ? 'gun_cue_damaged' : 'cruise_damaged' : tag, tag === 'cruise');
        }
    }
    private drawTongue(length: number): void {
        const w = Math.round(length), x = Math.round(this.x), y = Math.round(this.y - 17), end = x + this.facing * w;
        this.cueUsed = true;
        if (this.cueShape === 'tongue' && this.cueX === x && this.cueY === y && this.cueEndX === end) return;
        this.cue ??= this.ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES + .1);
        const g = this.cue.clear().setVisible(true);
        // The cable starts inside the mouth and its steel claw ends on the 64 px hit line.
        const start = x + this.facing * Math.min(14, w);
        g.lineStyle(5, 0x1a1220).lineBetween(start, y, end, y);
        g.lineStyle(3, 0xa02a26).lineBetween(start, y, end, y);
        g.lineStyle(1, 0xf07a5a).lineBetween(start, y - 1, end, y - 1);
        for (let d = 18; d < w - 3; d += 6) { const sx = x + this.facing * d; g.lineStyle(1, 0x6b1a1e).lineBetween(sx, y - 1, sx, y + 1); }
        if (w > 16) {
            const back = end - this.facing * 5;
            g.lineStyle(3, 0x1c2433).lineBetween(back, y - 3, end, y - 2).lineBetween(back, y + 3, end, y + 2);
            g.lineStyle(1, 0xa9bccb).lineBetween(back, y - 3, end, y - 2).lineBetween(back, y + 3, end, y + 2);
            g.fillStyle(0xffae22).fillRect(back - 1, y - 1, 2, 2);
        }
        this.cueShape = 'tongue'; this.cueX = x; this.cueY = y; this.cueEndX = end;
    }
    private land(): void {
        this.landMs = 180;
        this.ctx.audio.sfx('hopper_land', { x: this.x });
        const material = this.ctx.physics.materialAt(this.x, this.floor + 1);
        if (material === 'water' || this.ctx.physics.hazardAt(this.x, this.floor + 2) === 'water') this.splash('enter');
        else this.ctx.events.emit('fx:emit', { effect: material === 'mud' ? 'mud_splat' : 'dust_land', x: this.x, y: this.floor, material, scale: .8 });
    }
    private boatMotion(dt: number): void {
        this.wakeMs -= dt; this.smokeMs -= dt;
        if ((this.patrol > 0 || (!this.ctx.camera.isLocked() && this.age >= 9000)) && this.wakeMs <= 0) {
            this.wakeMs = 100;
            this.ctx.events.emit('fx:emit', { effect: 'boat_wake', x: this.x, y: this.floor, angle: this.facing < 0 ? Math.PI : 0, scale: 1 });
        }
        if (this.hp <= ENEMIES.airboat.hp / 2 && this.smokeMs <= 0) {
            this.smokeMs = 150;
            this.ctx.events.emit('fx:emit', { effect: 'smoke_trail', x: this.x - this.facing * 28, y: this.y - 22, scale: .65 });
        }
    }
    private clearCue(): void {
        if (!this.cueShape) return;
        this.cue?.clear().setVisible(false); this.cueShape = '';
    }
    private drawCue(shape: 'line' | 'ellipse', x: number, y: number, endX: number, endY: number, color: number, alpha = 1, width = 1): void {
        this.cueUsed = true;
        if (shape === this.cueShape && x === this.cueX && y === this.cueY && endX === this.cueEndX && endY === this.cueEndY && color === this.cueColor && alpha === this.cueAlpha && width === this.cueWidth) return;
        this.cue ??= this.ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES + .1);
        this.cue.clear().setVisible(true).lineStyle(width, color, alpha);
        if (shape === 'line') this.cue.lineBetween(x, y, endX, endY); else this.cue.strokeEllipse(x, y, endX, endY);
        this.cueShape = shape; this.cueX = x; this.cueY = y; this.cueEndX = endX; this.cueEndY = endY; this.cueColor = color; this.cueAlpha = alpha; this.cueWidth = width;
    }
    private enter(s: string, ms: number): void { this.state = s; this.elapsed = 0; this.duration = ms; this.fired = 0; }
    private bounds(): Phaser.Geom.Rectangle {
        const w = this.kind === 'airboat' ? 82 : this.kind === 'hopper' ? 34 : this.kind === 'piranha' ? 27 : 20;
        const h = this.kind === 'airboat' ? 38 : this.kind === 'hopper' ? 29 : 16;
        return this.rect.setTo(this.x - w / 2, this.y - (this.kind === 'gnat' || this.kind === 'piranha' ? h / 2 : h), w, h);
    }
    private stopLoop(): void { this.loop?.stop(0); this.loop = null; this.loopRetryMs = 0; }
    private hit(h: HitInfo): boolean {
        if (this.hp <= 0) return false;
        this.hp -= h.damage; this.flash.start([this], this.hp <= 0);
        this.hurtMs = 140;
        if (this.hp > 0 && this.kind === 'hopper' && h.weapon === 'shotgun' && this.state !== 'attack') { this.knockMs = 160; this.knockDir = Math.sign(h.dirX); }
        if (this.hp <= 0) {
            this.enter('death', this.kind === 'airboat' ? 1200 : 600); this.updatePose(); this.stopLoop(); this.clearCue();
            this.ctx.events.emit('enemy:killed', { kind: this.kind, x: this.x, y: this.y, score: ENEMIES[this.kind].score, cause: h.kind });
            this.ctx.events.emit('explosion', { x: this.x, y: this.y - 12, size: this.kind === 'airboat' ? 'm' : 's', team: 'enemy' });
            this.ctx.events.emit('fx:emit', { effect: 'mech_pop', x: this.x, y: this.y - (this.kind === 'hopper' ? 17 : this.kind === 'airboat' ? 20 : 0), material: 'metal', scale: this.kind === 'airboat' ? 1.5 : this.kind === 'hopper' ? .8 : this.kind === 'piranha' ? .6 : .5 });
            this.ctx.audio.sfx(this.kind === 'airboat' ? 'airboat_sink' : 'mech_pop', { x: this.x });
            if (this.kind === 'airboat' || this.kind === 'piranha') this.splash('sink');
        }
        this.updatePose();
        return true;
    }
    private splash(kind: 'leap' | 'enter' | 'sink'): void { this.ctx.events.emit('water:splash', { x: this.x, y: this.floor, size: this.kind === 'airboat' ? 'l' : 's', kind }); }
    private clamp(): void {
        if (this.hp <= 0) return;
        const v = this.ctx.camera.view();
        // The HUD/radio band is reserved even during an unlocked fly-by.
        if (this.kind === 'gnat') { this.floor = Phaser.Math.Clamp(this.floor, v.top + 88, v.bottom - 55); this.y = Phaser.Math.Clamp(this.y, v.top + 76, v.bottom - 18); }
        if (!this.ctx.camera.isLocked()) return;
        const m = this.kind === 'airboat' ? 56 : 26;
        const nx = Phaser.Math.Clamp(this.x, v.left + m, v.right - m); if (nx !== this.x) this.facing = nx > this.x ? 1 : -1; this.x = nx;
        this.homeX = Phaser.Math.Clamp(this.homeX, v.left + m, v.right - m);
        if (this.kind === 'piranha') { this.floor = Phaser.Math.Clamp(this.floor, v.top + 100, v.bottom - 20); this.y = Phaser.Math.Clamp(this.y, v.top + 64, v.bottom - 12); }
        else if (this.kind === 'airboat') { this.floor = Phaser.Math.Clamp(this.floor, v.top + 110, v.bottom - 8); this.y = this.floor + Math.sin(this.age / 250) * 2; }
        else if (this.floor < v.top + 40 || this.floor > v.bottom) { this.floor = this.ctx.physics.groundBelow(this.x, v.top + 40, v.height) ?? this.ctx.player()?.y ?? this.floor; this.y = this.floor; }
    }
    private touch(r: Phaser.Geom.Rectangle): void {
        if (this.contactMs > 0) return;
        const boxes = this.ctx.damage.queryRect(r, 'enemy');
        for (const box of boxes) this.ctx.damage.deal(box, { x: r.centerX, y: r.centerY, damage: 1, source: 'enemy', kind: 'contact', dirX: this.facing, dirY: 0 });
        this.contactMs = 150;
    }
    private safeHopX(x: number): number {
        if (this.ctx.camera.isLocked()) { const v = this.ctx.camera.view(); x = Phaser.Math.Clamp(x, v.left + 26, v.right - 26); }
        // A hopper never changes decks or commits to a gap. Probe the full landing path.
        const count = Math.ceil(Math.abs(x - this.x) / 8);
        for (let i = 1; i <= count; i++) { const nx = this.x + (x - this.x) * i / count; const floor = this.ctx.physics.groundBelow(nx, this.floor - 4, 8); if (floor === null || Math.abs(floor - this.floor) > 2 || this.ctx.physics.hazardAt(nx, this.floor + 2) || this.ctx.level.solidAt(nx, this.floor - 16)) return this.x; }
        return x;
    }
    private tick(dt: number, raw: number): void {
        if (!this.active) return;
        this.clamp();
        this.loopRetryMs = Math.max(0, this.loopRetryMs - raw);
        if (this.hp > 0 && (this.kind === 'gnat' || this.kind === 'airboat') && visible(this.ctx, this.x, this.y, 32)) {
            const a = getAudio(this.ctx.scene);
            if (!this.loop?.active && this.loopRetryMs <= 0 && !a.locked) { this.loop = a.loop(this.kind === 'gnat' ? 'gnat_buzz' : 'airboat_motor', { x: this.x }); this.loopRetryMs = 500; }
            if (this.loop?.active) this.loop.setX(this.x);
        } else this.stopLoop();
        if (!dt) return;
        if (this.hp > 0 && this.x < this.ctx.camera.leftEdge() - 96) { this.destroy(); return; }
        if (this.hp > 0 && !visible(this.ctx, this.x, this.y, this.kind === 'piranha' ? 0 : 32)) { this.clearCue(); if (this.kind === 'airboat' && this.age >= 9000 && !this.ctx.camera.isLocked()) this.destroy(); return; }
        this.elapsed += dt; this.age += dt; this.contactMs -= dt; this.cueUsed = false;
        this.hurtMs = Math.max(0, this.hurtMs - dt); this.landMs = Math.max(0, this.landMs - dt); this.splashMs = Math.max(0, this.splashMs - dt); this.fireMs = Math.max(0, this.fireMs - dt);
        if (this.state === 'death') { this.stopLoop(); if (this.kind === 'airboat') { this.y += dt * .035; this.rotation -= dt * .0002; } if (this.elapsed >= this.duration) this.destroy(); return; }
        const p = this.ctx.player();
        this.setFlipX(this.facing < 0);
        if (this.state === 'sleep') { this.clearCue(); if (p?.alive() && Math.abs(p.x - this.x) < 150) this.enter('idle', 700); this.updatePose(); return; }
        if (this.state === 'entry') { this.clearCue(); this.updatePose(); if (this.elapsed >= this.duration) this.enter('idle', 700); return; }
        if (this.knockMs > 0) { this.clearCue(); this.knockMs = Math.max(0, this.knockMs - dt); this.x = this.safeHopX(this.x + this.knockDir * dt * .13 * this.knockMs / 160); this.clamp(); this.updatePose(); return; }
        if (this.kind === 'piranha') {
            if (this.state === 'idle') { this.setAlpha(1); this.y = this.floor; this.drawCue('ellipse', this.x, this.floor, 14 + Math.sin(this.age / 130) * 4, 4, 0xa9bccb, .6);
                if (this.elapsed >= this.duration && p?.alive() && Math.abs(p.x - this.x) < 180 && visible(this.ctx, this.x, this.floor) && (this.testWater || this.ctx.physics.hazardAt(this.x, this.floor + 8) === 'water')) { this.enter('cue', 500); this.targetX = this.x + (p.x < this.x ? -1 : 1) * 48; if (this.ctx.camera.isLocked()) { const v = this.ctx.camera.view(); this.targetX = Phaser.Math.Clamp(this.targetX, v.left + 26, v.right - 26); } }
            } else if (this.state === 'cue') { this.drawCue('ellipse', this.x, this.floor, 28 + Math.sin(this.age / 60) * 4, 5, 0xffe066); if (this.elapsed >= 500) { this.fromX = this.x; this.enter('attack', 850); this.updatePose(); this.setAlpha(1); this.splash('leap'); this.ctx.audio.sfx('piranha_leap', { x: this.x }); } }
            else { const t = Math.min(1, this.elapsed / 850); this.x = Phaser.Math.Linear(this.fromX, this.targetX, t); this.y = this.floor - Math.sin(t * Math.PI) * 80; this.touch(this.bounds()); if (!this.fired && t > .35) { this.fired++; this.ctx.audio.sfx('piranha_bite', { x: this.x }); } if (t >= 1) { this.splash('enter'); this.splashMs = 240; this.enter('idle', 1500); } }
        } else if (this.kind === 'hopper') {
            if (this.state === 'cue' && this.elapsed >= 450) { this.fromX = this.x; this.enter('attack', 720); this.updatePose(); this.ctx.audio.sfx('hopper_hop', { x: this.x }); }
            else if (this.state === 'attack') { const t = Math.min(1, this.elapsed / 720); this.x = Phaser.Math.Linear(this.fromX, this.targetX, t); this.y = this.floor - Math.sin(t * Math.PI) * 58; this.touch(this.bounds()); if (t >= 1) { this.y = this.floor; this.enter('idle', 950); this.land(); this.updatePose(); } }
            else if (this.state === 'tongue_cue') { this.drawCue('line', this.x, this.y - 17, this.x + this.facing * 64, this.y - 17, 0xffe066, .7); if (this.elapsed >= 500) { this.enter('tongue', 220); this.updatePose(); this.ctx.audio.sfx('hopper_tongue', { x: this.x }); } }
            else if (this.state === 'tongue') { const w = 64 * Math.sin(Math.min(1, this.elapsed / 220) * Math.PI); this.drawTongue(w); this.touch(this.attack.setTo(this.x + (this.facing < 0 ? -w : 0), this.y - 20, w, 5)); if (this.elapsed >= 220) { this.enter('idle', 950); this.updatePose(); } }
            else if (this.state === 'idle' && this.elapsed >= this.duration && p?.alive() && Math.abs(p.x - this.x) < 190) { this.facing = p.x < this.x ? -1 : 1; if (++this.turns % 2 === 0) { this.enter('tongue_cue', 500); this.updatePose(); this.ctx.audio.sfx('hopper_croak', { x: this.x }); } else { this.targetX = this.safeHopX(this.x + this.facing * Math.min(96, Math.abs(p.x - this.x))); this.enter('cue', 450); this.updatePose(); this.ctx.audio.sfx('hopper_croak', { x: this.x }); } }
        } else if (this.kind === 'gnat') {
            if (this.state === 'idle') { if (this.patrol) this.x += this.facing * dt * .038; this.y = this.floor + Math.sin(this.age / 230) * 10; if (Math.abs(this.x - this.homeX) >= this.patrol) this.facing = this.x > this.homeX ? -1 : 1; if (this.elapsed >= this.duration && p?.alive() && Math.abs(p.x - this.x) < 180) { this.targetX = p.x; this.targetY = p.centerY; this.fromX = this.x; this.fromY = this.y; this.enter('cue', 400); this.updatePose(); } }
            else if (this.state === 'cue') { this.drawCue('line', this.x, this.y, this.targetX, this.targetY, 0xd4483a, .6); if (this.elapsed >= 400) { this.enter('attack', 650); this.updatePose(); } }
            else if (this.state === 'attack') { const t = Math.min(1, this.elapsed / 650); this.x = Phaser.Math.Linear(this.fromX, this.targetX, t); this.y = Phaser.Math.Linear(this.fromY, this.targetY, t); this.touch(this.bounds()); if (t >= 1) this.enter('recover', 650); }
            else if (this.state === 'recover') { this.y += (this.floor - this.y) * Math.min(1, dt / 200); if (this.elapsed >= 650) { this.enter('idle', 1400); this.updatePose(); } }
        } else {
            this.boatMotion(dt);
            this.y = this.floor + Math.sin(this.age / 250) * 2;
            if (!this.ctx.camera.isLocked() && this.age >= 9000) { this.clearCue(); this.pose(this.hp <= ENEMIES.airboat.hp / 2 ? 'cruise_damaged' : 'cruise', true); this.x += this.facing * dt * .12; if (!visible(this.ctx, this.x, this.y, 56)) this.destroy(); return; }
            if (this.patrol) this.x += this.facing * dt * .03; if (Math.abs(this.x - this.homeX) > this.patrol) this.facing *= -1;
            if (this.dropped < 2 && this.age >= 1600 + this.dropped * 2400) { this.dropped++; const v = this.ctx.camera.view(); const x = Phaser.Math.Clamp(this.x, v.left + 28, v.right - 28); const y = this.ctx.physics.groundBelow(x, v.top + 60, v.height) ?? p?.y ?? this.floor - 32; this.ctx.spawn('enemy', 'leaper', { facing: this.facing, wave: this.wave }, x, y); }
            if (this.state === 'idle' && this.elapsed >= this.duration && p?.alive()) { this.targetX = p.x; this.targetY = p.centerY; this.enter('cue', 1100); this.updatePose(); }
            else if (this.state === 'cue') { this.drawCue('line', this.x + this.facing * 32, this.y - 28, this.targetX, this.targetY, 0xffe066, .7); if (this.elapsed >= 600 + this.fired * 170 && this.fired < 3) { this.fired++; const a = Math.atan2(this.targetY - (this.y - 28), this.targetX - (this.x + this.facing * 32)); this.ctx.projectiles.spawn({ x: this.x + this.facing * 32, y: this.y - 28, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, team: 'enemy', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', rotate: false, lifetime: 2600 }); this.ctx.audio.sfx('airboat_gun', { x: this.x }); this.fireMs = 170; this.pose(this.hp <= ENEMIES.airboat.hp / 2 ? 'fire_damaged' : 'fire', false, true); } if (this.elapsed >= 1100) { this.enter('idle', 2000); this.updatePose(); } }
        }
        if (!this.cueUsed) this.clearCue();
        this.clamp(); this.updatePose();
    }
    snapshot(): unknown { return { kind: this.kind, x: this.x, y: this.y, hp: this.hp, state: this.state, wave: this.wave, elapsed: this.elapsed, floor: this.floor, targetX: this.targetX, targetY: this.targetY, dropped: this.dropped, pose: this.poseTag, facing: this.facing, hurtMs: this.hurtMs, landMs: this.landMs, fired: this.fired }; }
}
