import { DEPTH, type GameContext, type RegisterContext } from '../../core';
import { PLAYER as T, isWeapon } from '../../config/tuning/player';

export function spawnPickup(ctx: GameContext, x: number, y: number, kind: string, props: Record<string, unknown> = {}) {
    const subtype = String(props.subtype ?? props.item ?? 'medal');
    const pointKind = kind === 'points' ? subtype : kind.replace('points_', '');
    const letters: Record<string, string> = { hmg: 'h', shotgun: 'shotgun', spread: 's', rocket: 'r', flame: 'f', laser: 'l', bombs: 'b', life: 'life' };
    const texture = `pickup_${letters[kind] ?? (pointKind in T.points ? pointKind : 'medal')}`;
    const spr = ctx.scene.add.sprite(x, y, texture).setOrigin(0.5, 1).setDepth(DEPTH.POW + 1);
    spr.play(`${texture}_shine`);
    let age = 0, collected = false;
    const off = ctx.onUpdate(dt => {
        if (!spr.active || dt <= 0) return;
        if (!collected && Math.abs(x - ctx.camera.view().centerX) > 320) return;
        age += dt;
        if (collected) { spr.y -= dt * 0.04; spr.setAlpha(Math.max(0, 1 - age / 220)).setScale(1 + age / 450); if (age >= 220) spr.destroy(); return; }
        spr.y = y - 2 - Math.sin(age / 180) * 2;
        const p = ctx.player();
        if (!p?.alive() || Math.abs(p.x - x) > 15 || Math.abs(p.centerY - (spr.y - 8)) > 23 || age < 180) return;
        collected = true; age = 0;
        if (isWeapon(kind)) { ctx.state.setWeapon(kind, T.ammo[kind]); ctx.audio.sfx('weapon_get'); }
        else if (kind === 'bombs') ctx.state.bombs = Math.min(30, ctx.state.bombs + 10);
        else if (kind === 'life') ctx.state.lives++;
        else {
            const value = Number(props.points ?? T.points[pointKind as keyof typeof T.points] ?? 1000);
            ctx.state.score += value; ctx.fx.popup(x, spr.y - 10, `+${value}`);
        }
        ctx.audio.sfx('pickup', { x });
        ctx.events.emit('pickup:collected', { kind, x, y: spr.y });
    });
    spr.once('destroy', off);
    return spr;
}
export function registerPickups(ctx: RegisterContext): void {
    const kinds = ['hmg', 'shotgun', 'spread', 'rocket', 'flame', 'laser', 'bombs', 'points', 'life', 'fish', 'chicken', 'medal', 'ration', 'points_fish', 'points_chicken', 'points_medal', 'points_ration'];
    for (const kind of kinds) ctx.registry.register(`pickup:${kind}`, (g, x, y, props) => spawnPickup(g, x, y, kind, props));
    ctx.registry.register('pickup', (g, x, y, props) => spawnPickup(g, x, y, String(props.kind ?? 'points'), props));
}
