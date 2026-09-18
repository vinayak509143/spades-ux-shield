import { describe, expect, it } from 'vitest';
import { isUncheckFrozen } from '../../src/engine/critical-flow.js';
import { parseLine } from '../../src/engine/parser.js';

describe('isUncheckFrozen', () => {
  it('allows newsletter / consent checkboxes on a normal article path', () => {
    expect(
      isUncheckFrozen({
        hostname: 'news.example.com',
        path: '/article/1',
        selector: 'input[name="marketing_opt_in"]',
        inputName: 'marketing_opt_in',
      }),
    ).toBe(false);
  });

  it('freezes :uncheck on checkout, cart, pay, and login URLs', () => {
    expect(
      isUncheckFrozen({
        hostname: 'shop.example.com',
        path: '/checkout',
        selector: 'input[name="newsletter"]',
        inputName: 'newsletter',
      }),
    ).toBe(true);
    expect(
      isUncheckFrozen({
        hostname: 'www.amazon.in',
        path: '/gp/cart/view.html',
        selector: 'input[name="newsletter"]',
        inputName: 'newsletter',
      }),
    ).toBe(true);
    expect(
      isUncheckFrozen({
        hostname: 'pay.stripe.com',
        path: '/',
        selector: 'input[type="checkbox"]',
        inputName: 'opt_in',
      }),
    ).toBe(true);
    expect(
      isUncheckFrozen({
        hostname: 'accounts.google.com',
        path: '/signin/v2',
        selector: 'input[name="opt_in"]',
        inputName: 'opt_in',
      }),
    ).toBe(true);
  });

  it('freezes payment-like input names even on a blog path', () => {
    expect(
      isUncheckFrozen({
        hostname: 'shop.example.com',
        path: '/',
        selector: 'input[type="checkbox"]',
        inputName: 'payment_method',
      }),
    ).toBe(true);
  });
});

describe('parser :uncheck', () => {
  it('still parses checkout-path fixtures (freeze is runtime, not syntax)', () => {
    const { rule, error } = parseLine(
      'sketchy-airlines.example.com/checkout/*##input[name="travel_insurance"]:uncheck',
      1,
    );
    expect(error).toBeUndefined();
    expect(rule?.action.type).toBe('uncheck');
  });
});
