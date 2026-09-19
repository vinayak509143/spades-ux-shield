/**
 * After `npm run build`, checks Hurrier demo PDP urgency widgets are hidden with extension on.
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const url =
  'https://demo-hurrier-countdown-timer.myshopify.com/products/gap-disney-mickey-mouse-graphic-tee';

async function audit(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const hurry = [...document.querySelectorAll('.product-count')].filter(vis).length;
    const delivery = [...document.querySelectorAll('.delivery-time-box, .delivery-time-info')].filter(vis).length;
    const visitors = [...document.querySelectorAll('.visitors-block')].filter(vis).length;
    const addToCart = [...document.querySelectorAll('button, input[type="submit"], a')].filter(
      (el) => vis(el) && /add to cart/i.test(el.textContent || el.value || ''),
    ).length;
    const price = [...document.querySelectorAll('.product-single, form[action*="/cart"]')].filter(
      (el) => vis(el) && /\$\d+/.test(el.textContent || ''),
    ).length;
    return {
      dataOp: document.documentElement.getAttribute('data-op'),
      hurry,
      delivery,
      visitors,
      addToCart,
      price,
    };
  });
}

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(
  resolve(root, `.verify-hurrier-${Date.now()}`),
  {
    headless,
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
    viewport: { width: 1280, height: 900 },
  },
);
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);
const r = await audit(page);
console.log(url, JSON.stringify(r, null, 2));

let failed = false;
if (r.dataOp !== '1') {
  console.error('FAIL: data-op not set');
  failed = true;
}
if (r.hurry > 0) {
  console.error('FAIL: .product-count still visible', r.hurry);
  failed = true;
}
if (r.delivery > 0) {
  console.error('FAIL: delivery countdown still visible', r.delivery);
  failed = true;
}
if (r.visitors > 0) {
  console.error('FAIL: visitors block still visible', r.visitors);
  failed = true;
}
if (r.addToCart < 1) {
  console.error('FAIL: no visible Add to Cart');
  failed = true;
}

await context.close();
process.exit(failed ? 1 : 0);
