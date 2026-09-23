# Airbnb full cosmetic audit (2026-09-24)

Headed Playwright: `node scripts/audit-airbnb.mjs`. Dump: `temp/airbnb-audit.json`. Screenshots: `temp/airbnb-serp.png`, `temp/airbnb-listing.png`.

**Requires US VPN** from India so the session stays on `www.airbnb.com` (not `airbnb.co.in`). Locale `en-US`, NYC geolocation, dates 2026-10-16 → 2026-10-17, 2 adults. No sign-in, no checkout.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| SERP | `www.airbnb.com` New York homes | **Rendered** (`bodyLen` ~8k) |
| Listing | First `/rooms/` from SERP (Truss Hotel Times Square sample) | **Rendered** (`bodyLen` ~7k) after extended wait (`followWaitMs` 14s, `followMinBodyLen` 2000) |

## Classified hits

| Text | Label | Notes |
|------|-------|-------|
| (none) | — | Tightened harvest: `people are viewing`, `viewing now`, `only N left`, `in high demand`, `rare find`. No matches on SERP or listing in this load. |

## Must-not

- Reserve / price on listing (page rendered; no rule shipped).

## Host

`www.airbnb.com` only. **No darklist rules** — per-listing viewer/scarcity not present on this load; **not** “clean” (other dates/listings may show pressure copy).
