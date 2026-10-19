import type { RegisterContext, HitInfo } from '../../core/contracts';
import { ENEMIES, type EnemyKind } from '../../config/tuning/enemies';
import { Enemy } from './Enemy';
import { registerEnemyAnimations } from './animations';
import { MachineBoss } from '../bosses/MachineBoss';
import { AssaultEnemy } from './AssaultEnemy';
import { Moosezilla } from '../bosses/Moosezilla';

export function registerEnemies(ctx: RegisterContext): void {
    registerEnemyAnimations(ctx);
    const enemies = new Set<Enemy | AssaultEnemy>();
    let boss: Moosezilla | MachineBoss | null = null;
    // boss:intro arrives during the gate rumble, before the boss exists. Its authored
    // sprite intro begins on spawn; these socket puffs bridge the approach beat.
    let approach: { x: number; y: number; effect: string; left: number; puff: number } | null = null;
    const offIntro = ctx.events.on('boss:intro', e => {
        if (boss?.active) return;
        const name = e.name.toUpperCase();
        approach = { x: e.x, y: e.y, effect: name.includes('SNOWCAT') ? 'smoke_stack' : 'steam', left: 1600, puff: 0 };
        if (name.includes('SNOWCAT')) ctx.audio.sfx('snowcat_engine');
        else if (name === 'IRONHORN') ctx.audio.sfx('loco_steam');
    });
    const offApproach = ctx.onUpdate(dt => {
        if (!approach || !dt) return;
        if (boss?.active || (approach.left -= dt) <= 0) { approach = null; return; }
        approach.puff -= dt;
        if (approach.puff <= 0) {
            approach.puff = 360;
            ctx.events.emit('fx:emit', { effect: approach.effect, x: approach.x, y: approach.y, scale: .65, count: 1 });
        }
    });
    ctx.scene.events.once('shutdown', () => { offIntro(); offApproach(); approach = null; });
    const kinds: EnemyKind[] = ['grunt', 'grenadier', 'shield', 'turret', 'drone', 'paratrooper', 'leaper', 'hound', 'buzzard'];
    for (const kind of kinds) ctx.registry.register(`enemy:${kind}`, (c, x, y, props) => {
        if (enemies.size >= ENEMIES.maxEnemies) return;
        const e = kind === 'hound' || kind === 'buzzard' ? new AssaultEnemy(c, kind, x, y, props) : new Enemy(c, kind, x, y, props); enemies.add(e); e.once('destroy', () => enemies.delete(e)); return e;
    });
    ctx.registry.register('boss:moosezilla', (c, x, y, props) => {
        if (boss?.active) return boss;
        boss = new Moosezilla(c, x, y, props); return boss;
    });
    for (const kind of ['snowcat', 'ironhorn'] as const) ctx.registry.register(`boss:${kind}`, (c, x, y, props) => {
        if (boss?.active) return boss;
        boss = new MachineBoss(c, kind, x, y, props); return boss;
    });
    ctx.debug.register('enemyAI', () => [...enemies].map(e => e.snapshot()));
    ctx.debug.register('bossPhase', () => boss?.active ? boss.phase : null);
    ctx.debug.register('boss', () => boss?.active ? boss.snapshot() : null);
    // Opt-in sandbox fixture. Delayed until level and player registration have completed.
    const test = new URLSearchParams(location.search).get('enemytest');
    if (test && ctx.debug.cheatsEnabled && (test === 'boss' || test === 'snowcat' || test === 'ironhorn' || kinds.includes(test as EnemyKind))) {
        let spawned = false;
        const off = ctx.onUpdate(() => {
            const p = ctx.player(); if (spawned || !ctx.hasLevel() || !p) return;
            spawned = true;
            const isBoss = test === 'boss' || test === 'snowcat' || test === 'ironhorn';
            const x = p.x + (isBoss ? 210 : 110);
            const ground = ctx.physics.groundBelow(x, p.y - 20, 300) ?? p.y;
            ctx.spawn(isBoss ? 'boss' : 'enemy', test === 'boss' ? 'moosezilla' : test, { facing: -1, patrol: 36 }, x, test === 'buzzard' ? ground - 95 : test === 'drone' ? ground - 75 : test === 'paratrooper' ? ground - 100 : ground);
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
