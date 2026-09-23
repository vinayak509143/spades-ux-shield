/**
 * Full cosmetic audit — www.airbnb.com only (geo mismatch = blocked)
 * Run: node scripts/audit-airbnb.mjs  (use US VPN if redirected to airbnb.co.in)
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'airbnb',
  outBasename: 'airbnb',
  expectedHostname: 'www.airbnb.com',
  pages: [
    {
      name: 'serp',
      url:
        'https://www.airbnb.com/s/New-York--NY/homes?checkin=2026-10-16&checkout=2026-10-17&adults=2&locale=en&currency=USD',
      expectedHostname: 'www.airbnb.com',
      waitFor: '[data-testid="card-container"], a[href*="/rooms/"]',
      waitMs: 10000,
      scrolls: 6,
      extraNagRe:
        'people\\s+are\\s+viewing|viewing\\s+now|in\\s+high\\s+demand|rare\\s+find|only\\s+\\d+\\s+left',
      followPressure: true,
      followName: 'listing',
      followLink: 'a[href*="/rooms/"]',
      followWaitMs: 14000,
      followWaitFor:
        'h1, [data-plugin-in-point-id="TITLE_DEFAULT"], [data-testid="book-it-default"], button',
      followScrolls: 10,
      followMinBodyLen: 2000,
      followWaitUntil: 'load',
    },
  ],
});
