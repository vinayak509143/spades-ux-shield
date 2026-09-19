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
