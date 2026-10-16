// Preload owns frame construction and duration/direction handling.
import { hasAnim, type GameContext } from '../../core';
export function registerEnemyAnimations(ctx: GameContext): void {
    for (const key of ['enemy_bullet_fly', 'turret_bullet_fly', 'enemy_grenade_fuse']) {
        const anim = ctx.scene.anims.get(key);
        if (anim && hasAnim(ctx.scene, key)) anim.repeat = -1;
    }
}
