// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyAmazonRetailMarks, applyHostMark } from '../../src/content/host-mark.js';
import { setPageActive } from '../../src/content/lifecycle.js';
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
});
