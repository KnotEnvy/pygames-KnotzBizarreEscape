// Dev sandbox actors: dummy targets (hurtboxes with hit-flash), an enemy turret that shoots at the player
// with the shared ProjectileSystem, and an arena trigger that locks the camera until its wave is cleared.
import Phaser from 'phaser';
import type { GameContext, Hurtbox } from '../contracts';
import { DEPTH } from '../depth';
import { TEX } from '../textures';

/** 'dev:target': a 16×24 regime dummy. props: hp (5), respawn (true), score (100), onKilled (fn). */
export function spawnDevTarget(ctx: GameContext, x: number, y: number, props: Record<string, unknown>): Phaser.GameObjects.Image {
    const scene = ctx.scene;
    const img = scene.add.image(x, y, TEX.devTarget).setOrigin(0.5, 1).setDepth(DEPTH.ENEMIES);
    img.setName('dev-target');
    const maxHp = (props.hp as number | undefined) ?? 5;
    let hp = maxHp;
    let alive = true;
    const rect = new Phaser.Geom.Rectangle(x - 8, y - 24, 16, 24);
    const h: Hurtbox = {
        team: 'enemy',
        body: rect,
        kind: 'dummy',
        owner: img,
        material: 'flesh',
        alive: () => alive,
        hit(info) {
            hp -= info.damage;
            img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
            scene.time.delayedCall(50, () => img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
            img.x = x + Math.sign(info.dirX) * 1;
            scene.time.delayedCall(60, () => { img.x = x; });
            if (hp > 0) return;
            alive = false;
            ctx.events.emit('enemy:killed', { x, y: y - 12, kind: 'dummy', score: (props.score as number | undefined) ?? 100, cause: info.kind });
            ctx.events.emit('ui:popup', { x, y: y - 28, text: '+100' });
            ctx.fx.explosion(x, y - 12, 's', 'enemy');
            ctx.fx.hitstop(60);
            ctx.fx.shake(1);
            img.setVisible(false);
            (props.onKilled as (() => void) | undefined)?.();
            if (props.respawn !== false) {
                scene.time.delayedCall(2500, () => { hp = maxHp; alive = true; img.setVisible(true); });
            }
        }
    };
    const off = ctx.damage.register(h);
    img.once(Phaser.GameObjects.Events.DESTROY, off);
    return img;
}

/** 'dev:turret': stationary enemy that fires slow bright shots at the player every `rate` ms when on screen. */
export function spawnDevTurret(ctx: GameContext, x: number, y: number, props: Record<string, unknown>): Phaser.GameObjects.Image {
    const scene = ctx.scene;
    const img = spawnDevTarget(ctx, x, y, { ...props, respawn: false, hp: props.hp ?? 8 });
    img.setTint(0x9a93a8);
    const rate = (props.rate as number | undefined) ?? 1400;
    let t = rate * 0.5;
    const off = ctx.onUpdate(dt => {
        if (!img.visible) return;
        const p = ctx.player();
        const view = ctx.camera.view();
        if (!p || !p.alive() || x < view.x || x > view.right) return;
        t -= dt;
        if (t > 0) return;
        t = rate;
        const sx = x, sy = y - 18;
        const a = Math.atan2(p.centerY - sy, p.x - sx);
        ctx.projectiles.spawn({ x: sx, y: sy, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, team: 'enemy', damage: 1, lifetime: 4000, radius: 3, rotate: false });
    });
    img.once(Phaser.GameObjects.Events.DESTROY, off);
    void scene;
    return img;
}

/** 'dev:arena': when the player passes x, lock the camera to [x0, x1], spawn a small wave, unlock when cleared. */
export function spawnDevArena(ctx: GameContext, x: number, y: number, props: Record<string, unknown>): void {
    const x0 = props.x0 as number, x1 = props.x1 as number;
    let state: 'idle' | 'locked' | 'done' = 'idle';
    let remaining = 0;
    const level = ctx.level;
    const off = ctx.onUpdate(() => {
        if (ctx.level !== level) { off(); return; } // sandbox replaced by a real level
        const p = ctx.player();
        if (state !== 'idle' || !p || p.x < x) return;
        state = 'locked';
        ctx.camera.lock(x0, x1);
        ctx.events.emit('ui:prompt', { text: 'ARENA LOCK: clear the wave!', ms: 1500 });
        const kills = (): void => {
            remaining--;
            if (remaining > 0) return;
            state = 'done';
            ctx.camera.unlock();
            off();
        };
        const spots = [x0 + 260, x0 + 320, x0 + 350];
        remaining = spots.length;
        ctx.spawn('dev', 'turret', { onKilled: kills }, spots[0], y);
        ctx.spawn('dev', 'target', { onKilled: kills, respawn: false }, spots[1], y);
        ctx.spawn('dev', 'target', { onKilled: kills, respawn: false, hp: 8 }, spots[2], y);
    });
}
