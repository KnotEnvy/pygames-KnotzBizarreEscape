// HUD overlay (launched by GameScene): 1UP + score + lives, ARMS/BOMB with the weapon icon, rescue tally, weapon
// callouts, GO! arrow on camera unlock, the boss bar, floating score popups and level prompts. Everything is
// driven by bus events; the layout follows GDD §9 and the Phase A mock (384×216).
import Phaser from 'phaser';
import { getContext, hasAnim, registerDebug, tagFrame, type GameContext, type GameEvents } from '../../core';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, W, WEAPON_NAMES, icon, pad, panel, text } from '../../ui/widgets';
import { Callout } from '../../ui/callout';
import { fadeOut, wipeIn } from '../../ui/transitions';
import { uiDebug } from '../../ui';

interface Popup { t: Phaser.GameObjects.BitmapText; wx: number; wy: number; age: number }

export class HudScene extends Phaser.Scene {
    private ctx!: GameContext;
    private clock = 0;
    // score / lives
    private score = 0;
    private shownScore = 0;
    private scoreText!: Phaser.GameObjects.BitmapText;
    private livesText!: Phaser.GameObjects.BitmapText;
    private lives = 0;
    private livesFlash = 0;
    // arms / bombs
    private weaponIcon!: Phaser.GameObjects.Image;
    private ammoText!: Phaser.GameObjects.BitmapText;
    private bombText!: Phaser.GameObjects.BitmapText;
    private ammo = Infinity;
    private weapon = 'pistol';
    private blink = 0;
    // rescue
    private powIcons: Phaser.GameObjects.Image[] = [];
    private rescuedText!: Phaser.GameObjects.BitmapText;
    // GO!
    private go!: Phaser.GameObjects.Sprite;
    private goLeft = 0;
    private goT = 0;
    private locked = false;
    // boss
    private bossBox!: Phaser.GameObjects.Container;
    private bossFill!: Phaser.GameObjects.Image;
    private bossGhost!: Phaser.GameObjects.Image;
    private bossFrame!: Phaser.GameObjects.Image;
    private bossName!: Phaser.GameObjects.BitmapText;
    private bossHp = 0;
    private bossMax = 1;
    private bossGhostHp = 0;
    private bossShown = false;
    private bossFlash = 0;
    // callout / popups / prompt
    private callout!: Callout;
    private popups: Popup[] = [];
    private promptBox!: Phaser.GameObjects.Container;
    private promptText!: Phaser.GameObjects.BitmapText;
    private promptPanel!: Phaser.GameObjects.NineSlice;
    private promptUntil = 0;
    private promptShown = false;
    private killChain = 0;
    private lastKillAt = -1e9;
    private cleared = false;

    constructor() { super('HUD'); }

