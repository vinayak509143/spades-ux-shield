import { describe, expect, it } from 'vitest';
import {
  hasTopLevelCommaInSelector,
  hasUnsafeSelectorSyntax,
  isValidCosmeticSelector,
} from '../../src/engine/selector-valid.js';

describe('hasUnsafeSelectorSyntax', () => {
  it('rejects brace injection without DOM', () => {
    expect(hasUnsafeSelectorSyntax('div}body{display:none')).toBe(true);
    expect(isValidCosmeticSelector('div}body{display:none')).toBe(false);
  });

  it('accepts ordinary selectors without DOM', () => {
    expect(hasUnsafeSelectorSyntax('.newsletter-overlay')).toBe(false);
    expect(isValidCosmeticSelector('.newsletter-overlay')).toBe(true);
  });
});

describe('hasTopLevelCommaInSelector', () => {
  it('detects top-level comma only', () => {
    expect(hasTopLevelCommaInSelector('.a, .b')).toBe(true);
    expect(hasTopLevelCommaInSelector('a:not(.x, .y)')).toBe(false);
  });
});
