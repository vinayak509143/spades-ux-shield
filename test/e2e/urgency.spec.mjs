import { chromium, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const extensionPath = root;

test.describe('Spades UX-Shield extension', () => {
  test('hides .fake-timer without layout shift', async () => {
    const userDataDir = path.join(root, 'test/e2e/.user-data');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/urgency.html', { waitUntil: 'domcontentloaded' });

      const result = await page.evaluate(async () => {
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput && typeof entry.value === 'number') {
              cls += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });

        const timer = document.querySelector('.fake-timer');
        const hidden = timer ? getComputedStyle(timer).display === 'none' : false;
        const hasHostAttr = document.documentElement.hasAttribute('data-op-h');
        observer.disconnect();
        return { cls, hidden, hasHostAttr };
      });

      expect(result.hasHostAttr).toBe(true);
      expect(result.hidden).toBe(true);
      expect(result.cls).toBe(0);
    } finally {
      await context.close();
    }
  });
});
