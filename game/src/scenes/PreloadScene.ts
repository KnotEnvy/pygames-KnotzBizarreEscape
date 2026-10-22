// Preload: queue every pack fetched by Boot, show a clean progress bar, create Aseprite animations
// (core/anims.ts; tag names become anim keys), then route: ?scene= → 'Title' (if registered) → 'Game'.
// Every pack file is required. A file that fails is retried (LOAD_ATTEMPTS rounds with backoff); if files or
// packs still fail, Preload never routes: it shows the load-error screen (Enter / click / pad retries only what
// failed) and __KBE.state().loadErrors lists the failures while __KBE.ready stays false. loadErrors is only
// non-empty on that screen (automatic retries in progress don't count as an error yet).
// Phase G mission mode (core/missionPacks.ts): started by Game with { missions, next }, it fetches and loads the
// `<team>.m<N>.json` packs the same way (same bar, retries and error screen), then starts `next` instead of routing.
// Its error screen also offers ESC / pad B: BACK TO TITLE (rules review G3), and before its RELOAD the pending
// Game { part, carry } is stashed in sessionStorage; the boot-mode Preload after the reload resumes it once.
import Phaser from 'phaser';
import { fetchPack, LOAD_ATTEMPTS, LOAD_BACKOFF, type LoadedPack, type PackError } from './BootScene';
import { PAL } from '../core/textures';
import { PARAMS } from '../core/params';
import { registerDebug, setReady } from '../core/debug/hooks';
import { createAsepriteAnims } from '../core/anims';
import { markMissionLoaded, missionPackNames, stashMissionResume, takeMissionResume, type MissionLoadData } from '../core/missionPacks';
import type { GameStartData } from '../config/campaign';
import { CAMPAIGN } from '../config/campaign';

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
    private onTitle: (() => void) | null = null;
    private onPad: ((pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => void) | null = null;
    /** Mission mode: the missions being loaded and the scene to start afterwards (null = boot mode). */
    private mission: MissionLoadData | null = null;

    constructor() {
        super('Preload');
        registerDebug('loadErrors', () => loadErrors.map(e => ({ ...e })));
    }

    init(data: { packs?: LoadedPack[]; packErrors?: PackError[] } & Partial<MissionLoadData>): void {
        this.mission = data.missions && data.next ? { missions: [...data.missions], next: data.next } : null;
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
        const m = this.mission ? CAMPAIGN.find(c => c.id === this.mission!.missions[0]) : undefined;
        this.add.text(width / 2, height / 2 - 12, m ? `MISSION ${m.id}: ${m.name}` : 'KNOTZ BIZARRE ESCAPE', {
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
        if (!this.mission) { this.settle(); return; }
        // Mission mode: fetch the mission's packs (missing ones skip quietly), then one load pass and settle().
        const names = this.mission.missions.flatMap(missionPackNames);
        Promise.all(names.map(fetchPack)).then(results => {
            if (!this.scene.isActive()) return;
            const fresh: LoadedPack[] = [];
            for (const r of results) {
                if (!r.ok) this.packErrors.push(r.error);
                else if (r.pack) { this.indexPack(r.pack); fresh.push(r.pack); }
            }
            if (fresh.length === 0) { this.settle(); return; }
            this.reload([], fresh, () => this.settle());
        });
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
        if (this.mission) {
            for (const n of this.mission.missions) markMissionLoaded(n);
            console.info(`[preload] mission pack(s) ${this.mission.missions.join(', ')} loaded (${this.packs.map(p => p.team).join(', ') || 'none deployed'})`);
            // Game sets __KBE.ready at the end of its create(); anything else flips it on create.
            const { scene, data } = this.mission.next;
            if (scene !== 'Game') this.scene.get(scene).events.once(Phaser.Scenes.Events.CREATE, () => setReady(true));
            this.scene.start(scene, data);
            return;
        }
        // Readiness = "the requested scene booted and (for Game) every team registered". Game sets it at the end of
        // its own create(); any other target (Title, ...) flips it once its create() has run.
        // G3: a mission load that failed and reloaded the page resumes its { part, carry } once (Game re-enters
        // Preload's mission mode for the packs). Stale, malformed or missing stashes fall through to the route.
        const resume = this.has('Game') ? takeMissionResume() : null;
        if (resume) {
            console.info(`[preload] resuming part ${resume.part} after a reload${resume.carry ? ' (carried run)' : ''}`);
            this.scene.start('Game', resume);
            return;
        }
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
        const toTitle = this.mission !== null && this.has('Title');
        this.tweens.add({ targets: prompt, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
        this.errorUi = [
            panel,
            text(cy - 12, 'LOAD FAILED: CHECK CONNECTION', PAL.red5, 10),
            text(cy + 2, `${counts} FAILED TO LOAD`, PAL.sand5),
            text(cy + 13, names, PAL.ink5),
            prompt
        ];
        if (toTitle) this.errorUi.push(text(cy + 44, 'ESC / B: BACK TO TITLE', PAL.sand5));
        this.onRetry = () => { if (reload) this.reloadPage(); else this.retryFromError(); };
        this.onTitle = toTitle ? () => this.backToTitle() : null;
        this.onPad = (_pad, button) => { if (button?.index === 1 && this.onTitle) this.onTitle(); else this.onRetry?.(); };
        this.input.keyboard?.on('keydown-ENTER', this.onRetry);
        if (this.onTitle) this.input.keyboard?.on('keydown-ESC', this.onTitle);
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onRetry);
        this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, this.onPad);
    }

    private clearErrorUi(): void {
        if (this.onRetry) {
            this.input.keyboard?.off('keydown-ENTER', this.onRetry);
            this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onRetry);
            this.onRetry = null;
        }
        if (this.onTitle) { this.input.keyboard?.off('keydown-ESC', this.onTitle); this.onTitle = null; }
        if (this.onPad) { this.input.gamepad?.off(Phaser.Input.Gamepad.Events.BUTTON_DOWN, this.onPad); this.onPad = null; }
        for (const o of this.errorUi) { this.tweens.killTweensOf(o); o.destroy(); }
        this.errorUi = [];
    }

    /** The RELOAD choice. Mission mode stashes the pending Game { part, carry } first (resumed once after the reload). */
    private reloadPage(): void {
        const next = this.mission?.next;
        if (next?.scene === 'Game' && next.data) stashMissionResume(next.data as GameStartData);
        window.location.reload();
    }

    /** Mission mode: give up on the mission and go to the Title (the progress unlock is already saved). */
    private backToTitle(): void {
        if (this.busy) return;
        this.busy = true;
        this.clearErrorUi();
        loadErrors = [];
        console.info(`[preload] mission ${this.mission?.missions.join(', ')} load abandoned: back to Title`);
        this.scene.get('Title').events.once(Phaser.Scenes.Events.CREATE, () => setReady(true));
        this.scene.start('Title');
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

    private has(k: string): boolean { return this.scene.manager.keys[k] !== undefined; }

    private route(): string {
        const has = (k: string) => this.has(k);
        if (PARAMS.scene && has(PARAMS.scene)) return PARAMS.scene;
        if (PARAMS.scene) console.info(`[preload] ?scene=${PARAMS.scene} is not registered`);
        return has('Title') ? 'Title' : 'Game';
    }
}
