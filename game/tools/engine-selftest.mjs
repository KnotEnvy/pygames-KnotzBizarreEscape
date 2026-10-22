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
//   campaign (Phase E) the real flow 1-1 → 1-2 → 1-3 → Results through stage:clear (PartClear when registered,
//          else Game directly): carry-over (score, lives, bombs, weapon, Infinity and finite ammo), PartClear data,
//          Results totals + parts array, progress unlock/best, Title → Game after a run is a fresh 1-1, killing the
//          1-1 boss in play reaches the next part, ?part=, no-localStorage, and no growth of bus listeners,
//          updaters, scene/game emitters, window listeners or audio voices across part restarts.
//   missions (Phase G) lazy per-mission packs: ?part=2-1 boots through Preload's mission mode (MISSION 2 bar, packs
//          `<team>.m2.json` fetched once, anims built, ready only once Game is up); later parts / retries reuse the
//          cache; Title-style scene.start('Game', { part: '2-2' }); ?enemytest= in 1-1 loads them too; a mission pack
//          aborted once is refetched; the mission chain 1-3 → Results { next: 2-1, carry } → Game 2-1 with the carry,
//          2-1 unlocked; 2-3 (last mission) → Results without next; materialAt shallow/mud mapping; (G3) a mission pack
//          that always fails shows ESC: BACK TO TITLE, the final RELOAD resumes { part, carry } once from
//          sessionStorage, a stale stash is ignored, blocked sessionStorage is harmless.
// Exit code 0 = pass. Usage: node game/tools/engine-selftest.mjs [--shots /tmp/dir] [--only core|campaign|missions]
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
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;
const runs = section => !only || only === section;

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
  if (runs('core')) {
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
        // Phase F API: letterbox + focus + zoomPunch are cosmetic (view() stays on the follow camera), then release.
        {
            const p = g.ctx.player();
            c.snapTo(p?.x ?? 0, p?.y ?? 200);
            await wait(100);
            const before = c.debugInfo();
            c.letterbox(true, 100);
            c.focus((p?.x ?? before.x) + 400, p?.y ?? 200, 200);
            c.zoomPunch(0.1, 300);
            await wait(60);
            const zoomMid = c.cam.zoom;
            await wait(400);
            const mid = c.debugInfo(), vx = c.view().x;
            const px = g.ctx.player()?.x ?? 0;
            c.release(100);
            c.letterbox(false, 100);
            await wait(400);
            const end = c.debugInfo();
            out.api = { zoomMid, mid, end, viewX: vx, px,
                ok: zoomMid > 1 && mid.bars === 1 && mid.rx > mid.x + 1 && Math.abs(vx - mid.x) < 0.01 && px > mid.rx + 32 && px < mid.rx + w - 32
                    && end.bars === 0 && end.focus === 0 && end.zoom === 1 && Math.abs(end.rx - end.x) < 0.01 };
        }
        // Boss-intro cinematic: boss:intro shields the player and starts it; a hard cut (warp/respawn) ends it.
        g.ctx.events.emit('boss:intro', { name: 'TEST', x: (g.ctx.player()?.x ?? 0) + 300, y: 200 });
        await wait(100);
        const on = { cine: c.debugInfo().cine, shield: g.internals.damage.playerShield, bars: c.debugInfo().bars };
        c.snapTo(g.ctx.player()?.x ?? 0, g.ctx.player()?.y ?? 200);
        out.cine = { on, off: { cine: c.debugInfo().cine, shield: g.internals.damage.playerShield },
            ok: on.cine === 'intro' && on.shield && on.bars > 0 && c.debugInfo().cine === 'off' && !g.internals.damage.playerShield };
        return out;
    });
    check('camera: letterbox/focus/zoomPunch render only and release cleanly', cam.api.ok, cam.api);
    check('camera: boss:intro cinematic shields the player; snapTo() ends it', cam.cine.ok, cam.cine);
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
  }
    if (runs('campaign')) await campaignChecks();
    if (runs('missions')) await missionChecks();
    const errors = page.url().startsWith('http') ? await page.evaluate(() => window.__KBE.state().errors) : [];
    check('no page errors / __KBE errors', pageErrors.length === 0 && errors.length === 0, [...pageErrors, ...errors].slice(0, 5));
} catch (e) {
    check('run', false, String(e.message ?? e));
}
await browser.close();
await server.close();

