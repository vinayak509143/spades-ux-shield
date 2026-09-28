# Temu cosmetic audit (2026-09-26)

Logged-in Chrome (Google account Spades, profile Default) via `chrome://inspect/#remote-debugging`. Script: `node scripts/audit-temu.mjs`. Dump: `temp/temu-audit.json`.

**Structured export (committed):** [data/temu-pattern-catalog-2026-09-26.json](data/temu-pattern-catalog-2026-09-26.json) — pattern ids, regulatory categories, ship/keep, rule version. **Policy use:** [REGULATORY_EVIDENCE.md](REGULATORY_EVIDENCE.md).

Anonymous Playwright never got past login or the security check. The logged-in pass rendered home and search.

## Surfaces

| Surface | URL | Status |
|---------|-----|--------|
| Home | `www.temu.com/` | **Rendered** — scarcity and sold-count lines in the feed |
| Home PDP follow | product URL under `www.temu.com` | **Shell only** (`bodyLen` ~1461, title `Temu`) |
| Search | `search_result.html?search_key=socks` | **Rendered** after Google login |
| Search PDP follow | product URL | **Shell only** (`bodyLen` ~1512) |

## Classified hits

| Text | Node | Label |
|------|------|-------|
| `ONLY 5 LEFT`, `ONLY 7 LEFT`, `ONLY 4 LEFT` | `span._2h8Ne7BR` on home; own text is only the chip | **Ship** |
| `ONLY 9 LEFT`, `ONLY 7 LEFT` | `span._1FxJ41PO` on search; own text is only the chip | **Ship** — different hash than home |
| `Limited stock` | `span._1kXnRPCz` on an earlier logged-in home pass | **Ship** |
| `Add now! Almost out!` | `span[data-type="0"]` on the add-to-cart control (manual HTML) | **Ship** — replace the label with `Add to cart` before paint; do not hide the control. `Add now!` alone stays |
| `Buy now! Almost out!` | `span[data-type="0"]`, white 16px (manual HTML) | **Ship** — replace with `Buy now`; plain `Buy now!` alone stays |
| `BUY NOW! LAST 1!` | `span[data-type="0"]`, white 16px (manual HTML) | **Ship** — replace with `Buy now` |
| `Ends in` | white `span[class]` on a sneaker PDP flash timer (manual HTML) | **Ship** — hide the label; hide a sibling span whose whole text is only `HH:MM(:SS)` |
| `ALMOST SOLD OUT` | `span[data-type="0"]` with an empty or missing class; parent may be a hashed `div` whose text is only that phrase | **Ship** — hide `span[data-type="0"]` as well as `span[class]` / `div[class]` |
| `Last day` | orange `span` on a recommendation card; parent text is only that phrase | **Ship** |
| `#1 BEST-SELLING ITEM`, `#1 TOP RATED`, `#3 MOST REPURCHASED BRAND ITEM`, plus `in {category}` | orange `span[data-type="0"]` inside `div[class]` whose whole text is the badge. Seen on best-sellers and the socks PDP | **Ship** — the wrapper, so the category half does not remain |
| `Best-Selling Items` | nav label, plural | **Not a pattern** |
| `5 BUSINESS DAYS`, `Fastest delivery:` | PDP delivery line | **Not a pattern** |
| `56% OFF`, prices, star ratings | PDP and cards | **Not a pattern** |
| `Pay $2.16 today` | financing line | **Not a pattern** — payment copy |
| `Low stock items alerts` | settings row | **Not a pattern** |
| `3.5K+sold`, `6sold`, `30K+sold`, and similar | Present in feed `innerText`; not a stable class | **Ship** when the span's entire text is that phrase |
| Price, Add to cart, free-shipping banner, Price Match Guarantee | — | **Not a pattern** |

## Rule

`www.temu.com##span[class],div[class]:has-text(/^\s*(?:only\s+\d+\s+left|\d+(?:\.\d+)?[kK]?\+?\s*sold|limited stock|almost\s+sold\s+out!?|almost out!?|last day!?|ends\s+in!?|\d{1,2}:\d{2}(?::\d{2})?|#?\d*\s*(?:best-selling(?:\s+brand)?\s+item|top rated|most repurchased(?:\s+brand)?\s+item)(?:\s*in\s+.+)?)\s*$/i)`

`www.temu.com##span[data-type="0"]:has-text(/^\s*add now!\s*almost out!?\s*$/i):replace-text("Add to cart")`

`www.temu.com##span[data-type="0"]:has-text(/^\s*buy now!\s*almost out!?\s*$/i):replace-text("Buy now")`

`www.temu.com##span[data-type="0"]:has-text(/^\s*buy now!\s*last\s+\d+!?\s*$/i):replace-text("Buy now")`

The hash classes are not the hook. The regex must match the element's whole text so a card that also contains the price is left alone. The add-to-cart line is the button label, so that span is relabeled instead of hidden. Rank badges are hidden at the wrapper so the gray `in {category}` half does not stay behind.

## Verification (reload)

After rule or engine changes, **hard-reload** the Temu tab and watch for a one-frame flash of orange/white urgency copy (`ALMOST SOLD OUT`, fused buy labels, `Ends in`). If it flashes, the procedural engine must apply **hide** and **replace-text** on the mutation path and before the next paint (see `applyCriticalActions` in `dom-mutator.ts`), not only on `requestIdleCallback`.

## Not in this pass

The socks PDP the user had open did render. `ALMOST SOLD OUT`, `Last day`, and rank badges were on that page and on best-sellers. A cart countdown was not in that DOM.
