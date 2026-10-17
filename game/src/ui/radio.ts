// Hazel's radio box (Phase E): a slim one-row strip in the sky band under the HUD (UI.radio) with the radio icon
// (signal animation + static flicker), the speaker label and a typewriter briefing row. Non-blocking: it fades in
// over the sky (never the walking lane), pages through long briefings one row at a time, and closes by itself.
// `skip()` reveals the current page (the HUD calls it on shoot/jump).
import Phaser from 'phaser';
import { TEX, hasAnim, tagFrame } from '../core';
import { getAudio } from '../audio';
import { UI } from '../config/tuning/ui';
import { C, F, panel, text, wrapText } from './widgets';

type Phase = 'closed' | 'opening' | 'typing' | 'hold' | 'closing';

export class RadioBox {
    readonly container: Phaser.GameObjects.Container;
    private readonly rows: Phaser.GameObjects.BitmapText[] = [];
    private readonly cursor: Phaser.GameObjects.BitmapText;
    private readonly label: Phaser.GameObjects.BitmapText;
    private readonly radio: Phaser.GameObjects.Sprite;
    private readonly statics: Phaser.GameObjects.Image[] = [];
    private pages: string[][] = [];
    private page = 0;
    private typed = 0;
    private charT = 0;
    private holdT = 0;
    private staticLeft = 0;
    private blink = 0;
    private phase: Phase = 'closed';

    constructor(private readonly scene: Phaser.Scene, depth = 45) {
        const R = UI.radio;
        this.container = scene.add.container(R.x, R.y + R.hiddenDy).setDepth(depth).setVisible(false);
        const bg = panel(scene, 0, 0, R.w, R.h, true);
        this.radio = scene.add.sprite(R.iconX, R.iconY, 'ui_radio').setOrigin(0, 0);
        const off = tagFrame(scene, 'radio_off');
        if (off !== undefined) this.radio.setFrame(off);
        this.label = text(scene, R.labelX, R.labelY, 'HAZEL', F.gold);
        this.container.add([bg, this.radio, this.label]);
        for (let i = 0; i < R.maxLines; i++) {
            const row = text(scene, R.textX, R.textY + i * 10, '', F.plain).setTint(C.ink5);
            this.rows.push(row);
            this.container.add(row);
        }
        this.cursor = text(scene, R.textX, R.textY, '_', F.plain).setTint(C.fire5).setVisible(false);
        this.container.add(this.cursor);
        for (let i = 0; i < R.staticPixels; i++) {
            const px = scene.add.image(0, 0, TEX.px).setOrigin(0, 0).setVisible(false);
            this.statics.push(px);
            this.container.add(px);
        }
    }

    get active(): boolean { return this.phase !== 'closed'; }

    /** Current page text (debug / QA). */
    get state(): { phase: Phase; page: number; pages: number; text: string } {
        return { phase: this.phase, page: this.page, pages: this.pages.length, text: this.rows.map(r => r.text).filter(Boolean).join(' / ') };
    }

    /** Show the briefing: each line is word-wrapped; pages hold `maxLines` rows. Empty input closes the box. */
    open(lines: string[], speaker = 'HAZEL'): void {
        const R = UI.radio;
        this.pages = [];
        for (const line of lines) {
            const rows = wrapText(line.toUpperCase(), R.lineChars);
            for (let i = 0; i < rows.length; i += R.maxLines) this.pages.push(rows.slice(i, i + R.maxLines));
        }
        if (this.pages.length === 0) { this.close(); return; }
        this.label.setText(speaker.toUpperCase());
        this.page = 0;
        this.scene.tweens.killTweensOf(this.container);
        this.container.setVisible(true);
        if (this.phase === 'closed' || this.phase === 'closing') {
            this.container.setPosition(R.x, R.y + R.hiddenDy).setAlpha(0);
            this.phase = 'opening';
            getAudio(this.scene).sfx('radio_static');
            // A short drop + fade from the HUD band, so the strip never sweeps across the HUD or the playfield.
            this.scene.tweens.add({ targets: this.container, y: R.y, alpha: 1, duration: R.openMs, ease: 'Quad.easeOut', onComplete: () => { if (this.phase === 'opening') this.startPage(); } });
        } else { this.container.setAlpha(1); this.startPage(); }
        if (hasAnim(this.scene, 'radio_on')) this.radio.play({ key: 'radio_on', repeat: -1 }, true);
        this.burst();
    }

