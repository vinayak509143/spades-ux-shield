/**
 * Capture before/after store screenshots (extension off vs on).
 * Run: npm run build && node scripts/capture-store-screenshots.mjs
 * Headless: node scripts/capture-store-screenshots.mjs --headless
 * Skips human-verification gates (Temu, Shein, Etsy, ThredUp, Expedia, Travelocity, etc.) — capture those manually in Chrome.
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shotsRoot = resolve(root, 'screenshots');
/** MV3 extensions require headed Chromium (Playwright). Avoid `channel: 'chrome'` — it can block load-extension. */
const headless = process.argv.includes('--headless');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1] : null;

const TARGETS = [
  {
    id: 'booking',
    url: 'https://www.booking.com/hotel/us/element-times-square.html?checkin=2026-10-16&checkout=2026-10-17&group_adults=2&no_rooms=1&group_children=0&lang=en-us&selected_currency=USD',
    waitMs: 10000,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  {
    id: 'flipkart',
    url: 'https://www.flipkart.com/search?q=boat+earphones',
    waitMs: 8000,
    locale: 'en-IN',
  },
  {
    id: 'agoda/serp',
    url: 'https://www.agoda.com/search?city=318&checkIn=2026-10-16&checkOut=2026-10-17&rooms=1&adults=2&children=0&locale=en-us&currency=USD',
    waitMs: 8000,
    scrollSteps: 5,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  {
    id: 'agoda/property',
    url: 'https://www.agoda.com/quality-inn_34/hotel/new-york-ny-us.html?adults=2&children=0&rooms=1&checkIn=2026-10-16&los=1&currencyCode=USD',
    waitMs: 8000,
    scrollSteps: 8,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  {
    id: 'amazon-in-pdp',
    url: 'https://www.amazon.in/dp/B0792MKTDD',
    waitMs: 8000,
    locale: 'en-IN',
  },
  {
    id: 'amazon-in-home',
    url: 'https://www.amazon.in/',
    waitMs: 7000,
    locale: 'en-IN',
  },
];

async function dismissCookies(page) {
  const btn = page.getByRole('button', { name: /accept|agree|got it|allow all|let'?s go/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

async function pageMeta(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    return {
      url: location.href,
      title: document.title,
      bodyLen: body.length,
      blocked:
        body.length < 800 ||
        /access denied|captcha|unusual activity|temporarily restricted|verify you are human|bot or not|security verification|show us your human|slide right to secure|bgn_verification|risk\/action\/limit/i.test(
          body,
        ),
      dataOp: document.documentElement.getAttribute('data-op'),
    };
  });
}

async function captureOne(withExtension, target, outPath) {
  const profile = resolve(root, `.capture-profile-${target.id}-${withExtension ? 'ext' : 'plain'}-${Date.now()}`);
  const args = withExtension ? [`--disable-extensions-except=${root}`, `--load-extension=${root}`] : [];
  const context = await chromium.launchPersistentContext(profile, {
    headless,
    args,
    viewport: { width: 1280, height: 900 },
    locale: target.locale ?? 'en-US',
    timezoneId: target.timezoneId,
  });
  try {
    if (withExtension) {
      await context.waitForEvent('serviceworker', { timeout: 45000 }).catch(() => {});
    }
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(target.waitMs ?? 8000);
    await dismissCookies(page);
    const scrollSteps = target.scrollSteps ?? 3;
    for (let i = 0; i < scrollSteps; i++) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
    if (withExtension) {
      await page
        .waitForFunction(() => document.documentElement.getAttribute('data-op') === '1', {
          timeout: 90000,
        })
        .catch(() => {});
      await page.waitForTimeout(2000);
    }
    const meta = await pageMeta(page);
    await page.screenshot({ path: outPath, fullPage: false });
    return meta;
  } finally {
    await context.close();
  }
}

function copyGygExtras() {
  const pairs = [
    ['getyourguide-options', 'gyg-options-verify-before.png', 'gyg-options-verify-after.png'],
    ['getyourguide-checkout', 'gyg-checkout-verify-before.png', 'gyg-checkout-verify-after.png'],
  ];
  for (const [id, before, after] of pairs) {
    const b = resolve(root, 'temp', before);
    const a = resolve(root, 'temp', after);
    if (!existsSync(b) || !existsSync(a)) continue;
    const dir = resolve(shotsRoot, id);
    mkdirSync(dir, { recursive: true });
    copyFileSync(b, resolve(dir, 'before.png'));
    copyFileSync(a, resolve(dir, 'after.png'));
  }
}

mkdirSync(shotsRoot, { recursive: true });
copyGygExtras();

const report = { at: new Date().toISOString(), headless, sites: [] };
const list = TARGETS.filter((t) => !only || t.id === only || t.id.startsWith(only));

for (const target of list) {
  const dir = resolve(shotsRoot, target.id);
  mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${target.id} ===`);
  let beforeMeta;
  let afterMeta;
  try {
    beforeMeta = await captureOne(false, target, resolve(dir, 'before.png'));
    console.log('before', JSON.stringify(beforeMeta));
    afterMeta = await captureOne(true, target, resolve(dir, 'after.png'));
    console.log('after', JSON.stringify(afterMeta));
  } catch (err) {
    report.sites.push({ id: target.id, error: String(err?.message || err) });
    console.error('FAIL', target.id, err);
    continue;
  }
  const usable =
    !beforeMeta.blocked &&
    !afterMeta.blocked &&
    beforeMeta.bodyLen > 1000 &&
    afterMeta.bodyLen > 1000 &&
    afterMeta.dataOp === '1';
  report.sites.push({
    id: target.id,
    url: target.url,
    usable,
    before: beforeMeta,
    after: afterMeta,
  });
}

writeFileSync(resolve(shotsRoot, 'capture-report.json'), JSON.stringify(report, null, 2));
console.log('\nWrote', resolve(shotsRoot, 'capture-report.json'));
