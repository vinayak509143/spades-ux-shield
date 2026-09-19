import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const url = 'https://mloshoes.com/';

async function deepSample(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const hits = [];
    for (const el of document.querySelectorAll('*')) {
      const t = (el.textContent || '').trim();
      if (t.length > 120) continue;
      if (/ends in|summer sale|free shipping on orders/i.test(t)) {
        hits.push({
          text: t.slice(0, 120),
          visible: vis(el),
          tag: el.tagName,
          id: el.id,
          cls: (el.className || '').toString().slice(0, 150),
        });
      }
    }
    const classes = new Set();
    for (const el of document.querySelectorAll('[class]')) {
      for (const c of (el.className || '').toString().split(/\s+/)) {
        if (/count|timer|urgent|sale|announce|bar|hurrify|hextom|privy/i.test(c)) {
          classes.add(c);
        }
      }
    }
    return { hits: hits.slice(0, 20), interestingClasses: [...classes].slice(0, 40) };
  });
}

async function run(loadExt) {
  const context = await chromium.launchPersistentContext(
    resolve(root, `.probe-mlo-${loadExt}-${Date.now()}`),
    {
      headless: false,
      args: loadExt ? [`--disable-extensions-except=${root}`, `--load-extension=${root}`] : [],
      viewport: { width: 1280, height: 800 },
    },
  );
  const page = context.pages()[0] ?? (await context.newPage());
  if (loadExt) await context.waitForEvent('serviceworker', { timeout: 20000 }).catch(() => {});
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() =>
    page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }),
  );
  await page.waitForTimeout(5000);
  const data = await deepSample(page);
  await context.close();
  return data;
}

const off = await run(false);
const on = await run(true);
console.log('OFF', JSON.stringify(off, null, 2));
console.log('ON', JSON.stringify(on, null, 2));
