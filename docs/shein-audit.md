# Shein full cosmetic audit (2026-09-24)

Headed Playwright: `node scripts/audit-shein.mjs`. Dump: `temp/shein-audit.json`. Screenshots: `temp/shein-*.png`.

Storefront: **`us.shein.com`** (`www.shein.com` did not load in prior pass). No sign-in.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| Home | `us.shein.com/` | **Rendered** — no PDP countdown / “only N left” in dump |
| PDP search | `pdsearch/T-shirt` → risk limit URL | **Blocked** (`short_body`, risk wall) |

## Classified hits

| Text | Label | Notes |
|------|-------|-------|
| (none on home) | — | Home “Flash Sale” belt no longer matches loose `flash sale` regex |
| PDP | **Blocked** | Cannot classify product scarcity behind risk challenge |

## Must-not

- Sign in on home.

## Host

Document as `us.shein.com` / `www.shein.com`.

## Manual capture (cart + All Sale)

Playwright PDP stayed on the risk wall. A normal window showed the chips:

| Text | Node | Label |
|------|------|-------|
| `9k+ user add to cart` | `span.label-text` | **Ship** — social proof |
| `900+ sold`, `200+ sold`, `100+ sold` | `span.label-text` | **Ship** — same class, sales count |
| Price, `-28%`, `Save $N` | with the price | **Not a pattern** |
| `Buy $23.57 more to enjoy Free Standard Shipping!` | cart threshold | **Not a pattern** |
| `500 SHEIN points if Late` | late-delivery points | **Not a pattern** |
| QuickShip, Local, `#6 Bestseller` | badges | **Not a pattern** |

`span.label-text` is not hidden by itself. The 12×12 icon (`alt` is the same phrase) is part of the chip and is hidden at first paint, with the `label-text` next to it. A `:has-text` backstop remains for a chip that has no icon.
