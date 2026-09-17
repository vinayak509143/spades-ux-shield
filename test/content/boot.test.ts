// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
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
