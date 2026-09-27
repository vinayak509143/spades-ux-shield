/**
 * Full cosmetic audit — www.thredup.com
 * Run: node scripts/audit-thredup.mjs
 * Stock Playwright often gets a bot shell (short body). For a full pass, use Chrome CDP like audit-temu.mjs.
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

const EXTRA =
  'likely to sell|item is popular|items sold this hour|just saved \\$|just purchased|purchased a|looking at this|reserved in your cart|offer ends|time is running out';

await runLiveAudit({
  name: 'thredup',
  outBasename: 'thredup',
  expectedHostname: 'www.thredup.com',
  pages: [
    {
      name: 'home',
      url: 'https://www.thredup.com/',
      expectedHostname: 'www.thredup.com',
      waitFor: 'a[href*="/product/"]',
      waitMs: 12000,
      waitUntil: 'domcontentloaded',
      scrolls: 5,
      extraNagRe: EXTRA,
    },
    {
      name: 'women',
      url: 'https://www.thredup.com/women?department_tags=women&sort=relevance',
      expectedHostname: 'www.thredup.com',
      waitFor: 'a[href*="/product/"]',
      waitMs: 10000,
      scrolls: 6,
      extraNagRe: EXTRA,
      followPressure: true,
      followName: 'pdp',
      followLink: 'a[href*="/product/"]',
      followWaitMs: 8000,
      followScrolls: 5,
      followMinBodyLen: 1500,
    },
    {
      name: 'cart',
      url: 'https://www.thredup.com/cart',
      expectedHostname: 'www.thredup.com',
      waitMs: 8000,
      scrolls: 2,
      extraNagRe: EXTRA,
    },
  ],
});
