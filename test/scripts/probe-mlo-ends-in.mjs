import { chromium } from 'playwright';

const url = process.argv[2] || 'https://mloshoes.com/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);

const hits = await page.evaluate(() => {
  const vis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/ends in:/i.test(t) || t.length > 200) continue;
    if (!vis(el)) continue;
    out.push({
      tag: el.tagName,
      id: el.id,
      cls: (el.className || '').toString().slice(0, 160),
      text: t.slice(0, 120),
      childCount: el.children.length,
    });
  }
  return out.slice(0, 15);
});

console.log(JSON.stringify(hits, null, 2));
await browser.close();
