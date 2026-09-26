# AliExpress full cosmetic audit (2026-09-26)

Headed Playwright: `node scripts/audit-aliexpress.mjs`. Dump: `temp/aliexpress-audit.json`.

US geo. Home + PDP (`/item/`) both **rendered**.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| Home | `www.aliexpress.com` | **Rendered** — many `N sold` snippets |
| PDP | `/item/` from home link | **Rendered** — `N sold` on cards and PDP |

## Classified hits

| Text | Hook | Label |
|------|------|-------|
| `66 sold`, `200 sold`, … | SERP: hashed `span.DUuR2` | **Unhandled** — CSS-module hash, not shippable |
| `N sold` on PDP | `span.reviewer--sold--*` (e.g. `reviewer--sold--ytPeoEy`) | **Ship candidate** — hide chip only; verify price/ATC outside |
| Countdown / only left | — | Not seen on this load |

## Must-not

Confirm Add to cart / Buy on PDP stays outside `span[class*="reviewer--sold"]` before merge.

## Host

`www.aliexpress.com` only. **No darklist rules yet** — SERP hook unstable; PDP hook needs manual confirm.
