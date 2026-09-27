// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseList } from '../../src/engine/parser.js';
import { compileRules } from '../../src/engine/compiler.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';

const source = readFileSync(resolve('lists/darklist.txt'), 'utf8');
const parsed = parseList(
  source.split('\n').filter((line) => line.startsWith('www.thredup.com##')).join('\n'),
);
const compiled = compileRules(parsed.rules);
const rules = [...compiled.hostBuckets.values()].flatMap((bucket) => bucket.procedural);
let engine: ProceduralEngine | undefined;

const pdpPath =
  '/product/women-polyester-lc-lauren-conrad-gold-cocktail-dress/236258639';

function render(path: string, hostname = 'www.thredup.com'): void {
  const url = new URL(path, `https://${hostname}`);
  Object.defineProperty(window, 'location', {
    value: { hostname, pathname: url.pathname, search: url.search },
    writable: true,
  });
  document.documentElement.innerHTML = `<head></head><body>
    <div id="buybox">
      <p id="price">$15.99</p>
      <p id="was">$31.99</p>
      <button id="atc">Add to cart</button>
      <div class="u:mt-3x">
        <div class="u:flex body-copy-sm u:mt-1x" id="popular-badge">
          <img alt="Flame" class="u:mr-1xs" height="16" width="16" src="/tup-assets/pwa/production/assets/flame.svg">
          <span>This item is popular! It's likely to sell soon.</span>
        </div>
      </div>
      <p id="condition">Very Good Condition</p>
    </div>
    <a href="/cart">Cart</a>
  </body>`;
}

function apply(): void {
  engine = new ProceduralEngine();
  engine.start(rules, { pierceShadow: false });
  engine.flush();
}

afterEach(() => engine?.stop());

describe('ThredUp popular badge', () => {
  it('compiles procedural hide rules without global CSS', () => {
    expect(parsed.errors).toEqual([]);
    expect(compiled.errors).toEqual([]);
    expect(rules.length).toBeGreaterThanOrEqual(1);
    expect(rules.every((rule) => rule.action.type === 'hide')).toBe(true);
    expect(compiled.genericCss).toBe('');
  });

  it('hides flame popularity row on product pages only', () => {
    render(pdpPath);
    apply();
    expect(document.getElementById('popular-badge')?.classList.contains('op-hide')).toBe(true);
    for (const id of ['price', 'was', 'atc', 'condition', 'buybox']) {
      expect(document.getElementById(id)?.closest('.op-hide')).toBeNull();
    }
  });

  it('does not hide the badge off product routes', () => {
    render('/women/dresses');
    apply();
    expect(document.getElementById('popular-badge')?.classList.contains('op-hide')).toBe(false);
  });

  it('does not hide unrelated hosts', () => {
    render(pdpPath, 'www.example.com');
    apply();
    expect(document.getElementById('popular-badge')?.classList.contains('op-hide')).toBe(false);
  });
});
