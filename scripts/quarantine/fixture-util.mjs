import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function waitForFixture(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch('http://127.0.0.1:4173/vendor-widget.html');
      if (res.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('fixture server did not start');
}

export async function ensureFixtureServer() {
  try {
    const res = await fetch('http://127.0.0.1:4173/vendor-widget.html');
    if (res.ok) {
      return null;
    }
  } catch {
    // spawn
  }
  const child = spawn(process.execPath, [resolve(root, 'test/e2e/fixture-server.mjs')], {
    stdio: 'ignore',
    detached: false,
  });
  await waitForFixture();
  return child;
}
