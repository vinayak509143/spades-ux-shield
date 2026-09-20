/**
 * Live DOM audit for Flipkart dark-pattern candidates (no extension).
 * Run: node scripts/audit-flipkart.mjs
 * Writes temp/flipkart-audit.json
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'temp/flipkart-audit.json');

function walkCandidates() {
  const NAG_RE =
    /download\s+(the\s+)?app|install\s+app|open\s+in\s+app|login\s+to\s+continue|sign\s+in\s+to|hurry|few\s+left|people\s+ordered|flash\s+sale|ends\s+in|only\s+\d+\s+left|selling\s+fast/i;
  const selectorHint = (el) => {
    if (!el || el.nodeType !== 1) return null;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const dataTest = el.getAttribute('data-testid');
    if (dataTest) return `[data-testid="${dataTest}"]`;
    const cls = [...el.classList].filter((c) => c.length > 2 && !/^[a-z]{1,2}$/i.test(c)).slice(0, 2);
    if (cls.length) return `${el.tagName.toLowerCase()}.${cls.map((c) => CSS.escape(c)).join('.')}`;
    return el.tagName.toLowerCase();
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8;
  };
  const hits = [];
  const mustNot = [];
  const body = document.body;
  if (!body) return { hits, mustNot, url: location.href };

  for (const el of body.querySelectorAll('[id], [data-testid], div[class], section[class], span[class]')) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!NAG_RE.test(text)) continue;
    if (!visible(el)) continue;
    const chain = [];
    let cur = el;
    for (let i = 0; i < 5 && cur && cur !== document.body; i++) {
      chain.push(selectorHint(cur));
      cur = cur.parentElement;
    }
    hits.push({ text, chain, tag: el.tagName, id: el.id || null, testid: el.getAttribute('data-testid') });
  }

  const buy = document.querySelector('button[class*="buy"], button[class*="Buy"], ._2KpZ6l._2U9uOA, button');
  const atc = [...document.querySelectorAll('button')].find(
    (b) => visible(b) && /add to cart|buy now/i.test(b.textContent || ''),
  );
  const price = document.querySelector('[class*="price"], [class*="Price"]');
  if (atc) mustNot.push({ role: 'atc', hint: selectorHint(atc), text: (atc.textContent || '').trim().slice(0, 80) });
  if (price) mustNot.push({ role: 'price', hint: selectorHint(price) });
  if (buy && buy !== atc) mustNot.push({ role: 'buy', hint: selectorHint(buy) });

  const snippets = [];
  const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = (walk.currentNode.textContent || '').trim();
    if (t.length < 4 || t.length > 120) continue;
    if (/left|ordered|hurry|flash|ends in|download|install app|selling fast|people/i.test(t)) {
      const p = walk.currentNode.parentElement;
      if (p && visible(p)) {
        snippets.push({ text: t, hint: selectorHint(p) });
      }
    }
  }

  return {
    hits,
    snippets: snippets.slice(0, 40),
    mustNot,
    url: location.href,
    title: document.title,
    hasAtc: !!atc,
    bodyLen: (body.innerText || '').length,
  };
}

const headless = !process.argv.includes('--headed');
const browser = await chromium.launch({ headless });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'en-IN',
  geolocation: { latitude: 28.6139, longitude: 77.209 },
  permissions: ['geolocation'],
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});
const page = await context.newPage();
const report = { at: new Date().toISOString(), pages: [] };

async function audit(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(6000);
  const data = await page.evaluate(walkCandidates);
  report.pages.push({ name, ...data });
  console.log(name, JSON.stringify({ url: data.url, hits: data.hits.length, snippets: data.snippets?.length, hasAtc: data.hasAtc, bodyLen: data.bodyLen }));
  for (const s of (data.snippets || []).slice(0, 12)) {
    console.log('  snippet', s.hint, s.text);
  }
}

try {
  await audit('home', 'https://www.flipkart.com/');
} catch (err) {
  report.pages.push({ name: 'home', error: String(err) });
}

try {
  await page.goto('https://www.flipkart.com/search?q=boat+earphones', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);
  const first = page.locator('a[href*="/p/"]').first();
  await first.click({ timeout: 30000 });
  await page.waitForTimeout(6000);
  const data = await page.evaluate(walkCandidates);
  report.pages.push({ name: 'pdp', ...data });
  console.log('pdp', JSON.stringify({ url: data.url, snippets: data.snippets?.length, hasAtc: data.hasAtc, bodyLen: data.bodyLen }));
  for (const s of (data.snippets || []).slice(0, 20)) {
    console.log('  snippet', s.hint, s.text);
  }
} catch (err) {
  report.pages.push({ name: 'pdp', error: String(err) });
  console.error('pdp', err.message);
}

try {
  await audit('cart', 'https://www.flipkart.com/viewcart');
} catch (err) {
  report.pages.push({ name: 'cart', error: String(err) });
}

await browser.close();
mkdirSync(resolve(root, 'temp'), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('wrote', outPath);
