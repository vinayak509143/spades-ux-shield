# Travelocity audit (2026-09-22)

Headed Playwright: `node scripts/audit-travelocity.mjs`. Dump: `temp/travelocity-audit.json`.

Locale `en-US`, timezone `America/New_York`. Dates 2026-10-16 → 2026-10-17, 2 adults, 1 room.

## URLs

| Surface | Result |
|---------|--------|
| SERP | `www.travelocity.com` New York hotel search rendered |
| Property | Hotel St. James PDP — **Bot or Not?** (bodyLen 107) |

## Found (SERP)

| Text | Selector from the dump | Decision |
|------|------------------------|----------|
| `We have N left at this price` | `div.uitk-text.uitk-type-end` + negative theme | **Rule** on `www.travelocity.com` only |

## Must-not

- Nightly/total price testids on SERP
- Book / Sign in (verify)

## Host

`www.travelocity.com` only.
