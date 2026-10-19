// PART CLEAR (Phase E): started by the engine 3.5 s after a non-final stage:clear with { from, next, result, carry }.
// "PART I CLEAR!" slams in, the part's tally counts up (score, POWs, kills, accuracy, time, running total), the
// escape-route map shows the Knotz marker travelling to the next part, then PRESS START (or auto-advance) starts
// the next part with the carried run state: scene.start('Game', { part, carry }).
import Phaser from 'phaser';
import { registerDebug } from '../../core';
import { getAudio, type LoopHandle } from '../../audio';
import { UI } from '../../config/tuning/ui';
import { FIRST_PART, nextPart, partById, type CarryState, type PartClearData, type PartDef, type PartResult } from '../../config/campaign';
import { C, F, H, W, bar, mmss, pad, panel, roman, text, wrapText } from '../../ui/widgets';
import { Callout } from '../../ui/callout';
import { MenuInput } from '../../ui/input';
import { Tally } from '../../ui/tally';
import { RouteMap } from '../../ui/routemap';
import { wipeIn, wipeOut } from '../../ui/transitions';
import { uiLog } from '../../ui';

type Phase = 'tally' | 'travel' | 'ready' | 'leaving';

export class PartClearScene extends Phaser.Scene {
    private from!: PartDef;
    private next!: PartDef;
    private result!: PartResult;
    private carry!: CarryState;
    private menuInput!: MenuInput;
    private header!: Callout;
    private tally!: Tally;
    private map!: RouteMap;
    private nextTitle!: Phaser.GameObjects.BitmapText;
    private nextLabel!: Phaser.GameObjects.BitmapText;
    private nextLoc!: Phaser.GameObjects.BitmapText;
    /** Below the NEXT lines: a rule, HAZEL and her one-liner about the next part (fade in with the NEXT lines). */
    private teaser: Phaser.GameObjects.GameObject[] = [];
    private press!: Phaser.GameObjects.BitmapText;
    private wind: LoopHandle | null = null;
    private phase: Phase = 'tally';
    private clock = 0;
    private blink = 0;
    private readyAt = 0;

    constructor() { super('PartClear'); }

    init(data: Partial<PartClearData> | undefined): void {
        const d = data ?? {};
        this.from = d.from ?? partById('1-1') ?? FIRST_PART;
        this.next = d.next ?? nextPart(this.from.id) ?? this.from;
        this.result = { id: this.from.id, score: 0, rescued: 0, kills: 0, deaths: 0, shots: 0, hits: 0, timeMs: 0, ...(d.result ?? {}) };
        this.carry = {
            score: this.result.score, lives: 3, bombs: 10, weapon: 'pistol', ammo: Infinity, rescued: this.result.rescued, difficulty: 'arcade',
            parts: [this.result], ...(d.carry ?? {})
        };
    }

