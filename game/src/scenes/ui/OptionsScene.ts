// Options overlay (from the Title or the Pause menu): master/music/sfx volumes, difficulty, CRT filter, screen
// shake, reduced flash, mute, a CONTROLS page that shows the bindings and rebinds keyboard keys, reset, back.
// Persists through the engine's settings store (+ UI prefs for the master volume) and emits settings:changed on
// the Game bus when a run is active so FX/engine react live.
import Phaser from 'phaser';
import { DEFAULT_KEYS, getContext, settings, type Action } from '../../core';
import { getAudio } from '../../audio';
import { getPrefs, updatePrefs } from '../../ui/prefs';
import { C, F, W, bar, dimmer, panel, text } from '../../ui/widgets';
import { MenuInput } from '../../ui/input';
import { Menu } from '../../ui/menu';
import { ControlsPanel, CONTROL_ROWS } from '../../ui/controls';
import { keyNameOf } from '../../ui/keys';

type Page = 'main' | 'controls';

export class OptionsScene extends Phaser.Scene {
    private onClose: (() => void) | undefined;
    private menuInput!: MenuInput;
    private main!: Menu;
    private controlsMenu!: Menu;
    private controls!: ControlsPanel;
    private page: Page = 'main';
    private bars: Phaser.GameObjects.Image[][] = [];
    private pageRoot!: Phaser.GameObjects.Container;
    private controlsRoot!: Phaser.GameObjects.Container;
    private listening: Action | null = null;
    private listenText!: Phaser.GameObjects.BitmapText;
    private closing = false;
    private readonly keyHandler = (e: KeyboardEvent): void => this.onKey(e);

    constructor() { super('Options'); }

    init(data: { from?: string; onClose?: () => void }): void {
        void data?.from;

        this.onClose = data?.onClose;
    }

