/**
 * Full cosmetic audit — Myntra India (www only)
 * Run: node scripts/audit-myntra.mjs
 */
import { runLiveAudit } from './lib/live-audit-dump.mjs';

await runLiveAudit({
  name: 'myntra',
  outBasename: 'myntra',
  expectedHostname: 'www.myntra.com',
  contextOptions: {
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    geolocation: { latitude: 28.6139, longitude: 77.209 },
  },
  pages: [
    {
      name: 'serp',
      url: 'https://www.myntra.com/earphones',
      expectedHostname: 'www.myntra.com',
      waitFor: 'li.product-base, a[href*="/buy"]',
      waitMs: 10000,
      scrolls: 6,
      followPressure: true,
      followName: 'pdp',
      followLink: 'a[href*="/buy"]',
      followWaitMs: 12000,
      followWaitFor: 'h1, .pdp-price, button',
      followMinBodyLen: 1500,
      followScrolls: 4,
    },
  ],
});
