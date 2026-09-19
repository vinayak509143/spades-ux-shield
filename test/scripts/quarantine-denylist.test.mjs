import { describe, expect, it } from 'vitest';
import { isDeniedQuarantineLine } from '../../scripts/quarantine/denylist.mjs';

describe('quarantine denylist', () => {
  it('allows hostname-scoped vendor selectors', () => {
    expect(isDeniedQuarantineLine('demo.shopify.com##.hurrify-bar')).toBe(false);
  });

  it('rejects generics and broad patterns', () => {
    expect(isDeniedQuarantineLine('##.banner')).toBe(true);
    expect(isDeniedQuarantineLine('shop.com##.modal')).toBe(true);
    expect(isDeniedQuarantineLine('shop.com##[class*="modal"]')).toBe(true);
    expect(isDeniedQuarantineLine('shop.com##div')).toBe(true);
  });
});
