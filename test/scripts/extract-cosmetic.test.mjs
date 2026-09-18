import { describe, expect, it } from 'vitest';
import {
  extractCosmeticLines,
  isExtractableCosmeticLine,
} from '../../scripts/lib/extract-cosmetic.mjs';

describe('extract-cosmetic', () => {
  it('keeps hostname-scoped static hide rules', () => {
    expect(isExtractableCosmeticLine('example.com##.cookie-banner')).toBe(true);
    expect(isExtractableCosmeticLine('a.com,b.com##.newsletter')).toBe(true);
  });

  it('drops network, generic, and unsupported syntax', () => {
    expect(isExtractableCosmeticLine('||tracker.example^')).toBe(false);
    expect(isExtractableCosmeticLine('##.generic')).toBe(false);
    expect(isExtractableCosmeticLine('! comment')).toBe(false);
    expect(isExtractableCosmeticLine('example.com##^script:has-text(foo)')).toBe(false);
    expect(isExtractableCosmeticLine('example.com#?#.modal')).toBe(false);
    expect(
      isExtractableCosmeticLine('example.com##.x:has-text(cookie)'),
    ).toBe(false);
    expect(isExtractableCosmeticLine('example.com#$#hide-if-has-and-matches')).toBe(false);
  });

  it('dedupes extracted lines', () => {
    const text = [
      'example.com##.a',
      'example.com##.a',
      'other.net##.b',
    ].join('\n');
    const { lines } = extractCosmeticLines(text);
    expect(lines).toHaveLength(2);
  });
});
