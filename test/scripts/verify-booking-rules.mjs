/**
 * Booking.com hostname rules — headed Playwright (MV3). Not CI-blocking.
 * npm run verify:booking
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DATES =
  'checkin=2026-09-25&checkout=2026-09-26&group_adults=2&no_rooms=1&group_children=0&lang=en-us';

const vis = () => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const scarcityNodes = [...document.querySelectorAll('li.bui-list__item.bui-text--color-destructive-dark')].filter((el) =>
    /we have \d+ left/i.test((el.textContent || '').trim()),
  );
  const scarcity = scarcityNodes.filter(visible).length;
  const reserve = document.querySelector('#hp_book_now_button');
  const price = document.querySelector('[data-testid="price-and-discounted-price"], .bui-price-display__value, .prco-valign-middle-helper');
  const signIn = document.querySelector('[data-testid="header-sign-in-button"]');
  return {
    dataOp: document.documentElement.getAttribute('data-op'),
    dataOpH: document.documentElement.getAttribute('data-op-h'),
    scarcity,
    scarcityTotal: scarcityNodes.length,
    reserveVisible: visible(reserve),
    priceVisible: visible(price),
    signInVisible: visible(signIn),
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-booking-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1360, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;

await page.goto(
  `https://www.booking.com/searchresults.html?ss=New+York&${DATES}&selected_currency=USD`,
  { waitUntil: 'domcontentloaded', timeout: 120000 },
);
await page.waitForTimeout(8000);
const serp = await page.evaluate(vis);
console.log('serp', JSON.stringify(serp));
if (serp.dataOp !== '1') {
  console.error('FAIL: data-op not set on SERP');
  failed = true;
}
if (!serp.dataOpH?.includes('www.booking.com')) {
  console.error('FAIL: data-op-h missing www.booking.com');
  failed = true;
}

await page.goto(`https://www.booking.com/hotel/us/element-times-square.html?${DATES}`, {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForTimeout(8000);
const pdp = await page.evaluate(vis);
console.log('pdp', JSON.stringify(pdp));
if (pdp.dataOp !== '1' || !pdp.dataOpH?.includes('www.booking.com')) {
  console.error('FAIL: host mark missing on property');
  failed = true;
}
if (pdp.scarcity > 0) {
  console.error('FAIL: room-table "We have N left" still visible', pdp.scarcity);
  failed = true;
}
if (!pdp.reserveVisible) {
  console.error('FAIL: Reserve (#hp_book_now_button) not visible');
  failed = true;
}
if (!pdp.priceVisible) {
  console.error('FAIL: price not visible');
  failed = true;
}
if (!pdp.signInVisible) {
  console.error('FAIL: Sign in not visible');
  failed = true;
}

await context.close();
process.exit(failed ? 1 : 0);
