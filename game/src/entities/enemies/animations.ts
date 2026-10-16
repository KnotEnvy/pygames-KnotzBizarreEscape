import type { GameContext } from '../../core';
interface Atlas { frames: Record<string, { duration: number }>; meta: { frameTags: Array<{ name: string; from: number; to: number; direction?: string }> } }
/** Aseprite helper in 4.2.1 looks up numeric names. Our art exports key#N. */
export function registerEnemyAnimations(ctx: GameContext): void {
    const keys = ['grunt', 'grenadier', 'shield', 'turret', 'drone', 'paratrooper', 'parachute', 'enemy_bullet', 'turret_bullet', 'enemy_grenade', 'moosezilla_body', 'moosezilla_head', 'moosezilla_jaw', 'moosezilla_legs_back', 'moosezilla_legs_front', 'moosezilla_antler_l', 'moosezilla_antler_r', 'moosezilla_armor', 'moosezilla_core', 'moosezilla_debris'];
    for (const key of keys) {
        const atlas = ctx.scene.cache.json.get(key) as Atlas | undefined;
        if (!atlas?.meta?.frameTags) continue;
        const names = Object.keys(atlas.frames);
        for (const tag of atlas.meta.frameTags) {
            if (ctx.scene.anims.exists(tag.name)) ctx.scene.anims.remove(tag.name);
            const frames = names.slice(tag.from, tag.to + 1).map(frame => ({ key, frame, duration: atlas.frames[frame].duration - 1 }));
            if (tag.direction === 'reverse') frames.reverse();
            ctx.scene.anims.create({ key: tag.name, frames, frameRate: 1000, repeat: /_fly$|_fuse$/.test(tag.name) ? -1 : 0, yoyo: tag.direction === 'pingpong' });
        }
    }
}
