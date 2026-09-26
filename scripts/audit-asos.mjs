/**
 * Full cosmetic audit — ASOS US web
 * Run: node scripts/audit-asos.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'asos',
  outBasename: 'asos',
  expectedHostname: 'www.asos.com',
  pages: [
    {
      name: 'plp',
      url: 'https://www.asos.com/us/asos-design/asos-design-t-shirt-in-white/prd/202969812',
      expectedHostname: 'www.asos.com',
      waitFor: 'h1, [data-testid*="price"]',
      waitMs: 10000,
      scrolls: 4,
      followLink: 'a[href*="/prd/"]',
      followName: 'pdp-alt',
      followWaitMs: 10000,
      followWaitFor: 'h1, button',
      followMinBodyLen: 1200,
      followScrolls: 2,
    },
    {
      name: 'search',
      url: 'https://www.asos.com/us/search/?q=sneakers',
      expectedHostname: 'www.asos.com',
      waitFor: 'article, a[href*="/prd/"]',
      waitMs: 10000,
      scrolls: 5,
      followLink: 'a[href*="/prd/"]',
      followName: 'pdp',
      followWaitMs: 12000,
      followWaitFor: 'h1, button',
      followMinBodyLen: 1200,
      followScrolls: 3,
    },
  ],
});
