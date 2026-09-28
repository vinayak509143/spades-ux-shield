# Growing the project (maintainers & outreach)

Spades UX-Shield is built like a **filter list + engine**, not a bespoke scraper per site. The goal is for the community to add hostname-scoped rules while the engine stays checkout-safe and telemetry-free.

## Before you promote the repos

Fix the public “front door” so strangers do not bounce:

1. **Install instructions** match reality — Chrome Web Store + current GitHub Release zip ([README](../README.md)).
2. **GitHub Releases** tag matches `manifest.json` and includes the zip.
3. **Issue tracker** — close test/spam issues; leave real `[rule]` / `[dark pattern / broken page]` items open.
4. **`good first issue` labels** on concrete sites (URL + phrase to hide + must-not checkout/login).
5. Read [RULE_SHIPPING.md](./RULE_SHIPPING.md) and link it from filters [CONTRIBUTING](https://github.com/vinayak509143/spades-ux-shield-filters/blob/main/CONTRIBUTING.md) so contributors know what ships when.

## Where to reach the right people

| Channel | Why |
|---------|-----|
| [FilterLists.com](https://filterlists.com/) | List authors and uBO-adjacent contributors already write `host##` rules. |
| Show HN | One post: deterministic lists, no AI, no telemetry, checkout freeze — stay in thread to answer false-positive questions. |
| [deceptive.design](https://www.deceptive.design/) | Ask to be listed as a consumer tool; cite [REGULATORY_EVIDENCE.md](./REGULATORY_EVIDENCE.md). |
| Privacy / FOSS communities (Fediverse, Bluesky, r/privacy, r/opensource) | Short post + before/after screenshot. |
| Academic dark-pattern researchers | Offer [data/temu-pattern-catalog-2026-09-26.json](./data/temu-pattern-catalog-2026-09-26.json) as structured evidence, not just the extension. |

## Message that works

Lead with **refusal**: no checkout/payment/login tampering, no browsing log, no AI guessing. Then: “Add a line to `darklist.txt`” or “Report Dark Pattern & Broken Page” in the popup.

Ask for **rules and breakage reports**, not stars alone.

## Response time

For the first months, replying to filters issues within **~1 business day** matters more than new features. Filter-list projects live on trust.

## Funding (optional, non-profit)

[Ko-fi](https://ko-fi.com/spadesxx) covers incidentals. For grants (NLnet, STF, MOSS), point reviewers at MIT/GPL split, PRIVACY.md, and this doc. A fiscal host (e.g. Open Collective) helps if you seek institutional donors.

## Site backlog (good first rules)

Maintainers can turn these into labeled issues — audits live under `docs/*-audit.md`:

- Travel / marketplaces already partially covered: Amazon retail, Booking, Agoda, Temu, Shein, Etsy, Flipkart, GetYourGuide, ThredUp
- Documented but thinner coverage: AliExpress, eBay, Myntra, fashion retailers — see audit notes in repo

Each issue should name: hostname, example phrase, proof URL, and one must-not URL (checkout or price row).
