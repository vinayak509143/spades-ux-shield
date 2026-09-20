# Flipkart audit (2026-09-20)

Live probes: `node scripts/audit-flipkart.mjs`, `node scripts/audit-flipkart-pdp-probe.mjs`.

## Host scope

Use **`www.flipkart.com` only** — `flipkart.com` in `data-op-h` would suffix-match `seller.flipkart.com`.

## Hide (from DOM)

| Surface | Selector | Notes |
|---------|----------|--------|
| Search / listing scarcity chips | `div.HZ0E6r.Rm9_cy` + `:has-text(/^Only (few\|\d+ left)/i)` | Same class also shows “Bank Offer”, “Lowest price since launch” — **must** text-filter. |

## Must-not (verified on probe PDP)

- `Add to cart` / `Buy now` div CTAs (e.g. `div.grid-formation.grid-column-2`).
- Price row, seller line.
- `/viewcart` — no checkout CTA clipping (empty cart OK).

## Not found / skipped

- No stable non-header app-install banner in headless home load.
- PDP probe: no separate “people ordered” / flash-sale widget on sampled in-stock earphones PDP.
- Cart/checkout: no CSS rules (frozen per CONTRIBUTING).
