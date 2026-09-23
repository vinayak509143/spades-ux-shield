/**
 * Full cosmetic audit — www.ebay.com
 * Run: node scripts/audit-ebay.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'ebay',
  outBasename: 'ebay',
  expectedHostname: 'www.ebay.com',
  pages: [
    {
      name: 'serp',
      url: 'https://www.ebay.com/sch/i.html?_nkw=sneakers&LH_Auction=1&_sop=1&LH_Time=1',
      expectedHostname: 'www.ebay.com',
      waitFor: '.s-item, ul.srp-results',
      waitMs: 8000,
      scrolls: 10,
      followPressure: true,
      followName: 'listing',
      followLink: '.s-item__link[href*="/itm/"]',
      followWaitMs: 10000,
      followWaitFor: '#mainContent, .x-price-primary, button',
      followMinBodyLen: 1500,
      followScrolls: 4,
    },
  ],
});
