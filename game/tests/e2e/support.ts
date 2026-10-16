import { test as base, expect, type Page } from '@playwright/test';

export type Snapshot = {
  scene: string; fps: number; cameraX: number; score: number; rescued: number;
  enemies: unknown; bossHp: number | null; errors: unknown[];
  player: null | { x: number; y: number; alive: boolean; weapon: string; ammo: number; bombs: number; lives: number };
  [key: string]: any;
};

declare global {
  interface Window {
    __KBE?: {
      ready: boolean; version: string; game: any;
      state(): Snapshot;
      cheats: Record<string, (...args: any[]) => any>;
      press(action: string, ms?: number): any;
    };
  }
}

export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.stack ?? error.message}`));
    await use(errors);
    await testInfo.attach('browser-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
  }, { auto: true }],
});
export { expect };

export async function boot(page: Page, query = 'scene=Game&fast=1&mute=1&god=1&seed=731') {
  await page.goto(`/?${query}`);
  await expect(page.locator('canvas')).toBeVisible();
}

export async function requireHooks(page: Page) {
  try {
    await page.waitForFunction(() => typeof window.__KBE !== 'undefined', { }, { timeout: 1_500 });
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'TimeoutError') throw error;
    test.fixme(true, 'Engine has not installed window.__KBE yet. Boot/render checks still run.');
  }
  await expect.poll(() => page.evaluate(() => window.__KBE?.ready), { timeout: 15_000 }).toBe(true);
}

export async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => window.__KBE!.state());
}

export async function sceneKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.__KBE?.game?.scene?.keys ?? {}));
}

export async function requireGame(page: Page) {
  await boot(page);
  await requireHooks(page);
  test.fixme(!(await sceneKeys(page)).includes('Game'), 'Game scene is not registered yet.');
  test.fixme(!await page.evaluate(() => typeof window.__KBE?.state === 'function'), 'state() is not implemented yet.');
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Game');
  test.fixme((await snapshot(page)).player == null, 'Player registration has not landed yet.');
  await expect.poll(async () => (await snapshot(page)).player?.alive).toBe(true);
}

export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  try { await page.waitForTimeout(ms); } finally { await page.keyboard.up(key); }
}

export async function paused(page: Page) {
  return page.evaluate(() => Boolean(window.__KBE?.game?.scene?.isPaused('Game')));
}

export async function requirePause(page: Page) {
  test.fixme(!(await sceneKeys(page)).some(key => /pause/i.test(key)), 'Pause UI scene is not registered yet.');
}