    create(): void {
        const P = UI.partClear;
        this.phase = 'tally'; this.clock = 0; this.blink = 0; this.readyAt = 0;
        uiLog(`partclear:open ${this.from.id}→${this.next.id}`);
        this.cameras.main.setBackgroundColor(C.dim);
        if (this.textures.exists('ui_keyart_title')) this.add.image(0, 0, 'ui_keyart_title').setOrigin(0, 0).setAlpha(0.25);
        this.add.rectangle(0, 0, W, H, C.dim, 1).setOrigin(0, 0).setAlpha(0.4);
        // header
        this.header = new Callout(this, 24, 20);
        this.time.delayedCall(200, () => this.header.show(`PART ${roman(this.from.part)} CLEAR!`, { font: F.fire, holdMs: 1e9, sfx: 'callout' }));
        // left: tally
        panel(this, 10, 44, 186, 150);
        text(this, 22, 51, this.from.title.toUpperCase(), F.gold);
        text(this, 184, 51, this.carry.difficulty.toUpperCase(), F.hud, [1, 0]).setTint(C.ink5);
        const r = this.result;
        const acc = r.shots > 0 ? Math.min(1, r.hits / r.shots) : 0;
        this.tally = new Tally(this, {
            x: 22, y: 70, valueX: 184, rowHeight: 13, timing: P,
            rows: [
                { label: 'SCORE', value: () => pad(r.score, 8), to: r.score, format: v => pad(v, 8) },
                { label: 'POW RESCUED', value: () => String(r.rescued), to: r.rescued },
                { label: 'KILLS', value: () => String(r.kills), to: r.kills },
                { label: 'ACCURACY', value: () => `${Math.round(acc * 100)}%` },
                { label: 'TIME', value: () => mmss(r.timeMs) },
                { label: 'TOTAL', value: () => pad(this.carry.score, 8), to: this.carry.score, from: Math.max(0, this.carry.score - r.score), format: v => pad(v, 8), font: F.gold, gap: 5 }
            ],
            onDone: () => this.onTallyDone()
        });
        bar(this, 22, 70 + 5 * 13 + 1, 162, 1, C.sand3, 0.6);
        const ammo = Number.isFinite(this.carry.ammo) ? String(this.carry.ammo) : '∞';
        text(this, 22, 176, `LIVES ×${this.carry.lives}   BOMB ${this.carry.bombs}   ARMS ${ammo}`, F.plain).setTint(C.ink5).setAlpha(0.8);
        // right: escape route
        panel(this, 200, 44, 174, 150);
        const parts = (partById(this.from.id) && this.missionParts()) || [this.from.part, this.next.part];
        this.map = new RouteMap(this, P.map.x, P.map.y, this.from.part, this.next.part, parts);
        const ny = P.nextY;
        this.nextLabel = text(this, 212, ny, 'NEXT', F.gold).setAlpha(0);
        this.nextTitle = text(this, 244, ny, this.next.title.toUpperCase(), F.hud).setTint(C.fire5).setAlpha(0);
        this.nextLoc = text(this, 212, ny + 11, this.next.location.toUpperCase(), F.plain).setTint(C.ink5).setAlpha(0);
        // Hazel's teaser for the next part (tuning line, else the first sentence of its briefing), two rows at most.
        const line = P.teaser[this.next.id] ?? (this.next.briefing?.[0] ?? '').split(/(?<=[.!?])\s/)[0] ?? '';
        const rows = wrapText(line.toUpperCase(), P.teaserChars).slice(0, 2);
        if (rows.length) {
            this.teaser.push(bar(this, 212, P.teaserY - 4, 150, 1, C.sand3, 0.5));
            this.teaser.push(text(this, 212, P.teaserY, 'HAZEL', F.gold));
            rows.forEach((r, i) => this.teaser.push(text(this, 212, P.teaserY + 10 + i * 10, r, F.plain).setTint(C.ink5)));
            for (const t of this.teaser) (t as Phaser.GameObjects.Image).setAlpha(0);
        }
        this.press = text(this, W / 2, 204, 'PRESS START', F.hud, [0.5, 0.5]).setTint(C.sand5).setVisible(false);
        this.menuInput = new MenuInput(this);
        const audio = getAudio(this);
        this.wind = audio.loop('wind', { volume: 0.4 });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.wind?.stop(300); this.wind = null; });
        registerDebug('partClear', () => ({ active: this.scene.isActive(), from: this.from.id, next: this.next.id, phase: this.phase, tallyDone: this.tally.done, arrived: this.map.arrived }));
        wipeIn(this);
    }

    /** Part numbers of the cleared part's mission (pictograms on the map). */
    private missionParts(): number[] {
        const out: number[] = [];
        for (let i = 1; i <= 6; i++) { if (partById(`${this.from.mission}-${i}`)) out.push(i); }
        return out.length ? out : [this.from.part, this.next.part];
    }

    private onTallyDone(): void {
        if (this.phase !== 'tally') return;
        this.phase = 'travel';
        this.clock = 0;
        this.time.delayedCall(UI.partClear.travelDelayMs, () => { if (this.phase === 'travel') this.map.travel(() => this.onArrive()); });
    }

    /** Idempotent: the map's travel tween and a confirm during the travel can both land here. */
    private onArrive(): void {
        if (this.phase === 'ready' || this.phase === 'leaving') return;
        this.phase = 'ready';
        this.readyAt = this.clock;
        this.tweens.add({ targets: [this.nextLabel, this.nextTitle, this.nextLoc, ...this.teaser], alpha: 1, duration: 220 });
        this.press.setVisible(true);
    }

    /** Confirm during the tally: everything at once. */
    private skipAll(): void {
        this.tally.skip();
        this.map.finish();
        this.onArrive();
    }

    private leave(): void {
        if (this.phase === 'leaving') return;
        this.phase = 'leaving';
        uiLog(`partclear:next ${this.next.id}`);
        const audio = getAudio(this);
        audio.sfx('ui_start');
        this.wind?.stop(400);
        this.wind = null;
        const carry = this.carry;
        const part = this.next.id;
        // The engine latches every key still held when the Game scene is created, so the confirming key can't leak.
        wipeOut(this, () => this.scene.start('Game', { part, carry }));
    }

    update(_time: number, delta: number): void {
        const dt = Math.min(100, delta);
        this.clock += dt;
        this.blink += dt;
        this.menuInput.update(dt);
        this.header.update(dt);
        this.tally.update(dt);
        const go = this.menuInput.confirm || this.menuInput.justDown('pause');
        if (this.phase === 'tally') {
            if (go && this.clock > 250) this.skipAll();
        } else if (this.phase === 'travel') {
            if (go) this.skipAll();
        } else if (this.phase === 'ready') {
            this.press.setVisible(this.blink % 800 < 500);
            if (go || this.clock - this.readyAt > UI.partClear.autoAdvanceMs) this.leave();
        }
    }
}
