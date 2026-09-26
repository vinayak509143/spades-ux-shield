/**
 * Full cosmetic audit — AliExpress US
 * Run: node scripts/audit-aliexpress.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'aliexpress',
  outBasename: 'aliexpress',
  expectedHostname: 'www.aliexpress.com',
  pages: [
    {
      name: 'home',
      url: 'https://www.aliexpress.com/',
      expectedHostname: 'www.aliexpress.com',
      waitFor: 'a[href*="/item/"], .search-card-item',
      waitMs: 10000,
      scrolls: 5,
      followLink: 'a[href*="/item/"]',
      followName: 'pdp',
      followWaitMs: 12000,
      followWaitFor: 'h1, .product-price, button',
      followMinBodyLen: 1200,
      followScrolls: 4,
    },
  ],
});
