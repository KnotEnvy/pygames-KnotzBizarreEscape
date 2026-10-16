import { test, expect, boot, requireHooks, snapshot } from './support';

for (const difficulty of ['arcade', 'casual']) {
  test(`${difficulty}: hurt respects god mode, HP and invulnerability`, async ({ page }) => {
    await boot(page, `scene=Game&fast=1&mute=1&god=1&difficulty=${difficulty}&x=5800&seed=731`);
    await requireHooks(page);
    await expect.poll(async () => (await snapshot(page)).playerController.invulnerableMs).toBe(0);
    const before = await snapshot(page);
    await page.evaluate(() => window.__KBE!.cheats.hurt(1));
    expect((await snapshot(page)).playerController.hp).toBe(difficulty === 'casual' ? 3 : 1);
    await page.evaluate(() => { window.__KBE!.cheats.god(false); window.__KBE!.cheats.hurt(1); });
    if (difficulty === 'casual') {
      expect((await snapshot(page)).playerController.hp).toBe(2);
      await page.evaluate(() => window.__KBE!.cheats.hurt(1));
      expect((await snapshot(page)).playerController.hp).toBe(2);
      expect((await snapshot(page)).player!.lives).toBe(before.player!.lives);
    } else {
      expect((await snapshot(page)).player!.alive).toBe(false);
      expect((await snapshot(page)).player!.lives).toBe(before.player!.lives - 1);
    }
  });
}

test('kill bypasses god and killEnemies preserves the player', async ({ page }) => {
  await boot(page, 'scene=Game&fast=1&mute=1&god=1&x=5800&seed=731');
  await requireHooks(page);
  const before = await snapshot(page);
  await page.evaluate(() => window.__KBE!.cheats.killEnemies());
  expect((await snapshot(page)).player!.alive).toBe(true);
  expect((await snapshot(page)).player!.lives).toBe(before.player!.lives);
  await page.evaluate(() => window.__KBE!.cheats.kill());
  expect((await snapshot(page)).player!.alive).toBe(false);
  expect((await snapshot(page)).player!.lives).toBe(before.player!.lives - 1);
});
