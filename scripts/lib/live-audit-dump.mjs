/**
 * Shared in-page DOM dump for live scarcity / social-proof audits.
 * Used by scripts/audit-*.mjs (headed Playwright).
 */
import { resolve } from 'node:path';

export function dumpPage(extraNagRe = '') {
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

  const PRESSURE = [
    { id: 'only_left', re: /\bonly\s+\d+\s+left\b/i },
    { id: 'we_have_left', re: /\bwe have\s+\d+\s+left\b/i },
    { id: 'n_watching', re: /\b\d+\s+watching\b/i },
    { id: 'almost_gone', re: /\balmost\s+gone\b/i },
    { id: 'in_carts', re: /\bin\s+\d+\s+carts?\b/i },
    { id: 'people_viewing', re: /\bpeople\s+are\s+viewing\b/i },
    { id: 'viewing_now', re: /\bviewing\s+now\b/i },
    { id: 'few_tickets', re: /\b(few|only)\s+\d*\s*tickets?\s+left\b/i },
    { id: 'ends_in', re: /\bends\s+in\s+[\d:]+/i },
    { id: 'sold_last', re: /\bsold\s+in\s+the\s+last\b/i },
    { id: 'n_sold_recent', re: /\b\d+\s+sold\s+in\s+the\s+last\b/i },
    { id: 'countdown', re: /\b\d{1,2}:\d{2}:\d{2}\b/ },
    { id: 'someone_bought', re: /\bsomeone\s+(just\s+)?bought\b/i },
    { id: 'purchased_recent', re: /\bpurchased\s+.+\s+ago\b/i },
  ];

  let extraPatterns = [];
  if (extraNagRe) {
    try {
      extraPatterns = [{ id: 'extra', re: new RegExp(extraNagRe, 'i') }];
    } catch {
      extraPatterns = [];
    }
  }
  const patterns = [...PRESSURE, ...extraPatterns];

  function classifyLine(text) {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length < 4 || t.length > 200) return null;
    for (const p of patterns) {
      if (p.re.test(t)) return { kind: p.id, text: t };
    }
    return null;
  }

  const FROZEN =
    /^(reserve|book now|reserve now|see availability|sign in|sign up|log in|buy it now|add to cart|add to bag|place bid|buy tickets|get tickets|check out)$/i;
  const PRICE_RE = /(\$\s?\d|USD\s*\d|₹\s*[\d,]+|£\s*[\d,]+|€\s*[\d,]+|\b\d{1,3}(?:,\d{3})*\.\d{2}\b)/;

  function elementHasPrice(el) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    return PRICE_RE.test(t);
  }

  function elementHasCta(el) {
    for (const btn of el.querySelectorAll('button, a')) {
      if (!vis(btn)) continue;
      const label = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (FROZEN.test(label)) return true;
    }
    return false;
  }

  function firstStableInChain(chain) {
    for (const row of chain) {
      if (row.hint && !/^(div|span|p|\*)$/.test(row.hint) && !row.hint.includes('sc-')) {
        if (!/^div\.uitk-/.test(row.hint)) return row.hint;
      }
    }
    return null;
  }

  const snippets = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = (walk.currentNode.textContent || '').replace(/\s+/g, ' ').trim();
    const hit = classifyLine(t);
    if (!hit) continue;
    const p = walk.currentNode.parentElement;
    if (!p || !vis(p)) continue;
    const ownText = (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    const chain = [];
    let cur = p;
    for (let i = 0; i < 12 && cur && cur !== document.body; i++) {
      chain.push({
        hint: hint(cur),
        id: cur.id || null,
        testid: cur.getAttribute('data-testid'),
        stid: cur.getAttribute('data-stid'),
        className: String(cur.className).slice(0, 160),
        tag: cur.tagName,
        hasPrice: elementHasPrice(cur),
        hasCta: elementHasCta(cur),
      });
      cur = cur.parentElement;
    }
    const nodeHasPrice = elementHasPrice(p);
    const nodeHasCta = elementHasCta(p);
    let ancestorWrapsPriceOrCta = false;
    for (const row of chain) {
      if (row.hasPrice && row.hasCta) {
        ancestorWrapsPriceOrCta = true;
        break;
      }
    }
    const stableHook = firstStableInChain(chain);
    let label = 'Unhandled';
    if (/^flash sale$/i.test(ownText) && hit.kind !== 'ends_in' && hit.kind !== 'countdown') {
      label = 'Not a pattern';
    } else if (nodeHasPrice && nodeHasCta) {
      label = 'Unhandled';
    } else if (!stableHook) {
      label = 'Unhandled';
    } else if (!nodeHasPrice && !nodeHasCta && !ancestorWrapsPriceOrCta) {
      label = 'Ship';
    } else if (!nodeHasPrice && !nodeHasCta) {
      label = 'Unhandled';
    }

    snippets.push({
      text: hit.text,
      pressureKind: hit.kind,
      ownText,
      hint: hint(p),
      chain,
      bare: /^(div|span|p|\*)$/.test(hint(p) || ''),
      stableHook,
      nodeHasPrice,
      nodeHasCta,
      ancestorWrapsPriceOrCta,
      suggestedLabel: label,
    });
    if (snippets.length >= 50) break;
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
    .map((line) => classifyLine(line))
    .filter(Boolean)
    .map((h) => h.text)
    .slice(0, 50);

  const stids = [...document.querySelectorAll('[data-stid]')]
    .map((el) => el.getAttribute('data-stid'))
    .filter((id) => id && /left|urgent|scarc|persu|book|demand|banner|alert|badge|price|avail|message|watch|cart|timer|countdown/i.test(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, 40);

  const testids = [...document.querySelectorAll('[data-testid]')]
    .map((el) => el.getAttribute('data-testid'))
    .filter((id) => id && /left|urgent|scarc|watch|cart|timer|countdown|demand/i.test(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, 40);

  const bodyText = (document.body.innerText || '').slice(0, 4000);
  const title = document.title || '';
  const blockedReasons = [];
  if (/access denied|captcha|are you a robot|bot or not|unusual traffic|verify you are human|risk\/challenge|browsing activity has been paused/i.test(title)) {
    blockedReasons.push('title');
  }
  if (/access denied|captcha|verify you are human|unusual traffic|risk\/challenge/i.test(bodyText)) {
    blockedReasons.push('body');
  }
  if ((document.body.innerText || '').length < 800) {
    blockedReasons.push('short_body');
  }

  return {
    url: location.href,
    title,
    hostname: location.hostname,
    blocked: blockedReasons.length > 0,
    blockedReasons,
    bodyLen: (document.body.innerText || '').length,
    lines: sample,
    sample,
    stids,
    testids,
    snippets,
    mustNot,
  };
}

/** Find first listing link whose card text matches pressure patterns. */
export function findPressureCardLinkScript() {
  return () => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 4 && r.height > 4;
    };
    const pressure =
      /\bonly\s+\d+\s+left\b|\b\d+\s+watching\b|\balmost\s+gone\b|\bin\s+\d+\s+carts?\b|\bpeople\s+are\s+viewing\b|\bviewing\s+now\b|\b(few|only)\s+\d*\s*tickets?\s+left\b/i;
    const cards = document.querySelectorAll(
      '.s-item, li.s-item, [data-testid="card-container"], article, .vtex-search-result-3-x-galleryItem',
    );
    for (const card of cards) {
      if (!vis(card)) continue;
      const text = (card.innerText || '').replace(/\s+/g, ' ');
      if (!pressure.test(text)) continue;
      const a = card.querySelector('a[href*="/itm/"], a[href*="/listing/"], a[href*="/rooms/"], a[href*="/event/"]');
      if (a?.href) return a.href;
    }
    return null;
  };
}

