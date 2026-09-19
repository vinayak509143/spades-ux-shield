/**
 * Playwright harvester — rendered storefront widgets only.
 * Never navigates frozen paths (/cart /checkout /login /pay).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { isFrozenHarvestUrl } from './denylist.mjs';
import { ensureFixtureServer } from './fixture-util.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const demosPath = resolve(root, 'scripts/quarantine/shopify-demos.json');
const outPath = resolve(root, 'temp/scraped-widgets.json');

export function loadTargets() {
  const { demos } = JSON.parse(readFileSync(demosPath, 'utf8'));
  const includeLocal = process.argv.includes('--local');
  const includeLive = process.argv.includes('--live') || !includeLocal;
  return demos.filter((d) => {
    if (isFrozenHarvestUrl(d.url)) {
      return false;
    }
    if (d.local) {
      return includeLocal;
    }
    return includeLive;
  });
}

async function scrapePage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  return page.evaluate(() => {
    const URGENCY =
      /hurry|ends in|left in stock|ordered in the last|someone purchased|accept cookies|agree & close|just bought|people are viewing|free shipping/i;
    const nodes = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('script, style, noscript, svg, path')) {
        continue;
      }
      if (el.closest('form, [name="checkout"], .cart-drawer, #cart-drawer, .checkout-cta')) {
        continue;
      }
      const style = getComputedStyle(el);
      const z = parseInt(style.zIndex, 10);
      const pos = style.position;
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      const highZ = Number.isFinite(z) && z >= 50;
      const sticky = pos === 'fixed' || pos === 'sticky';
      const urgency = el.children.length < 12 && text.length > 0 && text.length < 180 && URGENCY.test(text);
      if (!(sticky || highZ || urgency)) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 && rect.height < 2 && !urgency) {
        continue;
      }
      nodes.push({
        tag: el.tagName,
        id: el.id || '',
        classes: [...el.classList],
        zIndex: Number.isFinite(z) ? z : 0,
        position: pos,
        text: text.slice(0, 120),
        outerHTML: el.outerHTML.slice(0, 4000),
      });
      if (nodes.length >= 40) {
        break;
      }
    }
    return {
      title: document.title,
      hostname: location.hostname,
      nodes,
    };
  });
}

export async function harvest(targets = loadTargets()) {
  mkdirSync(resolve(root, 'temp'), { recursive: true });
  const fixtureChild = targets.some((d) => d.local) ? await ensureFixtureServer() : null;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const pages = [];
  try {
    for (const demo of targets) {
      if (isFrozenHarvestUrl(demo.url)) {
        pages.push({ url: demo.url, app: demo.app, skipped: true, reason: 'frozen-path', nodes: [] });
        continue;
      }
      const page = await context.newPage();
      try {
        console.log(`harvest ${demo.app} ${demo.url}`);
        const data = await scrapePage(page, demo.url);
        pages.push({
          url: demo.url,
          app: demo.app,
          kind: demo.kind,
          skipped: false,
          reason: null,
          title: data.title,
          hostname: data.hostname,
          nodes: data.nodes,
        });
        console.log(`  ${data.nodes.length} node(s)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  skip: ${message}`);
        pages.push({
          url: demo.url,
          app: demo.app,
          kind: demo.kind,
          skipped: true,
          reason: message,
          nodes: [],
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
    fixtureChild?.kill();
  }

  const payload = { generatedAt: new Date().toISOString(), pages };
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`wrote ${outPath}`);
  return payload;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  harvest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
