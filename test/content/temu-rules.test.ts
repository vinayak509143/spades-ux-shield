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
    .filter((line) => line.startsWith('www.temu.com##'))
    .join('\n'),
);
const compiled = compileRules(parsed.rules);
const rules = [...compiled.hostBuckets.values()].flatMap((bucket) => bucket.procedural);
let engine: ProceduralEngine | undefined;

function render(html: string): void {
  Object.defineProperty(window, 'location', {
    value: { hostname: 'www.temu.com', pathname: '/goods.html', search: '' },
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

describe('Temu PDP urgency', () => {
  it('hides a classless ALMOST SOLD OUT span and leaves price and pay-later copy', () => {
    render(`
      <span id="chip" style="font-weight:600;color:#FB7701;font-size:16px;vertical-align:middle" data-type="0">ALMOST SOLD OUT</span>
      <span id="pay" data-type="0">Pay $1.09 today</span>
      <span id="off" data-type="0">56% OFF</span>
      <span id="price">$4.38</span>
    `);
    apply();
    expect(document.getElementById('chip')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('pay')?.classList.contains('op-hide')).toBe(false);
    expect(document.getElementById('pay')?.textContent).toBe('Pay $1.09 today');
    expect(document.getElementById('off')?.classList.contains('op-hide')).toBe(false);
    expect(document.getElementById('price')?.classList.contains('op-hide')).toBe(false);
  });

  it('relabels ADD THE LAST N! on a role=button span', () => {
    render(`<span id="add" class="_2y4qpjEX" role="button">ADD THE LAST 1!</span>`);
    apply();
    const add = document.getElementById('add');
    expect(add?.textContent).toBe('Add to cart');
    expect(add?.classList.contains('op-hide')).toBe(false);
  });

  it('relabels ADD THE LAST N! on the data-type cart label', () => {
    render(`<button><span id="cart" data-type="0" style="font-weight:600;color:#ffffff;font-size:16px">ADD THE LAST 1!</span></button>`);
    apply();
    const cart = document.getElementById('cart');
    expect(cart?.textContent).toBe('Add to cart');
    expect(cart?.classList.contains('op-hide')).toBe(false);
    expect(cart?.closest('button')?.classList.contains('op-hide')).toBe(false);
  });

  it('hides a split-digit countdown wrapper and leaves the price', () => {
    render(`
      <div class="deal" id="clock"><i class="_3DEnrCZ3">03</i>:<i class="_3DEnrCZ3">10</i>:<i class="_3DEnrCZ3">40</i>:<i class="_3DEnrCZ3">41</i> Ends in</div>
      <div class="price" id="price">$19.42</div>
    `);
    apply();
    expect(document.getElementById('clock')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('price')?.classList.contains('op-hide')).toBe(false);
  });

  it('hides the timer line Fastest delivery in N business days', () => {
    render(`
      <span id="timer-copy" class="" data-type="0" style="font-weight:400;color:#ffffff;font-size:12px">Fastest delivery in 5 business days</span>
      <span id="ship">Delivery: 5 business days</span>
    `);
    apply();
    expect(document.getElementById('timer-copy')?.classList.contains('op-hide')).toBe(true);
    expect(document.getElementById('ship')?.classList.contains('op-hide')).toBe(false);
  });

  it('relabels Add now! Almost out! instead of hiding it', () => {
    render(`<span id="buy" data-type="0">Add now! Almost out!</span>`);
    apply();
    expect(document.getElementById('buy')?.textContent).toBe('Add to cart');
    expect(document.getElementById('buy')?.classList.contains('op-hide')).toBe(false);
  });
});
