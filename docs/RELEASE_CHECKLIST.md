# Chrome Web Store release checklist

Use before uploading a new package. Consumer extension only — no compliance/B2B artifacts in the zip.

## Build and tests

```bash
npm ci
npm run validate-darklist
npm test
npm run build
npm run package   # build + zip + verify:zip (version must match manifest.json)
```

Optional live smoke (headed Chrome; MV3 may not load under headless):

```bash
npm run verify:amazon
npm run verify:flipkart
```

## List sync (filters repo)

1. Bump `! Version:` in [lists/darklist.txt](../lists/darklist.txt).
2. Match `packagedRev` in [src/background/subscriptions.json](../src/background/subscriptions.json).
3. Push [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters) `lists/darklist.txt` before or with the engine release.

## Store listing

- **Privacy policy URL:** [PRIVACY.md](https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md) (same text as repo root).
- **Single purpose:** Hide listed deceptive / interruptive UI with cosmetic CSS (not ads, not network blocking).
- **Permissions:** Explain `storage`, `scripting`, `webNavigation`, `alarms`, `<all_urls>` per [PRIVACY.md](../PRIVACY.md).

## Zip contents

`npm run zip` includes `dist/` (service worker, popup, subscriptions), `boot.js`, `host-mark.js`, `host-mark-main.js`, cosmetic CSS, icons — **not** `temp/`, test profiles, or intel outputs.

## Firefox local package

`npm run package:firefox` writes `dist-firefox/` and `spades-ux-shield-firefox-v1.0.9.zip`. It does not change `manifest.json` or the Chrome zip. Load steps: [FIREFOX.md](./FIREFOX.md). The public listing is [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/), version 1.0.8.

## Post-release

- Tag engine repo release and attach the zip.
- Confirm holdout notes in [HOLDOUT_PROTOCOL.md](./HOLDOUT_PROTOCOL.md) for any new hostname rules.

## Chrome Web Store (same listing)

While an older build is **In review**, do **not** cancel that submission. Ship engineering on `main`; upload the next zip only after the in-flight version shows **Published**.

1. Wait until dashboard shows **1.0.4 Published** (or whatever is currently in review).
2. Same store item → upload `spades-ux-shield-v1.0.9.zip` (Temu checkout stays visible; Flipkart hashed selector and MLO price hides removed). Firefox 1.0.8 is already published. Do not upload the 1.0.9 zip to Mozilla as version 1.0.8. A later Firefox update needs a higher version number.
3. `npm run package` / `npm run verify:zip` before upload; list `packagedRev` must match filters repo `darklist.txt` `! Version:`.
