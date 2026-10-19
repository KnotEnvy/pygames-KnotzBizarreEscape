#!/usr/bin/env node
// Arena audit: fast, deterministic check that every camera_lock arena of a part can be finished by a player who only
// shoots what's on screen. No bot, no terrain navigation: turbo simulation (__KBE.sim) + warps between arenas.
//
//   node tools/arena-audit.mjs --part 1-1|1-2|1-3|all [--verbose] [--budget 90] [--no-shots] [--strict] [--cycle 6] [--inject-stray]
//   --cycle <s>: simulated seconds between killVisible() calls (default 6; longer = a soak that lets enemies roam).
//   --strict: also turn the level's off-view safety net off (LEVEL.arena.offscreenPull/CullMs, runtime only), so a
//   member that drifts off-view fails instead of being pulled back. Shows latent drift the net is hiding.
//   --inject-stray: self-check of the audit. Turns the level's off-view safety net off (runtime tuning only) and pushes
//   one member of the first wave arena 40 px past the locked view's right edge: the original stall bug. The audit
//   must then FAIL that arena (off-view > 2 s, frozen, not done).
//   npm --prefix game run audit:arenas            (all parts)
//
// Per arena (TMJ `triggers` layer, type camera_lock, in x order):
//   warp ~120 px before it → god mode → walk right (jump when blocked) until the arena locks
//   wave arenas: repeat { simulate 6 s, sampling every 100 ms; assert every live wave member is inside the locked
//                view and not frozen; killVisible() } until the arena reports done.
//                FAIL: a member off-view > 2 s simulated, off-view/frozen at a checkpoint, or not done in 90 s sim.
//                WARN: a member pulled back by the level's off-view safety net, or one that vanished off-view.
//   boss arenas: damageBoss(5) every 200 ms (25 HP/s) and killVisible() every 3 s; assert phases 1..3 reached,
//                boss:defeated, the boss never off-view > 2 s, stage:clear { part, final } right, and the next scene
//                (PartClear, or Results after 1-3) starts. FAIL if the boss isn't down in 90 s sim.
// Writes tests/artifacts/arena-audit-<part>.json (+ a PNG per failing arena) and exits non-zero on any failure.
// Every part has a hard wall-clock budget (default 90 s); the whole run has one too. Nothing can hang.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const { chromium } = await import(path.join(root, 'node_modules/@playwright/test/index.mjs'));

const PARTS = { '1-1': 'm1p1', '1-2': 'm1p2', '1-3': 'm1p3' };
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = k => argv.includes(`--${k}`);
const partArg = arg('part', 'all');
const parts = partArg === 'all' ? Object.keys(PARTS) : partArg.split(',');
for (const p of parts) if (!PARTS[p]) { console.error(`arena-audit: unknown part '${p}' (use 1-1, 1-2, 1-3 or all)`); process.exit(2); }
const VERBOSE = flag('verbose');
const INJECT = flag('inject-stray');
const STRICT = flag('strict');
const SHOTS = !flag('no-shots');
const BUDGET_MS = Number(arg('budget', 90)) * 1000;
const ART = path.join(root, 'tests/artifacts');
fs.mkdirSync(ART, { recursive: true });

const LIMITS = {
    cycleMs: Number(arg('cycle', 6)) * 1000, // simulated time per wave cycle before the checkpoint + killVisible
    sampleMs: 100,        // off-view sampling period
    offFailMs: 2000,      // a member off-view longer than this fails
    arenaSimMs: 90000,    // arena must be done within this much simulated time after it locks
    walkSimMs: 20000,     // walking from the warp spot to the lock
    bossSimMs: 90000,
    bossHitMs: 200, bossHit: 5,  // 25 HP per simulated second
    bossKillVisibleMs: 3000,
    clearWaitSimMs: 25000, // boss:defeated → stage:clear → next scene
    inject: INJECT,
    strict: STRICT
};

