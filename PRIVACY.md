# Privacy policy — Spades UX-Shield

Effective: 18 September 2026  
Product: Spades UX-Shield browser extension  
Contact: GitHub issues on [vinayak509143/spades-ux-shield](https://github.com/vinayak509143/spades-ux-shield/issues)

Paste this URL into the Chrome Web Store privacy policy field:

https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md

## Summary

I don't collect, sell, or send your browsing history, page content, or personal data anywhere. There is no account, no analytics SDK, and no crash reporter.

## What stays on your device

- Filter lists and compiled CSS shards in `chrome.storage.local`
- Per-tab and per-domain on/off flags in `chrome.storage.session`
- Cosmetic CSS and a small procedural engine in the page's isolated world

I cannot see which sites you visit.

## What leaves your device (only if you choose, or for list updates)

### Optional breakage report

If you click Report broken page in the popup, Chrome opens a GitHub issue form. The extension fills:

- Registrable domain (e.g. `amazon.in`)
- An anonymized path template (IDs and tokens stripped)
- Extension version
- Rule IDs that hit on that tab (if any)

It does not attach cookies, HTML, screenshots, or query strings. Submitting the issue is up to you.

### Filter list refresh

The service worker may fetch public filter text from GitHub or jsDelivr (see `dist/subscriptions.json`). Those hosts see a normal HTTPS download (IP, User-Agent). I do not send a browsing log with that request.

Packaged cosmetics are also compiled into the extension at build time.

## Permissions (why they exist)

| Permission | Use |
|------------|-----|
| `storage` / `unlimitedStorage` | Store compiled lists and settings on device |
| `scripting` | Inject host-specific cosmetic CSS after navigation |
| `webNavigation` | Know when a document commits so CSS can be applied |
| `alarms` | Periodic list sync (about every 12 hours) |
| `<all_urls>` | Apply cosmetic CSS on any site that has a matching rule |

`document_start` content scripts stamp a host marker and apply a small boot stylesheet so listed cosmetic hides can run before first paint. The MAIN-world script only sets `data-op` attributes; procedural mutations run in the isolated world.

Requires Chrome 111 or newer (`minimum_chrome_version` in the manifest).

## What I do not do

- No remote code besides the listed public filter URLs and Chrome APIs
- No product telemetry
- Checkout, payment, and login surfaces are out of scope for rules (see [CONTRIBUTING.md](CONTRIBUTING.md))

## Third-party lists

Imported Fanboy/EasyList and AdGuard cosmetics are licensed separately (GPL-3 / CC BY-SA 3.0). See [ATTRIBUTION.md](ATTRIBUTION.md). Those maintainers' privacy policies apply to their websites, not to data from this extension.

## Changes

Material changes will be committed to this file with a new effective date.

## Children

The extension is not directed at children and does not knowingly collect data from children.
