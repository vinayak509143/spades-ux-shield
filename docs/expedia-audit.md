# Expedia audit (2026-09-22)

Headed Playwright: `node scripts/audit-expedia.mjs`. Dump: `temp/expedia-audit.json`.

Locale `en-US`, timezone `America/New_York`. Dates 2026-10-16 → 2026-10-17, 2 adults, 1 room. No sign-in, no Reserve click.

## URLs

| Surface | Requested | Result |
|---------|-----------|--------|
| SERP | `Hotel-Search?destination=New+York&startDate=2026-10-16&endDate=2026-10-17&adults=2&rooms=1` | Rendered listings on `www.expedia.com` |
| Property | First `data-stid="open-hotel-information"` link | Hotel St. James PDP opened, then **blocked** — title `Bot or Not?`, bodyLen 107 |

## Found (SERP)

| Text | Where | Selector from the dump | Decision |
|------|--------|------------------------|----------|
| `We have N left at this price` | Listing cards | `div.uitk-text.uitk-type-end` with `uitk-text-negative-theme`. No `data-stid` on the text node. | **Rule** with `:has-text(/we have \d+ left at this price/i)` on the UITK text class (design-system utilities, not a one-off hash). |
| `For a limited time, save on select hotels…` | Top promo strip | Ancestor area includes `[data-stid="shopping-banner"]` in page `stids` list; snippet chain is generic `uitk-layout-flex`. | **Unhandled** for now — `shopping-banner` may carry non-urgency messages; narrow hide not proven from chain alone. |
| PDP urgency widgets | — | PDP bot-walled on this run | **No PDP rule** from this dump |

Not on SERP load: “X people are looking”, per-property booking toasts.

## Must-not (SERP)

- Nightly / total price: `[data-testid="nightly_price"]`, price slider container
- Reserve / Book: not clicked; any visible Book CTA must stay visible in verify

## Host

Rules use `www.expedia.com` only.
