// URL params: ?scene=Title|Game&stage=1&part=1-2&x=<warpX>&god=1&debug=1&mute=1&seed=<n>&difficulty=casual&fast=1&turbo=<n>
// Cheats (?god, ?x warp, ?part and the __KBE.cheats.* calls) only work in dev mode or with ?debug=1. A production build
// without ?debug=1 ignores them; the read-only QA hooks (__KBE.state, __KBE.press, __KBE.ready) always stay.
import type { UrlParams } from './contracts';

function parse(search: string): UrlParams {
    const q = new URLSearchParams(search);
    const num = (k: string): number | undefined => {
        const v = q.get(k);
        if (v === null || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };
    const flag = (k: string): boolean => {
        const v = q.get(k);
        return v !== null && v !== '0' && v !== 'false';
    };
    const diff = q.get('difficulty');
    const cheats = cheatsAllowed(flag('debug'));
    return {
        scene: q.get('scene') ?? undefined,
        stage: num('stage') ?? 1,
        x: cheats ? num('x') : undefined,
        god: cheats && flag('god'),
        debug: flag('debug'),
        mute: flag('mute'),
        seed: num('seed'),
        difficulty: diff === 'casual' || diff === 'arcade' ? diff : undefined,
        fast: flag('fast'),
        part: cheats ? (q.get('part') ?? undefined) : undefined,
        turbo: cheats ? num('turbo') : undefined
    };
}

function cheatsAllowed(debug: boolean): boolean {
    return import.meta.env.DEV || debug;
}

export const PARAMS: Readonly<UrlParams> = Object.freeze(parse(typeof location !== 'undefined' ? location.search : ''));

/** True in dev mode or with ?debug=1: __KBE.cheats and the ?god / ?x params are live. */
export const CHEATS_ENABLED = cheatsAllowed(PARAMS.debug);
