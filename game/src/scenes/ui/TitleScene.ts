// Title: key art, the animated logo (drop-in + periodic glitch), snow, "PRESS START" attract mode and the menu
// (Start / Part Select / Difficulty / Options / Credits). Confirm in attract mode starts the game at once (arcade
// style); any other input opens the menu. PART SELECT (Phase E, Phase G: every mission) lists the campaign's parts
// grouped by mission with the saved progress and starts a fresh run at the chosen part. Keyboard and gamepad via MenuInput.
import Phaser from 'phaser';
import { TEX, playAnim, settings } from '../../core';
import * as progress from '../../core/progress';
import { CAMPAIGN, type PartDef, type PartId } from '../../config/campaign';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, H, W, icon, pad, panel, roman, text } from '../../ui/widgets';
import { MenuInput } from '../../ui/input';
import { Menu, type MenuRow } from '../../ui/menu';
import { mapSpec } from '../../ui/routemap';
import { wipeIn, wipeOut } from '../../ui/transitions';
import { uiLog } from '../../ui';

interface Progress { unlocked: string[]; best: Record<string, number> }

/** Engine's progress save, read defensively (works without storage; falls back to "1-1 only"). */
function safeProgress(): Progress {
    try {
        const p = (progress as { loadProgress?: () => unknown }).loadProgress?.() as Partial<Progress> | undefined;
        const unlocked = Array.isArray(p?.unlocked) ? p.unlocked.filter((v): v is string => typeof v === 'string') : [];
        const best: Record<string, number> = {};
        if (p?.best && typeof p.best === 'object') for (const [k, v] of Object.entries(p.best)) if (typeof v === 'number') best[k] = v;
        return { unlocked: unlocked.length ? unlocked : ['1-1'], best };
    } catch {
        return { unlocked: ['1-1'], best: {} };
    }
}

export class TitleScene extends Phaser.Scene {
    private menuInput!: MenuInput;
    private menu!: Menu;
    private logo!: Phaser.GameObjects.Sprite;
    private press!: Phaser.GameObjects.BitmapText;
    private hint!: Phaser.GameObjects.BitmapText;
    private attract = true;
    private idle = 0;
    private blink = 0;
    private glitchIn = 0;
    private logoReady = false;
    private starting = false;
    private overlay: 'none' | 'options' | 'credits' | 'parts' = 'none';
    private parts: { root: Phaser.GameObjects.Container; menu: Menu; info: Phaser.GameObjects.BitmapText; tip: Phaser.GameObjects.BitmapText; defs: PartDef[]; prog: Progress } | null = null;

    constructor() { super('Title'); }

    create(): void {
        this.attract = true; this.idle = 0; this.blink = 0; this.starting = false; this.overlay = 'none'; this.logoReady = false; this.parts = null;
        this.cameras.main.setBackgroundColor(C.dim);
        if (this.textures.exists('ui_keyart_title')) this.add.image(0, 0, 'ui_keyart_title').setOrigin(0, 0);
        else this.add.rectangle(0, 0, W, H, 0x1f3f7a, 1).setOrigin(0, 0);
        // darken the lower band so the menu reads over the snowfield
        this.add.rectangle(0, 126, W, H - 126, C.dim, 1).setOrigin(0, 0).setAlpha(0.45);
        this.add.rectangle(0, 126, W, 1, C.sand5, 1).setOrigin(0, 0).setAlpha(0.18);
        // snow
        if (this.textures.exists(TEX.px)) {
            this.add.particles(0, 0, TEX.px, {
                x: { min: -8, max: W + 8 }, y: -4, lifespan: 9000, speedY: { min: 10, max: 24 }, speedX: { min: -12, max: -3 },
                alpha: { start: 0.8, end: 0.4 }, tint: [0xffffff, 0xd8e8ff], quantity: 1, frequency: 90, maxAliveParticles: 120
            }).setDepth(5);
        }
        // logo
        this.logo = this.add.sprite(W / 2, -70, 'ui_logo').setDepth(10);
        playAnim(this.logo, 'logo_idle');
        this.tweens.add({
            targets: this.logo, y: 64, duration: UI.title.logoDropMs, delay: 120, ease: 'Back.easeOut',
            onComplete: () => { this.logoReady = true; this.glitchIn = this.nextGlitch(); }
        });
        // attract prompt
        this.press = text(this, W / 2, 152, 'PRESS START', F.white, [0.5, 0.5]).setTint(C.sand5).setDepth(10);
        this.hint = text(this, W / 2, 170, '↓  MENU', F.plain, [0.5, 0.5]).setAlpha(0.6).setDepth(10);
        // menu
        this.menu = new Menu(this, {
            x: 150, y: 136, rowHeight: UI.title.menuRowHeight, valueX: 250,
            rows: [
                { label: 'START', onSelect: () => this.start() },
                { label: 'PART SELECT', onSelect: () => this.openPartSelect() },
                { label: 'DIFFICULTY', value: () => settings.get().difficulty.toUpperCase(), onAdjust: () => this.toggleDifficulty() },
                { label: 'OPTIONS', onSelect: () => this.openOverlay('options') },
                { label: 'CREDITS', onSelect: () => this.openOverlay('credits') }
            ]
        });
        this.menu.container.setDepth(10);
        this.menu.setVisible(false);
        // footer
        text(this, 4, 207, `V${(window.__KBE?.version ?? '0.1.0').split(' ')[0].toUpperCase()}`, F.plain).setAlpha(0.5).setDepth(10);
        text(this, W - 4, 207, '(C) 2026 KNOTZ  ●  PHASER 4', F.plain, [1, 0]).setAlpha(0.5).setDepth(10);
        this.menuInput = new MenuInput(this);
        getAudio(this).music('music_title', { fade: 800 });
        wipeIn(this);
    }

