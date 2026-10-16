import Phaser from 'phaser';
import { DEPTH, TEX, type GameContext, type Pool } from '../core';
import { FX } from '../config/tuning/fx';

export type Category = keyof typeof FX.caps;
export interface Clip { texture: string; frames: string[]; ends: number[]; duration: number }
interface Atlas { frames: Record<string, { duration: number }>; meta: { frameTags: { name: string; from: number; to: number }[] } }

/** Resolve exported Aseprite durations once. Images are advanced by scaled dt, never twice by Phaser anims. */
export class Art {
    private readonly clips = new Map<string, Clip>();
    constructor(ctx: GameContext) {
        for (const texture of ctx.scene.textures.getTextureKeys()) {
            if (!texture.startsWith('fx_')) continue;
            const atlas = ctx.scene.cache.json.get(texture) as Atlas | undefined;
            if (!atlas?.frames || !atlas.meta?.frameTags) continue;
            const names = Object.keys(atlas.frames);
            for (const tag of atlas.meta.frameTags) {
                const frames: string[] = [], ends: number[] = [];
                let duration = 0;
                for (let i = tag.from; i <= tag.to; i++) {
                    frames.push(names[i]); duration += atlas.frames[names[i]].duration; ends.push(duration);
                }
                this.clips.set(tag.name, { texture, frames, ends, duration });
            }
        }
    }
    get(name: string): Clip | undefined { return this.clips.get(name); }
}

export class Slot {
    live = false;
    clip: Clip | undefined;
    age = 0; life = 1; vx = 0; vy = 0; gravity = 0; alpha = 1; fade = 120;
    bounce = 0; spin = false; loop = false; hot = false; frame = -1;
    constructor(readonly image: Phaser.GameObjects.Image, readonly category: Category) {}
}

/** Fixed prewarmed pools. No Sprite, TimerEvent, tween, or per-particle closure on emission. */
export class FxPool {
    readonly slots: Slot[] = [];
    readonly art: Art;
    private readonly pools = {} as Record<Category, Pool<Slot>>;
    dropped = 0; peak = 0; active = 0; hot = 0;
    constructor(private readonly ctx: GameContext) {
        this.art = new Art(ctx);
        for (const category of Object.keys(FX.caps) as Category[]) {
            this.pools[category] = ctx.pools.create(`fx:${category}`, () => {
                const slot = new Slot(ctx.scene.add.image(0, 0, TEX.px).setVisible(false).setActive(false), category);
                this.slots.push(slot);
                return slot;
            }, undefined, FX.caps[category]);
        }
    }

    spawn(category: Category, tag: string, x: number, y: number, delay = 0, scale = 1, reclaim = false): Slot | null {
        const clip = this.art.get(tag);
        const view = this.ctx.camera.view();
        if (!clip || x < view.left - FX.cullMargin || x > view.right + FX.cullMargin || y < view.top - FX.cullMargin || y > view.bottom + FX.cullMargin) return null;
        const pool = this.pools[category];
        if (pool.free === 0 && reclaim) {
            let oldest: Slot | undefined;
            for (const s of this.slots) if (s.live && s.category === category && (!oldest || s.age > oldest.age)) oldest = s;
            if (oldest) this.release(oldest);
        }
        if (pool.free === 0) { this.dropped++; return null; }
        const s = pool.get();
        s.live = true; s.clip = clip; s.age = -delay; s.life = clip.duration;
        s.vx = s.vy = s.gravity = 0; s.alpha = 1; s.fade = 90;
        s.bounce = 0; s.spin = s.loop = s.hot = false; s.frame = 0;
        s.image.setTexture(clip.texture, clip.frames[0]).setPosition(x, y).setOrigin(0.5).setRotation(0)
            .setScale(scale).setAlpha(1).clearTint().setFlip(false, false).setBlendMode(Phaser.BlendModes.NORMAL)
            .setDepth(DEPTH.FX).setVisible(delay === 0);
        this.active++; this.peak = Math.max(this.active, this.peak);
        return s;
    }

    release(s: Slot): void {
        if (!s.live) return;
        s.live = false; s.image.setVisible(false); this.active--;
        this.pools[s.category].release(s);
    }

    update(dt: number): void {
        this.hot = 0;
        const view = this.ctx.camera.view();
        for (const s of this.slots) {
            if (!s.live) continue;
            const oldAge = s.age;
            s.age += dt;
            if (s.age < 0) continue;
            if (s.age >= s.life || s.image.x < view.left - FX.cullMargin || s.image.x > view.right + FX.cullMargin || s.image.y > view.bottom + FX.cullMargin) { this.release(s); continue; }
            s.image.setVisible(true);
            // Only advance the part of this step after a delayed emission becomes live.
            const seconds = Math.min(dt, s.age - Math.max(0, oldAge)) / 1000;
            const oldY = s.image.y;
            s.vy += s.gravity * seconds;
            s.image.x += s.vx * seconds; s.image.y += s.vy * seconds;
            if (s.bounce > 0 && s.vy > 0 && seconds > 0) {
                const floor = this.ctx.physics.groundBelow(s.image.x, oldY, Math.max(2, s.image.y - oldY + 2));
                if (floor !== null && s.image.y >= floor) {
                    s.image.y = floor - 1; s.vy *= -0.3; s.vx *= 0.55; s.bounce--;
                    if (Math.abs(s.vy) < 18 || s.bounce === 0) { s.vx = s.vy = s.gravity = 0; s.spin = false; }
                }
            }
            const clip = s.clip!;
            const t = s.spin || s.loop ? s.age % clip.duration : Math.min(s.age, clip.duration - 1);
            let frame = 0;
            while (frame < clip.ends.length - 1 && t >= clip.ends[frame]) frame++;
            if (s.frame !== frame) { s.image.setFrame(clip.frames[frame]); s.frame = frame; }
            s.image.alpha = s.alpha * Math.min(1, (s.life - s.age) / Math.max(1, s.fade));
            // Smoke sits behind actor and projectile silhouettes, including the authored fireball tail.
            if (s.category === 'explosion' && s.age > clip.duration * 0.42) {
                s.image.setDepth(DEPTH.ENEMIES - 1); s.image.alpha *= 0.65;
            }
            if (s.hot && s.age < FX.bloom.hotMs) this.hot++;
            if (s.category === 'decal' && s.image.x < view.left - 64) this.release(s);
        }
    }
    clear(): void { for (const s of this.slots) this.release(s); }
    destroy(): void { this.clear(); for (const s of this.slots) s.image.destroy(); }
}
