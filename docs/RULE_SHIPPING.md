# How list changes reach installed users

Contributors need this split — otherwise PRs look “merged” but nothing changes on someone’s laptop.

## Two delivery paths

| Rule kind | Example | Reaches store installs | Reaches via list sync (~12 h) |
|-----------|---------|------------------------|--------------------------------|
| **Static hide** | `host##.badge` (no `:has-text`) | After next **Chrome Web Store** release that bundles the list | Yes — service worker `insertCSS` from synced shards |
| **Procedural** | `:has-text`, `:replace-text`, `:uncheck`, path-scoped procedural | Only after next **store release** (`boot.js` / packaged rules) | **No** — content script uses `revivePackagedRules()` at build time, not storage shards |

Site-specific Temu, Agoda, and Booking fixes in the darklist are mostly procedural. They ship in the **extension zip**, not from jsDelivr alone.

## Maintainer release pairing

1. Merge PR on **spades-ux-shield-filters** (`! Version:` bumped).
2. Copy `lists/darklist.txt` into the engine repo (or merge submodule policy you use) and match `packagedRev` in `src/background/subscriptions.json`.
3. Bump `manifest.json` version (Chrome rejects re-upload of the same version).
4. `npm run package` → upload zip → submit for review.

## Roadmap (help wanted)

Applying **synced procedural rules** in the content script would let `:has-text` updates land without a store review after one engine release. Tracked as a future engine change — not implemented yet.

## Contributor takeaway

- **Easiest win for community:** static CSS lines that CI accepts and that sync can inject.
- **Still valuable:** procedural rules in the darklist — they require a maintainer store release to reach most users until the roadmap item above ships.
