import type { RegisterContext } from '../../core';
import { registerPlayerAnimations } from './animations';
import { Knotz, type Entry } from './controller';
import { registerPickups } from '../pickups';
import { registerPows } from '../pow';

export function registerPlayer(ctx: RegisterContext): void {
    registerPlayerAnimations(ctx);
    ctx.registry.register('player_start', (game, x, y, props) => {
        const index = Number(props.index ?? 0);
        const existing = game.player(index);
        if (existing) { existing.teleport?.(x, y); return existing.sprite; }
        return new Knotz(game, x, y, index, ['walk', 'jump_down', 'tumble'].includes(String(props.entry)) ? props.entry as Entry : undefined).sprite;
    });
    registerPickups(ctx);
    registerPows(ctx);
}
