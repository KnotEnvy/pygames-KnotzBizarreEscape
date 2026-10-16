#!/usr/bin/env node
// Engine regression self-test (Phase C review E1/E2). Starts its own Vite server on a free port (like shot.mjs),
// boots `?enemytest=boss` and checks, in the real game:
//   anims  every global animation has frames, and every frame resolves to a real texture frame (no zero-frame
//          anims from Phaser's createFromAseprite, which `exists()` but throw on play()).
//   E1     a player projectile kills MOOSEZILLA inside ProjectileSystem.update() while enemy bullets are live
//          (boss death calls projectiles.clear('enemy') re-entrantly): no error, no hole in the live list, no
//          projectile in the pool twice, two later spawns hand out distinct projectiles.
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
    const errors = await page.evaluate(() => window.__KBE.state().errors);
    check('no page errors / __KBE errors', pageErrors.length === 0 && errors.length === 0, [...pageErrors, ...errors].slice(0, 5));
} catch (e) {
    check('run', false, String(e.message ?? e));
}
await browser.close();
await server.close();
console.log(fails.length ? `engine-selftest: ${fails.length} failure(s)` : 'engine-selftest: all passed');
process.exit(fails.length ? 1 : 0);
