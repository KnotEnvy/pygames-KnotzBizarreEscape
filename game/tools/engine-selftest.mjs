#!/usr/bin/env node
// Engine regression self-test (Phase C review E1/E2). Starts its own Vite server on a free port (like shot.mjs),
// boots `?enemytest=boss` and checks, in the real game:
//   anims  every global animation has frames, and every frame resolves to a real texture frame (no zero-frame
//          anims from Phaser's createFromAseprite, which `exists()` but throw on play()).
//   E1     a player projectile kills MOOSEZILLA inside ProjectileSystem.update() while enemy bullets are live
//          (boss death calls projectiles.clear('enemy') re-entrantly): no error, no hole in the live list, no
//          projectile in the pool twice, two later spawns hand out distinct projectiles.
//   input  (second page, plain ?scene=Game) a key held over from the menu that started the game (it reaches the
//          Game only as auto-repeat keydowns) never pauses it; latchHeld()/flow.continueGame() ignore a held key
//          until it is released; fresh presses still work.
//   camera snapTo() finishes a running lock/unlock blend (unlock-then-snap no longer drags the view back);
//          lock()-then-snapTo() lands inside the arena at once.
//   load   (QA E04, fault injection) hud_gold.xml aborted once -> the retry recovers, Game is playable and respawns;
//          aborted for good -> Preload's load-error screen (ready=false, state().loadErrors, no Game, no crash), then
//          Enter after un-blocking reloads only the failed file and the Game starts; ui.json aborted once -> Boot's
//          pack retry recovers.
// Exit code 0 = pass. Usage: node game/tools/engine-selftest.mjs [--shots /tmp/dir]
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const { chromium } = await import(path.join(root, 'node_modules/@playwright/test/index.mjs'));
const shotsIdx = process.argv.indexOf('--shots');
const shots = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;

const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
const fails = [];
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${JSON.stringify(detail)}` : ''}`); if (!ok) fails.push(name); };

