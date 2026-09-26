# Temu cosmetic audit (2026-09-26)

Logged-in Chrome (Google account Spades, profile Default) via `chrome://inspect/#remote-debugging`. Script: `node scripts/audit-temu.mjs`. Dump: `temp/temu-audit.json`.

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
| `3.5K+sold`, `6sold`, `30K+sold`, and similar | Present in feed `innerText`; not a stable class | **Ship** when the span's entire text is that phrase |
| Price, Add to cart, free-shipping banner, Price Match Guarantee | — | **Not a pattern** |

## Rule

`www.temu.com##span[class]:has-text(/^\s*(?:only\s+\d+\s+left|\d+(?:\.\d+)?[kK]?\+?\s*sold|limited stock)\s*$/i)`

The hash classes are not the hook. The regex must match the span's whole text so a card that also contains the price is left alone.

## Not in this pass

Product-page body did not hydrate, so cart countdown and PDP-only chips are unverified.
