// Levels and content: Mission 1 "Pine Ridge Breakout" (m1p1 THE CAMP, m1p2 TIMBER EXPRESS, m1p3 MOOSE LAKE) and Mission 2
// "Bayou Blackout" (m2p1 CYPRESS DEEP, m2p2 RIVER RUN, m2p3 GATOR'S DEN: wading water, sinking logs, swamp-gas vents, low
// branches, fog banks, the den channel).
// registerLevel loads the part's map (ctx.part.map), builds the tilemap + parallax (set and train drift from the map's
// `parallax` / `drift` properties), publishes the LevelQuery (the engine sandbox then steps aside), registers the
// prop factories, spawns the player and every prop, and runs the proximity spawner, arenas, triggers, the train
// (low bridges, tunnels) and the cracking ice each frame. See docs/teams/level.md.
import Phaser from 'phaser';
import type { RegisterContext } from '../core';
import { LEVEL } from '../config/tuning/level';
import { ArenaController, ArenaHookSet } from './arenas';
import { BackgroundDirector } from './background';
import { IceSystem } from './ice';
import { buildMap, parseSections } from './map';
import { createParallax } from './parallax';
import { registerProps } from './props';
import { ProximitySpawner, kindOf, spawnObject } from './spawner';
import { TrainSystem } from './train';
import { TriggerSystem } from './triggers';
import { VentSystem } from './vents';
import { WaterSystem } from './water';
import { num, str, type LevelRuntime } from './types';

export function registerLevel(ctx: RegisterContext): void {
    const scene = ctx.scene;
    // Phase E: the campaign part names its map. Read defensively in case the context predates ctx.part.
    const part = (ctx as { part?: { map: string; mission?: number } }).part;
    let key = part?.map ?? LEVEL.map.key;
    if (!scene.cache.tilemap.exists(key)) {
        console.warn(`[level] map '${key}' not loaded: falling back to '${LEVEL.map.key}'`);
        key = LEVEL.map.key;
    }
    if (!scene.cache.tilemap.exists(key)) {
        console.warn(`[level] '${key}' not loaded: leaving the dev sandbox in place`);
        return;
    }

    const hooks = new ArenaHookSet();
    const rt: LevelRuntime = { doors: [], gates: new Map(), solids: scene.physics.add.staticGroup(), hooks };
    // The static group goes in as a collider (Arcade colliders accept groups; the contract types it as GameObject).
    const built = buildMap(scene, key, [rt.solids as unknown as Phaser.GameObjects.GameObject], part?.mission ?? LEVEL.map.stage);
    scene.cameras.main.setBackgroundColor(LEVEL.skies[key] ?? LEVEL.map.sky);
    // Low bridges/branches and tunnels imply a moving map (train); fog banks can also roll over a static map at their own speed.
    const trainTriggers = built.triggers.some(t => t.type === 'hazard_sweep' || t.type === 'tunnel');
    const fogTriggers = built.triggers.some(t => t.type === 'fog');
    const drift = num(built.props.drift, trainTriggers ? LEVEL.train.defaultDrift : 0);
    const parallax = createParallax(ctx, str(built.props.parallax, 'stage1'), drift);
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
    const triggers = new TriggerSystem(ctx, built.triggers, str(built.props.clearSfx));
    triggers.publishZones();
    const train = trainTriggers || fogTriggers || drift ? new TrainSystem(ctx, built.triggers, drift || LEVEL.train.defaultDrift, parallax, k => triggers.setOverride(k), built.map.heightInPixels) : null;
    const ice = new IceSystem(ctx, built);
    const water = new WaterSystem(ctx, built, built.triggers);
    const vents = new VentSystem(ctx, built.triggers);
    // Phase F: background moments (bg_event triggers + arena/tunnel/explosion hooks), see src/level/background.ts.
    const bg = new BackgroundDirector(ctx, built.key, built.triggers, parallax, k => triggers.setWeather(k));

    ctx.onUpdate(dt => {
        spawner.update();
        arenas.update(dt);
        train?.update(dt);
        if (ice.count) ice.update(dt);
        if (water.active) water.update(dt);
        if (vents.count) vents.update(dt);
        triggers.update(dt);
        bg.update(dt);
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
        map: built.key, name: built.query.name, section: sectionAt(focusX()), checkpoint: triggers.lastCheckpoint,
        pending: spawner.pending, spawned: spawner.spawned, skipped: spawner.skipped,
        gate: [...rt.gates.values()].map(g => `${g.lock}:${g.smashed ? 'smashed' : 'closed'}`).join(' ') || null,
        kinds: [...new Set(built.spawns.map(o => `${o.type}:${kindOf(o)}`))].length,
        powTotal: built.query.powTotal ?? 0, drift
    }));
    if (train) ctx.debug.register('train', () => train.debug());
    if (ice.count) ctx.debug.register('ice', () => ice.debug());
    if (water.active) ctx.debug.register('water', () => water.debug());
    if (vents.count) ctx.debug.register('vents', () => vents.debug());
    ctx.debug.register('bg', () => bg.debug());
    // Fire a background moment by id (screenshots / QA): window.__KBE_LEVEL.bg('zeppelin'). Cheat builds only.
    if (ctx.debug.cheatsEnabled) {
        const w = window as unknown as { __KBE_LEVEL?: { bg(id: string): boolean } };
        w.__KBE_LEVEL = { bg: (id: string) => bg.fire(String(id)) };
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { delete w.__KBE_LEVEL; });
    }

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
        arenas.warped(to.x);
        // Snap BEFORE unlocking: unlock() starts its eased blend from the current x and snapTo() doesn't cancel a
        // running blend, so unlock-then-snap dragged the camera back to the old arena (and clamped the player to it).
        ctx.camera.snapTo(to.x, to.y - 18);
        ctx.camera.unlock();
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

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { rt.doors.length = 0; rt.gates.clear(); });
}
