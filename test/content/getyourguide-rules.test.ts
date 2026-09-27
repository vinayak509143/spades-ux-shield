// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseList } from '../../src/engine/parser.js';
import { compileRules } from '../../src/engine/compiler.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';

const source = readFileSync(resolve('lists/darklist.txt'), 'utf8');
const parsed = parseList(source.split('\n').filter(line => line.startsWith('www.getyourguide.com##')).join('\n'));
const compiled = compileRules(parsed.rules);
const rules = [...compiled.hostBuckets.values()].flatMap(bucket => bucket.procedural);
const activityPath = '/london-l57/from-london-full-day-tour-of-cotswolds-t215430/';
const tenerifePath = '/tenerife-l350/tenerife-whale-and-dolphin-watching-day-trip-t395162';
const tenerifeLocalePath = '/en-gb/tenerife-l350/tenerife-snorkelling-tour-in-turtle-habitat-photos-included-t105353/';
let engine: ProceduralEngine | undefined;

function render(path: string, hostname = 'www.getyourguide.com', badge = 'Likely to sell out'): void {
  const url = new URL(path, `https://${hostname}`);
  Object.defineProperty(window, 'location', {
    value: { hostname, pathname: url.pathname, search: url.search }, writable: true,
  });
  document.documentElement.innerHTML = `<head></head><body>
    <a id="activity-card" href="${activityPath}">
      <span id="215430-likelyToSellOut-badge"><span>${badge}</span></span>
      <span id="card-price">₹11,300</span><span id="rating">4.8 (5,245 reviews)</span>
    </a>
    <div id="sticky-booking-assistant-configurator">
      <div class="header"><div class="badge-wrapper"><div class="badge"><span class="badge-label">${badge}</span></div></div></div>
      <ins id="price">₹11,300</ins><button>Select date</button><button>Check availability</button>
      <button>Continue</button><p id="stock">Only 1 spot left</p><p id="terms">Free cancellation</p>
    </div>
    <span class="c-marketplace-badge c-marketplace-badge--primary"><span class="text-atom">${badge}</span></span>
    <form id="login"><input aria-label="Email address"><button>Continue with email</button></form>
  </body>`;
}

function apply(): void {
  engine = new ProceduralEngine();
  engine.start(rules, { pierceShadow: false });
  engine.flush();
}

afterEach(() => engine?.stop());

describe('GetYourGuide listed badges', () => {
  it('compiles the badge rules as procedural hides, never global CSS', () => {
    expect(parsed.errors).toEqual([]);
    expect(compiled.errors).toEqual([]);
    expect(rules).toHaveLength(3);
    expect(rules.every(rule => rule.action.type === 'hide')).toBe(true);
    expect(rules.filter(rule => rule.pathRe)).toHaveLength(2);
    expect(compiled.genericCss).toBe('');
  });

  it.each([
    ['/', false],
    ['/en-gb/', false],
    ['/paris-l16/', false],
    ['/en-gb/paris-l16/', false],
    ['/paris-l16?sort=popular', false],
    [`${activityPath}?date_from=2026-10-16`, true],
    [tenerifePath, true],
    [`${tenerifePath}?ranking_uuid=2975ef59-d58a-49d4-80cd-d1880cabd546&date_from=2026-10-21&_pc=1,1`, true],
    [`${tenerifePath}/?date_from=2026-10-21`, true],
    [`${tenerifeLocalePath}?ranking_uuid=dca5c86d-1f5b-4feb-b551-acbf48348fb4&q=Costa+Adeje`, true],
    ['/cart', false],
    ['/cart/', false],
    ['/en-gb/cart', false],
    ['/en-gb/cart?from=search', false],
  ])('hides only observed badge components on %s', (path, activity) => {
    render(path);
    apply();
    expect(document.querySelector('[id$="-likelyToSellOut-badge"]')?.classList.contains('op-hide')).toBe(true);
    expect(document.querySelector('.c-marketplace-badge--primary')?.classList.contains('op-hide')).toBe(true);
    expect(document.querySelector('.badge-wrapper')?.classList.contains('op-hide')).toBe(activity);
    for (const node of document.querySelectorAll('#activity-card, #card-price, #rating, #price, #stock, #terms, button, input')) {
      expect(node.closest('.op-hide')).toBeNull();
    }
  });

  it.each(['/checkout?skipCart=true', '/en-gb/checkout?skipCart=true', '/checkout/payment', '/login', '/en-gb/account/login', '/account/login', '/pay', '/c/privacy-policy/', `${activityPath}checkout`, `${tenerifePath}/checkout`, `${tenerifePath}extra`, '/paris-l16/cart', '/en-gb/paris-l16/cart'])('leaves checkout, login, and lookalike paths alone except the cart-card badge %s', path => {
    render(path);
    apply();
    expect(document.querySelector('[id$="-likelyToSellOut-badge"]')?.classList.contains('op-hide')).toBe(false);
    expect(document.querySelector('.badge-wrapper')?.classList.contains('op-hide')).toBe(false);
    expect(document.querySelector('.c-marketplace-badge--primary')?.classList.contains('op-hide')).toBe(true);
    for (const node of document.querySelectorAll('#card-price, #price, #stock, #terms, button, input')) {
      expect(node.closest('.op-hide')).toBeNull();
    }
  });

  it.each(['supplier.getyourguide.com', 'partner.getyourguide.com', 'www.example.com'])('does not apply to %s', hostname => {
    render(activityPath, hostname);
    apply();
    expect(document.querySelectorAll('.op-hide')).toHaveLength(0);
  });

  it.each(['Likely to sell out ₹11,300', 'Only 1 spot left', 'Free cancellation', 'Likely to sell out — Reserve now'])('preserves changed or mixed content: %s', text => {
    render(activityPath, undefined, text);
    apply();
    expect(document.querySelectorAll('.op-hide')).toHaveLength(0);
  });

  it('preserves badge wrappers containing textless interactive controls', () => {
    render(activityPath);
    for (const selector of ['[id$="-likelyToSellOut-badge"]', '.badge-wrapper', '.c-marketplace-badge--primary']) {
      document.querySelector(selector)?.insertAdjacentHTML('beforeend', '<button aria-label="Reserve"></button>');
    }
    apply();
    expect(document.querySelectorAll('.op-hide')).toHaveLength(0);
  });
});
