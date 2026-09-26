# Zara full cosmetic audit (2026-09-26)

Headed Playwright: `node scripts/audit-zara.mjs`. Dump: `temp/zara-audit.json`.

US PLP `www.zara.com/us/en/man-tshirts-l855.html` → followed link (landed editorial page, short PDP body).

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| PLP | Rendered | **Rendered** — 0 pressure snippets |
| Follow | Editorial URL, `bodyLen` 1470 | **Weak PDP** — not a standard product card |

## Classified hits

| Text | Label |
|------|-------|
| (none) | — |

## Host

`www.zara.com` only. **No darklist rules** — re-run with direct `/product/` PDP URL.
