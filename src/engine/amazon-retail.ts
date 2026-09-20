/** SP-API retail storefront apex hosts only — not AWS, Music, Seller Central, etc. */
export const AMAZON_RETAIL_APEX = new Set([
  'amazon.com',
  'amazon.ca',
  'amazon.com.mx',
  'amazon.com.br',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.nl',
  'amazon.se',
  'amazon.pl',
  'amazon.com.be',
  'amazon.ie',
  'amazon.com.tr',
  'amazon.eg',
  'amazon.sa',
  'amazon.ae',
  'amazon.co.za',
  'amazon.in',
  'amazon.co.jp',
  'amazon.sg',
  'amazon.com.au',
]);

/** English storefronts — for amazon-en procedural / :has-text rules. */
export const AMAZON_EN_APEX = new Set([
  'amazon.com',
  'amazon.ca',
  'amazon.co.uk',
  'amazon.in',
  'amazon.com.au',
  'amazon.sg',
  'amazon.ie',
  'amazon.co.za',
]);

export const AMAZON_RETAIL_ALIAS = 'amazon-retail';
export const AMAZON_EN_ALIAS = 'amazon-en';

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function apexFromHostname(hostname: string): string | null {
  const host = normalizeHostname(hostname);
  if (!host) {
    return null;
  }
  if (AMAZON_RETAIL_APEX.has(host)) {
    return host;
  }
  if (host.startsWith('www.')) {
    const apex = host.slice(4);
    if (AMAZON_RETAIL_APEX.has(apex)) {
      return apex;
    }
  }
  return null;
}

/** True only for retail apex or www.{apex} — not aws.amazon.com, music.amazon.com, etc. */
export function isAmazonRetailHost(hostname: string): boolean {
  return apexFromHostname(hostname) !== null;
}

export function isAmazonEnHost(hostname: string): boolean {
  const apex = apexFromHostname(hostname);
  return apex !== null && AMAZON_EN_APEX.has(apex);
}

export function isAmazonRetailAliasHost(host: string): boolean {
  return normalizeHostname(host) === AMAZON_RETAIL_ALIAS;
}

export function isAmazonEnAliasHost(host: string): boolean {
  return normalizeHostname(host) === AMAZON_EN_ALIAS;
}
