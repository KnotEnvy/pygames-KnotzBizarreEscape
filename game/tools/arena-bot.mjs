// Bot: drive into an arena with god+HMG, shoot the nearest enemy, log arena state; report stalls.
import { createServer } from 'vite';
import path from 'node:path';
const root = '/home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape/game';
process.env.LD_LIBRARY_PATH = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
const { chromium } = await import(path.join(root, 'node_modules/@playwright/test/index.mjs'));
const startX = process.argv[2] || '3080', maxSec = Number(process.argv[3] || 90);
const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/?scene=Game&fast=1&x=${startX}&god=1&mute=1&debug=1`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(url); await page.waitForTimeout(3000);
await page.evaluate(() => window.__KBE.cheats.give('hmg'));
const held = new Set();
const set = async (k, on) => { if (on && !held.has(k)) { held.add(k); await page.keyboard.down(k); } else if (!on && held.has(k)) { held.delete(k); await page.keyboard.up(k); } };
let last = ''; let lastPx = 0, stuck = 0;
for (let t = 0; t < maxSec * 5; t++) {
  const s = await page.evaluate(() => {
    const sc = window.__KBE.game.scene.getScene('Game');
    const st = window.__KBE.state();
    const cam = sc.cameras.main;
    const en = sc.children.list.filter(o => o.active && typeof o.snapshot === 'function' && o.kind && o.hp > 0).map(o => ({ k: o.kind, x: Math.round(o.x), y: Math.round(o.y), st: o.state }));
    return { boss: st.bossHp, bossPhase: st.bossPhase, scene: st.scene, arena: st.arena, px: Math.round(st.player?.x ?? 0), py: Math.round(st.player?.y ?? 0), camX: Math.round(cam.scrollX), en, stage: st.stage ?? st.scene };
  });
  const line = JSON.stringify({ scene: s.scene, boss: s.boss, ph: s.bossPhase, arena: s.arena?.active ? s.arena : s.arena?.arenas, px: s.px, camX: s.camX, en: s.en });
  if (t % 10 === 0 || line !== last) { if (t % 20 === 0) console.log(`t=${(t/5).toFixed(1)}`, line); }
  last = line;
  const near = s.en.filter(e => e.x > s.camX - 8 && e.x < s.camX + 392).sort((a, b) => Math.abs(a.x - s.px) - Math.abs(b.x - s.px))[0];
  const locked = s.arena && s.arena.active;
  if (Math.abs(s.px - lastPx) < 2 && held.has('ArrowRight') !== held.has('ArrowLeft') && !held.has('ShiftLeft')) stuck++; else stuck = 0;
  lastPx = s.px;
  if (stuck >= 4) { stuck = 0; await page.keyboard.down('KeyZ'); await page.waitForTimeout(250); await page.keyboard.up('KeyZ'); }
  if (near) {
    const dx = near.x - s.px, dy = near.y - s.py;
    const right = dx > 0;
    const flying = dy < -40;
    if ((flying && Math.abs(dx) > 50) || (!flying && (Math.abs(dy) > 24 || Math.abs(dx) > 150))) {
      // walk under it, firing forward
      await set('ShiftLeft', false); await set('ArrowUp', false);
      await set('ArrowRight', right); await set('ArrowLeft', !right);
      await set('KeyX', t % 2 === 0);
    } else {
      await set('ShiftLeft', true);
      await set('ArrowUp', flying);
      await set('ArrowRight', !flying && right); await set('ArrowLeft', !flying && !right);
      await set('KeyX', t % 2 === 0);
    }
  } else {
    await set('ShiftLeft', false); await set('KeyX', false); await set('ArrowUp', false); await set('ArrowLeft', false);
    await set('ArrowRight', true);
  }
  if (process.env.STOP && s.arena?.arenas?.includes(process.env.STOP)) { console.log('REACHED', process.env.STOP, 'at t', t/5); break; }
  if (s.arena?.arenas?.includes('boss:done')) { console.log('BOSS ARENA DONE at t', t/5); break; }
  if (t === 150) await page.screenshot({ path: '/tmp/kbe-lead/bot-30s.png' });
  await page.waitForTimeout(200);
}
console.log('final', JSON.stringify(await page.evaluate(() => window.__KBE.state().arena)));
await browser.close(); await server.close();
