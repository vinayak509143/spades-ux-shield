# Hotels.com audit (2026-09-22)

Headed Playwright: `node scripts/audit-hotels.mjs`. Dump: `temp/hotels-audit.json`.

Locale `en-US`, timezone `America/New_York`. Dates 2026-10-16 → 2026-10-17, 2 adults, 1 room. No sign-in, no Book click.

## URLs

| Surface | Result |
|---------|--------|
| SERP | `www.hotels.com` New York hotel search rendered (bodyLen ~37k) |
| Property | No `data-stid="open-hotel-information"` link found on this SERP layout — **PDP not captured** |

## Found (SERP)

| Text | Selector from the dump | Decision |
|------|------------------------|----------|
| `We have N left at this price` | `div.uitk-text.uitk-type-end` + `uitk-text-negative-theme`; own text is only the scarcity sentence | **Rule** — same UITK pattern as Expedia, host-scoped to `www.hotels.com` only |

Not on this load: “X people are looking”, PDP room scarcity.

## Must-not

- Listing prices (`The current price is…` in sample)
- Sign in / Book CTAs (not clicked)

## Host

`www.hotels.com` from the audit dump. `in.hotels.com` uses the same UITK scarcity chip for India storefronts (not re-audited; same selector).
