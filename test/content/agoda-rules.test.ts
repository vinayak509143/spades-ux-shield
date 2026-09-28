// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseList } from '../../src/engine/parser.js';
import { compileListCss, compileRules } from '../../src/engine/compiler.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';

const source = readFileSync(resolve('lists/darklist.txt'), 'utf8');
const agodaLines = source
  .split('\n')
  .filter((line) => /www\.agoda\.(com|co\.in)##/.test(line))
  .join('\n');
const parsed = parseList(agodaLines);
const compiled = compileRules(parsed.rules);
const rules = [...compiled.hostBuckets.values()].flatMap((bucket) => bucket.procedural);
let engine: ProceduralEngine | undefined;

function render(html: string): void {
  Object.defineProperty(window, 'location', {
    value: { hostname: 'www.agoda.com', pathname: '/quality-inn_34/hotel/new-york-ny-us.html', search: '' },
    writable: true,
  });
  document.documentElement.innerHTML = `<head></head><body>${html}</body>`;
}

function apply(): void {
  engine = new ProceduralEngine();
  engine.start(rules, { pierceShadow: false });
  engine.flush();
}

afterEach(() => engine?.stop());

describe('Agoda urgency rules', () => {
  it('compiles Agoda rules without global CSS', () => {
    expect(parsed.errors).toEqual([]);
    expect(compiled.errors).toEqual([]);
    expect(rules.length).toBeGreaterThanOrEqual(4);
    expect(compiled.genericCss).toContain('data-badge-id="lbk"');
    expect(compiled.genericCss).toContain('data-element-name="ssr-property-card-today-book"');
    expect(compiled.genericCss).toContain('www.agoda.co.in');
  });

  it('hides SERP hurry banner and booked-today chip', () => {
    render(`
      <h5 id="hurry-banner">Hurry! 49% of properties on our site are fully booked!</h5>
      <div data-element-name="ssr-property-card-today-book" data-badge-id="today-booking" id="booked-today"><span>Booked 27 times today</span></div>
      <span id="price">USD 89</span>
      <button>Sign in</button>
    `);
    document.documentElement.setAttribute('data-op', '1');
    document.documentElement.setAttribute('data-op-h', 'www.agoda.com');
    const style = document.createElement('style');
    style.textContent = compileListCss(parsed.rules);
    document.head.appendChild(style);
    apply();
    expect(document.getElementById('hurry-banner')?.classList.contains('op-hide')).toBe(true);
    expect(getComputedStyle(document.getElementById('booked-today')!).display).toBe('none');
    expect(document.getElementById('price')?.closest('.op-hide')).toBeNull();
    expect(document.querySelector('button')?.closest('.op-hide')).toBeNull();
  });

  it('hides last-booked and booked-today under PropertyCardBookingUrgency (static)', () => {
    render(`
      <div data-selenium="property-card-info">
        <div data-badge-id="lbk" id="lbk"><span>Popular! Last booked 10 hours ago</span></div>
        <div data-element-name="ssr-property-card-today-book" id="today"><span>Booked 27 times today</span></div>
        <span id="price">INR 4,200</span>
      </div>
    `);
    document.documentElement.setAttribute('data-op', '1');
    document.documentElement.setAttribute('data-op-h', 'www.agoda.co.in agoda.co.in');
    const style = document.createElement('style');
    style.textContent = compileListCss(parsed.rules);
    document.head.appendChild(style);
    apply();
    expect(getComputedStyle(document.getElementById('lbk')!).display).toBe('none');
    expect(getComputedStyle(document.getElementById('today')!).display).toBe('none');
    expect(document.getElementById('price')?.closest('[style*="display: none"]')).toBeNull();
  });

  it('hides SERP city demand in hero-banner-container (static)', () => {
    render(`
      <div data-element-name="hero-banner-container" id="hero">
        <p class="kite-js-Typography">Rooms in New Delhi are in high demand on your selected dates. Reserve yours now before prices go up.</p>
      </div>
      <button>Search</button>
    `);
    document.documentElement.setAttribute('data-op', '1');
    document.documentElement.setAttribute('data-op-h', 'www.agoda.com');
    const style = document.createElement('style');
    style.textContent = compileListCss(parsed.rules);
    document.head.appendChild(style);
    apply();
    expect(getComputedStyle(document.getElementById('hero')!).display).toBe('none');
    expect(document.querySelector('button')?.closest('.op-hide')).toBeNull();
  });

  it('hides property room last-booked badge', () => {
    render(`
      <div data-testid="room-header">
        <div data-testid="room-badge-last_booked_x_hours_ago" id="last-booked"><span>Last booked 52 minutes ago</span></div>
        <button data-testid="book-button">Book</button>
        <span id="price">₹ 4,200</span>
      </div>
      <div data-testid="room-offer">
        <span class="sc-aXZVg Typographystyled__TypographyStyled-sc-1uoovui-0 ifcRDN kDAUGs" id="offer-last">Last booked 52 minutes ago</span>
        <span id="offer-price">₹ 3,800</span>
        <button>Book</button>
      </div>
    `);
    document.documentElement.setAttribute('data-op', '1');
    document.documentElement.setAttribute('data-op-h', 'www.agoda.com');
    const style = document.createElement('style');
    style.textContent = compileListCss(parsed.rules);
    document.head.appendChild(style);
    apply();
    expect(getComputedStyle(document.getElementById('last-booked')!).display).toBe('none');
    expect(document.getElementById('offer-last')?.classList.contains('op-hide')).toBe(true);
    expect(getComputedStyle(document.querySelector('[data-testid="book-button"]')!).display).not.toBe('none');
    expect(document.getElementById('offer-price')?.closest('.op-hide')).toBeNull();
    expect(document.getElementById('price')?.closest('[style*="display: none"]')).toBeNull();
  });

  it('hides room-grid urgency via static + procedural rules', () => {
    render(`
      <div id="roomGridContent">
        <p id="cheapest" data-element-name="room-grid-urgency-message">Cheapest price you've seen!</p>
        <span id="limited">Limited availability</span>
        <span id="last">Last 4 rooms!</span>
      </div>
      <div id="grid">USD 120 — Select room</div>
    `);
    document.documentElement.setAttribute('data-op', '1');
    document.documentElement.setAttribute('data-op-h', 'www.agoda.com');
    const style = document.createElement('style');
    style.textContent = compileListCss(parsed.rules);
    document.head.appendChild(style);
    apply();
    expect(getComputedStyle(document.getElementById('cheapest')!).display).toBe('none');
    expect(document.getElementById('limited')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('last')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('grid')?.closest('.op-hide')).toBeNull();
  });
});
