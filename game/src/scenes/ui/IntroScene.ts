// "MISSION 1 — START!" over the opening seconds of a mission's first part (launched by registerUi on stage:start,
// skipped with ?fast=1 and for later parts, which get the HUD title card). MISSION slides in from the left, START!
// slams in from the right with the mission_start sting and a tier-1 shake, the mission name and the escape
// premise tagline fade in under it, then everything flies out. Gameplay keeps running underneath; music is ducked.
import Phaser from 'phaser';
import { getContext } from '../../core';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, W, text } from '../../ui/widgets';
import { uiDebug } from '../../ui';

export class IntroScene extends Phaser.Scene {
    private mission!: Phaser.GameObjects.BitmapText;
    private start!: Phaser.GameObjects.BitmapText;
    private sub!: Phaser.GameObjects.BitmapText;
    private tag!: Phaser.GameObjects.BitmapText;
    private stage = 1;
    private name = '';
    private tagline = '';
    private flash = 0;
    private flashTick = 0;
    private slammed = false;

    constructor() { super('Intro'); }

    init(data: { stage?: number; name?: string; tagline?: string }): void {
        this.stage = data?.stage ?? 1;
        this.name = (data?.name ?? '').toUpperCase();
        this.tagline = (data?.tagline ?? UI.intro.taglines[this.stage] ?? '').toUpperCase();
    }

    create(): void {
        const T = UI.intro;
        this.flash = 0; this.slammed = false;
        this.mission = text(this, -140, 88, `MISSION ${this.stage}`, F.steel, [0.5, 0.5]).setDepth(10);
        this.start = text(this, W + 140, 112, 'START!', F.fire, [0.5, 0.5]).setDepth(10);
        this.sub = text(this, W / 2, 134, this.name, F.hud, [0.5, 0.5]).setAlpha(0).setDepth(10);
        this.tag = text(this, W / 2, 150, this.tagline, F.hud, [0.5, 0.5]).setTint(C.sand5).setAlpha(0).setDepth(10);
        const audio = getAudio(this);
        audio.duck(T.duck, T.durationMs, 500);
        this.tweens.add({ targets: this.mission, x: W / 2, duration: 320, ease: 'Back.easeOut' });
        this.time.delayedCall(T.slamAt, () => {
            this.tweens.add({
                targets: this.start, x: W / 2, duration: 200, ease: 'Back.easeOut',
                onComplete: () => {
                    this.slammed = true;
                    this.flash = 8;
                    this.flashTick = 0;
                    audio.sfx('mission_start');
                    getContext()?.fx.shake(1);
                    if (this.name) this.tweens.add({ targets: this.sub, alpha: 1, duration: 200 });
                    if (this.tagline) this.tweens.add({ targets: this.tag, alpha: 0.9, duration: 260, delay: 180 });
                }
            });
        });
        this.time.delayedCall(T.outAt, () => {
            this.tweens.add({ targets: this.mission, x: -200, duration: 220, ease: 'Quad.easeIn' });
            this.tweens.add({ targets: [this.sub, this.tag], alpha: 0, duration: 160 });
            this.tweens.add({ targets: this.start, x: W + 200, duration: 220, ease: 'Quad.easeIn', onComplete: () => this.finish() });
        });
        this.time.delayedCall(T.durationMs + 400, () => this.finish());
    }

    private finish(): void {
        if (!this.scene.isActive()) return;
        uiDebug.intro = false;
        this.scene.stop();
    }

    update(_time: number, delta: number): void {
        if (!this.slammed || this.flash <= 0) return;
        this.flashTick += delta;
        if (this.flashTick < 33) return;
        this.flashTick = 0;
        this.flash--;
        const white = this.flash % 2 === 1;
        this.start.setFont(white ? F.white : F.fire);
        this.mission.setFont(white ? F.white : F.steel);
    }
}
