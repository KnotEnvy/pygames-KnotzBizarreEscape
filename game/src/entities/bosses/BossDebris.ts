import Phaser from 'phaser';
import { DEPTH, type GameContext } from '../../core';
import { animate } from '../enemies/Enemy';

type Scrap = { sprite: Phaser.GameObjects.Sprite; vx: number; vy: number; spin: number; age: number; floor: number };
/** Cosmetic only: bounded, short-lived heavy pieces; never registered with damage/physics. */
export class BossDebris {
    private readonly pieces: Scrap[] = [];
    constructor(private readonly ctx: GameContext) {}
    burst(x: number, y: number, floor: number, count: number, horn = false): void {
        for (let i = 0; i < count && this.pieces.length < 18; i++) {
            const tag = horn && i === 0 ? 'horn' : ['plate', 'gear', 'pipe', 'bolt'][i % 4];
            const sprite = this.ctx.scene.add.sprite(x + this.ctx.rng.range(-16, 16), y, 'moosezilla_debris').setDepth(DEPTH.ENEMIES + .7);
            animate(sprite, `moosezilla_debris_${tag}`);
            this.pieces.push({ sprite, vx: this.ctx.rng.range(-115, 115), vy: this.ctx.rng.range(-215, -115), spin: this.ctx.rng.range(-4, 4), age: 0, floor });
        }
    }
    update(dt: number): void {
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const p = this.pieces[i]; p.age += dt; p.vy += dt * .48;
            p.sprite.x += p.vx * dt / 1000; p.sprite.y += p.vy * dt / 1000; p.sprite.rotation += p.spin * dt / 1000;
            if (p.sprite.y > p.floor - 4 && p.vy > 0) { p.sprite.y = p.floor - 4; p.vy *= -.25; p.vx *= .65; p.spin *= .55; }
            if (p.age > 1700) p.sprite.setAlpha(Math.max(0, (2400 - p.age) / 700));
            if (p.age >= 2400) { p.sprite.destroy(); this.pieces.splice(i, 1); }
        }
    }
    destroy(): void { for (const p of this.pieces) p.sprite.destroy(); this.pieces.length = 0; }
}
