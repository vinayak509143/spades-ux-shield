# ASOS full cosmetic audit (2026-09-26)

Headed Playwright: `node scripts/audit-asos.mjs`. Dump: `temp/asos-audit.json`.

US: direct PDP URL + search `q=sneakers` → PDP.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| Direct PDP | `prd/202969812` | **Blocked** — `short_body` 552 |
| Search SERP | Rendered | **Rendered** — 0 pressure snippets |
| Search → PDP | `prd/206991973` | **Rendered** — 0 pressure snippets |

## Classified hits

| Text | Label |
|------|-------|
| (none) | — |

## Host

`www.asos.com` only. **No darklist rules** — BEUC-named retailer; pressure not seen on this load.
