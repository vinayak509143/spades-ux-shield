// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { applyHostMark, ensureHostMark } from '../../src/content/host-mark.js';

describe('host-mark', () => {
  it('restores data-op-h when stripped while active', () => {
    vi.stubGlobal('location', { hostname: 'www.shop.example.com' });
    applyHostMark();
    document.documentElement.removeAttribute('data-op-h');
    document.documentElement.setAttribute('data-op', '1');
    ensureHostMark();
    expect(document.documentElement.getAttribute('data-op-h')).toContain('example.com');
    vi.unstubAllGlobals();
  });

  it('restores data-op-h when overwritten while active', () => {
    vi.stubGlobal('location', { hostname: 'www.amazon.in' });
    applyHostMark();
    document.documentElement.setAttribute('data-op-h', 'wrong-host');
    document.documentElement.setAttribute('data-op', '1');
    ensureHostMark();
    expect(document.documentElement.getAttribute('data-op-h')).toContain('amazon.in');
    vi.unstubAllGlobals();
  });
});
