// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompiledProc } from '../../src/engine/types.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';

function hideRule(selector: string, needle: RegExp): CompiledProc {
  return {
    ruleId: 1,
    hosts: ['example.com'],
    entity: false,
    pathRe: null,
    selector,
    procedural: [{ type: 'has-text', needle }],
    action: { type: 'hide' },
  };
}

function uncheckRule(selector: string): CompiledProc {
  return {
    ruleId: 2,
    hosts: ['example.com'],
    entity: false,
    pathRe: null,
    selector,
    procedural: [],
    action: { type: 'uncheck' },
  };
}

describe('ProceduralEngine', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        pathname: '/',
        search: '',
      },
      writable: true,
    });
  });

  it('hides elements matching procedural :has-text', () => {
    document.body.innerHTML =
      '<div class="urgency-banner">only 2 left in stock</div>';
    const banner = document.querySelector('.urgency-banner') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [hideRule('.urgency-banner', /only \d+ left in stock/i)],
      { pierceShadow: false },
    );
    engine.flush();

    expect(banner.classList.contains('op-hide')).toBe(true);
    expect(banner.style.display).toBe('none');
  });

  it('unchecks checkboxes with native setter and events', () => {
    document.body.innerHTML =
      '<input type="checkbox" name="travel_insurance" checked />';
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);

    const engine = new ProceduralEngine();
    engine.start([uncheckRule('input[name="travel_insurance"]')], {
      pierceShadow: false,
    });
    engine.flush();

    expect(input.checked).toBe(false);
  });

  it('does not loop when repeated passes run after hide', () => {
    document.body.innerHTML = '<div class="widget">spam</div>';
    const widget = document.querySelector('.widget') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start([hideRule('.widget', /spam/)], { pierceShadow: false });

    const observerSpy = vi.spyOn(MutationObserver.prototype, 'observe');

    engine.flush();
    engine.flush();
    engine.flush();

    expect(widget.classList.contains('op-hide')).toBe(true);
    expect(observerSpy.mock.calls.length).toBeGreaterThan(0);
    observerSpy.mockRestore();
  });

  it('skips payment-like checkbox names for :uncheck', () => {
    document.body.innerHTML =
      '<input type="checkbox" name="payment_method" checked />';
    const input = document.querySelector('input') as HTMLInputElement;

    const engine = new ProceduralEngine();
    engine.start([uncheckRule('input[type="checkbox"]')], { pierceShadow: false });
    engine.flush();

    expect(input.checked).toBe(true);
  });
});
