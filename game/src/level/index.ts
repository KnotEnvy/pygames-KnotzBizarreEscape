// Levels and content: Mission 1 "Pine Ridge Breakout".
// registerLevel builds the tilemap + parallax, publishes the LevelQuery (the engine sandbox then steps aside),
// registers the prop factories, spawns the player and every prop, and runs the proximity spawner, arenas and
// triggers each frame. See docs/teams/level.md.
import Phaser from 'phaser';
import type { RegisterContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import { ArenaController, ArenaHookSet } from './arenas';
import { buildMap, parseSections } from './map';
import { createParallax } from './parallax';
import { registerProps } from './props';
import { ProximitySpawner, kindOf, spawnObject } from './spawner';
import { TriggerSystem } from './triggers';
import { str, type LevelRuntime } from './types';

export function registerLevel(ctx: RegisterContext): void {
    const scene = ctx.scene;
    if (!scene.cache.tilemap.exists(LEVEL.map.key)) {
        console.warn(`[level] '${LEVEL.map.key}' not loaded: leaving the dev sandbox in place`);
        return;
    }

    const hooks = new ArenaHookSet();
    const rt: LevelRuntime = { doors: [], gate: null, solids: scene.physics.add.staticGroup(), hooks };
    // The static group goes in as a collider (Arcade colliders accept groups; the contract types it as GameObject).
    const built = buildMap(scene, [rt.solids as unknown as Phaser.GameObjects.GameObject]);
    scene.cameras.main.setBackgroundColor(LEVEL.map.sky);
    createParallax(ctx);
    ctx.setLevel(built.query);

    registerProps(ctx, rt);

    // Player first (the engine's ?x= warp runs a frame later), then every prop (cheap, static, eager).
    const start = built.spawns.find(o => o.type === 'player_start');
    if (start) ctx.spawn('player_start', '', { ...start.props }, start.x, start.y);
    for (const o of built.spawns) if (o.type === 'prop') spawnObject(ctx, o);

    // Arena members (lock + wave) and the boss belong to the arena controller; the rest spawn by proximity.
    const lockIds = new Set(built.triggers.filter(t => t.type === 'camera_lock').map(t => str(t.props.id)));
    const owned = built.spawns.filter(o => o.type !== 'prop' && o.type !== 'player_start' && (o.type === 'boss' || lockIds.has(str(o.props.lock))));
    const proximity = built.spawns.filter(o => o.type !== 'prop' && o.type !== 'player_start' && !owned.includes(o));

    const spawner = new ProximitySpawner(ctx, proximity);
    const arenas = new ArenaController(ctx, rt, hooks, built.triggers, owned);
    const triggers = new TriggerSystem(ctx, built.triggers);
    triggers.publishZones();

    ctx.onUpdate(dt => {
        spawner.update();
        arenas.update(dt);
        triggers.update(dt);
    });

    // ---------------------------------------------------------------- debug / QA
    const sections = parseSections(built.props.sections, built.map.tileWidth);
    const sectionAt = (x: number): string => {
        for (const s of sections) if (x >= s.x0 && x < s.x1) return s.name;
        return sections.length ? sections[sections.length - 1].name : '';
    };
    const focusX = (): number => ctx.player()?.x ?? ctx.camera.view().centerX;
    ctx.debug.register('section', () => sectionAt(focusX()));
    ctx.debug.register('arena', () => arenas.debug());
    ctx.debug.register('level', () => ({
        name: built.query.name, section: sectionAt(focusX()), checkpoint: triggers.lastCheckpoint,
        pending: spawner.pending, spawned: spawner.spawned, skipped: spawner.skipped,
        gate: rt.gate ? (rt.gate.smashed ? 'smashed' : 'closed') : null,
        kinds: [...new Set(built.spawns.map(o => `${o.type}:${kindOf(o)}`))].length
    }));

    // Warp cheat (and ?x=): land on the standable, hazard-free surface nearest the player's current height, nudging
    // sideways off walls. The engine default takes the first surface from the top, which can be a tree branch or the
    // top of the end pillar (camera rides high, the boss's feet go off-view and it never starts).
    const warpTo = (x: number): void => {
        const b = built.bounds;
        const p = ctx.player();
        const refY = p ? p.y : b.bottom;
        let best: { x: number; y: number; cost: number } | null = null;
        for (let d = 0; d <= LEVEL.warp.searchPx; d += 8) {
            for (const wx of d ? [x - d, x + d] : [x]) {
                if (wx < b.x + 8 || wx > b.right - 8) continue;
                for (let y = b.y, g = ctx.physics.groundBelow(wx, y, b.bottom - y); g !== null; g = ctx.physics.groundBelow(wx, y, b.bottom - y)) {
                    y = g + built.map.tileHeight;
                    if (ctx.physics.hazardAt(wx, g - 4) || ctx.physics.solidAt(wx, g - LEVEL.warp.headroom)) continue;
                    const cost = Math.abs(g - refY) + d * LEVEL.warp.sideCost;
                    if (!best || cost < best.cost) best = { x: wx, y: g, cost };
                }
            }
            if (best && best.cost <= d * LEVEL.warp.sideCost) break;
        }
        const to = best ?? { x, y: refY };
        ctx.camera.unlock();
        ctx.camera.snapTo(to.x, to.y - 18);
        if (!p) return;
        if (p.teleport) { p.teleport(to.x, to.y); return; }
        const s = p.sprite as Phaser.GameObjects.Sprite;
        const body = s.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.reset(to.x, to.y); else s.setPosition(to.x, to.y);
    };
    ctx.debug.cheat('warp', (x: number) => warpTo(Number(x)));

    // Boss cheat: warp to the boss checkpoint, just before the arena (walk right to start the fight).
    ctx.debug.cheat('boss', () => {
        warpTo(triggers.checkpointX('cp_boss') ?? (arenas.find('boss')?.x0 ?? built.bounds.right - 480) - 32);
    });

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { rt.doors.length = 0; rt.gate = null; });
}
