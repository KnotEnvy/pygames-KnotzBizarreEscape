// Mission 2 swamp-gas vents (trigger `hazard_vent`: rect whose bottom-centre is the nozzle; props `period`, `on`, `offset`
// in ms). Each cycle: idle → BUBBLING telegraph (≥ 700 ms: prop_gas_vent `bubble`, fx:emit gas_bubble, `gas_bubble`) →
// FLAME column (prop_gas_flame start/loop/end, fx:emit gas_flame with a light pool, `gas_vent`). The flame hurts the player
// through ctx.damage.deal (god mode and i-frames respected) and also enemies standing in it (once per flame each).
// Vents far from the view keep their clock but don't animate, emit or sound.
import Phaser from 'phaser';
import { DEPTH, hasAnim, type GameContext, type Hurtbox } from '../core';
import { LEVEL } from '../config/tuning/level';
import { num, type LevelObject } from './types';

type Phase = 'idle' | 'bubble' | 'flame';
interface Vent {
    x: number; y: number; period: number; on: number; tele: number; offset: number;
    phase: Phase; nozzle: Phaser.GameObjects.Sprite | null; flame: Phaser.GameObjects.Sprite | null;
    bubbleT: number; hit: Set<Hurtbox>;
}

export class VentSystem {
    private readonly vents: Vent[] = [];
    private readonly rect = new Phaser.Geom.Rectangle();
    private readonly hits: Hurtbox[] = [];
    private clock = 0;
    stats = { vents: 0, flames: 0, playerHits: 0, enemyHits: 0 };

    constructor(private readonly ctx: GameContext, triggers: LevelObject[]) {
        const V = LEVEL.vent;
        const scene = ctx.scene;
        for (const t of triggers) {
            if (t.type !== 'hazard_vent') continue;
            const x = t.x + t.width / 2, y = t.y + t.height;
            const period = Math.max(1600, num(t.props.period, V.period));
            const on = Phaser.Math.Clamp(num(t.props.on, V.on), 300, period - 900);
            const tele = Math.max(700, Math.min(V.telegraphMs, period - on - 200));
            const nozzle = scene.textures.exists('prop_gas_vent') ? scene.add.sprite(x, y, 'prop_gas_vent').setOrigin(0.5, 1).setDepth(DEPTH.PROPS - 1) : null;
            const flame = scene.textures.exists('prop_gas_flame') ? scene.add.sprite(x, y - V.nozzleUp, 'prop_gas_flame').setOrigin(0.5, 1).setDepth(DEPTH.PROJECTILES - 2).setVisible(false) : null;
            this.play(nozzle, 'prop_gas_vent_idle');
            this.vents.push({ x, y, period, on, tele, offset: num(t.props.offset, 0), phase: 'idle', nozzle, flame, bubbleT: 0, hit: new Set() });
        }
        this.stats.vents = this.vents.length;
    }

    get count(): number { return this.vents.length; }

    /** Loops by default (tags are created with repeat 0); `once` plays through and holds. */
    private play(s: Phaser.GameObjects.Sprite | null, key: string, once = false): void {
        if (s && hasAnim(s.scene, key)) s.play({ key, repeat: once ? 0 : -1 }, true);
    }

    update(dt: number): void {
        this.clock += dt;
        const V = LEVEL.vent;
        const v = this.ctx.camera.view();
        for (const vent of this.vents) {
            const t = (this.clock + vent.offset) % vent.period;
            const phase: Phase = t >= vent.period - vent.on ? 'flame' : t >= vent.period - vent.on - vent.tele ? 'bubble' : 'idle';
            const near = vent.x > v.left - V.activeMargin && vent.x < v.right + V.activeMargin;
            if (phase !== vent.phase) this.enter(vent, phase, near);
            if (!near) continue;
            if (phase === 'bubble' && (vent.bubbleT -= dt) <= 0) {
                vent.bubbleT = V.bubbleEveryMs;
                this.ctx.events.emit('fx:emit', { effect: 'gas_bubble', x: vent.x, y: vent.y - V.nozzleUp, count: 2 });
            }
            if (phase === 'flame') this.burn(vent);
        }
    }

    private enter(vent: Vent, phase: Phase, near: boolean): void {
        const V = LEVEL.vent;
        vent.phase = phase;
        if (phase === 'idle') {
            this.play(vent.nozzle, 'prop_gas_vent_idle');
            if (vent.flame?.visible) {
                if (near && hasAnim(vent.flame.scene, 'prop_gas_flame_end')) {
                    this.play(vent.flame, 'prop_gas_flame_end', true);
                    vent.flame.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => vent.flame?.setVisible(false));
                } else vent.flame.setVisible(false);
            }
            return;
        }
        if (phase === 'bubble') {
            vent.bubbleT = 0;
            this.play(vent.nozzle, 'prop_gas_vent_bubble');
            if (near) this.ctx.audio.sfx('gas_bubble', { x: vent.x });
            return;
        }
        // flame
        vent.hit.clear();
        this.play(vent.nozzle, 'prop_gas_vent_burn');
        if (!near) return;
        this.stats.flames++;
        if (vent.flame) {
            vent.flame.setVisible(true);
            if (hasAnim(vent.flame.scene, 'prop_gas_flame_start')) {
                this.play(vent.flame, 'prop_gas_flame_start', true);
                vent.flame.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (vent.phase === 'flame') this.play(vent.flame, 'prop_gas_flame_loop'); });
            } else this.play(vent.flame, 'prop_gas_flame_loop');
        }
        this.ctx.audio.sfx('gas_vent', { x: vent.x });
        this.ctx.events.emit('fx:emit', { effect: 'gas_flame', x: vent.x, y: vent.y - V.nozzleUp, height: V.height, width: V.width, duration: vent.on });
    }

    /** The flame column hurts what stands in it: the player (contact through the damage service) and enemies (once each). */
    private burn(vent: Vent): void {
        const V = LEVEL.vent;
        const r = this.rect.setTo(vent.x - V.width / 2, vent.y - V.nozzleUp - V.height, V.width, V.height);
        const dmg = this.ctx.damage;
        this.hits.length = 0;
        for (const h of dmg.queryRect(r, 'enemy')) if (h.team === 'player') this.hits.push(h);
        for (const h of this.hits) {
            if (!h.alive()) continue;
            dmg.deal(h, { damage: V.damage, source: 'enemy', x: vent.x, y: vent.y - 20, dirX: 0, dirY: -1, kind: 'flame', weapon: 'gas_vent' });
            this.stats.playerHits++;
        }
        this.hits.length = 0;
        for (const h of dmg.queryRect(r, 'player')) if (h.team === 'enemy' && !vent.hit.has(h)) this.hits.push(h);
        for (const h of this.hits) {
            if (!h.alive()) continue;
            vent.hit.add(h);
            dmg.deal(h, { damage: V.enemyDamage, source: 'neutral', x: vent.x, y: vent.y - 20, dirX: 0, dirY: -1, kind: 'flame', weapon: 'gas_vent' });
            this.stats.enemyHits++;
        }
        this.hits.length = 0;
    }

    debug(): unknown {
        return { ...this.stats, burning: this.vents.filter(v => v.phase === 'flame').length };
    }
}
