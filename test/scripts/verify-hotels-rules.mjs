/**
 * www.hotels.com SERP scarcity — headed Playwright (MV3). Not CI-blocking.
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SERP =
  'https://www.hotels.com/Hotel-Search?destination=New%20York&startDate=2026-10-16&endDate=2026-10-17&adults=2&rooms=1&locale=en_US';
const HOSTS = ['www.hotels.com', 'in.hotels.com'];

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
const context = await chromium.launchPersistentContext(resolve(root, `.verify-hotels-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1360, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
  geolocation: { latitude: 40.7128, longitude: -74.006 },
  permissions: ['geolocation'],
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto('about:blank');

let failed = false;
await page.goto(SERP, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(8000);
const host = await page.evaluate(() => location.hostname);
if (!HOSTS.includes(host)) {
  console.error('FAIL: unexpected hotels host', host);
  await context.close();
  process.exit(1);
}
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
}
const serp = await page.evaluate(vis);
console.log('serp', JSON.stringify(serp));
if (serp.dataOp !== '1' || !HOSTS.some((h) => serp.dataOpH?.includes(h))) {
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
