// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CompiledProc } from '../../src/engine/types.js';
import { ProceduralEngine } from '../../src/content/dom-mutator.js';
import { collectWatchAttributes } from '../../src/content/procedural-match.js';

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

describe('procedural engine main-thread safety', () => {
  it('does not querySelectorAll("*") during start or flush', () => {
    document.documentElement.innerHTML = '<head></head><body></body>';
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', pathname: '/', search: '' },
      writable: true,
    });
    document.body.innerHTML = '<div class="urgency-banner">only 2 left in stock</div>';

    const docSpy = vi.spyOn(Document.prototype, 'querySelectorAll');
    const elSpy = vi.spyOn(Element.prototype, 'querySelectorAll');

    const engine = new ProceduralEngine();
    engine.start([hideRule('.urgency-banner', /only \d+ left in stock/i)], {
      pierceShadow: true,
    });
    engine.flush();
    engine.stop();

    const starCalls = [...docSpy.mock.calls, ...elSpy.mock.calls].filter(
      (args) => args[0] === '*',
    );
    expect(starCalls).toHaveLength(0);
    docSpy.mockRestore();
    elSpy.mockRestore();
  });

  it('does not attach an observer when no procedural rules match the host', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'unrelated.test', pathname: '/', search: '' },
      writable: true,
    });
    const spy = vi.spyOn(MutationObserver.prototype, 'observe');
    const engine = new ProceduralEngine();
    engine.start([hideRule('.urgency-banner', /x/)], { pierceShadow: true });
    expect(spy).not.toHaveBeenCalled();
    engine.stop();
    spy.mockRestore();
  });
});

describe('collectWatchAttributes', () => {
  it('does not watch class/style by default (Amazon SPA churn)', () => {
    const hide: CompiledProc = hideRule('.x', /y/);
    expect(collectWatchAttributes([hide])).toEqual([]);
  });

  it('watches checked only for :uncheck', () => {
    const uncheck: CompiledProc = {
      ruleId: 2,
      hosts: ['example.com'],
      entity: false,
      pathRe: null,
      selector: 'input',
      procedural: [],
      action: { type: 'uncheck' },
    };
    expect(collectWatchAttributes([uncheck])).toEqual(['checked']);
  });
});
