/**
 * Validates spades-ux-shield-v*.zip layout for CWS / Load unpacked.
 * Usage: node scripts/verify-release-zip.mjs [path-to-zip]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const defaultZip = resolve(root, `spades-ux-shield-v${pkg.version}.zip`);
const zipPath = resolve(process.argv[2] ?? defaultZip);

if (!existsSync(zipPath)) {
  console.error(`Missing zip: ${zipPath}\nRun: npm run package`);
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
  const paths = new Set();
  let pos = cdOffset;
  const end = cdOffset + cdSize;
  while (pos < end) {
    if (buf.readUInt32LE(pos) !== CD_SIG) {
      break;
    }
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen);
    paths.add(name.replace(/\\/g, '/'));
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return paths;
}

const zipBuf = readFileSync(zipPath);
const paths = listZipEntries(zipBuf);

const missing = required.filter((p) => !paths.has(p));
if (missing.length > 0) {
  console.error('ZIP missing required entries at archive root:');
  for (const m of missing) {
    console.error(`  - ${m}`);
  }
  process.exit(1);
}

const repoManifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
if (repoManifest.manifest_version !== 3) {
  console.error('FAIL: manifest_version must be 3');
  process.exit(1);
}
if (repoManifest.version !== pkg.version) {
  console.error(`FAIL: manifest version ${repoManifest.version} !== package.json ${pkg.version}`);
  process.exit(1);
}

console.log(`verify-release-zip: OK — ${zipPath} (${paths.size} entries), manifest ${repoManifest.version}`);
