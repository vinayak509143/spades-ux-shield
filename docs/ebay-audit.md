# eBay full cosmetic audit (2026-09-24)

Headed Playwright: `node scripts/audit-ebay.mjs`. Dump: `temp/ebay-audit.json`. Screenshot: `temp/ebay-serp.png`.

Locale `en-US`. Auction-focused SERP (`trading cards`, `LH_Auction=1`). `followPressure` enabled — no card matched `N watching` / `almost gone` / `in N carts`. No sign-in.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| SERP | `www.ebay.com` search rendered | **Rendered** — 0 pressure snippets |
| Listing | Not opened — no SERP card contained a pressure phrase | **N/A** |

## Classified hits

| Text | Label | Notes |
|------|-------|-------|
| (none) | — | Prior false positive (“Watching” in product title) eliminated by requiring `\d+ watching`. |

## Must-not

- Buy It Now, Sign in visible on SERP (`mustNot` in dump).

## Host

`www.ebay.com` only. **No darklist rules** — social-proof chips not seen on this load; site not certified clean.
