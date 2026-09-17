import { describe, expect, it } from 'vitest';
import { pathTemplate } from '../../src/popup/report.js';

describe('breakage report helpers', () => {
  it('anonymizes path templates', () => {
    expect(pathTemplate('/orders/12345/confirm')).toBe('/orders/:id/confirm');
    expect(pathTemplate('/user/test@example.com/profile')).toBe('/user/:email/profile');
    expect(pathTemplate('/')).toBe('/');
  });
});
