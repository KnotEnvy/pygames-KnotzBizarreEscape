import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('.', import.meta.url));
const libs = '/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu';
// Resolve once in the runner, then inherit it in workers and the Vite subprocess.
if (!process.env.KBE_PORT) {
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  process.env.KBE_PORT = String((socket.address() as { port: number }).port);
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
}
const port = Number(process.env.KBE_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('KBE_PORT must be an integer in 1..65535');
const baseURL = `http://127.0.0.1:${port}`;
process.env.KBE_QA_RUN ??= `${new Date().toISOString().replace(/[:.]/g, '-')}-e2e-${process.pid}`;
const artifacts = `tests/artifacts/${process.env.KBE_QA_RUN}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: `${artifacts}/results`,
  fullyParallel: false,
  workers: 1, // SwiftShader instances contend heavily; keep timing reproducible.
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: `${artifacts}/html`, open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 1152, height: 648 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      env: { ...process.env, LD_LIBRARY_PATH: [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') },
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        ...(process.env.KBE_QA_NETLOG ? [`--log-net-log=${process.env.KBE_QA_NETLOG}`] : [])],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'node tests/helpers/serve.mjs',
    cwd: root,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
