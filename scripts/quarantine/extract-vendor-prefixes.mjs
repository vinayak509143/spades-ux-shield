import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatVendorCss, minePrefixesFromWidgets, prefixesFromVendorCss } from './extract-prefixes.mjs';
import { isDeniedPrefix, isThemeNativePrefix } from './denylist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const scrapedPath = resolve(root, 'temp/scraped-widgets.json');
const outPath = resolve(root, 'temp/pending-vendor-rules.css');
const vendorPath = resolve(root, 'cosmetic-vendors.css');

export function extractPending(scraped, existingCss) {
  const mined = minePrefixesFromWidgets(scraped);
  const existing = new Set(prefixesFromVendorCss(existingCss));
  const novel = mined
    .filter((row) => row.count >= 2)
    .map((row) => row.prefix)
    .filter((p) => !existing.has(p) && !isDeniedPrefix(p) && !isThemeNativePrefix(p));
  return { mined, existing: [...existing], novel, css: formatVendorCss(novel) };
}

function main() {
  mkdirSync(resolve(root, 'temp'), { recursive: true });
  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf8'));
  const existingCss = readFileSync(vendorPath, 'utf8');
  const result = extractPending(scraped, existingCss);
  writeFileSync(outPath, `/* pending — human merge to cosmetic-vendors.css after FP matrix */\n${result.css}`, 'utf8');
  console.log(`existing: ${result.existing.join(', ') || '(none)'}`);
  console.log(`mined: ${result.mined.map((r) => `${r.prefix}×${r.count}`).join(', ') || '(none)'}`);
  console.log(`novel: ${result.novel.join(', ') || '(none)'}`);
  console.log(`wrote ${outPath}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
