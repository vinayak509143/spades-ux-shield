/**
 * Shopify vendor holdout: hide widgets, keep cart/CTA, pause restores.
 * Uses local fixtures only (no /checkout automation).
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ensureFixtureServer } from './fixture-util.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const vendorCss = readFileSync(resolve(root, 'cosmetic-vendors.css'), 'utf8');
const shots = resolve(root, 'temp/diff-reports');

async function snapshot(page, name) {
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: resolve(shots, `${name}.png`), fullPage: true });
}

function auditScript() {
  const vis = (el) => {
    if (!el) {
      return false;
    }
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const widgets = [...document.querySelectorAll('[class*="hurrify-"], [class*="hextom-"], [class*="privy-"]')];
  return {
    dataOp: document.documentElement.getAttribute('data-op'),
    widgetsVisible: widgets.filter(vis).length,
    widgetsTotal: widgets.length,
    cartVisible: vis(document.querySelector('.cart-drawer, #cart-drawer')),
    checkoutVisible: vis(document.querySelector('.checkout-cta')),
    addVisible: vis(document.querySelector('.product-form__submit, .add-to-cart')),
    priceVisible: vis(document.querySelector('.price, .product-price')),
    heroVisible: vis(document.querySelector('.hero__title')),
  };
}

async function main() {
  mkdirSync(shots, { recursive: true });
  const child = await ensureFixtureServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let failed = 0;

  try {
    await page.goto('http://127.0.0.1:4173/vendor-widget.html', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: vendorCss });
    await page.evaluate(() => document.documentElement.setAttribute('data-op', '1'));
    await snapshot(page, 'vendor-on');
    let r = await page.evaluate(auditScript);
    console.log('vendor ON', r);
    if (r.widgetsTotal < 1 || r.widgetsVisible > 0) {
      console.error('FAIL: vendor widgets not hidden');
      failed += 1;
    }
    if (!r.cartVisible || !r.checkoutVisible) {
      console.error('FAIL: cart/checkout chrome hidden');
      failed += 1;
    }

    await page.evaluate(() => document.documentElement.removeAttribute('data-op'));
    await snapshot(page, 'vendor-paused');
    r = await page.evaluate(auditScript);
    console.log('vendor PAUSED', r);
    if (r.widgetsVisible < 1) {
      console.error('FAIL: pause did not restore widgets');
      failed += 1;
    }
    if (!r.cartVisible || !r.checkoutVisible) {
      console.error('FAIL: pause broke cart');
      failed += 1;
    }

    await page.goto('http://127.0.0.1:4173/dawn-clean.html', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: vendorCss });
    await page.evaluate(() => document.documentElement.setAttribute('data-op', '1'));
    await snapshot(page, 'dawn-clean-on');
    r = await page.evaluate(auditScript);
    console.log('dawn-clean ON', r);
    if (!r.checkoutVisible || !r.addVisible || !r.priceVisible || !r.heroVisible) {
      console.error('FAIL: clean store shopping chrome hidden');
      failed += 1;
    }
    if (r.widgetsTotal > 0) {
      console.error('FAIL: vendor prefix matched Dawn-like page');
      failed += 1;
    }
  } finally {
    await browser.close();
    if (child) {
      child.kill();
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
  console.log('holdout: pass');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
