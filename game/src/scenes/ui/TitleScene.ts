// Title: key art, the animated logo (drop-in + periodic glitch), snow, "PRESS START" attract mode and the menu
// (Start / Difficulty / Options / Credits). Confirm in attract mode starts the game at once (arcade style);
// any other input opens the menu. Keyboard and gamepad via MenuInput.
import Phaser from 'phaser';
import { TEX, settings } from '../../core';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, H, W, hasAnim, text } from '../../ui/widgets';
import { MenuInput } from '../../ui/input';
import { Menu } from '../../ui/menu';
import { wipeIn, wipeOut } from '../../ui/transitions';
import { uiLog } from '../../ui';

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
    private pendingStart = false;
    private pendingT = 0;
    private overlay: 'none' | 'options' | 'credits' = 'none';

    constructor() { super('Title'); }

    create(): void {
        this.attract = true; this.idle = 0; this.blink = 0; this.starting = false; this.pendingStart = false; this.overlay = 'none'; this.logoReady = false;
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
        if (hasAnim(this, 'logo_idle')) this.logo.play('logo_idle');
        this.tweens.add({
            targets: this.logo, y: 64, duration: UI.title.logoDropMs, delay: 120, ease: 'Back.easeOut',
            onComplete: () => { this.logoReady = true; this.glitchIn = this.nextGlitch(); }
        });
        // attract prompt
        this.press = text(this, W / 2, 152, 'PRESS START', F.white, [0.5, 0.5]).setTint(C.sand5).setDepth(10);
        this.hint = text(this, W / 2, 170, '↓  MENU', F.plain, [0.5, 0.5]).setAlpha(0.6).setDepth(10);
        // menu
        this.menu = new Menu(this, {
            x: 150, y: 138, rowHeight: 13, valueX: 250,
            rows: [
                { label: 'START', onSelect: () => this.start() },
                { label: 'DIFFICULTY', value: () => settings.get().difficulty.toUpperCase(), onAdjust: () => this.toggleDifficulty() },
                { label: 'OPTIONS', onSelect: () => this.openOverlay('options') },
                { label: 'CREDITS', onSelect: () => this.openOverlay('credits') }
            ]
        });
        this.menu.container.setDepth(10);
        this.menu.setVisible(false);
        // footer
        text(this, 4, 207, `V${(window.__KBE?.version ?? '0.1.0').split(' ')[0].toUpperCase()}`, F.plain).setAlpha(0.5).setDepth(10);
        text(this, W - 4, 207, '© 2026 KNOTZ  •  PHASER 4', F.plain, [1, 0]).setAlpha(0.5).setDepth(10);
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

    private start(): void {
        if (this.starting) return;
        this.starting = true;
        uiLog('title:start');
        const audio = getAudio(this);
        audio.sfx('ui_start');
        this.press.setVisible(true).setAlpha(1);
        this.hint.setVisible(false);
        this.menu.setVisible(false);
        this.blink = 0;
        wipeOut(this, () => { this.pendingStart = true; this.pendingT = 0; });
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

    update(_time: number, delta: number): void {
        const dt = Math.min(100, delta);
        this.menuInput.update(dt);
        if (this.pendingStart) {
            // Covered by the wipe: hand off once the confirm key is up (a held Enter would pause the Game at once).
            this.pendingT += dt;
            if (!this.menuInput.anyHeld || this.pendingT > 1000) { this.pendingStart = false; this.scene.start('Game'); }
            return;
        }
        // logo glitch
        if (this.logoReady && hasAnim(this, 'logo_glitch')) {
            this.glitchIn -= dt;
            if (this.glitchIn <= 0) {
                this.glitchIn = this.nextGlitch();
                this.logo.play('logo_glitch');
                this.logo.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (this.logo.active) this.logo.play('logo_idle'); });
            }
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
