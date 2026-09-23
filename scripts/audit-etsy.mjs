/**
 * Full cosmetic audit — www.etsy.com
 * Run: node scripts/audit-etsy.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'etsy',
  outBasename: 'etsy',
  expectedHostname: 'www.etsy.com',
  pages: [
    {
      name: 'search',
      url: 'https://www.etsy.com/search?q=personalized+necklace&ref=search_bar',
      expectedHostname: 'www.etsy.com',
      waitFor: 'a[href*="/listing/"]',
      waitMs: 14000,
      waitUntil: 'load',
      scrolls: 6,
      followPressure: true,
      followName: 'listing',
      followLink: 'a[href*="/listing/"]',
    },
  ],
});
