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
    const observerSpy = vi.spyOn(MutationObserver.prototype, 'observe');
    engine.start([hideRule('.widget', /spam/)], { pierceShadow: false });
    const observesAtStart = observerSpy.mock.calls.length;

    engine.flush();
    engine.flush();
    engine.flush();

    expect(widget.classList.contains('op-hide')).toBe(true);
    expect(observerSpy.mock.calls.length).toBe(observesAtStart);
    observerSpy.mockRestore();
  });

  it('re-hides when a site restores display on the same node', () => {
    document.body.innerHTML = '<div class="widget">spam</div>';
    const widget = document.querySelector('.widget') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start([hideRule('.widget', /spam/)], { pierceShadow: false });
    engine.flush();
    widget.style.display = 'block';

    engine.flush();

    expect(widget.style.display).toBe('none');
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

  it('does not :uncheck on a checkout URL', () => {
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        pathname: '/checkout',
        search: '',
      },
      writable: true,
    });
    document.body.innerHTML =
      '<input type="checkbox" name="marketing_opt_in" checked />';
    const input = document.querySelector('input') as HTMLInputElement;

    const engine = new ProceduralEngine();
    engine.start([uncheckRule('input[name="marketing_opt_in"]')], {
      pierceShadow: false,
    });
    engine.flush();

    expect(input.checked).toBe(true);
    engine.stop();
  });

  it('ignores text/comment mutations and does not feed SVG to chrome.dom', () => {
    const open = vi.fn((el: HTMLElement) => {
      if (!(el instanceof HTMLElement) || el.nodeType !== 1) {
        throw new TypeError(
          'Error in invocation of dom.openOrClosedShadowRoot(HTMLElement element)',
        );
      }
      return null;
    });
    Object.defineProperty(globalThis, 'chrome', {
      value: { dom: { openOrClosedShadowRoot: open } },
      configurable: true,
      writable: true,
    });

    document.body.innerHTML =
      '<div class="urgency-banner">only 2 left in stock<svg xmlns="http://www.w3.org/2000/svg"></svg></div>';
    const banner = document.querySelector('.urgency-banner') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [hideRule('.urgency-banner', /only \d+ left in stock/i)],
      { pierceShadow: true },
    );
    engine.flush();

    banner.appendChild(document.createTextNode(' flash deal'));
    banner.appendChild(document.createComment('spa'));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    banner.appendChild(svg);

    expect(() => engine.flush()).not.toThrow();
    expect(banner.classList.contains('op-hide')).toBe(true);

    for (const [el] of open.mock.calls) {
      expect(el).toBeInstanceOf(HTMLElement);
      expect((el as Node).nodeType).toBe(1);
    }

    engine.stop();
    Reflect.deleteProperty(globalThis, 'chrome');
  });
});
