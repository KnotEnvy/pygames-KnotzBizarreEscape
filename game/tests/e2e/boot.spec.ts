import { test, expect, boot, requireHooks } from './support';

test('page renders a canvas with a live WebGL context and no browser errors', async ({ page, browserErrors }) => {
  const response = await page.goto('/?mute=1&fast=1');
  expect(response?.ok()).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();
  const context = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return { width: canvas.width, height: canvas.height, exists: !!gl, lost: gl?.isContextLost() };
  });
  expect(context).toEqual({ width: 384, height: 216, exists: true, lost: false });
  await page.waitForTimeout(1_000); // Include asynchronous loader errors, not just navigation.
  expect(browserErrors).toEqual([]);
});

test('Engine signals ready', async ({ page, browserErrors }) => {
  await boot(page);
  await requireHooks(page);
  expect(await page.evaluate(() => window.__KBE!.ready)).toBe(true);
  expect(browserErrors).toEqual([]);
});
