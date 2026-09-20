import {
  AMAZON_EN_ALIAS,
  AMAZON_RETAIL_ALIAS,
  AMAZON_RETAIL_APEX,
} from './amazon-retail.js';

const ALLOWED_INDIA = new Set(['amazon.in', 'www.amazon.in']);
const ALLOWED_ALIASES = new Set([AMAZON_RETAIL_ALIAS, AMAZON_EN_ALIAS]);

function normalizeHostToken(token: string): string {
  let host = token.trim().toLowerCase();
  const slash = host.indexOf('/');
  if (slash !== -1) {
    host = host.slice(0, slash);
  }
  if (host.endsWith('.*')) {
    host = host.slice(0, -2);
  }
  return host;
}

/**
 * Returns an error message if a darklist domain token must not be used (suffix-match trap).
 */
export function amazonListHostViolation(hostToken: string): string | null {
  const host = normalizeHostToken(hostToken);
  if (!host) {
    return null;
  }
  if (ALLOWED_ALIASES.has(host)) {
    return null;
  }
  if (ALLOWED_INDIA.has(host)) {
    return null;
  }
  const apex = host.startsWith('www.') ? host.slice(4) : host;
  if (AMAZON_RETAIL_APEX.has(apex) || AMAZON_RETAIL_APEX.has(host)) {
    return `Amazon retail apex "${host}" must use amazon-retail or amazon-en aliases (not data-op-h~=); amazon.in/www.amazon.in only for India ATF rules`;
  }
  return null;
}
