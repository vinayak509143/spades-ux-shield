/**
 * Checkout / pay / auth freeze for :uncheck (and related state mutation).
 * Keep aligned with scripts/lib/extract-cosmetic.mjs CRITICAL_* patterns.
 */

const CRITICAL_HOST_RE =
  /(?:^|\.)(?:stripe|paypal|braintree|razorpay|square(?:up)?|adyen|checkout)\.com$/i;

const CRITICAL_PATH_RE =
  /\/(?:checkout|cart|billing|payment|gp\/(?:buy|cart)|ap\/signin|signin|login|password|2fa|pay)\b/i;

const CRITICAL_SELECTOR_RE =
  /checkout|payment|billing|card-number|cardnumber|[\s"'`[=]cvv|[\s"'`[=]cvc|login-submit|amazon-?pay|razorpay|password-reset|two-factor|2fa|(?:^|[^a-z-])cart(?:$|[^a-z-])/i;

const PAYMENT_NAME_RE = /payment|card|cvv|cvc|billing|iban|routing/i;

export function isUncheckFrozen(opts: {
  hostname: string;
  path: string;
  selector: string;
  inputName?: string;
}): boolean {
  const host = opts.hostname.toLowerCase();
  if (CRITICAL_HOST_RE.test(host)) {
    return true;
  }
  if (CRITICAL_PATH_RE.test(opts.path)) {
    return true;
  }
  if (CRITICAL_SELECTOR_RE.test(opts.selector)) {
    return true;
  }
  if (opts.inputName && PAYMENT_NAME_RE.test(opts.inputName)) {
    return true;
  }
  return false;
}

const PURCHASE_LABEL =
  /^\s*(?:add\s+to\s+cart|add\s+now(?:!\s*almost\s+out!?)?|add\s+the\s+last\s+\d+!?|buy\s+now(?:!\s*(?:almost\s+out!?|last\s+\d+!?))?|checkout|check\s+out)\s*!?\s*$/i;

const PURCHASE_LABEL_SAMPLES = [
  'Buy now',
  'Buy now!',
  'Buy now! Almost out!',
  'Buy now! Almost out',
  'BUY NOW! LAST 1!',
  'Add to cart',
  'Add to cart!',
  'Add now!',
  'Add now! Almost out!',
  'ADD THE LAST 1!',
  'Checkout',
  'Check out',
];

export function isPurchaseLabel(text: string): boolean {
  return PURCHASE_LABEL.test(text.replace(/\s+/g, ' ').trim());
}

export function replaceTextTargetsPurchaseLabel(needle: string | RegExp): boolean {
  return PURCHASE_LABEL_SAMPLES.some((phrase) => {
    if (typeof needle === 'string') {
      return phrase.toLowerCase().includes(needle.toLowerCase());
    }
    return new RegExp(needle.source, needle.flags.replace('g', '')).test(phrase);
  });
}

export function isPurchaseControl(el: Element): boolean {
  if (isPurchaseLabel(el.textContent ?? '')) {
    return true;
  }
  const button = el.closest('button, [role="button"]');
  return button !== null && isPurchaseLabel(button.textContent ?? '');
}
