// Results (started by the engine 3.5 s after the mission's final stage:clear, Game already stopped): header slam,
// RESULTS panel with the mission totals tallying in (score, POW bonus ×1000, accuracy, time, deaths, total), a
// PARTS panel with one row per part (Phase E), then the rank stamp. Confirm → Title.
import Phaser from 'phaser';
import { tagFrame } from '../../core';
import type { MissionResultsData } from '../../core/flow';
import { partById, type PartResult } from '../../config/campaign';
import { getAudio } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { C, F, H, W, bar, mmss, pad, panel, roman, text } from '../../ui/widgets';
import { Callout } from '../../ui/callout';
import { MenuInput } from '../../ui/input';
import { Tally } from '../../ui/tally';
import { computeRank, rankPoints, type ResultsData } from '../../ui/rank';
import { wipeIn, wipeOut } from '../../ui/transitions';

interface PartRow { a: Phaser.GameObjects.BitmapText; b: Phaser.GameObjects.BitmapText; n: Phaser.GameObjects.BitmapText }

export class ResultsScene extends Phaser.Scene {
    private res!: ResultsData;
    private parts: PartResult[] = [];
    private mission = 1;
    private menuInput!: MenuInput;
    private header!: Callout;
    private tally!: Tally;
    private press!: Phaser.GameObjects.BitmapText;
    private stamp!: Phaser.GameObjects.Image;
    private partRows: PartRow[] = [];
    private partsShown = 0;
    private clock = 0;
    private blink = 0;
    private done = false;
    private leaving = false;
    private rank: 'S' | 'A' | 'B' | 'C' = 'C';

    constructor() { super('Results'); }

    init(data: Partial<MissionResultsData> | undefined): void {
        const d = data ?? {};
        this.parts = Array.isArray(d.parts) ? d.parts.filter(p => p && typeof p === 'object') : [];
        this.mission = d.mission ?? d.stage ?? 1;
        this.res = {
            stage: d.stage ?? 1, score: d.score ?? 0, rescued: d.rescued ?? 0, kills: d.kills ?? 0, deaths: d.deaths ?? 0,
            accuracy: d.accuracy ?? 0, timeMs: d.timeMs ?? 0, difficulty: d.difficulty ?? 'arcade', parts: this.parts
        };
    }

