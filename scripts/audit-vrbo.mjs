/**
 * Live DOM audit for www.vrbo.com urgency / social-proof widgets.
 * Headed by default. No sign-in or checkout.
 * Run: node scripts/audit-vrbo.mjs
 * Writes temp/vrbo-audit.json
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'temp/vrbo-audit.json');
const HOST = 'https://www.vrbo.com';

const SERP =
  `${HOST}/search?destination=New%20York&startDate=2026-10-16&endDate=2026-10-17&adults=2`;

function dumpPage() {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 4 && r.height > 4;
  };
  const hashed = (cls) =>
    /^(css-|emotion-|sc-|uitk-|_|[a-z]{1,2}[A-Z0-9]{4,}|[A-Za-z0-9]{8,})$/.test(cls) ||
    /^[a-f0-9]{6,}$/i.test(cls);
  const stableAttr = (el) => {
    const stid = el.getAttribute('data-stid');
    if (stid && stid !== 'button') return `[data-stid="${stid}"]`;
    const tid = el.getAttribute('data-testid');
    if (tid && tid !== 'button') return `[data-testid="${tid}"]`;
    return null;
  };
  const hint = (el) => {
    if (!el || el.nodeType !== 1) return null;
    const attr = stableAttr(el);
    if (attr) return attr;
    if (el.id && !hashed(el.id) && !/^:r[a-z0-9]+:$/i.test(el.id)) return `#${CSS.escape(el.id)}`;
    const cls = [...el.classList].filter((c) => c.length > 2 && !hashed(c)).slice(0, 2);
    if (cls.length) return `${el.tagName.toLowerCase()}.${cls.map((c) => CSS.escape(c)).join('.')}`;
    const tid = el.getAttribute('data-testid');
    if (tid) return `[data-testid="${tid}"]`;
    const stid = el.getAttribute('data-stid');
    if (stid) return `[data-stid="${stid}"]`;
    return el.tagName.toLowerCase();
  };
  const NAG =
    /people are (looking|viewing)|viewing this|looking at this|booked|just booked|in the last|only \d+|we have \d+ left|only one left|left at this price|in high demand|in demand|hurry|ends in|expires|limited time|someone just|times on our site|rooms? left|still available|watching/i;
  const FROZEN = /^(reserve|book now|reserve now|see availability|sign in|sign up|log in)$/i;

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
        stid: cur.getAttribute('data-stid'),
        className: String(cur.className).slice(0, 160),
        tag: cur.tagName,
      });
      cur = cur.parentElement;
    }
    snippets.push({
      text: t,
      ownText: (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180),
      hint: hint(p),
      chain,
      bare: /^(div|span|p|\*)$/.test(hint(p) || ''),
    });
    if (snippets.length >= 40) break;
  }

  const mustNot = [...document.querySelectorAll('button, a, [data-stid], [data-testid]')]
    .filter((el) => vis(el) && FROZEN.test((el.textContent || '').replace(/\s+/g, ' ').trim()))
    .slice(0, 12)
    .map((el) => ({
      role: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      hint: hint(el),
    }));

  const sample = (document.body.innerText || '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 2 && line.length < 180)
    .filter((line) => /left|book|look|view|demand|only |hurry|expire|price|reserve|room|guest|popular|sold|watching/i.test(line))
    .slice(0, 50);

  const stids = [...document.querySelectorAll('[data-stid]')]
    .map((el) => el.getAttribute('data-stid'))
    .filter((id) => id && /left|urgent|scarc|persu|book|demand|banner|alert|badge|price|avail|message/i.test(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, 40);

  return {
    url: location.href,
    title: document.title,
    hostname: location.hostname,
    blocked:
      /access denied|captcha|are you a robot|bot or not/i.test(document.title) ||
      (document.body.innerText || '').length < 800,
    bodyLen: (document.body.innerText || '').length,
    lines: sample.filter((line) => NAG.test(line)),
    sample,
    stids,
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

async function dismissCookies() {
  const btn = page.getByRole('button', { name: /accept|agree|i accept|got it/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ timeout: 4000 }).catch(() => {});
    return true;
  }
  return false;
}

async function audit(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page
    .waitForSelector('a[href*="/p/"], a[href*="vacation-rental"], h1, [data-stid="property-listing-results"]', {
      timeout: 25000,
    })
    .catch(() => {});
  await page.waitForTimeout(3000);
  const cookies = await dismissCookies();
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  const data = await page.evaluate(dumpPage);
  report.pages.push({ name, requested: url, cookiesDismissed: cookies, ...data });
  console.log(name, JSON.stringify({ url: data.url, title: data.title, blocked: data.blocked, bodyLen: data.bodyLen, snippets: data.snippets?.length }));
  for (const s of (data.snippets || []).slice(0, 12)) {
    console.log('  nag', s.hint, s.bare ? 'BARE' : '', s.text);
  }
  return data;
}

try {
  const serp = await audit('serp', SERP);
  if (!serp.blocked) {
    const href = await page
      .locator('a[href*="/p/"], a[data-stid="open-hotel-information"], a[href*="vacation-rental"]')
      .filter({ hasNot: page.locator('[href*="hotelplanner"]') })
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (!href) {
      report.pages.push({ name: 'pdp', error: 'no listing link on SERP' });
    } else {
      const property = href.startsWith('http') ? href : `${HOST}${href}`;
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
