# Security policy

## Supported versions

Security fixes are applied to the latest release on the `main` branch and to the versions currently published on the [Chrome Web Store](https://chromewebstore.google.com/detail/spades-ux-shield/dmchnhnkofleiokmffmkigfnoeodpemf) and [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/) when they differ.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Report privately by one of:

1. [GitHub private vulnerability reporting](https://github.com/vinayak509143/spades-ux-shield/security/advisories/new) on this repository (preferred).
2. Email **nymphs.club@gmail.com** (Chrome Web Store contact) with subject `Spades UX-Shield security`.

Include steps to reproduce, affected version, and impact (extension code, filter compilation, or packaged list content).

## Scope

- Manifest V3 extension code in this repository (`src/`, bundled scripts, release ZIP layout).
- How filter lists are parsed, compiled, and injected (including malicious selector syntax).
- Out of scope: individual site dark patterns, third-party filter upstream content (report to those projects), and breakage that is fixed by editing rules in [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters).

## Response

Acknowledgement within **7 days**. A fix or written assessment within **30 days** for confirmed issues, when feasible.
