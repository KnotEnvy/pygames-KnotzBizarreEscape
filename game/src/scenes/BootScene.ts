// Boot: build engine fallback textures, then fetch every team's asset pack (missing packs are skipped
// with a console.info, never an error) and hand them to Preload.
import Phaser from 'phaser';
import { createEngineTextures } from '../core/textures';

export const PACKS = ['engine', 'player', 'enemies', 'level', 'fx', 'ui'] as const;
export const PACK_BASE = 'assets/packs/';

export interface LoadedPack { team: string; data: Record<string, unknown> }

async function fetchPack(team: string): Promise<LoadedPack | null> {
    const url = `${PACK_BASE}${team}.json`;
    try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        // Dev servers answer missing files with index.html: treat anything that isn't JSON as missing.
        if (!text.trimStart().startsWith('{')) throw new Error('not a pack file');
        return { team, data: JSON.parse(text) as Record<string, unknown> };
    } catch (e) {
        console.info(`[preload] pack '${team}' not available (${(e as Error).message}), skipping`);
        return null;
    }
}

export class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    create(): void {
        createEngineTextures(this);
        this.input.keyboard?.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
        Promise.all(PACKS.map(fetchPack)).then(packs => {
            this.scene.start('Preload', { packs: packs.filter((p): p is LoadedPack => p !== null) });
        });
    }
}
