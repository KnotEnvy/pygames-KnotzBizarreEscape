import { test, expect, requireGame, snapshot, hold, paused, requirePause } from './support';

test.beforeEach(async ({ page }) => { await requireGame(page); });

test('holding right moves the player right', async ({ page }) => {
  const start = (await snapshot(page)).player!.x;
  await hold(page, 'ArrowRight', 600);
  expect((await snapshot(page)).player!.x).toBeGreaterThan(start + 10);
});

test('jump lifts the player and gravity returns them to ground', async ({ page }) => {
  await page.waitForTimeout(500);
  const startY = (await snapshot(page)).player!.y;
  await page.keyboard.down('z');
  try {
    await expect.poll(async () => (await snapshot(page)).player!.y, { intervals: [30], timeout: 1_500 }).toBeLessThan(startY - 5);
  } finally { await page.keyboard.up('z'); }
  await expect.poll(async () => Math.abs((await snapshot(page)).player!.y - startY), { timeout: 3_000 }).toBeLessThan(2);
});

test('shoot creates a projectile or advances the shot counter', async ({ page }) => {
  const fields = await page.evaluate(() => {
    const state = window.__KBE!.state();
    return ['projectiles', 'shotsFired'].filter(key => state[key] !== undefined);
  });
  test.fixme(fields.length === 0, 'Need registerDebug projectiles (count/list) or shotsFired counter.');
  const shotMetric = async () => page.evaluate(() => {
    const state = window.__KBE!.state();
    const count = state.projectiles;
    return { shots: state.shotsFired ?? 0, projectiles: Array.isArray(count) ? count.length : count ?? 0 };
  });
  const before = await shotMetric();
  await page.keyboard.down('x');
  try {
    await expect.poll(async () => {
      const after = await shotMetric();
      return after.shots > before.shots || after.projectiles > before.projectiles;
    }, { intervals: [30] }).toBe(true);
  } finally { await page.keyboard.up('x'); }
});

test('camera advances then never scrolls back left', async ({ page }) => {
  const start = (await snapshot(page)).cameraX;
  await hold(page, 'ArrowRight', 2_500);
  const forward = (await snapshot(page)).cameraX;
  expect(forward).toBeGreaterThan(start + 5);
  let previous = forward;
  await page.keyboard.down('ArrowLeft');
  try {
    for (let sample = 0; sample < 12; sample++) {
      await page.waitForTimeout(75);
      const current = (await snapshot(page)).cameraX;
      expect(current).toBeGreaterThanOrEqual(previous - 0.01);
      previous = current;
    }
  } finally { await page.keyboard.up('ArrowLeft'); }
});

test('pause freezes movement and resume restores it', async ({ page }) => {
  await requirePause(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => paused(page)).toBe(true);
  const before = (await snapshot(page)).player!.x;
  await hold(page, 'ArrowRight', 400);
  expect((await snapshot(page)).player!.x).toBeCloseTo(before, 1);
  await page.keyboard.press('Escape');
  await expect.poll(() => paused(page)).toBe(false);
  await hold(page, 'ArrowRight', 300);
  expect((await snapshot(page)).player!.x).toBeGreaterThan(before + 5);
});
