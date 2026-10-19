// Dev sandbox wiring. Engine defaults are registered BEFORE team registration, so any team factory with the
// same key replaces them automatically (e.g. the player team's 'player_start' replaces the box soldier).
import type { RegisterContext } from '../contracts';
import { spawnDevPlayer } from './sandboxPlayer';
import { spawnDevArena, spawnDevTarget, spawnDevTurret } from './sandboxTargets';

export { buildSandboxLevel } from './sandboxLevel';
export { installDevFx } from './devFx';

export function registerEngineDefaults(ctx: RegisterContext): void {
    ctx.registry.register('player_start', (c, x, y) => spawnDevPlayer(c, x, y));
    ctx.registry.register('dev:target', spawnDevTarget);
    ctx.registry.register('dev:turret', spawnDevTurret);
    ctx.registry.register('dev:arena', (c, x, y, p) => spawnDevArena(c, x, y, p));
}
