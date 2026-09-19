import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const home = 'https://mloshoes.com/';
const product = 'https://mloshoes.com/products/nrg-s100';

async function inventory(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const sample = (sel) =>
      [...document.querySelectorAll(sel)].slice(0, 8).map((el) => ({
        sel,
        tag: el.tagName,
        id: el.id,
        cls: (el.className || '').toString().slice(0, 120),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
        visible: vis(el),
      }));

    const ids = ['header-timer-box', 'cart-timer-box', 'header-timer-text', 'cart-timer-text'];
    const byId = ids.map((id) => {
      const el = document.getElementById(id);
      return el
        ? { id, visible: vis(el), text: (el.textContent || '').trim().slice(0, 80) }
        : { id, missing: true };
    });

    const priceBits = sample(
      '.price, .price__container, .price-item, .price__regular, .price__sale, .price--on-sale, s, del, .compare-at, [class*="compare"], .product__price, .cart__price',
    );
    const badges = sample('.badge, .product__badge, [class*="badge"], .best-seller, [class*="best"]');
    const announce = sample('.page-announcement, .announcement__bar, .announcement__message');
    const popups = sample(
      '[class*="popup"], [class*="modal"], [id*="klaviyo"], [class*="klaviyo"], .needsclick, [aria-modal="true"]',
    );
    const stock = [...document.querySelectorAll('*')]
      .filter((el) => {
        const t = (el.textContent || '').trim();
        return t.length < 80 && /only \d+ left|low stock|selling fast|almost gone/i.test(t);
      })
      .slice(0, 10)
      .map((el) => ({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 100),
        text: (el.textContent || '').trim(),
        visible: vis(el),
      }));

    return {
      url: location.href,
      dataOp: document.documentElement.getAttribute('data-op'),
      byId,
      priceBits,
      badges,
      announce,
      popups: popups.filter((p) => p.visible),
      stock,
    };
  });
}

async function runPage(url, loadExt) {
  const context = await chromium.launchPersistentContext(
    resolve(root, `.probe-mlo-full-${loadExt}-${Date.now()}`),
    {
      headless: true,
      args: loadExt ? [`--disable-extensions-except=${root}`, `--load-extension=${root}`] : [],
      viewport: { width: 1280, height: 900 },
    },
  );
  const page = context.pages()[0] ?? (await context.newPage());
  if (loadExt) await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);
  const data = await inventory(page);
  await context.close();
  return data;
}

for (const url of [home, product]) {
  console.log('\n===', url, '===');
  console.log(JSON.stringify(await runPage(url, true), null, 2));
}
