// Part II "TIMBER EXPRESS": the world is a static train; the landscape moves past it at the map's `drift` (px/s).
//   hazard_sweep (low bridge): the feet enter the rect → horn + a trackside DUCK! sign whips past + prompt, then after
//                `LEVEL.train.sweep.warnMs` an overhead girder enters at the view's right edge and travels left at drift
//                speed. Its bottom sits at standing height on the boxcar roofs (`y`, default 234 = roof 256 − 22): a
//                standing player there is hit through ctx.damage (contact), a crouching one clears it, and anyone on a
//                lower car (logs/coal 272, decks 304) or inside a boxcar is safe. Enemies caught on a roof are smashed.
//                Properties: y (beam bottom, px), count (beams, default 1), gap (ms between beams).
//   tunnel:      the feet enter the rect → a tunnel `ms` long (at drift speed) slides over the train from the right:
//                rock portal edges, a dark rock wall behind the cars and a rock ceiling band in front, plus an FX zone
//                of kind 'tunnel' (FX draws the darkness and the passing lamps) that moves with it. Visual only.
import Phaser from 'phaser';
import { DEPTH, type GameContext, type Hurtbox } from '../core';
import { LEVEL } from '../config/tuning/level';
import type { Parallax } from './parallax';
import { num, type LevelObject } from './types';

interface Beam { sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle; y: number; entered: boolean }
interface Sweep { t: number; beamsLeft: number; nextBeam: number; gap: number; y: number; sign: Phaser.GameObjects.GameObject & { x: number } | null; beams: Beam[] }
interface Tunnel {
    id: string;
    x0: number;
    len: number;
    wall: Phaser.GameObjects.TileSprite | null;
    ceiling: Phaser.GameObjects.TileSprite | null;
    edgeIn: Phaser.GameObjects.TileSprite | null;
    edgeOut: Phaser.GameObjects.TileSprite | null;
    /** Removes the PRE_RENDER draw hook. */
    off?: () => void;
}

const KEYS = { wall: 'bg2_tunnel_wall', ceiling: 'bg2_tunnel_ceiling', edge: 'bg2_tunnel_edge', bridge: 'prop_low_bridge', sign: 'prop_sign_duck' };

export class TrainSystem {
    private readonly sweeps: Sweep[] = [];
    private readonly tunnels: Tunnel[] = [];
    private readonly pending: LevelObject[];
    private readonly rect = new Phaser.Geom.Rectangle();
    private readonly hits: Hurtbox[] = [];
    private tunnelSeq = 0;
    /** Debug: beams spawned / player hits. */
    stats = { sweeps: 0, beams: 0, hits: 0, tunnels: 0 };

    constructor(private readonly ctx: GameContext, triggers: LevelObject[], private readonly drift: number,
        private readonly parallax: Parallax, private readonly setAmbience: (kind: 'tunnel' | null) => void, private readonly mapH: number) {
        this.pending = triggers.filter(t => t.type === 'hazard_sweep' || t.type === 'tunnel');
        ctx.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    }

    get active(): boolean { return this.sweeps.length > 0 || this.tunnels.length > 0; }

    update(dt: number): void {
        const p = this.ctx.player();
        if (p) {
            for (let i = this.pending.length - 1; i >= 0; i--) {
                const t = this.pending[i];
                if (p.x < t.x || p.x > t.x + t.width || p.y - 1 < t.y || p.y - 1 > t.y + t.height) continue;
                this.pending.splice(i, 1);
                if (t.type === 'hazard_sweep') this.startSweep(t); else this.startTunnel(t);
            }
        }
        const step = this.drift * dt / 1000;
        for (let i = this.sweeps.length - 1; i >= 0; i--) if (this.tickSweep(this.sweeps[i], dt, step)) this.sweeps.splice(i, 1);
        let cover = 0, inside = false;
        const v = this.ctx.camera.view();
        for (let i = this.tunnels.length - 1; i >= 0; i--) {
            const tn = this.tunnels[i];
            tn.x0 -= step;
            const x1 = tn.x0 + tn.len;
            cover = Math.max(cover, Math.max(0, Math.min(x1, v.right) - Math.max(tn.x0, v.left)) / v.width);
            if (p && p.x >= tn.x0 && p.x <= x1) inside = true;
            if (x1 < v.left - 64) { this.endTunnel(tn); this.tunnels.splice(i, 1); continue; }
            this.ctx.events.emit('fx:zone', { id: tn.id, kind: 'tunnel', active: true, x: tn.x0, y: 0, width: tn.len, height: this.mapH });
        }
        this.parallax.setTunnelCover(cover);
        this.setAmbience(inside ? 'tunnel' : null);
    }