    private nextGlitch(): number {
        return Phaser.Math.Between(UI.title.glitchMinMs, UI.title.glitchMaxMs);
    }

    private toggleDifficulty(): void {
        settings.update({ difficulty: settings.get().difficulty === 'arcade' ? 'casual' : 'arcade' });
    }

    private start(part?: PartId): void {
        if (this.starting) return;
        this.starting = true;
        uiLog(part ? `title:start ${part}` : 'title:start');
        const audio = getAudio(this);
        audio.sfx('ui_start');
        this.press.setVisible(true).setAlpha(1);
        this.hint.setVisible(false);
        this.menu.setVisible(false);
        this.parts?.root.setVisible(false);
        this.blink = 0;
        // The engine latches every key still held when the Game scene is created, so a held Enter can't pause it.
        // No data = the engine's default ('1-1', or ?part= in dev); PART SELECT passes the part (fresh run state).
        wipeOut(this, () => this.scene.start('Game', part ? { part } : undefined));
    }

    private openOverlay(which: 'options' | 'credits'): void {
        this.overlay = which;
        this.menu.setVisible(false);
        const onClose = (): void => {
            this.overlay = 'none';
            this.menu.setVisible(true);
            this.menu.refresh();
            this.menuInput.rearm();
            this.idle = 0;
        };
        this.scene.launch(which === 'options' ? 'Options' : 'Credits', { from: 'Title', onClose });
    }

    // ---------------------------------------------------------------- PART SELECT (Phase E)

    private openPartSelect(): void {
        this.parts?.root.destroy(true);
        const P = UI.partSelect;
        const prog = safeProgress();
        const defs: PartDef[] = [];
        for (const m of CAMPAIGN) for (const p of m.parts) defs.push(p);
        const root = this.add.container(0, 0).setDepth(12);
        root.add(panel(this, P.x, P.y, P.w, P.h));
        root.add(text(this, P.x + 12, P.y + 6, 'PART SELECT', F.sand));
        // Phase G: the parts of every mission, grouped under a mission header (a gap above each mission after the first).
        const rowY0 = P.y + 36;
        const rows: MenuRow[] = defs.map(p => {
            const locked = (): boolean => !prog.unlocked.includes(p.id);
            return {
                label: `${roman(p.part)}  ${p.title}`,
                value: () => locked() ? 'LOCKED' : (prog.best[p.id] ? `BEST ${pad(prog.best[p.id], 6)}` : 'NEW'),
                disabled: locked,
                onSelect: () => this.start(p.id),
                gap: p.part === 1 && p.mission !== CAMPAIGN[0].id ? P.missionGap : 0
            };
        });
        const menu = new Menu(this, { x: P.x + 56, y: rowY0, rowHeight: P.rowHeight, valueX: P.valueX, rows });
        defs.forEach((p, i) => {
            const y = menu.rowY(i);
            if (p.part === 1) {
                const m = CAMPAIGN.find(mm => mm.id === p.mission);
                const cleared = m ? m.parts.every(q => prog.best[q.id] !== undefined) : false;
                root.add(text(this, P.x + 14, y - 11, `MISSION ${p.mission}  ${m?.name ?? ''}`, F.plain).setTint(cleared ? C.fire5 : C.ink5));
            }
            const locked = !prog.unlocked.includes(p.id);
            const tag = mapSpec(p.mission).pictograms[p.part];
            if (!locked && tag) root.add(icon(this, P.x + 14, y - 5, 'ui_map', tag));
            else root.add(icon(this, P.x + 14, y - 5, 'ui_icons', 'icon_lock').setAlpha(locked ? 0.9 : 0));
        });
        root.add(menu.container);
        // Under the rows: the part's location, then its tip (UI.tips) or what unlocks it.
        const info = text(this, P.x + 14, P.y + P.h - 33, '', F.plain).setTint(C.ink5);
        const tip = text(this, P.x + 14, P.y + P.h - 23, '', F.plain).setTint(C.sand5);
        root.add([info, tip]);
        root.add(text(this, P.x + P.w - 12, P.y + P.h - 12, 'ESC: BACK   ENTER: START', F.plain, [1, 0]).setAlpha(0.6).setTint(C.ink5));
        // start on the furthest unlocked part
        let last = 0;
        defs.forEach((p, i) => { if (prog.unlocked.includes(p.id)) last = i; });
        menu.setIndex(last);
        this.parts = { root, menu, info, tip, defs, prog };
        this.refreshPartInfo();
        this.overlay = 'parts';
        this.menu.setVisible(false);
        this.menuInput.rearm();
        getAudio(this).sfx('radio_blip', { volume: 0.6 });
    }

