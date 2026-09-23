/**
 * Live DOM audit for www.booking.com urgency / social-proof widgets.
 * Headed by default (Booking bot-walls headless). Does not sign in or open checkout.
 * Run: node scripts/audit-booking.mjs
 * Writes temp/booking-audit.json
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'temp/booking-audit.json');

const SERP =
  'https://www.booking.com/searchresults.html?ss=New+York&checkin=2026-09-25&checkout=2026-09-26&group_adults=2&no_rooms=1&group_children=0&selected_currency=USD&lang=en-us';
const PROPERTY =
  'https://www.booking.com/hotel/us/element-times-square.html?checkin=2026-09-25&checkout=2026-09-26&group_adults=2&no_rooms=1&group_children=0&lang=en-us';

function dumpPage() {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 4 && r.height > 4;
  };
  const hashed = (cls) =>
    /^(css-|emotion-|sc-|_|[a-z]{1,2}[A-Z0-9]{4,}|[A-Za-z0-9]{8,})$/.test(cls) || /^[a-f0-9]{6,}$/i.test(cls);
  const hint = (el) => {
    if (!el || el.nodeType !== 1) return null;
    if (el.id && !hashed(el.id)) return `#${CSS.escape(el.id)}`;
    const tid = el.getAttribute('data-testid');
    if (tid && tid !== 'button') return `[data-testid="${tid}"]`;
    const cls = [...el.classList].filter((c) => c.length > 2 && !hashed(c)).slice(0, 2);
    if (cls.length) return `${el.tagName.toLowerCase()}.${cls.map((c) => CSS.escape(c)).join('.')}`;
    if (tid) return `[data-testid="${tid}"]`;
    return el.tagName.toLowerCase();
  };
  const NAG =
    /people are (looking|viewing)|viewing this|looking at this|booked|just booked|in the last|only \d+|we have \d+ left|only one left|left at this price|in high demand|in demand|hurry|ends in|expires|limited time|someone just|times on our site|rooms? left|on our site/i;
  const FROZEN =
    /^(reserve|book now|see availability|sign in|sign up|log in)$/i;

  const snippets = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = (walk.currentNode.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length < 4 || t.length > 140) continue;
    if (!NAG.test(t)) continue;
    const p = walk.currentNode.parentElement;
    if (!p || !vis(p)) continue;
    const chain = [];
    let cur = p;
    for (let i = 0; i < 6 && cur && cur !== document.body; i++) {
      chain.push({
        hint: hint(cur),
        id: cur.id || null,
        testid: cur.getAttribute('data-testid'),
        className: String(cur.className).slice(0, 160),
        tag: cur.tagName,
      });
      cur = cur.parentElement;
    }
    const own = (p.innerText || '').replace(/\s+/g, ' ').trim();
    snippets.push({
      text: t,
      ownText: own.slice(0, 180),
      hint: hint(p),
      chain,
      bare: /^(div|span|p|\*)$/.test(hint(p) || ''),
      unstableTestId: p.getAttribute('data-testid') === 'button',
    });
    if (snippets.length >= 40) break;
  }

  const mustNot = [...document.querySelectorAll('button, a, [data-testid]')]
    .filter((el) => vis(el) && FROZEN.test((el.textContent || '').replace(/\s+/g, ' ').trim()))
    .slice(0, 12)
    .map((el) => ({
      role: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      hint: hint(el),
      testid: el.getAttribute('data-testid'),
    }));

  const price = [...document.querySelectorAll('[data-testid*="price"], [class*="price"]')]
    .filter(vis)
    .slice(0, 3)
    .map((el) => ({ hint: hint(el), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) }));

  const sample = (document.body.innerText || '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 2 && line.length < 180)
    .filter((line) => /left|book|look|view|demand|only |hurry|expire|price|reserve|room|guest|popular|sold/i.test(line))
    .slice(0, 50);

  const testids = [...document.querySelectorAll('[data-testid]')]
    .map((el) => el.getAttribute('data-testid'))
    .filter((id) => id && /left|urgent|scarc|persu|book|demand|banner|alert|badge|price|avail/i.test(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, 40);

  return {
    url: location.href,
    title: document.title,
    hostname: location.hostname,
    blocked:
      /access denied|captcha|are you a robot/i.test(document.title) ||
      (document.body.innerText || '').length < 800,
    bodyLen: (document.body.innerText || '').length,
    lines: sample.filter((line) => NAG.test(line)),
    sample,
    testids,
    snippets,
    mustNot,
    price,
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

async function dismissCookies() {
  const btn = page.getByRole('button', { name: /accept|agree|i accept/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ timeout: 4000 }).catch(() => {});
    return true;
  }
  return false;
}

async function audit(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('a[href*="/hotel/"], #hp_book_now_button, h1', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cookies = await dismissCookies();
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  const data = await page.evaluate(dumpPage);
  report.pages.push({ name, requested: url, cookiesDismissed: cookies, ...data });
  console.log(name, JSON.stringify({ url: data.url, title: data.title, blocked: data.blocked, bodyLen: data.bodyLen, lines: data.lines.length, testids: data.testids }));
  for (const line of (data.sample || []).slice(0, 25)) {
    console.log('  sample', line);
  }
  return data;
}

try {
  const serp = await audit('serp', SERP);
  if (serp.blocked || serp.bodyLen < 800) {
    report.stopped = 'serp-thin-or-blocked';
    await audit('pdp', PROPERTY);
  } else {
    const href = await page
      .locator('a[data-testid="title-link"], a[href*="/hotel/"]')
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (!href) {
      report.pages.push({ name: 'pdp', error: 'no property link on SERP' });
    } else {
      const property = href.startsWith('http') ? href : `https://www.booking.com${href}`;
      await audit('pdp', property.split('#')[0]);
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
