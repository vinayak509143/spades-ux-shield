# How list changes reach installed users

Contributors need this split — otherwise PRs look “merged” but nothing changes on someone’s laptop.

## Two delivery paths

| Rule kind | Example | Reaches store installs | Reaches via list sync (~12 h) |
|-----------|---------|------------------------|--------------------------------|
| **Static hide** | `host##.badge` (no `:has-text`) | After next **Chrome Web Store** release that bundles the list, and on the ~12 h sync | Yes — service worker `insertCSS` from synced shards |
| **Procedural** | `:has-text`, `:replace-text`, `:uncheck`, path-scoped procedural | Packaged copy at install. From **1.0.8** onward, a newer synced `! Version:` replaces the packaged darklist rules on the ~12 h sync | Yes, on 1.0.8 and later |

Users still on a store build older than 1.0.8 keep running the procedural rules that were packaged with that build.

Site-specific Temu, Agoda, and Booking fixes are mostly procedural. After 1.0.8 they follow the filters repo without another store upload, as long as `! Version:` is bumped.

## Maintainer release pairing

1. Merge PR on **spades-ux-shield-filters** (`! Version:` bumped). That bump is what makes installed 1.0.8+ copies prefer the synced rules over the packaged copy.
2. Copy `lists/darklist.txt` into the engine repo and match `packagedRev` in [src/background/subscriptions.json](../src/background/subscriptions.json) when you ship an engine release, so a fresh install matches the list.
3. Bump `manifest.json` only for engine changes (Chrome rejects re-upload of the same version).
4. `npm run package` → upload zip → submit for review.

A synced list older than `packagedRev` is ignored, so a stale cache cannot undo a newer store build.

## Not in this release

Removing a `:replace-text` rule mid-session does not restore the original button label. The label stays until the next page load. The extension does not keep the original string.
