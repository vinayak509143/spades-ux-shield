/**
 * Full cosmetic audit — Shein US storefront
 * Run: node scripts/audit-shein.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'shein',
  outBasename: 'shein',
  pages: [
    {
      name: 'home',
      url: 'https://us.shein.com/',
      waitFor: 'a[href*="-p-"], .product-card',
      waitMs: 8000,
      scrolls: 5,
      followLink: 'a[href*="-p-"]',
      followName: 'pdp',
      followWaitMs: 12000,
      followWaitFor: 'h1, .product-intro__head-price, .product-intro__head-name',
      followMinBodyLen: 1500,
      followScrolls: 4,
    },
    {
      name: 'pdp-direct',
      url: 'https://us.shein.com/pdsearch/T-shirt/?ici=us_tab04navbar04',
      waitFor: 'a[href*="-p-"]',
      waitMs: 10000,
      scrolls: 4,
      followLink: 'a[href*="-p-"]',
      followName: 'pdp',
      followWaitMs: 12000,
      followWaitFor: 'h1, .product-intro__head-price',
      followMinBodyLen: 1500,
    },
  ],
});
