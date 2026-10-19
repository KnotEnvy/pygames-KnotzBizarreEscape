// Flow check: walk right from x (no warps), clear each arena with killEnemies (normal death path), fight the boss
// the same way, and report arena states, boss phases, clear and results. Usage: node tools/flow-check.mjs [x] [maxSec]
import { createServer } from 'vite';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.env.LD_LIBRARY_PATH = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
const { chromium } = await import(path.join(root, 'node_modules/@playwright/test/index.mjs'));
const startX = process.argv[2] || '5000', maxSec = Number(process.argv[3] || 150);
const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?scene=Game&fast=1&x=${startX}&god=1&mute=1&debug=1`);
await page.waitForTimeout(3000);
let prev = '', shots = 0, lastPx = 0, stuck = 0;
await page.keyboard.down('ArrowRight');
for (let t = 0; t < maxSec * 4; t++) {
  const s = await page.evaluate(() => { const st = window.__KBE.state(); return { scene: st.scene, scenes: st.scenes, px: st.player?.x, arena: st.arena, bossHp: st.bossHp, phase: st.bossPhase, prompt: st.hud?.prompt, go: st.hud?.go }; });
  const key = JSON.stringify([s.scene, s.arena?.arenas ?? s.arena?.active, s.arena?.wave, s.phase, s.go]);
  if (key !== prev) { console.log(`t=${(t / 4).toFixed(1)}s`, JSON.stringify(s)); prev = key; }
  if (!s.arena?.active && Math.abs((s.px ?? 0) - lastPx) < 2) stuck++; else stuck = 0;
  lastPx = s.px ?? 0;
  if (stuck >= 10 && !(s.arena?.arenas ?? '').includes('boss:boss')) { stuck = 0; console.log('  (terrain hop: warp +64 from', s.px, ')'); await page.evaluate(x => window.__KBE.cheats.warp(x), (s.px ?? 0) + 64); }
  if (t % 6 === 3) await page.keyboard.press('KeyZ', { delay: 200 });
  if (s.arena?.active && t % 6 === 0) await page.evaluate(() => window.__KBE.cheats.killEnemies());
  if (s.scene && !['Game', 'HUD'].includes(s.scene) && !s.scenes?.includes('Game')) { console.log('LEFT GAME → ', s.scene); await page.screenshot({ path: '/tmp/kbe-lead/flow-end.png' }); break; }
  if (/COMPLETE/i.test(s.prompt ?? '') && shots++ === 0) await page.screenshot({ path: '/tmp/kbe-lead/flow-clear.png' });
  await page.waitForTimeout(250);
}
await page.screenshot({ path: '/tmp/kbe-lead/flow-final.png' });
console.log('final', JSON.stringify(await page.evaluate(() => { const s = window.__KBE.state(); return { scene: s.scene, scenes: s.scenes, arena: s.arena }; })));
console.log(errs.length ? 'pageerrors: ' + errs.join(' | ') : 'no page errors');
await browser.close(); await server.close();
