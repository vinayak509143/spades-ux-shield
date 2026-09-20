# Chrome Web Store listing (paste into the dashboard)

**Upload zip:** `spades-ux-shield-v1.0.6.zip` from [GitHub Releases](https://github.com/vinayak509143/spades-ux-shield/releases/latest) (run `npm run package` to rebuild).

Privacy policy URL:

`https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md`

Homepage:

`https://github.com/vinayak509143/spades-ux-shield`

## Short description (keep under 132 characters)

Hide cookie walls, fake urgency, and promo nags with cosmetic CSS. No ads blocked, no telemetry, checkout-safe.

## Detailed description

Spades UX-Shield is a Manifest V3 extension that hides interruptive cosmetic UI using hostname-scoped CSS: cookie banners, newsletter modals, sticky players, Shopify urgency-app widgets, and selected Amazon retail manipulations (social-proof nags and deal-timer badges on 23 storefronts; India homepage promo tiles).

It is not an ad blocker and does not intercept network requests. It does not use AI. Rules are deterministic filter lists ([Spades Darklist](https://github.com/vinayak509143/spades-ux-shield-filters) + EasyList/AdGuard cosmetic extracts — see ATTRIBUTION.md in the package).

Checkout, payment, and login pages are frozen: we do not ship rules that uncheck or hide those surfaces.

Pause per tab or per domain from the popup. Optional “Report broken page” opens a GitHub issue (domain + path template only — no DOM upload).

Support: https://ko-fi.com/spadesxx

## Single purpose

Hide manipulative or interruptive cosmetic UI on the web using static CSS and a small optional procedural engine. No other purpose.

## Permission justifications (dashboard)

- **storage / unlimitedStorage:** compiled filter lists and on/off flags, on device only
- **scripting:** inject per-host cosmetic CSS after navigation
- **webNavigation:** apply CSS when a document commits
- **alarms:** refresh community filter list (about every 12 hours) from public GitHub/jsDelivr URLs
- **Host permission (&lt;all_urls&gt;):** cosmetic rules are hostname-scoped; the list covers many sites so the extension matches broadly, then CSS gates on `html[data-op]` / host markers
- **minimum_chrome_version 111:** MAIN-world host marker and modern CSS selectors (`:has`)

## Screenshots (take before submit)

1. Amazon.in or amazon.com PDP — social-proof / deal badge hidden; Add to cart still visible
2. Extension popup (Active on this tab / domain + Report broken page)

## Promotional images (repo)

Upload from `store/`: `icon-128.png`, `marquee-1400x560.png`, `promo-1280x800.png`, `promo-small-440x280.png`
