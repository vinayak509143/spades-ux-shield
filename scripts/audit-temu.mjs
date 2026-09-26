/**
 * Full cosmetic audit — Temu US web, using the logged-in Chrome profile
 * (Google account name "Spades", folder Default).
 *
 * Chrome must already be open. Enable remote debugging once:
 * chrome://inspect/#remote-debugging → turn on Remote debugging → Allow.
 *
 * Run: node scripts/audit-temu.mjs
 * Anonymous Playwright (no login): node scripts/audit-temu.mjs --no-chrome-profile
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { readDevToolsEndpoint, relaunchChromeNormal } from './lib/chrome-cdp.mjs';
import { runLiveAudit } from './lib/live-audit-dump.mjs';

mkdirSync('temp', { recursive: true });
const log = (message) => {
  appendFileSync('temp/temu-connect.log', `${new Date().toISOString()} ${message}\n`);
  console.log(message);
};

const useChromeProfile = !process.argv.includes('--no-chrome-profile');
const storageState = process.env.TEMU_STORAGE_STATE?.trim() || null;

let connectOverCDP = null;
if (useChromeProfile) {
  connectOverCDP = readDevToolsEndpoint();
  if (!connectOverCDP) {
    log('Restarting Chrome so the inspect toggle can open its approval port.');
    await relaunchChromeNormal();
    const deadline = Date.now() + 45000;
    while (!connectOverCDP && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      connectOverCDP = readDevToolsEndpoint();
    }
  }
  if (!connectOverCDP) {
    throw new Error(
      'Chrome remote debugging is off. In the Spades window open chrome://inspect/#remote-debugging, turn Remote debugging on, and click Allow.',
    );
  }
}

const pageStep = {
  expectedHostname: 'www.temu.com',
  waitFor: 'a[href*="-g-"], [data-tooltip]',
  waitMs: 12000,
  scrolls: 5,
  followLink: 'a[href*="-g-"]',
  followName: 'pdp',
  followWaitMs: 12000,
  followWaitFor: 'h1, [class*="price"], button',
  followMinBodyLen: 1200,
  followScrolls: 4,
};

log('Connecting. If Chrome asks to allow remote debugging, click Allow.');
await runLiveAudit({
  name: 'temu',
  outBasename: 'temu',
  expectedHostname: 'www.temu.com',
  contextOptions: !useChromeProfile && storageState ? { storageState } : null,
  connectOverCDP,
  pages: [
    { ...pageStep, name: 'home', url: 'https://www.temu.com/', followName: 'home-pdp' },
    {
      ...pageStep,
      name: 'search',
      url: 'https://www.temu.com/search_result.html?search_key=socks',
      followName: 'search-pdp',
    },
  ],
});
process.exit(0);
