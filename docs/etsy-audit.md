# Etsy full cosmetic audit (2026-09-24)

Playwright search was blocked (empty body / challenge). A manual Chrome session then loaded search and a listing. The listing HTML was captured from that session.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| Playwright search | `www.etsy.com/search` | **Blocked** |
| Manual search | `personalized necklace` | **Rendered** — “Limited stock” on an ad card; no element captured |
| Manual listing | ForeverForLove oval diamond necklace | **Rendered** |

## Classified hits

| Text | Hook | Label |
|------|------|-------|
| `Only 2 left and in 20+ carts`, `Only 1 left and in 5 carts`, `In 20+ baskets` | `p` with `wt-sem-text-critical` plus any `wt-text-title-*` (`title-small`, `title-01`, …) | **Ship** one static rule: `p[class*="wt-text-title"].wt-sem-text-critical`. No word list. The late `:has-text` pass was removed for this host so a new size or the word “baskets” does not flash. |
| `Sale ends in 2:15:31` | `p.wt-sem-text-monetary-value[data-24-hour-sale-wrapper]` containing `span.listing-24-sale-countdown` | **Ship** `p[data-24-hour-sale-wrapper]` only. Do not select `wt-sem-text-monetary-value` — that class is also used for prices. |
| `Just 1 available and in 12 carts` | Cart `span.wt-text-body-small.wt-sem-text-critical` | **Ship** static. Not the listing title class. Price, delivery, Remove, and checkout sit outside the span. |
| `Bestseller`, `Etsy’s Pick`, `Star Seller`, `Ad` | Badges | **Not a pattern** |
| Struck-through original price | Price row | **Out of scope** |

## Must-not

Price, original price, Add to cart, and the material and size selects sit outside both shipped nodes.

## Host

`www.etsy.com` only. Rules are in `lists/darklist.txt` (`202609240215`).
