// Prop factories (`prop:<kind>`): destructibles (crates, barrels, explosive barrels, sandbags) with neutral
// hurtboxes and solid static bodies, plus decor and the ambient behaviours (searchlight sweep, alarm lights,
// bunker doors with trickle spawns, the boss gate). Every prop sprite is anchored bottom-centre at (x, feet).
import Phaser from 'phaser';
import { DEPTH, type GameContext, type HitInfo, type Hurtbox, type RegisterContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import { DECOR_BACK_DEPTH } from './map';
import { bool, num, str, type LevelRuntime } from './types';

type Sprite = Phaser.GameObjects.Sprite;

/** Play an animation if it exists (missing art never crashes the level). */
export function playIf(s: Sprite, key: string, loop: boolean): boolean {
    if (!s.scene?.anims.get(key)?.frames.length) return false;
    s.play({ key, repeat: loop ? -1 : 0 }, true);
    return true;
}

function depthFor(props: Record<string, unknown>): number {
    const layer = str(props.layer);
    return layer === 'back' ? DECOR_BACK_DEPTH : layer === 'front' ? DEPTH.TILES_FRONT + 1 : DEPTH.PROPS;
}

function makeSprite(ctx: GameContext, kind: string, x: number, y: number, props: Record<string, unknown>): Sprite {
    const key = `prop_${kind}`;
    const s = ctx.scene.add.sprite(x, y, key).setOrigin(0.5, 1).setDepth(depthFor(props));
    s.setName(`prop:${kind}`);
    if (str(props.facing) === 'left' && kind.startsWith('sign_')) s.setFlipX(true);
    return s;
}

/** Solid props that something can rest on (stacked crates fall when their support breaks). */
interface SolidProp { sprite: Sprite; zone: Phaser.GameObjects.Zone; body: [number, number, number, number] }

export function registerProps(ctx: RegisterContext, rt: LevelRuntime): void {
    const solidProps: SolidProp[] = [];

    const moveZone = (p: SolidProp): void => {
        const [bx, by, bw, bh] = p.body;
        const s = p.sprite;
        p.zone.setPosition(s.x - s.width / 2 + bx + bw / 2, s.y - s.height + by + bh / 2);
        (p.zone.body as Phaser.Physics.Arcade.StaticBody | null)?.updateFromGameObject();
    };

    /** Props resting on `gone` fall to the next surface (tiles or another solid prop). */
    const dropResting = (gone: SolidProp): void => {
        const top = gone.sprite.y - gone.sprite.height + gone.body[1];
        for (const p of solidProps) {
            if (p === gone || !p.sprite.active) continue;
            if (Math.abs(p.sprite.x - gone.sprite.x) > (gone.body[2] + p.body[2]) / 2 - 2) continue;
            if (Math.abs(p.sprite.y - top) > 2) continue;
            let target = ctx.physics.groundBelow(p.sprite.x, p.sprite.y + 1, 200) ?? gone.sprite.y;
            for (const q of solidProps) {
                if (q === p || q === gone || !q.sprite.active) continue;
                const qTop = q.sprite.y - q.sprite.height + q.body[1];
                if (Math.abs(q.sprite.x - p.sprite.x) < (q.body[2] + p.body[2]) / 2 && qTop >= p.sprite.y - 1 && qTop < target) target = qTop;
            }
            if (target <= p.sprite.y + 0.5) continue;
            ctx.scene.tweens.add({
                targets: p.sprite, y: target, duration: LEVEL.propFallMs, ease: 'Quad.easeIn',
                onUpdate: () => moveZone(p), onComplete: () => { moveZone(p); ctx.events.emit('fx:emit', { effect: 'dust_land', x: p.sprite.x, y: target, scale: 0.6 }); }
            });
        }
    };

    const destructible = (kind: string) => (c: GameContext, x: number, y: number, props: Record<string, unknown>): Sprite => {
        const def = LEVEL.destructibles[kind];
        const s = makeSprite(c, kind, x, y, props);
        if (str(props.layer) === '') s.setDepth(DEPTH.PROPS);
        playIf(s, `prop_${kind}_idle`, true);
        let hp = def.hp;
        let flash = 0;
        const [bx, by, bw, bh] = def.body;
        const rect = new Phaser.Geom.Rectangle();
        const zone = c.scene.add.zone(0, 0, bw, bh);
        const solid: SolidProp = { sprite: s, zone, body: def.body };
        if (def.solid) { rt.solids.add(zone); solidProps.push(solid); }
        moveZone(solid);

        const hb: Hurtbox = {
            team: 'neutral',
            body: () => rect.setTo(s.x - s.width / 2 + bx, s.y - s.height + by, bw, bh),
            material: def.material,
            kind,
            owner: s,
            alive: () => hp > 0 && s.active,
            hit: (info: HitInfo) => {
                if (hp <= 0) return false;
                hp -= info.damage;
                if (hp <= 0) { breakProp(info.kind); return; }
                const stage = def.damagedAt.filter(t => hp <= t).length;
                if (stage > 0) playIf(s, def.damagedAt.length > 1 ? `prop_${kind}_damaged${stage}` : `prop_${kind}_damaged`, true);
                s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
                flash = 50;
            }
        };
        const unregister = c.damage.register(hb);
        const offUpdate = c.onUpdate(dt => {
            if (flash > 0 && (flash -= dt) <= 0) s.clearTint();
        });

        const breakProp = (cause: HitInfo['kind']): void => {
            const cx = s.x, cy = s.y - s.height / 2, feet = s.y;
            unregister();
            offUpdate();
            const i = solidProps.indexOf(solid);
            if (i >= 0) solidProps.splice(i, 1);
            zone.destroy();
            dropResting(solid);
            c.events.emit('fx:emit', { effect: 'debris', x: cx, y: cy, material: def.debris, count: kind === 'explosive_barrel' ? 4 : 7 });
            if (def.sfx) c.audio.sfx(def.sfx, { x: cx });
            const contains = str(props.contains);
            if (contains) c.spawn('pickup', contains, { kind: contains, from: kind }, x, feet);
            s.destroy();
            if (kind === 'explosive_barrel') {
                const boom = (): void => {
                    const E = LEVEL.explosiveBarrel;
                    c.fx.explosion(cx, cy, 'm', 'neutral');
                    c.damage.applyRadial(cx, cy, E.radius, E.damage, 'neutral', 'explosion', 'explosive_barrel');
                };
                if (cause === 'explosion') c.scene.time.delayedCall(LEVEL.explosiveBarrel.chainDelayMs, boom);
                else boom();
            }
        };
        s.once(Phaser.GameObjects.Events.DESTROY, () => { unregister(); offUpdate(); if (zone.active) zone.destroy(); });
        return s;
    };

    for (const kind of Object.keys(LEVEL.destructibles)) ctx.registry.register(`prop:${kind}`, destructible(kind));

    // ---------------------------------------------------------------- decor + ambient behaviours

    const decor = (c: GameContext, x: number, y: number, props: Record<string, unknown>): Sprite => {
        const kind = str(props.kind);
        const s = makeSprite(c, kind, x, y, props);
        const variant = str(props.variant);
        if (!(variant && playIf(s, `prop_${kind}_${variant}`, true))) {
            for (const tag of ['idle', 'wave', 'closed', 'off']) if (playIf(s, `prop_${kind}_${tag}`, true)) break;
        }
        if (!c.scene.textures.exists(`prop_${kind}`)) console.warn(`[level] prop texture 'prop_${kind}' missing`);
        return s;
    };
    ctx.registry.register('prop:*', decor);
    ctx.registry.register('prop', decor);

    ctx.registry.register('prop:searchlight', (c, x, y, props) => {
        const s = decor(c, x, y, props);
        const S = LEVEL.searchlight;
        const dir = str(props.facing) === 'right' ? 1 : -1;
        s.setFlipX(dir < 0);
        if (!bool(props.sweep) || !c.scene.textures.exists('prop_searchlight_beam')) return s;
        const beam = c.scene.add.sprite(x + S.lens[0] * dir, y + S.lens[1], 'prop_searchlight_beam')
            .setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(S.alpha).setDepth(DEPTH.TILES_BACK + 3);
        playIf(beam, 'prop_searchlight_beam_idle', true);
        const center = dir < 0 ? S.centerDeg : 180 - S.centerDeg;
        const phase = x * 0.01;
        const off = c.onUpdate(() => {
            beam.setAngle(center + S.sweepDeg * Math.sin(phase + (c.time.now / S.periodMs) * Math.PI * 2));
        });
        s.once(Phaser.GameObjects.Events.DESTROY, () => { off(); beam.destroy(); });
        return s;
    });

    ctx.registry.register('prop:alarm_light', (c, x, y, props) => {
        const s = makeSprite(c, 'alarm_light', x, y, props);
        const always = bool(props.on);
        let locked = false;
        const refresh = (): void => { playIf(s, (always || locked) ? 'prop_alarm_light_on' : 'prop_alarm_light_off', true); };
        const lock = str(props.lock);
        if (lock) {
            rt.hooks.onLock(lock, () => { locked = true; refresh(); });
            rt.hooks.onUnlock(lock, () => { locked = false; refresh(); });
        }
        refresh();
        return s;
    });

    ctx.registry.register('prop:bunker_door', (c, x, y, props) => {
        const s = makeSprite(c, 'bunker_door', x, y, props);
        playIf(s, 'prop_bunker_door_closed', true);
        let opened = false;
        const door = {
            x, y,
            open: () => { if (opened) return; opened = true; playIf(s, 'prop_bunker_door_open', false); c.audio.sfx('door_open', { x }); }
        };
        rt.doors.push(door);
        const kind = str(props.spawns);
        if (kind) {
            let left = num(props.count, LEVEL.door.defaultCount);
            const interval = num(props.interval, LEVEL.door.defaultIntervalMs);
            let timer: number = LEVEL.door.firstDelayMs;
            const off = c.onUpdate(dt => {
                if (left <= 0 || !dt) return;
                const v = c.camera.view();
                if (x < v.left + 8 || x > v.right - 8) return;
                if ((timer -= dt) > 0) return;
                timer = interval;
                left--;
                door.open();
                const p = c.player();
                c.scene.time.delayedCall(LEVEL.arena.doorDelayMs, () => {
                    c.spawn('enemy', kind, { kind, from: 'door', facing: p && p.x > x ? 'right' : 'left', patrol: 24 }, x, y);
                });
            });
            s.once(Phaser.GameObjects.Events.DESTROY, off);
        }
        return s;
    });

    ctx.registry.register('prop:gate', (c, x, y, props) => {
        const s = makeSprite(c, 'gate', x, y, props);
        playIf(s, 'prop_gate_closed', true);
        // Solid while closed: the door opening (manifest body 12,16,72,80 of 96×96).
        const zone = c.scene.add.zone(x - 48 + 12 + 36, y - 96 + 16 + 40, 72, 80);
        rt.solids.add(zone);
        const gate = {
            x, y, smashed: false,
            rumble: () => {
                if (gate.smashed) return;
                playIf(s, 'prop_gate_shake', true);
                c.fx.shake(1);
                c.audio.sfx('boss_stomp', { x });
            },
            smash: () => {
                if (gate.smashed) return;
                gate.smashed = true;
                playIf(s, 'prop_gate_smashed', false);
                if (zone.active) zone.destroy();
                const cy = y - 44;
                c.fx.explosion(x, cy, LEVEL.boss.smashExplosion, 'neutral');
                c.events.emit('fx:emit', { effect: 'debris', x, y: cy, material: 'metal', count: 14 });
                c.events.emit('fx:emit', { effect: 'debris', x, y: cy + 16, material: 'wood', count: 10 });
                c.fx.shake(3);
                c.audio.sfx('gate_smash', { x });
            }
        };
        rt.gate = gate;
        s.once(Phaser.GameObjects.Events.DESTROY, () => { if (zone.active) zone.destroy(); if (rt.gate === gate) rt.gate = null; });
        return s;
    });
}
