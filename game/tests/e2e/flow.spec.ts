import { test, expect, boot, requireHooks, requireGame, snapshot, sceneKeys, paused, requirePause } from './support';

test('Title → Game → Pause → resume', async ({ page }) => {
  await boot(page, 'scene=Title&mute=1&fast=1&seed=731');
  await requireHooks(page);
  const keys = await sceneKeys(page);
  test.fixme(!keys.includes('Title') || !keys.includes('Game'), 'Title/Game scenes have not landed yet.');
  await requirePause(page);
  expect((await snapshot(page)).scene).toBe('Title');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Game');
  await page.keyboard.press('Escape');
  await expect.poll(() => paused(page)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => paused(page)).toBe(false);
  expect((await snapshot(page)).scene).toBe('Game');
});

test('death respawns the player and consumes exactly one life', async ({ page }) => {
  await requireGame(page);
  test.fixme(!await page.evaluate(() => typeof window.__KBE!.cheats?.kill === 'function'), 'cheats.kill is not implemented yet.');
  const lives = (await snapshot(page)).player!.lives;
  expect(lives).toBeGreaterThan(1);
  await page.evaluate(() => { window.__KBE!.cheats.god(false); window.__KBE!.cheats.kill(); });
  await expect.poll(async () => (await snapshot(page)).player?.alive, { intervals: [25] }).toBe(false);
  await expect.poll(async () => (await snapshot(page)).player?.alive, { timeout: 6_000 }).toBe(true);
  expect((await snapshot(page)).player!.lives).toBe(lives - 1);
});

test('game over offers continue and starts a fresh run', async ({ page }) => {
  test.setTimeout(60_000);
  await requireGame(page);
  const keys = await sceneKeys(page);
  const gameOverKeys = keys.filter(key => /gameover|continue/i.test(key));
  test.fixme(gameOverKeys.length === 0, 'GameOver/Continue UI does not exist yet.');
  test.fixme(!await page.evaluate(() => typeof window.__KBE!.cheats?.kill === 'function'), 'cheats.kill is not implemented yet.');
  await page.evaluate(() => window.__KBE!.cheats.god(false));
  const initialLives = (await snapshot(page)).player!.lives;
  expect(initialLives).toBeGreaterThan(0);
  expect(initialLives).toBeLessThanOrEqual(10);
  for (let life = initialLives; life > 0; life--) {
    await page.evaluate(() => window.__KBE!.cheats.kill());
    if (life > 1) {
      await expect.poll(async () => (await snapshot(page)).player?.lives).toBe(life - 1);
      await expect.poll(async () => (await snapshot(page)).player?.alive, { timeout: 6_000 }).toBe(true);
      await page.waitForTimeout(2_100); // Respawn invulnerability must expire before the next kill.
    }
  }
  await expect.poll(() => page.evaluate((sceneNames) => sceneNames.some(key => window.__KBE!.game.scene.isActive(key)), gameOverKeys)).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Game');
  expect((await snapshot(page)).player!.alive).toBe(true);
  expect((await snapshot(page)).player!.lives).toBe(initialLives);
  expect((await snapshot(page)).score).toBe(0);
});
