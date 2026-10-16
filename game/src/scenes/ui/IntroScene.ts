// "MISSION 1 — START!" over the opening seconds of gameplay (launched by registerUi on stage:start, skipped
// with ?fast=1). MISSION slides in from the left, START! slams in from the right with the mission_start sting
// and a tier-1 shake, both flash, then fly out. Gameplay keeps running underneath; the music is ducked.
import Phaser from 'phaser';
import { getContext } from '../../core';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { F, W, text } from '../../ui/widgets';
import { uiDebug } from '../../ui';

export class IntroScene extends Phaser.Scene {
    private mission!: Phaser.GameObjects.BitmapText;
    private start!: Phaser.GameObjects.BitmapText;
    private sub!: Phaser.GameObjects.BitmapText;
    private stage = 1;
    private name = '';
    private flash = 0;
    private flashTick = 0;
    private slammed = false;

    constructor() { super('Intro'); }

    init(data: { stage?: number; name?: string }): void {
        this.stage = data?.stage ?? 1;
        this.name = (data?.name ?? '').toUpperCase();
    }

    create(): void {
        const T = UI.intro;
        this.flash = 0; this.slammed = false;
        this.mission = text(this, -140, 88, `MISSION ${this.stage}`, F.steel, [0.5, 0.5]).setDepth(10);
        this.start = text(this, W + 140, 112, 'START!', F.fire, [0.5, 0.5]).setDepth(10);
        this.sub = text(this, W / 2, 134, this.name, F.hud, [0.5, 0.5]).setAlpha(0).setDepth(10);
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
                }
            });
        });
        this.time.delayedCall(T.outAt, () => {
            this.tweens.add({ targets: this.mission, x: -200, duration: 220, ease: 'Quad.easeIn' });
            this.tweens.add({ targets: this.sub, alpha: 0, duration: 160 });
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
