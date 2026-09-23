/**
 * Full cosmetic audit — www.ticketmaster.com
 * Run: node scripts/audit-ticketmaster.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'ticketmaster',
  outBasename: 'ticketmaster',
  expectedHostname: 'www.ticketmaster.com',
  pages: [
    {
      name: 'search',
      url: 'https://www.ticketmaster.com/search?q=concert',
      expectedHostname: 'www.ticketmaster.com',
      waitFor: 'a[href*="/event/"], h1',
      waitMs: 6000,
      scrolls: 5,
      followPressure: true,
      followName: 'event',
      followLink: 'a[href*="/event/"]',
    },
    {
      name: 'event-fallback',
      url: 'https://www.ticketmaster.com/alabama-live-in-concert-university-park-pennsylvania-10-09-2026/event/0200650DAA2033B0',
      expectedHostname: 'www.ticketmaster.com',
      waitMs: 10000,
      scrolls: 3,
    },
    {
      name: 'discover',
      url: 'https://www.ticketmaster.com/discover/concerts',
      expectedHostname: 'www.ticketmaster.com',
      waitFor: 'a[href*="/event/"], h1',
      waitMs: 8000,
      scrolls: 4,
    },
  ],
});
