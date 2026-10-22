import Phaser from 'phaser';
import { DEPTH, TEX, hasAnim, type GameContext, type Pool } from '../core';
import { FX } from '../config/tuning/fx';

export type Recipe = keyof typeof FX.recipes;
export type Category = keyof typeof FX.caps;
interface Bounds { x: number; y: number; width: number; height: number }
export interface Clip { texture: string; frames: string[]; bounds: Bounds[]; ends: number[]; duration: number; kind: CombatKind }
type CombatKind = 'debris' | 'sparks' | 'embers' | 'snow';
interface Atlas { frames: Record<string, { duration: number }>; meta: { frameTags: { name: string; from: number; to: number }[] } }

/** Resolve exported Aseprite durations once. Images are advanced by scaled dt, never twice by Phaser anims. */
export class Art {
    private readonly clips = new Map<string, Clip>();
    constructor(ctx: GameContext) {
        // One startup-only readback per atlas. Tight painted bounds avoid charging transparent
        // padding against the opacity budget (an XL ignition occupies very little of its 128px canvas).
        const canvas = document.createElement('canvas');
        const paint = canvas.getContext('2d', { willReadFrequently: true })!;
        for (const texture of ctx.scene.textures.getTextureKeys()) {
            if (!texture.startsWith('fx_')) continue;
            const atlas = ctx.scene.cache.json.get(texture) as Atlas | undefined;
            if (!atlas?.frames || !atlas.meta?.frameTags) continue;
            const tex = ctx.scene.textures.get(texture);
            const source = tex.getSourceImage() as HTMLImageElement;
            canvas.width = source.width; canvas.height = source.height;
            paint.drawImage(source, 0, 0);
            const pixels = paint.getImageData(0, 0, canvas.width, canvas.height).data;
            const painted = new Map<string, Bounds>();
            for (const name of tex.getFrameNames()) {
                const frame = tex.get(name);
                let left = frame.cutWidth, top = frame.cutHeight, right = -1, bottom = -1;
                for (let y = 0; y < frame.cutHeight; y++) for (let x = 0; x < frame.cutWidth; x++) {
                    if (!pixels[((frame.cutY + y) * canvas.width + frame.cutX + x) * 4 + 3]) continue;
                    left = Math.min(left, x); right = Math.max(right, x);
                    top = Math.min(top, y); bottom = Math.max(bottom, y);
                }
                painted.set(name, { x: frame.x + left, y: frame.y + top,
                    width: Math.max(0, right - left + 1), height: Math.max(0, bottom - top + 1) });
            }
            for (const tag of atlas.meta.frameTags) {
                // Preload owns frame order/direction/duration repair; share its validated animation data.
                if (!hasAnim(ctx.scene, tag.name)) continue;
                const anim = ctx.scene.anims.get(tag.name)!;
                const frames: string[] = [], ends: number[] = [];
                let duration = 0;
                for (const f of anim.frames) {
                    frames.push(String(f.textureFrame)); duration += f.duration || anim.msPerFrame; ends.push(duration);
                }
                if (anim.yoyo) for (let i = anim.frames.length - 2; i > 0; i--) {
                    const f = anim.frames[i];
                    frames.push(String(f.textureFrame)); duration += f.duration || anim.msPerFrame; ends.push(duration);
                }
                const kind = texture === 'fx_embers' ? 'embers' : texture === 'fx_sparks' ? 'sparks' : texture === 'fx_snow' ? 'snow' : 'debris';
                this.clips.set(tag.name, { texture, frames, bounds: frames.map(name => painted.get(name)!), ends, duration, kind });
            }
        }
        // Neutral alpha falloff lets warm muzzle pools and cool laser burns share one tiny texture.
        // Baked once, reused after scene restart; no per-frame texture refresh or glow filter.
        const key = 'fx_light_pool';
        if (!ctx.scene.textures.exists(key)) {
            const texture = ctx.scene.textures.createCanvas(key, 32, 32)!;
            const paint = texture.getContext(), pixels = paint.createImageData(32, 32);
            for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
                const i = (y * 32 + x) * 4;
                const radius = Math.hypot(x - 15.5, y - 15.5) / 16;
                pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
                pixels.data[i + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 255);
            }
            paint.putImageData(pixels, 0, 0); texture.refresh();
        }
        this.clips.set('fx_light_pool_still', { texture: key, frames: ['__BASE'],
            bounds: [{ x: 0, y: 0, width: 32, height: 32 }], ends: [160], duration: 160, kind: 'sparks' });
    }
    get(name: string): Clip | undefined { return this.clips.get(name); }
}

export class Slot {
    live = false;
    clip: Clip | undefined;
    age = 0; life = 1; vx = 0; vy = 0; gravity = 0; alpha = 1; fade = 120;
    bounce = 0; spin = false; loop = false; hot = false; cue = false; frame = -1;
    background = false;
    recipe: Recipe | undefined;
    growX = 0; growY = 0;
    constructor(readonly image: Phaser.GameObjects.Image, readonly category: Category) {}
}

