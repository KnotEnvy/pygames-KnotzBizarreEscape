// Prop animations. Phaser 4.2.1's anims.createFromAseprite looks frames up by numeric name ("0", "1", ...), but our
// exports name them "<key>#N", so Preload's automatic pass creates every tag with zero frames. Rebuild the prop
// tags from the cached Aseprite JSON (same workaround as the player and enemies teams).
import type Phaser from 'phaser';

interface Atlas {
    frames: Record<string, { duration: number }> | Array<{ filename: string; duration: number }>;
    meta?: { frameTags?: Array<{ name: string; from: number; to: number; direction?: string }> };
}

export function registerPropAnimations(scene: Phaser.Scene, keys: readonly string[]): void {
    for (const key of keys) {
        const atlas = scene.cache.json.get(key) as Atlas | undefined;
        const tags = atlas?.meta?.frameTags;
        if (!atlas || !tags || !scene.textures.exists(key)) continue;
        const list = Array.isArray(atlas.frames)
            ? atlas.frames.map(f => ({ name: f.filename, duration: f.duration }))
            : Object.entries(atlas.frames).map(([name, f]) => ({ name, duration: f.duration }));
        for (const tag of tags) {
            const existing = scene.anims.get(tag.name);
            if (existing && existing.frames.length > 0) continue;
            if (existing) scene.anims.remove(tag.name);
            // frameRate 1000 → 1 ms base per frame, so the per-frame duration carries the Aseprite timing.
            const frames = list.slice(tag.from, tag.to + 1).map(f => ({ key, frame: f.name, duration: Math.max(1, f.duration - 1) }));
            if (tag.direction === 'reverse') frames.reverse();
            if (frames.length) scene.anims.create({ key: tag.name, frames, frameRate: 1000, yoyo: tag.direction === 'pingpong' });
        }
    }
}
