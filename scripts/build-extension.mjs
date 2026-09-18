import { mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(root, 'dist');

mkdirSync(distDir, { recursive: true });

await import('./build-packaged-rules.mjs');

await esbuild.build({
  entryPoints: [resolve(root, 'src/content/host-mark-entry.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: resolve(root, 'host-mark.js'),
  logLevel: 'info',
});

await esbuild.build({
  entryPoints: [resolve(root, 'src/content/boot.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: resolve(root, 'boot.js'),
  logLevel: 'info',
});

await esbuild.build({
  entryPoints: [resolve(root, 'src/background/service-worker.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: resolve(root, 'dist/service-worker.js'),
  logLevel: 'info',
});

copyFileSync(
  resolve(root, 'src/background/subscriptions.json'),
  resolve(distDir, 'subscriptions.json'),
);

const popupDir = resolve(distDir, 'popup');
mkdirSync(popupDir, { recursive: true });
copyFileSync(resolve(root, 'src/popup/popup.html'), resolve(popupDir, 'popup.html'));

await esbuild.build({
  entryPoints: [resolve(root, 'src/popup/popup.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: resolve(popupDir, 'popup.js'),
  logLevel: 'info',
});

console.log('Wrote boot.js, dist/service-worker.js, dist/popup/, dist/subscriptions.json');
