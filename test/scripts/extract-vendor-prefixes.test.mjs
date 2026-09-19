import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isDeniedPrefix,
  isFrozenHarvestUrl,
  isHashedClass,
  isThemeNativePrefix,
} from '../../scripts/quarantine/denylist.mjs';
import {
  formatVendorCss,
  minePrefixesFromWidgets,
  prefixFromToken,
} from '../../scripts/quarantine/extract-prefixes.mjs';
import { extractPending } from '../../scripts/quarantine/extract-vendor-prefixes.mjs';

describe('vendor prefix miner', () => {
  it('extracts stable Shopify app namespaces', () => {
    expect(prefixFromToken('hextom-fsb-bar')).toBe('hextom-');
    expect(prefixFromToken('hurrify-countdown-bar')).toBe('hurrify-');
    expect(prefixFromToken('sales-pop-toast')).toBe('sales-pop-');
    expect(prefixFromToken('proof-factor-widget')).toBe('proof-factor-');
  });

  it('rejects hashes, generics, and theme-native leftovers', () => {
    expect(isHashedClass('css-1a2b3c')).toBe(true);
    expect(isHashedClass('sc-1a2b3c')).toBe(true);
    expect(prefixFromToken('css-1a2b3c')).toBeNull();
    expect(prefixFromToken('modal-overlay')).toBeNull();
    expect(prefixFromToken('promo-countdown')).toBeNull();
    expect(prefixFromToken('header-timer-box')).toBeNull();
    expect(prefixFromToken('checkout-cta')).toBeNull();
    expect(prefixFromToken('col-md-6')).toBeNull();
    expect(prefixFromToken('qsk-popup-root')).toBe('qsk-popup-');
    expect(prefixFromToken('hero__title')).toBeNull();
    expect(isThemeNativePrefix('promo-')).toBe(true);
    expect(isDeniedPrefix('banner-')).toBe(true);
    expect(isDeniedPrefix('hextom-')).toBe(false);
  });

  it('refuses cart/checkout/login harvest URLs', () => {
    expect(isFrozenHarvestUrl('https://demo.myshopify.com/cart')).toBe(true);
    expect(isFrozenHarvestUrl('https://demo.myshopify.com/checkout')).toBe(true);
    expect(isFrozenHarvestUrl('https://demo.myshopify.com/account/login')).toBe(true);
    expect(isFrozenHarvestUrl('https://demo-hurrier-countdown-timer.myshopify.com/')).toBe(
      false,
    );
    expect(isFrozenHarvestUrl('http://127.0.0.1:4173/vendor-widget.html')).toBe(false);
  });

  it('mines scraped JSON and emits data-op gated CSS', () => {
    const scraped = {
      pages: [
        {
          url: 'https://sigma-28.myshopify.com/',
          nodes: [
            {
              classes: ['hextom-fsb-bar', 'hextom-fsb-inner'],
              id: 'hextom-root',
              outerHTML: '<div class="hextom-fsb-bar"></div>',
            },
            {
              classes: ['promo-countdown'],
              id: 'header-timer-box',
              outerHTML: '<span class="promo-countdown"></span>',
            },
          ],
        },
      ],
    };
    const mined = minePrefixesFromWidgets(scraped);
    expect(mined.map((r) => r.prefix)).toContain('hextom-');
    expect(mined.map((r) => r.prefix)).not.toContain('promo-');
    const css = formatVendorCss(mined);
    expect(css).toContain('html[data-op="1"] [class*="hextom-"]');
    expect(css).not.toContain('promo-');
  });

  it('ignores CSS property text inside outerHTML', () => {
    const mined = minePrefixesFromWidgets({
      pages: [
        {
          nodes: [
            {
              classes: ['hextom-bar'],
              outerHTML: '<div class="hextom-bar" style="padding-top:8px;margin-left:0"></div>',
            },
          ],
        },
      ],
    });
    expect(mined.map((r) => r.prefix)).toEqual(['hextom-']);
  });

  it('does not re-queue prefixes already in cosmetic-vendors.css', () => {
    const existing = readFileSync(resolve(process.cwd(), 'cosmetic-vendors.css'), 'utf8');
    const scraped = {
      pages: [
        {
          nodes: [{ classes: ['hurrify-countdown-bar', 'promo-countdown', 'checkout-cta'] }],
        },
      ],
    };
    const result = extractPending(scraped, existing);
    expect(result.novel).not.toContain('hurrify-');
    expect(result.novel).not.toContain('promo-');
    expect(result.novel).not.toContain('checkout-');
  });

  it('shopify demo list is storefronts only', () => {
    const { demos } = JSON.parse(
      readFileSync(resolve(process.cwd(), 'scripts/quarantine/shopify-demos.json'), 'utf8'),
    );
    for (const demo of demos) {
      expect(demo.url).not.toMatch(/apps\.shopify\.com/i);
      expect(isFrozenHarvestUrl(demo.url)).toBe(false);
    }
  });
});
