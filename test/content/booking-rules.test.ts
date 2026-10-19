// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseList } from '../../src/engine/parser.js';
import { compileRules } from '../../src/engine/compiler.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';

const source = readFileSync(resolve('lists/darklist.txt'), 'utf8');
const parsed = parseList(
  source
    .split('\n')
    .filter((line) => line.startsWith('www.booking.com##'))
    .join('\n'),
);
const compiled = compileRules(parsed.rules);
const rules = [...compiled.hostBuckets.values()].flatMap((bucket) => bucket.procedural);
let engine: ProceduralEngine | undefined;

function render(html: string): void {
  Object.defineProperty(window, 'location', {
    value: { hostname: 'www.booking.com', pathname: '/searchresults.en-gb.html', search: '' },
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

describe('Booking scarcity rules', () => {
  it('compiles Booking rules', () => {
    expect(parsed.errors).toEqual([]);
    expect(compiled.errors).toEqual([]);
    expect(rules.length).toBeGreaterThanOrEqual(2);
  });

  it('hides the SERP price-scarcity chip and leaves the unit card', () => {
    render(`
      <div data-testid="recommended-units" id="unit">
        <div id="name">River View Suite</div>
        <ul>
          <li>
            <div id="chip" class="cc87802d18">We have 5 left at this price</div>
          </li>
          <li id="beds">1 extra-large double bed</li>
        </ul>
        <span data-testid="price-and-discounted-price" id="price">US$429</span>
        <a data-testid="availability-cta">See availability</a>
      </div>
    `);
    apply();
    expect(document.getElementById('chip')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('name')?.closest('.op-hide')).toBeNull();
    expect(document.getElementById('beds')?.closest('.op-hide')).toBeNull();
    expect(document.getElementById('price')?.closest('.op-hide')).toBeNull();
    expect(document.getElementById('unit')?.classList.contains('op-hide')).toBe(false);
    expect(document.querySelector('[data-testid="availability-cta"]')?.closest('.op-hide')).toBeNull();
  });

  it('hides the red only_x_left line and leaves the price and Reserve', () => {
    render(`
      <div id="card">
        <span id="left" class="only_x_left urgency_message_red">We have 4 left</span>
        <span id="price">₹8,500</span>
        <button id="reserve">Reserve</button>
      </div>
    `);
    apply();
    expect(document.getElementById('left')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('price')?.classList.contains('op-hide')).toBe(false);
    expect(document.getElementById('reserve')?.classList.contains('op-hide')).toBe(false);
    expect(document.getElementById('card')?.classList.contains('op-hide')).toBe(false);
  });
});
