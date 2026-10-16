// Pause overlay (launched by flow.pause(), which also pauses Game): RESUME / OPTIONS / QUIT plus a controls
// help panel. Resume via the menu, the pause action or back. MenuInput's arming keeps the Escape that opened
// the menu from closing it on the same press.
import Phaser from 'phaser';
import { getContext, type GameContext } from '../../core';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, panel, text } from '../../ui/widgets';
import { MenuInput } from '../../ui/input';
import { Menu } from '../../ui/menu';
import { ControlsPanel } from '../../ui/controls';
import { dimmer } from '../../ui/widgets';
import { wipeOut } from '../../ui/transitions';
import { uiLog } from '../../ui';

export class PauseScene extends Phaser.Scene {
    private ctx!: GameContext;
    private menuInput!: MenuInput;
    private menu!: Menu;
    private root!: Phaser.GameObjects.Container;
    private controls!: ControlsPanel;
    private closing = false;
    private overlay = false;

    constructor() { super('Pause'); }

    create(): void {
        const ctx = getContext();
        if (!ctx) { this.scene.stop(); return; }
        this.ctx = ctx;
        this.closing = false; this.overlay = false;
        uiLog('pause:open');
        getAudio(this).sfx('ui_pause');
        const dim = dimmer(this, 0);
        this.tweens.add({ targets: dim, alpha: UI.pause.dim, duration: 120 });
        this.root = this.add.container(0, 0);
        const left = panel(this, 40, 58, 128, 100);
        const title = text(this, 52, 66, 'PAUSE', F.fire);
        const right = panel(this, 176, 58, 170, 100);
        const ctitle = text(this, 186, 66, 'CONTROLS', F.gold);
        this.root.add([left, title, right, ctitle]);
        this.menu = new Menu(this, {
            x: 72, y: 100, rowHeight: 14,
            rows: [
                { label: 'RESUME', onSelect: () => this.resume() },
                { label: 'OPTIONS', onSelect: () => this.options() },
                { label: 'QUIT', onSelect: () => this.quit() }
            ]
        });
        this.root.add(this.menu.container);
        this.controls = new ControlsPanel(this, { x: 184, y: 84, rowHeight: 13, showPad: true });
        this.root.add(this.controls.container);
        const foot = text(this, 192, 166, 'ESC  RESUME', F.plain, [0.5, 0]).setAlpha(0.6).setTint(C.ink5);
        this.root.add(foot);
        this.menuInput = new MenuInput(this);
    }

    private resume(): void {
        if (this.closing) return;
        this.closing = true;
        uiLog('pause:resume');
        getAudio(this).sfx('ui_unpause');
        this.ctx.flow.resume();
    }

    private quit(): void {
        if (this.closing) return;
        this.closing = true;
        const audio = getAudio(this);
        audio.sfx('ui_back');
        audio.music(null, { fade: 300 });
        wipeOut(this, () => this.ctx.flow.quit());
    }

    private options(): void {
        this.overlay = true;
        this.root.setVisible(false);
        this.scene.launch('Options', {
            from: 'Pause',
            onClose: () => {
                this.overlay = false;
                this.root.setVisible(true);
                this.controls.rebuild();
                this.menuInput.rearm();
            }
        });
    }

    update(_time: number, delta: number): void {
        if (!this.ctx || this.closing) return;
        const dt = Math.min(100, delta);
        this.menuInput.update(dt);
        if (this.overlay) return;
        // Enter is bound to both confirm and pause: let the menu take it; Esc/Start (pause without confirm) resumes.
        if (this.menu.update(dt, this.menuInput)) return;
        if ((this.menuInput.justDown('pause') && !this.menuInput.justDown('confirm')) || this.menuInput.back) this.resume();
    }
}
