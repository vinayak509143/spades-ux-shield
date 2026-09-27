/**
 * Inventory short Temu chips on the logged-in Chrome window.
 * Does not close Chrome. Requires chrome://inspect/#remote-debugging.
 * Run: node scripts/audit-temu-chips.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDevToolsEndpoint } from './lib/chrome-cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const endpoint = readDevToolsEndpoint();
if (!endpoint) {
  throw new Error('Chrome remote debugging is off. Turn it on at chrome://inspect/#remote-debugging and click Allow.');
}

const { chromium } = await import('playwright');
const browser = await chromium.connectOverCDP(endpoint, { timeout: 180000 });
const context = browser.contexts()[0];
if (!context) throw new Error('CDP connected without a browser context');
const page = await context.newPage();

function collectChips() {
  const urgency =
    /\b(only\s+\d+\s+left|almost\s+sold\s+out|almost\s+out|limited\s+stock|selling\s+fast|low\s+stock|hurry|last\s+chance|best[- ]selling|in\s+demand|ends?\s+soon|left\s+in\s+stock|sold\s+out|\d+(?:\.\d+)?\s*[kK]?\+?\s*sold|people\s+(?:bought|viewing|added)|added\s+to\s+cart|in\s+\d+\s+carts?|viewing\s+now|just\s+bought|going\s+fast|few\s+left|only\s+few|bought\s+recently|order\s+soon|flash\s+sale|lightning|add\s+now)\b/i;

  const rows = new Map();
  let spanCount = 0;
  let dataType0Count = 0;
  let shadowHosts = 0;

  function consider(el, bucket) {
    const own = [...el.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!own || own.length > 80) return;
    const style = getComputedStyle(el);
    const hidden = style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0;
    const key = `${bucket}|${own.toLowerCase()}|${hidden ? 'h' : 'v'}`;
    const prev = rows.get(key);
    if (prev) {
      prev.n += 1;
      return;
    }
    rows.set(key, {
      bucket,
      text: own,
      n: 1,
      hidden,
      tag: el.tagName.toLowerCase(),
      dataType: el.getAttribute('data-type'),
      color: style.color,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      className: String(el.className || '').slice(0, 80),
    });
  }

  function walk(root) {
    const list = root.querySelectorAll ? root.querySelectorAll('span, div, p, button, a, li') : [];
    for (const el of list) {
      if (el.tagName === 'SPAN') spanCount += 1;
      if (el.getAttribute('data-type') === '0') {
        dataType0Count += 1;
        consider(el, 'data-type-0');
      }
      const own = [...el.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || '')
        .join('');
      if (urgency.test(own) && own.trim().length <= 80 && el.children.length <= 3) {
        consider(el, 'urgency');
      }
      if (el.shadowRoot) {
        shadowHosts += 1;
        walk(el.shadowRoot);
      }
    }
  }

  walk(document);
  return {
    href: location.href,
    title: document.title,
    bodyLen: (document.body?.innerText || '').length,
    textLen: (document.body?.textContent || '').length,
    spanCount,
    dataType0Count,
    shadowHosts,
    sample: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 500),
    rows: [...rows.values()].sort((a, b) => b.n - a.n).slice(0, 250),
  };
}

async function scan(name, url) {
  console.log(`scan ${name} ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(1500);
  return { name, ...(await page.evaluate(collectChips)) };
}

const pages = [];
pages.push(await scan('home', 'https://www.temu.com/'));
const homeLinks = await page.evaluate(() => {
  const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.href);
  return {
    products: hrefs.filter((href) => href.includes('-g-')).slice(0, 3),
    channels: [...new Set(hrefs.filter((href) => /deal|best|lightning|flash|popular/i.test(href)))].slice(0, 5),
  };
});
console.log('links', JSON.stringify(homeLinks));
pages.push(await scan('search', 'https://www.temu.com/search_result.html?search_key=socks'));
const productHref = homeLinks.products[0];
if (productHref) pages.push(await scan('pdp', productHref));
if (homeLinks.channels[0]) pages.push(await scan('channel', homeLinks.channels[0]));

mkdirSync(resolve(root, 'temp'), { recursive: true });
const out = resolve(root, 'temp/temu-chips.json');
writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), pages }, null, 2));
console.log(`wrote ${out}`);
await page.close();
process.exit(0);
