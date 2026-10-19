// Phase E: campaign progress save (unlocked parts + best score per part) in localStorage['kbe.progress.v1'].
// Never throws: with no storage (private mode, blocked, quota) it keeps the progress in memory for the page.
// The Engine flow calls unlockPart/recordBest on every part clear; Title's PART SELECT reads loadProgress().
import { CAMPAIGN, FIRST_PART, partById, type PartId } from '../config/campaign';

export const PROGRESS_KEY = 'kbe.progress.v1';

export interface Progress {
    /** Parts the player may start from PART SELECT, in campaign order. Always includes '1-1'. */
    unlocked: PartId[];
    /** Best score per part (the part's own score, as in PartResult.score). */
    best: Partial<Record<PartId, number>>;
}

let memory: Progress | null = null;

function storage(): Storage | null {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

function campaignOrder(ids: Iterable<string>): PartId[] {
    const set = new Set(ids);
    const out: PartId[] = [];
    for (const m of CAMPAIGN) for (const p of m.parts) if (set.has(p.id)) out.push(p.id);
    return out;
}

function sanitize(raw: unknown): Progress {
    const r = (raw && typeof raw === 'object' ? raw : {}) as { unlocked?: unknown; best?: unknown };
    const ids = Array.isArray(r.unlocked) ? r.unlocked.filter((v): v is string => typeof v === 'string' && !!partById(v)) : [];
    const best: Partial<Record<PartId, number>> = {};
    if (r.best && typeof r.best === 'object') {
        for (const [k, v] of Object.entries(r.best as Record<string, unknown>)) {
            const p = partById(k);
            if (p && typeof v === 'number' && Number.isFinite(v) && v >= 0) best[p.id] = Math.floor(v);
        }
    }
    return { unlocked: campaignOrder([FIRST_PART.id, ...ids]), best };
}

function clone(p: Progress): Progress {
    return { unlocked: [...p.unlocked], best: { ...p.best } };
}

/** The saved progress (a copy; '1-1' is always unlocked). */
export function loadProgress(): Progress {
    if (!memory) {
        let raw: unknown = null;
        try { const s = storage()?.getItem(PROGRESS_KEY); if (s) raw = JSON.parse(s); } catch { raw = null; }
        memory = sanitize(raw);
    }
    return clone(memory);
}

function save(p: Progress): void {
    memory = clone(p);
    try { storage()?.setItem(PROGRESS_KEY, JSON.stringify(memory)); } catch { /* no storage: memory only */ }
}

export function isUnlocked(id: PartId): boolean {
    return loadProgress().unlocked.includes(id);
}

/** Unlock a part (no-op for unknown ids). Returns true if it was newly unlocked. */
export function unlockPart(id: PartId): boolean {
    if (!partById(id)) return false;
    const p = loadProgress();
    if (p.unlocked.includes(id)) return false;
    p.unlocked = campaignOrder([...p.unlocked, id]);
    save(p);
    return true;
}

/** Keep the best score for a part. Returns true if it's a new best. */
export function recordBest(id: PartId, score: number): boolean {
    if (!partById(id) || !Number.isFinite(score) || score < 0) return false;
    const p = loadProgress();
    const prev = p.best[id];
    if (prev !== undefined && prev >= score) return false;
    p.best[id] = Math.floor(score);
    save(p);
    return true;
}

/** Dev/QA: forget all progress (storage and memory). */
export function resetProgress(): void {
    memory = null;
    try { storage()?.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
}
