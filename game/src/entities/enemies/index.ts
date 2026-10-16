import type { RegisterContext, HitInfo } from '../../core/contracts';
import { ENEMIES, type EnemyKind } from '../../config/tuning/enemies';
import { Enemy } from './Enemy';
import { registerEnemyAnimations } from './animations';
import { Moosezilla } from '../bosses/Moosezilla';

export function registerEnemies(ctx: RegisterContext): void {
    registerEnemyAnimations(ctx);
    const enemies = new Set<Enemy>();
    let boss: Moosezilla | null = null;
    const kinds: EnemyKind[] = ['grunt', 'grenadier', 'shield', 'turret', 'drone', 'paratrooper'];
    for (const kind of kinds) ctx.registry.register(`enemy:${kind}`, (c, x, y, props) => {
        if (enemies.size >= ENEMIES.maxEnemies) return;
        const e = new Enemy(c, kind, x, y, props); enemies.add(e); e.once('destroy', () => enemies.delete(e)); return e;
    });
    ctx.registry.register('boss:moosezilla', (c, x, y, props) => {
        if (boss?.active) return boss;
        boss = new Moosezilla(c, x, y, props); return boss;
    });
    ctx.debug.register('enemyAI', () => [...enemies].map(e => e.snapshot()));
    ctx.debug.register('bossPhase', () => boss?.active ? boss.phase : null);
    ctx.debug.register('boss', () => boss?.active ? boss.snapshot() : null);
    // Opt-in sandbox fixture. Delayed until level and player registration have completed.
    const test = new URLSearchParams(location.search).get('enemytest');
    if (test && (test === 'boss' || kinds.includes(test as EnemyKind))) {
        let spawned = false;
        const off = ctx.onUpdate(() => {
            const p = ctx.player(); if (spawned || !ctx.hasLevel() || !p) return;
            spawned = true;
            const x = p.x + (test === 'boss' ? 210 : 110);
            const ground = ctx.physics.groundBelow(x, p.y - 20, 300) ?? p.y;
            ctx.spawn(test === 'boss' ? 'boss' : 'enemy', test === 'boss' ? 'moosezilla' : test, { facing: -1, patrol: 36 }, x, test === 'drone' ? ground - 75 : test === 'paratrooper' ? ground - 100 : ground);
        });
        ctx.scene.events.once('shutdown', off);
        const observed = { kills: 0, score: 0, phases: [] as number[], defeated: 0 };
        const offs = [ctx.events.on('enemy:killed', e => { observed.kills++; observed.score += e.score; }), ctx.events.on('boss:phase', e => observed.phases.push(e.phase)), ctx.events.on('boss:defeated', () => observed.defeated++)];
        ctx.scene.events.once('shutdown', () => offs.forEach(off => off()));
        ctx.debug.register('enemyTest', () => ({ kind: test, ready: spawned, ...observed }));
        const api = { bossHp: (hp: number) => Number.isFinite(hp) && boss?.setHp(hp), hit: (kind: string, damage = 1, cause: 'bullet' | 'explosion' | 'flame' = 'bullet', side = -1) => {
            const e = [...enemies].find(e => e.kind === kind && e.hp > 0); if (e) ctx.damage.applyRadial(e.x + side * 4, e.y - (kind === 'drone' ? 0 : 20), 10, damage, 'player', cause);
        }, hitAt: (x: number, y: number, damage = 1, kind: HitInfo['kind'] = 'bullet', dirX = 1, dirY = 0, weapon = 'pistol') => {
            const box = ctx.damage.queryPoint(x, y, 'player');
            return box ? ctx.damage.deal(box, { x, y, damage, kind, dirX, dirY, weapon, source: 'player' }) : false;
        }, spawn: (kind: string, x: number, y: number, props: Record<string, unknown> = {}) => ctx.spawn('enemy', kind, props, x, y) };
        Object.assign(window, { __KBE_ENEMYTEST: api });
        ctx.scene.events.once('shutdown', () => { delete (window as unknown as Record<string, unknown>).__KBE_ENEMYTEST; });
    }
}
