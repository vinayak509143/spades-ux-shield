/**
 * Full cosmetic audit — Zara US web
 * Run: node scripts/audit-zara.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'zara',
  outBasename: 'zara',
  expectedHostname: 'www.zara.com',
  pages: [
    {
      name: 'plp',
      url: 'https://www.zara.com/us/en/man-tshirts-l855.html',
      expectedHostname: 'www.zara.com',
      waitFor: 'a[href*="-p"], li.product-grid-product',
      waitMs: 12000,
      scrolls: 5,
      followLink: 'a[href*="-p"]',
      followName: 'pdp',
      followWaitMs: 14000,
      followWaitFor: 'h1, [class*="price"], button',
      followMinBodyLen: 1000,
      followScrolls: 3,
    },
  ],
});
