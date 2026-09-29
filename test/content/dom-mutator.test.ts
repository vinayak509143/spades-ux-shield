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

function replaceRule(selector: string, needle: RegExp, text: string): CompiledProc {
  return {
    ruleId: 3,
    hosts: ['example.com'],
    entity: false,
    pathRe: null,
    selector,
    procedural: [{ type: 'has-text', needle }],
    action: { type: 'replace-text', text },
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

  it('restores procedural hides when stopped with restoreHides', () => {
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

    engine.stop({ restoreHides: true });
    expect(banner.classList.contains('op-hide')).toBe(false);
    expect(banner.style.display).toBe('');
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

  it('replaces an urgency button label and keeps the control', () => {
    document.body.innerHTML =
      '<span data-type="0" class="" style="font-weight:600">Add now! Almost out!</span>';
    const label = document.querySelector('span') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [replaceRule('span[data-type="0"]', /^\s*add now!\s*almost out!?\s*$/i, 'Add to cart')],
      { pierceShadow: false },
    );
    engine.flush();

    expect(label.textContent).toBe('Add to cart');
    expect(label.style.display).not.toBe('none');
    expect(label.classList.contains('op-hide')).toBe(false);
    engine.stop();
  });

  it('keeps an icon inside a relabeled control', () => {
    document.body.innerHTML =
      '<span data-type="0" class=""><svg id="cart"></svg>Add now! Almost out!</span>';
    const label = document.querySelector('span') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [replaceRule('span[data-type="0"]', /^\s*add now!\s*almost out!?\s*$/i, 'Add to cart')],
      { pierceShadow: false },
    );
    engine.flush();

    expect(label.querySelector('#cart')).not.toBeNull();
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe('Add to cart');
    engine.stop();
  });

  it('writes the label again when the site restores the urgency text', () => {
    document.body.innerHTML = '<span data-type="0">Add now! Almost out!</span>';
    const label = document.querySelector('span') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [replaceRule('span[data-type="0"]', /^\s*add now!\s*almost out!?\s*$/i, 'Add to cart')],
      { pierceShadow: false },
    );
    engine.flush();
    label.textContent = 'Add now! Almost out!';
    engine.flush();

    expect(label.textContent).toBe('Add to cart');
    engine.stop();
  });

  it('hides ALMOST SOLD OUT on insert before idle (no glimpse path)', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const mount = document.getElementById('mount') as HTMLElement;
    const engine = new ProceduralEngine();
    engine.start(
      [hideRule('span[data-type="0"]', /^\s*ALMOST SOLD OUT\s*$/i)],
      { pierceShadow: false },
    );

    mount.innerHTML =
      '<span data-type="0" class="" style="font-weight:600;color:#FB7701">ALMOST SOLD OUT</span>';
    await new Promise((resolve) => setTimeout(resolve, 0));

    const label = mount.querySelector('span') as HTMLElement;
    expect(label.classList.contains('op-hide')).toBe(true);
    engine.stop();
  });

  it('hides a flash-sale Ends in label', () => {
    document.body.innerHTML =
      '<span class="iwi01ph3" style="color:#fff">Ends in</span><span class="t">12:34:56</span>';
    const label = document.querySelector('.iwi01ph3') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [
        hideRule(
          'span[class]',
          /^\s*(?:ends\s+in!?|\d{1,2}:\d{2}(?::\d{2})?)\s*$/i,
        ),
      ],
      { pierceShadow: false },
    );
    engine.flush();

    expect(label.classList.contains('op-hide')).toBe(true);
    engine.stop();
  });

  it('relabels Buy now! Almost out! without hiding the control', () => {
    document.body.innerHTML =
      '<span data-type="0" class="" style="font-weight:600">Buy now! Almost out!</span>';
    const label = document.querySelector('span') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [replaceRule('span[data-type="0"]', /^\s*buy now!\s*almost out!?\s*$/i, 'Buy now')],
      { pierceShadow: false },
    );
    engine.flush();

    expect(label.textContent).toBe('Buy now');
    engine.stop();
  });

  it('relabels BUY NOW! LAST N! without hiding the control', () => {
    document.body.innerHTML =
      '<span data-type="0" class="" style="font-weight:600">BUY NOW! LAST 1!</span>';
    const label = document.querySelector('span') as HTMLElement;

    const engine = new ProceduralEngine();
    engine.start(
      [replaceRule('span[data-type="0"]', /^\s*buy now!\s*last\s+\d+!?\s*$/i, 'Buy now')],
      { pierceShadow: false },
    );
    engine.flush();

    expect(label.textContent).toBe('Buy now');
    expect(label.classList.contains('op-hide')).toBe(false);
    engine.stop();
  });

  it('relabels an inserted button and leaves a delivery estimate', async () => {
    document.body.innerHTML = '<div id="card"></div>';
    const card = document.getElementById('card') as HTMLElement;
    const engine = new ProceduralEngine();
    engine.start(
      [replaceRule('span[data-type="0"]', /^\s*add now!\s*almost out!?\s*$/i, 'Add to cart')],
      { pierceShadow: false },
    );

    card.innerHTML =
      '<span data-type="0" class="">Add now! Almost out!</span><span data-type="0" class="">Fastest delivery in 5 business days</span>';
    await new Promise((resolve) => setTimeout(resolve, 0));

    const spans = [...card.querySelectorAll('span')].map((el) => el.textContent);
    expect(spans).toEqual(['Add to cart', 'Fastest delivery in 5 business days']);
    engine.stop();
  });

  it('replaceRules restores only elements whose hiding rules were all removed', () => {
    document.body.innerHTML = '<div class="a">only 2 left</div><div class="b">hurry now</div>';
    const a = document.querySelector('.a') as HTMLElement;
    const b = document.querySelector('.b') as HTMLElement;
    const ruleA = { ...hideRule('.a', /only 2 left/), ruleId: 11 };
    const ruleB = { ...hideRule('.b', /hurry/), ruleId: 12 };
    const both = { ...hideRule('.a', /only/), ruleId: 13 };

    const engine = new ProceduralEngine();
    engine.start([ruleA, both, ruleB], { pierceShadow: false });
    engine.flush();
    expect(a.classList.contains('op-hide')).toBe(true);
    expect(b.classList.contains('op-hide')).toBe(true);

    engine.replaceRules([both, ruleB]);
    expect(a.classList.contains('op-hide')).toBe(true);

    engine.replaceRules([ruleB]);
    expect(a.classList.contains('op-hide')).toBe(false);
    engine.flush();
    expect(b.classList.contains('op-hide')).toBe(true);
    expect(a.classList.contains('op-hide')).toBe(false);
    engine.stop();
  });

  it('does not toggle a hide when the rule id set is unchanged', () => {
    document.body.innerHTML = '<div class="urgency-banner">only 2 left in stock</div>';
    const banner = document.querySelector('.urgency-banner') as HTMLElement;
    const rule = hideRule('.urgency-banner', /only 2 left/);
    const engine = new ProceduralEngine();
    engine.start([rule], { pierceShadow: false });
    engine.flush();
    expect(banner.classList.contains('op-hide')).toBe(true);
    expect(engine.replaceRules([{ ...rule }])).toBe(false);
    expect(banner.classList.contains('op-hide')).toBe(true);
    engine.stop();
  });

  it('re-hides an element when a removed rule is added again', () => {
    document.body.innerHTML = '<div class="urgency-banner">only 2 left in stock</div>';
    const banner = document.querySelector('.urgency-banner') as HTMLElement;
    const rule = hideRule('.urgency-banner', /only 2 left/);
    const engine = new ProceduralEngine();
    engine.start([rule], { pierceShadow: false });
    engine.flush();
    engine.replaceRules([]);
    expect(banner.classList.contains('op-hide')).toBe(false);
    engine.replaceRules([rule]);
    engine.flush();
    expect(banner.classList.contains('op-hide')).toBe(true);
    engine.stop();
  });
});
