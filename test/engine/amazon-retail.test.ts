import { describe, expect, it } from 'vitest';
import {
  AMAZON_RETAIL_APEX,
  isAmazonEnHost,
  isAmazonRetailHost,
} from '../../src/engine/amazon-retail.js';

describe('amazon-retail allowlist', () => {
  it('has 23 retail apex hosts', () => {
    expect(AMAZON_RETAIL_APEX.size).toBe(23);
  });

  it('matches retail apex and www only', () => {
    expect(isAmazonRetailHost('www.amazon.com')).toBe(true);
    expect(isAmazonRetailHost('amazon.com')).toBe(true);
    expect(isAmazonRetailHost('amazon.de')).toBe(true);
    expect(isAmazonRetailHost('www.amazon.co.uk')).toBe(true);
    expect(isAmazonRetailHost('www.amazon.in')).toBe(true);
  });

  it('rejects non-retail amazon subdomains', () => {
    expect(isAmazonRetailHost('aws.amazon.com')).toBe(false);
    expect(isAmazonRetailHost('music.amazon.com')).toBe(false);
    expect(isAmazonRetailHost('sellercentral.amazon.com')).toBe(false);
    expect(isAmazonRetailHost('pay.amazon.com')).toBe(false);
    expect(isAmazonRetailHost('developer.amazon.com')).toBe(false);
  });

  it('english subset for deal-badge text rules', () => {
    expect(isAmazonEnHost('www.amazon.com')).toBe(true);
    expect(isAmazonEnHost('amazon.in')).toBe(true);
    expect(isAmazonEnHost('amazon.de')).toBe(false);
    expect(isAmazonEnHost('www.amazon.fr')).toBe(false);
  });
});
