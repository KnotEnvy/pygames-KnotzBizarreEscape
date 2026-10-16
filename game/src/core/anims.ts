// Aseprite animations, built correctly for our exports (frame names `<key>#N`). Phaser 4.2.1's
// `anims.createFromAseprite` looks frames up by numeric name ('0', '1', ...), so with our atlases it creates every
// tag with ZERO frames: `anims.exists(tag)` is true but `play(tag)` throws. Preload calls `createAsepriteAnims` for
// every aseprite pack entry, so every tag is a valid global animation before any gameplay/UI scene starts.
//
//   if (hasAnim(scene, 'ui_cursor')) sprite.play({ key: 'ui_cursor', repeat: -1 });
//   img.setTexture('ui_icons', tagFrame(scene, 'icon_hmg'));      // first frame of a tag, for static icons
//   img.setTexture('knotz_full', frameOf(scene, 'knotz_full', 3)); // 'knotz_full#3' (undefined if absent)
//   playAnim(sprite, 'grunt_run');                                 // plays if valid, else stops; never throws
import type Phaser from 'phaser';

interface AseTag { name: string; from: number; to: number; direction?: string }
interface AseAtlas {
    frames: Record<string, { duration?: number }> | Array<{ filename: string; duration?: number }>;
    meta?: { frameTags?: AseTag[] };
}

/** True only if the animation exists AND has frames (a zero-frame anim exists but throws on play). */
export function hasAnim(scene: Phaser.Scene, key: string): boolean {
    const a = scene.anims.get(key);
    return a !== undefined && a !== null && a.frames.length > 0;
}

/** The frame name `<textureKey>#<index>` if that texture has it, else undefined (callers fall back). */
export function frameOf(scene: Phaser.Scene, textureKey: string, index: number): string | undefined {
    const name = `${textureKey}#${index}`;
    return scene.textures.exists(textureKey) && scene.textures.get(textureKey).has(name) ? name : undefined;
}

/** The texture frame name of frame `i` (default the first) of an animation, or undefined. */
export function tagFrame(scene: Phaser.Scene, tag: string, i = 0): string | undefined {
    const a = scene.anims.get(tag);
    const f = a?.frames[Math.min(Math.max(0, i), a.frames.length - 1)];
    return f?.frame ? String(f.frame.name) : undefined;
}

/** Play `key` if it is a valid animation, else stop the sprite. Returns whether it plays. Never throws. */
export function playAnim(sprite: Phaser.GameObjects.Sprite, key: string, ignoreIfPlaying = false): boolean {
    if (!sprite.scene || !hasAnim(sprite.scene, key)) { sprite.stop(); return false; }
    sprite.play(key, ignoreIfPlaying);
    return true;
}

/**
 * Turn every frameTag of the Aseprite atlas `key` into a global animation (anim key = tag name). Idempotent:
 * an animation that already has frames (created earlier, or repaired by a team) is left alone; a zero-frame one
 * (Phaser's createFromAseprite) is replaced. Timing: in 4.2.1 a frame lasts exactly its `duration` ms
 * (`Animation#getFirstTick`/`getNextTick`: `nextTick = frame.duration || msPerFrame`, NOT added to msPerFrame), so the
 * Aseprite ms is used as-is; frameRate 1000 only matters for 0-ms frames. `reverse`/`pingpong_reverse` reverse the
 * frames, `pingpong`/`pingpong_reverse` set yoyo. Overriding `frameRate` in `play()` discards the per-frame timing. `repeat` defaults to 0 (Phaser's own default); pass `{ repeat: -1 }` to `play()` to loop,
 * or give a policy here. Returns the number of animations created.
 */
export function createAsepriteAnims(scene: Phaser.Scene, key: string, repeatOf: (tag: string) => number = () => 0): number {
    const atlas = scene.cache.json.get(key) as AseAtlas | undefined;
    const tags = atlas?.meta?.frameTags;
    if (!atlas || !tags || !scene.textures.exists(key)) return 0;
    const tex = scene.textures.get(key);
    const list = Array.isArray(atlas.frames)
        ? atlas.frames.map(f => ({ name: f.filename, duration: f.duration ?? 100 }))
        // Non-integer keys ('key#N') keep insertion order, which is Aseprite's frame order.
        : Object.entries(atlas.frames).map(([name, f]) => ({ name, duration: f.duration ?? 100 }));
    let made = 0;
    for (const tag of tags) {
        if (!tag.name) continue;
        const old = scene.anims.get(tag.name);
        if (old && old.frames.length > 0) continue;
        const frames = list.slice(tag.from, tag.to + 1)
            .filter(f => tex.has(f.name))
            .map(f => ({ key, frame: f.name, duration: Math.max(1, f.duration) }));
        // A zero-frame anim is a trap (exists() but play() throws): drop it even if we can't rebuild it.
        if (old) scene.anims.remove(tag.name);
        if (frames.length === 0) {
            console.warn(`[anims] tag '${tag.name}' of '${key}' has no frames in the atlas`);
            continue;
        }
        const dir = tag.direction ?? 'forward';
        if (dir === 'reverse' || dir === 'pingpong_reverse') frames.reverse();
        const yoyo = dir === 'pingpong' || dir === 'pingpong_reverse';
        if (scene.anims.create({ key: tag.name, frames, frameRate: 1000, repeat: repeatOf(tag.name), yoyo })) made++;
    }
    return made;
}
