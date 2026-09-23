/**
 * www.travelocity.com SERP scarcity — headed Playwright (MV3). Not CI-blocking.
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SERP =
  'https://www.travelocity.com/Hotel-Search?destination=New%20York&startDate=2026-10-16&endDate=2026-10-17&adults=2&rooms=1';
const HOST = 'www.travelocity.com';

const vis = () => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const scarcity = [...document.querySelectorAll('div.uitk-text.uitk-type-end')].filter(
    (el) => visible(el) && /we have \d+ left at this price/i.test((el.textContent || '').trim()),
  );
  return {
    dataOp: document.documentElement.getAttribute('data-op'),
    dataOpH: document.documentElement.getAttribute('data-op-h'),
    scarcityVisible: scarcity.length,
    scarcityTotal: [...document.querySelectorAll('div.uitk-text.uitk-type-end')].filter((el) =>
      /we have \d+ left at this price/i.test((el.textContent || '').trim()),
    ).length,
    priceVisible: /\$\d+/.test(document.body?.innerText || ''),
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-travelocity-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1360, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;
await page.goto(SERP, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(500);
}
const serp = await page.evaluate(vis);
console.log('serp', JSON.stringify(serp));
if (serp.dataOp !== '1' || !serp.dataOpH?.includes(HOST)) {
  console.error('FAIL: host mark');
  failed = true;
}
if (serp.scarcityTotal > 0 && serp.scarcityVisible > 0) {
  console.error('FAIL: scarcity still visible', serp.scarcityVisible);
  failed = true;
}
if (!serp.priceVisible) {
  console.error('FAIL: price not visible');
  failed = true;
}

await context.close();
process.exit(failed ? 1 : 0);
