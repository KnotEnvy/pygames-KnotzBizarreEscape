#!/usr/bin/env node
// Visual verification tool. Starts its own Vite dev server on a free port (safe to run
// in parallel), opens the game in headless Chromium (WebGL via SwiftShader), optionally
// drives input, captures screenshots, and prints console errors + window.__KBE state.
//
// Usage:
//   node tools/shot.mjs --out /tmp/a.png [--query "scene=Game&stage=1&debug=1"] [--wait 2500]
//        [--steps '[{"hold":"ArrowRight","ms":1500},{"press":"KeyX"},{"wait":300},{"shot":"/tmp/b.png"}]']
//        [--size 1152x648] [--eval "window.__KBE?.state()"]
// Steps: {hold:key, ms}, {down:key}, {up:key}, {press:key}, {wait:ms}, {shot:path}, {eval:"js expr"}
// Keys use Playwright names: ArrowLeft, KeyZ, KeyX, KeyC, Space, Enter, Escape, ShiftLeft ...
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const { chromium } = await import(path.join(root, 'node_modules/@playwright/test/index.mjs'));

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
}, []));
const [w, h] = (args.size || '1152x648').split('x').map(Number);
const out = args.out || '/tmp/kbe-shot.png';

const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const addr = server.httpServer.address();
const url = `http://127.0.0.1:${addr.port}/?${args.query || ''}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const logs = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => logs.push(`pageerror: ${e.stack || e.message}`));
let code = 0;
try {
    await page.goto(url);
    await page.waitForTimeout(Number(args.wait || 2500));
    const steps = args.steps ? JSON.parse(args.steps) : [];
    for (const s of steps) {
        if (s.hold) { await page.keyboard.down(s.hold); await page.waitForTimeout(s.ms ?? 500); await page.keyboard.up(s.hold); }
        else if (s.down) await page.keyboard.down(s.down);
        else if (s.up) await page.keyboard.up(s.up);
        else if (s.press) await page.keyboard.press(s.press, { delay: s.ms ?? 60 });
        else if (s.wait) await page.waitForTimeout(s.wait);
        else if (s.shot) { await page.screenshot({ path: s.shot }); console.log('shot:', s.shot); }
        else if (s.eval) console.log('eval:', JSON.stringify(await page.evaluate(s.eval)));
    }
    await page.screenshot({ path: out });
    console.log('shot:', out);
    const st = await page.evaluate(args.eval || 'window.__KBE && window.__KBE.state ? window.__KBE.state() : null').catch(e => 'eval failed: ' + e.message);
    console.log('state:', JSON.stringify(st));
} catch (e) { code = 1; console.error('shot.mjs failure:', e.message); }
console.log(logs.length ? 'console problems:\n' + logs.join('\n') : 'console: clean');
await browser.close();
await server.close();
process.exit(code || (logs.some(l => l.startsWith('pageerror')) ? 2 : 0));
