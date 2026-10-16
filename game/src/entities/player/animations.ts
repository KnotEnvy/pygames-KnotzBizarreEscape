import type { GameContext } from '../../core';

/** Preload owns frame building; player registration only sets the team's loop policy. */
export function registerPlayerAnimations(ctx: GameContext): void {
    const keys = ['knotz_legs', 'knotz_torso_pistol', 'knotz_torso_heavy', 'knotz_full', 'pow',
        'pistol_bullet', 'hmg_bullet', 'spread_bullet', 'rocket', 'flame', 'grenade',
        'pickup_b', 'pickup_h', 'pickup_s', 'pickup_r', 'pickup_f', 'pickup_life', 'pickup_chicken', 'pickup_fish', 'pickup_medal', 'pickup_ration'];
    for (const key of keys) {
        const atlas = ctx.scene.cache.json.get(key) as { meta?: { frameTags?: { name: string }[] } } | undefined;
        for (const tag of atlas?.meta?.frameTags ?? []) {
            const a = ctx.scene.anims.get(tag.name);
            if (a?.frames.length) a.repeat = /shoot|knife|throw|death|respawn|victory|_land$|_skid$|_enter$|pow_freed|pow_salute|pow_give_item/.test(tag.name) ? 0 : -1;
        }
    }
}
