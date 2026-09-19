import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import { isExtractableCosmeticLine } from '../lib/extract-cosmetic.mjs';
import { isDeniedQuarantineLine } from './denylist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pendingPath = resolve(root, 'lists/pending-review.txt');
const require = createRequire(import.meta.url);
const engineBundle = resolve(root, 'scripts/.validate-engine.cjs');

buildSync({
  entryPoints: [resolve(root, 'scripts/engine-entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: engineBundle,
  logLevel: 'silent',
});

const { parseList } = require(engineBundle);

const source = readFileSync(pendingPath, 'utf8');
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
    console.error(`Line ${lineNo}: denylist (${trimmed})`);
    failed++;
    continue;
  }
  if (!isExtractableCosmeticLine(line)) {
    console.error(`Line ${lineNo}: not extractable / frozen (${trimmed})`);
    failed++;
    continue;
  }
}

const { rules, errors } = parseList(source);
if (errors.length > 0) {
  for (const err of errors) {
    console.error(`parseList line ${err.line}: ${err.message}`);
  }
  failed += errors.length;
}

const cosmeticLines = lines.filter((l) => l.trim() && !l.trim().startsWith('!'));
if (cosmeticLines.length > 0 && rules.length === 0) {
  console.error('pending-review.txt has cosmetic lines but parseList produced no rules');
  failed++;
}

if (failed > 0) {
  console.error(`validate-pending: ${failed} problem(s)`);
  process.exit(1);
}

console.log(
  `validate-pending: OK (${rules.length} rule(s), ${cosmeticLines.length} cosmetic line(s) in file)`,
);
