/**
 * After `npm run build`, checks Amazon.in GWM / social-proof / deal badges hide
 * with extension on, without clipping ATC, search cards, or cart checkout CTA.
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
  const html = document.documentElement;
  const dataOp = html.getAttribute('data-op');
  const dataOpAmz = html.getAttribute('data-op-amz');
  const gwmFirst = document.querySelector(
    '#gwm-window > li.gwm-window-tile:first-of-type, .gwm-window-tile[data-cel-widget="card-wd-01"], .gwm-window-tile:has([data-cel-widget="card-wd-01"])',
  );
  const social = document.querySelector('#socialProofingAsinFaceout_feature_div');
  const dealBadges = [...document.querySelectorAll('.a-badge')].filter(
    (el) => visible(el) && /limited time deal|ends in/i.test(el.textContent || ''),
  ).length;
  const addToCart = visible(document.querySelector('#add-to-cart-button'));
  const searchCards = [...document.querySelectorAll('[data-component-type="s-search-result"]')].filter(visible).length;
  const proceed = [...document.querySelectorAll('input, button, a')].filter(
    (el) => visible(el) && /proceed to (buy|checkout)/i.test(el.textContent || el.value || ''),
  ).length;
  const emptyCart = /cart is empty/i.test(document.body.innerText || '');
  return {
    dataOp,
    dataOpAmz,
    gwmFirstVisible: visible(gwmFirst),
    socialVisible: visible(social),
    dealBadges,
    addToCart,
    searchCards,
    proceed,
    emptyCart,
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-amazon-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1280, height: 900 },
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;

await page.goto('https://www.amazon.in/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);
const home = await page.evaluate(vis);
console.log('home', JSON.stringify(home));
if (home.dataOp !== '1') {
  console.error('FAIL: data-op not set on homepage');
  failed = true;
}
if (home.dataOpAmz !== '1') {
  console.error('FAIL: data-op-amz not set on amazon.in');
  failed = true;
}
if (home.gwmFirstVisible) {
  console.error('FAIL: GWM first tile still visible');
  failed = true;
}

await page.goto('https://www.amazon.in/dp/B0792MKTDD', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);
const pdp = await page.evaluate(vis);
console.log('pdp', JSON.stringify(pdp));
if (pdp.socialVisible) {
  console.error('FAIL: social-proof faceout still visible');
  failed = true;
}
if (!pdp.addToCart) {
  console.error('FAIL: Add to cart not visible');
  failed = true;
}

await page.goto('https://www.amazon.in/s?k=headphones', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);
const search = await page.evaluate(vis);
console.log('search', JSON.stringify(search));
if (search.dealBadges > 0) {
  console.error('FAIL: deal/ends-in badges still visible', search.dealBadges);
  failed = true;
}
if (search.searchCards < 3) {
  console.error('FAIL: search result cards missing');
  failed = true;
}

await page.goto('https://www.amazon.in/gp/cart/view.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);
const cart = await page.evaluate(vis);
console.log('cart', JSON.stringify(cart));
if (cart.proceed < 1 && !cart.emptyCart) {
  console.error('FAIL: Proceed to Buy not visible on cart');
  failed = true;
}

await context.close();
process.exit(failed ? 1 : 0);
