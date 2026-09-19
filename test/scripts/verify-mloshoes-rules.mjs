/**
 * After `npm run build`, checks mloshoes dark-pattern targets are hidden with extension on.
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const urls = ['https://mloshoes.com/', 'https://mloshoes.com/products/nrg-s100'];

async function audit(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const ids = ['header-timer-box', 'cart-timer-box'].map((id) => ({
      id,
      visible: vis(document.getElementById(id)),
    }));
    const endsInBar = [...document.querySelectorAll('.announcement__slide')].filter((el) =>
      /ends in/i.test(el.textContent || ''),
    ).map((el) => vis(el));
    const promoCountdown = [...document.querySelectorAll('.promo-countdown, .promo-price-card__ribbon-right')].filter(
      vis,
    ).length;
    const compare = [...document.querySelectorAll('.js-promo-compare, .promo-price-card__compare, .product__price--strike')]
      .filter(vis).length;
    const strikeInGrid = [...document.querySelectorAll('.price.sale s')].filter(vis).length;
    const bestSeller = [...document.querySelectorAll('.badge-box.custom-box')].filter(
      (el) => vis(el) && /best seller/i.test(el.textContent || ''),
    ).length;
    const shopCta = [...document.querySelectorAll('button, a')].filter(
      (el) => vis(el) && /add to cart|shop sale/i.test(el.textContent || ''),
    ).length;
    const heroSale = [...document.querySelectorAll('.hero__title')].filter(vis).length;
    const freeShipSlide = [...document.querySelectorAll('.announcement__slide')].filter(
      (el) => /free shipping/i.test(el.textContent || '') && vis(el),
    ).length;
    return {
      dataOp: document.documentElement.getAttribute('data-op'),
      ids,
      endsInBarVisible: endsInBar.some(Boolean),
      promoCountdown,
      compareVisible: compare,
      strikeInGrid,
      bestSeller,
      shopCta,
      heroSale,
      freeShipSlide,
    };
  });
}

const context = await chromium.launchPersistentContext(
  resolve(root, `.verify-mlo-${Date.now()}`),
  {
    headless: false,
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
    viewport: { width: 1280, height: 900 },
  },
);
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;
for (const url of urls) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  const r = await audit(page);
  console.log(url, JSON.stringify(r, null, 2));
  if (r.dataOp !== '1') {
    console.error('FAIL: data-op not set');
    failed = true;
  }
  if (r.ids.some((x) => x.visible)) {
    console.error('FAIL: timer ids still visible', r.ids);
    failed = true;
  }
  if (r.endsInBarVisible) {
    console.error('FAIL: announcement countdown slide visible');
    failed = true;
  }
  if (r.promoCountdown > 0) {
    console.error('FAIL: .promo-countdown still visible', r.promoCountdown);
    failed = true;
  }
  if (r.compareVisible > 0 || r.strikeInGrid > 0) {
    console.error('FAIL: compare-at strike still visible', r.compareVisible, r.strikeInGrid);
    failed = true;
  }
  if (r.bestSeller > 0) {
    console.error('FAIL: Best Seller badges still visible', r.bestSeller);
    failed = true;
  }
  if (r.shopCta < 1) {
    console.error('FAIL: no visible shop CTA (add to cart / shop sale)');
    failed = true;
  }
}
await context.close();
process.exit(failed ? 1 : 0);
