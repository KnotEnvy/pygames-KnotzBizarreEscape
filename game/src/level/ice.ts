// Part III "MOOSE LAKE": cracking ice.
//   crack=true  tiles crack when the player stands on them: crack frames f1 → f2 → f3 (LEVEL.ice.stageMs each), then the
//               tile becomes open water (hazard=water, no collision: the player drops in and the engine's hazard check
//               kills them). Broken tiles refreeze after LEVEL.ice.refreezeMs, so a route is never lost after a respawn.
//   crack=stomp tiles (the boss arena floor) only crack on boss:stomp with power >= stompMinPower (MOOSEZILLA's phase 3),
//               in 2-tile holes toward the player, and refreeze faster.
// Slippery ice needs no level code: tiles carry material=ice and the player reads ctx.physics.surfaceAt().
// The frame gids come from the map property `crack_gids` ("f1,f2,f3,water", written by the generator by tile name).
// Map property `crack_style` picks the sounds/effects (LEVEL.ice.styles): 'ice' (default, Moose Lake) or 'wood' (Mission 2's
// den pier, where GATORGEDDON's tail slams splinter planks into holes).
import Phaser from 'phaser';
import type { GameContext, GameEvents } from '../core';
import { LEVEL, type CrackStyle } from '../config/tuning/level';
import type { BuiltMap } from './map';
import { swapTile } from './tiles';

type State = 'intact' | 'cracking' | 'open' | 'freezing';
interface Cell { tx: number; ty: number; base: number; kind: 'step' | 'stomp'; state: State; t: number; stage: number; refreeze: number }

/** fx:emit with the Phase E optional fields FX reads (width, duration). */
type IceFx = GameEvents['fx:emit'] & { width?: number; duration?: number };

export class IceSystem {
    private readonly cells = new Map<number, Cell>();
    private readonly live = new Set<Cell>();
    private readonly frames: number[];
    private readonly layer: Phaser.Tilemaps.TilemapLayer;
    private readonly ts: number;
    private readonly style: CrackStyle;
    stats = { cracked: 0, opened: 0, refrozen: 0, stomps: 0 };

    constructor(private readonly ctx: GameContext, private readonly built: BuiltMap) {
        this.layer = built.ground;
        this.ts = built.map.tileWidth;
        this.frames = String(built.props.crack_gids ?? '').split(',').map(Number).filter(n => n > 0);
        this.style = LEVEL.ice.styles[String(built.props.crack_style ?? 'ice')] ?? LEVEL.ice.styles.ice;
        this.layer.forEachTile(t => {
            const c = t.properties?.crack;
            if (c === undefined || c === null || c === false || c === '') return;
            const kind = c === 'stomp' ? 'stomp' : 'step';
            this.cells.set(this.key(t.x, t.y), { tx: t.x, ty: t.y, base: t.index, kind, state: 'intact', t: 0, stage: 0, refreeze: 0 });
        });
        if (this.cells.size && this.frames.length < 4) console.warn('[level] map has crack tiles but no crack_gids property: ice will not crack');
        ctx.events.on('boss:stomp', e => this.stomp(e.x, e.power));
    }

    get count(): number { return this.cells.size; }

    private key(tx: number, ty: number): number { return ty * 100000 + tx; }

    update(dt: number): void {
        if (this.frames.length >= 4) this.feet();
        for (const c of this.live) this.tick(c, dt);
    }

    /** The player standing on step-crack ice starts it cracking. */
    private feet(): void {
        const p = this.ctx.player();
        if (!p || !p.alive()) return;
        const body = (p.sprite as Phaser.GameObjects.Sprite).body as Phaser.Physics.Arcade.Body | null;
        if (!body || !(body.blocked.down || body.touching.down)) return;
        const y = body.bottom + 1;
        for (const x of [body.left + 1, body.center.x, body.right - 1]) {
            const t = this.layer.getTileAtWorldXY(x, y, false);
            if (!t) continue;
            const c = this.cells.get(this.key(t.x, t.y));
            if (c && c.kind === 'step' && c.state === 'intact') this.crack(c, LEVEL.ice.refreezeMs);
        }
    }

