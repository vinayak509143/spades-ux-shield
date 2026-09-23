/**
 * Live DOM audit for www.agoda.com urgency / social-proof widgets.
 * Headed by default. Does not sign in or open checkout.
 * Run: node scripts/audit-agoda.mjs
 * Writes temp/agoda-audit.json
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'temp/agoda-audit.json');

const SERP =
  'https://www.agoda.com/search?city=318&checkIn=2026-09-25&checkOut=2026-09-26&rooms=1&adults=2&children=0&locale=en-us&currency=USD';

function dumpPage() {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 4 && r.height > 4;
  };
  const hashed = (cls) =>
    /^(css-|emotion-|sc-|[A-Za-z0-9_-]{12,})$/.test(cls);
  const hint = (el) => {
    if (!el || el.nodeType !== 1) return null;
    if (el.id && el.id.length < 40) return `#${CSS.escape(el.id)}`;
    const tid = el.getAttribute('data-testid') || el.getAttribute('data-element-name') || el.getAttribute('data-selenium');
    if (tid) return `[data-selenium="${tid}"]`;
    const cls = [...el.classList].filter((c) => c.length > 2 && !hashed(c)).slice(0, 2);
    if (cls.length) return `${el.tagName.toLowerCase()}.${cls.map((c) => CSS.escape(c)).join('.')}`;
    return el.tagName.toLowerCase();
  };
  const NAG =
    /people are (looking|viewing)|looking at this|just booked|in the last|only \d+|we have \d+ left|\d+ left|in high demand|hurry|ends in|expires|someone just|booked \d+/i;
  const snippets = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = (walk.currentNode.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length < 4 || t.length > 140 || !NAG.test(t)) continue;
    const p = walk.currentNode.parentElement;
    if (!p || !vis(p)) continue;
    const chain = [];
    let cur = p;
    for (let i = 0; i < 6 && cur && cur !== document.body; i++) {
      chain.push({
        hint: hint(cur),
        id: cur.id || null,
        selenium: cur.getAttribute('data-selenium') || cur.getAttribute('data-element-name') || cur.getAttribute('data-testid'),
        className: String(cur.className).slice(0, 160),
        tag: cur.tagName,
      });
      cur = cur.parentElement;
    }
    snippets.push({
      text: t,
      hint: hint(p),
      chain,
      bare: /^(div|span|p|\*)$/.test(hint(p) || ''),
    });
    if (snippets.length >= 30) break;
  }
  const mustNot = [...document.querySelectorAll('button, a')]
    .filter((el) => vis(el) && /^(book now|reserve|select room|sign in|sign up)$/i.test((el.textContent || '').replace(/\s+/g, ' ').trim()))
    .slice(0, 10)
    .map((el) => ({ role: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), hint: hint(el) }));
  const sample = (document.body.innerText || '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 2 && line.length < 160 && /left|look|booked|demand|hurry|only |price|reserve|room/i.test(line))
    .slice(0, 40);
  return {
    url: location.href,
    title: document.title,
    hostname: location.hostname,
    blocked: /access denied|captcha|are you a robot/i.test(document.title) || (document.body.innerText || '').length < 800,
    bodyLen: (document.body.innerText || '').length,
    sample,
    snippets,
    mustNot,
  };
}

const headless = process.argv.includes('--headless');
const browser = await chromium.launch({ headless });
const context = await browser.newContext({
  viewport: { width: 1360, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
});
const page = await context.newPage();
const report = { at: new Date().toISOString(), headed: !headless, pages: [] };

async function audit(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);
  const accept = page.getByRole('button', { name: /accept|agree|ok/i }).first();
  const cookiesDismissed = await accept.isVisible().catch(() => false);
  if (cookiesDismissed) await accept.click({ timeout: 3000 }).catch(() => {});
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(350);
  }
  const data = await page.evaluate(dumpPage);
  report.pages.push({ name, requested: url, cookiesDismissed, ...data });
  console.log(name, JSON.stringify({ url: data.url, title: data.title, blocked: data.blocked, bodyLen: data.bodyLen, snippets: data.snippets.length }));
  for (const s of data.snippets.slice(0, 12)) console.log('  nag', s.hint, s.bare ? 'BARE' : '', s.text);
  for (const line of data.sample.slice(0, 15)) console.log('  sample', line);
  return data;
}

try {
  const serp = await audit('serp', SERP);
  if (!serp.blocked) {
    const href = await page.locator('a[href*="/hotel/"]').first().getAttribute('href').catch(() => null);
    if (href) {
      const property = href.startsWith('http') ? href : `https://www.agoda.com${href}`;
      await audit('pdp', property.split('#')[0]);
    } else {
      report.pages.push({ name: 'pdp', error: 'no property link' });
    }
  }
} catch (err) {
  report.pages.push({ name: 'error', error: String(err) });
  console.error(err.message);
}

await browser.close();
mkdirSync(resolve(root, 'temp'), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('wrote', outPath);
