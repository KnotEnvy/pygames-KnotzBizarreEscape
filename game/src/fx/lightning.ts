import { settings, type GameContext, type GameEvents } from '../core';

type Flash = GameEvents['fx:lightning'];

/** Shared by every FX lightning producer. A double is one accepted event. */
export class FxLightning {
    private last = -Infinity;
    private previous = -Infinity;
    private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    constructor(private readonly ctx: GameContext) {}

    request(x?: number, y?: number, double = false): Flash | null {
        const now = this.ctx.scene.time.now;
        const reduced = settings.get().reducedFlash || this.reducedMotion.matches;
        // Strict window edge: three events must never fit in an inclusive 3 s window.
        if (now - this.last < (reduced ? 4000 : 1500) || now - this.previous <= 3000) return null;
        this.previous = this.last; this.last = now;
        const flash: Flash = { x, y, strength: reduced ? .14 : 1, double: double && !reduced };
        this.ctx.events.emit('fx:lightning', flash);
        return flash;
    }
}