try {
    await page.goto(`http://127.0.0.1:${port}/?scene=Game&fast=1&mute=1&god=1&enemytest=boss`);
    await page.waitForFunction(() => window.__KBE?.ready && window.__KBE_ENEMYTEST && window.__KBE.state().boss, null, { timeout: 30000 });
    await page.waitForTimeout(1500);

    const anims = await page.evaluate(() => {
        const out = { total: 0, empty: [], missingFrames: [] };
        for (const [key, a] of Object.entries(window.__KBE.game.anims.anims.entries)) {
            out.total++;
            if (a.frames.length === 0) out.empty.push(key);
            else if (a.frames.some(f => !f.frame || f.frame.texture.key === '__MISSING')) out.missingFrames.push(key);
        }
        return out;
    });
    check(`anims: ${anims.total} animations, none empty`, anims.empty.length === 0 && anims.total > 0, anims.empty.slice(0, 10));
    check('anims: every frame resolves to a texture', anims.missingFrames.length === 0, anims.missingFrames.slice(0, 10));

    await page.evaluate(() => window.__KBE_ENEMYTEST.bossHp(1));
    await page.waitForTimeout(2500); // phase-transition roar
    const before = await page.evaluate(() => {
        const ps = window.__KBE.game.scene.getScene('Game').internals.projectiles;
        const b = window.__KBE.state().boss;
        for (let i = 0; i < 3; i++) ps.spawn({ x: b.x - 200 + i * 8, y: b.y - 140, vx: 0, vy: 0, team: 'enemy', damage: 1, collideTiles: false, lifetime: 4000 });
        // Newest in the live list = processed first by the backwards walk: the worst case for the old clear().
        ps.spawn({ x: b.x, y: b.y - 30, vx: 10, vy: 0, team: 'player', damage: 999, radius: 24, kind: 'explosion', weapon: 'rocket', collideTiles: false });
        return { hp: b.hp, enemyShots: ps.countTeam('enemy') };
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
        const ps = window.__KBE.game.scene.getScene('Game').internals.projectiles;
        const a = ps.spawn({ x: 0, y: 0, vx: 0, vy: 0, team: 'player', damage: 0, lifetime: 30 });
        const b = ps.spawn({ x: 0, y: 0, vx: 0, vy: 0, team: 'player', damage: 0, lifetime: 30 });
        return {
            bossHp: window.__KBE.state().bossHp,
            holes: ps.live.filter(p => !p).length,
            dupInPool: ps.pool.length - new Set(ps.pool).size,
            liveAndPooled: ps.pool.filter(p => ps.live.includes(p)).length,
            enemyShots: ps.countTeam('enemy'),
            distinctSpawns: a !== null && a !== b
        };
    });
    check('E1: setup (boss at 1 HP, enemy shots live)', before.hp === 1 && before.enemyShots >= 3, before);
    check('E1: boss killed by a projectile', after.bossHp === 0, after);
    check('E1: projectile pool intact after re-entrant clear()', after.holes === 0 && after.dupInPool === 0 && after.liveAndPooled === 0 && after.distinctSpawns && after.enemyShots === 0, after);
    await page.waitForTimeout(1500);
    if (shots) await page.screenshot({ path: path.join(shots, 'selftest-boss-defeat.png') });

    // ---- input: held-over keys (UI request: opening Enter must not pause the Game)
    const p2 = await browser.newPage({ viewport: { width: 1152, height: 648 } });
    p2.on('pageerror', e => pageErrors.push(e.message));
    await p2.goto(`http://127.0.0.1:${port}/?scene=Game&fast=1&mute=1&god=1`);
    await p2.waitForFunction(() => window.__KBE?.ready, null, { timeout: 30000 });
    await p2.waitForTimeout(500);
    await p2.evaluate(() => {
        window.__kbeKey = (type, keyCode, repeat) => {
            const e = new KeyboardEvent(type, { bubbles: true, cancelable: true, repeat });
            Object.defineProperty(e, 'keyCode', { get: () => keyCode });
            Object.defineProperty(e, 'which', { get: () => keyCode });
            window.dispatchEvent(e);
        };
        window.__kbeGame = () => window.__KBE.game.scene.getScene('Game');
        window.__kbePaused = () => { const g = window.__kbeGame(); return g.scene.isPaused() || g.internals.time.paused || g.scene.isActive('Pause'); };
    });
    // Enter held from the Title: the Game's keyboard only ever sees repeat keydowns (~30 Hz) for 1.5 s.
    for (let t = 0; t < 1500; t += 33) {
        await p2.evaluate(() => window.__kbeKey('keydown', 13, true));
        await p2.waitForTimeout(33);
    }
    const heldOver = await p2.evaluate(() => ({ paused: window.__kbePaused(), pauseDown: window.__kbeGame().internals.inputs[0].isDown('pause') }));
    await p2.evaluate(() => window.__kbeKey('keyup', 13, false));
    await p2.waitForTimeout(100);
    check('input: held-over Enter (repeat keydowns) neither pauses nor reads as down', !heldOver.paused && !heldOver.pauseDown, heldOver);

    // latchHeld(): X (shoot) held when latched reads up until released, then a fresh press works.
    await p2.evaluate(() => window.__kbeKey('keydown', 88, false));
    await p2.waitForTimeout(100);
    const latch = await p2.evaluate(() => ({ before: window.__kbeGame().internals.inputs[0].isDown('shoot') }));
    await p2.evaluate(() => window.__kbeGame().internals.inputs[0].latchHeld());
    await p2.waitForTimeout(100);
    latch.latched = await p2.evaluate(() => window.__kbeGame().internals.inputs[0].isDown('shoot'));
    await p2.evaluate(() => window.__kbeKey('keyup', 88, false));
    await p2.waitForTimeout(100);
    await p2.evaluate(() => window.__kbeKey('keydown', 88, false));
    await p2.waitForTimeout(100);
    latch.fresh = await p2.evaluate(() => window.__kbeGame().internals.inputs[0].isDown('shoot'));
    await p2.evaluate(() => window.__kbeKey('keyup', 88, false));
    check('input: latchHeld() ignores a held key until release; fresh press works', latch.before && !latch.latched && latch.fresh, latch);

    // flow.continueGame(): the Enter that confirmed CONTINUE (down in the Game too) neither pauses nor confirms.
    // (Game-over state is faked: Continue scene's confirm press reaches the Game's keyboard while isOver.)
    await p2.evaluate(() => { window.__kbeGame().internals.flow.isOver = true; });
    await p2.evaluate(() => window.__kbeKey('keydown', 13, false));
    await p2.waitForTimeout(100);
    const cont = await p2.evaluate(() => {
        const g = window.__kbeGame();
        g.internals.flow.continueGame();
        return { over: g.internals.flow.over };
    });
    for (let t = 0; t < 600; t += 33) {
        await p2.evaluate(() => window.__kbeKey('keydown', 13, true));
        await p2.waitForTimeout(33);
    }
    Object.assign(cont, await p2.evaluate(() => ({ paused: window.__kbePaused(), confirmDown: window.__kbeGame().internals.inputs[0].isDown('confirm') })));
    await p2.evaluate(() => window.__kbeKey('keyup', 13, false));
    await p2.waitForTimeout(100);
    await p2.evaluate(() => window.__kbeKey('keydown', 13, false));
    await p2.waitForTimeout(150);
    cont.freshPause = await p2.evaluate(() => window.__kbePaused());
    await p2.evaluate(() => window.__kbeKey('keyup', 13, false));
    check('input: Enter held through continueGame() ignored until release; fresh Enter pauses', !cont.over && !cont.paused && !cont.confirmDown && cont.freshPause, cont);
    // camera: snapTo() is a hard cut. It finishes a running unlock() blend (Levels' warp bug: unlock-then-snap
    // dragged the view back to the old arena), and lock()-then-snapTo() lands inside the arena immediately.
    const errors2 = await p2.evaluate(() => window.__KBE.state().errors);
    if (errors2.length) pageErrors.push(...errors2);
    await p2.close();
    // (own page: the input checks above leave the Game paused, and a paused scene never runs the camera)
    const p3 = await browser.newPage({ viewport: { width: 1152, height: 648 } });
    p3.on('pageerror', e => pageErrors.push(e.message));
    await p3.goto(`http://127.0.0.1:${port}/?scene=Game&fast=1&mute=1&god=1`);
    await p3.waitForFunction(() => window.__KBE?.ready, null, { timeout: 30000 });
    await p3.waitForTimeout(500);
    const cam = await p3.evaluate(async () => {
        const g = window.__KBE.game.scene.getScene('Game'), c = g.internals.camera, w = c.cam.width;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const movePlayer = x => { const p = g.ctx.player(); if (p?.teleport) p.teleport(x, p.y); };
        const out = {};
        const x0 = c.debugInfo().x;
        // unlock() then snapTo() far right (the bug path), and the workaround order snapTo() then unlock().
        for (const [name, unlockFirst] of [['unlockSnap', true], ['snapUnlock', false]]) {
            const base = c.debugInfo().x;
            c.lock(base, base + w);
            await wait(120);
            const to = base + 2400;
            movePlayer(to);
            if (unlockFirst) { c.unlock(); c.snapTo(to, g.ctx.player()?.y ?? 200); }
            else { c.snapTo(to, g.ctx.player()?.y ?? 200); c.unlock(); }
            const snapped = c.debugInfo().x;
            await wait(1);
            const blend0 = c.debugInfo().blend;
            let minX = snapped;
            for (let t = 0; t < 900; t += 50) { await wait(50); minX = Math.min(minX, c.debugInfo().x); }
            out[name] = { base, snapped, minX, blend0, blend: c.debugInfo().blend, locked: c.debugInfo().locked, ok: snapped > base + 1500 && minX >= snapped - 1 };
        }
        // lock() then an immediate snapTo() inside the arena: no blend, view inside [x0, x1].
        const b = c.debugInfo().x;
        c.lock(b + 200, b + 200 + w);
        c.snapTo(b + 200 + w * 0.5, g.ctx.player()?.y ?? 200);
        const at = c.debugInfo();
        await wait(300);
        const later = c.debugInfo();
        out.lockSnap = { at: at.x, later: later.x, blend: at.blend, x0: at.x0, ok: at.blend === 1 && at.x >= at.x0 - 0.5 && at.x <= at.x1 - w + 0.5 && Math.abs(later.x - at.x) < 2 };
        c.unlock();
        out.x0 = x0;
        return out;
    });
    check('camera: scene running (unlock blend progressed)', cam.snapUnlock.blend === 1, cam.snapUnlock);
    check('camera: snapTo() after unlock() cancels the blend (no drag back)', cam.unlockSnap.ok, cam.unlockSnap);
    check('camera: snapTo() then unlock() (Levels warp order) stays put', cam.snapUnlock.ok, cam.snapUnlock);
    check('camera: lock() then snapTo() lands inside the arena at once', cam.lockSnap.ok, cam.lockSnap);

    const errors3 = await p3.evaluate(() => window.__KBE.state().errors);
    if (errors3.length) pageErrors.push(...errors3);
    await p3.close();

    // ---- load: fault injection (KBE-QA-E04). Phaser itself console.errors "File failed" for a failed MultiFile
    // child, so only crash-type errors count here, not that log line.
    const GAME_URL = `http://127.0.0.1:${port}/?scene=Game&fast=1&mute=1&god=1&seed=731`;
    const crashes = st => st.errors.filter(e => !/File failed/.test(e));
    const respawns = async pg => {
        await pg.evaluate(() => window.__KBE.cheats.kill());
        try { await pg.waitForFunction(() => window.__KBE.state().player?.alive === false, null, { timeout: 2000 }); } catch { return { died: false }; }
        try { await pg.waitForFunction(() => window.__KBE.state().player?.alive === true, null, { timeout: 8000 }); return { died: true, respawned: true }; } catch { return { died: true, respawned: false }; }
    };
    const loadPage = async (pattern, failTimes) => {
        const pg = await browser.newPage({ viewport: { width: 1152, height: 648 } });
        const errs = [];
        pg.on('pageerror', e => errs.push(e.message));
        const hits = { aborted: 0, served: 0, block: failTimes };
        await pg.route(pattern, route => {
            if (hits.block > 0) { hits.block--; hits.aborted++; return route.abort('failed'); }
            hits.served++; return route.continue();
        });
        await pg.goto(GAME_URL);
        return { pg, errs, hits };
    };
    const healthyGame = pg => pg.evaluate(() => {
        const s = window.__KBE.state();
        return { ready: window.__KBE.ready, scene: s.scene, loadErrors: s.loadErrors, font: window.__KBE.game.cache.bitmapFont.exists('font_hud_gold'), hud: window.__KBE.game.scene.isActive('HUD'), level: s.level?.name ?? null, errors: s.errors };
    });

    {   // aborted once -> recovered by the automatic retry
        const { pg, errs, hits } = await loadPage('**/assets/fonts/hud_gold.xml', 1);
        await pg.waitForFunction(() => window.__KBE?.ready, null, { timeout: 30000 });
        await pg.waitForTimeout(500);
        const st = await healthyGame(pg);
        const rs = await respawns(pg);
        const errors = [...errs, ...crashes(await pg.evaluate(() => window.__KBE.state()))];
        if (shots) await pg.screenshot({ path: path.join(shots, 'selftest-load-retry-recovered.png') });
        check('load: hud_gold.xml aborted once -> retried, Game + HUD up, real level, respawn works', hits.aborted === 1 && hits.served >= 1 && st.scene === 'Game' && st.hud && st.font && st.level && st.loadErrors.length === 0 && rs.respawned && errors.length === 0, { hits, ...st, errors: errors.slice(0, 3), ...rs });
        await pg.close();
    }
    {   // aborted for good -> error screen; un-block + Enter -> only the failed file reloads, Game starts
        const { pg, errs, hits } = await loadPage('**/assets/fonts/hud_gold.xml', Infinity);
        await pg.waitForFunction(() => (window.__KBE?.state().loadErrors ?? []).length > 0 && window.__KBE.state().scene === 'Preload', null, { timeout: 30000 });
        await pg.waitForTimeout(1500); // nothing may route on afterwards
        const st = await pg.evaluate(() => {
            const s = window.__KBE.state();
            const pre = window.__KBE.game.scene.getScene('Preload');
            const texts = pre.children.list.filter(o => o.type === 'Text' && o.visible).map(o => o.text);
            return { ready: window.__KBE.ready, scene: s.scene, scenes: s.scenes, loadErrors: s.loadErrors, texts, errors: s.errors };
        });
        const errors = [...errs, ...crashes(st)];
        if (shots) await pg.screenshot({ path: path.join(shots, 'selftest-load-error-screen.png') });
        const attempts = hits.aborted;
        check('load: hud_gold.xml always failing -> 3 attempts, error screen, ready=false, no Game, no crash',
            attempts === 3 && !st.ready && st.scene === 'Preload' && !st.scenes.includes('Game') && st.loadErrors.length === 1 && st.loadErrors[0].key === 'font_hud_gold'
            && st.texts.includes('LOAD FAILED: CHECK CONNECTION') && st.texts.includes('1 FILE FAILED TO LOAD') && st.texts.includes('PRESS ENTER / CLICK TO RETRY') && errors.length === 0,
            { attempts, ...st, errors: errors.slice(0, 3) });
        await pg.unroute('**/assets/fonts/hud_gold.xml');
        const requested = [];
        pg.on('request', r => { if (r.url().includes('/assets/')) requested.push(new URL(r.url()).pathname); });
        await pg.keyboard.press('Enter');
        await pg.waitForFunction(() => window.__KBE?.ready, null, { timeout: 30000 });
        await pg.waitForTimeout(500);
        const st2 = await healthyGame(pg);
        const rs = await respawns(pg);
        const errors2 = [...errs, ...crashes(await pg.evaluate(() => window.__KBE.state()))];
        if (shots) await pg.screenshot({ path: path.join(shots, 'selftest-load-error-retried.png') });
        const onlyFailed = requested.every(u => /\/assets\/fonts\/hud_gold\.(xml|png)$/.test(u) || !/\/assets\/(fonts|packs)\//.test(u)) && requested.some(u => u.endsWith('hud_gold.xml')) && !requested.some(u => /\/assets\/packs\//.test(u));
        check('load: un-block + Enter retries only the failed file; Game + HUD up, respawn works', onlyFailed && st2.scene === 'Game' && st2.hud && st2.font && st2.loadErrors.length === 0 && rs.respawned && errors2.length === 0, { requested: requested.slice(0, 8), ...st2, errors: errors2.slice(0, 3), ...rs });
        await pg.close();
    }
    {   // a pack fetch aborted once -> Boot's pack retry recovers (not "skipped as missing")
        const { pg, errs, hits } = await loadPage('**/assets/packs/ui.json', 1);
        await pg.waitForFunction(() => window.__KBE?.ready, null, { timeout: 30000 });
        await pg.waitForTimeout(500);
        const st = await healthyGame(pg);
        const errors = [...errs, ...crashes(st)];
        check('load: ui.json pack aborted once -> refetched, Game + HUD up', hits.aborted === 1 && hits.served >= 1 && st.scene === 'Game' && st.hud && st.font && st.loadErrors.length === 0 && errors.length === 0, { hits, ...st, errors: errors.slice(0, 3) });
        await pg.close();
    }
    const errors = await page.evaluate(() => window.__KBE.state().errors);
    check('no page errors / __KBE errors', pageErrors.length === 0 && errors.length === 0, [...pageErrors, ...errors].slice(0, 5));
} catch (e) {
    check('run', false, String(e.message ?? e));
}
await browser.close();
await server.close();
console.log(fails.length ? `engine-selftest: ${fails.length} failure(s)` : 'engine-selftest: all passed');
process.exit(fails.length ? 1 : 0);
