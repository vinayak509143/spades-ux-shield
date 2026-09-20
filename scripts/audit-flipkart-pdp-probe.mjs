import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'en-IN', viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://www.flipkart.com/search?q=boat+earphones', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForTimeout(4000);
const href = await page.locator('a[href*="/p/"]').first().getAttribute('href');
console.log('href', href);
if (href) {
  const path = href.startsWith('http') ? href : `https://www.flipkart.com${href.split('?')[0]}`;
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && r.width > 2 && r.height > 2;
    };
    const atcEl = [...document.querySelectorAll('button, div, span')].find(
      (b) => vis(b) && /^(add to cart|buy now)$/i.test((b.textContent || '').trim()),
    );
    const left = [...document.querySelectorAll('div')].filter((el) =>
      vis(el) && /^only \d+ left|only few left/i.test((el.textContent || '').trim()),
    ).map((el) => ({ cls: el.className, text: (el.textContent || '').trim().slice(0, 40) }));
    const hurry = [...document.querySelectorAll('div, span')]
      .filter((el) => vis(el) && /hurry|flash sale|ends in|selling fast/i.test((el.textContent || '').trim()))
      .slice(0, 8)
      .map((el) => ({
        cls: String(el.className).slice(0, 100),
        text: (el.textContent || '').trim().slice(0, 80),
      }));
    const ordered = [...document.querySelectorAll('*')]
      .filter((el) => vis(el) && /people ordered|ordered in past|bought in past/i.test(el.textContent || ''))
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        id: el.id,
        cls: String(el.className).slice(0, 100),
        text: (el.textContent || '').trim().slice(0, 80),
      }));
    const app = [...document.querySelectorAll('*')]
      .filter((el) => vis(el) && /download app|install app|open in app/i.test(el.textContent || ''))
      .slice(0, 5)
      .map((el) => ({
        tag: el.tagName,
        cls: String(el.className).slice(0, 80),
        text: (el.textContent || '').trim().slice(0, 80),
      }));
    const buttons = [...document.querySelectorAll('button')]
      .filter(vis)
      .map((b) => ({ text: (b.textContent || '').trim().slice(0, 40), cls: String(b.className).slice(0, 60) }))
      .slice(0, 15);
    return {
      url: location.href,
      title: document.title,
      atc: atcEl
        ? { text: (atcEl.textContent || '').trim(), cls: String(atcEl.className).slice(0, 80), tag: atcEl.tagName }
        : null,
      buttons,
      left,
      hurry,
      ordered,
      app,
    };
  });
  console.log(JSON.stringify(info, null, 2));
}
await page.goto('https://www.flipkart.com/search?q=boat+earphones', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(4000);
const serp = await page.evaluate(() => {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && r.width > 2 && r.height > 2;
  };
  return [...document.querySelectorAll('div.HZ0E6r.Rm9_cy, div.HZ0E6r')]
    .filter(vis)
    .slice(0, 5)
    .map((el) => ({ cls: el.className, text: (el.textContent || '').trim() }));
});
console.log('serp scarcity', serp);
await browser.close();
