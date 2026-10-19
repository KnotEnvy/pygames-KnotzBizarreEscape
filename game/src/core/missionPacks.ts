// Phase G: lazy per-mission asset packs. Mission 1 lives in the main packs (Boot/Preload). For mission N >= 2 every
// team may ship `public/assets/packs/<team>.m<N>.json` (same format as its main pack). When a Game start needs a
// mission that isn't loaded yet, GameScene hands off to Preload in "mission mode" ({ missions, next }): Preload
// fetches those packs, loads them with its usual retry and error policy and progress bar, creates their Aseprite
// anims, marks the missions loaded, then starts `next` (the same Game data). Later parts, retries and continues of
// that mission find it cached and start directly. A mission pack that isn't deployed is skipped quietly.
import { CAMPAIGN, type PartDef } from '../config/campaign';
import { CHEATS_ENABLED } from './params';

/** Teams that may ship a mission pack, in load order (ARCHITECTURE.md: Enemies A owns `gatorgeddon`; Imagegen owns `imagegen`). */
export const MISSION_PACK_TEAMS = ['engine', 'player', 'enemies', 'gatorgeddon', 'level', 'fx', 'ui', 'imagegen'] as const;

/** Pack names (the `team` argument of fetchPack) for mission n: `engine.m2`, ... */
export function missionPackNames(n: number): string[] {
    return MISSION_PACK_TEAMS.map(t => `${t}.m${n}`);
}

/** Missions whose packs are in the caches. Mission 1 is the main packs, loaded at boot. */
const loaded = new Set<number>([1]);

export function isMissionLoaded(n: number): boolean { return loaded.has(n); }
export function markMissionLoaded(n: number): void { loaded.add(n); }
/** Loaded missions, for __KBE.state().missionPacks. */
export function loadedMissions(): number[] { return [...loaded].sort((a, b) => a - b); }

/** Preload's scene data in mission mode. */
export interface MissionLoadData {
    missions: number[];
    /** Scene (and its data) to start once the packs are in. */
    next: { scene: string; data?: object };
}

/**
 * Missions a Game start for `part` still has to load: the part's own mission, plus every mission when an
 * `?enemytest=` fixture runs (fixtures start in 1-1 but may spawn any mission's enemies), plus `?mission=<n>`
 * (dev: preload a mission's packs while playing another part). Cheat-gated extras like the fixtures they serve.
 */
export function missionsToLoad(part: PartDef, search: string = typeof location !== 'undefined' ? location.search : ''): number[] {
    const want = new Set<number>([part.mission]);
    if (CHEATS_ENABLED) {
        const q = new URLSearchParams(search);
        if (q.get('enemytest')) for (const m of CAMPAIGN) want.add(m.id);
        const extra = Number(q.get('mission'));
        if (Number.isInteger(extra) && CAMPAIGN.some(m => m.id === extra)) want.add(extra);
    }
    return [...want].filter(n => n >= 2 && !loaded.has(n)).sort((a, b) => a - b);
}
