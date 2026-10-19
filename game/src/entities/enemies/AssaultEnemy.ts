import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo } from '../../core';
import { getAudio, type LoopHandle } from '../../audio';
import { ENEMIES } from '../../config/tuning/enemies';
import { animate, visible } from './Enemy';

type Kind = 'hound' | 'buzzard';
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
            body: () => this.rect.setTo(this.x - (kind === 'hound' ? 15 : 33), this.y - (kind === 'hound' ? 18 : 13), kind === 'hound' ? 30 : 66, kind === 'hound' ? 18 : 26),
            alive: () => this.active && this.hp > 0, hit: h => this.hit(h) }), ctx.onUpdate((dt, raw) => this.tick(dt, raw)));
        const stop = () => { this.buzz?.stop(0); this.buzz = null; };
        ctx.scene.events.once('shutdown', stop);
        this.once('destroy', () => { stop(); ctx.scene.events.off('shutdown', stop); this.cue.destroy(); for (const off of this.offs) off(); });
        this.pose(kind === 'hound' ? 'run' : 'fly', true);
    }
    private pose(tag: string, loop = false): void { animate(this, `${this.kind}_${tag}`, loop); }
    private enter(state: string, ms: number): void { this.state = state; this.clock = ms; this.elapsed = 0; this.fired = 0; }
    private hit(h: HitInfo): boolean {
        if (this.hp <= 0) return false;
        this.hp -= h.damage; this.flash = 60; this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        if (this.hp <= 0) {
            this.enter('death', this.kind === 'hound' ? 800 : 1200); this.pose('death'); this.buzz?.stop(0); this.buzz = null; this.cue.clear();
            this.ctx.events.emit('enemy:killed', { kind: this.kind, x: this.x, y: this.y, score: ENEMIES[this.kind].score, cause: h.kind });
            if (this.kind === 'buzzard') this.ctx.events.emit('explosion', { x: this.x, y: this.y, size: 'm', team: 'enemy' });
        }
        return true;
    }
    private lockedBounds(): void {
        if (!this.ctx.camera.isLocked()) return;
        const v = this.ctx.camera.view(), m = this.kind === 'buzzard' ? 42 : 24;
        const nx = Phaser.Math.Clamp(this.x, v.left + m, v.right - m);
        if (nx !== this.x) this.facing = nx > this.x ? 1 : -1;
        this.x = nx;
        if (this.kind === 'buzzard') this.y = Phaser.Math.Clamp(this.y, v.top + 28, v.bottom - 70);
        else if (this.hp > 0 && (this.y < v.top - 24 || this.y > v.bottom + 8)) {
            this.y = this.ctx.physics.groundBelow(this.x, v.top, v.height + 8) ?? Phaser.Math.Clamp(this.ctx.player()?.y ?? this.y, v.top + 24, v.bottom - 8);
            this.startY = this.y; this.targetY = this.y;
        }
    }
    private tick(dt: number, raw: number): void {
        this.buzzRetryMs = Math.max(0, this.buzzRetryMs - raw);
        if (!dt || !this.active) return;
        this.lockedBounds();
        if (this.state !== 'death' && this.x < this.ctx.camera.leftEdge() - 96) { this.destroy(); return; }
        if (this.kind === 'buzzard' && this.age > 0 && !this.ctx.camera.isLocked() && !visible(this.ctx, this.x, this.y, 64)) { this.destroy(); return; }
        if (this.state !== 'death' && !(this.kind === 'buzzard' && this.age > 0 && !this.ctx.camera.isLocked()) && !visible(this.ctx, this.x, this.y, 32)) { this.buzz?.stop(0); this.buzz = null; return; }
        this.age += dt; this.clock -= dt; this.elapsed += dt; this.contact -= dt;
        if (this.flash > 0 && (this.flash -= dt) <= 0) this.clearTint();
        if (this.state === 'death') { if (this.kind === 'buzzard') { this.y += dt * .08; this.rotation += dt * .0005; } if (this.clock <= 0) this.destroy(); return; }
        this.setFlipX(this.kind === 'hound' ? this.facing < 0 : this.facing > 0);
        const p = this.ctx.player(); this.cue.clear();
        if (this.kind === 'buzzard') {
            const audio = getAudio(this.ctx.scene);
            if (!this.buzz?.active && this.buzzRetryMs <= 0 && !audio.locked) { this.buzz = audio.loop('buzzard_rotor', { x: this.x }); this.buzzRetryMs = 500; }
            if (this.buzz?.active) this.buzz.setX(this.x);
            // A free pass takes eight seconds, then exits. A locked arena retains the ship until shot down.
            if (!this.ctx.camera.isLocked() && this.age > 8000) { this.x += this.facing * dt * .12; if (!visible(this.ctx, this.x, this.y, 28)) this.destroy(); return; }
            this.y = this.startY + Math.sin(this.age / 650) * 4;
            this.x += this.facing * dt * .048; this.lockedBounds();
            if (this.dropped < 3 && this.age >= 1200 + this.dropped * 1800) {
                this.dropped++; const v = this.ctx.camera.view();
                this.ctx.spawn('enemy', 'paratrooper', { facing: this.facing, wave: this.wave }, Phaser.Math.Clamp(this.x, v.left + 28, v.right - 28), this.y + 22);
            }
            if (this.state === 'strafe') {
                const v = this.ctx.camera.view(); const a = Math.max(v.left + 20, this.targetX - 56), b = Math.min(v.right - 20, this.targetX + 56);
                this.cue.lineStyle(1, 0xffe066, .9).lineBetween(a, this.targetY - 2, b, this.targetY - 2);
                for (let x = a; x < b; x += 16) this.cue.lineBetween(x, this.targetY - 7, x + 5, this.targetY - 2);
                if (this.elapsed >= 700 + this.fired * 180 && this.fired < 5) {
                    const tx = a + (b - a) * this.fired++ / 4, dy = this.targetY - this.y, dx = tx - this.x, len = Math.hypot(dx, dy);
                    this.ctx.projectiles.spawn({ x: this.x, y: this.y + 17, vx: dx / len * 125, vy: dy / len * 125, team: 'enemy', damage: 1, texture: 'enemy_bullet', anim: 'enemy_bullet_fly', rotate: false, lifetime: 3000 });
                    this.ctx.events.emit('enemy:shoot', { kind: this.kind, x: this.x, y: this.y + 17, angle: Math.atan2(dy, dx) }); this.pose('strafe', true);
                }
                if (this.clock <= 0) { this.enter('patrol', 2400); this.pose('fly', true); }
            } else if (this.clock <= 0 && p?.alive()) { this.targetX = p.x; this.targetY = p.y; this.enter('strafe', 1800); this.pose('aim', true); }
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
            if (this.clock <= 0) { this.y = this.targetY; this.enter('recover', 900); this.pose('land'); }
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
    }
    snapshot(): unknown { return { kind: this.kind, hp: this.hp, state: this.state, x: this.x, y: this.y, wave: this.wave, elapsed: this.elapsed, dropped: this.dropped, targetX: this.targetX, targetY: this.targetY }; }
}
