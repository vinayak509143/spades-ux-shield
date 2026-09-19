/**
 * Probe one URL with extension on vs off (new context each).
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const url = process.argv[2] || 'https://mloshoes.com/';

async function sample(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };

    const textHits = [];
    const walk = (root) => {
      const t = (root.innerText || '').slice(0, 5000);
      if (/ends in|summer sale|countdown|only \d+ left|hurry/i.test(t)) {
        textHits.push(t.match(/[^\n]{0,80}(ends in|summer sale)[^\n]{0,40}/i)?.[0] || 'urgency copy');
      }
    };
    walk(document.body);

    const vendor = [];
    for (const sel of [
      '[class*="hurrify"]',
      '[id*="hurrify"]',
      '[class*="hextom"]',
      '[class*="privy"]',
      '[class*="sales-pop"]',
      '[class*="fomo"]',
      '[class*="countdown"]',
      '[class*="timer"]',
      '[data-countdown]',
    ]) {
      for (const el of document.querySelectorAll(sel)) {
        if (vis(el)) vendor.push({ sel, tag: el.tagName, cls: (el.className || '').toString().slice(0, 120) });
      }
    }

    const urgencyLines = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && /ends in|summer sale/i.test(el.textContent || ''))
      .slice(0, 5)
      .map((el) => ({
        text: (el.textContent || '').trim().slice(0, 80),
        visible: vis(el),
        cls: (el.className || '').toString().slice(0, 100),
        parentCls: (el.parentElement?.className || '').toString().slice(0, 100),
      }));

    return {
      dataOp: document.documentElement.getAttribute('data-op'),
      dataOpH: document.documentElement.getAttribute('data-op-h'),
      urgencyLines,
      vendorVisible: vendor.slice(0, 15),
      title: document.title,
    };
  });
}

async function runWithExtension(loadExt) {
  const userDataDir = resolve(root, `.probe-${loadExt ? 'on' : 'off'}-${Date.now()}`);
  const args = loadExt
    ? [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
    : [];
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args,
    viewport: { width: 1280, height: 800 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  if (loadExt) {
    await context.waitForEvent('serviceworker', { timeout: 20_000 }).catch(() => {});
  }
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(4000);
  const data = await sample(page);
  await context.close();
  return data;
}

async function main() {
  console.log('URL:', url);
  console.log('\n--- extension OFF ---');
  const off = await runWithExtension(false);
  console.log(JSON.stringify(off, null, 2));
  console.log('\n--- extension ON ---');
  const on = await runWithExtension(true);
  console.log(JSON.stringify(on, null, 2));

  const offUrgency = off.urgencyLines.filter((u) => u.visible).length;
  const onUrgency = on.urgencyLines.filter((u) => u.visible).length;
  console.log('\n--- verdict ---');
  console.log(`Visible "Summer Sale / Ends In" text nodes: OFF=${offUrgency} ON=${onUrgency}`);
  console.log(`data-op ON: ${on.dataOp}`);
  console.log(`Vendor widgets visible ON: ${on.vendorVisible.length} OFF: ${off.vendorVisible.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
