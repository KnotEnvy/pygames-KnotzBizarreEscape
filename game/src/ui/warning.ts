// Phase F: Metal Slug-style boss WARNING banner (HUD scene, on `boss:intro { name }`).
// A dark strip across the playfield with red/black hazard stripes sweeping along its top and bottom edges (the two
// edges run opposite ways), "WARNING!" slamming in white → red, and the boss name revealed under it. About 2 s,
// never blocking. The stripes strobe red/black; with REDUCED FLASH on they only sweep (no strobe, dimmer red).
// It sits in the band y 92..132: under the HUD rows and the weapon callout (y 74), above the boss bar (y 198), and clear
// of the engine's 14 px letterbox bars that come in at the same moment.
import Phaser from 'phaser';
import { settings } from '../core';
import { UI } from '../config/tuning/ui';
import { C, F, W, text } from './widgets';

const TEX_HAZARD = 'ui_hazard_stripes';
const RED = 0xd4483a;
const RED_DIM = 0x8a2a26;
/** Multiply tint for the strobe's dark phase (red stripes → dark red, black stays black). */
const STROBE_DARK = 0x585858;

/** One tile of 45° hazard stripes (red/black), tiled by a TileSprite and scrolled for the sweep. */
function makeHazard(scene: Phaser.Scene, period: number, h: number): void {
    if (scene.textures.exists(TEX_HAZARD)) return;
    const tex = scene.textures.createCanvas(TEX_HAZARD, period, h)!;
    const g = tex.getContext();
    const img = g.createImageData(period, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < period; x++) {
        const red = ((x + y) % period) < period / 2;
        const i = (y * period + x) * 4;
        img.data[i] = red ? 0xd4 : 0x1a; img.data[i + 1] = red ? 0x48 : 0x12; img.data[i + 2] = red ? 0x3a : 0x20; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    tex.refresh().setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export class WarningBanner {
    private readonly box: Phaser.GameObjects.Container;
    private readonly panel: Phaser.GameObjects.Rectangle;
    private readonly top: Phaser.GameObjects.TileSprite;
    private readonly bottom: Phaser.GameObjects.TileSprite;
    private readonly title: Phaser.GameObjects.BitmapText;
    private readonly name: Phaser.GameObjects.BitmapText;
    private t = -1;
    private strobe = 0;
    private bossName = '';
    private reduced = false;

    constructor(private readonly scene: Phaser.Scene, depth = 48) {
        const K = UI.warning;
        makeHazard(scene, K.stripeW * 2, K.stripeH);
        this.box = scene.add.container(0, K.y).setDepth(depth).setVisible(false);
        this.panel = scene.add.rectangle(0, 0, W, K.h, C.dim, 1).setOrigin(0, 0).setAlpha(K.panelAlpha);
        this.top = scene.add.tileSprite(0, 0, W, K.stripeH, TEX_HAZARD).setOrigin(0, 0);
        this.bottom = scene.add.tileSprite(0, K.h - K.stripeH, W, K.stripeH, TEX_HAZARD).setOrigin(0, 0);
        this.title = text(scene, W / 2, K.textY - K.y, 'WARNING!', F.white, [0.5, 0.5]).setTint(RED);
        this.name = text(scene, W / 2, K.nameY - K.y, '', F.hud, [0.5, 0.5]).setTint(C.fire5);
        this.box.add([this.panel, this.top, this.bottom, this.title, this.name]);
    }

    get active(): boolean { return this.t >= 0; }
    get state(): { name: string; t: number } | null { return this.active ? { name: this.bossName, t: Math.round(this.t) } : null; }

    show(name: string): void {
        const K = UI.warning;
        this.reduced = settings.get().reducedFlash;
        this.bossName = (name || 'BOSS').toUpperCase();
        this.t = 0;
        this.strobe = 0;
        this.scene.tweens.killTweensOf([this.box, this.title, this.name]);
        this.box.setVisible(true).setAlpha(1);
        this.panel.setAlpha(K.panelAlpha);
        this.top.setAlpha(1); this.bottom.setAlpha(1);
        this.top.clearTint(); this.bottom.clearTint();
        this.name.setText('').setAlpha(0);
        // Slam: the word drops from above with an overshoot (position only), white for the first frames, then red.
        this.title.setTint(0xffffff).setAlpha(1).setPosition(W / 2, K.textY - K.y - 22);
        this.scene.tweens.add({ targets: this.title, y: K.textY - K.y, duration: K.inMs, ease: 'Back.easeOut' });
        if (this.reduced) { this.top.setTint(RED_DIM); this.bottom.setTint(RED_DIM); }
    }

    hide(): void {
        if (!this.active) return;
        this.t = -1;
        this.scene.tweens.killTweensOf([this.box, this.title, this.name]);
        this.box.setVisible(false);
    }

    update(dt: number): void {
        if (!this.active) return;
        const K = UI.warning;
        this.t += dt;
        // Hazard sweep: the two edges run opposite ways.
        const sweep = K.sweepPxPerS * dt / 1000;
        this.top.tilePositionX -= sweep;
        this.bottom.tilePositionX += sweep;
        // Strobe: the red stripes flash bright ↔ dark (the black stripes stay, so the hazard pattern always reads),
        // the word red ↔ white. Reduced flash: steady dim red, no strobe.
        if (!this.reduced) {
            this.strobe += dt;
            const on = Math.floor(this.strobe / K.strobeMs) % 2 === 0;
            if (on) { this.top.clearTint(); this.bottom.clearTint(); }
            else { this.top.setTint(STROBE_DARK); this.bottom.setTint(STROBE_DARK); }
            if (this.t > K.inMs) this.title.setTint(on ? RED : 0xffffff);
        } else if (this.t > K.inMs) this.title.setTint(RED);
        // Name reveal: typed in over ~300 ms.
        if (this.t >= K.nameAt) {
            const chars = Math.min(this.bossName.length, Math.ceil((this.t - K.nameAt) / 28));
            if (this.name.text.length !== chars) this.name.setText(this.bossName.slice(0, chars));
            this.name.setAlpha(1);
        }
        // Out: fade the whole strip.
        if (this.t >= K.outAt) {
            const k = Math.max(0, 1 - (this.t - K.outAt) / K.outMs);
            this.box.setAlpha(k);
            if (k <= 0) this.hide();
        }
    }

    destroy(): void { this.box.destroy(); }
}
