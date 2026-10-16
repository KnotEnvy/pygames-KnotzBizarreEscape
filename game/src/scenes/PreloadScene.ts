// Preload: queue every pack fetched by Boot, show a clean progress bar, create Aseprite animations
// (tag names become anim keys), then route: ?scene= → 'Title' (if registered) → 'Game'.
import Phaser from 'phaser';
import type { LoadedPack } from './BootScene';
import { PAL } from '../core/textures';
import { PARAMS } from '../core/params';
import { setReady } from '../core/debug/hooks';

interface PackFileEntry { type?: string; key?: string }

export class PreloadScene extends Phaser.Scene {
    private packs: LoadedPack[] = [];

    constructor() { super('Preload'); }

    init(data: { packs?: LoadedPack[] }): void {
        this.packs = data.packs ?? [];
    }

    preload(): void {
        const { width, height } = this.scale;
        const bw = 160, bh = 6, bx = (width - bw) / 2, by = height / 2 + 8;
        this.cameras.main.setBackgroundColor(PAL.outline);
        this.add.text(width / 2, height / 2 - 12, 'KNOTZ BIZARRE ESCAPE', {
            fontFamily: 'monospace', fontSize: '10px', color: '#f0e0a8'
        }).setOrigin(0.5);
        const frame = this.add.graphics();
        frame.lineStyle(1, PAL.ink3).strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
        const bar = this.add.graphics();
        this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
            bar.clear().fillStyle(PAL.olive4).fillRect(bx, by, Math.round(bw * v), bh);
            bar.fillStyle(PAL.olive5).fillRect(bx, by, Math.round(bw * v), 1);
        });
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
            console.warn(`[preload] failed to load '${file.key}' (${String(file.url)})`);
        });
        for (const p of this.packs) {
            try {
                this.load.addPack(p.data);
            } catch (e) {
                console.warn(`[preload] pack '${p.team}' is malformed: ${(e as Error).message}`);
            }
        }
    }

    create(): void {
        this.createAsepriteAnims();
        // Readiness = "the requested scene booted and (for Game) every team registered". Game sets it at the end of
        // its own create(); any other target (Title, ...) flips it once its create() has run.
        const target = this.route();
        if (target !== 'Game') this.scene.get(target).events.once(Phaser.Scenes.Events.CREATE, () => setReady(true));
        this.scene.start(target);
    }

    /** Every `aseprite` entry in any pack gets its tags turned into animations (key = tag name). */
    private createAsepriteAnims(): void {
        for (const p of this.packs) {
            for (const section of Object.values(p.data)) {
                const files = (section as { files?: PackFileEntry[] } | null)?.files;
                if (!Array.isArray(files)) continue;
                for (const f of files) {
                    if (f.type !== 'aseprite' || !f.key || !this.textures.exists(f.key)) continue;
                    try {
                        this.anims.createFromAseprite(f.key);
                    } catch (e) {
                        console.warn(`[preload] anims for '${f.key}' failed: ${(e as Error).message}`);
                    }
                }
            }
        }
    }

    private route(): string {
        const has = (k: string) => this.scene.manager.keys[k] !== undefined;
        if (PARAMS.scene && has(PARAMS.scene)) return PARAMS.scene;
        if (PARAMS.scene) console.info(`[preload] ?scene=${PARAMS.scene} is not registered`);
        return has('Title') ? 'Title' : 'Game';
    }
}
