// Boot: build engine fallback textures, then fetch every team's asset pack and hand them to Preload.
// A pack that doesn't exist (404 / the dev server's index.html fallback) is skipped with a console.info, never an
// error. A pack that exists but can't be fetched (network drop, 5xx, truncated body) is retried with backoff; if
// it still fails it goes to Preload as a pack error, and Preload shows the load-error screen instead of the Game.
import Phaser from 'phaser';
import { createEngineTextures } from '../core/textures';

export const PACKS = ['engine', 'player', 'enemies', 'level', 'fx', 'ui'] as const;
export const PACK_BASE = 'assets/packs/';
/** Attempts per pack / per file before it counts as failed, and the wait before each retry (ms). */
export const LOAD_ATTEMPTS = 3;
export const LOAD_BACKOFF = [500, 1500];

export interface LoadedPack { team: string; data: Record<string, unknown> }
export interface PackError { team: string; reason: string }
export type PackResult = { ok: true; pack: LoadedPack | null } | { ok: false; error: PackError };

/** Thrown for answers that mean "this pack isn't deployed" (never retried). */
class MissingPack extends Error {}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function fetchPackOnce(team: string): Promise<LoadedPack> {
    const res = await fetch(`${PACK_BASE}${team}.json`, { cache: 'no-cache' });
    // 404/410 (and other client errors) = not deployed; 408/429/5xx = transient, worth retrying.
    if (!res.ok) {
        const transient = res.status === 408 || res.status === 429 || res.status >= 500;
        throw transient ? new Error(`HTTP ${res.status}`) : new MissingPack(`HTTP ${res.status}`);
    }
    const text = await res.text();
    // Dev servers answer missing files with index.html: treat anything that isn't JSON as missing.
    if (!text.trimStart().startsWith('{')) throw new MissingPack('not a pack file');
    // A JSON object that doesn't parse was cut off in transit: retry it.
    return { team, data: JSON.parse(text) as Record<string, unknown> };
}

/**
 * Fetch one pack, retrying network failures. `pack: null` = the pack isn't deployed (skip it quietly);
 * `ok: false` = it exists (or might) but every attempt failed.
 */
export async function fetchPack(team: string): Promise<PackResult> {
    let reason = '';
    for (let attempt = 0; attempt < LOAD_ATTEMPTS; attempt++) {
        if (attempt > 0) await wait(LOAD_BACKOFF[attempt - 1] ?? LOAD_BACKOFF[LOAD_BACKOFF.length - 1]);
        try {
            return { ok: true, pack: await fetchPackOnce(team) };
        } catch (e) {
            if (e instanceof MissingPack) {
                console.info(`[preload] pack '${team}' not available (${e.message}), skipping`);
                return { ok: true, pack: null };
            }
            reason = (e as Error).message;
            console.info(`[preload] pack '${team}' attempt ${attempt + 1}/${LOAD_ATTEMPTS} failed (${reason})`);
        }
    }
    console.warn(`[preload] pack '${team}' failed after ${LOAD_ATTEMPTS} attempts (${reason})`);
    return { ok: false, error: { team, reason } };
}

export class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    create(): void {
        createEngineTextures(this);
        this.input.keyboard?.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
        Promise.all(PACKS.map(fetchPack)).then(results => {
            const packs: LoadedPack[] = [], packErrors: PackError[] = [];
            for (const r of results) {
                if (!r.ok) packErrors.push(r.error);
                else if (r.pack) packs.push(r.pack);
            }
            this.scene.start('Preload', { packs, packErrors });
        });
    }
}