// Whole-run watchdog: never hang, whatever happens inside Chromium.
const hardMs = parts.length * (BUDGET_MS + 15000) + 45000;
const watchdog = setTimeout(() => {
    console.error(`arena-audit: HARD TIMEOUT after ${Math.round(hardMs / 1000)} s wall; aborting (a page or the server hung).`);
    process.exit(3);
}, hardMs);
watchdog.unref();

// ------------------------------------------------------------------------------------------------ map data
function readMap(part) {
    const file = path.join(root, 'public/assets/maps', `${PARTS[part]}.tmj`);
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    const props = o => Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
    const layer = n => m.layers.find(l => l.name === n)?.objects ?? [];
    const spawns = layer('spawns').map(o => ({ type: o.type || o.class, x: o.x, y: o.y, id: o.id, p: props(o) }));
    const arenas = layer('triggers').filter(o => (o.type || o.class) === 'camera_lock').map(o => {
        const p = props(o);
        const id = String(p.id ?? `lock${o.id}`);
        const mine = spawns.filter(s => String(s.p.lock ?? '') === id);
        const boss = mine.find(s => s.type === 'boss');
        // Same rule as the level's ArenaController: props are not wave members; no `wave` means wave 1.
        const enemies = mine.filter(s => s !== boss && s.type !== 'prop');
        const waves = new Set(enemies.map(s => Number(s.p.wave ?? 1)));
        return { id, x0: o.x, x1: o.x + o.width, release: p.release ?? 'clear', boss: boss ? String(boss.p.kind) : null, waves: waves.size, members: enemies.length };
    }).sort((a, b) => a.x0 - b.x0);
    return { file, arenas };
}

