#!/usr/bin/env node
// Run after npm --prefix game run build. Exercises dist, never Vite's source transform.
import { preview } from 'vite';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { artifactDirectory, gameRoot, launchArgs, newReport, saveReport } from '../helpers/runtime.mjs';

const directory = await artifactDirectory('production-smoke');
const report = newReport('production smoke', { durationMs: 20000 });
report.checks = []; report.failedRequests = []; report.httpErrors = []; report.assetResponses = 0;
let server, browser, page;
async function check(name, ok, detail) {
  report.checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) { report.status = 'failed'; report.problems.push(name); }
}
async function shot(label) {
  const file = `${label}.png`;
  await page.screenshot({ path: path.join(directory, file) });
  report.captures.push({ label, file, state: await page.evaluate(() => window.__KBE.state()) });
}
try {
  server = await preview({ root: gameRoot, configFile: path.join(gameRoot, 'vite.config.ts'),
    preview: { host: '127.0.0.1', port: 0, strictPort: false }, logLevel: 'error' });
  const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
  browser = await chromium.launch({ args: launchArgs,
    env: { ...process.env, LD_LIBRARY_PATH: [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } });
  page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); if (m.type() === 'warning') report.warnings.push(m.text()); });
  page.on('pageerror', e => report.consoleErrors.push(e.stack ?? e.message));
  page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), failure: r.failure() }));
  page.on('response', r => {
    if (r.url().includes('/assets/') && r.status() === 200) report.assetResponses++;
    if (r.status() >= 400) report.httpErrors.push({ url: r.url(), status: r.status() });
  });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  // Deliberately attempt production URL cheats without debug=1 while starting through Title.
  const url = `${origin}/?fast=1&god=1&x=6350&enemytest=boss&seed=731`;
  report.environment = { url, browser: browser.version(), viewport: '1152x648', renderer: 'SwiftShader' };
  await page.goto(url);
  await page.waitForFunction(() => window.__KBE?.ready && window.__KBE.state().scene === 'Title');
  await page.waitForTimeout(600); // Let the opening wipe expose the Title for visual review.
  await shot('title');
  report.beforeInput = await page.evaluate(() => window.__KBE.state().audio);
  await page.keyboard.press('Enter', { delay: 100 });
  await page.waitForFunction(() => window.__KBE.state().scene === 'Game' && window.__KBE.state().player?.alive, {}, { timeout: 15000 });
  await page.waitForFunction(() => window.__KBE.state().audio?.locked === false && window.__KBE.state().audio?.context === 'running', {}, { timeout: 6000 });
  await page.waitForTimeout(600);
  await shot('gameplay-start');
  const gate = await page.evaluate(() => {
    const before = window.__KBE.state();
    window.__KBE.cheats.god(true); window.__KBE.cheats.warp(5800);
    window.__KBE.cheats.give('hmg',999); window.__KBE.cheats.bombs(30); window.__KBE.cheats.kill();
    const after = window.__KBE.state();
    return { enabled: window.__KBE.cheatsEnabled, fixture: Boolean(window.__KBE_ENEMYTEST), before, after };
  });
  await check('production URL and mutation cheats disabled without debug', gate.enabled === false && !gate.fixture &&
    !gate.before.god && gate.before.player.x < 200 && gate.after.player.x === gate.before.player.x &&
    gate.after.player.weapon === 'pistol' && gate.after.player.bombs === gate.before.player.bombs &&
    gate.after.player.alive && gate.after.player.lives === gate.before.player.lives && !gate.after.god, gate);
  report.gameplaySamples = [];
  await page.keyboard.down('x');
  const started = Date.now();
  // Stay in the starting lane and use real movement, jump and fire; no production cheat fixture.
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
  while (Date.now() - started < 20000) {
    await page.keyboard.press('z', { delay: 180 });
    await page.waitForTimeout(Math.min(1500, Math.max(0, 20000 - (Date.now() - started))));
    report.gameplaySamples.push(await page.evaluate(() => window.__KBE.state()));
  }
  await page.keyboard.up('x'); report.elapsedMs = Date.now() - started;
  await shot('gameplay-after-20s');
  const final = report.gameplaySamples.at(-1);
  await check('20 seconds of gameplay with unlocked audio', report.elapsedMs >= 20000 &&
    report.gameplaySamples.every(s => s.scene === 'Game') && !final.audio.locked && final.audio.context === 'running' && final.shotsFired > 0, final);
  await check('no missing assets or failed requests', report.failedRequests.length === 0 && report.httpErrors.length === 0,
    { failedRequests: report.failedRequests, httpErrors: report.httpErrors });
  await check('no debug state errors', report.gameplaySamples.every(s => s.errors.length === 0));
  report.audioAfterInput = final.audio;
} catch (error) {
  report.status = 'failed'; report.problems.push(error.stack ?? String(error));
  if (page) await shot('failure').catch(() => {});
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
  await saveReport(directory, report);
}
process.exitCode = report.status === 'passed' ? 0 : 1;
