import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ locale: 'en-IN' })).newPage();
await page.goto('https://www.flipkart.com/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(5000);
const hits = await page.evaluate(() => {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && r.width > 8 && r.height > 8;
  };
  return [...document.querySelectorAll('a, button, div')]
    .filter((el) => {
      const t = (el.textContent || '').trim();
      if (!/download app|get app|install/i.test(t)) return false;
      if (!vis(el)) return false;
      if (el.closest('header')) return false;
      return t.length < 120;
    })
    .slice(0, 10)
    .map((el) => ({
      tag: el.tagName,
      id: el.id,
      cls: String(el.className).slice(0, 100),
      text: (el.textContent || '').trim().slice(0, 100),
      parentCls: el.parentElement ? String(el.parentElement.className).slice(0, 100) : '',
    }));
});
console.log(JSON.stringify(hits, null, 2));
await browser.close();