    // ------------------------------------------------------------------------------------------ low bridges

    private startSweep(t: LevelObject): void {
        const S = LEVEL.train.sweep;
        const v = this.ctx.camera.view();
        this.ctx.audio.sfx('train_horn');
        this.ctx.events.emit('ui:prompt', { text: S.prompt, ms: S.promptMs });
        let sign: Sweep['sign'] = null;
        if (this.ctx.scene.textures.exists(KEYS.sign)) {
            sign = this.ctx.scene.add.sprite(v.right + 24, S.signY, KEYS.sign).setOrigin(0.5, 1).setDepth(DEPTH.BG_NEAR + 3);
        }
        this.sweeps.push({ t: 0, beamsLeft: Math.max(1, num(t.props.count, 1)), nextBeam: S.warnMs, gap: num(t.props.gap, S.gapMs), y: num(t.props.y, S.y), sign, beams: [] });
        this.stats.sweeps++;
    }

    /** Returns true when the sweep is over. */
    private tickSweep(s: Sweep, dt: number, step: number): boolean {
        const S = LEVEL.train.sweep;
        const v = this.ctx.camera.view();
        s.t += dt;
        if (s.sign) {
            s.sign.x -= step;
            if (s.sign.x < v.left - 40) { s.sign.destroy(); s.sign = null; }
        }
        if (s.beamsLeft > 0 && s.t >= s.nextBeam) {
            s.beamsLeft--;
            s.nextBeam += s.gap;
            s.beams.push({ sprite: this.makeBeam(v.right + S.width / 2 + 8, s.y), y: s.y, entered: false });
            this.stats.beams++;
        }
        for (let i = s.beams.length - 1; i >= 0; i--) {
            const b = s.beams[i];
            b.sprite.x -= step;
            if (!b.entered && b.sprite.x - S.width / 2 < v.right) { b.entered = true; this.ctx.audio.sfx('bridge_whoosh', { x: b.sprite.x }); }
            this.strike(b);
            if (b.sprite.x + S.width / 2 < v.left - 8) { b.sprite.destroy(); s.beams.splice(i, 1); }
        }
        return s.beamsLeft === 0 && s.beams.length === 0 && !s.sign;
    }

    /** One girder per beam (a handful per part): created when it enters, destroyed when it leaves the view. */
    private makeBeam(x: number, y: number): Beam['sprite'] {
        const S = LEVEL.train.sweep;
        const scene = this.ctx.scene;
        const sprite = scene.textures.exists(KEYS.bridge)
            ? scene.add.sprite(x, y, KEYS.bridge).setOrigin(0.5, 1)
            : scene.add.rectangle(x, y, S.width, S.reach, 0x2f3d52).setOrigin(0.5, 1);
        return sprite.setDepth(DEPTH.TILES_FRONT + 1);
    }

    /** Damage what the girder touches: the player (contact, respects god/i-frames), and enemies on the roofs. */
    private strike(b: Beam): void {
        const S = LEVEL.train.sweep;
        const r = this.rect.setTo(b.sprite.x - S.width / 2, b.y - S.reach, S.width, S.reach);
        const dmg = this.ctx.damage;
        this.hits.length = 0;
        for (const h of dmg.queryRect(r, 'enemy')) this.hits.push(h);   // what the enemy team can hit = the player
        for (const h of this.hits) {
            if (!h.alive()) continue;
            dmg.deal(h, { damage: S.damage, source: 'enemy', x: r.centerX, y: b.y - 4, dirX: -1, dirY: 0, kind: 'contact' });
            this.stats.hits++;
        }
        this.hits.length = 0;
        for (const h of dmg.queryRect(r, 'player')) if (h.team === 'enemy') this.hits.push(h);
        for (const h of this.hits) {
            if (!h.alive()) continue;
            dmg.deal(h, { damage: S.enemyDamage, source: 'player', x: r.centerX, y: b.y - 4, dirX: -1, dirY: 0, kind: 'contact' });
        }
        this.hits.length = 0;
    }

