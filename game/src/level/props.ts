// Prop factories (`prop:<kind>`): destructibles (crates, barrels, explosive barrels, sandbags) with neutral
// hurtboxes and solid static bodies, plus decor and the ambient behaviours (searchlight sweep, alarm lights,
// bunker doors with trickle spawns, the boss gate). Every prop sprite is anchored bottom-centre at (x, feet).
import Phaser from 'phaser';
import { DEPTH, hasAnim, type GameContext, type HitInfo, type Hurtbox, type RegisterContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import { DECOR_BACK_DEPTH } from './map';
import { bool, num, str, type LevelRuntime } from './types';

type Sprite = Phaser.GameObjects.Sprite;

/** Play an animation if it exists with frames (missing art never crashes the level). Preload builds every prop tag. */
export function playIf(s: Sprite, key: string, loop: boolean): boolean {
    if (!s.scene || !hasAnim(s.scene, key)) return false;
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
interface SolidProp { sprite: Sprite; zone: Phaser.GameObjects.Zone; body: [number, number, number, number]; fall?: Phaser.Tweens.Tween }

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
            p.fall?.stop();
            // Tweens don't watch their targets: breakProp stops this one, and the callbacks also bail on a dead prop.
            p.fall = ctx.scene.tweens.add({
                targets: p.sprite, y: target, duration: LEVEL.propFallMs, ease: 'Quad.easeIn',
                onUpdate: () => { if (p.sprite.active) moveZone(p); },
                onComplete: () => {
                    p.fall = undefined;
                    if (!p.sprite.active) return;
                    moveZone(p);
                    ctx.events.emit('fx:emit', { effect: 'dust_land', x: p.sprite.x, y: target, scale: 0.6 });
                }
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
            solid.fall?.stop();
            solid.fall = undefined;
            const i = solidProps.indexOf(solid);
            if (i >= 0) solidProps.splice(i, 1);
            zone.destroy();
            dropResting(solid);
            c.events.emit('fx:emit', { effect: 'debris', x: cx, y: cy, material: def.debris, count: kind === 'explosive_barrel' || kind === 'fuel_drum' ? 4 : 7 });
            if (def.sfx) c.audio.sfx(def.sfx, { x: cx });
            const contains = str(props.contains);
            if (contains) c.spawn('pickup', contains, { kind: contains, from: kind }, x, feet);
            s.destroy();
            if (kind === 'explosive_barrel' || kind === 'fuel_drum') {
                const boom = (): void => {
                    const E = LEVEL.explosiveBarrel;
                    c.fx.explosion(cx, cy, 'm', 'neutral');
                    c.damage.applyRadial(cx, cy, E.radius, E.damage, 'neutral', 'explosion', 'explosive_barrel');
                };
                if (cause === 'explosion') c.scene.time.delayedCall(LEVEL.explosiveBarrel.chainDelayMs, boom);
                else boom();
            }
        };
        s.once(Phaser.GameObjects.Events.DESTROY, () => { unregister(); offUpdate(); solid.fall?.stop(); if (zone.active) zone.destroy(); });
        return s;
    };

    for (const kind of Object.keys(LEVEL.destructibles)) ctx.registry.register(`prop:${kind}`, destructible(kind));

    // ---------------------------------------------------------------- decor + ambient behaviours

    const decor = (c: GameContext, x: number, y: number, props: Record<string, unknown>): Sprite => {
        const kind = str(props.kind);
        const s = makeSprite(c, kind, x, y, props);
        const variant = str(props.variant);
        if (!(variant && playIf(s, `prop_${kind}_${variant}`, true))) {
            for (const tag of ['idle', 'spin', 'wave', 'closed', 'off']) if (playIf(s, `prop_${kind}_${tag}`, true)) break;
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

    // Doors enemies walk out of (`from=door` wave members, `spawns/count/interval` trickles): bunker doors (Part I) and
    // sliding boxcar doors (Part II).
    const door = (kind: string) => (c: GameContext, x: number, y: number, props: Record<string, unknown>): Sprite => {
        const s = makeSprite(c, kind, x, y, props);
        playIf(s, `prop_${kind}_closed`, true);
        let opened = false;
        const handle = {
            x, y,
            open: () => { if (opened) return; opened = true; playIf(s, `prop_${kind}_open`, false); c.audio.sfx('door_open', { x }); }
        };
        rt.doors.push(handle);
        const trickle = str(props.spawns);
        if (trickle) {
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
                handle.open();
                const p = c.player();
                c.scene.time.delayedCall(LEVEL.arena.doorDelayMs, () => {
                    c.spawn('enemy', trickle, { kind: trickle, from: 'door', facing: p && p.x > x ? 'right' : 'left', patrol: 24 }, x, y);
                });
            });
            s.once(Phaser.GameObjects.Events.DESTROY, off);
        }
        return s;
    };
    ctx.registry.register('prop:bunker_door', door('bunker_door'));
    ctx.registry.register('prop:boxcar_door', door('boxcar_door'));
    // Mission 2: stilt-shack doors (2-1) and shipping-container doors (2-2).
    ctx.registry.register('prop:shack_door', door('shack_door'));
    ctx.registry.register('prop:container_door', door('container_door'));

    // Set-piece wheels (the BAYOU QUEEN's sternwheel, the Drowned Mill's waterwheel): spin, and while on screen throw
    // spray (FX) and churn/creak (one-shot sounds repeated, panned; the audio service has no loops).
    const wheel = (sfx: string, everyMs: number, sprayY: number) => (c: GameContext, x: number, y: number, props: Record<string, unknown>): Sprite => {
        const s = decor(c, x, y, props);
        let t = 0, side = 1;
        const off = c.onUpdate(dt => {
            if (!dt) return;
            const v = c.camera.view();
            if (x < v.left - 64 || x > v.right + 64) return;
            if ((t -= dt) > 0) return;
            t = everyMs;
            c.audio.sfx(sfx, { x, volume: 0.8 });
            c.events.emit('fx:emit', { effect: 'paddle_spray', x, y: y - sprayY, width: s.width * 0.8, duration: everyMs });
            side = -side;
            c.events.emit('water:splash', { x: x + side * s.width * 0.3, y: y - sprayY, size: 's', kind: 'surface' });
        });
        s.once(Phaser.GameObjects.Events.DESTROY, off);
        return s;
    };
    ctx.registry.register('prop:paddlewheel', wheel('paddlewheel', 900, 14));
    ctx.registry.register('prop:waterwheel', wheel('mill_wheel', 1600, 10));

    // Props anchored at their top (a crane hook hangs from the boom tip).
    ctx.registry.register('prop:crane_hook', (c, x, y, props) => decor(c, x, y, props).setOrigin(0.5, 0));

    // Gates: Mission 1's steel gate and the Drowned Mill's chained doors (`mill_gate`). Bodies from LEVEL.gates.
    const gateFactory = (kind: string) => (c: GameContext, x: number, y: number, props: Record<string, unknown>): Sprite => {
        const s = makeSprite(c, kind, x, y, props);
        playIf(s, `prop_${kind}_closed`, true);
        const G = LEVEL.gates[kind] ?? LEVEL.gates.gate;
        const [bx, by, bw, bh] = G.body;
        // Solid while closed: the door opening (body in canvas px, canvas anchored bottom-centre).
        const zone = c.scene.add.zone(x - G.w / 2 + bx + bw / 2, y - G.h + by + bh / 2, bw, bh);
        rt.solids.add(zone);
        const gate = {
            x, y, lock: str(props.lock, 'boss'), smashed: false,
            rumble: () => {
                if (gate.smashed) return;
                playIf(s, `prop_${kind}_shake`, true);
                c.fx.shake(1);
                c.audio.sfx('boss_stomp', { x });
            },
            smash: () => {
                if (gate.smashed) return;
                gate.smashed = true;
                playIf(s, `prop_${kind}_smashed`, false);
                if (zone.active) zone.destroy();
                const cy = y - G.h * 0.46;
                c.fx.explosion(x, cy, LEVEL.boss.smashExplosion, 'neutral');
                c.events.emit('fx:emit', { effect: 'debris', x, y: cy, material: 'metal', count: 14 });
                c.events.emit('fx:emit', { effect: 'debris', x, y: cy + 16, material: 'wood', count: 10 });
                c.fx.shake(3);
                c.audio.sfx('gate_smash', { x });
            }
        };
        rt.gates.set(gate.lock, gate);
        s.once(Phaser.GameObjects.Events.DESTROY, () => { if (zone.active) zone.destroy(); if (rt.gates.get(gate.lock) === gate) rt.gates.delete(gate.lock); });
        return s;
    };
    ctx.registry.register('prop:gate', gateFactory('gate'));
    ctx.registry.register('prop:mill_gate', gateFactory('mill_gate'));
}
