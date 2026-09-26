/**
 * Full cosmetic audit — H&M US web
 * Run: node scripts/audit-hm.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'hm',
  outBasename: 'hm',
  expectedHostname: 'www2.hm.com',
  pages: [
    {
      name: 'plp',
      url: 'https://www2.hm.com/en_us/men/shop-by-product/t-shirts.html',
      expectedHostname: 'www2.hm.com',
      waitFor: 'article, a[href*="/productpage"]',
      waitMs: 10000,
      scrolls: 5,
      followLink: 'a[href*="/productpage"]',
      followName: 'pdp',
      followWaitMs: 12000,
      followWaitFor: 'h1, [class*="price"], button',
      followMinBodyLen: 1200,
      followScrolls: 3,
    },
  ],
});
