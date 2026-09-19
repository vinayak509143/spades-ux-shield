import { chromium } from 'playwright';

const url = 'https://mloshoes.com/products/nrg-s100';

const browser = await chromium.launch({ headless: true });
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  const data = await page.evaluate(() => {
    const el = document.querySelector('.promo-countdown');
    if (!el) return { found: false };
    const chain = [];
    let n = el;
    for (let i = 0; i < 8 && n; i++) {
      chain.push({
        tag: n.tagName,
        id: n.id,
        cls: String(n.className).slice(0, 140),
        text: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      });
      n = n.parentElement;
    }
    const parent = el.parentElement;
    const sibs = parent
      ? [...parent.children].map((c) => ({
          tag: c.tagName,
          cls: String(c.className).slice(0, 100),
          text: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        }))
      : [];
    const endsIn = [...document.querySelectorAll('*')].filter((node) => {
      const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
      return /^ends in:?$/i.test(t) || (t.length < 30 && /ends in:/i.test(t));
    }).map((node) => ({
      tag: node.tagName,
      cls: String(node.className).slice(0, 100),
      text: (node.textContent || '').trim().slice(0, 60),
      parentCls: String(node.parentElement?.className || '').slice(0, 100),
    }));
    return { found: true, chain, sibs, endsIn: endsIn.slice(0, 10) };
  });
  console.log('\nviewport', viewport.width, JSON.stringify(data, null, 2));
}
await browser.close();
