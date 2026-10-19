// Preload: queue every pack fetched by Boot, show a clean progress bar, create Aseprite animations
// (core/anims.ts; tag names become anim keys), then route: ?scene= → 'Title' (if registered) → 'Game'.
// Every pack file is required. A file that fails is retried (LOAD_ATTEMPTS rounds with backoff); if files or
// packs still fail, Preload never routes: it shows the load-error screen (Enter / click / pad retries only what
// failed) and __KBE.state().loadErrors lists the failures while __KBE.ready stays false. loadErrors is only
// non-empty on that screen (automatic retries in progress don't count as an error yet).
import Phaser from 'phaser';
import { fetchPack, LOAD_ATTEMPTS, LOAD_BACKOFF, type LoadedPack, type PackError } from './BootScene';
import { PAL } from '../core/textures';
import { PARAMS } from '../core/params';
import { registerDebug, setReady } from '../core/debug/hooks';
import { createAsepriteAnims } from '../core/anims';

interface PackFileEntry { type?: string; key?: string; url?: unknown; textureURL?: unknown; fontDataURL?: unknown; atlasURL?: unknown }
/** One file entry of a pack, with its section (so it can be re-queued under the same baseURL/path/prefix). */
interface FileRef { team: string; section: string; config: Record<string, unknown>; entry: PackFileEntry }
export interface LoadError { kind: 'pack' | 'file'; team: string; key: string; url: string; reason: string }

/** After this many failed retries from the error screen, the next press reloads the page instead. */
const MANUAL_RETRIES_BEFORE_RELOAD = 3;
const HEX = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

let loadErrors: LoadError[] = [];

export class PreloadScene extends Phaser.Scene {
    private packs: LoadedPack[] = [];
    private packErrors: PackError[] = [];
    private refs: FileRef[] = [];
    /** Keys (MultiFile parent key when there is one) whose request failed in the current round, with the URL. */
    private failed = new Map<string, string>();
    private round = 1;
    private manualRetries = 0;
    private busy = false;
    private bar!: Phaser.GameObjects.Graphics;
    private barFrame!: Phaser.GameObjects.Graphics;
    private status!: Phaser.GameObjects.Text;
    private errorUi: Phaser.GameObjects.GameObject[] = [];
    private onRetry: (() => void) | null = null;

    constructor() {
        super('Preload');
        registerDebug('loadErrors', () => loadErrors.map(e => ({ ...e })));
    }

    init(data: { packs?: LoadedPack[]; packErrors?: PackError[] }): void {
        this.packs = [];
        this.packErrors = [...(data.packErrors ?? [])];
        this.refs = [];
        this.failed.clear();
        this.round = 1;
        this.manualRetries = 0;
        this.busy = false;
        this.errorUi = [];
        loadErrors = [];
        for (const p of data.packs ?? []) this.indexPack(p);
    }

