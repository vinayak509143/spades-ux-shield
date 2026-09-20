/**
 * Validates spades-ux-shield-v*.zip layout for CWS / Load unpacked.
 * Usage: node scripts/verify-release-zip.mjs [path-to-zip]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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
  'dist/service-worker.js',
  'dist/subscriptions.json',
  'dist/popup/popup.html',
  'dist/popup/popup.js',
  'store/icon-128.png',
];

const zipEsc = zipPath.replace(/'/g, "''");
const listing = execSync(
  `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${zipEsc}').Entries | ForEach-Object { $_.FullName }"`,
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
);

const paths = new Set(
  listing
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\\/g, '/'))
    .filter(Boolean),
);

const missing = required.filter((p) => !paths.has(p));
if (missing.length > 0) {
  console.error('ZIP missing required entries at archive root:');
  for (const m of missing) {
    console.error(`  - ${m}`);
  }
  process.exit(1);
}

if (!paths.has('manifest.json')) {
  console.error('FAIL: manifest.json must be at zip root');
  process.exit(1);
}

const manifestRaw = execSync(
  `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[System.IO.Compression.ZipFile]::OpenRead('${zipEsc}'); $e=$z.GetEntry('manifest.json'); $r=New-Object IO.StreamReader($e.Open()); $t=$r.ReadToEnd(); $r.Close(); $z.Dispose(); $t"`,
  { encoding: 'utf8' },
);
const manifest = JSON.parse(manifestRaw);
if (manifest.manifest_version !== 3) {
  console.error('FAIL: manifest_version must be 3');
  process.exit(1);
}
if (manifest.version !== pkg.version) {
  console.error(`FAIL: manifest version ${manifest.version} !== package.json ${pkg.version}`);
  process.exit(1);
}

const repoManifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
if (repoManifest.version !== manifest.version) {
  console.error('FAIL: zipped manifest does not match repo manifest.json — rebuild zip');
  process.exit(1);
}

console.log(`verify-release-zip: OK — ${zipPath} (${paths.size} entries), manifest ${manifest.version}`);
