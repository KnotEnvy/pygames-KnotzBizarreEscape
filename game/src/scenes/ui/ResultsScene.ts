// Results (started by the engine 3.5 s after stage:clear, Game already stopped): header slam, rows tally in with
// score_tally ticks (score, POW bonus ×1000, accuracy, time, deaths, total), then the rank stamp. Confirm → Title.
import Phaser from 'phaser';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, H, W, bar, frameOf, mmss, pad, panel, text } from '../../ui/widgets';
import { Callout } from '../../ui/callout';
import { MenuInput } from '../../ui/input';
import { computeRank, rankPoints, type ResultsData } from '../../ui/rank';
import { wipeIn, wipeOut } from '../../ui/transitions';

interface Row { label: string; value: () => string; from?: number; to?: number }

export class ResultsScene extends Phaser.Scene {
    private res!: ResultsData;
    private menuInput!: MenuInput;
    private header!: Callout;
    private press!: Phaser.GameObjects.BitmapText;
    private stamp!: Phaser.GameObjects.Image;
    private rowTexts: { label: Phaser.GameObjects.BitmapText; value: Phaser.GameObjects.BitmapText }[] = [];
    private rows: Row[] = [];
    private clock = 0;
    private blink = 0;
    private done = false;
    private leaving = false;
    private counting: { row: number; t: number; tick: number } | null = null;
    private nextRow = 0;
    private rank: 'S' | 'A' | 'B' | 'C' = 'C';

    constructor() { super('Results'); }

    init(data: Partial<ResultsData>): void {
        this.res = {
            stage: data.stage ?? 1, score: data.score ?? 0, rescued: data.rescued ?? 0, kills: data.kills ?? 0, deaths: data.deaths ?? 0,
            accuracy: data.accuracy ?? 0, timeMs: data.timeMs ?? 0, difficulty: data.difficulty ?? 'arcade'
        };
    }

    create(): void {
        const d = this.res;
        this.clock = 0; this.blink = 0; this.done = false; this.leaving = false; this.counting = null; this.nextRow = 0;
        this.rowTexts = [];
        this.rank = computeRank(d);
        this.cameras.main.setBackgroundColor(C.dim);
        if (this.textures.exists('ui_keyart_title')) this.add.image(0, 0, 'ui_keyart_title').setOrigin(0, 0).setAlpha(0.3);
        this.add.rectangle(0, 0, W, H, C.dim, 1).setOrigin(0, 0).setAlpha(0.35);
        this.header = new Callout(this, 30, 20);
        this.time.delayedCall(250, () => this.header.show(`MISSION ${d.stage} COMPLETE!`, { font: F.steel, holdMs: 1e9, sfx: 'callout' }));
        panel(this, 44, 50, 296, 134);
        text(this, 60, 58, 'RESULTS', F.sand);
        text(this, 324, 62, d.difficulty.toUpperCase(), F.hud, [1, 0]).setTint(C.ink5);
        const bonus = d.rescued * UI.results.powBonus;
        this.rows = [
            { label: 'SCORE', value: () => pad(d.score, 8), from: 0, to: d.score },
            { label: 'POW RESCUED', value: () => `${d.rescued} × ${UI.results.powBonus}  =  ${pad(bonus, 6)}`, from: 0, to: bonus },
            { label: 'ACCURACY', value: () => `${Math.round(d.accuracy * 100)}%` },
            { label: 'TIME', value: () => mmss(d.timeMs) },
            { label: 'DEATHS', value: () => String(d.deaths) },
            { label: 'TOTAL', value: () => pad(d.score + bonus, 8), from: 0, to: d.score + bonus }
        ];
        this.rows.forEach((r, i) => {
            const y = 82 + i * 14 + (i === 5 ? 6 : 0);
            const label = text(this, 60, y, r.label, i === 5 ? F.gold : F.hud).setAlpha(0);
            const value = text(this, 260, y, '', i === 5 ? F.gold : F.hud, [1, 0]).setAlpha(0);
            this.rowTexts.push({ label, value });
        });
        bar(this, 60, 82 + 5 * 14 + 2, 200, 1, C.sand3, 0.6);
        const f = frameOf(this, `rank_${this.rank.toLowerCase()}`);
        this.stamp = this.add.image(300, 92, 'ui_rank', f).setOrigin(0.5, 0.5).setVisible(false).setDepth(15);
        text(this, 300, 156, 'RANK', F.hud, [0.5, 0]).setTint(C.ink5);
        this.press = text(this, W / 2, 198, 'PRESS START', F.hud, [0.5, 0.5]).setTint(C.sand5).setVisible(false);
        this.menuInput = new MenuInput(this);
        wipeIn(this);
    }

