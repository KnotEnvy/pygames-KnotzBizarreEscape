// Tally rows (Results, PART CLEAR): labels and values appear one row at a time; numeric rows count up from `from`
// to `to` with score_tally ticks. `skip()` reveals everything at once. The owner calls update(dt) every frame.
import type Phaser from 'phaser';
import { getAudio } from '../audio';
import { C, F, text } from './widgets';

export interface TallyRow {
    label: string;
    /** Final display text. */
    value: () => string;
    /** When set (and > 0), the row counts up from `from` (default 0) to `to`, formatted with `format`. */
    to?: number;
    from?: number;
    format?: (v: number) => string;
    font?: string;
    /** Extra vertical gap above this row (px). */
    gap?: number;
    tint?: number;
}

export interface TallyOptions {
    x: number;
    y: number;
    valueX: number;
    rowHeight?: number;
    rows: TallyRow[];
    timing: { rowStartMs: number; rowGapMs: number; countMs: number; tallyTickMs: number };
    depth?: number;
    onDone?: () => void;
}

export class Tally {
    readonly texts: { label: Phaser.GameObjects.BitmapText; value: Phaser.GameObjects.BitmapText }[] = [];
    private clock = 0;
    private next = 0;
    private counting: { row: number; t: number; tick: number } | null = null;
    private finished = false;

    constructor(private readonly scene: Phaser.Scene, private readonly opts: TallyOptions) {
        const rh = opts.rowHeight ?? 14;
        let y = opts.y;
        opts.rows.forEach(r => {
            y += r.gap ?? 0;
            const font = r.font ?? F.hud;
            const label = text(scene, opts.x, y, r.label, font).setAlpha(0).setDepth(opts.depth ?? 0);
            const value = text(scene, opts.valueX, y, '', font, [1, 0]).setAlpha(0).setDepth(opts.depth ?? 0);
            if (r.tint !== undefined) { label.setTint(r.tint); value.setTint(r.tint); }
            this.texts.push({ label, value });
            y += rh;
        });
    }

    /** Screen y just under the last row. */
    get bottom(): number {
        const last = this.texts[this.texts.length - 1];
        return last ? last.label.y + (this.opts.rowHeight ?? 14) : this.opts.y;
    }

    get done(): boolean { return this.finished; }

    private format(i: number, v: number): string {
        const r = this.opts.rows[i];
        return r.format ? r.format(v) : String(v);
    }

    private show(i: number): void {
        const r = this.opts.rows[i];
        const t = this.texts[i];
        t.label.setAlpha(1);
        t.value.setAlpha(1);
        if (r.to !== undefined && r.to > (r.from ?? 0)) {
            this.counting = { row: i, t: 0, tick: 0 };
            t.value.setText(this.format(i, r.from ?? 0));
        } else {
            t.value.setText(r.value());
            getAudio(this.scene).sfx('score_tally', { volume: 0.7 });
        }
    }

    /** Reveal every row with its final value. */
    skip(): void {
        if (this.finished) return;
        this.counting = null;
        while (this.next < this.opts.rows.length) {
            const i = this.next++;
            this.texts[i].label.setAlpha(1);
            this.texts[i].value.setAlpha(1).setText(this.opts.rows[i].value());
        }
        this.finish();
    }

    private finish(): void {
        if (this.finished) return;
        this.finished = true;
        this.opts.onDone?.();
    }

    update(dt: number): void {
        if (this.finished) return;
        const T = this.opts.timing;
        this.clock += dt;
        if (this.counting) {
            const c = this.counting;
            const r = this.opts.rows[c.row];
            c.t += dt; c.tick += dt;
            const k = Math.min(1, c.t / T.countMs);
            const from = r.from ?? 0;
            const v = Math.round(from + ((r.to ?? 0) - from) * k);
            this.texts[c.row].value.setText(k >= 1 ? r.value() : this.format(c.row, v));
            if (c.tick >= T.tallyTickMs) { c.tick = 0; getAudio(this.scene).sfx('score_tally'); }
            if (k >= 1) { this.counting = null; this.clock = 0; }
            return;
        }
        if (this.next < this.opts.rows.length) {
            if (this.clock >= (this.next === 0 ? T.rowStartMs : T.rowGapMs)) { this.show(this.next++); this.clock = 0; }
        } else this.finish();
    }

    setVisible(v: boolean): void {
        for (const t of this.texts) { t.label.setVisible(v); t.value.setVisible(v); }
    }

    destroy(): void {
        for (const t of this.texts) { t.label.destroy(); t.value.destroy(); }
        this.texts.length = 0;
    }
}

export const TALLY_DIM = C.ink5;
