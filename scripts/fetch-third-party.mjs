import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCosmeticLines } from './lib/extract-cosmetic.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'third-party-rules.txt');

const SOURCES = [
  {
    name: "Fanboy's Annoyance List",
    url: 'https://secure.fanboy.co.nz/fanboy-annoyance.txt',
  },
  {
    name: 'AdGuard Annoyances',
    url: 'https://filters.adtidy.org/extension/chromium/filters/14.txt',
  },
];

const MAX_LINES = Number(process.env.THIRD_PARTY_MAX_LINES || '30000');

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Spades-UX-Shield-filter-fetch/1.0' },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function main() {
  const merged = new Set();
  const header = [
    '! Title: Spades UX-Shield Third-Party Cosmetic (extracted)',
    `! Version: ${new Date().toISOString().replace(/[-:]/g, '').slice(0, 12)}`,
    '! Sources: Fanboy Annoyance + AdGuard Annoyances (hostname ## rules only)',
    '! Licenses: GPL-3.0 / CC BY-SA 3.0 — see ATTRIBUTION.md',
    '! Run: npm run update-filters',
    '',
  ];

  for (const source of SOURCES) {
    console.log(`Fetching ${source.name}…`);
    const text = await fetchText(source.url);
    const { lines, stats } = extractCosmeticLines(text);
    console.log(
      `  ${source.name}: scanned ${stats.scanned}, kept ${stats.kept} cosmetic lines`,
    );
    for (const line of lines) {
      merged.add(line);
    }
  }

  let allLines = [...merged];
  if (allLines.length > MAX_LINES) {
    console.warn(
      `Capping third-party rules at ${MAX_LINES} (set THIRD_PARTY_MAX_LINES to override)`,
    );
    allLines = allLines.slice(0, MAX_LINES);
  }

  allLines.sort();
  const body = [...header, ...allLines].join('\n') + '\n';
  writeFileSync(outPath, body, 'utf8');
  console.log(`Wrote ${allLines.length} rules to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