    private showRow(i: number): void {
        const r = this.rows[i];
        const t = this.rowTexts[i];
        t.label.setAlpha(1);
        t.value.setAlpha(1);
        if (r.to !== undefined && r.to > 0) {
            this.counting = { row: i, t: 0, tick: 0 };
            t.value.setText(this.formatRow(i, 0));
        } else {
            t.value.setText(r.value());
            getAudio(this).sfx('score_tally', { volume: 0.7 });
        }
    }

    private formatRow(i: number, v: number): string {
        const r = this.rows[i];
        if (i === 1) return `${this.res.rescued} × ${UI.results.powBonus}  =  ${pad(v, 6)}`;
        if (r.to !== undefined) return pad(v, 8);
        return r.value();
    }

    private stampRank(): void {
        this.done = true;
        const audio = getAudio(this);
        this.stamp.setVisible(true).setPosition(300, 50).setAlpha(0);
        this.tweens.add({
            targets: this.stamp, y: 92, alpha: 1, duration: 260, ease: 'Quad.easeIn',
            onComplete: () => {
                audio.sfx('rank_stamp');
                this.cameras.main.shake(140, 0.012);
                this.press.setVisible(true);
                const rankPts = rankPoints(this.res);
                text(this, 300, 166, `${rankPts} PTS`, F.plain, [0.5, 0]).setAlpha(0.6);
                if (audio.musicKey !== 'jingle_complete') audio.music('music_title', { fade: 1500, volume: 0.7 });
                else audio.events.once('music:ended', () => { if (this.scene.isActive()) audio.music('music_title', { fade: 1200, volume: 0.7 }); });
            }
        });
    }

    private leave(): void {
        if (this.leaving) return;
        this.leaving = true;
        getAudio(this).sfx('ui_start');
        wipeOut(this, () => this.scene.start('Title'));
    }

    update(_time: number, delta: number): void {
        const dt = Math.min(100, delta);
        this.clock += dt;
        this.blink += dt;
        this.menuInput.update(dt);
        this.header.update(dt);
        const R = UI.results;
        if (this.counting) {
            const c = this.counting;
            const r = this.rows[c.row];
            c.t += dt; c.tick += dt;
            const k = Math.min(1, c.t / R.countMs);
            const v = Math.round((r.from ?? 0) + ((r.to ?? 0) - (r.from ?? 0)) * k);
            this.rowTexts[c.row].value.setText(this.formatRow(c.row, v));
            if (c.tick >= R.tallyTickMs) { c.tick = 0; getAudio(this).sfx('score_tally'); }
            if (k >= 1) { this.counting = null; this.clock = 0; }
        } else if (this.nextRow < this.rows.length) {
            if (this.clock >= (this.nextRow === 0 ? R.rowStartMs : R.rowGapMs)) { this.showRow(this.nextRow++); this.clock = 0; }
        } else if (!this.done) {
            if (this.clock >= R.stampDelayMs) this.stampRank();
        } else {
            this.press.setVisible(this.blink % 800 < 500);
            if (this.menuInput.confirm || this.menuInput.justDown('pause') || this.clock > R.autoAdvanceMs) this.leave();
        }
        // skip the tally with confirm
        if (!this.done && this.menuInput.confirm && this.clock > 300) {
            this.counting = null;
            while (this.nextRow < this.rows.length) {
                const i = this.nextRow++;
                this.rowTexts[i].label.setAlpha(1);
                this.rowTexts[i].value.setAlpha(1).setText(this.rows[i].value());
            }
            this.stampRank();
        }
    }
}
