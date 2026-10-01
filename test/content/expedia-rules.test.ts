// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';
import { compileRules } from '../../src/engine/compiler.js';
import { parseList } from '../../src/engine/parser.js';

const source = readFileSync(resolve('lists/darklist.txt'), 'utf8');
const parsed = parseList(
  source
    .split('\n')
    .filter((line) => line.startsWith('www.expedia.com##'))
    .join('\n'),
);
const compiled = compileRules(parsed.rules);
const rules = [...compiled.hostBuckets.values()].flatMap((bucket) => bucket.procedural);
let engine: ProceduralEngine | undefined;

function render(): void {
  Object.defineProperty(window, 'location', {
    value: { hostname: 'www.expedia.com', pathname: '/Hotel-Search', search: '' },
    writable: true,
  });
  document.documentElement.innerHTML = `<head></head><body>
    <h1 data-stid="content-hotel-title" id="title">The Hotel</h1>
    <div class="uitk-text uitk-type-end" id="scarce">We have 2 left at this price</div>
    <div data-testid="nightly_price" id="price">$189</div>
    <button id="book">Reserve</button>
  </body>`;
}

afterEach(() => engine?.stop());

describe('Expedia scarcity', () => {
  it('hides the scarcity sentence and leaves the price, title, and reserve control', () => {
    expect(parsed.errors).toEqual([]);
    expect(compiled.errors).toEqual([]);
    render();
    engine = new ProceduralEngine();
    engine.start(rules, { pierceShadow: false });
    engine.flush();
    expect(document.getElementById('scarce')?.classList.contains('op-hide')).toBe(true);
    for (const id of ['title', 'price', 'book']) {
      expect(document.getElementById(id)?.classList.contains('op-hide')).toBe(false);
    }
  });
});
