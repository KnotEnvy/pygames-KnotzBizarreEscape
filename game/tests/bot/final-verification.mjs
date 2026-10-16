#!/usr/bin/env node
// Final verification of the Phase C bug repros against Phase D. All mutations are labeled fixtures.
import path from 'node:path';
import { artifactDirectory, openSession, requireReady, newReport, saveReport } from '../helpers/runtime.mjs';
const directory = await artifactDirectory('final-verification');
const report = newReport('Phase D final bug verification', { seed: 731 });
report.checks = []; report.cases = [];
let session, serial = 0;
const state = () => session.page.evaluate(() => window.__KBE.state());
const wait = ms => session.page.waitForTimeout(ms);
async function check(id, ok, detail) {
  report.checks.push({ id, ok: Boolean(ok), detail });
  if (!ok) { report.status = 'failed'; report.problems.push(id); }
}
async function shot(label) {
  const file = `${String(serial++).padStart(3, '0')}-${label}.png`;
  await session.page.screenshot({ path: path.join(directory, file) });
  report.captures.push({ label, file, state: await state() });
}
async function boot(query) {
  query = `scene=Game&fast=1&mute=1&god=1&seed=731&${query}`;
  if (!session) session = await openSession(query, report);
  else await session.page.goto(`${new URL(session.page.url()).origin}/?${query}`);
  await requireReady(session.page);
  await session.page.evaluate(() => {
    window.__QACTX = window.__KBE.game.scene.getScene('Game').ctx;
    window.__QAEVENTS = [];
    for (const key of ['boss:defeated','stage:clear','camera:unlock','game:continue'])
      window.__QACTX.events.on(key, payload => window.__QAEVENTS.push({ key, at: performance.now(), payload }));
  });
  await wait(400);
}
async function clearActors() {
  await session.page.evaluate(() => {
    const c = window.__QACTX, owners = new Set();
    c.damage.forEach(h => { if (h.team === 'enemy' && h.owner) owners.add(h.owner); });
    for (const owner of owners) owner.destroy();
    c.projectiles.clear('enemy');
  });
}
try {
  await boot('x=32');
  for (const x of [32, 6680]) {
    await session.page.evaluate(x => window.__KBE.cheats.warp(x), x);
    await wait(500);
    const samples = [];
    for (let i = 0; i < 3; i++) {
      await session.page.evaluate(() => window.__QACTX.fx.shake(4)); await wait(40);
      samples.push(await session.page.evaluate(() => {
        const c = window.__KBE.game.scene.getScene('Game').cameras.main;
        return { x: c.scrollX, y: c.scrollY, width: c.width, height: c.height,
          shake: { x: c.shakeEffect._offsetX, y: c.shakeEffect._offsetY } };
      }));
      await shot(`E02-shake-${x}-${i}`); await wait(350);
    }
    await check(`E02 camera stays covered at ${x}`, samples.every(s => s.x >= 0 && s.y >= 0 && s.x + s.width <= 6720 && s.y + s.height <= 384), samples);
  }
  await boot('x=1900'); await shot('L03-ground-1900');
  await session.page.evaluate(() => window.__KBE.cheats.warp(2200)); await wait(600); await shot('L03-ground-2200');
  // Same factories and original authored properties as Phase C; no injected AI state.
  await boot('x=5800'); await clearActors();
  await session.page.evaluate(() => {
    const c = window.__QACTX;
    c.spawn('enemy','grunt',{idle:'sleep',patrol:0,facing:1},5860,336);
    c.spawn('enemy','grunt',{idle:'flee',from:'door',patrol:0,facing:1},5950,336);
    c.spawn('enemy','turret',{mount:'pedestal'},6040,336);
  });
  await wait(200); const entry = (await state()).enemyAI; await shot('N01-entry-sleep-pedestal');
  await wait(500); const authored = (await state()).enemyAI; await shot('N01-original-700ms');
  await check('N01 authored properties', entry.some(e => e.idle === 'sleep' && e.state === 'sleep') && entry.some(e => e.idle === 'flee' && e.state === 'entry') && authored.some(e => e.idle === 'flee' && e.state === 'panic') && authored.some(e => e.mount === 'pedestal'), { entry, authored });
  await boot('x=3080');
  await session.page.keyboard.down('ArrowRight'); await wait(2000); await session.page.keyboard.up('ArrowRight');
  const descent = [];
  for (let i = 0; i < 12; i++) { await wait(500); descent.push({ cameraX: (await state()).cameraX, enemies: (await state()).enemyAI }); }
  await shot('N03-bridge-after-6s');
  const original = descent.map(s => s.enemies.find(e => e.x === 3112));
  await check('N03 x3112 airborne actor advances or cleans up', original.some(e => !e || e.state !== 'descent') || new Set(original.map(e => e?.y)).size > 1, descent);
  // The original actor is already absent in the current map run. Exercise the exact
  // 88 px culling-band condition too, so absence alone cannot certify the AI fix.
  await session.page.evaluate(() => {
    window.__QADESCENT = window.__QACTX.spawn('enemy','paratrooper',{patrol:0}, window.__QACTX.camera.leftEdge() - 88, 183.21);
  });
  const edgeDescent = [];
  for (let i = 0; i < 5; i++) {
    await wait(250);
    edgeDescent.push(await session.page.evaluate(() => ({ active: window.__QADESCENT.active, y: window.__QADESCENT.y, state: window.__QADESCENT.state })));
  }
  await shot('N03-exact-88px-band-fixture');
  await check('N03 airborne lifecycle runs in 88px band', edgeDescent.some(s => !s.active || s.state !== 'descent') || new Set(edgeDescent.map(s => s.y)).size > 1, edgeDescent);
  await boot('x=5800'); await clearActors();
  for (let i = 0; i < 3; i++) {
    await session.page.evaluate(() => window.__KBE.cheats.kill());
    if (i < 2) await session.page.waitForFunction(() => window.__KBE.state().player.alive, {}, { timeout: 6000 });
  }
  await session.page.waitForFunction(() => window.__KBE.game.scene.isActive('Continue'));
  await wait(100); await shot('E03-continue-offer');
  await session.page.keyboard.press('Enter', { delay: 100 }); await wait(400); await shot('E03-original-enter-100ms');
  const continued = await state();
  await check('E03 Continue enters playable Game', continued.scene === 'Game' && continued.player.alive && continued.player.lives === 3 && continued.score === 0 && await session.page.evaluate(() => !window.__KBE.game.scene.isPaused('Game')), continued);
  await boot('x=6350&enemytest=boss'); await wait(1500); await shot('U01-full-400');
  await session.page.evaluate(() => window.__KBE_ENEMYTEST.bossHp(200)); await wait(1200); await shot('U01-half-200');
  await session.page.evaluate(() => window.__KBE_ENEMYTEST.bossHp(12)); await wait(1200); await shot('U01-sliver-12');
  const bar = await session.page.evaluate(() => { const h = window.__KBE.game.scene.getScene('HUD'); return { frame: h.bossBox.list.indexOf(h.bossFrame), fill: h.bossBox.list.indexOf(h.bossFill), visible: h.bossFill.visible, hp: h.bossHp }; });
  await check('U01 fill above opaque frame', bar.fill > bar.frame && bar.visible && bar.hp === 12, bar);
  await session.page.evaluate(() => window.__KBE_ENEMYTEST.bossHp(90)); await wait(300);
  const corners = await session.page.evaluate(() => {
    const b = window.__KBE.state().boss;
    // Phase C's silhouette rectangle was x-76, y-116, 152x116. Re-test its empty corner,
    // rather than the corner of the new core hurtbox (which is intentionally damageable).
    const point = { x: b.x - 74, y: b.y - 114 }, before = b.hp;
    const hit = window.__KBE_ENEMYTEST.hitAt(point.x,point.y,1,'bullet',1,0);
    const after = window.__KBE.state().boss.hp;
    const marker = window.__QACTX.scene.add.graphics().setDepth(999);
    marker.lineStyle(1,0x00ffff).strokeCircle(point.x,point.y,3);
    return { point, hit, before, after, shapes: b.hurtboxes };
  });
  await shot('N02-original-empty-corner-cyan-marker');
  await check('N02 original empty corner misses', !corners.hit && corners.before === corners.after, corners);
  // At the far-right legal ground position: no movement after initiating the real defeat chain.
  await session.page.evaluate(() => window.__KBE.cheats.warp(6680)); await wait(2000);
  await session.page.evaluate(() => {
    window.__QAFINAL = [];
    const c = window.__QACTX;
    c.onUpdate(() => { const h = window.__KBE.game.scene.getScene('HUD'); window.__QAFINAL.push({ at: performance.now(), x: c.player()?.x, boss: window.__KBE.state().boss?.state, over: h.missionOver, go: h.go?.visible, goLeft: h.goLeft }); });
    window.__KBE_ENEMYTEST.bossHp(0);
  });
  await shot('L01-far-right-death-chain');
  await session.page.waitForFunction(() => window.__KBE.state().boss?.state === 'defeated' || window.__KBE.state().scene === 'Results', {}, { timeout: 15000 });
  await shot('lead-boss-unlock-no-GO'); await wait(1200); await shot('L01-no-movement-complete');
  await session.page.waitForFunction(() => window.__KBE.state().scene === 'Results', {}, { timeout: 12000 });
  await session.page.waitForFunction(() => window.__KBE.game.scene.getScene('Results').done, {}, { timeout: 12000 });
  await wait(400);
  await shot('L01-results');
  const ending = await session.page.evaluate(() => ({ events: window.__QAEVENTS, samples: window.__QAFINAL, state: window.__KBE.state() }));
  await check('L01 completes at right edge without movement', ending.events.filter(e => e.key === 'stage:clear').length === 1 && ending.state.scene === 'Results', ending);
  const afterDefeat = ending.samples.filter(s => s.over);
  await check('Lead GO suppressed from boss defeat through completion', afterDefeat.length > 0 && afterDefeat.every(s => !s.go && s.goLeft <= 0), { frames: afterDefeat.length, violations: afterDefeat.filter(s => s.go || s.goLeft > 0), events: ending.events });
} catch (error) {
  report.status = 'failed'; report.problems.push(error.stack ?? String(error));
  if (session) await shot('unexpected-failure').catch(() => {});
} finally {
  if (session) await session.close();
  await saveReport(directory, report);
}
process.exitCode = report.status === 'passed' ? 0 : 1;
