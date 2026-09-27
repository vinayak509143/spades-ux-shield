# Audit evidence data

Committed artifacts here support **future rule work**, **research**, and **regulatory or policy submissions**. They are not a user-tracking product.

## What we store

| Artifact | Format | Use |
|----------|--------|-----|
| Pattern catalogs | `*-pattern-catalog-*.json` | Machine-readable findings: pattern id, category, example copy, DOM hints, ship/keep, rule linkage |
| Narrative audits | `../*-audit.md` | Human-readable surfaces, classification table, rule text |
| Matrix | `../FALSE_POSITIVE_MATRIX.md` | Ship vs holdout per host |
| Filter list | `../../lists/darklist.txt` | Enforced rules (`! Version` stamp) |

## What we do **not** commit

- Session cookies, `_x_sessn_id`, account identifiers, or full logged-in DOM dumps
- Raw `temp/*.json` from CDP runs (gitignored) — regenerate with `scripts/audit-temu.mjs` / `scripts/audit-temu-chips.mjs`
- Passwords, payment instruments, or checkout fields

Sanitize URLs to **path only** (no query strings) in catalogs unless a stable path is required for reproduction.

## Regenerating Temu raw inventory (local)

```text
node scripts/audit-temu-chips.mjs   → temp/temu-chips.json
node scripts/audit-temu.mjs         → temp/temu-audit.json
```

Merge new phrases into the catalog JSON and `docs/temu-audit.md`, then bump `lists/darklist.txt` `! Version`.

## Third-party use

See [REGULATORY_EVIDENCE.md](../REGULATORY_EVIDENCE.md) for methodology, harm framing, and how agencies or researchers can cite this repo without implying endorsement.
