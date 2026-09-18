// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getShadowRoot, queryAll } from '../../src/content/shadow.js';

type OpenFn = (el: HTMLElement) => ShadowRoot | null;

function stubOpenOrClosed(impl: OpenFn): ReturnType<typeof vi.fn> {
  const open = vi.fn(impl);
  Object.defineProperty(globalThis, 'chrome', {
    value: { dom: { openOrClosedShadowRoot: open } },
    configurable: true,
    writable: true,
  });
  return open;
}

afterEach(() => {
  vi.unstubAllGlobals();
  // jsdom: drop chrome stub so later tests do not inherit it
  Reflect.deleteProperty(globalThis, 'chrome');
});

describe('getShadowRoot', () => {
  it('does not call openOrClosedShadowRoot for Text, Comment, or SVG', () => {
    const open = stubOpenOrClosed(() => {
      throw new TypeError(
        'Error in invocation of dom.openOrClosedShadowRoot(HTMLElement element)',
      );
    });

    expect(getShadowRoot(document.createTextNode('amazon-spa'))).toBeNull();
    expect(getShadowRoot(document.createComment('c'))).toBeNull();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(getShadowRoot(svg)).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('returns null when chrome.dom.openOrClosedShadowRoot throws', () => {
    stubOpenOrClosed(() => {
      throw new TypeError(
        'Error in invocation of dom.openOrClosedShadowRoot(HTMLElement element)',
      );
    });
    const host = document.createElement('div');
    expect(() => getShadowRoot(host)).not.toThrow();
    expect(getShadowRoot(host)).toBeNull();
  });

  it('returns closed shadow from chrome for HTMLElement hosts', () => {
    const host = document.createElement('div');
    const fakeRoot = host.attachShadow({ mode: 'open' });
    stubOpenOrClosed((el) => (el === host ? fakeRoot : null));
    expect(getShadowRoot(host)).toBe(fakeRoot);
  });
});

describe('queryAll shadow pierce', () => {
  it('never passes non-HTMLElements to openOrClosedShadowRoot', () => {
    const open = stubOpenOrClosed((el) => {
      if (!(el instanceof HTMLElement) || el.nodeType !== 1) {
        throw new TypeError(
          'Error in invocation of dom.openOrClosedShadowRoot(HTMLElement element)',
        );
      }
      return null;
    });

    document.body.innerHTML =
      '<div class="card">hello<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg></div>';
    document.body.appendChild(document.createTextNode('more'));
    document.body.appendChild(document.createComment('note'));

    expect(() => queryAll('.card', document, true)).not.toThrow();
    expect(queryAll('.card', document, true)).toHaveLength(1);

    for (const [el] of open.mock.calls) {
      expect(el).toBeInstanceOf(HTMLElement);
      expect((el as Node).nodeType).toBe(1);
    }
  });
});
