/**
 * Spam-reload amazon.in with the unpacked extension.
 * Waits for Gateway Window / carousel, then fails on visible ATF promo or empty hero gap.
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ITERATIONS = Number(process.env.STRESS_ITERATIONS || '20');
const TARGET_URL = 'https://www.amazon.in/';

async function waitForHero(page) {
  await page
    .waitForSelector('#gwm-window, .a-carousel, #desktop-banner-stripe', {
      timeout: 12_000,
    })
    .catch(() => {});
}

async function sampleFrames(page) {
  return page.evaluate(async ({ hostNeedle }) => {
    const isVisible = (el) => {
      if (!el) {
        return false;
      }
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2;
    };

      const promoRe = /pre-book|sale starts|amazon now|amazon-bazaar|orders above|flat\s*₹\s*100/i;

    const checkHero = () => {
      const issues = [];
      const html = document.documentElement;
      if (html.getAttribute('data-op') !== '1') {
        issues.push('missing-data-op');
      }
      const mark = html.getAttribute('data-op-h') || '';
      if (!mark.includes(hostNeedle)) {
        issues.push('missing-data-op-h');
      }

      for (const sel of ['#desktop-banner-stripe', '#nav-app-banner-container']) {
        if (isVisible(document.querySelector(sel))) {
          issues.push(`visible:${sel}`);
        }
      }

      const firstGwm = document.querySelector('#gwm-window > .gwm-window-tile');
      if (firstGwm && isVisible(firstGwm)) {
        issues.push('visible-gwm-first-tile');
      }

      const wd01 = document.querySelector('[data-cel-widget="card-wd-01"]');
      if (wd01 && isVisible(wd01)) {
        issues.push('visible-card-wd-01');
      }

      const tiles = document.querySelectorAll('#gwm-window > .gwm-window-tile');
      let firstVisible = null;
      for (const tile of tiles) {
        if (isVisible(tile)) {
          firstVisible = tile;
          break;
        }
      }
      if (firstVisible) {
        const rect = firstVisible.getBoundingClientRect();
        if (rect.left > 120 && firstGwm && !isVisible(firstGwm)) {
          issues.push('empty-gwm-hero-slot');
        }
        const text = (firstVisible.textContent || '').replace(/\s+/g, ' ');
        if (rect.left < 80) {
          if (
            firstVisible.querySelector('[class*="single-video-card"]')
          ) {
            issues.push('visible-hero-promo');
          } else if (promoRe.test(text)) {
            issues.push('visible-hero-promo');
          }
        }
      }

      const cards = document.querySelectorAll('.a-carousel-card');
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (rect.left > 420 || rect.width < 60) {
          continue;
        }
        const stripe = card.querySelector('#desktop-banner-stripe');
        if (stripe && !isVisible(stripe) && isVisible(card) && rect.height > 80) {
          issues.push('empty-hero-carousel-slot');
        }
        if (isVisible(card) && promoRe.test((card.textContent || '').replace(/\s+/g, ' '))) {
          issues.push('visible-hero-promo');
        }
      }

      return issues;
    };

    const issues = [];
    const checkOnce = () => {
      issues.push(...checkHero());
    };
    checkOnce();
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      checkOnce();
    }
    return [...new Set(issues)];
  }, { hostNeedle: 'amazon.in' });
}

async function main() {
  const userDataDir = resolve(root, '.stress-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${root}`,
      `--load-extension=${root}`,
    ],
    viewport: { width: 1400, height: 900 },
  });

  if (context.serviceWorkers().length === 0) {
    await context.waitForEvent('serviceworker', { timeout: 15_000 }).catch(() => {});
  }

  const page = context.pages()[0] ?? (await context.newPage());
  const failures = [];

  for (let i = 0; i < ITERATIONS; i++) {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForHero(page);
    let issues;
    try {
      issues = await sampleFrames(page);
    } catch (err) {
      failures.push({ iteration: i + 1, issues: [`evaluate-error:${err.message}`] });
      console.error(`FAIL reload ${i + 1}: evaluate error`);
      continue;
    }
    if (issues.length > 0) {
      failures.push({ iteration: i + 1, issues });
      console.error(`FAIL reload ${i + 1}:`, issues.join(', '));
    } else {
      console.log(`ok reload ${i + 1}`);
    }
  }

  await context.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length}/${ITERATIONS} reloads leaked`);
    process.exit(1);
  }
  console.log(`\n${ITERATIONS}/${ITERATIONS} reloads clean`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
