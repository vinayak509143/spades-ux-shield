# Chrome Web Store listing (paste into the dashboard)

Privacy policy URL:

`https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md`

Homepage:

`https://github.com/vinayak509143/spades-ux-shield`

## Short description (keep under 132 characters)

Cosmetic dark-pattern shield: cookie walls, newsletter overlays, and ATF promo tiles. No ads, no telemetry, no network blocking.

## Detailed description

Spades UX-Shield is a Manifest V3 extension that hides interruptive cosmetic UI using hostname-scoped CSS (cookie banners, newsletter modals, sticky players, Amazon.in homepage ATF / Gateway Window promo tiles).

It is not an ad blocker and does not intercept network requests. It does not use AI. Rules are deterministic filter lists (community list + EasyList/AdGuard cosmetic extracts — see ATTRIBUTION.md).

Checkout, payment, and login pages are frozen: we do not ship rules that uncheck or hide those surfaces.

Install from source via GitHub Releases if you prefer Load unpacked. Support: https://ko-fi.com/spadesxx

## Single purpose

Hide manipulative or interruptive cosmetic UI on the web using static CSS and a small optional procedural engine. No other purpose.

## Permission justifications (dashboard)

- storage / unlimitedStorage: compiled filter lists and on/off flags, on device only
- scripting: inject per-host cosmetic CSS
- webNavigation: apply CSS when a document commits
- alarms: refresh community filter list
- tabs: popup tab toggle and optional user-initiated GitHub breakage report
- Host permission all sites: cosmetic selectors are hostname-scoped; the list covers many sites so the extension matches broadly, then CSS gates on html[data-op-h]

## Screenshots you must take (cannot be generated here)

1. Amazon.in homepage with the first GWM / ATF promo tile hidden
2. Extension popup (Active on this tab / domain + Report broken page)

Upload from `store/`: icon-128.png, marquee-1400x560.png, promo-1280x800.png, promo-small-440x280.png