console.log(fails.length ? `engine-selftest: ${fails.length} failure(s)` : 'engine-selftest: all passed');
process.exit(fails.length ? 1 : 0);

// ---------------------------------------------------------------- Phase E: campaign flow (parts, carry, progress, leaks)
async function campaignChecks() {
    const base = `http://127.0.0.1:${port}/?scene=Game&fast=1&mute=1&god=1&seed=731`;
    const pg = await browser.newPage({ viewport: { width: 1152, height: 648 } });
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    // Count window listeners (keyboard/gamepad/blur handlers must not pile up across restarts).
    await pg.addInitScript(() => {
        const live = new Map();
        window.__kbeWinLive = live;
        const add = window.addEventListener, rem = window.removeEventListener;
        window.addEventListener = function (t, f, o) { if (f) { const set = live.get(t) ?? new Set(); set.add(f); live.set(t, set); } return add.call(this, t, f, o); };
        window.removeEventListener = function (t, f, o) { live.get(t)?.delete(f); return rem.call(this, t, f, o); };
        localStorage.removeItem('kbe.progress.v1');
    });
    await pg.goto(base);
    await pg.waitForFunction(() => window.__KBE?.ready && window.__KBE.state().part === '1-1', null, { timeout: 30000 });

    // A probe on the Game scene's CREATE event snapshots leak metrics at the exact same point of every run.
    await pg.evaluate(() => {
        const game = window.__KBE.game;
        const emitterCount = em => em.eventNames().reduce((a, k) => a + em.listenerCount(k), 0);
        window.__kbeMetrics = () => {
            const g = game.scene.getScene('Game');
            const hud = game.scene.getScene('HUD');
            let win = 0;
            for (const set of (window.__kbeWinLive ?? new Map()).values()) win += set.size;
            const audio = window.__KBE.state().audio ?? {};
            return {
                part: g.ctx?.part?.id,
                bus: g.ctx.events.totalListeners(),
                updaters: g.internals.updaters.length,
                sceneEvents: emitterCount(g.sys.events),
                hudEvents: hud ? emitterCount(hud.sys.events) : 0,
                gameEvents: emitterCount(game.events),
                inputEvents: emitterCount(game.input.events),
                soundEvents: emitterCount(game.sound),
                win,
                voices: audio.voices ?? 0,
                loops: audio.loops ?? 0
            };
        };
        window.__kbeCreated = [];
        game.scene.getScene('Game').sys.events.on('create', () => { window.__kbeCreated.push(window.__kbeMetrics()); });
    });

    const gameState = () => pg.evaluate(() => {
        const g = window.__KBE.game.scene.getScene('Game');
        const st = g.ctx.state;
        return { part: g.ctx.part.id, map: g.ctx.part.map, score: st.score, lives: st.lives, bombs: st.bombs, weapon: st.weapon, ammo: Number.isFinite(st.ammo) ? st.ammo : 'Infinity', rescued: st.rescued, difficulty: st.difficulty, earlier: st.earlierParts.map(p => p.id), hud: g.scene.isActive('HUD') };
    });
    /** Clear the current part through the real flow and follow it to the next Game part (via PartClear when it exists). */
    const advance = async (to, viaCheat = true) => {
        if (viaCheat) await pg.evaluate(() => window.__KBE.cheats.clearPart());
        await pg.waitForFunction(t => {
            const s = window.__KBE.state();
            return s.scenes.includes('PartClear') || s.part === t;
        }, to, { timeout: 20000 });
        const pc = await pg.evaluate(() => {
            const game = window.__KBE.game;
            if (!game.scene.isActive('PartClear')) return null;
            const sc = game.scene.getScene('PartClear');
            const d = sc.sys.settings.data;
            const out = { from: d.from?.id, next: d.next?.id, result: d.result, carryAmmo: Number.isFinite(d.carry?.ammo) ? d.carry.ammo : 'Infinity', carryParts: d.carry?.parts?.map(p => p.id), hud: game.scene.isActive('HUD'), gameRunning: game.scene.isActive('Game') };
            // What the UI's PartClear does once its tally ends (contract): start the next part with the carry.
            sc.scene.start('Game', { part: d.next.id, carry: d.carry });
            return out;
        });
        await pg.waitForFunction(t => window.__KBE.ready && window.__KBE.state().part === t && window.__KBE.game.scene.isActive('Game'), to, { timeout: 20000 });
        await pg.waitForTimeout(300);
        return pc;
    };

    // ---- carry 1-1 → 1-2
    await pg.evaluate(() => {
        const g = window.__KBE.game.scene.getScene('Game');
        g.ctx.state.score = 12345; g.ctx.state.lives = 2; g.ctx.state.bombs = 7;
        window.__KBE.cheats.give('hmg', Infinity);
    });
    const s11 = await gameState();
    const pc1 = await advance('1-2');
    const s12 = await gameState();
    const progress1 = await pg.evaluate(() => JSON.parse(localStorage.getItem('kbe.progress.v1') ?? 'null'));
    check('campaign: 1-1 runs with the 1-1 map (or the old Mission 1 map fallback)', s11.part === '1-1' && /^(m1p1|map_stage1)$/.test(s11.map), s11);
    check('campaign: clearPart on 1-1 → ' + (pc1 ? 'PartClear (1-1 → 1-2) → Game 1-2' : 'Game 1-2 (no PartClear scene)'), s12.part === '1-2' && (!pc1 || (pc1.from === '1-1' && pc1.next === '1-2' && !pc1.hud && !pc1.gameRunning && pc1.result?.score === 12345)), { pc1, s12 });
    check('campaign: carry 1-1 → 1-2 keeps score, lives, bombs, weapon, Infinity ammo; 1-1 result recorded; HUD up',
        s12.score === 12345 && s12.lives === 2 && s12.bombs === 7 && s12.weapon === 'hmg' && s12.ammo === 'Infinity' && s12.earlier.join() === '1-1' && s12.hud, s12);
    check('campaign: progress saves 1-2 unlocked and the 1-1 best score', !!progress1 && progress1.unlocked.includes('1-2') && progress1.best['1-1'] === 12345, progress1);

    // ---- carry 1-2 → 1-3 with finite ammo, then final → Results
    await pg.evaluate(() => {
        const g = window.__KBE.game.scene.getScene('Game');
        window.__KBE.cheats.give('spread', 55);
        g.ctx.state.score += 1000;
    });
    await advance('1-3');
    const s13 = await gameState();
    check('campaign: carry 1-2 → 1-3 keeps finite ammo and the new score; 2 earlier parts', s13.part === '1-3' && s13.weapon === 'spread' && s13.ammo === 55 && s13.score === 13345 && s13.earlier.join() === '1-1,1-2', s13);
    await pg.evaluate(() => { window.__KBE.game.scene.getScene('Game').ctx.state.score += 500; window.__KBE.cheats.clearPart(); });
    await pg.waitForFunction(() => window.__KBE.game.scene.isActive('Results'), null, { timeout: 20000 });
    const res = await pg.evaluate(() => {
        const game = window.__KBE.game;
        const d = game.scene.getScene('Results').sys.settings.data;
        return { stage: d.stage, score: d.score, kills: d.kills, mission: d.mission, part: d.part, parts: d.parts?.map(p => ({ id: p.id, score: p.score })), timeMs: d.timeMs, accuracy: d.accuracy, hud: game.scene.isActive('HUD'), game: game.scene.isActive('Game') };
    });
    const progress2 = await pg.evaluate(() => JSON.parse(localStorage.getItem('kbe.progress.v1') ?? 'null'));
    check('campaign: clearing 1-3 (final) → Results with mission totals and a parts array',
        res.score === 13845 && res.mission === 1 && res.part === '1-3' && res.parts?.map(p => p.id).join() === '1-1,1-2,1-3'
        && res.parts[0].score === 12345 && res.parts[1].score === 1000 && res.parts[2].score === 500 && typeof res.accuracy === 'number' && res.timeMs > 0 && !res.hud && !res.game, res);
    check('campaign: progress has 1-1..1-3 (and, Phase G, 2-1) unlocked with bests', progress2?.unlocked?.join() === '1-1,1-2,1-3,2-1' && progress2.best['1-3'] === 500, progress2);

    // ---- Title → Game with no data after a run: fresh 1-1 (Phaser would otherwise replay the stale part + carry)
    await pg.evaluate(() => { const sm = window.__KBE.game.scene; sm.stop('Results'); sm.start('Game'); });
    await pg.waitForFunction(() => window.__KBE.state().part !== null && window.__KBE.game.scene.isActive('Game'), null, { timeout: 20000 });
    await pg.waitForTimeout(300);
    const fresh = await gameState();
    check('campaign: Game started without data after a run is a fresh 1-1', fresh.part === '1-1' && fresh.score === 0 && fresh.lives === 3 && fresh.weapon === 'pistol' && fresh.earlier.length === 0, fresh);

    // ---- real play path: kill the 1-1 boss (stage:clear from the level, no part/final in the payload) → next part
    {
        await pg.evaluate(() => {
            window.__kbeClear = null;
            window.__KBE.game.scene.getScene('Game').ctx.events.on('stage:clear', e => { window.__kbeClear = { ...e }; });
            window.__KBE.cheats.boss();
        });
        let spawned = true;
        // cheats.boss() lands just before the arena: walk right (real input) until the fight starts.
        try {
            await pg.waitForFunction(() => { window.__KBE.press('right', 300); return window.__KBE.state().boss?.hp > 0; }, null, { timeout: 25000, polling: 250 });
        } catch { spawned = false; }
        if (!spawned) {
            check('campaign: walking into the 1-1 boss arena spawns the boss', false, await pg.evaluate(() => ({ player: window.__KBE.state().player, cameraX: window.__KBE.state().cameraX })));
        } else {
            let cleared = true;
            try {
                await pg.waitForFunction(() => { window.__KBE.cheats.killEnemies(); return window.__kbeClear !== null; }, null, { timeout: 30000, polling: 250 });
            } catch { cleared = false; }
            const clr = await pg.evaluate(() => ({ clear: window.__kbeClear, boss: window.__KBE.state().boss }));
            let reached = false;
            if (cleared) { try { await advance('1-2', false); reached = true; } catch { reached = false; } }
            check('campaign: killing the 1-1 boss in play → stage:clear gets part 1-1, final false → Game 1-2', cleared && clr.clear?.part === '1-1' && clr.clear?.final === false && reached, clr);
        }
    }

    // ---- leaks: restart parts 3 more times through the real flow; metrics at every Game create must not grow
    await pg.evaluate(() => window.__KBE.cheats.part('1-1'));
    await pg.waitForFunction(() => window.__KBE.state().part === '1-1' && window.__KBE.game.scene.isActive('Game'), null, { timeout: 20000 });
    await pg.waitForTimeout(800);
    await pg.evaluate(() => { window.__kbeCreated.length = 0; });
    const settled = [];
    for (let i = 0; i < 3; i++) {
        await pg.evaluate(() => window.__KBE.cheats.part('1-1', true));
        await pg.waitForFunction(n => window.__kbeCreated.length >= n, i + 1, { timeout: 20000 });
        await pg.waitForTimeout(1200);
        settled.push(await pg.evaluate(() => window.__kbeMetrics()));
    }
    const created = await pg.evaluate(() => window.__kbeCreated.slice());
    const keys = ['bus', 'updaters', 'sceneEvents', 'hudEvents', 'gameEvents', 'inputEvents', 'soundEvents', 'win'];
    const grow = (a, b, ks) => ks.filter(k => b[k] > a[k]);
    const createdGrowth = grow(created[0], created[2], keys);
    const settledGrowth = grow(settled[0], settled[2], ['sceneEvents', 'hudEvents', 'gameEvents', 'inputEvents', 'soundEvents', 'win', 'loops']);
    check('campaign: no listener/updater growth across 3 part restarts (at create)', created.length === 3 && createdGrowth.length === 0 && created[1].bus === created[2].bus, { createdGrowth, created });
    check('campaign: no emitter/window/audio-loop growth across 3 part restarts (settled)', settledGrowth.length === 0 && settled[2].voices <= settled[0].voices + 4, { settledGrowth, settled });
    // the flow path restarts the same way (Game → Game): one more through clearPart, compared with the first
    const errors = [...errs, ...(await pg.evaluate(() => window.__KBE.state().errors))];
    check('campaign: no page errors during the part flow', errors.length === 0, errors.slice(0, 5));
    if (shots) await pg.screenshot({ path: path.join(shots, 'selftest-campaign.png') });
    await pg.close();

    // ---- ?part= and no localStorage at all
    const p2 = await browser.newPage({ viewport: { width: 1152, height: 648 } });
    const errs2 = [];
    p2.on('pageerror', e => errs2.push(e.message));
    await p2.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } });
    });
    await p2.goto(`${base}&part=1-2`);
    await p2.waitForFunction(() => window.__KBE?.ready && window.__KBE.state().part !== null, null, { timeout: 30000 });
    const q = await p2.evaluate(() => window.__KBE.state().part);
    await p2.evaluate(() => window.__KBE.cheats.clearPart());
    await p2.waitForFunction(() => window.__KBE.state().part === '1-3' || window.__KBE.state().scenes.includes('PartClear'), null, { timeout: 20000 });
    const errors2 = [...errs2, ...(await p2.evaluate(() => window.__KBE.state().errors))].filter(e => !/storage blocked/.test(e));
    check('campaign: ?part=1-2 starts 1-2; clearing it with localStorage blocked still advances, no errors', q === '1-2' && errors2.length === 0, { q, errors: errors2.slice(0, 3) });
    await p2.close();
}

