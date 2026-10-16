import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const gameRoot = fileURLToPath(new URL('../../', import.meta.url));
export const launchArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';

export class MissingFeature extends Error {}

export function options(argv = process.argv.slice(2)) {
  const result = {};
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index];
    if (!name.startsWith('--')) throw new Error(`Unexpected argument: ${name}`);
    const value = argv[index + 1];
    result[name.slice(2)] = value && !value.startsWith('--') ? argv[++index] : true;
  }
  return result;
}

export function numeric(args, key, fallback, minimum = 1) {
  const value = Number(args[key] ?? fallback);
  if (!Number.isFinite(value) || value < minimum) throw new Error(`--${key} must be a number >= ${minimum}`);
  return value;
}

export async function artifactDirectory(kind) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(gameRoot, 'tests/artifacts', `${stamp}-${kind}-${process.pid}`);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function openSession(query, report) {
  const server = await createServer({ root: gameRoot, configFile: path.join(gameRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: false }, logLevel: 'error' });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ args: launchArgs,
      env: { ...process.env, LD_LIBRARY_PATH: [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } });
    const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
    page.on('console', message => {
      const entry = { at: new Date().toISOString(), type: message.type(), text: message.text() };
      if (message.type() === 'error') report.consoleErrors.push(entry);
      if (message.type() === 'warning') report.warnings.push(entry);
    });
    page.on('pageerror', error => report.consoleErrors.push({ at: new Date().toISOString(), type: 'pageerror', text: error.stack ?? error.message }));
    await page.addInitScript(() => {
      window.__QA = { frames: [], fps: [], snapshots: [], hookErrors: [], sampleErrors: 0, lastSample: 0, lastFrame: null };
      const sample = now => {
        const data = window.__QA;
        if (data.lastFrame !== null) data.frames.push({ at: now, ms: now - data.lastFrame });
        data.lastFrame = now;
        if (now - data.lastSample >= 100) {
          data.lastSample = now;
          try {
            if (typeof window.__KBE?.state === 'function') {
              const state = window.__KBE.state();
              // Preserve non-finite ammo (pistol Infinity) without invalid JSON.
              data.snapshots.push({ at: now, state: JSON.parse(JSON.stringify(state,
                (_key, value) => typeof value === 'number' && !Number.isFinite(value) ? String(value) : value)) });
              if (Number.isFinite(state.fps)) data.fps.push({ at: now, fps: state.fps });
            }
          } catch (error) {
            data.sampleErrors++;
            if (data.hookErrors.length < 20) data.hookErrors.push(String(error));
          }
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const url = `http://127.0.0.1:${server.httpServer.address().port}/?${query}`;
    report.environment = { url, browser: browser.version(), viewport: '1152x648', args: launchArgs,
      platform: process.platform, arch: process.arch, renderer: 'SwiftShader' };
    await page.goto(url);
    await page.locator('canvas').waitFor({ state: 'visible' });
    return { page, close: async () => { try { await browser.close(); } finally { await server.close(); } } };
  } catch (error) {
    if (browser) await browser.close();
    await server.close();
    throw error;
  }
}

export async function requireReady(page) {
  try {
    await page.waitForFunction(() => window.__KBE?.ready === true, {}, { timeout: 5_000 });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    if (!await page.evaluate(() => Boolean(window.__KBE))) throw new MissingFeature('window.__KBE has not landed; gameplay was not exercised.');
    throw new Error('window.__KBE exists but ready did not become true within 5 s.');
  }
  if (!await page.evaluate(() => typeof window.__KBE?.state === 'function')) throw new Error('Debug contract is missing state().');
  const state = await page.evaluate(() => window.__KBE.state());
  if (state.scene !== 'Game') throw new MissingFeature(`Game is not active (scene=${state.scene}).`);
  if (!state.player) throw new MissingFeature('Player is not registered; gameplay was not exercised.');
}

export async function resetTelemetry(page) {
  await page.evaluate(() => {
    Object.assign(window.__QA, { frames: [], fps: [], snapshots: [], hookErrors: [], sampleErrors: 0, lastSample: 0, lastFrame: null });
  });
}

export async function collectTelemetry(page, report) {
  report.telemetry = await page.evaluate(() => window.__QA);
  report.metrics = metrics(report.telemetry);
}

export function metrics(data) {
  const frames = (data?.frames ?? []).map(frame => frame.ms).filter(ms => Number.isFinite(ms) && ms > 0);
  const fps = (data?.fps ?? []).map(sample => sample.fps).filter(fps => Number.isFinite(fps) && fps > 0);
  const sorted = [...frames].sort((a, b) => a - b);
  const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return {
    frameSamples: frames.length, fpsSamples: fps.length,
    averageFps: fps.length ? mean(fps) : (mean(frames) ? 1000 / mean(frames) : null),
    minFps: fps.length ? Math.min(...fps) : (frames.length ? 1000 / Math.max(...frames) : null),
    fpsSource: fps.length ? '__KBE.state().fps' : 'requestAnimationFrame interval',
    averageFrameMs: mean(frames), minFrameMs: sorted[0] ?? null,
    p95FrameMs: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null,
    p99FrameMs: sorted.length ? sorted[Math.ceil(sorted.length * 0.99) - 1] : null,
    maxFrameMs: sorted.at(-1) ?? null,
    spikesOver50Ms: frames.filter(ms => ms > 50).length,
    spikesOver100Ms: frames.filter(ms => ms > 100).length,
    sampleErrors: data?.sampleErrors ?? 0,
  };
}

export async function saveReport(directory, report) {
  const stateErrors = (report.telemetry?.snapshots ?? []).flatMap(sample => sample.state.errors ?? []);
  report.stateErrors = [...new Set(stateErrors.map(error => typeof error === 'string' ? error : JSON.stringify(error)))];
  if (report.consoleErrors.length || report.stateErrors.length || report.telemetry?.sampleErrors) {
    report.status = 'failed';
    report.problems.push('Browser errors, state errors, or telemetry sampling errors were recorded.');
  }
  const lines = [
    `# Knotz Bizarre Escape — ${report.kind}`, '', `Status: **${report.status}**`, '',
    `Started: ${report.started}`, '', '## Findings', '',
    ...(report.problems.length ? report.problems.map(problem => `- ${problem}`) : ['- No automated problems recorded; visual review is still required.']),
    ...(report.notes ?? []).map(note => `- ${note}`), '', '## Metrics', '', '```json', JSON.stringify(report.metrics ?? {}, null, 2), '```', '',
    '## Baseline comparison', '', '```json', JSON.stringify(report.comparison ?? { note: 'No stored baseline supplied.' }, null, 2), '```', '',
    '## Browser errors', '', '```json', JSON.stringify(report.consoleErrors, null, 2), '```', '',
    '## Captures', '', ...(report.captures ?? []).map(capture => `- [${capture.label}](${capture.file}) — ${JSON.stringify(capture.state ?? {})}`), '',
    'Full states, FPS samples, frame intervals, warnings, environment and configuration: [report.json](report.json).', '',
  ];
  await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(directory, 'report.md'), lines.join('\n'));
  console.log(JSON.stringify({ status: report.status, report: path.join(directory, 'report.md'), metrics: report.metrics ?? null, problems: report.problems }, null, 2));
}

export function newReport(kind, configuration) {
  return { kind, configuration, started: new Date().toISOString(), status: 'passed', consoleErrors: [], warnings: [], problems: [], notes: [], captures: [] };
}
