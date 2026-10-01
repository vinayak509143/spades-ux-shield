import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import bestzip from 'bestzip';
import { withFirefoxSettings } from './firefox-manifest.mjs';
import { hostCssPartName, splitHostCssMap } from './split-host-css.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const stage = resolve(root, 'dist-firefox');
const zipPath = resolve(root, `spades-ux-shield-firefox-v${pkg.version}.zip`);

/** Same paths as `npm run zip`, minus manifest.json which is rewritten. */
const STAGED_PATHS = [
  'boot.js',
  'host-mark.js',
  'host-mark-main.js',
  'cosmetic-critical.css',
  'cosmetic-vendors.css',
  'cosmetic-boot.css',
  'ATTRIBUTION.md',
  'LICENSE',
  'PRIVACY.md',
  'licenses',
  'store/icon-16.png',
  'store/icon-48.png',
  'store/icon-128.png',
  'dist',
];

function stageFile(relativePath) {
  const from = resolve(root, relativePath);
  const to = resolve(stage, relativePath);
  if (!existsSync(from)) {
    throw new Error(`Missing build file: ${relativePath}`);
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

for (const relativePath of STAGED_PATHS) {
  stageFile(relativePath);
}

const chromeManifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
const firefoxManifest = withFirefoxSettings(chromeManifest);
writeFileSync(
  resolve(stage, 'manifest.json'),
  `${JSON.stringify(firefoxManifest, null, 2)}\n`,
);

const reread = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
if (reread.browser_specific_settings) {
  throw new Error('package-firefox wrote browser_specific_settings into manifest.json');
}

// Firefox event pages load classic scripts. The Chrome bundle is ESM and ends in `export`.
await esbuild.build({
  entryPoints: [resolve(root, 'src/background/service-worker.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  outfile: resolve(stage, 'dist/service-worker.js'),
  logLevel: 'info',
});

const hostCssPath = resolve(stage, 'dist/packaged-host-css.json');
const hostCss = JSON.parse(readFileSync(hostCssPath, 'utf8'));
const parts = splitHostCssMap(hostCss);
const partNames = parts.map((part, index) => {
  const name = hostCssPartName(index + 1);
  writeFileSync(resolve(stage, 'dist', name), JSON.stringify(part));
  return name;
});
writeFileSync(
  resolve(stage, 'dist/packaged-host-css-index.json'),
  `${JSON.stringify({ files: partNames })}\n`,
);
rmSync(hostCssPath);

rmSync(zipPath, { force: true });
await bestzip({
  source: ['manifest.json', ...STAGED_PATHS],
  destination: zipPath,
  cwd: stage,
});

console.log(`Wrote ${stage}`);
console.log(`Wrote ${zipPath}`);
