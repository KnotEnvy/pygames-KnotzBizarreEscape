// Continue screen (launched by the engine on game:over): 9 → 0 countdown with the big fire numerals and a tick
// per second over music_continue. Confirm → flow.continueGame() (fresh lives, score reset). 0 → GAME OVER +
// jingle, then flow.quit() back to the Title.
import Phaser from 'phaser';
import { getContext, tagFrame, type GameContext } from '../../core';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, W, dimmer, pad, text } from '../../ui/widgets';
import { Callout } from '../../ui/callout';
import { MenuInput } from '../../ui/input';
import { wipeOut } from '../../ui/transitions';
import { uiLog } from '../../ui';

type State = 'count' | 'over' | 'leaving';

export class ContinueScene extends Phaser.Scene {
    private ctx!: GameContext;
    private menuInput!: MenuInput;
    private title!: Callout;
    private number!: Phaser.GameObjects.Image;
    private press!: Phaser.GameObjects.BitmapText;
    private n = 9;
    private acc = 0;
    private blink = 0;
    private overT = 0;
    private state: State = 'count';

    constructor() { super('Continue'); }

    create(): void {
        const ctx = getContext();
        if (!ctx) { this.scene.stop(); return; }
        this.ctx = ctx;
        this.state = 'count'; this.n = UI.continue.seconds; this.acc = 0; this.blink = 0; this.overT = 0;
        uiLog('continue:open');
        const dim = dimmer(this, 0);
        this.tweens.add({ targets: dim, alpha: UI.continue.dim, duration: 300 });
        this.title = new Callout(this, 58, 10);
        this.time.delayedCall(250, () => { if (this.state === 'count') this.title.show('CONTINUE?', { font: F.fire, holdMs: 1e9, sfx: 'callout' }); });
        this.number = this.add.image(W / 2, 112, 'ui_countdown').setOrigin(0.5, 0.5).setDepth(10);
        this.setNumber(this.n);
        this.press = text(this, W / 2, 152, 'PRESS START', F.hud, [0.5, 0.5]).setTint(C.sand5).setDepth(10);
        text(this, W / 2, 170, `SCORE ${pad(ctx.state.score, UI.hud.scoreDigits)}   CREDITS ∞`, F.plain, [0.5, 0.5]).setAlpha(0.7).setDepth(10);
        this.time.delayedCall(UI.continue.musicDelayMs, () => { if (this.state === 'count') getAudio(this).music('music_continue', { fade: 200 }); });
        this.menuInput = new MenuInput(this);
    }

    private setNumber(n: number): void {
        const f = tagFrame(this, `countdown_${n}`);
        if (f !== undefined) this.number.setFrame(f);
    }

    private tick(): void {
        this.n--;
        if (this.n < 0) { this.gameOver(); return; }
        this.setNumber(this.n);
        this.number.y = 108;
        this.tweens.add({ targets: this.number, y: 112, duration: 120, ease: 'Bounce.easeOut' });
        getAudio(this).sfx('continue_tick', { detune: (9 - this.n) * 40 });
    }

    private continueGame(): void {
        if (this.state !== 'count') return;
        this.state = 'leaving';
        uiLog('continue:continue');
        const audio = getAudio(this);
        audio.sfx('ui_start');
        audio.music(null, { fade: 150 });
        this.number.setVisible(false);
        this.press.setVisible(false);
        // flow.continueGame() latches every key still held (the Enter that confirmed) until released, so the
        // respawned player can't pause/jump/shoot on this press; no release-wait is needed here any more.
        uiLog('continue:handoff');
        this.ctx.flow.continueGame();
    }

    private gameOver(): void {
        this.state = 'over';
        uiLog('continue:gameover');
        this.overT = 0;
        this.number.setVisible(false);
        this.press.setVisible(false);
        const audio = getAudio(this);
        audio.sfx('continue_final');
        audio.music('jingle_gameover');
        this.title.show('GAME OVER', { font: F.white, tint: C.red4, holdMs: 1e9, sfx: null, y: 100 });
    }

    private leave(): void {
        if (this.state === 'leaving') return;
        this.state = 'leaving';
        wipeOut(this, () => this.ctx.flow.quit());
    }

    update(_time: number, delta: number): void {
        if (!this.ctx) return;
        const dt = Math.min(100, delta);
        this.menuInput.update(dt);
        this.title.update(dt);
        this.blink += dt;
        if (this.state === 'count') {
            this.press.setVisible(this.blink % 800 < 500);
            if (this.menuInput.confirm || this.menuInput.justDown('pause')) { this.continueGame(); return; }
            this.acc += dt;
            while (this.acc >= 1000 && this.state === 'count') { this.acc -= 1000; this.tick(); }
        } else if (this.state === 'over') {
            this.overT += dt;
            if (this.overT > UI.continue.gameOverHoldMs || (this.overT > 800 && this.menuInput.any)) this.leave();
        }
    }
}