    // ------------------------------------------------------------------------------------------ tunnels

    private startTunnel(t: LevelObject): void {
        const T = LEVEL.train.tunnel;
        const scene = this.ctx.scene;
        const cam = scene.cameras.main;
        const v = this.ctx.camera.view();
        const len = Math.max(64, this.drift * num(t.props.ms, T.ms) / 1000);
        const ts = (key: string, w: number, h: number, depth: number): Phaser.GameObjects.TileSprite | null =>
            scene.textures.exists(key) ? scene.add.tileSprite(0, 0, w, h, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth).setVisible(false) : null;
        const tn: Tunnel = {
            id: `level_tunnel_${++this.tunnelSeq}`,
            x0: v.right + 24,
            len,
            wall: ts(KEYS.wall, cam.width, cam.height, DEPTH.BG_NEAR + 5),
            ceiling: ts(KEYS.ceiling, cam.width, 40, DEPTH.TILES_FRONT + 3),
            edgeIn: ts(KEYS.edge, T.edgeWidth, cam.height, DEPTH.TILES_FRONT + 3),
            edgeOut: ts(KEYS.edge, T.edgeWidth, cam.height, DEPTH.TILES_FRONT + 3)
        };
        tn.edgeOut?.setFlipX(true);
        this.tunnels.push(tn);
        this.ctx.audio.sfx('train_horn', { volume: 0.7 });
        this.stats.tunnels++;
        // Draw after the camera settles each frame, like the parallax.
        const draw = (): void => this.drawTunnel(tn);
        scene.events.on(Phaser.Scenes.Events.PRE_RENDER, draw);
        tn.off = () => scene.events.off(Phaser.Scenes.Events.PRE_RENDER, draw);
    }

    private drawTunnel(tn: Tunnel): void {
        const cam = this.ctx.scene.cameras.main;
        const T = LEVEL.train.tunnel;
        const camX = cam.scrollX, camY = cam.scrollY, w = cam.width;
        const left = Phaser.Math.Clamp(Math.round(tn.x0 - camX), 0, w);
        const right = Phaser.Math.Clamp(Math.round(tn.x0 + tn.len - camX), 0, w);
        const span = right - left;
        for (const s of [tn.wall, tn.ceiling]) {
            if (!s) continue;
            s.setVisible(span > 0);
            if (span <= 0) continue;
            s.x = left;
            s.setSize(span, s.height);
            s.tilePositionX = Math.round(camX + left - tn.x0);
        }
        if (tn.wall) tn.wall.tilePositionY = Math.round(camY);
        if (tn.ceiling) tn.ceiling.y = Math.round(T.ceilingY - camY);
        const ein = Math.round(tn.x0 - camX) - 8;
        const eout = Math.round(tn.x0 + tn.len - camX) - T.edgeWidth + 8;
        for (const [s, x] of [[tn.edgeIn, ein], [tn.edgeOut, eout]] as const) {
            if (!s) continue;
            s.x = x;
            s.tilePositionY = Math.round(camY);
            s.setVisible(x > -T.edgeWidth && x < w);
        }
    }

    private endTunnel(tn: Tunnel): void {
        tn.off?.();
        tn.wall?.destroy(); tn.ceiling?.destroy(); tn.edgeIn?.destroy(); tn.edgeOut?.destroy();
        this.ctx.events.emit('fx:zone', { id: tn.id, kind: 'tunnel', active: false, x: 0, y: 0, width: 0, height: 0 });
    }

    private destroy(): void {
        for (const tn of this.tunnels) tn.off?.();
        this.tunnels.length = 0;
        this.sweeps.length = 0;
    }

    debug(): unknown {
        return { ...this.stats, drift: this.drift, sweeping: this.sweeps.length, tunnels: this.tunnels.map(t => Math.round(t.x0)), pending: this.pending.length };
    }
}
