// Playwright-owned server: edits in the shared checkout cannot reload a test page.
import { createServer } from 'vite';
import { gameRoot } from './runtime.mjs';
import path from 'node:path';

const server = await createServer({ root: gameRoot, configFile: path.join(gameRoot, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: Number(process.env.KBE_PORT), strictPort: true, hmr: false, watch: null },
  logLevel: 'error' });
await server.listen();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
