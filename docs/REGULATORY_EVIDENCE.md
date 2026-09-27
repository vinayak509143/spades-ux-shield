# Regulatory and policy evidence (Spades UX-Shield)

This project produces **reproducible, site-scoped cosmetic audits** of manipulative interface copy and chips. The evidence is suitable for:

- Consumer-protection agencies reviewing **dark patterns** or unfair commercial practices
- Market surveillance (pattern prevalence on named hosts, not individual shoppers)
- Academic or NGO reports (BEUC-style retailer reviews, FTC / OECD urgency–scarcity categories)
- Platform policy or app-store guideline discussions (documented UI deception types)

It is **not** personal data, behavioral profiling, or a substitute for legal findings. Spades does not assert illegality—only that listed UI elements match documented deceptive-design categories and were hidden or neutralized in the extension.

## Methodology (summary)

1. **Scope:** `www.{retailer}` only; no checkout, pay, or auth surfaces (see `CONTRIBUTING.md`).
2. **Observation:** Headed browser audit (Playwright or Chrome CDP on a maintainer profile), plus user-reported HTML snippets.
3. **Classification:** Each phrase → **Ship** (rule), **Relabel** (control text replaced), or **Not a pattern** (price, delivery, real settings).
4. **Enforcement:** Host-scoped `darklist.txt` rules; procedural `:has-text` with **whole-element text** anchors to avoid hiding price rows.
5. **Versioning:** `! Version: YYYYMMDDHHMM` in `lists/darklist.txt`; tests lock rule count and Temu regex samples.

Full narrative for Temu: [temu-audit.md](temu-audit.md). Machine-readable catalog: [data/temu-pattern-catalog-2026-09-26.json](data/temu-pattern-catalog-2026-09-26.json).

## Harm / pattern taxonomy (mapping)

Catalog entries use `deceptiveDesignCategory` aligned with common enforcement and research buckets:

| Category | Typical regulatory framing | Temu examples (2026-09-26) |
|----------|---------------------------|----------------------------|
| `false_scarcity` | Limited quantity claims; stock pressure | `ONLY N LEFT`, `ALMOST SOLD OUT`, `Almost out!` |
| `false_urgency` | Time pressure | `Last day`, `Ends in` + countdown digits |
| `social_proof_misleading` | Unverifiable demand signals | `Nk+sold`, `105sold` |
| `ranking_claim` | Implied market rank / bestseller | `#1 BEST-SELLING ITEM in …` |
| `cta_urgency_fusion` | Purchase control fused with scarcity text | `Add now! Almost out!`, `Buy now! Almost out!`, `BUY NOW! LAST 1!` |

**Relabel** actions document the **neutral CTA** left for the user (`Add to cart`, `Buy now`) when hiding would break the control.

## What to cite

- Repository + commit hash containing `lists/darklist.txt` version and `docs/data/*-pattern-catalog-*.json`
- Audit date and surfaces table in `docs/temu-audit.md`
- Optional: before/after screenshots (not stored in repo by default; see `FALSE_POSITIVE_MATRIX.md` PR evidence)

## Licensing and redistribution

Code: see repository `LICENSE`. Catalog JSON may be quoted and redistributed with attribution. Do not strip `ruleVersion` or `methodology` fields when republishing structured data.

## Contact / issues

Filter list issues: URL in `src/background/subscriptions.json` → `issues` field on the filters GitHub repo.
