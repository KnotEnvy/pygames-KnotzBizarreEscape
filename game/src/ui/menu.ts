// Vertical menu: rows with a label and an optional value, a bouncing `ui_cursor`, the selected row tinted, and
// menu blips. The owning scene drives it with `update(dt)` using a MenuInput.
import Phaser from 'phaser';
import { hasAnim } from '../core';
import { getAudio } from '../audio';
import { C, F, icon, text } from './widgets';
import type { MenuInput } from './input';

export interface MenuRow {
    label: string | (() => string);
    value?: () => string;
    onSelect?: () => void;
    /** Left/right (and confirm when there is no onSelect) adjust a value. */
    onAdjust?: (dir: -1 | 1) => void;
    disabled?: () => boolean;
}

export interface MenuOptions {
    x: number;
    y: number;
    rows: MenuRow[];
    rowHeight?: number;
    /** Where values are right-aligned (x). Omit for label-only rows. */
    valueX?: number;
    font?: string;
    selectedTint?: number;
    tint?: number;
    /** Center labels on x instead of left-aligning. */
    center?: boolean;
    silent?: boolean;
}

export class Menu {
    readonly container: Phaser.GameObjects.Container;
    index = 0;
    private readonly labels: Phaser.GameObjects.BitmapText[] = [];
    private readonly values: Phaser.GameObjects.BitmapText[] = [];
    private readonly cursor: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    private readonly rowH: number;
    private bounce = 0;
    private readonly selectedTint: number;
    private readonly tint: number;

    constructor(private readonly scene: Phaser.Scene, private readonly opts: MenuOptions) {
        this.rowH = opts.rowHeight ?? 12;
        this.selectedTint = opts.selectedTint ?? C.fire5;
        this.tint = opts.tint ?? C.white;
        this.container = scene.add.container(0, 0);
        const font = opts.font ?? F.hud;
        opts.rows.forEach((row, i) => {
            const y = opts.y + i * this.rowH;
            const l = text(scene, opts.x, y, this.labelOf(row), font, opts.center ? [0.5, 0] : [0, 0]);
            this.labels.push(l);
            this.container.add(l);
            const v = text(scene, opts.valueX ?? opts.x, y, row.value ? row.value() : '', font, [1, 0]);
            v.setVisible(!!row.value);
            this.values.push(v);
            this.container.add(v);
        });
        if (hasAnim(scene, 'ui_cursor')) {
            const s = scene.add.sprite(0, 0, 'ui_icons').setOrigin(0, 0);
            s.play({ key: 'ui_cursor', repeat: -1 });
            this.cursor = s;
        } else {
            this.cursor = icon(scene, 0, 0, 'ui_icons', 'ui_cursor');
        }
        this.container.add(this.cursor);
        this.refresh();
    }

    private labelOf(row: MenuRow): string {
        return typeof row.label === 'function' ? row.label() : row.label;
    }

    get rows(): MenuRow[] { return this.opts.rows; }

    setIndex(i: number): void {
        const n = this.opts.rows.length;
        this.index = ((i % n) + n) % n;
        this.refresh();
    }

    refresh(): void {
        this.opts.rows.forEach((row, i) => {
            const sel = i === this.index;
            const dis = row.disabled?.() ?? false;
            const l = this.labels[i];
            l.setText(this.labelOf(row)).setTint(dis ? C.ink3 : sel ? this.selectedTint : this.tint);
            const v = this.values[i];
            if (row.value) v.setText(row.value()).setTint(dis ? C.ink3 : sel ? this.selectedTint : C.ink5);
        });
        const l = this.labels[this.index];
        const cx = this.opts.center ? l.x - l.width / 2 - 20 : this.opts.x - 20;
        this.cursor.setPosition(Math.round(cx), l.y - 4);
    }

    /** Returns true when the menu consumed a confirm. */
    update(dt: number, input: MenuInput): boolean {
        this.bounce += dt;
        const l = this.labels[this.index];
        const cx = this.opts.center ? l.x - l.width / 2 - 20 : this.opts.x - 20;
        this.cursor.x = Math.round(cx + Math.sin(this.bounce / 140) * 1.5);
        const audio = getAudio(this.scene);
        const v = input.vertical;
        if (v !== 0) {
            let i = this.index;
            for (let k = 0; k < this.opts.rows.length; k++) {
                i = (i + v + this.opts.rows.length) % this.opts.rows.length;
                if (!(this.opts.rows[i].disabled?.() ?? false)) break;
            }
            if (i !== this.index) {
                this.index = i;
                this.refresh();
                if (!this.opts.silent) audio.sfx('ui_move');
            }
        }
        const row = this.opts.rows[this.index];
        const h = input.horizontal;
        if (h !== 0 && row.onAdjust && !(row.disabled?.() ?? false)) {
            row.onAdjust(h as -1 | 1);
            this.refresh();
            if (!this.opts.silent) audio.sfx('ui_move');
            return false;
        }
        if (input.confirm && !(row.disabled?.() ?? false)) {
            if (row.onSelect) {
                if (!this.opts.silent) audio.sfx('ui_select');
                row.onSelect();
            } else if (row.onAdjust) {
                row.onAdjust(1);
                if (!this.opts.silent) audio.sfx('ui_select');
            }
            this.refresh();
            return true;
        }
        return false;
    }

    setVisible(v: boolean): this {
        this.container.setVisible(v);
        return this;
    }

    get visible(): boolean { return this.container.visible; }

    destroy(): void {
        this.container.destroy(true);
    }
}
