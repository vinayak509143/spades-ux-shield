/** Shared denylist for quarantine / vendor-prefix harvest — never hide checkout chrome or theme shells. */

const BANNED_SELECTOR_PATTERNS = [
  /^\.banner\b/i,
  /^\.modal\b/i,
  /\[class\*=["']modal/i,
  /\[class\*=["']css-/i,
  /role\s*=\s*["']dialog["']/i,
  /^div$/i,
  /^header$/i,
  /^main$/i,
  /^body$/i,
];

/** First hyphen segment must not become a global [class*="…"] hide. */
export const THEME_NATIVE_PREFIXES = new Set([
  'promo-',
  'hero-',
  'price-',
  'product-',
  'announcement-',
  'header-',
  'cart-',
  'badge-',
  'shopify-',
  'shop-',
  'section-',
  'template-',
  'page-',
  'form-',
  'button-',
  'grid-',
  'card-',
  'image-',
  'media-',
  'slider-',
  'swiper-',
  'flickity-',
  'aos-',
  'js-',
  'checkout-',
  'payment-',
  'shipping-',
  'order-',
  'account-',
  'customer-',
  'quantity-',
  'variant-',
  'subtotal-',
  'data-',
  'aria-',
  'font-',
  'padding-',
  'margin-',
  'border-',
  'background-',
  'color-',
  'display-',
  'position-',
  'sticky-',
  'transform-',
  'animation-',
  'motion-',
  'flex-',
  'align-',
  'justify-',
  'visible-',
  'hidden-',
  'left-',
  'right-',
  'center-',
  'small-',
  'medium-',
  'large-',
  'col-',
  'inline-',
  'block-',
  'site-',
  'nav-',
  'search-',
  'input-',
  'drawer-',
  'ticker-',
  'slick-',
  'logo-',
  'lazy-',
  'focus-',
  'pointer-',
  'social-',
  'twitter-',
  'aspect-',
  'auto-',
  'fill-',
  'group-',
  'letter-',
  'reduce-',
  'scrolled-',
  'vertical-',
  'white-',
  'word-',
  'wrap-',
  'title-',
  'details-',
  'loader-',
  'mobile-',
  'rich-',
  'ratio-',
  'stroke-',
  'component-',
  'advantages-',
  'navbar-',
  'predictive-',
  'visually-',
  'sections-',
  'megamenu-',
  'demo-',
  'sigma-',
  'klaviyo-',
  'kl-private-',
]);

const GENERIC_PREFIXES = new Set([
  'modal-',
  'banner-',
  'popup-',
  'overlay-',
  'dialog-',
  'timer-',
  'counter-',
  'alert-',
  'toast-',
  'bar-',
  'box-',
  'nav-',
  'header-',
  'footer-',
  'content-',
  'container-',
  'wrapper-',
  'section-',
  'button-',
  'btn-',
  'icon-',
  'text-',
  'link-',
  'item-',
  'list-',
  'menu-',
  'main-',
  'body-',
  'html-',
  ...THEME_NATIVE_PREFIXES,
]);

const FROZEN_PATH_RE =
  /\/(?:checkout|cart|billing|payment|gp\/(?:buy|cart)|ap\/signin|signin|login|password|2fa|pay)(?:\/|$)/i;

export function isDeniedQuarantineLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('!')) {
    return false;
  }
  const marker = trimmed.indexOf('##');
  if (marker <= 0) {
    return true;
  }
  const body = trimmed.slice(marker + 2);
  return BANNED_SELECTOR_PATTERNS.some((re) => re.test(body));
}

export function isHashedClass(token) {
  const t = String(token || '');
  if (/^css-[a-zA-Z0-9_-]{4,}$/i.test(t)) {
    return true;
  }
  if (/^sc-[a-zA-Z0-9]{4,}$/i.test(t)) {
    return true;
  }
  if (/^_[a-zA-Z0-9]{5,}$/.test(t)) {
    return true;
  }
  if (/-[a-f0-9]{6,8}$/i.test(t) && /\d/.test(t)) {
    return true;
  }
  return false;
}

export function isThemeNativePrefix(prefix) {
  const p = String(prefix || '').toLowerCase();
  return THEME_NATIVE_PREFIXES.has(p);
}

const UTILITY_FIRST = new Set([
  'col',
  'color',
  'icon',
  'btn',
  'grid',
  'search',
  'searchinput',
  'body',
  'menu',
  'nav',
  'site',
  'logo',
  'input',
  'title',
  'rich',
  'tt',
  'fa',
  'ao',
  'an',
  'bk',
  'scn',
  'aca',
  'cta',
  'text',
  'link',
  'img',
  'form',
  'list',
  'item',
  'main',
  'scroll',
  'custom',
  'scheme',
  'navbar',
  'anmegamenu',
  'megamenu',
  'sliderow',
  'sliderule',
  'navlink',
]);

export function isUtilityPrefix(prefix) {
  const p = String(prefix || '').toLowerCase();
  const first = p.replace(/-$/, '').split('-')[0];
  if (UTILITY_FIRST.has(first)) {
    return true;
  }
  return /(?:menu|drawer|dropdown|navbar|megamenu)/.test(p);
}

export function isDeniedPrefix(prefix) {
  const p = String(prefix || '').toLowerCase();
  if (!p.endsWith('-')) {
    return true;
  }
  if (p.length < 5) {
    return true;
  }
  if (!/^[a-z][a-z0-9-]*-$/.test(p)) {
    return true;
  }
  if (GENERIC_PREFIXES.has(p) || isUtilityPrefix(p)) {
    return true;
  }
  if (p.startsWith('css-') || p.startsWith('sc-')) {
    return true;
  }
  return false;
}

export function isFrozenHarvestUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  const local = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  if (!/^https?:$/i.test(parsed.protocol) && !local) {
    return true;
  }
  return FROZEN_PATH_RE.test(parsed.pathname);
}