async function capturePage(page, root, outBasename, stepName) {
  const shot = resolve(root, `temp/${outBasename}-${stepName}.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  return shot;
}

export async function runLiveAudit({
  name,
  outBasename,
  pages,
  headlessFlag = '--headless',
  expectedHostname,
}) {
  const { chromium } = await import('playwright');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const outPath = resolve(root, `temp/${outBasename}-audit.json`);
  const headless = process.argv.includes(headlessFlag);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { latitude: 40.7128, longitude: -74.006 },
    permissions: ['geolocation'],
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  const report = {
    at: new Date().toISOString(),
    headed: !headless,
    expectedHostname: expectedHostname ?? null,
    pages: [],
  };

  async function dismissCookies() {
    const btn = page.getByRole('button', { name: /accept|agree|i accept|got it|allow all/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 4000 }).catch(() => {});
      return true;
    }
    return false;
  }

  async function evaluateDump(extraRe) {
    const dumpBody = dumpPage.toString();
    return page.evaluate(
      ({ body, extraRe: er }) => {
        const fn = (0, eval)(`(${body})`);
        return fn(er);
      },
      { body: dumpBody, extraRe: extraRe },
    );
  }

  function applyHostBlock(data, expected) {
    if (!expected || !data.hostname) return data;
    const base = expected.replace(/^www\./, '');
    if (data.hostname !== expected && data.hostname !== base && !data.hostname.endsWith(`.${base}`)) {
      return {
        ...data,
        blocked: true,
        blockedReasons: [...(data.blockedReasons || []), `hostname_mismatch:${data.hostname}`],
      };
    }
    return data;
  }

  async function settleDetailPage(step) {
    const waitMs = step.followWaitMs ?? step.waitMs ?? 4000;
    const scrolls = step.followScrolls ?? step.scrolls ?? 4;
    if (step.followWaitFor) {
      for (const sel of step.followWaitFor.split(',').map((s) => s.trim()).filter(Boolean)) {
        await page.waitForSelector(sel, { timeout: 45000 }).catch(() => {});
      }
    }
    await page.waitForTimeout(waitMs);
    await dismissCookies();
    const minLen = step.followMinBodyLen ?? 1200;
    await page
      .waitForFunction((min) => (document.body?.innerText?.length ?? 0) >= min, minLen, {
        timeout: 45000,
      })
      .catch(() => {});
    for (let i = 0; i < scrolls; i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(2000);
  }

  async function dumpDetailPage(step, cookies, href, label) {
    let detail = await evaluateDump(step.extraNagRe ?? '');
    detail = applyHostBlock(detail, step.expectedHostname ?? expectedHostname);
    if (step.followMinBodyLen && detail.bodyLen < step.followMinBodyLen && !detail.blocked) {
      detail = {
        ...detail,
        blocked: true,
        blockedReasons: [...(detail.blockedReasons || []), `short_body:${detail.bodyLen}`],
      };
    }
    const detailShot = await capturePage(page, root, outBasename, label);
    report.pages.push({
      name: label,
      requested: href,
      cookiesDismissed: cookies,
      screenshot: detailShot,
      ...detail,
    });
    console.log(
      label,
      JSON.stringify({
        url: detail.url,
        hostname: detail.hostname,
        blocked: detail.blocked,
        blockedReasons: detail.blockedReasons,
        bodyLen: detail.bodyLen,
        snippets: detail.snippets?.length,
      }),
    );
    for (const s of (detail.snippets || []).slice(0, 10)) {
      console.log(' ', s.suggestedLabel, s.pressureKind, s.hint, s.text.slice(0, 80));
    }
    return detail;
  }

  async function navigateToDetail(step, href, cookies) {
    const waitUntil = step.followWaitUntil ?? 'domcontentloaded';
    await page.goto(href.split('#')[0], { waitUntil, timeout: 120000 });
    await settleDetailPage(step);
    return dumpDetailPage(step, cookies, href, step.followName ?? 'detail');
  }

  async function loadStep(step, attempt) {
    const waitUntil = step.waitUntil ?? 'domcontentloaded';
    await page.goto(step.url, { waitUntil, timeout: 120000 });
    if (step.waitFor) {
      await page.waitForSelector(step.waitFor, { timeout: 25000 }).catch(() => {});
    }
    const waitMs = (step.waitMs ?? 3000) + (attempt > 0 ? 4000 : 0);
    await page.waitForTimeout(waitMs);
    const cookies = await dismissCookies();
    for (let i = 0; i < (step.scrolls ?? 4); i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
    let data = await evaluateDump(step.extraNagRe ?? '');
    const expected = step.expectedHostname ?? expectedHostname;
    data = applyHostBlock(data, expected);
    const screenshot = await capturePage(page, root, outBasename, `${step.name}${attempt > 0 ? '-retry' : ''}`);
    return { cookies, data, screenshot };
  }

  mkdirSync(resolve(root, 'temp'), { recursive: true });

  for (const step of pages) {
    try {
      let cookies = false;
      let data = null;
      let screenshot = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const loaded = await loadStep(step, attempt);
        cookies = loaded.cookies;
        data = loaded.data;
        screenshot = loaded.screenshot;
        if (!data.blocked || attempt === 1) break;
      }

      report.pages.push({
        name: step.name,
        requested: step.url,
        cookiesDismissed: cookies,
        screenshot,
        ...data,
      });
      console.log(
        step.name,
        JSON.stringify({
          url: data.url,
          hostname: data.hostname,
          blocked: data.blocked,
          blockedReasons: data.blockedReasons,
          bodyLen: data.bodyLen,
          snippets: data.snippets?.length,
        }),
      );
      for (const s of (data.snippets || []).slice(0, 10)) {
        console.log(' ', s.suggestedLabel, s.pressureKind, s.hint, s.text.slice(0, 80));
      }

      if (!data.blocked && (step.followPressure || step.followLink)) {
        let href = null;
        if (step.followPressure) {
          href = await page.evaluate(findPressureCardLinkScript());
        }
        if (!href && step.followLink) {
          const linkHref = await page.locator(step.followLink).first().getAttribute('href').catch(() => null);
          if (linkHref) {
            href = linkHref.startsWith('http') ? linkHref : new URL(linkHref, data.url).href;
          }
        }
        if (href) {
          await navigateToDetail(step, href, cookies);
        }
      }
    } catch (err) {
      report.pages.push({ name: step.name, error: String(err) });
      console.error(step.name, err.message);
    }
  }

  await browser.close();
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('wrote', outPath);
  return report;
}
