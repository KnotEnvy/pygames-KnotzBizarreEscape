#!/usr/bin/env node
// Run twice on the same machine: first saves a baseline, then pass --baseline <report.json>.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { options, numeric, artifactDirectory, openSession, requireReady, resetTelemetry,
  collectTelemetry, saveReport, newReport, MissingFeature } from '../helpers/runtime.mjs';

const args = options();
const configuration = { durationMs: numeric(args, 'duration-ms', 20_000), warmupMs: numeric(args, 'warmup-ms', 2_000, 0), seed: numeric(args, 'seed', 731, 0) };
const directory = await artifactDirectory('perf');
const report = newReport('performance probe', configuration);
report.measurementCompleted = false;
report.notes.push('SwiftShader results are relative measurements, not a hardware 60 FPS acceptance gate.',
  'Frame intervals use requestAnimationFrame; game FPS comes from state().fps. Frames >50/100 ms are diagnostic counts, not pass/fail targets.',
  'The measured interval has no screenshots. Movement, jump cadence, seed, viewport and duration must match the stored baseline.');
let session;
try {
  session = await openSession(`scene=Game&stage=1&god=1&fast=1&mute=1&seed=${configuration.seed}`, report);
  await requireReady(session.page);
  await session.page.waitForTimeout(configuration.warmupMs);
  await session.page.keyboard.down('ArrowRight');
  await session.page.keyboard.down('x');
  await resetTelemetry(session.page);
  const started = Date.now();
  let nextJump = started;
  while (Date.now() - started < configuration.durationMs) {
    if (Date.now() >= nextJump) {
      await session.page.keyboard.press('z', { delay: 180 });
      nextJump += 2_000;
    }
    await session.page.waitForTimeout(Math.min(100, Math.max(0, configuration.durationMs - (Date.now() - started))));
  }
  report.elapsedMs = Date.now() - started;
  report.measurementCompleted = true;
  await collectTelemetry(session.page, report);
  await session.page.keyboard.up('ArrowRight');
  await session.page.keyboard.up('x');
  const states = report.telemetry.snapshots.map(sample => sample.state);
  if (states.length < 2 || report.metrics.frameSamples < 2) throw new Error('Insufficient gameplay/frame samples.');
  if (states.some(state => state.scene !== 'Game' || !state.player?.alive)) throw new Error('Gameplay stopped or the god-mode player died during measurement.');
  report.playerTravelPx = states.at(-1).player.x - states[0].player.x;
  if (report.playerTravelPx < 10) throw new Error('Player did not move during the performance workload.');
  if (args.baseline) {
    const baseline = JSON.parse(await readFile(path.resolve(String(args.baseline)), 'utf8'));
    if (baseline.status !== 'passed' || baseline.kind !== report.kind) throw new Error('Baseline must be a passed performance probe report.json.');
    if (JSON.stringify(baseline.configuration) !== JSON.stringify(configuration)) throw new Error('Baseline configuration differs; use identical duration, warmup and seed.');
    const keys = ['browser', 'viewport', 'renderer', 'platform', 'arch'];
    if (keys.some(key => baseline.environment[key] !== report.environment[key])) report.notes.push('Baseline environment differs; interpret comparison cautiously.');
    report.comparison = { baseline: path.resolve(String(args.baseline)), deltas: {} };
    for (const key of ['averageFps', 'minFps', 'averageFrameMs', 'p95FrameMs', 'p99FrameMs', 'maxFrameMs', 'spikesOver50Ms', 'spikesOver100Ms']) {
      const current = report.metrics[key];
      const previous = baseline.metrics[key];
      report.comparison.deltas[key] = { baseline: previous, current, delta: current - previous,
        percent: previous ? (current - previous) / previous * 100 : null };
    }
  } else report.notes.push('This report can be used as the baseline: rerun with --baseline <this-directory>/report.json.');
  await session.page.screenshot({ path: path.join(directory, 'final.png') });
  report.captures.push({ label: 'End of measured gameplay', file: 'final.png', state: states.at(-1) });
} catch (error) {
  report.status = error instanceof MissingFeature ? 'blocked' : 'failed';
  report.problems.push(error.stack ?? error.message);
  if (session) {
    await session.page.screenshot({ path: path.join(directory, 'blocked-or-failed.png') }).catch(() => {});
    report.captures.push({ label: 'Blocked or failed probe', file: 'blocked-or-failed.png' });
  }
} finally {
  if (session) {
    if (!report.telemetry) await collectTelemetry(session.page, report).catch(error => {
      report.problems.push(`Telemetry collection failed: ${error.message}`); report.status = 'failed';
    });
    await session.close();
  }
  if (!report.measurementCompleted) report.notes.push('The 20 s gameplay interval was not completed. Any collected frame samples describe startup only and are not a gameplay baseline.');
  await saveReport(directory, report);
}
process.exitCode = report.status === 'passed' ? 0 : report.status === 'blocked' ? 2 : 1;
