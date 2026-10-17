import Phaser from 'phaser';
import { DEPTH, type GameContext, type Hurtbox, type RegisterContext } from '../../core';
import { spawnPickup } from '../pickups';

function spawnPow(ctx: GameContext, x: number, y: number, item: string) {
    const spr = ctx.scene.physics.add.sprite(x, y, 'pow').setOrigin(0.5, 1).setDepth(DEPTH.POW);
    const body = spr.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 28).setOffset(9, 12);
    const offCollision = ctx.physics.collideLevel(spr);
    let given = false;
    let state: 'tied' | 'freed' | 'salute' | 'gift' | 'run' = 'tied', age = 0;
    spr.play('pow_tied_idle');
    const free = (): void => {
        if (state !== 'tied') return;
        state = 'freed'; age = 0; spr.play('pow_freed');
        ctx.events.emit('pow:freed', { x: spr.x, y: spr.y, item });
    };
    const hb: Hurtbox = { team: 'neutral', body, owner: spr, material: 'flesh', kind: 'pow', alive: () => state === 'tied',
        hit: info => { if (info.source !== 'player' || info.kind === 'explosion' || info.kind === 'flame') return false; free(); } };
    const offDamage = ctx.damage.register(hb);
    const off = ctx.onUpdate(dt => {
        if (dt <= 0) return;
        age += dt;
        if (state === 'tied') {
            const p = ctx.player();
            if (p?.alive() && Math.abs(p.x - spr.x) < 19 && Math.abs(p.y - spr.y) < 30) free();
        } else if (state === 'freed' && age >= 400) { state = 'salute'; age = 0; spr.play('pow_salute'); }
        else if (state === 'salute' && age >= 500) { state = 'gift'; age = 0; spr.play('pow_give_item'); }
        else if (state === 'gift') {
            if (!given && age >= 360) { given = true; spawnPickup(ctx, spr.x + 15, spr.y, item); }
            if (age >= 560) { state = 'run'; age = 0; spr.play('pow_run_away'); spr.setFlipX(true); body.setVelocityX(-80); }
        } else if (state === 'run' && (spr.x < ctx.camera.leftEdge() - 40 || age > 8000)) spr.destroy();
    });
    spr.once('destroy', () => { off(); offCollision(); offDamage(); });
    return spr;
}
export function registerPows(ctx: RegisterContext): void {
    ctx.registry.register('pow', (g, x, y, props) => spawnPow(g, x, y, String(props.item ?? 'hmg')));
    for (const item of ['hmg', 'spread', 'rocket', 'flame', 'laser', 'bombs', 'points', 'life', 'fish', 'chicken', 'medal', 'ration']) {
        ctx.registry.register(`pow:${item}`, (g, x, y) => spawnPow(g, x, y, item));
    }
}