    create(): void {
        const d = this.res;
        const R = UI.results;
        this.clock = 0; this.blink = 0; this.done = false; this.leaving = false; this.partsShown = 0; this.partRows = [];
        this.rank = computeRank(d);
        this.cameras.main.setBackgroundColor(C.dim);
        if (this.textures.exists('ui_keyart_title')) this.add.image(0, 0, 'ui_keyart_title').setOrigin(0, 0).setAlpha(0.3);
        this.add.rectangle(0, 0, W, H, C.dim, 1).setOrigin(0, 0).setAlpha(0.35);
        this.header = new Callout(this, 22, 20);
        this.time.delayedCall(250, () => this.header.show(`MISSION ${this.mission} COMPLETE!`, { font: F.steel, holdMs: 1e9, sfx: 'callout' }));
        // totals
        panel(this, 10, 42, 206, 152);
        text(this, 22, 48, 'RESULTS', F.sand);
        text(this, 204, 52, d.difficulty.toUpperCase(), F.hud, [1, 0]).setTint(C.ink5);
        const bonus = d.rescued * R.powBonus;
        this.tally = new Tally(this, {
            x: 22, y: 72, valueX: 204, rowHeight: 13, timing: R,
            rows: [
                { label: 'SCORE', value: () => pad(d.score, 8), to: d.score, format: v => pad(v, 8) },
                { label: 'POW RESCUED', value: () => `${d.rescued} × ${R.powBonus} = ${pad(bonus, 6)}`, to: bonus, format: v => `${d.rescued} × ${R.powBonus} = ${pad(v, 6)}` },
                { label: 'ACCURACY', value: () => `${Math.round(d.accuracy * 100)}%` },
                { label: 'TIME', value: () => mmss(d.timeMs) },
                { label: 'DEATHS', value: () => String(d.deaths) },
                { label: 'TOTAL', value: () => pad(d.score + bonus, 8), to: d.score + bonus, format: v => pad(v, 8), font: F.gold, gap: 5 }
            ],
            onDone: () => { this.clock = 0; }
        });
        bar(this, 22, 72 + 5 * 13 + 1, 182, 1, C.sand3, 0.6);
        // parts breakdown + rank
        panel(this, 222, 42, 152, 152);
        text(this, 232, 48, this.parts.length ? 'PARTS' : 'RANK', F.gold);
        this.parts.forEach((p, i) => {
            const def = partById(p.id);
            const y = 62 + i * 20;
            const n = text(this, 250, y, roman(def?.part ?? i + 1), F.gold, [1, 0]).setAlpha(0);
            const a = text(this, 254, y, (def?.title ?? p.id).toUpperCase(), F.hud).setAlpha(0);
            const b = text(this, 254, y + 9, `${pad(p.score, 6)} POW ${p.rescued} ${mmss(p.timeMs)}`, F.plain).setTint(C.ink5).setAlpha(0);
            this.partRows.push({ a, b, n });
        });
        const f = tagFrame(this, `rank_${this.rank.toLowerCase()}`);
        const stampY = this.parts.length ? 150 : 112;
        this.stamp = this.add.image(298, stampY, 'ui_rank', f).setOrigin(0.5, 0.5).setVisible(false).setDepth(15);
        text(this, 298, stampY + 24, 'RANK', F.hud, [0.5, 0]).setTint(C.ink5);
        this.press = text(this, W / 2, 204, 'PRESS START', F.hud, [0.5, 0.5]).setTint(C.sand5).setVisible(false);
        this.menuInput = new MenuInput(this);
        wipeIn(this);
    }

    private showPart(i: number): void {
        const r = this.partRows[i];
        r.n.setAlpha(1); r.a.setAlpha(1); r.b.setAlpha(1);
        getAudio(this).sfx('score_tally', { volume: 0.7 });
    }

    private stampRank(): void {
        if (this.done) return;
        this.done = true;
        const audio = getAudio(this);
        const y = this.stamp.y;
        this.stamp.setVisible(true).setPosition(298, y - 42).setAlpha(0);
        this.tweens.add({
            targets: this.stamp, y, alpha: 1, duration: 260, ease: 'Quad.easeIn',
            onComplete: () => {
                audio.sfx('rank_stamp');
                this.cameras.main.shake(140, 0.012);
                this.press.setVisible(true);
                this.clock = 0;
                text(this, 298, y + 34, `${rankPoints(this.res)} PTS`, F.plain, [0.5, 0]).setAlpha(0.6);
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

    private skipAll(): void {
        this.tally.skip();
        while (this.partsShown < this.partRows.length) this.showPart(this.partsShown++);
        this.stampRank();
    }

    update(_time: number, delta: number): void {
        const dt = Math.min(100, delta);
        this.clock += dt;
        this.blink += dt;
        this.menuInput.update(dt);
        this.header.update(dt);
        this.tally.update(dt);
        const R = UI.results;
        const go = this.menuInput.confirm || this.menuInput.justDown('pause');
        if (!this.done) {
            if (go && this.clock > 300) { this.skipAll(); return; }
            if (!this.tally.done) return;
            if (this.partsShown < this.partRows.length) {
                if (this.clock >= R.partRowMs) { this.showPart(this.partsShown++); this.clock = 0; }
            } else if (this.clock >= R.stampDelayMs) this.stampRank();
            return;
        }
        this.press.setVisible(this.blink % 800 < 500);
        if (go || this.clock > R.autoAdvanceMs) this.leave();
    }
}