    create(): void {
        this.page = 'main'; this.listening = null; this.closing = false; this.bars = [];
        dimmer(this, 0.55);
        panel(this, 40, 18, 304, 180);
        text(this, W / 2, 28, 'OPTIONS', F.sand, [0.5, 0]);
        this.pageRoot = this.add.container(0, 0);
        this.controlsRoot = this.add.container(0, 0).setVisible(false);
        const vol = (get: () => number, set: (v: number) => void) => (dir: -1 | 1): void => { set(Phaser.Math.Clamp(Math.round((get() + dir * 0.1) * 10) / 10, 0, 1)); };
        const onOff = (b: boolean): string => b ? 'ON' : 'OFF';
        this.main = new Menu(this, {
            x: 60, y: 52, rowHeight: 13, valueX: 322,
            rows: [
                { label: 'MASTER VOLUME', value: () => '', onAdjust: vol(() => getPrefs().master, v => { updatePrefs({ master: v }); this.changed(); }) },
                { label: 'MUSIC VOLUME', value: () => '', onAdjust: vol(() => settings.get().musicVolume, v => this.set({ musicVolume: v })) },
                { label: 'SFX VOLUME', value: () => '', onAdjust: vol(() => settings.get().sfxVolume, v => this.set({ sfxVolume: v })) },
                { label: 'DIFFICULTY', value: () => settings.get().difficulty.toUpperCase(), onAdjust: () => this.set({ difficulty: settings.get().difficulty === 'arcade' ? 'casual' : 'arcade' }) },
                { label: 'CRT FILTER', value: () => onOff(settings.get().crt), onAdjust: () => this.set({ crt: !settings.get().crt }) },
                { label: 'SCREEN SHAKE', value: () => onOff(settings.get().shake), onAdjust: () => this.set({ shake: !settings.get().shake }) },
                { label: 'REDUCED FLASH', value: () => onOff(settings.get().reducedFlash), onAdjust: () => this.set({ reducedFlash: !settings.get().reducedFlash }) },
                { label: 'MUTE', value: () => onOff(settings.get().mute), onAdjust: () => this.set({ mute: !settings.get().mute }) },
                { label: 'CONTROLS', value: () => '→', onSelect: () => this.showPage('controls') },
                { label: 'BACK', onSelect: () => this.close() }
            ]
        });
        this.pageRoot.add(this.main.container);
        // volume bars (10 segments) for the first three rows
        for (let r = 0; r < 3; r++) {
            const segs: Phaser.GameObjects.Image[] = [];
            for (let i = 0; i < 10; i++) {
                const b = bar(this, 240 + i * 8, 52 + r * 13 + 1, 6, 6, C.fire5);
                segs.push(b);
                this.pageRoot.add(b);
            }
            this.bars.push(segs);
        }
        this.pageRoot.add(text(this, W / 2, 184, '↑↓ SELECT   ←→ ADJUST   ENTER OK   ESC BACK', F.plain, [0.5, 0.5]).setAlpha(0.6));
        // controls page
        this.controlsRoot.add(text(this, 60, 50, 'CONTROLS', F.gold));
        this.controlsRoot.add(text(this, 322, 50, 'KEY  •  ALT  •  PAD', F.plain, [1, 0]).setAlpha(0.7));
        this.controls = new ControlsPanel(this, { x: 150, y: 70, rowHeight: 14, alternates: true, showPad: true, movement: true });
        this.controlsRoot.add(this.controls.container);
        this.controlsMenu = new Menu(this, {
            x: 60, y: 63, rowHeight: 14, silent: false,
            rows: [
                { label: 'MOVE / AIM', disabled: () => true },
                ...CONTROL_ROWS.map(r => ({ label: r.label, onSelect: () => this.listen(r.action) })),
                { label: 'RESET DEFAULTS', onSelect: () => this.resetKeys() },
                { label: 'BACK', onSelect: () => this.showPage('main') }
            ]
        });
        this.controlsMenu.setIndex(1);
        this.controlsRoot.add(this.controlsMenu.container);
        this.listenText = text(this, W / 2, 184, '', F.hud, [0.5, 0.5]).setTint(C.fire5);
        this.controlsRoot.add(this.listenText);
        this.refreshBars();
        this.menuInput = new MenuInput(this);
        window.addEventListener('keydown', this.keyHandler, true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', this.keyHandler, true));
    }

    private set(patch: Parameters<typeof settings.update>[0]): void {
        settings.update(patch);
        this.changed();
    }

    /** Settings changed: refresh the display and tell a running Game (FX re-applies CRT, the player reads difficulty). */
    private changed(): void {
        this.refreshBars();
        this.main.refresh();
        const ctx = getContext();
        if (ctx) {
            ctx.state.difficulty = settings.difficulty;
            ctx.events.emit('settings:changed', { difficulty: settings.difficulty });
        }
        getAudio(this).applySettings();
    }

    private refreshBars(): void {
        const vals = [getPrefs().master, settings.get().musicVolume, settings.get().sfxVolume];
        this.bars.forEach((segs, r) => {
            const n = Math.round(vals[r] * 10);
            segs.forEach((s, i) => s.setTint(i < n ? (r === this.main.index ? C.fire5 : C.sand4) : C.ink3).setAlpha(i < n ? 1 : 0.5));
        });
    }

    private showPage(p: Page): void {
        this.page = p;
        this.pageRoot.setVisible(p === 'main');
        this.controlsRoot.setVisible(p === 'controls');
        this.listening = null;
        this.listenText.setText(p === 'controls' ? 'ENTER: REBIND KEY   ESC: BACK' : '');
        this.menuInput.rearm();
        if (p === 'controls') this.controls.rebuild();
    }

    private listen(action: Action): void {
        this.listening = action;
        this.listenText.setText(`PRESS A KEY FOR ${CONTROL_ROWS.find(r => r.action === action)?.label ?? action}   (ESC CANCELS)`);
    }

    private onKey(e: KeyboardEvent): void {
        if (!this.listening || !this.scene.isActive()) return;
        e.preventDefault();
        e.stopPropagation();
        const action = this.listening;
        this.listening = null;
        const name = keyNameOf(e.keyCode);
        if (e.keyCode === 27 || !name) {
            this.listenText.setText('ENTER: REBIND KEY   ESC: BACK');
            getAudio(this).sfx('ui_back');
            this.menuInput.rearm();
            return;
        }
        const keys = { ...settings.get().keys };
        const old = keys[action] ?? [];
        keys[action] = [name, ...old.filter(k => k !== name)].slice(0, 2);
        settings.update({ keys });
        this.controls.rebuild();
        this.listenText.setText(`${CONTROL_ROWS.find(r => r.action === action)?.label ?? action} = ${name}`);
        getAudio(this).sfx('ui_select');
        this.menuInput.rearm();
    }

    private resetKeys(): void {
        settings.update({ keys: structuredClone(DEFAULT_KEYS) as Record<Action, string[]> });
        this.controls.rebuild();
        this.listenText.setText('DEFAULT KEYS RESTORED');
    }

    private close(): void {
        if (this.closing) return;
        this.closing = true;
        getAudio(this).sfx('ui_back');
        const cb = this.onClose;
        this.scene.stop();
        cb?.();
    }

    update(_time: number, delta: number): void {
        if (this.closing) return;
        const dt = Math.min(100, delta);
        this.menuInput.update(dt);
        if (this.listening) return;
        if (this.page === 'main') {
            if (this.menuInput.back) { this.close(); return; }
            const before = this.main.index;
            this.main.update(dt, this.menuInput);
            if (before !== this.main.index) this.refreshBars();
        } else {
            if (this.menuInput.back) { getAudio(this).sfx('ui_back'); this.showPage('main'); return; }
            this.controlsMenu.update(dt, this.menuInput);
        }
    }
}

