import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  testDir: path.join(root, 'test/e2e'),
  timeout: 60_000,
  retries: 0,
  use: {
    headless: false,
    channel: 'chromium',
  },
  webServer: {
    command: 'node test/e2e/fixture-server.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