/** Fixed prewarmed pools. No Sprite, TimerEvent, tween, or per-particle closure on emission. */
export class FxPool {
    readonly slots: Slot[] = [];
    readonly art: Art;
    private readonly pools = {} as Record<Category, Pool<Slot>>;
    readonly combatLive: Record<CombatKind, number> = { debris: 0, sparks: 0, embers: 0, snow: 0 };
    private readonly textureCounts = new Map<string, number>();
    recipeScope: Recipe | undefined;
    readonly recipeLive: Record<Recipe, number> = { rotor_wash: 0, boat_wake: 0, mech_pop: 0, smoke_trail: 0 };
    ambientLive = 0;
    coverage = 0; cloudCoverage = 0;
    // Recipe throttling is intentional; dropped still tracks shared-pool exhaustion.
    recipeDropped = 0;
    dropped = 0; peak = 0; active = 0; hot = 0;
    /** Synchronous emission scope; reset by the director in finally. Existing slots retain their layer. */
    backgroundFactor: number | undefined;
    constructor(private readonly ctx: GameContext) {
        this.art = new Art(ctx);
        for (const key of ctx.scene.textures.getTextureKeys()) if (key.startsWith('fx_')) this.textureCounts.set(key, 0);
        for (const category of Object.keys(FX.caps) as Category[]) {
            this.pools[category] = ctx.pools.create(`fx:${category}`, () => {
                const slot = new Slot(ctx.scene.add.image(0, 0, TEX.px).setVisible(false).setActive(false), category);
                this.slots.push(slot);
                return slot;
            }, undefined, FX.caps[category]);
        }
    }

    spawn(category: Category, tag: string, x: number, y: number, delay = 0, scale = 1, reclaim = false): Slot | null {
        const recipe = this.recipeScope;
        if (recipe && this.recipeLive[recipe] >= FX.recipes[recipe]) { this.recipeDropped++; return null; }
        const clip = this.art.get(tag);
        const view = this.ctx.camera.view();
        const factor = this.backgroundFactor ?? 1;
        const cam = this.ctx.scene.cameras.main;
        const worldX = x + cam.scrollX * (1 - factor), worldY = y + cam.scrollY * (1 - factor);
        if (!clip || worldX < view.left - FX.cullMargin || worldX > view.right + FX.cullMargin || worldY < view.top - FX.cullMargin || worldY > view.bottom + FX.cullMargin) return null;
        const pool = this.pools[category];
        if (pool.free === 0 && reclaim) {
            let oldest: Slot | undefined;
            for (const s of this.slots) if (s.live && s.category === category && (!oldest || s.age > oldest.age)) oldest = s;
            if (oldest) this.release(oldest);
        }
        if (pool.free === 0) { this.dropped++; return null; }
        const s = pool.get();
        s.recipe = recipe; if (recipe) this.recipeLive[recipe]++;
        s.growX = s.growY = 0;
        s.live = true; s.clip = clip; s.age = -delay; s.life = clip.duration;
        s.vx = s.vy = s.gravity = 0; s.alpha = 1; s.fade = 90;
        s.bounce = 0; s.spin = s.loop = s.hot = s.cue = false; s.frame = 0;
        s.background = this.backgroundFactor !== undefined;
        s.image.setTexture(clip.texture, clip.frames[0]).setPosition(x, y).setOrigin(0.5).setRotation(0)
            .setScale(scale).setAlpha(1).clearTint().setFlip(false, false).setBlendMode(Phaser.BlendModes.NORMAL)
            .setScrollFactor(factor).setDepth(s.background ? FX.background.depth : DEPTH.ENEMIES - 1).setVisible(false);
        // Presentation is committed in POST_UPDATE, after callers configure alpha/lifetime.
        this.textureCounts.set(clip.texture, this.countTexture(clip.texture) + 1);
        if (category === 'combat') this.combatLive[clip.kind]++;
        if (category === 'ambient') this.ambientLive++;
        this.active++; this.peak = Math.max(this.active, this.peak);
        return s;
    }

    release(s: Slot): void {
        if (!s.live) return;
        this.textureCounts.set(s.clip!.texture, this.countTexture(s.clip!.texture) - 1);
        if (s.category === 'combat') this.combatLive[s.clip!.kind]--;
        if (s.category === 'ambient') this.ambientLive--;
        if (s.recipe) this.recipeLive[s.recipe]--;
        s.recipe = undefined;
        s.live = false; s.image.setVisible(false); this.active--;
        this.pools[s.category].release(s);
    }

