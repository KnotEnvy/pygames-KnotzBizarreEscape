// Placeholder player (box soldier). Used whenever the player team hasn't registered 'player_start'.
// Run, variable jump (coyote + buffer), drop-through, 8-way shooting via ProjectileSystem, grenades,
// one-hit death, respawn with blinking i-frames. Mirrors the real contract so it's a working reference.
import Phaser from 'phaser';
import type { GameContext, Hurtbox, PlayerQuery } from '../contracts';
import { DEPTH } from '../depth';
import { TEX } from '../textures';
import { ENGINE } from '../../config/tuning/engine';

const T = ENGINE.dev;

function setCollides(b: Phaser.Physics.Arcade.Body, on: boolean): void {
    b.checkCollision.up = b.checkCollision.down = b.checkCollision.left = b.checkCollision.right = on;
    b.checkCollision.none = !on;
}

export function spawnDevPlayer(ctx: GameContext, x: number, y: number): Phaser.Physics.Arcade.Sprite {
    const scene = ctx.scene;
    const spr = scene.physics.add.sprite(x, y, TEX.devPlayer).setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
    spr.setName('dev-player');
    const body = spr.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 26).setOffset(2, 2);
    body.setMaxVelocityY(520);
    ctx.physics.collideLevel(spr);

    let alive = true;
    let facing: 1 | -1 = 1;
    let coyote = 0;
    let buffer = 0;
    let cooldown = 0;
    let invuln = 0;
    let wasGround = false;

    const die = (): void => {
        if (!alive) return;
        alive = false;
        body.setVelocity(-facing * 60, -220);
        setCollides(body, false);
        spr.setTint(0xff6060);
        ctx.fx.shake(2);
        ctx.events.emit('player:died', { x: spr.x, y: spr.y });
    };

    const hurtbox: Hurtbox = {
        team: 'player',
        body,
        kind: 'dev-player',
        owner: spr,
        material: 'flesh',
        alive: () => alive,
        invulnerable: () => invuln > 0,
        hit: () => die()
    };
    const unregister = ctx.damage.register(hurtbox);

    const query: PlayerQuery = {
        get x() { return spr.x; },
        get y() { return spr.y; },
        get centerY() { return spr.y - 14; },
        get facing() { return facing; },
        sprite: spr,
        alive: () => alive,
        teleport(nx, ny) { body.reset(nx, ny); }
    };
    ctx.setPlayer(query);

    const offRespawn = ctx.events.on('game:respawn', e => {
        body.reset(e.x, e.y);
        setCollides(body, true);
        spr.clearTint().setVisible(true).setAlpha(1);
        alive = true;
        invuln = 2000;
        ctx.events.emit('player:respawn', { x: e.x, y: e.y });
    });

    const shoot = (): void => {
        const aim = ctx.input.aim();
        const onGround = body.blocked.down;
        let dx: number = facing, dy = 0;
        if (aim.y < 0) { dy = -1; dx = aim.x; }
        else if (aim.y > 0 && !onGround) { dy = 1; dx = aim.x; }
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        const mx = spr.x + dx * 10, my = spr.y - 14 + dy * 12;
        ctx.projectiles.spawn({
            x: mx, y: my, vx: dx * T.bulletSpeed, vy: dy * T.bulletSpeed, team: 'player', damage: 1,
            texture: 'pistol_bullet', weapon: ctx.state.weapon, lifetime: 1200
        });
        ctx.events.emit('player:shoot', { weapon: ctx.state.weapon, x: mx, y: my, angle: Math.atan2(dy, dx) });
        ctx.audio.sfx('sfx_pistol', { x: mx });
    };

    const grenade = (): void => {
        if (ctx.state.bombs <= 0) return;
        ctx.state.bombs -= 1;
        ctx.events.emit('player:grenade', { x: spr.x, y: spr.y - 20 });
        let bounces = 0;
        const blow = (gx: number, gy: number): void => {
            ctx.damage.applyRadial(gx, gy, 28, 10, 'player', 'explosion', 'grenade');
            ctx.fx.explosion(gx, gy, 'm', 'player');
            ctx.fx.shake(2);
        };
        ctx.projectiles.spawn({
            x: spr.x, y: spr.y - 20, vx: facing * 170, vy: -260, gravity: ENGINE.gravity, team: 'player', damage: 10,
            texture: 'grenade', weapon: 'grenade', lifetime: 3000, radius: 3, silent: true, kind: 'explosion',
            onImpact: (p, imp) => {
                if (imp.hurtbox || bounces >= 1) { blow(p.x, p.y); return false; }
                bounces++;
                if (imp.normalY !== 0) p.vy = -p.vy * 0.45; else p.vx = -p.vx * 0.5;
                p.vx *= 0.7;
                return true;
            },
            onExpire: p => blow(p.x, p.y)
        });
    };

    const offUpdate = ctx.onUpdate((dtMs) => {
        const input = ctx.input;
        if (input.justDown('jump')) buffer = T.bufferMs;
        if (dtMs <= 0) return;
        const dt = dtMs / 1000;
        if (invuln > 0) {
            invuln -= dtMs;
            spr.setAlpha(invuln > 0 && Math.floor(invuln / 80) % 2 === 0 ? 0.35 : 1);
        }
        if (!alive) {
            spr.angle += 360 * dt * -facing;
            return;
        }
        spr.angle = 0;
        const onGround = body.blocked.down;
        if (onGround && !wasGround) ctx.events.emit('player:land', { x: spr.x, y: spr.y, vy: body.velocity.y });
        wasGround = onGround;
        coyote = onGround ? T.coyoteMs : coyote - dtMs;
        buffer -= dtMs;

        // run
        const aim = input.aim();
        const lockAim = input.isDown('aimlock');
        const crouch = onGround && aim.y > 0;
        const dir = lockAim ? 0 : aim.x;
        if (aim.x !== 0) facing = aim.x as 1 | -1;
        const target = dir * (crouch ? 35 : T.runSpeed);
        const accel = (T.runSpeed / T.accelTime) * dt;
        const vx = body.velocity.x;
        body.setVelocityX(Math.abs(target - vx) <= accel ? target : vx + Math.sign(target - vx) * accel);
        spr.setFlipX(facing < 0);

        // jump / drop-through
        if (buffer > 0 && coyote > 0) {
            buffer = 0;
            coyote = 0;
            if (aim.y > 0 && ctx.physics.onOneWay(spr)) {
                ctx.physics.dropThrough(spr);
            } else {
                body.setVelocityY(-T.jumpVelocity);
                ctx.events.emit('player:jump', { x: spr.x, y: spr.y });
            }
        }
        if (input.justUp('jump') && body.velocity.y < 0) body.setVelocityY(body.velocity.y * T.jumpCutFactor);

        // shoot (tap fast, hold = slower auto-fire like Metal Slug)
        cooldown -= dtMs;
        if (input.justDown('shoot') && cooldown <= T.fireCooldownMs * 0.5) { shoot(); cooldown = T.fireCooldownMs; }
        else if (input.isDown('shoot') && cooldown <= 0) { shoot(); cooldown = 330; }
        if (input.justDown('grenade')) grenade();

        // Metal Slug lock-left / arena walls
        const cx = ctx.camera.clampX(spr.x, 6);
        if (cx !== spr.x) { spr.x = cx; body.x = cx - body.width / 2; body.setVelocityX(0); }

        // hazards and pits
        if (ctx.physics.hazardAt(spr.x, spr.y - 3)) die();
        else if (spr.y > ctx.level.bounds.bottom + 24) die();
    });

    ctx.events.emit('player:spawn', { x, y });
    spr.once(Phaser.GameObjects.Events.DESTROY, () => { unregister(); offRespawn(); offUpdate(); if (ctx.player() === query) ctx.setPlayer(null); });
    return spr;
}
