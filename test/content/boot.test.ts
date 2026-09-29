// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyAmazonRetailMarks, applyHostMark } from '../../src/content/host-mark.js';
import { handlePageShow, setPageActive, bindEngine, updateBoundRules } from '../../src/content/lifecycle.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';
import { hostSuffixes } from '../../src/engine/util.js';

describe('boot data-op-h', () => {
  it('sets space-separated hostname suffixes synchronously', () => {
    const suffixes = hostSuffixes('www.shop.example.com').join(' ');
    document.documentElement.setAttribute('data-op-h', suffixes);
    document.documentElement.setAttribute('data-op', '1');

    expect(document.documentElement.getAttribute('data-op-h')).toBe(
      'www.shop.example.com shop.example.com example.com com',
    );
    expect(document.documentElement.getAttribute('data-op')).toBe('1');
  });
});

describe('amazon retail host marks', () => {
  it('stamps data-op-amz on retail hosts only', () => {
    const html = document.documentElement;
    applyAmazonRetailMarks(html, 'www.amazon.com');
    expect(html.getAttribute('data-op-amz')).toBe('1');
    expect(html.getAttribute('data-op-amz-en')).toBe('1');

    applyAmazonRetailMarks(html, 'aws.amazon.com');
    expect(html.getAttribute('data-op-amz')).toBeNull();
    expect(html.getAttribute('data-op-amz-en')).toBeNull();
  });

  it('pause strips amazon retail marks', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'www.amazon.in' },
      configurable: true,
    });
    applyHostMark();
    expect(document.documentElement.getAttribute('data-op-amz')).toBe('1');
    setPageActive(false);
    expect(document.documentElement.getAttribute('data-op-amz')).toBeNull();
    expect(document.documentElement.getAttribute('data-op-amz-en')).toBeNull();
  });

  it('pageshow while paused does not restore data-op marks', () => {
    setPageActive(false);
    expect(document.documentElement.getAttribute('data-op')).toBeNull();
    applyHostMark();
    expect(document.documentElement.getAttribute('data-op')).toBe('1');
    handlePageShow();
    expect(document.documentElement.getAttribute('data-op')).toBeNull();
    expect(document.documentElement.getAttribute('data-op-h')).toBeNull();
  });
});

describe('resume uses the latest bound rules', () => {
  it('applies rules updated while paused', () => {
    document.body.innerHTML = '<div class="old">only 2 left</div><div class="new">hurry now</div>';
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', pathname: '/', search: '' },
      configurable: true,
    });
    const engine = new ProceduralEngine();
    const oldRule = {
      ruleId: 11,
      hosts: ['example.com'],
      entity: false,
      pathRe: null,
      selector: '.old',
      procedural: [{ type: 'has-text' as const, needle: /only 2 left/ }],
      action: { type: 'hide' as const },
    };
    const newRule = {
      ...oldRule,
      ruleId: 12,
      selector: '.new',
      procedural: [{ type: 'has-text' as const, needle: /hurry/ }],
    };
    bindEngine(engine, [oldRule], { pierceShadow: false });
    engine.start([oldRule], { pierceShadow: false });
    engine.flush();
    expect(document.querySelector('.old')?.classList.contains('op-hide')).toBe(true);

    updateBoundRules([newRule]);
    setPageActive(false);
    expect(document.querySelector('.old')?.classList.contains('op-hide')).toBe(false);
    setPageActive(true);
    engine.flush();
    expect(document.querySelector('.new')?.classList.contains('op-hide')).toBe(true);
    expect(document.querySelector('.old')?.classList.contains('op-hide')).toBe(false);
    engine.stop();
  });
});
