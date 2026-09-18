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
