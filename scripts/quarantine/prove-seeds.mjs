/**
 * Prove seeded cosmetic-vendors.css prefixes on live/local storefronts.
 * Does not open /cart /checkout /login. Network misses are skips, not CI failures
 * unless --strict. Local fixtures fail the process.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { isFrozenHarvestUrl } from './denylist.mjs';
import { prefixesFromVendorCss } from './extract-prefixes.mjs';
import { ensureFixtureServer } from './fixture-util.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const demosPath = resolve(root, 'scripts/quarantine/shopify-demos.json');
const vendorPath = resolve(root, 'cosmetic-vendors.css');
const outPath = resolve(root, 'temp/seed-proof.json');
const STRICT = process.argv.includes('--strict');
const LOCAL_ONLY = process.argv.includes('--local');

async function inspect(page, prefixes) {
  return page.evaluate((prefs) => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const hits = {};
    for (const prefix of prefs) {
      const nodes = [
        ...document.querySelectorAll(`[class*="${prefix}"], [id*="${prefix}"]`),
      ];
      hits[prefix] = {
        count: nodes.length,
        visible: nodes.filter(vis).length,
      };
    }
    return {
      dataOp: document.documentElement.getAttribute('data-op'),
      title: document.title,
      hits,
    };
  }, prefixes);
}

async function main() {
  mkdirSync(resolve(root, 'temp'), { recursive: true });
  const { demos } = JSON.parse(readFileSync(demosPath, 'utf8'));
  const vendorCss = readFileSync(vendorPath, 'utf8');
  const allPrefixes = prefixesFromVendorCss(vendorCss);
  const targets = demos.filter((d) => (LOCAL_ONLY ? d.local : true));
  const fixtureChild = targets.some((d) => d.local) ? await ensureFixtureServer() : null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const rows = [];
  let failed = 0;
  try {
    for (const demo of targets) {
      if (isFrozenHarvestUrl(demo.url)) {
        rows.push({ app: demo.app, url: demo.url, status: 'skip', reason: 'frozen-path' });
        continue;
      }
      const page = await context.newPage();
      try {
        await page.goto(demo.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForTimeout(4000);
        await page.addStyleTag({ content: vendorCss });
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-op', '1');
        });
        const checkPrefixes = demo.prefix ? [demo.prefix] : allPrefixes;
        const info = await inspect(page, checkPrefixes);
        let status = 'pass';
        let reason = '';
        if (demo.kind === 'positive' && demo.prefix) {
          const hit = info.hits[demo.prefix];
          if (!hit || hit.count === 0) {
            status = demo.local ? 'fail' : 'skip';
            reason = 'prefix-absent';
          } else if (hit.visible > 0) {
            status = 'fail';
            reason = `still-visible:${hit.visible}`;
          } else {
            reason = `hidden:${hit.count}`;
          }
        } else if (demo.kind === 'negative') {
          const anyHide = Object.values(info.hits).some((h) => h.count > 0);
          if (anyHide) {
            status = 'fail';
            reason = 'vendor-prefix-matched-clean-store';
          } else {
            reason = 'no-vendor-hit';
          }
        } else if (demo.kind === 'theme-native' || demo.expectVendorMiss) {
          const present = Object.entries(info.hits).filter(([, h]) => h.count > 0);
          status = 'pass';
          reason = present.length
            ? `vendor-also-present:${present.map(([p]) => p).join(',')}`
            : 'vendor-miss-expected-use-hostname-rules';
        } else {
          const present = Object.entries(info.hits).filter(([, h]) => h.count > 0);
          reason = present.length
            ? present.map(([p, h]) => `${p}:${h.count}`).join(',')
            : 'no-seed-prefix';
          status = 'pass';
        }
        if (status === 'fail') {
          failed += 1;
        }
        rows.push({ app: demo.app, url: demo.url, kind: demo.kind, status, reason, hits: info.hits });
        console.log(`${status.padEnd(4)} ${demo.app} — ${reason}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = demo.local ? 'fail' : 'skip';
        if (status === 'fail') {
          failed += 1;
        }
        rows.push({ app: demo.app, url: demo.url, status, reason: message });
        console.warn(`${status} ${demo.app} — ${message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
    fixtureChild?.kill();
  }

  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2), 'utf8');
  console.log(`wrote ${outPath}`);
  if (failed > 0 || (STRICT && rows.some((r) => r.status === 'skip'))) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
