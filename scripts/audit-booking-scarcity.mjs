/**
 * Parent-chain audit for Booking.com “We have N left…” chips (hashed class follow-up).
 * Headed by default. No sign-in or Reserve click.
 * Run: node scripts/audit-booking-scarcity.mjs
 * Writes temp/booking-scarcity-audit.json
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'temp/booking-scarcity-audit.json');

const DATES =
  'checkin=2026-10-25&checkout=2026-10-26&group_adults=2&no_rooms=1&group_children=0&selected_currency=USD&lang=en-us';
const SERP = `https://www.booking.com/searchresults.html?ss=New+York&${DATES}`;
const PROPERTY = `https://www.booking.com/hotel/us/element-times-square.html?${DATES}`;

const SCARCITY = /we have \d+ left/i;

function dumpPage() {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 4 && r.height > 4;
  };
  const isModuleHash = (cls) =>
    /^[a-f0-9]{6,}$/i.test(cls) ||
    /^(css-|emotion-|sc-)/.test(cls) ||
    /^[A-Za-z0-9]{8,}$/.test(cls) &&
      !cls.includes('-') &&
      !cls.startsWith('bui-') &&
      !cls.startsWith('hprt-');
  const isStableClass = (cls) => cls.length > 2 && !isModuleHash(cls);
  const ownText = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

  const hits = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = (walk.currentNode.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/we have \d+ left/i.test(t)) continue;
    const leaf = walk.currentNode.parentElement;
    if (!leaf || !vis(leaf)) continue;

    const chain = [];
    let cur = leaf;
    for (let i = 0; i < 12 && cur && cur !== document.body; i++) {
      const classes = [...cur.classList];
      const stableClasses = classes.filter(isStableClass);
      const hashedClasses = classes.filter((c) => !isStableClass(c));
      const tid = cur.getAttribute('data-testid');
      chain.push({
        depth: i,
        tag: cur.tagName,
        id: cur.id || null,
        idStable: cur.id ? !/^:r[a-z0-9]+:$/i.test(cur.id) && !isModuleHash(cur.id) : false,
        testid: tid,
        className: classes.join(' ').slice(0, 240),
        stableClasses,
        hashedClasses,
        ownText: ownText(cur).slice(0, 200),
        textLen: ownText(cur).length,
      });
      cur = cur.parentElement;
    }

    const firstStable = chain.find(
      (row) =>
        (row.testid && row.testid !== 'button') ||
        (row.idStable && row.id) ||
        row.stableClasses.length > 0,
    );

    hits.push({
      matchedText: t,
      leafTag: leaf.tagName,
      leafClass: String(leaf.className).slice(0, 120),
      leafOwnText: ownText(leaf).slice(0, 120),
      chain,
      firstStableAncestor: firstStable ?? null,
      wrapsPrice: /\$\s?\d|US\$|price/i.test(ownText(leaf.parentElement || leaf)),
    });
    if (hits.length >= 30) break;
  }

  const mustNot = [...document.querySelectorAll('[data-testid="price-and-discounted-price"], #hp_book_now_button, [data-testid="availability-cta"]')]
    .filter(vis)
    .slice(0, 6)
    .map((el) => ({
      hint: el.id ? `#${el.id}` : `[data-testid="${el.getAttribute('data-testid')}"]`,
      text: ownText(el).slice(0, 60),
    }));

  return {
    url: location.href,
    title: document.title,
    hostname: location.hostname,
    blocked: /access denied|captcha|are you a robot/i.test(document.title) || (document.body.innerText || '').length < 800,
    bodyLen: (document.body.innerText || '').length,
    hitCount: hits.length,
    hits,
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
  const btn = page.getByRole('button', { name: /accept|agree|i accept/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ timeout: 4000 }).catch(() => {});
    return true;
  }
  return false;
}

async function audit(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('a[href*="/hotel/"], #hp_book_now_button, h1', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cookies = await dismissCookies();
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
  }
  const data = await page.evaluate(dumpPage);
  report.pages.push({ name, requested: url, cookiesDismissed: cookies, ...data });
  console.log(
    name,
    JSON.stringify({
      url: data.url,
      blocked: data.blocked,
      hitCount: data.hitCount,
      firstStable: data.hits?.[0]?.firstStableAncestor,
    }),
  );
  for (const h of (data.hits || []).slice(0, 5)) {
    console.log('  hit', h.leafClass, h.matchedText.slice(0, 60));
    if (h.firstStableAncestor) {
      console.log('    stable@', h.firstStableAncestor.depth, h.firstStableAncestor.stableClasses, h.firstStableAncestor.testid);
    }
  }
  return data;
}

try {
  await audit('serp', SERP);
  await audit('pdp', PROPERTY);
} catch (err) {
  report.error = String(err);
  console.error(err.message);
}

await browser.close();
mkdirSync(resolve(root, 'temp'), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('wrote', outPath);
