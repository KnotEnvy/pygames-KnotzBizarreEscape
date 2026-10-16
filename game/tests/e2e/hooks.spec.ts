import { test, expect, boot, requireHooks, requireGame, snapshot, sceneKeys } from './support';

test('debug hook exposes the documented contract and snapshot', async ({ page }) => {
  await boot(page);
  await requireHooks(page);
  const shape = await page.evaluate(() => {
    const hook = window.__KBE!;
    return { game: !!hook.game, version: typeof hook.version, state: typeof hook.state,
      press: typeof hook.press, cheats: Object.fromEntries(['god', 'warp', 'give', 'kill', 'killEnemies', 'hurt', 'bombs', 'boss']
        .map(key => [key, typeof hook.cheats?.[key]])) };
  });
  expect(shape).toEqual({ game: true, version: 'string', state: 'function', press: 'function',
    cheats: { god: 'function', warp: 'function', give: 'function', kill: 'function', killEnemies: 'function', hurt: 'function', bombs: 'function', boss: 'function' } });
  const state = await snapshot(page);
  for (const field of ['scene', 'fps', 'player', 'score', 'rescued', 'enemies', 'cameraX', 'bossHp', 'errors']) {
    expect(state, `missing state().${field}`).toHaveProperty(field);
  }
  expect(typeof state.scene).toBe('string');
  for (const value of [state.fps, state.score, state.rescued, state.cameraX]) expect(Number.isFinite(value)).toBe(true);
  expect(Array.isArray(state.errors)).toBe(true);
  expect(state.errors).toEqual([]);
  if (state.player !== null) {
    for (const field of ['x', 'y', 'ammo', 'bombs', 'lives'] as const) expect(typeof state.player[field]).toBe('number');
    expect(typeof state.player.alive).toBe('boolean');
    expect(typeof state.player.weapon).toBe('string');
  }
});

test('scene=Game and fast=1 enter gameplay without an intro', async ({ page }) => {
  await boot(page);
  await requireHooks(page);
  test.fixme(!(await sceneKeys(page)).includes('Game'), 'Game scene is not registered yet.');
  expect((await snapshot(page)).scene).toBe('Game');
  const active = await page.evaluate(() => window.__KBE!.game.scene.getScenes(true).map((scene: any) => scene.sys.settings.key));
  expect(active).toContain('Game');
  expect(active.filter((key: string) => /intro|title/i.test(key))).toEqual([]);
});

test('x URL parameter warps the player', async ({ page }) => {
  await boot(page, 'scene=Game&fast=1&mute=1&god=1&x=160&seed=731');
  await requireHooks(page);
  test.fixme(!(await sceneKeys(page)).includes('Game'), 'Game scene is not registered yet.');
  test.fixme((await snapshot(page)).player == null, 'Player registration has not landed yet.');
  expect((await snapshot(page)).player!.x).toBeCloseTo(160, 0);
});

test('mute=1 mutes the Phaser sound manager', async ({ page }) => {
  await boot(page);
  await requireHooks(page);
  expect(await page.evaluate(() => window.__KBE!.game.sound.mute)).toBe(true);
});

test('god=1 is observable as an enabled debug flag', async ({ page }) => {
  await requireGame(page);
  const flags = await page.evaluate(() => {
    const state = window.__KBE!.state();
    const registry = window.__KBE!.game.registry;
    return { value: state.god ?? state.debug?.god ?? registry?.get('god') };
  });
  test.fixme(flags.value === undefined, 'Need state().god, state().debug.god, or game.registry god to verify URL flag.');
  expect(flags.value).toBe(true);
});

test('press(action, ms) drives the player and releases the action', async ({ page }) => {
  await requireGame(page);
  const before = (await snapshot(page)).player!.x;
  await page.evaluate(() => window.__KBE!.press('right', 350));
  await expect.poll(async () => (await snapshot(page)).player!.x).toBeGreaterThan(before + 5);
  await page.waitForTimeout(500);
  const stopped = (await snapshot(page)).player!.x;
  await page.waitForTimeout(300);
  expect(Math.abs((await snapshot(page)).player!.x - stopped)).toBeLessThan(2);
});
