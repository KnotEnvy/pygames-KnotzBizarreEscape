#!/usr/bin/env node
// From any cwd: node /absolute/path/game/tests/bot/playthrough.mjs --step 256 --capture-every 512
import path from 'node:path';
import { options, numeric, artifactDirectory, openSession, requireReady, resetTelemetry,
  collectTelemetry, saveReport, newReport, MissingFeature } from '../helpers/runtime.mjs';

const args = options();
const configuration = {
  start: numeric(args, 'start', 64, 0), end: numeric(args, 'end', 6719),
  step: numeric(args, 'step', 256), captureEvery: numeric(args, 'capture-every', 512),
  walkMs: numeric(args, 'walk-ms', 600), bossMs: numeric(args, 'boss-ms', 90_000, 0),
  maxMs: numeric(args, 'max-ms', 180_000), seed: numeric(args, 'seed', 731, 0),
  weapon: String(args.weapon ?? 'hmg'),
};
if (configuration.end <= configuration.start) throw new Error('--end must exceed --start');
const directory = await artifactDirectory('playthrough');
const report = newReport('visual playthrough', configuration);
report.notes.push('Warp traversal validates coverage and rendering, not level traversability. Do a separate manual no-cheat run.',
  'Screenshots add overhead: use the performance probe for comparable FPS numbers.');
let session;
let nextCapture = 0;
let sequence = 0;
const seenPhases = new Set();
let sawExplicitPhase = false;
let sawBoss = false;
let lastCameraX = null;

async function capture(label, state) {
  const file = `${String(sequence++).padStart(3, '0')}-${label.replace(/[^a-z0-9-]/gi, '-')}.png`;
  await session.page.screenshot({ path: path.join(directory, file) });
  report.captures.push({ label, file, state });
}

async function observe() {
  const state = await session.page.evaluate(() => window.__KBE.state());
  if (Number.isFinite(state.cameraX)) {
    if (lastCameraX !== null && state.cameraX < lastCameraX - 0.01) {
      report.problems.push(`Camera moved left: ${lastCameraX} → ${state.cameraX}`);
      report.status = 'failed';
    }
    lastCameraX = state.cameraX;
    if (state.cameraX >= nextCapture) {
      await capture(`camera-${Math.round(state.cameraX)}`, state);
      nextCapture = (Math.floor(state.cameraX / configuration.captureEvery) + 1) * configuration.captureEvery;
    }
  }
  const phase = state.bossPhase ?? state.boss?.phase;
  if (phase !== undefined && phase !== null) {
    sawExplicitPhase = true;
    if (!seenPhases.has(phase)) {
      seenPhases.add(phase);
      await capture(`boss-phase-${phase}`, state);
    }
  }
  if (typeof state.bossHp === 'number' && state.bossHp > 0) {
    if (!sawBoss) await capture('boss-spawn', state);
    sawBoss = true;
  }
  if (state.player && !state.player.alive) {
    report.status = 'failed';
    report.problems.push(`Player died despite god=1 near x=${state.player.x}.`);
  }
  return state;
}

try {
  session = await openSession(`scene=Game&stage=1&god=1&fast=1&mute=1&seed=${configuration.seed}`, report);
  await requireReady(session.page);
  const hasCheats = await session.page.evaluate(() => ['warp', 'god'].every(key => typeof window.__KBE.cheats?.[key] === 'function'));
  if (!hasCheats) throw new MissingFeature('cheats.warp and cheats.god are required for level traversal.');
  await session.page.evaluate(() => window.__KBE.cheats.god(true));
  const hasGive = await session.page.evaluate(() => typeof window.__KBE.cheats.give === 'function');
  if (hasGive) await session.page.evaluate(weapon => window.__KBE.cheats.give(weapon), configuration.weapon);
  await resetTelemetry(session.page);
  const started = Date.now();
  const points = [];
  for (let x = configuration.start; x < configuration.end; x += configuration.step) points.push(x);
  points.push(configuration.end);
  await session.page.keyboard.down('x');
  for (const x of points) {
    if (Date.now() - started >= configuration.maxMs) throw new Error('Traversal exceeded --max-ms before covering the requested range.');
    await session.page.evaluate(warpX => window.__KBE.cheats.warp(warpX), x);
    await session.page.waitForFunction(warpX => {
      const player = window.__KBE.state().player;
      return player && Math.abs(player.x - warpX) <= 32;
    }, x, { timeout: 2_000 });
    const warped = await session.page.evaluate(() => window.__KBE.state());
    if (!warped.player || Math.abs(warped.player.x - x) > 32) {
      throw new Error(`warp(${x}) did not move the player (actual x=${warped.player?.x}); arena lock or missing cheat.`);
    }
    await session.page.keyboard.down('ArrowRight');
    try {
      const until = Date.now() + configuration.walkMs;
      while (Date.now() < until) { await observe(); await session.page.waitForTimeout(100); }
    } finally { await session.page.keyboard.up('ArrowRight'); }
    report.lastWarpX = x;
  }
  // Stay in the arena and fire left: actual phase transitions must come from gameplay.
  await session.page.keyboard.down('ArrowLeft');
  await session.page.waitForTimeout(80);
  await session.page.keyboard.up('ArrowLeft');
  const bossUntil = Date.now() + configuration.bossMs;
  while (Date.now() < bossUntil) {
    if (Date.now() - started >= configuration.maxMs) throw new Error('Boss observation exceeded --max-ms.');
    const state = await observe();
    if (sawBoss && state.bossHp === 0) break;
    await session.page.waitForTimeout(100);
  }
  await session.page.keyboard.up('x');
  await capture('final', await observe());
  report.coveredRequestedRange = report.lastWarpX === configuration.end;
  report.bossPhases = [...seenPhases];
  report.coverage = { requestedRange: report.coveredRequestedRange, bossObserved: sawBoss,
    bossPhasesObservable: sawExplicitPhase, allBossPhases: [1, 2, 3].every(phase => seenPhases.has(phase)) };
  if (!sawBoss) report.notes.push('No live boss was observed. Boss coverage remains unverified.');
  if (!sawExplicitPhase) report.notes.push('No bossPhase or boss.phase debug value: automatic phase capture is blocked (Engine/Enemies request).');
  else if (![1, 2, 3].every(phase => seenPhases.has(phase))) report.notes.push('Not all three boss phases were reached; increase --boss-ms or use a weapon in a follow-up run.');
  if (!Object.values(report.coverage).every(Boolean) && report.status === 'passed') {
    report.status = 'blocked';
    report.problems.push('Complete level/boss coverage was not obtained; see coverage and notes.');
  }
} catch (error) {
  report.status = error instanceof MissingFeature ? 'blocked' : 'failed';
  report.problems.push(error.stack ?? error.message);
  if (session) await capture('blocked-or-failed').catch(() => {});
} finally {
  if (session) {
    try {
      await session.page.keyboard.up('ArrowRight');
      await session.page.keyboard.up('x');
      await collectTelemetry(session.page, report);
    } catch (error) { report.problems.push(`Telemetry collection failed: ${error.message}`); report.status = 'failed'; }
    await session.close();
  }
  await saveReport(directory, report);
}
process.exitCode = report.status === 'passed' ? 0 : report.status === 'blocked' ? 2 : 1;
