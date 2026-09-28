# Maintainers

| Role | Person | Scope |
|------|--------|--------|
| Lead maintainer | Vinayak Patankar ([@vinayak509143](https://github.com/vinayak509143)) | Engine, releases, list review, Chrome Web Store |

Spades UX-Shield is a **non-profit, volunteer-run** open source project (MIT engine, GPL-3.0-or-later darklist). There is no company behind it.

## Co-maintainers

We are looking for co-maintainers who can:

- Review PRs to [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters) (`lists/darklist.txt`) with holdout discipline
- Triage **Report Dark Pattern & Broken Page** issues within a few days
- Run `npm test` / `npm run validate-darklist` before merging engine changes

Open a discussion on either repo or email via GitHub profile if you want to help regularly.

## Decision process

- **List changes:** PR + green CI + at least one hit URL and one must-not URL in the description. Maintainer merges to filters `main`; bump `! Version:` every time.
- **Engine releases:** Tag matches `manifest.json`; zip attached to GitHub Releases; Chrome Web Store upload is a separate manual step.
- **Safety overrides:** Checkout, payment, login, and account cancellation stay frozen — see [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/HOLDOUT_PROTOCOL.md](docs/HOLDOUT_PROTOCOL.md). No exceptions without a documented holdout proof.

## Bus factor

If the lead maintainer is unavailable, the filters repo and engine repo remain forkable under their licenses. `dist/subscriptions.json` points at jsDelivr for the darklist; packaged rules in each store build are frozen until the next extension version.