// ------------------------------------------------------------------------------------------------ in-page helper
// Runs inside the page (serialised with toString). All game access goes through __KBE (state/cheats/sim).
function installHelper(L) {
    const K = window.__KBE;
    const EXEMPT = new Set(['dead', 'descent', 'land', 'leap_entry']);
    const arenaInfo = () => K.state().arena ?? null;
    const stateOf = id => {
        const all = String(arenaInfo()?.arenas ?? '');
        for (const tok of all.split(' ')) { const i = tok.lastIndexOf(':'); if (i > 0 && tok.slice(0, i) === id) return tok.slice(i + 1); }
        return null;
    };
    const viewStr = v => v ? `${v.x},${v.y} ${v.w}x${v.h}${v.locked ? ' locked' : ''}` : 'none';
    const keyOf = a => a.mapId ?? `${a.kind}@${a.x},${a.y}`;
    let T = null;
    const detail = (a, extra) => {
        const ar = arenaInfo();
        return { arena: T.id, wave: ar?.active === T.id ? ar.wave : null, kind: a.kind, mapId: a.mapId, x: a.x, y: a.y, state: a.state, hp: a.hp, view: viewStr(K.sim.view()), simMs: Math.round(K.sim.stats().simMs - T.t0), ...extra };
    };
    const fail = (type, a, extra = {}) => {
        const k = `${type}:${keyOf(a)}`;
        if (T.failKeys.has(k)) return;
        T.failKeys.add(k);
        T.fails.push({ type, ...detail(a, extra) });
    };
    const warn = (type, a, extra = {}) => {
        const k = `${type}:${keyOf(a)}`;
        if (T.warnKeys.has(k)) return;
        T.warnKeys.add(k);
        T.warns.push({ type, ...detail(a, extra) });
    };
    function members() { return K.sim.actors().filter(a => a.lock === T.id && !a.boss); }
    function maybeInject() {
        const vx = K.sim.view()?.x;
        T.still = vx === T.lastVx ? (T.still ?? 0) + 1 : 0;
        T.lastVx = vx;
        if (L.inject && !window.__AUD.injected && T.still >= 10) {
            const a = members().find(m => m.inView && m.state !== 'descent');
            const sc = K.game.scene.getScene('Game');
            const go = a && sc.children.list.find(o => o.active && o.kind === a.kind && Math.round(o.x) === a.x && Math.round(o.y) === a.y);
            if (go) {
                const arena = sc.ctx.tuning.level.LEVEL.arena;
                arena.offscreenPullMs = 1e9; arena.offscreenCullMs = 1e9;
                const v = K.sim.view();
                if (go.body?.reset) { go.body.reset(v.x + v.w + 40, go.y); go.body.setVelocity?.(0, 0); } else go.setPosition(v.x + v.w + 40, go.y);
                window.__AUD.injected = { kind: a.kind, mapId: a.mapId, x: v.x + v.w + 40 };
            }
        }
    }
    function sample(dt) {
        if (L.inject) maybeInject();
        const seen = new Set();
        for (const a of members()) {
            const k = keyOf(a);
            seen.add(k);
            const prev = T.last.get(k);
            let off = T.off.get(k) ?? 0;
            if (a.inView || EXEMPT.has(a.state)) {
                if (prev && off >= 1000 && Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) > 12) warn('pulled-into-view', a, { offMs: off, from: `${prev.x},${prev.y}` });
                off = 0;
            } else off += dt;
            T.off.set(k, off);
            if (off > T.maxOff) T.maxOff = off;
            if (a.frozen) T.frozenSeen = true;
            if (off > L.offFailMs) fail('off-view>2s', a, { offMs: off, frozen: a.frozen });
            T.last.set(k, a);
        }
        for (const [k, a] of T.last) {
            if (seen.has(k)) continue;
            if (!T.killed.has(k)) {
                if (!a.inView) warn('vanished-off-view', a, { offMs: T.off.get(k) ?? 0 });
                else { T.selfDied++; T.info.push({ type: 'died-on-screen-without-kill', ...detail(a, {}) }); }
            }
            T.last.delete(k); T.off.delete(k);
        }
        const ar = arenaInfo();
        if (ar?.active === T.id && ar.wave > T.maxWave) T.maxWave = ar.wave;
    }
    function killVisible() {
        for (const a of members()) if (a.visible) T.killed.add(keyOf(a));
        K.cheats.killVisible();
        T.kills = T.killed.size;
    }
    const done = () => { const s = stateOf(T.id); return s === 'done' || s === 'skipped'; };

    if (L.strict) {
        const arena = K.game.scene.getScene('Game').ctx.tuning.level.LEVEL.arena;
        arena.offscreenPullMs = 1e9; arena.offscreenCullMs = 1e9;
    }
    window.__AUD = {
        stateOf,
        begin(id) {
            T = { id, t0: K.sim.stats().simMs, v0: K.sim.stats().now, off: new Map(), last: new Map(), killed: new Set(), failKeys: new Set(), warnKeys: new Set(), fails: [], warns: [], info: [], selfDied: 0, kills: 0, maxOff: 0, maxWave: 0, frozenSeen: false, cycles: 0, bossLog: null };
            return true;
        },
        warp(x) {
            K.cheats.god(true);
            K.cheats.warp(x);
            const r = K.sim.advance(300);
            return { r, player: K.state().player, view: viewStr(K.sim.view()), st: stateOf(T.id) };
        },
        /** Walk right (jump when blocked) until the arena leaves `idle`. */
        walk(maxMs) {
            let t = 0, lastX = -1e9, stuck = 0;
            const t0 = performance.now();
            while (t < maxMs && performance.now() - t0 < 20000) {
                K.press('right', 320);
                if (stuck) K.press('jump', 260);
                const r = K.sim.advance(250, { until: () => stateOf(T.id) !== 'idle' });
                t += r.simMs;
                const st = stateOf(T.id);
                const x = K.state().player?.x ?? 0;
                if (st !== 'idle') return { ok: true, st, simMs: t, x, view: viewStr(K.sim.view()) };
                stuck = Math.abs(x - lastX) < 2 ? stuck + 1 : 0;
                lastX = x;
            }
            return { ok: false, st: stateOf(T.id), simMs: t, x: K.state().player?.x ?? 0, view: viewStr(K.sim.view()) };
        },
        /** One wave cycle: simulate, checkpoint, killVisible. */
        cycle() {
            T.cycles++;
            const r = K.sim.advance(L.cycleMs, { every: L.sampleMs, onStep: () => sample(L.sampleMs), until: done, budgetMs: 15000 });
            const st = stateOf(T.id);
            if (!done()) {
                for (const a of members()) {
                    if (EXEMPT.has(a.state)) continue;
                    if (!a.inView) fail('checkpoint-off-view', a, { offMs: T.off.get(keyOf(a)) ?? 0, frozen: a.frozen });
                    else if (a.frozen) fail('checkpoint-frozen', a);
                }
                killVisible();
            }
            const ar = arenaInfo();
            return { r, st, done: done(), simMs: Math.round(K.sim.stats().simMs - T.t0), wave: ar?.active === T.id ? ar.wave : null, alive: members().length, pending: ar?.active === T.id ? ar.pending : 0, fails: T.fails.length, errors: K.state().errors.length };
        },
        /** Boss fight in chunks: 25 HP/s of normal hits, killVisible for adds, position checks. */
        bossChunk(ms) {
            const B = T.bossLog ??= { offMs: 0, maxOff: 0, phases: [], hp0: null, lastHp: null, lastHpAt: 0, stallMs: 0, spawned: false, defeated: false, sinceKill: 0 };
            const r = K.sim.advance(ms, {
                every: L.bossHitMs,
                onStep: () => {
                    const s = K.state();
                    const b = s.boss && typeof s.boss === 'object' && 'x' in s.boss ? s.boss : null;
                    if (!b) return;
                    B.spawned = true;
                    if (B.hp0 === null) B.hp0 = b.hp;
                    if (b.phase && !B.phases.includes(b.phase)) B.phases.push(b.phase);
                    const v = K.sim.view();
                    const inView = v && b.x >= v.x && b.x <= v.x + v.w && b.y >= v.y && b.y <= v.y + v.h + 24;
                    B.offMs = inView ? 0 : B.offMs + L.bossHitMs;
                    B.maxOff = Math.max(B.maxOff, B.offMs);
                    if (B.offMs > L.offFailMs) fail('boss-off-view>2s', { kind: s.boss.kind ?? 'boss', mapId: 'boss', x: Math.round(b.x), y: Math.round(b.y), state: b.state, hp: b.hp }, { offMs: B.offMs });
                    if (b.hp !== B.lastHp) { B.lastHp = b.hp; B.stallMs = 0; } else if (b.hp > 0) B.stallMs += L.bossHitMs;
                    if (B.stallMs > 15000) fail('boss-not-taking-damage', { kind: s.boss.kind ?? 'boss', mapId: 'boss', x: Math.round(b.x), y: Math.round(b.y), state: b.state, hp: b.hp }, { stallMs: B.stallMs });
                    if (b.hp > 0) K.cheats.damageBoss(L.bossHit);
                    B.sinceKill += L.bossHitMs;
                    if (B.sinceKill >= L.bossKillVisibleMs) { B.sinceKill = 0; killVisible(); }
                },
                until: () => K.sim.events(T.v0).some(e => e.name === 'boss:defeated'),
                budgetMs: 15000
            });
            B.defeated = K.sim.events(T.v0).some(e => e.name === 'boss:defeated');
            const s = K.state();
            return { r, simMs: Math.round(K.sim.stats().simMs - T.t0), defeated: B.defeated, spawned: B.spawned, hp: s.bossHp, phase: s.bossPhase, phases: B.phases, maxOff: B.maxOff, st: stateOf(T.id), scene: s.scene };
        },
        /** After boss:defeated: wait for stage:clear and the next scene. */
        waitClear(ms, want) {
            const r = K.sim.advance(ms, { until: () => K.state().scenes.includes(want), budgetMs: 15000 });
            const s = K.state();
            const evs = K.sim.events(T.v0);
            return { r, scene: s.scene, scenes: s.scenes, clear: evs.filter(e => e.name === 'stage:clear').map(e => e.data), phases: evs.filter(e => e.name === 'boss:phase').map(e => e.data.phase), defeated: evs.some(e => e.name === 'boss:defeated') };
        },
        result() {
            return { fails: T.fails, warns: T.warns, info: T.info, selfDied: T.selfDied, kills: T.kills, maxOffMs: T.maxOff, maxWave: T.maxWave, cycles: T.cycles, frozenSeen: T.frozenSeen, simMs: Math.round(K.sim.stats().simMs - T.t0), boss: T.bossLog };
        },
        stats: () => K.sim.stats(),
        injected: null,
        errors: () => K.state().errors
    };
    return true;
}

