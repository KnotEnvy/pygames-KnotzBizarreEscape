import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo } from '../../core';
import { getAudio, type LoopHandle } from '../../audio';
import { ENEMIES } from '../../config/tuning/enemies';
import { animate, visible } from './Enemy';
import { settings } from '../../core/settings';

type Kind = 'hound' | 'buzzard';
const DAMAGED: Readonly<Record<string, string>> = { cruise: 'damaged', aim: 'damaged_aim', strafe: 'damaged_strafe', fire: 'damaged_fire' };
/** Ground packs and gunship passes; locked-view correction always precedes dormancy. */
export class AssaultEnemy extends Phaser.GameObjects.Sprite {
    hp: number;
    state = 'patrol';
    readonly wave: unknown;
    private age = 0;
    private clock = 1000;
    private elapsed = 0;
    private facing: number;
    private startY: number;
    private startX: number;
    private targetX = 0;
    private targetY = 0;
    private dropped = 0;
    private fired = 0;
    private flash = 0;
    private contact = 0;
    private hurtMs = 0;
    private muzzleMs = 0;
    private smokeMs = 0;
    private washMs = 0;
    private crashed = false;
    private visualTag = '';
    private buzz: LoopHandle | null = null;
    private buzzRetryMs = 0;
    private readonly cue: Phaser.GameObjects.Graphics;
    private readonly rect = new Phaser.Geom.Rectangle();
    private readonly offs: Array<() => void> = [];
    constructor(private readonly ctx: GameContext, readonly kind: Kind, x: number, y: number, props: Record<string, unknown>) {
        super(ctx.scene, x, y, kind); ctx.scene.add.existing(this); this.setOrigin(.5, kind === 'hound' ? 1 : .5).setDepth(DEPTH.ENEMIES);
        this.hp = ENEMIES[kind].hp; this.wave = props.wave; this.facing = Number(props.facing) === 1 || props.facing === 'right' ? 1 : -1;
        this.startY = y; this.startX = x;
        this.cue = ctx.scene.add.graphics().setDepth(DEPTH.ENEMIES - 1);
        this.offs.push(ctx.damage.register({ team: 'enemy', material: kind === 'hound' ? 'flesh' : 'metal', kind, owner: this,
            body: () => this.rect.setTo(this.x + (kind === 'hound' ? -17 : this.facing * 8 - 35), this.y - (kind === 'hound' ? 21 : 12), kind === 'hound' ? 34 : 70, kind === 'hound' ? 21 : 30),
            alive: () => this.active && this.hp > 0, hit: h => this.hit(h) }), ctx.onUpdate((dt, raw) => this.tick(dt, raw)));
        const stop = () => { this.buzz?.stop(0); this.buzz = null; };
        ctx.scene.events.once('shutdown', stop);
        this.once('destroy', () => { stop(); ctx.scene.events.off('shutdown', stop); this.cue.destroy(); for (const off of this.offs) off(); });
        this.setFlipX(this.facing < 0);
        this.pose(kind === 'hound' ? 'run' : 'cruise', true);
    }
    private pose(tag: string, loop = false): void {
        const damaged = this.kind === 'buzzard' && this.hp > 0 && this.hp <= ENEMIES.buzzard.hp / 2;
        const key = damaged ? DAMAGED[tag] ?? tag : tag;
        if (this.visualTag === key && this.anims.isPlaying) return;
        this.visualTag = key;
        animate(this, `${this.kind}_${key}`, loop);
    }
    private visual(): void {
        if (this.hurtMs > 0) { this.pose('hurt'); return; }
        if (this.kind === 'buzzard') {
            this.pose(this.muzzleMs > 0 ? 'fire' : this.state === 'strafe' ? this.elapsed < 560 ? 'aim' : 'strafe' : 'cruise', this.muzzleMs <= 0);
        } else this.pose(this.state === 'windup' ? 'crouch' : this.state === 'leap' ? 'leap' : this.state === 'recover' ? this.elapsed < 400 ? 'land' : 'idle' : 'run', this.state !== 'leap');
    }
    /** Use the topmost water/deck/ground surface below the hull, including shallow river water. */
    private surface(): number | null {
        const floor = this.ctx.physics.groundBelow(this.x, this.y + 12, 240);
        const water = this.ctx.physics.waterSurfaceAt(this.x);
        return water !== null && water >= this.y + 12 && (floor === null || water < floor) ? water : floor;
    }
    private atmosphere(dt: number): void {
        this.smokeMs -= dt; this.washMs -= dt;
        if ((this.hp <= ENEMIES.buzzard.hp / 2 || this.state === 'death') && this.smokeMs <= 0) {
            this.smokeMs = 150;
            this.ctx.events.emit('fx:emit', { effect: 'smoke_trail', x: this.x - this.facing * 16, y: this.y - 9, scale: this.state === 'death' ? 1.1 : .7 });
        }
        if (this.state === 'death' || this.washMs > 0) return;
        this.washMs = 120;
        const floor = this.surface();
        if (floor === null || floor - this.y > 90 || floor < this.y) return;
        const water = this.ctx.physics.waterSurfaceAt(this.x);
        const material = water !== null && Math.abs(water - floor) < 2 ? 'water' : this.ctx.physics.materialAt(this.x, floor + 2);
        this.ctx.events.emit('fx:emit', { effect: 'rotor_wash', x: this.x, y: floor, width: 80, material, count: Phaser.Math.Clamp(1 - (floor - this.y) / 110, .15, 1) });
    }
    private crash(): void {
        if (this.crashed) return;
        this.crashed = true;
        this.ctx.events.emit('explosion', { x: this.x, y: this.targetY, size: 'l', team: 'enemy' });
        this.ctx.events.emit('fx:emit', { effect: 'mech_pop', x: this.x, y: this.targetY, scale: 1.5, material: 'metal' });
        this.ctx.audio.sfx('heli_crash', { x: this.x });
    }
    private enter(state: string, ms: number): void { this.state = state; this.clock = ms; this.elapsed = 0; this.fired = 0; }
    private hit(h: HitInfo): boolean {
        if (this.hp <= 0) return false;
        this.hp -= h.damage; this.flash = 60; this.hurtMs = 180;
        const reduced = settings.get().reducedFlash;
        this.setTint(reduced ? 0xb8c8d8 : 0xffffff).setTintMode(reduced ? Phaser.TintModes.MULTIPLY : Phaser.TintModes.FILL);
        if (this.hp <= 0) {
            this.enter('death', this.kind === 'hound' ? 800 : 1200); this.pose('death'); this.buzz?.stop(0); this.buzz = null; this.cue.clear();
            this.ctx.events.emit('enemy:killed', { kind: this.kind, x: this.x, y: this.y, score: ENEMIES[this.kind].score, cause: h.kind });
            if (this.kind === 'buzzard') {
                this.startX = this.x; this.startY = this.y;
                const v = this.ctx.camera.view();
                this.targetY = Phaser.Math.Clamp(this.surface() ?? v.bottom - 8, v.top + 110, v.bottom - 8);
                this.targetX = Phaser.Math.Clamp(this.x + this.facing * 38, v.left + 56, v.right - 56);
            }
        } else {
            this.pose('hurt');
        }
        return true;
    }
    private lockedBounds(): void {
        if (!this.ctx.camera.isLocked()) return;
        const v = this.ctx.camera.view(), m = this.kind === 'buzzard' ? 56 : 24;
        const nx = Phaser.Math.Clamp(this.x, v.left + m, v.right - m);
        if (nx !== this.x) this.facing = nx > this.x ? 1 : -1;
        this.x = nx;
        if (this.kind === 'buzzard' && this.state !== 'death') this.y = Phaser.Math.Clamp(this.y, v.top + 90, v.top + 112);
        else if (this.hp > 0 && (this.y < v.top - 24 || this.y > v.bottom + 8)) {
            this.y = this.ctx.physics.groundBelow(this.x, v.top, v.height + 8) ?? Phaser.Math.Clamp(this.ctx.player()?.y ?? this.y, v.top + 24, v.bottom - 8);
            this.startY = this.y; this.targetY = this.y;
        }
    }
    private tick(dt: number, raw: number): void {
        this.buzzRetryMs = Math.max(0, this.buzzRetryMs - raw);
        if (this.flash > 0 && (this.flash -= raw) <= 0) this.clearTint();
        if (!dt || !this.active) return;
        this.lockedBounds();
        if (this.state !== 'death' && this.x < this.ctx.camera.leftEdge() - 96) { this.destroy(); return; }
        if (this.state !== 'death' && this.kind === 'buzzard' && this.age > 0 && !this.ctx.camera.isLocked() && !visible(this.ctx, this.x, this.y, 64)) { this.destroy(); return; }
        if (this.state !== 'death' && !(this.kind === 'buzzard' && this.age > 0 && !this.ctx.camera.isLocked()) && !visible(this.ctx, this.x, this.y, 32)) { this.buzz?.stop(0); this.buzz = null; return; }
        this.age += dt; this.clock -= dt; this.elapsed += dt; this.contact -= dt;
        this.hurtMs = Math.max(0, this.hurtMs - dt); this.muzzleMs = Math.max(0, this.muzzleMs - dt);
        if (this.state === 'death') {
            if (this.kind === 'buzzard') {
                const t = Math.min(1, this.elapsed / 1200), v = this.ctx.camera.view();
                this.x = Phaser.Math.Clamp(this.startX + (this.targetX - this.startX) * t, v.left + 56, v.right - 56);
                this.y = this.startY + (this.targetY - 25 - this.startY) * t * t;
                this.atmosphere(dt);
                if (this.clock <= 0) this.crash();
            }
            if (this.clock <= 0) this.destroy();
            return;
        }
        this.setFlipX(this.facing < 0);
        const p = this.ctx.player(); this.cue.clear();
        if (this.kind === 'buzzard') {
            const audio = getAudio(this.ctx.scene);
            if (!this.buzz?.active && this.buzzRetryMs <= 0 && !audio.locked) { this.buzz = audio.loop('buzzard_rotor', { x: this.x }); this.buzzRetryMs = 500; }
            if (this.buzz?.active) this.buzz.setX(this.x);
            // A free pass takes eight seconds, then exits. A locked arena retains the ship until shot down.
            if (!this.ctx.camera.isLocked() && this.age > 8000) {
                const v = this.ctx.camera.view();
                this.y = Phaser.Math.Clamp(this.y, v.top + 90, v.top + 106);
                this.pose('cruise', true); this.atmosphere(dt);
                this.x += this.facing * dt * .12;
                if (!visible(this.ctx, this.x, this.y, 28)) this.destroy();
                return;
            }
            const view = this.ctx.camera.view();
            this.y = Phaser.Math.Clamp(this.startY + Math.sin(this.age / 650) * 4, view.top + 90, view.top + 106) + (this.state === 'strafe' ? 6 : 0);
            this.x += this.facing * dt * .048; this.lockedBounds();
            this.atmosphere(dt);
            if (this.dropped < 3 && this.age >= 1200 + this.dropped * 1800) {
                this.dropped++; const v = this.ctx.camera.view();
                this.ctx.spawn('enemy', 'paratrooper', { facing: this.facing, wave: this.wave }, Phaser.Math.Clamp(this.x, v.left + 28, v.right - 28), this.y + 22);
            }
            if (this.state === 'strafe') {
                const v = this.ctx.camera.view(); const a = Math.max(v.left + 20, this.targetX - 56), b = Math.min(v.right - 20, this.targetX + 56);
                this.cue.lineStyle(1, 0xffe066, .9).lineBetween(a, this.targetY - 2, b, this.targetY - 2);
                for (let x = a; x < b; x += 16) this.cue.lineBetween(x, this.targetY - 7, x + 5, this.targetY - 2);
                if (this.elapsed >= 700 + this.fired * 180 && this.fired < 5) {
                    const mx = this.x + this.facing * 29, my = this.y + 32;
                    const tx = a + (b - a) * this.fired++ / 4, dy = this.targetY - my, dx = tx - mx, len = Math.max(1, Math.hypot(dx, dy));
                    this.ctx.projectiles.spawn({ x: mx, y: my, vx: dx / len * 125, vy: dy / len * 125, team: 'enemy', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', rotate: false, lifetime: 3000 });
                    this.ctx.events.emit('enemy:shoot', { kind: this.kind, x: mx, y: my, angle: Math.atan2(dy, dx) });
                    this.ctx.audio.sfx('buzzard_gun', { x: this.x }); this.muzzleMs = 120; this.pose('fire');
                }
                if (this.clock <= 0) { this.enter('patrol', 2400); this.pose('cruise', true); }
            } else if (this.clock <= 0 && p?.alive()) { this.targetX = p.x; this.targetY = p.y; this.enter('strafe', 1800); this.pose('aim', true); }
            this.visual();
            return;
        }
        if (this.state === 'windup') {
            this.cue.lineStyle(1, 0xffe066).lineBetween(this.x, this.y - 2, this.targetX, this.y - 2);
            if (this.clock <= 0) { this.startX = this.x; this.startY = this.y; this.enter('charge', 280); this.pose('run', true); this.ctx.audio.sfx('hound_bark'); }
        } else if (this.state === 'charge') {
            const nx = this.x + this.facing * dt * .14;
            const floor = this.ctx.physics.groundBelow(nx + this.facing * 14, this.y - 12, 30);
            if (floor !== null && !this.ctx.physics.hazardAt(nx, floor + 2) && !this.ctx.level.solidAt(nx + this.facing * 14, this.y - 10)) { this.x = nx; this.y = floor; }
            this.lockedBounds();
            if (this.contact <= 0) { this.ctx.damage.applyRadial(this.x, this.y - 8, 10, 1, 'enemy', 'contact'); this.contact = 120; }
            if (this.clock <= 0) { this.startX = this.x; this.startY = this.y; this.enter('leap', 650); this.pose('leap'); }
        } else if (this.state === 'leap') {
            const t = Math.min(1, this.elapsed / 650), v = this.ctx.camera.view();
            const tx = this.ctx.camera.isLocked() ? Phaser.Math.Clamp(this.targetX, v.left + 24, v.right - 24) : this.targetX;
            const nx = this.startX + (tx - this.startX) * t;
            if (!this.ctx.level.solidAt(nx, this.y - 8)) this.x = nx;
            this.y = this.startY + (this.targetY - this.startY) * t - Math.sin(t * Math.PI) * 36;
            if (this.contact <= 0) { this.ctx.damage.applyRadial(this.x, this.y - 8, 10, 1, 'enemy', 'contact'); this.contact = 120; }
            if (this.clock <= 0) { this.y = this.targetY; this.enter('recover', 900); this.pose('land');
                this.ctx.events.emit('fx:emit', { effect: 'dust_land', x: this.x, y: this.y, material: this.ctx.physics.materialAt(this.x, this.y + 2), scale: .65 }); }
        } else if (this.state === 'recover') { if (this.clock <= 0) { this.enter('patrol', 0); this.pose('run', true); } }
        else if (p?.alive() && Math.abs(p.x - this.x) < 180) {
            this.facing = p.x < this.x ? -1 : 1;
            this.targetX = this.x + this.facing * Math.min(135, Math.max(56, Math.abs(p.x - this.x)));
            if (this.ctx.camera.isLocked()) { const v = this.ctx.camera.view(); this.targetX = Phaser.Math.Clamp(this.targetX, v.left + 24, v.right - 24); }
            this.targetY = this.ctx.physics.groundBelow(this.targetX, this.y - 48, 100) ?? this.y;
            if (this.ctx.physics.hazardAt(this.targetX, this.targetY + 2)) { this.enter('recover', 900); return; }
            this.enter('windup', ENEMIES.hound.windup); this.pose('crouch', true); this.ctx.audio.sfx('hound_growl');
        } else {
            const nx = this.x + this.facing * dt * .084;
            const floor = this.ctx.physics.groundBelow(nx + this.facing * 16, this.y - 12, 30);
            if (floor === null || this.ctx.level.solidAt(nx + this.facing * 16, this.y - 10) || this.ctx.physics.hazardAt(nx, floor + 2)) this.facing *= -1;
            else { this.x = nx; this.y = floor; } this.lockedBounds();
        }
        this.visual();
    }
    snapshot(): unknown { return { kind: this.kind, hp: this.hp, state: this.state, x: this.x, y: this.y, wave: this.wave, elapsed: this.elapsed, dropped: this.dropped, targetX: this.targetX, targetY: this.targetY }; }
}
