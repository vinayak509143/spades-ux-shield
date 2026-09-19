# Per-selector false-positive matrix

Site-level smoke: [HOLDOUT_PROTOCOL.md](./HOLDOUT_PROTOCOL.md) (5 positive / 5 negative URLs).

**New vendor CSS** (`cosmetic-vendors.css`) or **new hostname rules** (filters repo / packaged extract) also need **per-selector** checks before merge.

## For each proposed selector

| Step | Requirement |
|------|-------------|
| **Hit** | One page where the widget should disappear (app demo or a store that loads that plugin). |
| **Must-not** | Checkout/cart, login/2FA, Wikipedia or GitHub article, storefront **without** that plugin (prefix must not clip unrelated UI). |
| **Iframes** | With `all_frames: true`, open CMP/consent/Shopify overlay frames; confirm `html[data-op]` in frame, parent scroll/click still work. |
| **PR evidence** | Before/after screenshots (top document + overlay iframe if any). No passwords, cards, or full DOM dumps. |

## Automatic guards (CI)

- `test/engine/vendor-css.test.ts` — vendor file denylist (no `.banner`, `.modal`, `role="dialog"`, `[class*="modal"]`, hashed `css-` classes).
- `test/engine/compiler-lint.test.ts` — invalid selectors dropped; valid neighbors kept.
- `npm run validate-pending` — quarantine lines must pass `parseList` + `isExtractableCosmeticLine` + denylist.

## Reject without merge

- `[class*="modal"]`, `.banner`, `div[role="dialog"]`, `[class*="css-"]` hash chasing.
- Any rule that fails a must-not page → **revert** (same as holdout negative fail).

Positive-only Playwright that never opens checkout is **not** enough.

## Shopify vendor seeds

Global prefixes live in `cosmetic-vendors.css`. Theme-native leftovers stay hostname-scoped in `lists/darklist.txt` (see mloshoes.com). Prove with `npm run prove-seeds` (live) and `npm run holdout-shopify` (local fixtures). Never harvest `/cart`, `/checkout`, or `/login`.

| App | Demo storefront | Expected prefix | Last prove-seeds |
|-----|-----------------|-----------------|------------------|
| Hurrify demo | https://demo-hurrier-countdown-timer.myshopify.com/products/gap-disney-mickey-mouse-graphic-tee | `hurrify-` absent; theme uses `.product-count` / `.delivery-time-info` | pass — `lists/darklist.txt` hostname rules; `node test/scripts/verify-hurrier-rules.mjs` |
| Hextom Free Shipping Bar | https://sigma-28.myshopify.com/ | `hextom-` | skip — prefix absent in headless |
| Sales Pop | https://sales-pop-demo.myshopify.com/ | `sales-pop-` | skip — prefix absent in headless |
| Qikify Salekit | https://qikify-salekit.myshopify.com/ | discover → `qsk-popup-` | pass (also `fomo-` hits); pending only, not merged |
| Smart Popup | https://smartpopupdemo.myshopify.com/ | discover | pass — no seed prefix |
| MLO Shoes | https://mloshoes.com/ | hostname in `lists/darklist.txt` | pass — vendor miss expected |
| Local vendor fixture | http://127.0.0.1:4173/vendor-widget.html | `hurrify-` / `hextom-` / `privy-` | pass — hidden |
| Local Dawn-like | http://127.0.0.1:4173/dawn-clean.html | must-not | pass — no vendor hit |
