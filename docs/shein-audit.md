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

Document as `us.shein.com` / `www.shein.com`. **No darklist rules** — PDP audit incomplete, not “clean.”
