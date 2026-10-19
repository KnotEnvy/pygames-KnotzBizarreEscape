// Part title card (Phase E), shown by the HUD on part:start: "MISSION 1 · PART II" slides in, the part title slams
// (Callout), the location fades in, and Hazel's radio box opens underneath. Everything is non-blocking and times
// itself out; hide() cancels it (stage clear, game over).
// Phase G: a mission's first part carries the mission banner instead of the part numeral ("MISSION 2 · BAYOU BLACKOUT"),
// so the mission name shows even when the Intro slam is skipped (?fast=1, a restart).
import Phaser from 'phaser';
import type { GameEvents } from '../core';
import { getAudio } from '../audio';
import { UI } from '../config/tuning/ui';
import { missionOf } from '../config/campaign';
import { C, F, W, bar, roman, text } from './widgets';
import { Callout } from './callout';
import { RadioBox } from './radio';

export type PartStartInfo = GameEvents['part:start'];

export class TitleCard {
    readonly radio: RadioBox;
    private readonly missionLine: Phaser.GameObjects.Container;
    private readonly missionText: Phaser.GameObjects.BitmapText;
    private readonly partText: Phaser.GameObjects.BitmapText;
    private readonly dot: Phaser.GameObjects.Image;
    private readonly ruleL: Phaser.GameObjects.Image;
    private readonly ruleR: Phaser.GameObjects.Image;
    private readonly title: Callout;
    private readonly location: Phaser.GameObjects.BitmapText;
    private readonly timers: Phaser.Time.TimerEvent[] = [];
    /** The radio's open timer lives apart from the card's own timers: a weapon callout cuts the card but Hazel still talks. */
    private radioTimer: Phaser.Time.TimerEvent | null = null;
    private shown: PartStartInfo | null = null;
    private visible = false;

    constructor(private readonly scene: Phaser.Scene, depth = 44) {
        const T = UI.titleCard;
        this.missionLine = scene.add.container(0, T.missionY).setDepth(depth).setVisible(false);
        this.missionText = text(scene, 0, 0, 'MISSION 1', F.gold);
        this.dot = bar(scene, 0, 3, 2, 2, C.fire5);
        this.partText = text(scene, 0, 0, 'PART I', F.gold);
        this.ruleL = bar(scene, 0, 4, 40, 1, C.sand4, 0.7);
        this.ruleR = bar(scene, 0, 4, 40, 1, C.sand4, 0.7);
        this.missionLine.add([this.ruleL, this.ruleR, this.missionText, this.dot, this.partText]);
        this.title = new Callout(scene, T.titleY, depth);
        this.location = text(scene, W / 2, T.locationY, '', F.hud, [0.5, 0]).setTint(C.ink5).setAlpha(0).setDepth(depth);
        this.radio = new RadioBox(scene, depth + 1);
    }

    get active(): boolean { return this.visible || this.radio.active; }

    get state(): { part: string | null; title: string; location: string; radio: RadioBox['state'] } {
        return { part: this.shown?.id ?? null, title: this.title.text, location: this.location.alpha > 0 ? this.location.text : '', radio: this.radio.state };
    }

    /** Show the card for a part after `delayMs` (the Intro plays first on a mission's first part). */
    show(info: PartStartInfo, delayMs: number = UI.titleCard.delayMs): void {
        this.hide(true);
        this.shown = info;
        const T = UI.titleCard;
        this.after(delayMs, () => {
            this.visible = true;
            // mission line: "MISSION n ● PART II" centred, slid in from the left; the first part shows the mission's name instead.
            const mission = info.part === 1 ? missionOf(info.id)?.name : undefined;
            this.missionText.setText(`MISSION ${info.mission}`);
            this.partText.setText(mission ? mission.toUpperCase() : `PART ${roman(info.part)}`).setTint(mission ? C.fire5 : C.white);
            const gap = 5;
            const w = this.missionText.width + gap + 2 + gap + this.partText.width;
            this.missionText.setPosition(0, 0);
            this.dot.setPosition(this.missionText.width + gap, 3);
            this.partText.setPosition(this.missionText.width + gap + 2 + gap, 0);
            this.ruleL.setPosition(-48, 4);
            this.ruleR.setPosition(w + 8, 4);
            const cx = Math.round(W / 2 - w / 2);
            this.missionLine.setPosition(-w - 60, T.missionY).setAlpha(1).setVisible(true);
            this.scene.tweens.add({ targets: this.missionLine, x: cx, duration: T.lineMs, ease: 'Back.easeOut' });
            getAudio(this.scene).sfx('ui_move', { volume: 0.6 });
            this.after(T.titleAt, () => this.title.show(info.title.toUpperCase(), { font: info.final ? F.fire : F.steel, holdMs: T.holdMs, sfx: 'callout' }));
            this.after(T.locationAt, () => {
                this.location.setText(info.location.toUpperCase()).setAlpha(0);
                this.scene.tweens.add({ targets: this.location, alpha: 1, duration: 200 });
            });
            this.radioTimer = this.scene.time.delayedCall(UI.radio.delayMs, () => this.radio.open(info.briefing ?? []));
            this.after(T.titleAt + T.holdMs, () => this.out());
        });
    }

    private out(): void {
        if (!this.visible) return;
        this.visible = false;
        // Pending title/location reveals must not land on top of whatever cut the card (Phase G: a weapon callout on part start).
        for (const t of this.timers) t.remove(false);
        this.timers.length = 0;
        const T = UI.titleCard;
        this.scene.tweens.add({ targets: this.missionLine, x: W + 40, alpha: 0, duration: T.outMs, ease: 'Quad.easeIn', onComplete: () => this.missionLine.setVisible(false) });
        this.scene.tweens.add({ targets: this.location, alpha: 0, duration: T.outMs });
    }

    /** Shoot/jump while the briefing types: reveal the page (never blocks, never closes on its own key). */
    skip(): void {
        this.radio.skip();
    }

    /** A weapon callout wants the centre of the screen: end the title/location early, keep Hazel talking. */
    cut(): void {
        if (!this.visible) return;
        this.out();
        this.title.hide();
    }

    /** Cancel everything (stage clear, game over). `keepRadioClosedSilently` avoids the close blip when nothing was open. */
    hide(silent = false): void {
        for (const t of this.timers) t.remove(false);
        this.timers.length = 0;
        this.radioTimer?.remove(false);
        this.radioTimer = null;
        if (this.visible) {
            this.visible = false;
            this.scene.tweens.killTweensOf([this.missionLine, this.location]);
            this.missionLine.setVisible(false);
            this.location.setAlpha(0);
            this.title.hide();
        }
        if (this.radio.active) {
            if (silent) { this.radio.container.setVisible(false); }
            this.radio.close();
        }
    }

    private after(ms: number, fn: () => void): void {
        this.timers.push(this.scene.time.delayedCall(ms, fn));
    }

    update(dt: number): void {
        this.title.update(dt);
        this.radio.update(dt);
    }

    destroy(): void {
        this.hide(true);
        this.missionLine.destroy(true);
        this.title.destroy();
        this.location.destroy();
        this.radio.destroy();
    }
}