    private refreshPartInfo(): void {
        if (!this.parts) return;
        const i = this.parts.menu.index;
        const p = this.parts.defs[i];
        const locked = !this.parts.prog.unlocked.includes(p.id);
        const prev = this.parts.defs[i - 1];
        const need = !prev ? '' : prev.mission !== p.mission ? `CLEAR MISSION ${prev.mission} TO UNLOCK` : `CLEAR PART ${roman(prev.part)} TO UNLOCK`;
        // Unlocked: the location and the part's tip (UI.tips); locked: the location and what unlocks it.
        this.parts.info.setText(p.location.toUpperCase());
        this.parts.tip.setText(locked ? need : (UI.tips[p.id] ?? '')).setTint(locked ? C.ink3 : C.sand5);
    }

    private closePartSelect(): void {
        if (!this.parts) return;
        this.parts.root.destroy(true);
        this.parts = null;
        this.overlay = 'none';
        this.menu.setVisible(true);
        this.menu.refresh();
        this.menuInput.rearm();
        this.idle = 0;
        getAudio(this).sfx('ui_back');
    }

    update(_time: number, delta: number): void {
        const dt = Math.min(100, delta);
        this.menuInput.update(dt);
        // logo glitch
        if (this.logoReady) {
            this.glitchIn -= dt;
            if (this.glitchIn <= 0) {
                this.glitchIn = this.nextGlitch();
                if (playAnim(this.logo, 'logo_glitch')) {
                    this.logo.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (this.logo.active) playAnim(this.logo, 'logo_idle'); });
                }
            }
        }
        if (this.overlay === 'parts' && this.parts && !this.starting) {
            if (this.menuInput.back) { this.closePartSelect(); return; }
            const before = this.parts.menu.index;
            this.parts.menu.update(dt, this.menuInput);
            if (this.parts && this.parts.menu.index !== before) this.refreshPartInfo();
            return;
        }
        if (this.overlay !== 'none') return;
        this.blink += dt;
        if (this.starting) {
            this.press.setVisible(Math.floor(this.blink / 60) % 2 === 0);
            return;
        }
        this.idle += dt;
        if (this.attract) {
            const period = UI.title.blinkOnMs + UI.title.blinkOffMs;
            this.press.setVisible(this.blink % period < UI.title.blinkOnMs);
            if (this.menuInput.confirm) { this.start(); return; }
            if (this.menuInput.any) {
                this.attract = false;
                this.idle = 0;
                this.press.setVisible(false);
                this.hint.setVisible(false);
                this.menu.setVisible(true);
                this.menu.refresh();
                getAudio(this).sfx('ui_select');
            }
            return;
        }
        if (this.menuInput.vertical !== 0 || this.menuInput.horizontal !== 0 || this.menuInput.any) this.idle = 0;
        if (this.menuInput.back) { this.toAttract(); getAudio(this).sfx('ui_back'); return; }
        this.menu.update(dt, this.menuInput);
        if (this.idle > UI.title.attractIdleMs) this.toAttract();
    }

    private toAttract(): void {
        this.attract = true;
        this.idle = 0;
        this.blink = 0;
        this.menu.setVisible(false);
        this.press.setVisible(true);
        this.hint.setVisible(true);
    }
}
