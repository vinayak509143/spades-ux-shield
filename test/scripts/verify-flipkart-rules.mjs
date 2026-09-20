/**
 * Flipkart hostname rules — headed Playwright (MV3).
 * npm run build && node test/scripts/verify-flipkart-rules.mjs
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const vis = () => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const scarcity = [...document.querySelectorAll('div.HZ0E6r.Rm9_cy')].filter(
    (el) => visible(el) && /^only (few|\d+ left)/i.test((el.textContent || '').trim()),
  ).length;
  const bankOffer = [...document.querySelectorAll('div.HZ0E6r.Rm9_cy')].filter(
    (el) => visible(el) && /bank offer/i.test((el.textContent || '').trim()),
  ).length;
  const atc = [...document.querySelectorAll('div, button')].find(
    (el) => visible(el) && /^(add to cart|buy now)$/i.test((el.textContent || '').trim()),
  );
  const price = document.querySelector('div[class*="_30jeq3"], div[class*="_16Jk6d"]');
  const proceed = [...document.querySelectorAll('button, a, div')].filter(
    (el) => visible(el) && /place order|continue|deliver here/i.test(el.textContent || ''),
  ).length;
  return {
    dataOp: document.documentElement.getAttribute('data-op'),
    dataOpH: document.documentElement.getAttribute('data-op-h'),
    scarcity,
    bankOffer,
    atcVisible: !!atc,
    priceVisible: visible(price),
    proceed,
    emptyCart: /your cart is empty|missing cart items/i.test(document.body?.innerText || ''),
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-flipkart-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1280, height: 900 },
  locale: 'en-IN',
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;

await page.goto('https://www.flipkart.com/search?q=boat+earphones', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForTimeout(6000);
const serp = await page.evaluate(vis);
console.log('serp', JSON.stringify(serp));
if (serp.dataOp !== '1') {
  console.error('FAIL: data-op not set on SERP');
  failed = true;
}
if (!serp.dataOpH?.includes('flipkart.com')) {
  console.error('FAIL: data-op-h missing flipkart.com');
  failed = true;
}
if (serp.scarcity > 0) {
  console.error('FAIL: scarcity chips still visible', serp.scarcity);
  failed = true;
}
if (serp.bankOffer < 1) {
  console.error('FAIL: expected Bank Offer chip to remain visible (FP guard)');
  failed = true;
}

const href = await page.locator('a[href*="/p/"]').first().getAttribute('href');
if (href) {
  const path = href.startsWith('http') ? href.split('?')[0] : `https://www.flipkart.com${href.split('?')[0]}`;
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(6000);
  const pdp = await page.evaluate(vis);
  console.log('pdp', JSON.stringify(pdp));
  if (!pdp.atcVisible) {
    console.error('FAIL: Add to cart / Buy now not visible on PDP');
    failed = true;
  }
}

await page.goto('https://www.flipkart.com/viewcart', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(4000);
const cart = await page.evaluate(vis);
console.log('cart', JSON.stringify(cart));
if (cart.proceed < 1 && !cart.emptyCart) {
  console.error('FAIL: cart CTA missing with items in cart');
  failed = true;
}

await context.close();
process.exit(failed ? 1 : 0);
