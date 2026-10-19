// Phase G: lazy per-mission asset packs. Mission 1 lives in the main packs (Boot/Preload). For mission N >= 2 every
// team may ship `public/assets/packs/<team>.m<N>.json` (same format as its main pack). When a Game start needs a
// mission that isn't loaded yet, GameScene hands off to Preload in "mission mode" ({ missions, next }): Preload
// fetches those packs, loads them with its usual retry and error policy and progress bar, creates their Aseprite
// anims, marks the missions loaded, then starts `next` (the same Game data). Later parts, retries and continues of
// that mission find it cached and start directly. A mission pack that isn't deployed is skipped quietly.
import { CAMPAIGN, partById, type CarryState, type GameStartData, type PartDef, type PartId } from '../config/campaign';
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

// ---- G3: carry a mission start across the error screen's page reload (sessionStorage, one use, 10 min max)

const RESUME_KEY = 'kbe.missionResume.v1';
/** A stash older than this (or from the future, by more than this) is ignored. */
export const RESUME_MAX_AGE_MS = 10 * 60 * 1000;

function session(): Storage | null {
    try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
}

/** Stash `{ part, carry }` before a reload. Infinity ammo goes in as -1 (Game reads -1 as Infinity). Never throws. */
export function stashMissionResume(data: GameStartData): boolean {
    const s = session();
    if (!s || typeof data.part !== 'string') return false;
    const carry = data.carry ? { ...data.carry, ammo: Number.isFinite(data.carry.ammo) ? data.carry.ammo : -1 } : undefined;
    try {
        s.setItem(RESUME_KEY, JSON.stringify({ t: Date.now(), part: data.part, carry }));
        return true;
    } catch { return false; }
}

/** Read and clear the stash (one use). null when there is none, it is stale, malformed, or storage is blocked. */
export function takeMissionResume(now = Date.now()): GameStartData | null {
    const s = session();
    if (!s) return null;
    let raw: string | null = null;
    try { raw = s.getItem(RESUME_KEY); s.removeItem(RESUME_KEY); } catch { return null; }
    if (!raw) return null;
    try {
        const v = JSON.parse(raw) as { t?: unknown; part?: unknown; carry?: CarryState };
        if (typeof v.t !== 'number' || Math.abs(now - v.t) > RESUME_MAX_AGE_MS) return null;
        if (typeof v.part !== 'string' || !partById(v.part)) return null;
        const out: GameStartData = { part: v.part as PartId };
        if (v.carry && typeof v.carry === 'object') {
            out.carry = { ...v.carry, ammo: typeof v.carry.ammo === 'number' && v.carry.ammo >= 0 ? v.carry.ammo : Infinity };
        }
        return out;
    } catch { return null; }
}
