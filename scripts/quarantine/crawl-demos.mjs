/**
 * Shopify demo harvest → prefix extract. Quarantine only — no auto-merge.
 * Never crawls /cart /checkout /login.
 */
import { harvest } from './harvest-widgets.mjs';
import { extractPending } from './extract-vendor-prefixes.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function main() {
  mkdirSync(resolve(root, 'temp'), { recursive: true });
  const scraped = await harvest();
  const existingCss = readFileSync(resolve(root, 'cosmetic-vendors.css'), 'utf8');
  const result = extractPending(scraped, existingCss);
  const outPath = resolve(root, 'temp/pending-vendor-rules.css');
  writeFileSync(
    outPath,
    `/* pending — copy into cosmetic-vendors.css only after docs/FALSE_POSITIVE_MATRIX.md */\n${result.css}`,
    'utf8',
  );
  console.log(`mined: ${result.mined.map((r) => r.prefix).join(', ') || '(none)'}`);
  console.log(`novel: ${result.novel.join(', ') || '(none)'}`);
  console.log(`wrote ${outPath}`);
  console.log('Next: npm run validate-pending (hostname queue), FP matrix, human merge. Do not auto-commit.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