    /** Make room only when an ambience change leaves too many old pooled motes alive. */
    reserveWeather(motes: number): void {
        const limit = FX.caps.ambient - motes;
        if (this.ambientLive <= limit) return;
        for (const s of this.slots) {
            if (s.live && s.category === 'ambient') this.release(s);
            if (this.ambientLive <= limit) break;
        }
    }

    update(dt: number): void {
        this.hot = 0;
        const view = this.ctx.camera.view();
        const cam = this.ctx.scene.cameras.main;
        for (const s of this.slots) {
            if (!s.live) continue;
            const oldAge = s.age;
            s.age += dt;
            if (s.age < 0) continue;
            const worldX = s.image.x + cam.scrollX * (1 - s.image.scrollFactorX);
            const worldY = s.image.y + cam.scrollY * (1 - s.image.scrollFactorY);
            if (s.age >= s.life || worldX < view.left - FX.cullMargin || worldX > view.right + FX.cullMargin || worldY > view.bottom + FX.cullMargin) { this.release(s); continue; }
            // Only advance the part of this step after a delayed emission becomes live.
            const seconds = Math.min(dt, s.age - Math.max(0, oldAge)) / 1000;
            if (s.growX || s.growY) s.image.setScale(s.image.scaleX + s.growX * seconds, s.image.scaleY + s.growY * seconds);
            const oldY = s.image.y;
            s.vy += s.gravity * seconds;
            s.image.x += s.vx * seconds; s.image.y += s.vy * seconds;
            if (!s.background && s.bounce > 0 && s.vy > 0 && seconds > 0) {
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
            if (!s.background && s.hot && s.age < FX.bloom.hotMs) this.hot++;
            if (s.category === 'decal' && worldX < view.left - 64) this.release(s);
        }
    }
    countTexture(texture: string): number { return this.textureCounts.get(texture) ?? 0; }

    private cloud(s: Slot): boolean {
        return s.category === 'smoke' || s.clip?.texture === 'fx_steam' ||
            (s.category === 'explosion' && s.age >= s.clip!.duration * 0.42);
    }

    /** Conservative alpha-weighted painted screen bounds (holes within each shape count too).
     * Two fixed passes, no allocation; run after emissions so the first rendered frame obeys the budget.
     * Even a full chain stays behind actor/core/bullet silhouettes at every animation frame. */
    present(): void {
        const view = this.ctx.camera.view();
        const cam = this.ctx.scene.cameras.main;
        let area = 0, clouds = 0;
        for (const s of this.slots) {
            if (!s.live || s.age < 0) continue;
            s.image.setVisible(true);
            if (s.background) s.image.setDepth(FX.background.depth);
            const cloud = this.cloud(s);
            s.image.alpha = Math.min(s.alpha, cloud ? FX.readability.smokeAlpha : 1) *
                Math.max(0, Math.min(1, (s.life - s.age) / Math.max(1, s.fade)));
            const im = s.image;
            const box = s.clip!.bounds[s.frame];
            const localX = (im.flipX ? im.width - box.x - box.width / 2 : box.x + box.width / 2) - im.width * im.originX;
            const localY = (im.flipY ? im.height - box.y - box.height / 2 : box.y + box.height / 2) - im.height * im.originY;
            const cos = Math.cos(im.rotation), sin = Math.sin(im.rotation);
            const cx = im.x + cam.scrollX * (1 - im.scrollFactorX) + localX * im.scaleX * cos - localY * im.scaleY * sin;
            const cy = im.y + cam.scrollY * (1 - im.scrollFactorY) + localX * im.scaleX * sin + localY * im.scaleY * cos;
            const w = Math.abs(box.width * im.scaleX * cos) + Math.abs(box.height * im.scaleY * sin);
            const h = Math.abs(box.width * im.scaleX * sin) + Math.abs(box.height * im.scaleY * cos);
            const left = cx - w / 2, top = cy - h / 2, right = cx + w / 2, bottom = cy + h / 2;
            const weighted = Math.max(0, Math.min(view.right, right) - Math.max(view.left, left)) *
                Math.max(0, Math.min(view.bottom, bottom) - Math.max(view.top, top)) * im.alpha;
            area += weighted;
            if (cloud) clouds += weighted;
        }
        const screen = Math.max(1, view.width * view.height);
        const cloudScale = Math.min(1, screen * FX.readability.cloudCoverage / Math.max(1, clouds));
        const adjusted = area - clouds + clouds * cloudScale;
        const scale = Math.min(1, screen * FX.readability.coverage / Math.max(1, adjusted));
        for (const s of this.slots) if (s.live && s.age >= 0) s.image.alpha *= scale * (this.cloud(s) ? cloudScale : 1);
        this.coverage = adjusted * scale / screen;
        this.cloudCoverage = clouds * cloudScale * scale / screen;
    }
    clear(): void { for (const s of this.slots) this.release(s); }
    destroy(): void { this.clear(); for (const s of this.slots) s.image.destroy(); }
}
