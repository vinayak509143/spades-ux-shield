/**
 * Demo-page harvester (quarantine only). Appends hostname##selector candidates to pending-review.txt.
 * Does not crawl checkout/login URLs. Does not open PRs — run validate-pending, then human PR.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeniedQuarantineLine } from './denylist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pendingPath = resolve(root, 'lists/pending-review.txt');

/** Public Shopify app marketing / demo pages (no checkout paths). */
const DEMO_URLS = [
  'https://apps.shopify.com/hurrify-countdown-timer',
  'https://apps.shopify.com/hextom-free-shipping-bar',
  'https://apps.shopify.com/privy',
  'https://apps.shopify.com/proof',
];

const VENDOR_PREFIX_HINTS = [
  'hurrify-',
  'hextom-',
  'privy-',
  'fomo-',
  'wisepops-',
  'pushowl-',
  'justuno-',
  'sales-pop-',
];

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function extractClassTokens(html) {
  const tokens = new Set();
  const re = /class\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    for (const part of m[1].split(/\s+/)) {
      if (part) {
        tokens.add(part);
      }
    }
  }
  return tokens;
}

function suggestLines(hostname, classTokens) {
  const out = [];
  for (const cls of classTokens) {
    for (const prefix of VENDOR_PREFIX_HINTS) {
      if (!cls.startsWith(prefix) && !cls.includes(prefix)) {
        continue;
      }
      const line = `${hostname}##.${cls.split(' ')[0]}`;
      if (!isDeniedQuarantineLine(line)) {
        out.push(line);
      }
    }
  }
  return [...new Set(out)];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Spades-UX-Shield-quarantine-crawl/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function main() {
  const existing = readFileSync(pendingPath, 'utf8');
  const existingSet = new Set(
    existing.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('!')),
  );
  const discovered = [];

  for (const url of DEMO_URLS) {
    const host = hostFromUrl(url);
    if (!host) {
      continue;
    }
    try {
      console.log(`Fetching ${url}…`);
      const html = await fetchHtml(url);
      const lines = suggestLines(host, extractClassTokens(html));
      console.log(`  ${lines.length} candidate line(s)`);
      for (const line of lines) {
        if (!existingSet.has(line)) {
          discovered.push(line);
          existingSet.add(line);
        }
      }
    } catch (err) {
      console.warn(`  skip: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (discovered.length === 0) {
    console.log('crawl-demos: no new candidates (vendor CSS covers prefixes; demos may not expose widgets).');
    return;
  }

  const block = '\n' + discovered.map((l) => `! crawl ${new Date().toISOString().slice(0, 10)}\n${l}`).join('\n') + '\n';
  appendFileSync(pendingPath, block, 'utf8');
  console.log(`crawl-demos: appended ${discovered.length} line(s) to lists/pending-review.txt`);
  console.log('Next: npm run validate-pending, FP matrix screenshots, PR (do not auto-merge).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
