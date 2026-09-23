/**
 * Agoda hostname rules — headed Playwright (MV3). Not CI-blocking.
 * npm run verify:agoda
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SEARCH =
  'https://www.agoda.com/search?city=318&checkIn=2026-09-25&checkOut=2026-09-26&rooms=1&adults=2&children=0&locale=en-us&currency=USD';
const PDP =
  'https://www.agoda.com/quality-inn_34/hotel/new-york-ny-us.html?adults=2&children=0&rooms=1&checkIn=2026-09-25&los=1&currencyCode=USD';

const vis = () => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const count = (sel) => {
    const all = [...document.querySelectorAll(sel)];
    return { total: all.length, visible: all.filter(visible).length };
  };
  const signInVisible = [...document.querySelectorAll('a, button')].some((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return visible(el) && t.length < 40 && /sign in/i.test(t);
  });
  const priceVisible = [...document.querySelectorAll('span, div, strong, h3')].some((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return visible(el) && t.length < 48 && /(\$|USD)\s?\d/.test(t);
  });
  const cor = document.querySelector('[data-selenium="fpc-cor-price"]');
  return {
    dataOp: document.documentElement.getAttribute('data-op'),
    dataOpH: document.documentElement.getAttribute('data-op-h'),
    booked24h: count('[data-selenium="ssr-property-card-booking-last-24h"]'),
    demand: count('article.UserEngagement--demand'),
    hurry: count('[data-selenium="hurry-up-sold-out-message"]'),
    priceVisible,
    corHidden: !!cor && !visible(cor),
    signInVisible,
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-agoda-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1360, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;

await page.goto(SEARCH, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(5000);
await page.mouse.wheel(0, 2400);
await page.waitForTimeout(3000);
const serp = await page.evaluate(vis);
console.log('serp', JSON.stringify(serp));
if (serp.dataOp !== '1') {
  console.error('FAIL: data-op not set on SERP');
  failed = true;
}
if (!serp.dataOpH?.includes('www.agoda.com')) {
  console.error('FAIL: data-op-h missing www.agoda.com');
  failed = true;
}
if (serp.booked24h.visible > 0) {
  console.error('FAIL: 24h booking badge still visible', serp.booked24h);
  failed = true;
}
if (serp.corHidden) {
  console.error('FAIL: crossed-price explanation (fpc-cor-price) was hidden');
  failed = true;
}
if (!serp.priceVisible) {
  console.error('FAIL: price not visible on SERP');
  failed = true;
}
if (!serp.signInVisible) {
  console.error('FAIL: Sign in not visible on SERP');
  failed = true;
}

await page.goto(PDP, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(5000);
await page.mouse.wheel(0, 1800);
await page.waitForTimeout(3000);
const pdp = await page.evaluate(vis);
console.log('pdp', JSON.stringify(pdp));
if (pdp.dataOp !== '1' || !pdp.dataOpH?.includes('www.agoda.com')) {
  console.error('FAIL: host mark missing on property');
  failed = true;
}
if (pdp.demand.visible > 0) {
  console.error('FAIL: high-demand banner still visible', pdp.demand);
  failed = true;
}
if (pdp.hurry.visible > 0) {
  console.error('FAIL: sold-out hurry line still visible', pdp.hurry);
  failed = true;
}
if (!pdp.priceVisible) {
  console.error('FAIL: price not visible on property');
  failed = true;
}
if (!pdp.signInVisible) {
  console.error('FAIL: Sign in not visible on property');
  failed = true;
}

await context.close();
process.exit(failed ? 1 : 0);
