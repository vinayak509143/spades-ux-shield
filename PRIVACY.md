# Privacy policy — Spades UX-Shield

**Effective:** 18 September 2026  
**Product:** Spades UX-Shield browser extension  
**Contact:** GitHub issues on [vinayak509143/spades-ux-shield](https://github.com/vinayak509143/spades-ux-shield/issues)

This policy is what you should paste into the Chrome Web Store “Privacy policy” URL field (this file on GitHub):

https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md

## Summary

Spades UX-Shield does **not** collect, sell, or transmit browsing history, page content, or personal data to the developer. There is no account, no analytics SDK, and no crash reporter.

## What stays on your device

- Filter lists and compiled CSS shards in `chrome.storage.local`
- Per-tab / per-domain on/off flags
- Cosmetic CSS and a small procedural engine running in the page’s isolated world

The developer cannot see which sites you visit.

## What leaves your device (only if you choose, or for list updates)

### Optional breakage report

If you click **Report broken page** in the popup, Chrome opens a GitHub issue form. The extension fills:

- Registrable domain (e.g. `amazon.in`)
- An anonymized path template (IDs/tokens stripped)
- Extension version
- Rule IDs that hit on that tab (if any)

It does **not** attach cookies, HTML, screenshots, or query strings. Submitting the issue is a GitHub action you control.

### Filter list refresh

The service worker may fetch public filter text from GitHub / jsDelivr (see `dist/subscriptions.json`). Those hosts see a normal HTTPS download (IP, User-Agent). We do not send a browsing log with that request.

Packaged cosmetics are also compiled into the extension at build time.

## Permissions (why they exist)

| Permission | Use |
|------------|-----|
| `storage` / `unlimitedStorage` | Store compiled lists and settings on device |
| `scripting` | Inject host-specific cosmetic CSS after navigation |
| `webNavigation` | Know when a document commits so CSS can be applied |
| `alarms` | Periodic list sync |
| `tabs` | Popup “this tab” toggle and the optional GitHub report URL |
| `<all_urls>` | Cosmetic hide on sites that match hostname-scoped rules. The engine does not read page content for analytics. |

`document_start` content scripts stamp a host marker and apply a small boot stylesheet so listed cosmetic hides can run before first paint. The MAIN-world script only sets `data-op` attributes; procedural mutations run in the isolated world.

## What we do not do

- No advertising ID, no fingerprinting for ads
- No remote code besides the listed public filter URLs and Chrome APIs
- No “improve the product” telemetry
- Checkout, payment, and login surfaces are **out of scope** for rules (see CONTRIBUTING.md)

## Third-party lists

Imported Fanboy/EasyList and AdGuard cosmetics are licensed separately (GPL-3 / CC BY-SA 3.0). See [ATTRIBUTION.md](ATTRIBUTION.md). Those maintainers’ privacy policies apply to **their** websites, not to data from this extension (we do not send them your browsing).

## Changes

Material changes will be committed to this file with a new effective date.

## Children

The extension is not directed at children and does not knowingly collect data from children.
