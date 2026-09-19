import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const vendorPath = resolve(process.cwd(), 'cosmetic-vendors.css');

const FORBIDDEN = [
  /\.banner\b/i,
  /\.modal\b/i,
  /\[class\*=["']modal/i,
  /\[class\*=["']css-/i,
  /role\s*=\s*["']dialog["']/i,
];

describe('cosmetic-vendors.css', () => {
  const source = readFileSync(vendorPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('is gated on html[data-op="1"]', () => {
    expect(source).toMatch(/html\[data-op="1"\]/);
  });

  it('includes allowlisted Shopify urgency prefixes', () => {
    expect(source).toContain('hurrify-');
    expect(source).toContain('hextom-');
    expect(source).toContain('privy-');
  });

  it('rejects generic modal/banner patterns', () => {
    for (const re of FORBIDDEN) {
      expect(source).not.toMatch(re);
    }
  });

  it('does not globalize Shopify theme-native leftovers', () => {
    expect(source).not.toMatch(/promo-countdown/);
    expect(source).not.toMatch(/header-timer/);
    expect(source).not.toMatch(/hero__title/);
    expect(source).not.toMatch(/\[class\*="promo-"]/);
  });

  it('documents FP matrix in repo', () => {
    const doc = readFileSync(resolve(process.cwd(), 'docs/FALSE_POSITIVE_MATRIX.md'), 'utf8');
    expect(doc).toContain('must-not');
    expect(doc).toContain('Iframe');
  });
});
