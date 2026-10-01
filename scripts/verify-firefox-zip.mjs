/**
 * Validates spades-ux-shield-firefox-v*.zip.
 * Usage: node scripts/verify-firefox-zip.mjs [path-to-zip]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIREFOX_ANDROID_MIN_VERSION, FIREFOX_EXTENSION_ID, FIREFOX_MIN_VERSION } from './firefox-manifest.mjs';
import { HOST_CSS_PART_MAX_BYTES } from './split-host-css.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const defaultZip = resolve(root, `spades-ux-shield-firefox-v${pkg.version}.zip`);
const zipPath = resolve(process.argv[2] ?? defaultZip);

if (!existsSync(zipPath)) {
  console.error(`Missing zip: ${zipPath}\nRun: npm run package:firefox`);
  process.exit(1);
}

const required = [
  'manifest.json',
  'boot.js',
  'host-mark.js',
  'host-mark-main.js',
  'cosmetic-critical.css',
  'cosmetic-vendors.css',
  'cosmetic-boot.css',
  'LICENSE',
  'ATTRIBUTION.md',
  'PRIVACY.md',
  'licenses/GPL-3.0.txt',
  'licenses/CC-BY-SA-3.0.txt',
  'dist/service-worker.js',
  'dist/subscriptions.json',
  'dist/popup/popup.html',
  'dist/popup/popup.js',
  'store/icon-16.png',
  'store/icon-48.png',
  'store/icon-128.png',
];

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;

function findEocdOffset(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      return i;
    }
  }
  return -1;
}

function listZipEntries(buf) {
  const eocd = findEocdOffset(buf);
  if (eocd < 0) {
    throw new Error('Invalid zip: end of central directory not found');
  }
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  let pos = cdOffset;
  const end = cdOffset + cdSize;
  while (pos < end) {
    if (buf.readUInt32LE(pos) !== CD_SIG) {
      break;
    }
    const uncompressed = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen).replace(/\\/g, '/');
    entries.set(name, uncompressed);
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readZipText(archivePath, entryName) {
  return execFileSync('tar', ['-xOf', archivePath, entryName], { encoding: 'utf8' });
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const zipBuf = readFileSync(zipPath);
const entries = listZipEntries(zipBuf);
const paths = new Set(entries.keys());
const missing = required.filter((entry) => !paths.has(entry));
if (missing.length > 0) {
  console.error('ZIP missing required entries at archive root:');
  for (const entry of missing) {
    console.error(`  - ${entry}`);
  }
  process.exit(1);
}

const firefoxManifest = JSON.parse(readZipText(zipPath, 'manifest.json'));
const gecko = firefoxManifest.browser_specific_settings?.gecko;
if (gecko?.id !== FIREFOX_EXTENSION_ID) {
  fail(`Firefox id ${gecko?.id} !== ${FIREFOX_EXTENSION_ID}`);
}
if (gecko?.strict_min_version !== FIREFOX_MIN_VERSION) {
  fail(`strict_min_version ${gecko?.strict_min_version} !== ${FIREFOX_MIN_VERSION}`);
}
if (JSON.stringify(gecko?.data_collection_permissions) !== JSON.stringify({ required: ['none'] })) {
  fail('Firefox data_collection_permissions must be required: ["none"]');
}
if (firefoxManifest.browser_specific_settings?.gecko_android?.strict_min_version !== FIREFOX_ANDROID_MIN_VERSION) {
  fail(`Firefox for Android minimum must be ${FIREFOX_ANDROID_MIN_VERSION}`);
}
if (firefoxManifest.manifest_version !== 3) {
  fail('manifest_version must be 3');
}
if (firefoxManifest.version !== pkg.version) {
  fail(`Firefox zip version ${firefoxManifest.version} !== package.json ${pkg.version}`);
}
const background = firefoxManifest.background;
if (!Array.isArray(background?.scripts) || background.scripts.length !== 1) {
  fail('Firefox background.scripts must list the service worker file');
}
if (background.service_worker || background.type) {
  fail('Firefox background must be an event page, not a service worker');
}
const workerSource = readZipText(zipPath, background.scripts[0]);
if (/^\s*export\s/m.test(workerSource) || /^\s*import\s/m.test(workerSource)) {
  fail('Firefox background script must be a classic script');
}

if (paths.has('dist/packaged-host-css.json')) {
  fail('Firefox zip must split packaged-host-css.json');
}
const index = JSON.parse(readZipText(zipPath, 'dist/packaged-host-css-index.json'));
if (!Array.isArray(index.files) || index.files.length === 0) {
  fail('packaged-host-css-index.json must list at least one part');
}
for (const file of index.files) {
  const entry = `dist/${file}`;
  const size = entries.get(entry);
  if (size == null) {
    fail(`Missing host CSS part ${entry}`);
  }
  if (size > HOST_CSS_PART_MAX_BYTES) {
    fail(`${entry} is ${size} bytes, over ${HOST_CSS_PART_MAX_BYTES}`);
  }
}

const repoManifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
if (repoManifest.browser_specific_settings) {
  fail('repo manifest.json contains browser_specific_settings');
}

const chromeZip = resolve(root, `spades-ux-shield-v${pkg.version}.zip`);
if (existsSync(chromeZip)) {
  const chromeManifest = JSON.parse(readZipText(chromeZip, 'manifest.json'));
  if (chromeManifest.browser_specific_settings) {
    fail('Chrome zip contains browser_specific_settings');
  }
}

console.log(
  `verify-firefox-zip: OK \u2014 ${zipPath} (${paths.size} entries), id ${FIREFOX_EXTENSION_ID}, Firefox ${FIREFOX_MIN_VERSION}+`,
);
