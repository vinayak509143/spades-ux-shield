# Temu full cosmetic audit (2026-09-26)

Headed Playwright: `node scripts/audit-temu.mjs`. Dump: `temp/temu-audit.json`.

US geo (`en-US`). Home redirected to **login** before PDP.

## Surfaces

| Surface | Result | Status |
|---------|--------|--------|
| Home | `www.temu.com` → `/login.html` | **Blocked** for audit (`bodyLen` 1953, no catalog) |

## Classified hits

| Text | Label | Notes |
|------|-------|-------|
| (none) | — | No product surface rendered |

## Host

`www.temu.com` only. **No darklist rules** — automation cannot reach PDP without sign-in; not certified clean.
