import type { GameContext } from '../../core';

interface Atlas { frames: Record<string, { duration: number }>; meta: { frameTags: { name: string; from: number; to: number }[] } }
/** Phaser's Aseprite helper assumes numeric frame names; our exporter uses texture#N. Repair only this team's tags. */
export function registerPlayerAnimations(ctx: GameContext): void {
    const keys = ['knotz_legs', 'knotz_torso_pistol', 'knotz_torso_heavy', 'knotz_full', 'pow',
        'pistol_bullet', 'hmg_bullet', 'spread_bullet', 'rocket', 'flame', 'grenade',
        'pickup_b', 'pickup_h', 'pickup_s', 'pickup_r', 'pickup_f', 'pickup_life', 'pickup_chicken', 'pickup_fish', 'pickup_medal', 'pickup_ration'];
    for (const key of keys) {
        const atlas = ctx.scene.cache.json.get(key) as Atlas | undefined;
        if (!atlas?.meta?.frameTags) continue;
        const names = Object.keys(atlas.frames);
        for (const tag of atlas.meta.frameTags) {
            if (ctx.scene.anims.exists(tag.name)) ctx.scene.anims.remove(tag.name);
            const frames = names.slice(tag.from, tag.to + 1).map(frame => ({ key, frame, duration: atlas.frames[frame].duration }));
            const once = /shoot|knife|throw|death|respawn|victory|_land$|_skid$|_enter$|pow_freed|pow_salute|pow_give_item/.test(tag.name);
            ctx.scene.anims.create({ key: tag.name, frames, frameRate: 1000, repeat: once ? 0 : -1 });
        }
    }
}
