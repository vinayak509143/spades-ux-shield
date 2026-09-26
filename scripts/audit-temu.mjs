/**
 * Full cosmetic audit — Temu US web
 * Run: node scripts/audit-temu.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'temu',
  outBasename: 'temu',
  expectedHostname: 'www.temu.com',
  pages: [
    {
      name: 'home',
      url: 'https://www.temu.com/',
      expectedHostname: 'www.temu.com',
      waitFor: 'a[href*="-g-"], [data-tooltip]',
      waitMs: 10000,
      scrolls: 5,
      followLink: 'a[href*="-g-"]',
      followName: 'pdp',
      followWaitMs: 12000,
      followWaitFor: 'h1, [class*="price"], button',
      followMinBodyLen: 1200,
      followScrolls: 4,
    },
  ],
});
