import { describe, expect, it } from 'vitest';
import { pathTemplate } from '../../src/popup/report.js';

describe('breakage report helpers', () => {
  it('anonymizes path templates', () => {
    expect(pathTemplate('/orders/12345/confirm')).toBe('/orders/:id/confirm');
    expect(pathTemplate('/user/test@example.com/profile')).toBe('/user/:email/profile');
    expect(pathTemplate('/')).toBe('/');
  });

  it('uses pathname only (query and hash are not part of path template)', () => {
    const page = new URL('https://shop.example.com/checkout/99?token=secret#pay');
    expect(pathTemplate(page.pathname)).toBe('/checkout/:id');
    expect(page.search).toBe('?token=secret');
  });
});
