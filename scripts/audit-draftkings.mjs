/**
 * Live DOM audit for DraftKings (no extension).
 * Run: node scripts/audit-draftkings.mjs
 * Writes temp/draftkings-audit.json
 *
 * Never propose hiding: responsible gaming, login/signup, deposit/pay, bet slip.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'temp/draftkings-audit.json');

function dumpPage() {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 4 && r.height > 4;
  };
  const hint = (el) => {
    if (!el || el.nodeType !== 1) return null;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const tid = el.getAttribute('data-testid');
    if (tid) return `[data-testid="${tid}"]`;
    const cls = [...el.classList].filter((c) => c.length > 2).slice(0, 2);
    if (cls.length) return `${el.tagName.toLowerCase()}.${cls.join('.')}`;
    return el.tagName.toLowerCase();
  };
  const CAND =
    /hurry|ends in|limited time|only \d+|download app|install app|odds boost|free bet|no sweat|play free|share of millions|don't miss|act now|expires|boosted odds|promo/i;
  const FROZEN =
    /gambler|responsible (gaming|gambling|engagement)|get help|1-800|terms of use|privacy policy|log in|sign up|sign in|deposit|withdraw|add funds|place bet|bet slip|join now/i;

  const snippets = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = (walk.currentNode.textContent || '').trim();
    if (t.length < 3 || t.length > 140) continue;
    if (!CAND.test(t) && !FROZEN.test(t)) continue;
    const p = walk.currentNode.parentElement;
    if (!p || !vis(p)) continue;
    snippets.push({
      text: t,
      hint: hint(p),
      parent: p.parentElement ? hint(p.parentElement) : null,
      frozen: FROZEN.test(t),
    });
    if (snippets.length >= 100) break;
  }

  const stable = [...document.querySelectorAll('[id], [data-testid]')]
    .filter(vis)
    .slice(0, 50)
    .map((el) => ({
      id: el.id || null,
      testid: el.getAttribute('data-testid'),
      hint: hint(el),
      text: (el.textContent || '').trim().slice(0, 90),
    }));

  const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')]
    .filter(vis)
    .map((el) => ({ hint: hint(el), text: (el.textContent || '').trim().slice(0, 200) }));

  return {
    url: location.href,
    title: document.title,
    hostname: location.hostname,
    bodyLen: (document.body.innerText || '').length,
    dialogs,
    stable,
    snippets,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
  geolocation: { latitude: 42.3601, longitude: -71.0589 },
  permissions: ['geolocation'],
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});
const page = await context.newPage();
const report = { at: new Date().toISOString(), pages: [] };

for (const { name, url } of [
  { name: 'home', url: 'https://www.draftkings.com/' },
  { name: 'sportsbook', url: 'https://sportsbook.draftkings.com/' },
]) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(6000);
    const data = await page.evaluate(dumpPage);
    report.pages.push({ name, ...data });
    console.log(name, JSON.stringify({ url: data.url, title: data.title, snippets: data.snippets.length, dialogs: data.dialogs.length }));
    for (const s of data.snippets.slice(0, 25)) {
      console.log(s.frozen ? '  FROZEN' : '  cand', s.hint, s.text);
    }
  } catch (err) {
    report.pages.push({ name, url, error: String(err) });
    console.error(name, err.message);
  }
}

await browser.close();
mkdirSync(resolve(root, 'temp'), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('wrote', outPath);