    preload(): void {
        const { width, height } = this.scale;
        const bw = 160, bh = 6, bx = (width - bw) / 2, by = height / 2 + 8;
        this.cameras.main.setBackgroundColor(PAL.outline);
        this.add.text(width / 2, height / 2 - 12, 'KNOTZ BIZARRE ESCAPE', {
            fontFamily: 'monospace', fontSize: '10px', color: '#f0e0a8'
        }).setOrigin(0.5);
        this.barFrame = this.add.graphics();
        this.barFrame.lineStyle(1, PAL.ink3).strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
        const bar = this.bar = this.add.graphics();
        this.status = this.add.text(width / 2, by + 16, '', {
            fontFamily: 'monospace', fontSize: '8px', color: HEX(PAL.ink5)
        }).setOrigin(0.5);
        this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
            if (this.round > 1 || this.manualRetries > 0) return; // retries re-fill a full bar; keep it full
            bar.clear().fillStyle(PAL.olive4).fillRect(bx, by, Math.round(bw * v), bh);
            bar.fillStyle(PAL.olive5).fillRect(bx, by, Math.round(bw * v), 1);
        });
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
            const key = file.multiFile?.key ?? file.key;
            this.failed.set(key, String(file.url));
            console.info(`[preload] '${key}' failed to load (${String(file.url)}), attempt ${this.round}/${LOAD_ATTEMPTS}`);
        });
        // Retries are ours (with backoff, see settle()); Phaser's own retry fires instantly, inside the same blip.
        this.load.maxRetries = 0;
        for (const p of this.packs) this.queuePack(p);
    }

    create(): void {
        this.settle();
    }

    // ---- load bookkeeping

    private indexPack(p: LoadedPack): void {
        this.packs.push(p);
        for (const [section, config] of Object.entries(p.data)) {
            const files = (config as { files?: PackFileEntry[] } | null)?.files;
            if (!Array.isArray(files)) continue;
            for (const entry of files) if (entry && typeof entry.key === 'string') this.refs.push({ team: p.team, section, config: config as Record<string, unknown>, entry });
        }
    }

    private queuePack(p: LoadedPack): void {
        try {
            this.load.addPack(p.data);
        } catch (e) {
            console.warn(`[preload] pack '${p.team}' is malformed: ${(e as Error).message}`);
        }
    }

    /** Is this entry in its cache? undefined = a type we can't check (then only a failed request counts). */
    private inCache(entry: PackFileEntry): boolean | undefined {
        const key = entry.key as string;
        switch ((entry.type ?? '').toLowerCase()) {
            case 'image': case 'aseprite': case 'atlas': case 'atlasxml': case 'multiatlas': case 'spritesheet': case 'svg':
                return this.textures.exists(key);
            case 'bitmapfont': return this.cache.bitmapFont.exists(key);
            case 'json': return this.cache.json.exists(key);
            case 'tilemaptiledjson': return this.cache.tilemap.exists(key);
            case 'xml': return this.cache.xml.exists(key);
            case 'text': return this.cache.text.exists(key);
            default: return undefined;
        }
    }

    /** Entries that are still missing: a failed request, or a checkable type that never reached its cache. */
    private missingRefs(): FileRef[] {
        return this.refs.filter(r => {
            const cached = this.inCache(r.entry);
            return cached === undefined ? this.failed.has(r.entry.key as string) : !cached;
        });
    }

    private currentErrors(missing: FileRef[]): LoadError[] {
        const errs: LoadError[] = this.packErrors.map(p => ({ kind: 'pack', team: p.team, key: p.team, url: `assets/packs/${p.team}.json`, reason: p.reason }));
        for (const r of missing) {
            const key = r.entry.key as string;
            const url = this.failed.get(key) ?? String(r.entry.url ?? r.entry.fontDataURL ?? r.entry.atlasURL ?? r.entry.textureURL ?? '');
            errs.push({ kind: 'file', team: r.team, key, url, reason: this.failed.has(key) ? 'request failed' : 'not loaded' });
        }
        return errs;
    }

    /** Re-queue the given entries (grouped under their own pack section) and run the loader once more. */
    private reload(refs: FileRef[], newPacks: LoadedPack[], then: () => void): void {
        this.failed.clear();
        for (const p of newPacks) this.queuePack(p);
        const groups = new Map<string, Record<string, unknown>>();
        for (const r of refs) {
            const id = `${r.team}/${r.section}`;
            let section = groups.get(id);
            if (!section) { section = { ...r.config, files: [] }; groups.set(id, section); }
            (section.files as PackFileEntry[]).push(r.entry);
        }
        for (const section of groups.values()) this.load.addPack({ retry: section });
        this.load.once(Phaser.Loader.Events.COMPLETE, then);
        this.load.start();
    }

    /** After every load pass: done, retry (with backoff) or show the error screen. */
    private settle(): void {
        const missing = this.missingRefs();
        if (missing.length > 0 && this.round < LOAD_ATTEMPTS) {
            const delay = LOAD_BACKOFF[this.round - 1] ?? LOAD_BACKOFF[LOAD_BACKOFF.length - 1];
            this.round++;
            this.status.setText(`RETRYING ${missing.length} FILE${missing.length === 1 ? '' : 'S'} (${this.round}/${LOAD_ATTEMPTS})`);
            this.time.delayedCall(delay, () => this.reload(missing, [], () => this.settle()));
            return;
        }
        loadErrors = this.currentErrors(missing);
        if (loadErrors.length === 0) { this.finish(); return; }
        console.warn(`[preload] load failed: ${loadErrors.map(e => `${e.kind} '${e.key}'`).join(', ')}`);
        this.showError();
    }

    private finish(): void {
        this.status.setText('');
        this.createAsepriteAnims();
        // Readiness = "the requested scene booted and (for Game) every team registered". Game sets it at the end of
        // its own create(); any other target (Title, ...) flips it once its create() has run.
        const target = this.route();
        if (target !== 'Game') this.scene.get(target).events.once(Phaser.Scenes.Events.CREATE, () => setReady(true));
        this.scene.start(target);
    }

    // ---- load-error screen

    private showError(): void {
        const { width, height } = this.scale;
        this.busy = false;
        this.status.setText('');
        this.bar.setVisible(false);
        this.barFrame.setVisible(false);
        const files = loadErrors.filter(e => e.kind === 'file').length;
        const packs = loadErrors.length - files;
        const counts = [files && `${files} FILE${files === 1 ? '' : 'S'}`, packs && `${packs} PACK${packs === 1 ? '' : 'S'}`].filter(Boolean).join(' + ');
        const names = loadErrors.slice(0, 3).map(e => e.kind === 'pack' ? `${e.key} pack` : e.key).join(', ') + (loadErrors.length > 3 ? ', ...' : '');
        const reload = this.manualRetries >= MANUAL_RETRIES_BEFORE_RELOAD;
        const text = (y: number, s: string, color: number, size = 8) =>
            this.add.text(width / 2, y, s, { fontFamily: 'monospace', fontSize: `${size}px`, color: HEX(color) }).setOrigin(0.5);
        const cy = height / 2 + 22;
        const panel = this.add.graphics();
        panel.fillStyle(PAL.red2, 0.5).fillRect(24, cy - 20, width - 48, 58);
        panel.lineStyle(1, PAL.red3).strokeRect(24, cy - 20, width - 48, 58);
        const prompt = text(cy + 28, reload ? 'PRESS ENTER / CLICK TO RELOAD' : 'PRESS ENTER / CLICK TO RETRY', PAL.white);
        this.tweens.add({ targets: prompt, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
        this.errorUi = [
            panel,
            text(cy - 12, 'LOAD FAILED: CHECK CONNECTION', PAL.red5, 10),
            text(cy + 2, `${counts} FAILED TO LOAD`, PAL.sand5),
            text(cy + 13, names, PAL.ink5),
            prompt
        ];
        this.onRetry = () => { if (reload) window.location.reload(); else this.retryFromError(); };
        this.input.keyboard?.on('keydown-ENTER', this.onRetry);
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onRetry);
        this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, this.onRetry);
    }

    private clearErrorUi(): void {
        if (this.onRetry) {
            this.input.keyboard?.off('keydown-ENTER', this.onRetry);
            this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onRetry);
            this.input.gamepad?.off(Phaser.Input.Gamepad.Events.BUTTON_DOWN, this.onRetry);
            this.onRetry = null;
        }
        for (const o of this.errorUi) { this.tweens.killTweensOf(o); o.destroy(); }
        this.errorUi = [];
    }

    /** Re-attempt only what failed: re-fetch failed packs, then re-load missing files (a fresh set of rounds). */
    private retryFromError(): void {
        if (this.busy) return;
        this.busy = true;
        this.manualRetries++;
        this.clearErrorUi();
        this.bar.setVisible(true);
        this.barFrame.setVisible(true);
        this.status.setText('RETRYING...');
        loadErrors = [];
        const missing = this.missingRefs();
        const teams = this.packErrors.map(p => p.team);
        Promise.all(teams.map(fetchPack)).then(results => {
            if (!this.scene.isActive()) return;
            const fresh: LoadedPack[] = [];
            this.packErrors = [];
            for (const r of results) {
                if (!r.ok) this.packErrors.push(r.error);
                else if (r.pack) { this.indexPack(r.pack); fresh.push(r.pack); }
            }
            this.round = 1;
            this.reload(missing, fresh, () => this.settle());
        });
    }

    /**
     * Every `aseprite` entry in any pack gets its tags turned into animations (key = tag name). Not Phaser's
     * createFromAseprite: it makes zero-frame anims for our `key#N` frame names (see core/anims.ts).
     */
    private createAsepriteAnims(): void {
        for (const p of this.packs) {
            for (const section of Object.values(p.data)) {
                const files = (section as { files?: PackFileEntry[] } | null)?.files;
                if (!Array.isArray(files)) continue;
                for (const f of files) {
                    if (f.type !== 'aseprite' || !f.key || !this.textures.exists(f.key)) continue;
                    try {
                        createAsepriteAnims(this, f.key);
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
