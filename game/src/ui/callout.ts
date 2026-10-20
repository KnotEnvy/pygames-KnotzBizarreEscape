// Metal Slug style text slam: the text drops in from above with an overshoot (position only, never scale),
// flashes white for a few frames, holds, then flies out. One Callout shows one text at a time; a new show()
// replaces the current one.
import Phaser from 'phaser';
import { getAudio } from '../audio';
import { UI } from '../config/tuning/ui';
import { F, W, text } from './widgets';

export interface CalloutOptions {
    font?: string;
    holdMs?: number;
    /** SFX key played at the slam (null = silent). */
    sfx?: string | null;
    tint?: number;
    /** Smaller line under the main text (font_hud). */
    sub?: string;
    y?: number;
    /** Called once the out-tween has finished and the text is gone (Phase H: the title card opens Hazel's radio on it). Dropped if a new show() replaces this one first. */
    onHidden?: () => void;
}

type Phase = 'idle' | 'drop' | 'hold' | 'out';

export class Callout {
    readonly main: Phaser.GameObjects.BitmapText;
    readonly sub: Phaser.GameObjects.BitmapText;
    private phase: Phase = 'idle';
    private t = 0;
    private font: string = F.fire;
    private hold: number = UI.hud.callout.holdMs;
    private baseY: number;
    private flashLeft = 0;
    private flashTick = 0;
    private tint = 0xffffff;
    private onHidden: (() => void) | null = null;

    constructor(private readonly scene: Phaser.Scene, y: number = UI.hud.callout.y, depth = 50) {
        this.baseY = y;
        this.main = text(scene, W / 2, y, '', F.fire, [0.5, 0.5]).setDepth(depth).setVisible(false);
        this.sub = text(scene, W / 2, y + 16, '', F.hud, [0.5, 0.5]).setDepth(depth).setVisible(false);
    }

    get active(): boolean { return this.phase !== 'idle'; }
    get text(): string { return this.phase === 'idle' ? '' : this.main.text; }

    show(str: string, opts: CalloutOptions = {}): void {
        const K = UI.hud.callout;
        this.font = opts.font ?? F.fire;
        this.hold = opts.holdMs ?? K.holdMs;
        this.tint = opts.tint ?? 0xffffff;
        this.baseY = opts.y ?? this.baseY;
        this.onHidden = opts.onHidden ?? null;
        this.scene.tweens.killTweensOf([this.main, this.sub]);
        this.main.setFont(this.font).setText(str).setTint(this.tint).setAlpha(1).setVisible(true).setPosition(W / 2, this.baseY - 36);
        this.sub.setText(opts.sub ?? '').setAlpha(0).setVisible(!!opts.sub).setPosition(W / 2, this.baseY + 16);
        this.phase = 'drop';
        this.t = 0;
        this.flashLeft = 0;
        this.scene.tweens.add({
            targets: this.main, y: this.baseY, duration: K.dropMs, ease: 'Back.easeOut',
            onComplete: () => {
                if (this.phase !== 'drop') return;
                this.phase = 'hold';
                this.t = 0;
                this.flashLeft = K.flashFrames * 2;
                this.flashTick = 0;
                if (opts.sfx !== null) getAudio(this.scene).sfx(opts.sfx ?? 'callout');
                if (opts.sub) this.scene.tweens.add({ targets: this.sub, alpha: 1, duration: 150 });
            }
        });
    }

    hide(): void {
        if (this.phase === 'idle' || this.phase === 'out') return;
        this.phase = 'out';
        this.scene.tweens.killTweensOf([this.main, this.sub]);
        this.scene.tweens.add({ targets: this.main, y: this.baseY - 28, alpha: 0, duration: UI.hud.callout.outMs, ease: 'Quad.easeIn' });
        this.scene.tweens.add({
            targets: this.sub, alpha: 0, duration: UI.hud.callout.outMs,
            onComplete: () => {
                this.phase = 'idle'; this.main.setVisible(false); this.sub.setVisible(false);
                const done = this.onHidden; this.onHidden = null; done?.();
            }
        });
    }

    update(dt: number): void {
        if (this.phase === 'idle') return;
        if (this.phase === 'hold') {
            this.t += dt;
            if (this.flashLeft > 0) {
                this.flashTick += dt;
                if (this.flashTick >= 33) {
                    this.flashTick = 0;
                    this.flashLeft--;
                    const white = this.flashLeft % 2 === 1;
                    this.main.setFont(white ? F.white : this.font).setTint(white ? 0xffffff : this.tint);
                }
            }
            if (this.t >= this.hold) this.hide();
        }
    }

    destroy(): void {
        this.main.destroy();
        this.sub.destroy();
    }
}
