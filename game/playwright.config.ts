import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1, // SwiftShader instances contend heavily; keep timing reproducible.
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: 'tests/artifacts/e2e-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4310',
    viewport: { width: 1152, height: 648 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      env: { ...process.env, LD_LIBRARY_PATH: [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') },
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4310 --strictPort',
    cwd: root,
    url: 'http://127.0.0.1:4310',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
