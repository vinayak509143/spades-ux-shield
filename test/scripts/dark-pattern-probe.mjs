/**
 * Load unpacked extension and probe sites where cosmetic lists often apply.
 * Not a guarantee of "dark pattern fixed" — reports injection + visible CMP-ish overlays.
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const SITES = [
  { name: 'Amazon.in (GWM/ATF)', url: 'https://www.amazon.in/', kind: 'amazon' },
  { name: 'The Guardian (cookie wall)', url: 'https://www.theguardian.com/international', kind: 'cmp' },
  { name: 'Stack Overflow (consent)', url: 'https://stackoverflow.com/', kind: 'cmp' },
  { name: 'Reddit (consent)', url: 'https://www.reddit.com/', kind: 'cmp' },
  { name: 'NYTimes (consent)', url: 'https://www.nytimes.com/', kind: 'cmp' },
  { name: 'Forbes (consent)', url: 'https://www.forbes.com/', kind: 'cmp' },
  { name: 'Medium (signup nag)', url: 'https://medium.com/', kind: 'cmp' },
  { name: 'eBay (consent)', url: 'https://www.ebay.com/', kind: 'cmp' },
  { name: 'CNN (consent)', url: 'https://edition.cnn.com/', kind: 'cmp' },
  { name: 'India Times (consent)', url: 'https://timesofindia.indiatimes.com/', kind: 'cmp' },
];

const CMP_SELECTORS = [
  '#onetrust-banner-sdk',
  '#onetrust-consent-sdk',
  '.fc-consent-root',
  '#CybotCookiebotDialog',
  '#sp-cc',
  '[class*="sp_message"]',
  '[id*="sp_message"]',
  '#truste-consent-track',
  '.qc-cmp2-container',
  '[aria-label*="cookie" i]',
  '[class*="cookie-banner" i]',
  '[class*="consent" i][role="dialog"]',
];

async function probePage(page, kind) {
  return page.evaluate(
    ({ kind, cmpSelectors }) => {
      const isVisible = (el) => {
        if (!el) return false;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 40;
      };

      const html = document.documentElement;
      const out = {
        dataOp: html.getAttribute('data-op') === '1',
        dataOpH: (html.getAttribute('data-op-h') || '').slice(0, 80),
        visibleCmp: [],
        amazon: {},
      };

      for (const sel of cmpSelectors) {
        try {
          const nodes = document.querySelectorAll(sel);
          for (const el of nodes) {
            if (isVisible(el)) {
              out.visibleCmp.push(sel);
              break;
            }
          }
        } catch {
          // invalid in old engines
        }
      }

      if (kind === 'amazon') {
        const gwmFirst = document.querySelector('#gwm-window > .gwm-window-tile:first-child, #gwm-window > li.gwm-window-tile:first-of-type');
        const stripe = document.querySelector('#desktop-banner-stripe');
        out.amazon = {
          gwmFirstVisible: isVisible(gwmFirst),
          stripeVisible: isVisible(stripe),
        };
      }

      return out;
    },
    { kind, cmpSelectors: CMP_SELECTORS },
  );
}

async function main() {
  const userDataDir = resolve(root, '.stress-profile-probe');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
    viewport: { width: 1280, height: 800 },
  });

  await context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});

  const page = context.pages()[0] ?? (await context.newPage());
  const rows = [];

  for (const site of SITES) {
    const row = { ...site, status: 'ok', error: null, probe: null, ms: 0 };
    const t0 = Date.now();
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(3500);
      row.probe = await probePage(page, site.kind);
      if (!row.probe.dataOp) {
        row.status = 'warn';
        row.error = 'extension host-mark missing (data-op)';
      } else if (site.kind === 'amazon' && row.probe.amazon?.gwmFirstVisible) {
        row.status = 'partial';
        row.error = 'first GWM tile still visible';
      } else if (site.kind === 'cmp' && row.probe.visibleCmp.length > 0) {
        row.status = 'partial';
        row.error = `CMP still visible: ${row.probe.visibleCmp.slice(0, 3).join(', ')}`;
      } else if (site.kind === 'cmp') {
        row.status = 'ok';
        row.error = 'no large CMP matched (may still have other dark patterns)';
      }
    } catch (err) {
      row.status = 'error';
      row.error = err.message;
    }
    row.ms = Date.now() - t0;
    rows.push(row);
    console.log(JSON.stringify(row));
  }

  await context.close();

  console.log('\n--- summary ---');
  for (const r of rows) {
    console.log(`${r.status.padEnd(8)} ${r.name} (${r.ms}ms) ${r.error ?? ''}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