    private crack(c: Cell, refreeze: number): void {
        c.state = 'cracking'; c.t = 0; c.stage = 0; c.refreeze = refreeze;
        this.live.add(c);
        this.setFrame(c, 1);
        const x = (c.tx + 0.5) * this.ts, y = c.ty * this.ts;
        const S = this.style;
        this.ctx.events.emit('fx:emit', { effect: S.crackFx, x, y, width: this.ts, duration: LEVEL.ice.stageMs * 4, material: S.material, count: 3 } as IceFx);
        if (S.crackSfx) this.ctx.audio.sfx(S.crackSfx, { x });
        this.stats.cracked++;
    }

    private tick(c: Cell, dt: number): void {
        const I = LEVEL.ice;
        c.t += dt;
        if (c.state === 'cracking') {
            const stage = 1 + Math.floor(c.t / I.stageMs);
            if (stage >= 4) { this.open(c); return; }
            if (stage !== c.stage) this.setFrame(c, stage);
        } else if (c.state === 'open') {
            if (c.t < c.refreeze) return;
            if (this.playerOver(c)) { c.t = c.refreeze - 400; return; } // never refreeze into a body
            c.state = 'freezing'; c.t = 0;
            this.setFrame(c, 3);
        } else if (c.state === 'freezing') {
            const stage = 3 - Math.floor(c.t / I.stageMs);
            if (stage <= 0) { this.setTile(c, c.base); c.state = 'intact'; this.live.delete(c); this.stats.refrozen++; return; }
            if (stage !== c.stage) this.setFrame(c, stage);
        }
    }

    private open(c: Cell): void {
        c.state = 'open'; c.t = 0;
        this.setTile(c, this.frames[3]);
        const x = (c.tx + 0.5) * this.ts, y = c.ty * this.ts;
        const S = this.style;
        this.ctx.events.emit('fx:emit', { effect: S.breakFx, x, y, width: this.ts, count: 8, material: S.material } as IceFx);
        if (S.breakSfx) this.ctx.audio.sfx(S.breakSfx, { x });
        if (S.splash) this.ctx.events.emit('water:splash', { x, y: y + this.ts, size: 'm', kind: 'enter' });
        this.stats.opened++;
    }

    private setFrame(c: Cell, stage: number): void {
        c.stage = stage;
        this.setTile(c, this.frames[stage - 1]);
    }

    /** Swap the tile (copies its tileset properties and rebuilds collision). The cell's own base keeps its crack marker. */
    private setTile(c: Cell, gid: number): void {
        swapTile(this.layer, this.built.map, c.tx, c.ty, gid, gid === c.base ? { crack: c.kind === 'stomp' ? 'stomp' : 'true' } : undefined);
    }

    private playerOver(c: Cell): boolean {
        const p = this.ctx.player();
        if (!p || !p.alive()) return false;
        const x0 = c.tx * this.ts, y0 = c.ty * this.ts;
        return p.x > x0 - 6 && p.x < x0 + this.ts + 6 && p.y > y0 - 2 && p.y < y0 + this.ts + 30;
    }

    /** boss:stomp: crack 2-tile holes in the arena ice toward the player (phase-3 power), clear of the arena walls. */
    private stomp(x: number, power: number): void {
        const I = LEVEL.ice;
        if (power < I.stompMinPower || this.frames.length < 4) return;
        this.stats.stomps++;
        const p = this.ctx.player();
        const dir = p ? (p.x >= x ? 1 : -1) : -1;
        const v = this.ctx.camera.view();
        const holes = Math.max(1, Math.round(power) - 1);
        for (let i = 0; i < holes; i++) {
            const cx = x + dir * (I.stompOffset + i * I.stompSpacing);
            if (cx < v.left + I.wallMargin || cx > v.right - I.wallMargin) continue;
            const t0 = Math.round(cx / this.ts) - 1;
            for (let tx = t0; tx <= t0 + 1; tx++) {
                for (const c of this.columnCells(tx)) if (c.state === 'intact') this.crack(c, I.stompRefreezeMs);
            }
        }
    }

    private columnCells(tx: number): Cell[] {
        const out: Cell[] = [];
        for (let ty = 0; ty < this.built.map.height; ty++) {
            const c = this.cells.get(this.key(tx, ty));
            if (c) out.push(c);
        }
        return out;
    }

    debug(): unknown {
        return { tiles: this.cells.size, live: this.live.size, ...this.stats };
    }
}
