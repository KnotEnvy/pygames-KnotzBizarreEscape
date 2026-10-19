// Mission 2 water (docs/MISSION2.md):
//   Wading:        every horizontal run of `material=shallow` ground tiles gets a translucent water surface drawn over the
//                  legs (TileSprites above actors, under bullets and FX), with a brighter crest scrolling the other way and
//                  end caps. The Player reads the material itself (speed/jump, step splashes); this is only the look.
//   Sinking logs:  contiguous runs of `sink=true` tiles are one log. Standing on it bobs it (bob frames, `log_bob`); after
//                  LEVEL.water.sink.standMs of standing (decaying at half speed while off it) it sinks: s1 → s2 → open water
//                  (hazard=water, no collision; the engine's hazard check drowns whoever is still on it), `log_sink` and a
//                  `water:splash`. It resurfaces after underMs, never into a body. Frame gids come from the map property
//                  `sink_gids` (JSON {l:[base,bob,s1,s2], m:[...], r:[...], water}, written by the generator by tile name).
//   Den channel:   trigger `channel` (2-3 boss arena): an opaque animated water strip at DEPTH.TILES_BACK + 1 across the rect,
//                  top at rect.y. GATORGEDDON submerged renders at TILES_BACK + 0.5, so only what rises above it shows.
import Phaser from 'phaser';
import { DEPTH, type GameContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import type { BuiltMap } from './map';
import { swapTile } from './tiles';
import type { LevelObject } from './types';

type Part = 'l' | 'm' | 'r';
type LogState = 'idle' | 'stood' | 'sinking' | 'under' | 'rising';
interface Log { tx0: number; tx1: number; ty: number; parts: Part[]; state: LogState; stand: number; t: number; stage: number; bob: boolean }
interface Strip { body: Phaser.GameObjects.TileSprite; crest: Phaser.GameObjects.TileSprite | null; speed: number; crestSpeed: number }

/** Depth of the wading surface: over the player (50) and enemies, under projectiles (60) and FX (70). */
const WADE_DEPTH = DEPTH.PROJECTILES - 1;

export class WaterSystem {
    private readonly logs: Log[] = [];
    private readonly strips: Strip[] = [];
    private readonly gids: Record<Part, number[]> & { water: number } = { l: [], m: [], r: [], water: 0 };
    private readonly layer: Phaser.Tilemaps.TilemapLayer;
    private readonly ts: number;
    private clock = 0;
    stats = { logs: 0, shallowRuns: 0, sunk: 0, resurfaced: 0, channel: 0 };

    constructor(private readonly ctx: GameContext, private readonly built: BuiltMap, triggers: LevelObject[]) {
        this.layer = built.ground;
        this.ts = built.map.tileWidth;
        this.readGids();
        this.scan();
        for (const t of triggers) if (t.type === 'channel') this.channel(t);
        ctx.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.strips.length = 0; });
    }

    get active(): boolean { return this.logs.length > 0 || this.strips.length > 0; }

    private readGids(): void {
        const raw = this.built.props.sink_gids;
        if (!raw) return;
        try {
            const g = JSON.parse(String(raw)) as Record<string, number[] | number>;
            for (const p of ['l', 'm', 'r'] as Part[]) if (Array.isArray(g[p])) this.gids[p] = g[p] as number[];
            this.gids.water = Number(g.water) || 0;
        } catch { console.warn('[level] bad sink_gids map property'); }
    }

    /** Find the shallow runs (wading surfaces) and the sinking logs. */
    private scan(): void {
        const map = this.built.map;
        for (let ty = 0; ty < map.height; ty++) {
            let shallow0 = -1, log0 = -1;
            for (let tx = 0; tx <= map.width; tx++) {
                const t = tx < map.width ? this.layer.getTileAt(tx, ty) : null;
                const p = t?.properties as Record<string, unknown> | undefined;
                const isShallow = p?.material === 'shallow';
                const isLog = p?.sink === true || p?.sink === 'true';
                if (isShallow && shallow0 < 0) shallow0 = tx;
                if (!isShallow && shallow0 >= 0) { this.wade(shallow0, tx - 1, ty); shallow0 = -1; }
                if (isLog && log0 < 0) log0 = tx;
                if (!isLog && log0 >= 0) { this.addLog(log0, tx - 1, ty); log0 = -1; }
            }
        }
    }

    // ------------------------------------------------------------------------------------------ wading surface
    private wade(tx0: number, tx1: number, ty: number): void {
        const W = LEVEL.water.wade;
        const scene = this.ctx.scene;
        this.stats.shallowRuns++;
        if (!scene.textures.exists(W.key)) return;
        const top = ty * this.ts - W.above;
        let x0 = tx0 * this.ts, x1 = (tx1 + 1) * this.ts;
        // End caps (the crest curls down into the bank) replace the outer 8 px of the body at both ends.
        if (scene.textures.exists(W.edge) && x1 - x0 >= 32) {
            const ew = scene.textures.get(W.edge).getSourceImage().width;
            scene.add.image(x0, top, W.edge).setOrigin(0, 0).setDepth(WADE_DEPTH).setAlpha(W.alpha);
            scene.add.image(x1 - ew, top, W.edge).setOrigin(0, 0).setDepth(WADE_DEPTH).setAlpha(W.alpha).setFlipX(true);
            x0 += ew; x1 -= ew;
        }
        const h = scene.textures.get(W.key).getSourceImage().height;
        const body = scene.add.tileSprite(x0, top, x1 - x0, h, W.key).setOrigin(0, 0).setDepth(WADE_DEPTH).setAlpha(W.alpha);
        body.tilePositionX = x0;
        const crest = scene.textures.exists(W.crest)
            ? scene.add.tileSprite(x0, top, x1 - x0, scene.textures.get(W.crest).getSourceImage().height, W.crest).setOrigin(0, 0).setDepth(WADE_DEPTH).setAlpha(W.crestAlpha)
            : null;
        this.strips.push({ body, crest, speed: W.speed, crestSpeed: W.crestSpeed });
    }

    private channel(t: LevelObject): void {
        const C = LEVEL.water.channel;
        const scene = this.ctx.scene;
        if (!scene.textures.exists(C.key)) return;
        const h = scene.textures.get(C.key).getSourceImage().height;
        const body = scene.add.tileSprite(t.x, t.y, t.width, h, C.key).setOrigin(0, 0).setDepth(DEPTH.TILES_BACK + 1);
        const crest = scene.textures.exists(C.glint)
            ? scene.add.tileSprite(t.x, t.y, t.width, scene.textures.get(C.glint).getSourceImage().height, C.glint).setOrigin(0, 0).setDepth(DEPTH.TILES_BACK + 1).setAlpha(C.glintAlpha)
            : null;
        this.strips.push({ body, crest, speed: C.speed, crestSpeed: C.glintSpeed });
        this.stats.channel++;
    }

    // ------------------------------------------------------------------------------------------ sinking logs
    private addLog(tx0: number, tx1: number, ty: number): void {
        const parts: Part[] = [];
        for (let tx = tx0; tx <= tx1; tx++) {
            const idx = this.layer.getTileAt(tx, ty)?.index ?? -1;
            parts.push((['l', 'm', 'r'] as Part[]).find(p => this.gids[p][0] === idx) ?? (tx === tx0 ? 'l' : tx === tx1 ? 'r' : 'm'));
        }
        this.logs.push({ tx0, tx1, ty, parts, state: 'idle', stand: 0, t: 0, stage: 0, bob: false });
        this.stats.logs++;
    }

    update(dt: number): void {
        this.clock += dt;
        const s = dt / 1000;
        for (const st of this.strips) {
            st.body.tilePositionX += st.speed * s;
            if (st.crest) st.crest.tilePositionX += st.crestSpeed * s;
        }
        if (!this.logs.length || !this.gids.water) return;
        const under = this.logUnderPlayer();
        const S = LEVEL.water.sink;
        for (const log of this.logs) {
            const on = log === under;
            switch (log.state) {
                case 'idle':
                    if (!on) break;
                    log.state = 'stood'; log.t = 0;
                    this.ctx.audio.sfx('log_bob', { x: this.cx(log) });
                    this.ctx.events.emit('water:splash', { x: this.cx(log), y: log.ty * this.ts, size: 's', kind: 'step' });
                    break;
                case 'stood': {
                    log.stand = on ? log.stand + dt : Math.max(0, log.stand - dt / 2);
                    log.t += dt;
                    const bob = on && Math.floor(log.t / S.bobMs) % 2 === 0;
                    if (bob !== log.bob) { log.bob = bob; this.frame(log, bob ? 1 : 0); }
                    if (log.stand >= S.standMs) this.sink(log);
                    else if (!on && log.stand <= 0) { log.state = 'idle'; if (log.bob) { log.bob = false; this.frame(log, 0); } }
                    break;
                }
                case 'sinking':
                    if ((log.t += dt) < S.stageMs) break;
                    log.t = 0;
                    if (++log.stage <= 2) this.frame(log, log.stage + 1); // stage 1 = s1 (frame 2), stage 2 = s2 (frame 3)
                    else { this.frame(log, -1); log.state = 'under'; }
                    break;
                case 'under':
                    if ((log.t += dt) < S.underMs) break;
                    if (this.bodyOver(log)) { log.t = S.underMs - S.retryMs; break; }  // never resurface into a body
                    log.state = 'rising'; log.t = 0; log.stage = 3;
                    this.frame(log, 3);
                    this.ctx.events.emit('water:splash', { x: this.cx(log), y: log.ty * this.ts, size: 's', kind: 'surface' });
                    break;
                case 'rising':
                    if ((log.t += dt) < S.stageMs) break;
                    log.t = 0;
                    if (--log.stage >= 2) this.frame(log, log.stage);
                    else { this.frame(log, 0); log.state = 'idle'; log.stand = 0; log.bob = false; this.stats.resurfaced++; }
                    break;
            }
        }
    }

    private sink(log: Log): void {
        log.state = 'sinking'; log.t = 0; log.stage = 1; log.stand = 0;
        this.frame(log, 2);
        const x = this.cx(log), y = log.ty * this.ts;
        this.ctx.audio.sfx('log_sink', { x });
        this.ctx.events.emit('water:splash', { x, y, size: 'm', kind: 'sink' });
        this.stats.sunk++;
    }

    /** frame: 0 base, 1 bob, 2 s1, 3 s2, -1 open water. */
    private frame(log: Log, f: number): void {
        for (let i = 0; i < log.parts.length; i++) {
            const gid = f < 0 ? this.gids.water : this.gids[log.parts[i]][f];
            if (gid) swapTile(this.layer, this.built.map, log.tx0 + i, log.ty, gid);
        }
    }

    private cx(log: Log): number { return (log.tx0 + log.tx1 + 1) / 2 * this.ts; }

    private logUnderPlayer(): Log | null {
        const p = this.ctx.player();
        if (!p || !p.alive()) return null;
        const body = (p.sprite as Phaser.GameObjects.Sprite).body as Phaser.Physics.Arcade.Body | null;
        if (!body || !(body.blocked.down || body.touching.down)) return null;
        const ty = Math.floor((body.bottom + 1) / this.ts);
        const txa = Math.floor((body.left + 1) / this.ts), txb = Math.floor((body.right - 1) / this.ts);
        for (const log of this.logs) {
            if (log.ty !== ty || (log.state !== 'idle' && log.state !== 'stood')) continue;
            if (txb >= log.tx0 && txa <= log.tx1) return log;
        }
        return null;
    }

    private bodyOver(log: Log): boolean {
        const p = this.ctx.player();
        if (!p || !p.alive()) return false;
        const x0 = log.tx0 * this.ts - 6, x1 = (log.tx1 + 1) * this.ts + 6, y0 = log.ty * this.ts;
        return p.x > x0 && p.x < x1 && p.y > y0 - 2 && p.y < y0 + this.ts + 30;
    }

    debug(): unknown {
        return { ...this.stats, live: this.logs.filter(l => l.state !== 'idle').map(l => `${l.tx0}:${l.state}`).join(' ') || null };
    }
}
