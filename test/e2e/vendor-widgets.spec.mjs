import { chromium, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const extensionPath = root;

test.describe('Vendor cosmetic CSS', () => {
  test('hides hurrify- prefix on unlisted host; checkout CTA stays visible', async () => {
    const userDataDir = path.join(root, 'test/e2e/.user-data-vendor');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/vendor-widget.html', {
        waitUntil: 'domcontentloaded',
      });

      const result = await page.evaluate(() => {
        const timer = document.querySelector('.hurrify-countdown-bar');
        const cta = document.querySelector('.checkout-cta');
        return {
          hasOp: document.documentElement.getAttribute('data-op') === '1',
          timerHidden: timer ? getComputedStyle(timer).display === 'none' : false,
          ctaVisible: cta ? getComputedStyle(cta).display !== 'none' : false,
        };
      });

      expect(result.hasOp).toBe(true);
      expect(result.timerHidden).toBe(true);
      expect(result.ctaVisible).toBe(true);
      const cart = await page.evaluate(() => {
        const drawer = document.querySelector('#cart-drawer');
        return drawer ? getComputedStyle(drawer).display !== 'none' : false;
      });
      expect(cart).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('Dawn-like store keeps product chrome; pause restores vendor widget', async () => {
    const userDataDir = path.join(root, 'test/e2e/.user-data-vendor-holdout');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/dawn-clean.html', { waitUntil: 'domcontentloaded' });
      const clean = await page.evaluate(() => {
        const vis = (sel) => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el).display !== 'none' : false;
        };
        return {
          hasOp: document.documentElement.getAttribute('data-op') === '1',
          hero: vis('.hero__title'),
          price: vis('.price'),
          add: vis('.product-form__submit'),
          checkout: vis('.checkout-cta'),
        };
      });
      expect(clean.hasOp).toBe(true);
      expect(clean.hero).toBe(true);
      expect(clean.price).toBe(true);
      expect(clean.add).toBe(true);
      expect(clean.checkout).toBe(true);

      await page.goto('http://127.0.0.1:4173/vendor-widget.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.documentElement.removeAttribute('data-op'));
      const restored = await page.evaluate(() => {
        const timer = document.querySelector('.hurrify-countdown-bar');
        return timer ? getComputedStyle(timer).display !== 'none' : false;
      });
      expect(restored).toBe(true);
    } finally {
      await context.close();
    }
  });
});
