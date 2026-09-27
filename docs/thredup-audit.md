# ThredUp — predictive popularity badge (PDP)

Audited 2026-09-28, English UI, desktop 1360×900, US storefront.

## Implemented scope

One procedural rule on `www.thredup.com` in `lists/darklist.txt`:

- `div.body-copy-sm` that contains a direct child `img[alt="Flame"]` and whose text matches **This item is popular! … likely to sell soon.**
- Scoped to `/product/` paths only.
- Rejects nodes that contain buttons, links, inputs, selects, textareas, or button-role descendants.

This is a predictive scarcity message (same family as GetYourGuide “Likely to sell out”), not proof of inventory. **Keep visible:** sale prices and estimated retail strikethrough, condition copy, **Add to cart**, size/brand links, shipping & returns, eco impact, site promo strips (FIRST50), login/cart chrome.

## Surfaces checked

| Surface | URL | Pressure UI | Rule |
|--------|-----|-------------|------|
| Home | https://www.thredup.com/ | No flame badge; marketing hero only | Path does not match |
| Dresses PLP | https://www.thredup.com/women/dresses?department_tags=women&category_tags=dresses | No flame copy on grid in live pass | Path does not match |
| PDP (example) | https://www.thredup.com/product/women-polyester-lc-lauren-conrad-gold-cocktail-dress/236258639 | Flame row present | **Hide badge row** |
| Empty cart | https://www.thredup.com/cart | No urgency widgets | Path does not match |
| Checkout | — | Not opened (no purchase) | — |

### Not observed live (2026-09-28)

Princeton CSV (2019) listed ThredUp **activity** lines such as “994 items sold this hour” and “Sara from Philadelphia just saved $68”. Those did **not** appear on home, PLP, PDP, or empty cart in this pass (likely stale widget or session-gated). No rule added without a live hook.

### Playwright note

`node scripts/audit-thredup.mjs` via stock Playwright gets a **short body (~263 chars)** — bot/challenge shell. Use logged-in Chrome + CDP (see `scripts/audit-temu.mjs`) or manual browser audit for repeats.

## DOM hook (live)

```html
<div class="u:flex body-copy-sm u:mt-1x">
  <img alt="Flame" class="u:mr-1xs" height="16" width="16" src="/tup-assets/pwa/production/assets/flame-….svg">
  <span>This item is popular! <!-- -->It's likely to sell soon.</span>
</div>
```

Stable selectors: `img[alt="Flame"]`, class token `body-copy-sm`, full-text regex on the row.

## Checks

`npm.cmd test -- test/content/thredup-rules.test.ts`

`npm.cmd run validate-darklist`

`node scripts/audit-thredup.mjs` (expect block unless CDP Chrome)
