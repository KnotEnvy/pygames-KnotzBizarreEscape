import type { RegisterContext } from '../../core';
import { registerPlayerAnimations } from './animations';
import { Knotz } from './controller';
import { registerPickups } from '../pickups';
import { registerPows } from '../pow';

export function registerPlayer(ctx: RegisterContext): void {
    registerPlayerAnimations(ctx);
    ctx.registry.register('player_start', (game, x, y, props) => {
        const index = Number(props.index ?? 0);
        const existing = game.player(index);
        if (existing) { existing.teleport?.(x, y); return existing.sprite; }
        return new Knotz(game, x, y, index).sprite;
    });
    registerPickups(ctx);
    registerPows(ctx);
}