// ------------------------------------------------------------------------------------------------ driver
class Budget extends Error {}
function withTimeout(p, ms, label) {
    let t;
    return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Budget(`${label}: no answer within ${Math.round(ms / 1000)} s wall`)), Math.max(1, ms)); })]).finally(() => clearTimeout(t));
}

async function gotoWithRetry(page, url, ms) {
    try { await page.goto(url, { timeout: ms }); }
    catch (e) {
        if (!/ERR_NETWORK_CHANGED|ERR_CONNECTION|net::/.test(e.message)) throw e;
        console.log(`  (page load failed: ${e.message.split('\n')[0]}; retrying once)`);
        await page.goto(url, { timeout: ms });
    }
}

async function auditPart(browser, base, part) {
    const t0 = performance.now();
    const deadline = t0 + BUDGET_MS;
    const left = () => deadline - performance.now();
    const { arenas } = readMap(part);
    const out = { part, map: PARTS[part], strict: STRICT, inject: INJECT, ok: true, wallMs: 0, simMs: 0, speedup: 0, arenas: [], failures: [], warnings: [], pageErrors: [] };
    const context = await browser.newContext({ viewport: { width: 768, height: 432 } });
    const page = await context.newPage();
    page.on('pageerror', e => out.pageErrors.push(e.message));
    const ev = (fn, a, label) => withTimeout(page.evaluate(fn, a), Math.min(left(), 30000), `${part} ${label}`);
    const shot = async name => {
        if (!SHOTS) return null;
        const file = path.join(ART, `arena-audit-${part}-${name}.png`);
        try { await withTimeout((async () => { await page.evaluate(() => window.__KBE.sim.render()); await page.screenshot({ path: file }); })(), 8000, 'screenshot'); return path.relative(root, file); }
        catch { return null; }
    };
    try {
        await gotoWithRetry(page, `${base}/?scene=Game&part=${part}&god=1&mute=1&debug=1&seed=1&fast=1`, Math.min(left(), 30000));
        await page.waitForFunction(p => window.__KBE?.ready && window.__KBE.sim && window.__KBE.state().scene === 'Game' && window.__KBE.state().part === p, part, { timeout: Math.min(left(), 30000) });
        await ev(() => { window.__KBE.sim.freeze(); return true; }, undefined, 'freeze');
        await ev(`(${installHelper.toString()})(${JSON.stringify(LIMITS)})`, undefined, 'helper');
        const level = await ev(() => window.__KBE.state().level, undefined, 'level');
        if (level?.sandbox) throw new Error(`part ${part} loaded the dev sandbox, not ${PARTS[part]}`);

        for (const a of arenas) {
            if (left() <= 0) throw new Budget(`${part}: wall budget of ${BUDGET_MS / 1000} s used up before arena '${a.id}'`);
            const res = { id: a.id, kind: a.boss ? `boss:${a.boss}` : 'waves', x0: a.x0, x1: a.x1, waves: a.waves, members: a.members, ok: true, wallMs: 0, lockSimMs: 0, simMs: 0, kills: 0, maxOffMs: 0, cycles: 0, fails: [], warns: [] };
            const ta = performance.now();
            out.arenas.push(res);
            await ev(id => window.__AUD.begin(id), a.id, 'begin');
            const st0 = await ev(id => window.__AUD.stateOf(id), a.id, 'state');
            if (st0 !== 'idle') { res.fails.push({ type: 'not-idle-before-warp', arena: a.id, state: st0 }); }
            const w = await ev(x => window.__AUD.warp(x), a.x0 - 120, 'warp');
            const walk = await ev(ms => window.__AUD.walk(ms), LIMITS.walkSimMs, 'walk');
            res.lockSimMs = walk.simMs;
            if (VERBOSE) console.log(`  [${a.id}] warp → ${JSON.stringify(w.player)} view ${w.view}; walk → ${JSON.stringify(walk)}`);
            if (!walk.ok) {
                res.fails.push({ type: 'never-locked', arena: a.id, state: walk.st, x: walk.x, view: walk.view, simMs: walk.simMs });
            } else if (!a.boss) {
                let c;
                do {
                    if (left() <= 0) throw new Budget(`${part}: wall budget used up inside arena '${a.id}'`);
                    c = await ev(() => window.__AUD.cycle(), undefined, `cycle ${a.id}`);
                    if (VERBOSE) console.log(`  [${a.id}] cycle → ${JSON.stringify(c)}`);
                    if (c.r.stopped === 'error') throw new Error(`game step threw: ${c.r.error}`);
                } while (!c.done && c.simMs < LIMITS.arenaSimMs);
                if (!c.done) res.fails.push({ type: 'not-done-in-90s', arena: a.id, state: c.st, wave: c.wave, alive: c.alive, pending: c.pending, simMs: c.simMs });
            } else {
                let b;
                do {
                    if (left() <= 0) throw new Budget(`${part}: wall budget used up in the boss fight '${a.id}'`);
                    b = await ev(ms => window.__AUD.bossChunk(ms), 2000, 'boss');
                    if (VERBOSE) console.log(`  [${a.id}] boss → ${JSON.stringify(b)}`);
                    if (b.r.stopped === 'error') throw new Error(`game step threw: ${b.r.error}`);
                } while (!b.defeated && b.simMs < LIMITS.bossSimMs + walk.simMs);
                res.boss = { phases: b.phases, defeated: b.defeated, maxOffMs: b.maxOff };
                if (!b.spawned) res.fails.push({ type: 'boss-never-spawned', arena: a.id, state: b.st });
                else if (!b.defeated) res.fails.push({ type: 'boss-not-defeated-in-90s', arena: a.id, hp: b.hp, phase: b.phase, phases: b.phases, simMs: b.simMs });
                if (b.defeated) {
                    const final = part === '1-3';
                    const want = final ? 'Results' : 'PartClear';
                    const wc = await ev(([ms, want]) => window.__AUD.waitClear(ms, want), [LIMITS.clearWaitSimMs, want], 'clear');
                    if (VERBOSE) console.log(`  [${a.id}] clear → ${JSON.stringify(wc)}`);
                    res.boss.phases = [...new Set([1, ...wc.phases])].sort();
                    res.boss.clear = wc.clear;
                    res.boss.nextScene = wc.scenes.includes(want) ? want : wc.scene;
                    if (!res.boss.phases.includes(2) || !res.boss.phases.includes(3)) res.fails.push({ type: 'boss-phase-missing', arena: a.id, phases: res.boss.phases });
                    if (wc.clear.length !== 1) res.fails.push({ type: 'stage-clear-count', arena: a.id, count: wc.clear.length });
                    const c0 = wc.clear[0];
                    if (c0 && (c0.part !== part || c0.final !== final)) res.fails.push({ type: 'stage-clear-data', arena: a.id, got: c0, want: { part, final } });
                    if (!wc.scenes.includes(want)) res.fails.push({ type: 'next-scene-missing', arena: a.id, want, scene: wc.scene, scenes: wc.scenes });
                }
            }
            const r = await ev(() => window.__AUD.result(), undefined, 'result');
            res.fails.push(...r.fails);
            res.warns.push(...r.warns);
            Object.assign(res, { kills: r.kills, maxOffMs: r.maxOffMs, cycles: r.cycles, simMs: r.simMs, maxWave: r.maxWave, wallMs: performance.now() - ta });
            if (!a.boss && r.maxWave < a.waves) res.warns.push({ type: 'waves-not-all-seen', arena: a.id, seen: r.maxWave, map: a.waves });
            res.info = r.info; res.selfDied = r.selfDied;
            if (!a.boss && res.fails.length === 0 && r.kills + r.selfDied < a.members) res.warns.push({ type: 'members-unaccounted', arena: a.id, killed: r.kills, diedOnTheirOwn: r.selfDied, map: a.members });
            res.ok = res.fails.length === 0;
            if (!res.ok) res.shot = await shot(a.id);
            if (res.fails.some(f => f.type === 'never-locked' || f.type === 'boss-never-spawned')) {
                // Later arenas would start from a broken state; keep going anyway (each warps fresh).
            }
        }
        if (INJECT) out.injected = await ev(() => window.__AUD.injected, undefined, 'injected');
        const errs = await ev(() => window.__AUD.errors(), undefined, 'errors');
        if (errs.length) out.failures.push({ type: 'console-errors', errors: errs.slice(-10) });
        const s = await ev(() => window.__AUD.stats(), undefined, 'stats');
        out.simMs = s.simMs; out.speedup = s.speedup; out.stepWallMs = s.wallMs;
    } catch (e) {
        out.failures.push({ type: e instanceof Budget || e.name === 'TimeoutError' ? 'wall-budget' : 'tool-error', message: e.message.split('\n').slice(0, 4).join(' | ') });
    } finally {
        await withTimeout(context.close(), 10000, 'close').catch(() => {});
    }
    if (out.pageErrors.length) out.failures.push({ type: 'page-errors', errors: out.pageErrors.slice(-10) });
    out.wallMs = performance.now() - t0;
    for (const a of out.arenas) for (const f of a.fails) out.failures.push(f);
    for (const a of out.arenas) for (const w of a.warns) out.warnings.push(w);
    out.ok = out.failures.length === 0;
    return out;
}

