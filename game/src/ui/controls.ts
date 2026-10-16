// Controls display: one row per action with the keyboard key-caps (from settings.keys) and the gamepad prompt
// (from settings.pad). Used by the Pause help panel and the Options "CONTROLS" page (which can also rebind).
import Phaser from 'phaser';
import { settings, tagFrame, type Action } from '../core';
import { C, F, text } from './widgets';
import { keyLabel, keyPromptTag, padPromptTag } from './keys';

export interface ControlRowDef { action: Action; label: string }

export const CONTROL_ROWS: readonly ControlRowDef[] = [
    { action: 'jump', label: 'JUMP' },
    { action: 'shoot', label: 'SHOOT' },
    { action: 'grenade', label: 'BOMB' },
    { action: 'aimlock', label: 'AIM LOCK' },
    { action: 'pause', label: 'PAUSE' }
];

/** Key-cap: the prompt art when it exists, otherwise a small panel with the key's name. Returns the width used. */
function keycap(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, keyName: string): number {
    const tag = keyPromptTag(keyName);
    const frame = tag ? tagFrame(scene, tag) : undefined;
    if (frame !== undefined) {
        container.add(scene.add.image(x, y, 'ui_prompts', frame).setOrigin(0, 0.5));
        return 40;
    }
    const label = keyLabel(keyName);
    const w = Math.max(14, label.length * 6 + 6);
    container.add(scene.add.rectangle(x + 20 - w / 2, y, w, 12, C.ink3, 1).setOrigin(0, 0.5));
    container.add(scene.add.rectangle(x + 20 - w / 2 + 1, y, w - 2, 10, C.outline, 1).setOrigin(0, 0.5));
    container.add(text(scene, x + 20, y, label, F.plain, [0.5, 0.5]));
    return 40;
}

export interface ControlsPanelOptions {
    x: number;
    y: number;
    rowHeight?: number;
    /** Show both keyboard bindings (primary + alternate). */
    alternates?: boolean;
    showPad?: boolean;
    /** Extra row for movement (arrows / d-pad). */
    movement?: boolean;
    /** Pad glyph column, relative to x (default 150; the 16 px glyph must end inside the owning panel). */
    padX?: number;
}

/** Builds (and rebuilds on demand) the rows into a container. */
export class ControlsPanel {
    readonly container: Phaser.GameObjects.Container;
    readonly rowLabels: Phaser.GameObjects.BitmapText[] = [];

    constructor(private readonly scene: Phaser.Scene, private readonly opts: ControlsPanelOptions) {
        this.container = scene.add.container(0, 0);
        this.rebuild();
    }

    get rowCount(): number { return CONTROL_ROWS.length + (this.opts.movement ? 1 : 0); }

    rowY(i: number): number { return this.opts.y + i * (this.opts.rowHeight ?? 14); }

    rebuild(): void {
        this.container.removeAll(true);
        this.rowLabels.length = 0;
        const s = settings.get();
        const rh = this.opts.rowHeight ?? 14;
        const showPad = this.opts.showPad ?? true;
        const padX = this.opts.x + (this.opts.padX ?? 150);
        let i = 0;
        if (this.opts.movement) {
            const y = this.opts.y + i * rh;
            keycap(this.scene, this.container, this.opts.x, y, 'LEFT');
            keycap(this.scene, this.container, this.opts.x + 28, y, 'RIGHT');
            const l = text(this.scene, this.opts.x + 76, y, 'MOVE / AIM', F.hud, [0, 0.5]);
            this.rowLabels.push(l);
            this.container.add(l);
            if (showPad) {
                const tag = tagFrame(this.scene, 'prompt_pad_dpad');
                if (tag !== undefined) this.container.add(this.scene.add.image(padX, y, 'ui_prompts', tag).setOrigin(0, 0.5));
            }
            i++;
        }
        for (const row of CONTROL_ROWS) {
            const y = this.opts.y + i * rh;
            const keys = s.keys[row.action] ?? [];
            let x = this.opts.x;
            x += keycap(this.scene, this.container, x, y, keys[0] ?? '?');
            if (this.opts.alternates && keys[1]) x += keycap(this.scene, this.container, x - 12, y, keys[1]) - 12;
            const l = text(this.scene, this.opts.x + 76, y, row.label, F.hud, [0, 0.5]);
            this.rowLabels.push(l);
            this.container.add(l);
            if (showPad) {
                const b = (s.pad[row.action] ?? [])[0];
                const tag = b !== undefined ? padPromptTag(b) : null;
                const frame = tag ? tagFrame(this.scene, tag) : undefined;
                if (frame !== undefined) this.container.add(this.scene.add.image(padX, y, 'ui_prompts', frame).setOrigin(0, 0.5));
                else if (b !== undefined) this.container.add(text(this.scene, padX + 20, y, `B${b}`, F.plain, [0.5, 0.5]));
            }
            i++;
        }
    }

    setVisible(v: boolean): this { this.container.setVisible(v); return this; }

    destroy(): void { this.container.destroy(true); }
}
