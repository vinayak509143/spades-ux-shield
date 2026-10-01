// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileRules } from '../../src/engine/compiler.js';
import { parseList } from '../../src/engine/parser.js';

const source = readFileSync(resolve('lists/darklist.txt'), 'utf8');
const parsed = parseList(
  source
    .split('\n')
    .filter((line) => line.startsWith('us.shein.com,www.shein.com##'))
    .join('\n'),
);
const compiled = compileRules(parsed.rules);

describe('SHEIN sales chip', () => {
  it('hides the label that follows the icon and leaves a price label in another branch', () => {
    expect(parsed.errors).toEqual([]);
    expect(compiled.errors).toEqual([]);
    document.documentElement.innerHTML = `<head></head><body>
      <div id="chip">
        <img width="12" height="12" alt="900+ sold">
        <span class="label-text" id="sold">900+ sold</span>
      </div>
      <div id="wrap">
        <div><img width="12" height="12" alt="900+ sold"></div>
        <span class="label-text" id="price">₹10,920</span>
      </div>
      <div id="cart-chip">
        <img width="12" height="12" alt="9k+ user add to cart">
        <span class="label-text" id="added">9k+ user add to cart</span>
      </div>
    </body>`;
    const selectors = compiled.hostBuckets.get('us.shein.com')?.hideSelectors ?? [];
    expect(selectors).toContain('img[width="12"][height="12"][alt*="+ sold"] + span.label-text');
    expect(selectors).toContain('img[width="12"][height="12"][alt*="user add to cart"] + span.label-text');
    expect(selectors.some((selector) => selector.startsWith(':has(img'))).toBe(false);
    const nextLabel = (img: Element | null) =>
      img?.nextElementSibling?.matches('span.label-text') ? img.nextElementSibling : null;
    expect(nextLabel(document.querySelector('#chip img'))?.id).toBe('sold');
    expect(nextLabel(document.querySelector('#cart-chip img'))?.id).toBe('added');
    expect(nextLabel(document.querySelector('#wrap img'))).toBeNull();
  });
});