function printPart(r) {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`\nPART ${r.part} (${r.map})${r.strict ? ' [strict]' : ''}  ${r.ok ? 'PASS' : 'FAIL'}  wall ${(r.wallMs / 1000).toFixed(1)} s  sim ${(r.simMs / 1000).toFixed(1)} s  stepping ${r.speedup}x real time`);
    console.log('  ' + [pad('arena', 9), pad('kind', 16), pad('waves', 6), pad('lock', 7), pad('sim', 7), pad('killed', 7), pad('maxOff', 7), pad('wall', 6), 'result'].join(' '));
    for (const a of r.arenas) {
        const extra = a.boss ? ` phases ${a.boss.phases?.join('/')} → ${a.boss.nextScene ?? '-'}` : '';
        console.log('  ' + [pad(a.id, 9), pad(a.kind, 16), pad(a.boss ? '-' : `${a.maxWave ?? 0}/${a.waves}`, 6), pad(`${(a.lockSimMs / 1000).toFixed(1)}s`, 7), pad(`${(a.simMs / 1000).toFixed(1)}s`, 7), pad(a.boss ? '-' : `${a.kills}${a.selfDied ? '+' + a.selfDied : ''}/${a.members}`, 7), pad(`${a.maxOffMs}ms`, 7), pad(`${(a.wallMs / 1000).toFixed(1)}s`, 6), (a.ok ? 'ok' : 'FAIL') + (a.warns.length ? ` (${a.warns.length} warn)` : '') + extra].join(' '));
    }
    for (const f of r.failures) console.log(`  FAIL ${JSON.stringify(f)}`);
    for (const w of r.warnings) console.log(`  warn ${JSON.stringify(w)}`);
}

const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const results = [];
let code = 0;
try {
    for (const part of parts) {
        const r = await auditPart(browser, base, part);
        results.push(r);
        printPart(r);
        fs.writeFileSync(path.join(ART, `arena-audit-${part}.json`), JSON.stringify(r, null, 2));
        if (!r.ok) code = 1;
    }
} catch (e) {
    console.error('arena-audit: tool failure:', e.stack || e.message);
    code = 2;
} finally {
    await withTimeout(browser.close(), 10000, 'browser close').catch(() => {});
    await withTimeout(server.close(), 5000, 'server close').catch(() => {});
}
console.log(`\narena-audit: ${results.map(r => `${r.part} ${r.ok ? 'PASS' : 'FAIL'} (${(r.wallMs / 1000).toFixed(1)} s)`).join(', ')}; artifacts in ${path.relative(process.cwd(), ART) || ART}`);
process.exit(code);