    create(): void {
        const ctx = getContext();
        if (!ctx) { this.scene.stop(); return; }
        this.ctx = ctx;
        this.clock = 0;
        this.cleared = false;
        this.build();
        this.refreshAll();
        const bus = ctx.events.scoped(this);
        bus.on('score:changed', e => { this.score = e.value; });
        bus.on('lives:changed', e => this.setLives(e.value));
        bus.on('ammo:changed', e => this.setAmmo(e.value));
        bus.on('bombs:changed', e => this.bombText.setText(String(e.value)));
        bus.on('weapon:changed', e => this.setWeapon(e.weapon, e.ammo, true));
        bus.on('rescued:changed', e => this.setRescued(e.value));
        bus.on('camera:lock', () => { this.locked = true; });
        bus.on('camera:unlock', () => { if (!this.locked) return; this.locked = false; this.showGo(); });
        bus.on('boss:spawn', e => this.bossSpawn(e));
        bus.on('boss:hp', e => this.bossSetHp(e));
        bus.on('boss:phase', e => { this.bossSetHp(e); this.bossFlash = 260; });
        bus.on('boss:defeated', e => this.bossDefeated(e));
        bus.on('ui:popup', e => this.popup(e.x, e.y, e.text, e.color));
        bus.on('enemy:killed', e => this.onKill(e));
        bus.on('ui:prompt', e => this.showPrompt(e.text, e.ms));
        bus.on('stage:clear', () => this.onClear());
        bus.on('game:over', () => { this.callout.hide(); this.hidePrompt(); });
        bus.on('game:continue', () => { this.killChain = 0; this.refreshAll(); });
        bus.on('player:died', () => { this.killChain = 0; });
        wipeIn(this);
        registerDebug('hud', () => ({
            score: this.scoreText.text, lives: this.livesText.text, ammo: this.ammoText.text, bombs: this.bombText.text,
            weapon: this.weapon, rescued: this.rescuedText.text, go: this.goLeft > 0, boss: this.bossShown ? { name: this.bossName.text, hp: this.bossHp, max: this.bossMax } : null,
            callout: this.callout.text, prompt: this.promptShown ? this.promptText.text : '', popups: this.popups.filter(p => p.age < UI.hud.popup.life).length
        }));
        uiDebug.hud = 'running';
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { uiDebug.hud = null; });
    }

    private build(): void {
        // top-left: 1UP badge, score, lives
        const oneUp = tagFrame(this, 'hud_1up');
        if (oneUp !== undefined) this.add.image(3, 3, 'ui_hud', oneUp).setOrigin(0, 0);
        else text(this, 4, 4, '1UP', F.gold);
        this.scoreText = text(this, 30, 5, pad(0, UI.hud.scoreDigits), F.gold);
        icon(this, 3, 16, 'ui_icons', 'icon_life');
        this.livesText = text(this, 21, 20, '× 0', F.hud);
        // top-center: ARMS / BOMB
        this.weaponIcon = icon(this, 150, 3, 'ui_icons', 'icon_pistol');
        text(this, 168, 4, 'ARMS', F.gold);
        this.ammoText = text(this, 180, 14, '∞', F.hud, [0.5, 0]);
        icon(this, 203, 3, 'ui_icons', 'icon_bomb');
        text(this, 221, 4, 'BOMB', F.gold);
        this.bombText = text(this, 233, 14, '0', F.hud, [0.5, 0]);
        // top-right: rescue tally
        this.rescuedText = text(this, W - 4, 20, 'RESCUED 0', F.hud, [1, 0]);
        // GO!
        this.go = this.add.sprite(UI.hud.go.x, UI.hud.go.y, 'ui_hud').setOrigin(0, 0).setVisible(false);
        // boss bar
        const B = UI.hud.bossBar;
        this.bossBox = this.add.container(B.x, B.hiddenY);
        this.bossGhost = this.add.image(3, 4, 'ui_bossbar_fill').setOrigin(0, 0).setTint(0x8a2a26);
        this.bossFill = this.add.image(3, 4, 'ui_bossbar_fill').setOrigin(0, 0);
        this.bossFrame = this.add.image(0, 0, 'ui_bossbar_frame').setOrigin(0, 0);
        const skull = icon(this, -19, -1, 'ui_icons', 'icon_skull');
        this.bossName = text(this, 2, -10, '', F.hud).setTint(C.red5);
        // The frame is opaque (its dark slot is the empty bar), so the ghost and the fill draw ABOVE it (KBE-QA-U01).
        this.bossBox.add([this.bossFrame, this.bossGhost, this.bossFill, skull, this.bossName]);
        // callout, popups, prompt
        this.callout = new Callout(this, UI.hud.callout.y, 40);
        this.popups = [];
        for (let i = 0; i < UI.hud.popup.cap; i++) {
            this.popups.push({ t: text(this, 0, 0, '', F.gold, [0.5, 0.5]).setVisible(false).setDepth(30), wx: 0, wy: 0, age: UI.hud.popup.life });
        }
        this.promptBox = this.add.container(W / 2, UI.hud.prompt.hiddenY).setDepth(35);
        this.promptPanel = panel(this, -60, -9, 120, 18, true);
        this.promptText = text(this, 0, 0, '', F.hud, [0.5, 0.5]);
        this.promptBox.add([this.promptPanel, this.promptText]);
    }

    private refreshAll(): void {
        const s = this.ctx.state;
        this.score = s.score;
        this.shownScore = s.score;
        this.scoreText.setText(pad(s.score, UI.hud.scoreDigits));
        this.lives = s.lives;
        this.livesText.setText(`× ${s.lives}`).setTint(C.white);
        this.setWeapon(s.weapon, s.ammo, false);
        this.bombText.setText(String(s.bombs));
        this.setRescued(s.rescued);
    }

    // ---------------------------------------------------------------- state → display

    private setLives(v: number): void {
        if (v < this.lives) this.livesFlash = 700;
        this.lives = v;
        this.livesText.setText(`× ${v}`);
    }

    private setAmmo(v: number): void {
        this.ammo = v;
        this.ammoText.setText(Number.isFinite(v) ? String(v) : '∞');
    }

    private setWeapon(weapon: string, ammo: number, announce: boolean): void {
        const changed = weapon !== this.weapon;
        this.weapon = weapon;
        const frame = tagFrame(this, `icon_${weapon}`) ?? tagFrame(this, 'icon_pistol');
        if (frame !== undefined) this.weaponIcon.setFrame(frame);
        this.setAmmo(ammo);
        const name = WEAPON_NAMES[weapon];
        if (announce && name && (changed || weapon !== 'pistol')) {
            this.callout.show(name, { font: F.fire, sfx: 'callout' });
            uiDebug.lastCallout = name;
            getAudio(this).duck(0.6, 500, 300);
        }
    }

    private setRescued(n: number): void {
        for (const i of this.powIcons) i.destroy();
        this.powIcons = [];
        const shown = Math.min(n, 6);
        for (let i = 0; i < shown; i++) this.powIcons.push(icon(this, W - 4 - 16 * (i + 1), 3, 'ui_icons', 'icon_pow'));
        this.rescuedText.setText(`RESCUED ${n}`);
    }

    private showGo(): void {
        this.goLeft = UI.hud.go.showMs;
        this.goT = 0;
        this.go.setVisible(true);
        if (hasAnim(this, 'hud_go')) this.go.play({ key: 'hud_go', repeat: -1 }, true);
        getAudio(this).sfx('callout', { volume: 0.8 });
    }

    // ---------------------------------------------------------------- boss bar

    private bossSpawn(e: GameEvents['boss:spawn']): void {
        this.bossMax = Math.max(1, e.maxHp);
        this.bossHp = e.hp;
        this.bossGhostHp = e.hp;
        this.bossName.setText(e.name.toUpperCase());
        this.bossShown = true;
        this.bossCrop();
        this.tweens.killTweensOf(this.bossBox);
        this.tweens.add({ targets: this.bossBox, y: UI.hud.bossBar.y, duration: UI.hud.bossBar.slideMs, ease: 'Back.easeOut' });
    }

    private bossSetHp(e: GameEvents['boss:hp']): void {
        if (!this.bossShown) this.bossSpawn(e);
        this.bossMax = Math.max(1, e.maxHp);
        this.bossHp = Math.max(0, e.hp);
        this.bossCrop();
    }

    private bossDefeated(e: GameEvents['boss:defeated']): void {
        this.bossHp = 0;
        this.bossMax = Math.max(1, e.maxHp);
        this.bossCrop();
        this.time.delayedCall(900, () => {
            this.bossShown = false;
            this.tweens.add({ targets: this.bossBox, y: UI.hud.bossBar.hiddenY, duration: UI.hud.bossBar.slideMs, ease: 'Quad.easeIn' });
        });
    }

    private bossCrop(): void {
        const B = UI.hud.bossBar;
        const w = Math.round(B.fillW * this.bossHp / this.bossMax);
        const g = Math.round(B.fillW * this.bossGhostHp / this.bossMax);
        this.bossFill.setCrop(0, 0, w, B.fillH).setVisible(w > 0);
        this.bossGhost.setCrop(0, 0, g, B.fillH).setVisible(g > 0);
    }

    // ---------------------------------------------------------------- popups / prompts / clear

    private popup(wx: number, wy: number, str: string, color?: number): void {
        let p: Popup | null = null;
        for (const q of this.popups) if (q.age >= UI.hud.popup.life) { p = q; break; }
        if (!p) return;
        const score = str.startsWith('+') || str.startsWith('×');
        p.age = 0; p.wx = wx; p.wy = wy;
        p.t.setFont(score ? F.gold : F.hud).setText(str).setTint(color ?? (score ? C.white : C.popupAlert)).setAlpha(1).setVisible(true);
        this.placePopup(p);
    }

    private placePopup(p: Popup): void {
        const cam = this.ctx.scene.cameras.main;
        const rise = UI.hud.popup.rise * Math.min(1, p.age / UI.hud.popup.life);
        p.t.setPosition(Math.round(p.wx - cam.scrollX), Math.round(p.wy - cam.scrollY - rise));
    }

    private onKill(e: GameEvents['enemy:killed']): void {
        if (e.score > 0) this.popup(e.x, e.y - 28, `+${e.score}`);
        const K = UI.hud.multiKill;
        this.killChain = this.clock - this.lastKillAt <= K.windowMs ? this.killChain + 1 : 1;
        this.lastKillAt = this.clock;
        if (this.killChain >= 2 && e.score > 0) {
            const bonus = K.bonusPerExtra * (this.killChain - 1);
            this.ctx.state.score += bonus;
            this.popup(e.x, e.y - 42, `×${this.killChain} +${bonus}`, C.fire4);
        }
    }

    private showPrompt(str: string, ms?: number): void {
        uiDebug.lastPrompt = str;
        this.promptText.setText(str);
        const w = Math.max(60, this.promptText.width + 16);
        this.promptPanel.setSize(w, 18).setPosition(-w / 2, -9);
        this.promptUntil = this.clock + (ms ?? UI.hud.prompt.defaultMs);
        if (!this.promptShown) {
            this.promptShown = true;
            this.tweens.killTweensOf(this.promptBox);
            this.tweens.add({ targets: this.promptBox, y: UI.hud.prompt.y, duration: UI.hud.prompt.slideMs, ease: 'Back.easeOut' });
        }
    }

    private hidePrompt(): void {
        if (!this.promptShown) return;
        this.promptShown = false;
        this.tweens.killTweensOf(this.promptBox);
        this.tweens.add({ targets: this.promptBox, y: UI.hud.prompt.hiddenY, duration: UI.hud.prompt.slideMs, ease: 'Quad.easeIn' });
    }

    private onClear(): void {
        if (this.cleared) return;
        this.cleared = true;
        this.hidePrompt();
        this.callout.show('MISSION COMPLETE!', { font: F.steel, sfx: 'mission_complete', holdMs: 2600 });
        uiDebug.lastCallout = 'MISSION COMPLETE!';
        // The engine cuts to Results 3.5 s after stage:clear: land that cut on black.
        this.time.delayedCall(UI.hud.clearFadeAtMs, () => fadeOut(this, () => {}, 600));
    }

    // ---------------------------------------------------------------- per-frame

    update(_time: number, delta: number): void {
        if (!this.ctx) return;
        const dt = Math.min(100, delta);
        this.clock += dt;
        // score tally
        if (this.shownScore !== this.score) {
            const diff = this.score - this.shownScore;
            const step = Math.abs(diff) < 1.5 ? diff : diff * Math.min(1, UI.hud.tallyRate * dt / 16);
            this.shownScore = Math.abs(diff) < 1.5 ? this.score : this.shownScore + (diff > 0 ? Math.max(1, step) : Math.min(-1, step));
            this.scoreText.setText(pad(this.shownScore, UI.hud.scoreDigits));
        }
        // lives flash
        if (this.livesFlash > 0) {
            this.livesFlash -= dt;
            this.livesText.setTint(Math.floor(this.livesFlash / 90) % 2 === 0 ? C.red4 : C.white);
            if (this.livesFlash <= 0) this.livesText.setTint(C.white);
        }
        // low ammo blink
        this.blink += dt;
        if (Number.isFinite(this.ammo) && this.ammo <= UI.hud.lowAmmo && this.weapon !== 'pistol') {
            this.ammoText.setTint(Math.floor(this.blink / 250) % 2 === 0 ? C.red4 : C.white);
        } else this.ammoText.setTint(C.white);
        // GO!
        if (this.goLeft > 0) {
            this.goLeft -= dt; this.goT += dt;
            this.go.x = UI.hud.go.x + Math.round(Math.sin(this.goT / 110) * 3);
            if (this.goLeft <= 0) { this.go.setVisible(false); this.go.stop(); }
        }
        // boss ghost drain + phase flash
        if (this.bossShown || this.bossGhostHp > this.bossHp) {
            const B = UI.hud.bossBar;
            if (this.bossGhostHp > this.bossHp) {
                this.bossGhostHp = Math.max(this.bossHp, this.bossGhostHp - (this.bossGhostHp - this.bossHp) * Math.min(1, dt / B.ghostLagMs) - 0.05);
                this.bossCrop();
            } else this.bossGhostHp = this.bossHp;
            if (this.bossFlash > 0) {
                this.bossFlash -= dt;
                const on = Math.floor(this.bossFlash / 65) % 2 === 0;
                this.bossFrame.setTint(on ? C.white : 0xffffff).setTintMode(on ? Phaser.TintModes.FILL : Phaser.TintModes.MULTIPLY);
                this.bossName.setTint(on ? C.white : C.red5);
                if (this.bossFlash <= 0) { this.bossFrame.clearTint(); this.bossName.setTint(C.red5); }
            }
        }
        // callout
        this.callout.update(dt);
        // popups
        for (const p of this.popups) {
            if (p.age >= UI.hud.popup.life) continue;
            p.age += dt;
            if (p.age >= UI.hud.popup.life) { p.t.setVisible(false); continue; }
            p.t.setAlpha(Math.min(1, (UI.hud.popup.life - p.age) / 250));
            this.placePopup(p);
        }
        // prompt
        if (this.promptShown && this.clock >= this.promptUntil) this.hidePrompt();
    }
}