// ---------------------------------------------------------------- Phase G: per-mission packs and the mission chain
async function missionChecks() {
    const base = `http://127.0.0.1:${port}/?fast=1&mute=1&god=1&seed=732`;
    const open = async (query, setup) => {
        const pg = await browser.newPage({ viewport: { width: 1152, height: 648 } });
        const errs = [], packs = [];
        pg.on('pageerror', e => errs.push(e.message));
        pg.on('request', r => { const m = /\/assets\/packs\/([\w.]+\.m\d+)\.json$/.exec(new URL(r.url()).pathname); if (m) packs.push(m[1]); });
        await pg.addInitScript(() => {
            localStorage.removeItem('kbe.progress.v1');
            // Record Preload starts and the ready flag at each one (mission mode must hold ready=false).
            window.__kbePreloads = [];
            const iv = setInterval(() => {
                const g = window.__KBE?.game; if (!g?.scene?.getScene) return;
                const pre = g.scene.getScene('Preload'); if (!pre) return;
                clearInterval(iv);
                pre.sys.events.on('start', () => window.__kbePreloads.push({ data: pre.sys.settings.data?.missions ?? null, ready: window.__KBE.ready }));
                pre.sys.events.on('create', () => { const t = pre.children.list.find(o => o.type === 'Text'); window.__kbePreloadTitle = t?.text; });
            }, 5);
        });
        if (setup) await setup(pg);
        await pg.goto(`${base}&${query}`);
        return { pg, errs, packs };
    };
    const waitPart = (pg, id) => pg.waitForFunction(t => window.__KBE?.ready && window.__KBE.state().part === t && window.__KBE.game.scene.isActive('Game'), id, { timeout: 30000 });
    const info = pg => pg.evaluate(() => {
        const g = window.__KBE.game, gs = g.scene.getScene('Game'), st = gs.ctx.state;
        const anims = Object.values(g.anims.anims.entries);
        return { part: gs.ctx.part.id, missions: window.__KBE.state().missionPacks, probe: g.cache.json.exists('engine_m2_probe'),
            emptyAnims: anims.filter(a => a.frames.length === 0).map(a => a.key).slice(0, 5), anims: anims.length,
            preloads: window.__kbePreloads, title: window.__kbePreloadTitle,
            score: st.score, lives: st.lives, bombs: st.bombs, weapon: st.weapon, ammo: Number.isFinite(st.ammo) ? st.ammo : 'Infinity', earlier: st.earlierParts.map(p => p.id),
            errors: window.__KBE.state().errors };
    });
    const M2 = ['engine', 'player', 'enemies', 'gatorgeddon', 'level', 'fx', 'ui', 'imagegen'].map(t => `${t}.m2`);

    // ---- ?part=2-1 direct start (engine.m2.json slowed down so the mission bar can be seen and ready checked)
    {
        let release;
        const gate = new Promise(r => { release = r; });
        const { pg, errs, packs } = await open('scene=Game&part=2-1', pg => pg.route('**/assets/packs/engine.m2.json', async route => { await gate; await route.continue(); }));
        await pg.waitForFunction(() => window.__KBE?.game?.scene.isActive('Preload') && window.__kbePreloads.length >= 2, null, { timeout: 30000 });
        await pg.waitForTimeout(300);
        const during = await pg.evaluate(() => ({ ready: window.__KBE.ready, scenes: window.__KBE.state().scenes, title: window.__kbePreloadTitle }));
        if (shots) await pg.screenshot({ path: path.join(shots, 'selftest-mission-loading.png') });
        release();
        await waitPart(pg, '2-1');
        await pg.waitForTimeout(400);
        const a = await info(pg);
        const m2fetched = M2.every(n => packs.filter(p => p === n).length === 1);
        check('missions: ?part=2-1 boots through Preload mission mode (MISSION 2 title, ready=false while loading)', !during.ready && during.scenes.includes('Preload') && /MISSION 2/.test(during.title ?? '') && a.preloads.length === 2 && a.preloads[1].data?.join() === '2', { during, preloads: a.preloads });
        check('missions: every <team>.m2.json fetched once, engine.m2 probe in cache, missionPacks [1,2], no empty anims', m2fetched && a.probe && a.missions?.join() === '1,2' && a.emptyAnims.length === 0 && a.part === '2-1', { packs, ...a, preloads: undefined });

        // later parts and retries: cached, no refetch, no Preload pass
        await pg.evaluate(() => window.__KBE.cheats.part('2-2'));
        await waitPart(pg, '2-2');
        await pg.evaluate(() => window.__KBE.cheats.part('2-2'));
        await pg.waitForTimeout(600);
        await waitPart(pg, '2-2');
        const b = await info(pg);
        check('missions: cheats.part(2-2) and a retry reuse the cache (no refetch, no Preload pass)', packs.length === M2.length && b.preloads.length === 2 && b.part === '2-2', { packs: packs.length, preloads: b.preloads.length });
        // materials (static mapping, no map needed)
        const mat = await pg.evaluate(() => {
            const g = window.__KBE.game.scene.getScene('Game');
            return import('/src/core/physics.ts').then(m => ['shallow', 'mud', 'ice', 'wood', 'bogus', undefined].map(x => m.terrainMaterial(x)));
        });
        check('missions: materialAt mapping shallow→water, mud→mud, ice→snow, wood→wood, unknown→dirt', mat.join() === 'water,mud,snow,wood,dirt,dirt', mat);
        const errors = [...errs, ...b.errors];
        check('missions: no page errors on mission-2 starts', errors.length === 0, errors.slice(0, 5));
        await pg.close();
    }

    // ---- Title-style start, and a mission pack aborted once (Boot-style pack retry)
    {
        let aborted = 0;
        const { pg, errs, packs } = await open('scene=Title', pg => pg.route('**/assets/packs/player.m2.json', route => { if (aborted++ === 0) return route.abort('failed'); return route.continue(); }));
        await pg.waitForFunction(() => window.__KBE?.ready && window.__KBE.game.scene.isActive('Title'), null, { timeout: 30000 });
        const before = packs.length;
        await pg.evaluate(() => { const sm = window.__KBE.game.scene; for (const s of sm.getScenes(true)) sm.stop(s.scene.key); sm.start('Game', { part: '2-2' }); });
        await waitPart(pg, '2-2');
        const a = await info(pg);
        const errors = [...errs, ...a.errors];
        check('missions: Title → scene.start(Game, {part: 2-2}) loads mission 2; player.m2 aborted once is refetched', before === 0 && aborted === 2 && a.missions?.join() === '1,2' && a.part === '2-2' && errors.length === 0, { before, aborted, missions: a.missions, errors: errors.slice(0, 3) });
        await pg.close();
    }

    // ---- ?enemytest= fixture in part 1-1 also loads the mission packs
    {
        const { pg, errs } = await open('scene=Game&enemytest=gnat');
        await waitPart(pg, '1-1');
        const a = await info(pg);
        check('missions: ?enemytest= in 1-1 loads the mission-2 packs', a.missions?.join() === '1,2' && a.probe, { missions: a.missions, errs: errs.slice(0, 3) });
        await pg.close();
    }

    // ---- the mission chain: 1-3 cleared → Results { next: 2-1, carry } → Game 2-1 (via the mission loader)
    {
        const { pg, errs, packs } = await open('scene=Game&part=1-3');
        await waitPart(pg, '1-3');
        const m1 = packs.length;
        await pg.evaluate(() => {
            const g = window.__KBE.game.scene.getScene('Game');
            g.ctx.state.score = 4242; g.ctx.state.lives = 2; g.ctx.state.bombs = 5;
            window.__KBE.cheats.give('spread', 40);
            window.__KBE.cheats.clearPart();
        });
        await pg.waitForFunction(() => window.__KBE.game.scene.isActive('Results'), null, { timeout: 20000 });
        const res = await pg.evaluate(() => {
            const d = window.__KBE.game.scene.getScene('Results').sys.settings.data;
            return { mission: d.mission, next: d.next?.id, nextMission: d.next?.mission, carry: d.carry && { ...d.carry, ammo: Number.isFinite(d.carry.ammo) ? d.carry.ammo : 'Infinity' }, parts: d.parts?.map(p => p.id) };
        });
        const prog = await pg.evaluate(() => JSON.parse(localStorage.getItem('kbe.progress.v1') ?? 'null'));
        check('missions: clearing 1-3 → Results carries next 2-1 and a carry (score/lives/bombs/weapon/ammo, parts reset)',
            res.mission === 1 && res.next === '2-1' && res.nextMission === 2 && res.carry?.score === 4242 && res.carry.lives === 2 && res.carry.bombs === 5 && res.carry.weapon === 'spread' && res.carry.ammo === 40 && res.carry.parts?.length === 0 && res.parts?.join() === '1-3', res);
        check('missions: clearing 1-3 unlocks 2-1', !!prog?.unlocked?.includes('2-1'), prog);
        // What Results' CONTINUE TO MISSION 2 does (UI contract).
        await pg.evaluate(() => { const sc = window.__KBE.game.scene.getScene('Results'); const d = sc.sys.settings.data; sc.scene.start('Game', { part: d.next.id, carry: d.carry }); });
        await waitPart(pg, '2-1');
        await pg.waitForTimeout(300);
        const a = await info(pg);
        check('missions: Results → Game { part: next.id, carry } starts 2-1 through the loader with the carried run', a.part === '2-1' && a.score === 4242 && a.lives === 2 && a.bombs === 5 && a.weapon === 'spread' && a.ammo === 40 && a.earlier.length === 0 && packs.length - m1 === M2.length, { ...a, preloads: a.preloads.length, fetched: packs.length - m1 });
        // last mission: 2-3 → Results without next
        await pg.evaluate(() => window.__KBE.cheats.part('2-3', true));
        await waitPart(pg, '2-3');
        await pg.evaluate(() => window.__KBE.cheats.clearPart());
        await pg.waitForFunction(() => window.__KBE.game.scene.isActive('Results'), null, { timeout: 20000 });
        const last = await pg.evaluate(() => { const d = window.__KBE.game.scene.getScene('Results').sys.settings.data; return { mission: d.mission, part: d.part, next: d.next ?? null, carry: d.carry ?? null }; });
        check('missions: clearing 2-3 (last mission) → Results without next/carry', last.mission === 2 && last.part === '2-3' && last.next === null && last.carry === null, last);
        const errors = [...errs, ...(await pg.evaluate(() => window.__KBE.state().errors))];
        check('missions: no page errors in the mission chain', errors.length === 0, errors.slice(0, 5));
        await pg.close();
    }

    // ---- G3: a mission pack that always fails. Error screen offers ESC: BACK TO TITLE; the final RELOAD stashes
    // { part, carry } in sessionStorage and the reloaded page resumes it once; a stale stash is ignored.
    {
        let blocked = true;
        const { pg, errs } = await open('scene=Game&part=1-3', pg => pg.route('**/assets/packs/fx.m2.json', route => blocked ? route.abort('failed') : route.continue()));
        await waitPart(pg, '1-3');
        const startM2 = () => pg.evaluate(() => {
            const g = window.__KBE.game.scene.getScene(window.__KBE.game.scene.isActive('Game') ? 'Game' : 'Title');
            const carry = { score: 777, lives: 1, bombs: 4, weapon: 'spread', ammo: 33, rescued: 2, difficulty: 'arcade', parts: [] };
            g.scene.start('Game', { part: '2-1', carry });
        });
        const errorScreen = () => pg.waitForFunction(() => {
            const pre = window.__KBE.game.scene.getScene('Preload');
            return window.__KBE.game.scene.isActive('Preload') && window.__KBE.state().loadErrors?.length > 0 && pre.children.list.some(o => o.type === 'Text' && /PRESS ENTER/.test(o.text));
        }, null, { timeout: 30000 });
        const texts = () => pg.evaluate(() => window.__KBE.game.scene.getScene('Preload').children.list.filter(o => o.type === 'Text').map(o => o.text));
        await startM2();
        await errorScreen();
        const t1 = await texts();
        if (shots) await pg.screenshot({ path: path.join(shots, 'selftest-mission-error.png') });
        await pg.keyboard.press('Escape');
        await pg.waitForFunction(() => window.__KBE.ready && window.__KBE.game.scene.isActive('Title') && !window.__KBE.game.scene.isActive('Preload'), null, { timeout: 10000 });
        const back = await pg.evaluate(() => ({ errs: window.__KBE.state().loadErrors.length, missions: window.__KBE.state().missionPacks }));
        check('missions: a mission pack that always fails → error screen with ESC / B: BACK TO TITLE; Esc reaches the Title (ready, no loadErrors)',
            t1.some(t => /BACK TO TITLE/.test(t)) && t1.some(t => /RETRY/.test(t)) && back.errs === 0 && back.missions?.join() === '1', { t1, back });

        // From the Title again; retry until the prompt turns into RELOAD, then un-block and reload.
        await startM2();
        await errorScreen();
        for (let i = 0; i < 4 && !(await texts()).some(t => /RELOAD/.test(t)); i++) {
            await pg.keyboard.press('Enter');
            await pg.waitForTimeout(200);
            await errorScreen();
        }
        const t2 = await texts();
        blocked = false;
        await Promise.all([pg.waitForEvent('load', { timeout: 30000 }), pg.keyboard.press('Enter')]);
        await waitPart(pg, '2-1');
        await pg.waitForTimeout(300);
        const r = await info(pg);
        const left = await pg.evaluate(() => sessionStorage.getItem('kbe.missionResume.v1'));
        check('missions: after 3 retries RELOAD resumes 2-1 with the carried run (score/lives/bombs/weapon/ammo), stash cleared',
            t2.some(t => /RELOAD/.test(t)) && r.part === '2-1' && r.score === 777 && r.lives === 1 && r.bombs === 4 && r.weapon === 'spread' && r.ammo === 33 && left === null,
            { t2, part: r.part, score: r.score, lives: r.lives, bombs: r.bombs, weapon: r.weapon, ammo: r.ammo, left });

        // A stale stash (11 min old) is ignored and cleared: the reload routes normally (?part=1-3).
        await pg.evaluate(() => sessionStorage.setItem('kbe.missionResume.v1', JSON.stringify({ t: Date.now() - 11 * 60 * 1000, part: '2-2', carry: { score: 1, lives: 1, bombs: 1, weapon: 'pistol', ammo: -1, rescued: 0, difficulty: 'arcade', parts: [] } })));
        await pg.reload();
        await waitPart(pg, '1-3');
        const stale = await pg.evaluate(() => ({ left: sessionStorage.getItem('kbe.missionResume.v1'), score: window.__KBE.game.scene.getScene('Game').ctx.state.score }));
        check('missions: a stale resume stash is ignored and cleared', stale.left === null && stale.score !== 1, stale);
        const errors = [...errs, ...(await pg.evaluate(() => window.__KBE.state().errors))];
        check('missions: no page errors around the mission load-error screen', errors.length === 0, errors.slice(0, 5));
        await pg.close();
    }

    // ---- G3: the stash helpers without sessionStorage (blocked) never throw and report nothing
    {
        const { pg, errs } = await open('scene=Title', pg => pg.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('storage blocked'); } })));
        await pg.waitForFunction(() => window.__KBE?.ready && window.__KBE.game.scene.isActive('Title'), null, { timeout: 30000 });
        const r = await pg.evaluate(() => import('/src/core/missionPacks.ts').then(m => ({ stash: m.stashMissionResume({ part: '2-1' }), take: m.takeMissionResume() })));
        const errors = [...errs, ...(await pg.evaluate(() => window.__KBE.state().errors))].filter(e => !/storage blocked/.test(e));
        check('missions: resume stash without sessionStorage: no throw, boots normally', r.stash === false && r.take === null && errors.length === 0, { r, errors: errors.slice(0, 3) });
        await pg.close();
    }
}
