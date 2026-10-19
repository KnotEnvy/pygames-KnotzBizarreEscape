// Seeded RNG (mulberry32). Use ctx.rng for anything gameplay-relevant so `?seed=` runs are reproducible.
import type { Rng } from './contracts';

export function createRng(seed: number = (Date.now() ^ 0x9e3779b9) >>> 0): Rng {
    let s = seed >>> 0;
    const next = (): number => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        seed,
        next,
        range: (min, max) => min + next() * (max - min),
        int: (min, max) => min + Math.floor(next() * (max - min + 1)),
        chance: (p) => next() < p,
        pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
        sign: () => (next() < 0.5 ? -1 : 1)
    };
}
