/**
 * www.etsy.com listing scarcity + sale countdown — headed Playwright (MV3).
 * Automation is often challenged; a challenge is incomplete, not a pass.
 * npm run verify:etsy
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SEARCH = 'https://www.etsy.com/search?q=personalized+necklace';

const vis = () => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const body = document.body?.innerText || '';
  const scarcity = [...document.querySelectorAll('p.wt-sem-text-critical')].filter(
    (el) => visible(el) && /only \d+ left|in \d+\+? carts/i.test((el.textContent || '').trim()),
  );
  const countdown = [...document.querySelectorAll('p[data-24-hour-sale-wrapper]')].filter(visible);
  const addToCart = [...document.querySelectorAll('button, a')].find(
    (el) => visible(el) && /^add to cart$/i.test((el.textContent || '').replace(/\s+/g, ' ').trim()),
  );
  return {
    blocked: /temporarily restricted|unusual activity|verify you are human/i.test(body) || body.length < 800,
    dataOp: document.documentElement.getAttribute('data-op'),
    dataOpH: document.documentElement.getAttribute('data-op-h'),
    scarcityVisible: scarcity.length,
    countdownVisible: countdown.length,
    addToCartVisible: !!addToCart,
    priceVisible: /[₹$£€]\s?[\d,]+/.test(body),
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-etsy-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1360, height: 900 },
  locale: 'en-US',
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;
await page.goto(SEARCH, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(6000);
const search = await page.evaluate(vis);
console.log('search', JSON.stringify(search));
if (search.blocked) {
  console.error('INCOMPLETE: Etsy challenged automation. Confirm on a normal listing: scarcity and countdown gone, price and Add to cart stay.');
  await context.close();
  process.exit(2);
}

const href = await page.locator('a[href*="/listing/"]').first().getAttribute('href').catch(() => null);
if (!href) {
  console.error('INCOMPLETE: no listing link');
  await context.close();
  process.exit(2);
}
await page.goto(href.split('?')[0], { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(8000);
const listing = await page.evaluate(vis);
console.log('listing', JSON.stringify(listing));
if (listing.blocked) {
  console.error('INCOMPLETE: listing challenged');
  await context.close();
  process.exit(2);
}
if (listing.dataOp !== '1' || !listing.dataOpH?.includes('www.etsy.com')) {
  console.error('FAIL: host mark missing');
  failed = true;
}
if (listing.scarcityVisible > 0) {
  console.error('FAIL: scarcity line still visible');
  failed = true;
}
if (listing.countdownVisible > 0) {
  console.error('FAIL: sale countdown still visible');
  failed = true;
}
if (!listing.addToCartVisible || !listing.priceVisible) {
  console.error('FAIL: price or Add to cart missing');
  failed = true;
}

await context.close();
if (failed) process.exit(1);
console.log('etsy rules ok');
