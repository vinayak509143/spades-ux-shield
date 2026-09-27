/**
 * Strip session/query noise from local Temu audit JSON for sharing or catalog updates.
 * Reads temp/temu-open-tabs.json or temp/temu-chips.json, writes temp/temu-export-sanitized.json.
 *
 * Run: node scripts/sanitize-temu-export.mjs [input.json]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(root, process.argv[2] ?? 'temp/temu-open-tabs.json');
if (!existsSync(inputPath)) {
  console.error(`Missing ${inputPath}`);
  process.exit(1);
}

function sanitizeUrl(href) {
  if (!href || typeof href !== 'string') return href;
  try {
    const u = new URL(href);
    return `${u.origin}${u.pathname}`;
  } catch {
    return href.split('?')[0];
  }
}

function walk(value) {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'href') out[k] = sanitizeUrl(v);
      else out[k] = walk(v);
    }
    return out;
  }
  return value;
}

const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
const sanitized = walk(raw);
const outPath = resolve(root, 'temp/temu-export-sanitized.json');
writeFileSync(outPath, JSON.stringify(sanitized, null, 2));
console.log(`Wrote ${outPath}`);
