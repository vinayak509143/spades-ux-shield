/**
 * After `npm run build`, smoke-tests amazon-retail aliases across locales + aws must-not.
 * Run headed (default); MV3 may not activate under --headless in Playwright.
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
  const social = document.querySelector('#socialProofingAsinFaceout_feature_div');
  const dealBadges = [...document.querySelectorAll('.a-badge')].filter(
    (el) => visible(el) && /limited time deal|ends in/i.test(el.textContent || ''),
  ).length;
  const buyBox = document.querySelector('#dp, #ppd, #buybox, #centerCol');
  const atcEl = document.querySelector(
    '#add-to-cart-button, #submit\\.add-to-cart, input[name="submit.add-to-cart"], #add-to-cart-button-ubb',
  );
  const addToCart = visible(atcEl);
  const captcha = /captcha|robot/i.test(document.body?.innerText?.slice(0, 500) || '');
  return {
    buyBox: !!buyBox,
    captcha,
    dataOp: html.getAttribute('data-op'),
    dataOpAmz: html.getAttribute('data-op-amz'),
    dataOpAmzEn: html.getAttribute('data-op-amz-en'),
    socialVisible: visible(social),
    dealBadges,
    addToCart,
  };
};

const headless = process.argv.includes('--headless');
const context = await chromium.launchPersistentContext(resolve(root, `.verify-amazon-retail-${Date.now()}`), {
  headless,
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  viewport: { width: 1280, height: 900 },
});
await context.waitForEvent('serviceworker', { timeout: 25000 }).catch(() => {});
const page = context.pages()[0] ?? (await context.newPage());

let failed = false;

async function check(label, url, assert) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  const snap = await page.evaluate(vis);
  console.log(label, JSON.stringify(snap));
  try {
    assert(snap);
  } catch (e) {
    console.error(`FAIL ${label}:`, e.message);
    failed = true;
  }
}

await check('aws', 'https://aws.amazon.com/', (s) => {
  if (s.dataOpAmz === '1') throw new Error('data-op-amz set on aws.amazon.com');
});

await check('com-pdp', 'https://www.amazon.com/dp/B0792MKTDD', (s) => {
  if (s.dataOp !== '1') throw new Error('data-op not set');
  if (s.dataOpAmz !== '1') throw new Error('data-op-amz not set on retail');
  if (s.socialVisible) throw new Error('social proof visible');
});

await check('uk-pdp', 'https://www.amazon.co.uk/dp/B0792MKTDD', (s) => {
  if (s.dataOpAmz !== '1') throw new Error('data-op-amz not set');
  if (s.socialVisible) throw new Error('social proof visible');
});

await check('de-pdp', 'https://www.amazon.de/dp/B0792MKTDD', (s) => {
  if (s.dataOpAmz !== '1') throw new Error('data-op-amz not set');
  if (s.socialVisible) throw new Error('social proof visible');
  if (s.dataOpAmzEn === '1') throw new Error('data-op-amz-en must not be set on .de');
});

await check('com-search', 'https://www.amazon.com/s?k=headphones', (s) => {
  if (s.dataOpAmzEn !== '1') throw new Error('data-op-amz-en not set');
  if (s.dealBadges > 0) throw new Error(`deal badges visible: ${s.dealBadges}`);
});

await context.close();
process.exit(failed ? 1 : 0);
