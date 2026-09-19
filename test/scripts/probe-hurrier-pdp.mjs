import { chromium } from 'playwright';

const url =
  'https://demo-hurrier-countdown-timer.myshopify.com/products/gap-disney-mickey-mouse-graphic-tee';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);

const data = await page.evaluate(() => {
  const sel = [
    '.product-count',
    '.delivery-time-box',
    '[class*="hurrify"]',
    '[id*="hurrify"]',
    '[class*="hurrier"]',
    '[data-js-text-countdown-counter]',
    '[data-reset-time]',
  ];
  const out = {};
  for (const s of sel) {
    out[s] = [...document.querySelectorAll(s)].map((el) => ({
      tag: el.tagName,
      cls: String(el.className).slice(0, 100),
      id: el.id,
      parentCls: String(el.parentElement?.className || '').slice(0, 100),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
    }));
  }
  const scripts = [...document.querySelectorAll('script[src]')]
    .map((s) => s.src)
    .filter((src) => /hurrify|hurrier|anvanto|countdown/i.test(src));
  const stock = document.querySelector('.product-count');
  let stockAncestors = [];
  if (stock) {
    let n = stock;
    for (let i = 0; i < 6 && n; i++) {
      stockAncestors.push({
        tag: n.tagName,
        cls: String(n.className).slice(0, 120),
        id: n.id,
      });
      n = n.parentElement;
    }
  }
  const hurry = [...document.querySelectorAll('li, div, p, span')].filter((el) =>
    /hurry!\s*only/i.test(el.textContent || ''),
  ).slice(0, 5).map((el) => ({
    tag: el.tagName,
    cls: String(el.className).slice(0, 80),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
  }));
  const visitor = [...document.querySelectorAll('[class*="visitor"], [id*="visitor"]')].map((el) => ({
    cls: el.className,
    text: (el.textContent || '').slice(0, 80),
  }));
  const classes = new Set();
  document.querySelectorAll('[class]').forEach((el) => {
    String(el.className).split(/\s+/).forEach((c) => {
      if (/count|deliver|visitor|hurry|stock|timer|urgent/i.test(c)) classes.add(c);
    });
  });
  return {
    out,
    scripts,
    stockAncestors,
    hurry,
    visitor,
    interestingClasses: [...classes].sort(),
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