    private startPage(): void {
        this.phase = 'typing';
        this.typed = 0;
        this.charT = 0;
        for (const r of this.rows) r.setText('');
        getAudio(this.scene).sfx('radio_blip', { volume: 0.7 });
        if (this.page > 0) this.burst(UI.radio.staticMs * 0.5);
        this.cursor.setVisible(true);
        this.layout();
    }

    private get pageChars(): number {
        return (this.pages[this.page] ?? []).reduce((a, r) => a + r.length, 0);
    }

    private layout(): void {
        const R = UI.radio;
        const rows = this.pages[this.page] ?? [];
        let left = this.typed;
        let cy = R.textY, cx = R.textX;
        rows.forEach((r, i) => {
            const k = Math.max(0, Math.min(r.length, left));
            left -= k;
            this.rows[i].setText(r.slice(0, k));
            if (k > 0 || i === 0) { cy = R.textY + i * 10; cx = R.textX + this.rows[i].width + (k > 0 ? 1 : 0); }
        });
        this.cursor.setPosition(Math.min(cx, R.w - 8), cy);
    }

    private burst(ms: number = UI.radio.staticMs): void {
        this.staticLeft = ms;
    }

    /** Reveal the whole current page (a second skip while holding moves on). */
    skip(): void {
        if (this.phase === 'typing') {
            this.typed = this.pageChars;
            this.layout();
            this.phase = 'hold';
            this.holdT = 0;
            this.cursor.setVisible(false);
        } else if (this.phase === 'hold') {
            this.advance();
        }
    }

    private advance(): void {
        if (this.page + 1 < this.pages.length) { this.page++; this.startPage(); }
        else this.close();
    }

    close(): void {
        if (this.phase === 'closed' || this.phase === 'closing') return;
        this.phase = 'closing';
        this.cursor.setVisible(false);
        for (const px of this.statics) px.setVisible(false);
        getAudio(this.scene).sfx('radio_blip', { volume: 0.5, detune: -400 });
        this.scene.tweens.killTweensOf(this.container);
        this.scene.tweens.add({
            targets: this.container, y: UI.radio.y + UI.radio.hiddenDy, alpha: 0, duration: UI.radio.closeMs, ease: 'Quad.easeIn',
            onComplete: () => { this.phase = 'closed'; this.container.setVisible(false).setAlpha(1); this.radio.stop(); const f = tagFrame(this.scene, 'radio_off'); if (f !== undefined) this.radio.setFrame(f); }
        });
    }

    update(dt: number): void {
        if (this.phase === 'closed') return;
        const R = UI.radio;
        this.blink += dt;
        if (this.staticLeft > 0) {
            this.staticLeft -= dt;
            for (const px of this.statics) {
                const on = this.staticLeft > 0 && Math.random() < 0.7;
                px.setVisible(on);
                if (!on) continue;
                const w = 1 + Math.floor(Math.random() * 3);
                px.setPosition(R.labelX + Math.floor(Math.random() * (R.w - R.labelX - 4 - w)), 3 + Math.floor(Math.random() * (R.h - 6)))
                    .setDisplaySize(w, 1).setTint(Math.random() < 0.5 ? C.white : C.ink5).setAlpha(0.35 + Math.random() * 0.5);
            }
        }
        if (this.phase === 'typing') {
            this.charT += dt;
            let moved = false;
            while (this.charT >= R.charMs && this.typed < this.pageChars) { this.charT -= R.charMs; this.typed++; moved = true; }
            if (moved) this.layout();
            this.cursor.setVisible(this.blink % 500 < 300);
            if (this.typed >= this.pageChars) { this.phase = 'hold'; this.holdT = 0; this.cursor.setVisible(false); }
        } else if (this.phase === 'hold') {
            this.holdT += dt;
            const last = this.page + 1 >= this.pages.length;
            if (this.holdT >= (last ? R.lastPageHoldMs : R.pageHoldMs)) this.advance();
        }
    }

    destroy(): void {
        this.scene.tweens.killTweensOf(this.container);
        this.container.destroy(true);
    }
}
