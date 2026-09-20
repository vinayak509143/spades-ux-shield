/**
 * Validate lists/darklist.txt (or path arg) before merge.
 * Used locally and by spades-ux-shield-filters CI.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import { isCriticalFlowCosmetic, findCosmeticMarkerIndex } from './lib/extract-cosmetic.mjs';
import { isDeniedQuarantineLine } from './quarantine/denylist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const listPath = resolve(process.argv[2] ?? resolve(root, 'lists/darklist.txt'));
const engineBundle = resolve(root, 'scripts/.validate-engine.cjs');

buildSync({
  entryPoints: [resolve(root, 'scripts/engine-entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: engineBundle,
  logLevel: 'silent',
});

const { parseList, amazonListHostViolation } = createRequire(import.meta.url)(engineBundle);
const source = readFileSync(listPath, 'utf8');
const lines = source.split(/\r?\n/);
let failed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('!')) {
    continue;
  }
  const lineNo = i + 1;
  if (isDeniedQuarantineLine(line)) {
    console.error(`Line ${lineNo}: blocked surface (checkout/pay/auth) — ${trimmed}`);
    failed++;
    continue;
  }
  if (isCriticalFlowCosmetic(line) && !/\.example\.com\b/i.test(trimmed)) {
    console.error(`Line ${lineNo}: critical-flow cosmetic (checkout/pay/auth) — ${trimmed}`);
    failed++;
    continue;
  }
  const markerAt = findCosmeticMarkerIndex(trimmed);
  if (markerAt > 0) {
    const domainRaw = trimmed.slice(0, markerAt).trim();
    for (const part of domainRaw.split(',')) {
      const violation = amazonListHostViolation(part);
      if (violation) {
        console.error(`Line ${lineNo}: ${violation} — ${trimmed}`);
        failed++;
        break;
      }
    }
  }
}

const { rules, errors, directives } = parseList(source);
if (errors.length > 0) {
  for (const err of errors) {
    console.error(`parseList line ${err.line}: ${err.message}`);
  }
  failed += errors.length;
}

if (directives.Title !== 'Spades Darklist') {
  console.error(`! Title must be "Spades Darklist" (got ${directives.Title ?? 'missing'})`);
  failed++;
}
if (!/^\d{12}$/.test(directives.Version ?? '')) {
  console.error(`! Version must be 12 digits YYYYMMDDHHMM (got ${directives.Version ?? 'missing'})`);
  failed++;
}

const cosmeticLines = lines.filter((l) => l.trim() && !l.trim().startsWith('!'));
if (cosmeticLines.length > 0 && rules.length === 0) {
  console.error('darklist has cosmetic lines but parseList produced no rules');
  failed++;
}

if (failed > 0) {
  console.error(`validate-darklist: ${failed} problem(s) in ${listPath}`);
  process.exit(1);
}

console.log(
  `validate-darklist: OK — ${rules.length} rule(s), version ${directives.Version}, ${listPath}`,
);
