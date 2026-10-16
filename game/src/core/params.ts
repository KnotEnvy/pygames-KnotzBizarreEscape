// URL params: ?scene=Title|Game&stage=1&x=<warpX>&god=1&debug=1&mute=1&seed=<n>&difficulty=casual&fast=1
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
    return {
        scene: q.get('scene') ?? undefined,
        stage: num('stage') ?? 1,
        x: num('x'),
        god: flag('god'),
        debug: flag('debug'),
        mute: flag('mute'),
        seed: num('seed'),
        difficulty: diff === 'casual' || diff === 'arcade' ? diff : undefined,
        fast: flag('fast')
    };
}

export const PARAMS: Readonly<UrlParams> = Object.freeze(parse(typeof location !== 'undefined' ? location.search : ''));
