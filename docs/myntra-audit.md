# Myntra full cosmetic audit (2026-09-26)

Headed Playwright: `node scripts/audit-myntra.mjs`. Dump: `temp/myntra-audit.json`.

India geo (`en-IN`). SERP `www.myntra.com/earphones` → PDP via product link.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| SERP | Rendered | **Rendered** — 0 pressure snippets |
| PDP | In-stock listing | **Rendered** — 0 pressure snippets |

## Classified hits

| Text | Label | Notes |
|------|-------|-------|
| (none) | — | No Flipkart-style “Only N left” chips on this load |

## Host

`www.myntra.com` only. **No darklist rules** — not clean; scarcity may appear on other queries/PDPs.
