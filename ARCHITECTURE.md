# Spades UX-Shield architecture

Cosmetic + procedural hide only. No `declarativeNetRequest`, no HTML-stream filtering, no ML/NLP, no unscoped DOM heuristics in the shipped extension.

Default lists are hostname-scoped. Vendor CSS uses stable app prefixes, not generic `.banner` / `[class*="modal"]`.

`<2ms` budget applies to synchronous content-script work on the `document_start` turn. First-paint flicker is solved by **packaged CSS on the content script**, not by waiting for the service worker.

## What actually hides ATF (not the service worker)

MV3 workers sleep. `webNavigation.onCommitted` + `chrome.scripting.insertCSS` is the **late** path (synced / extra host CSS). Amazon GWM and other ATF nags must not depend on it. `insertCSS` targets `documentId` when present so a reused iframe `frameId` cannot style the wrong document.

Three content scripts (`manifest.json`, all `document_start`, `all_frames`):

1. **MAIN** `host-mark-main.js` — stamp only. Sets `html[data-op="1"]`, `data-op-h` (hostname suffixes), and on the 23 Amazon **retail** apex/`www` hosts only `data-op-amz` / `data-op-amz-en`. MAIN so page JS cannot wrap the isolated world and so the mark exists before author CSS. No hide logic here.
2. **ISOLATED** `host-mark.js` — same stamp (bfcache / `pageshow`).
3. **ISOLATED** `cosmetic-critical.css` + `cosmetic-vendors.css` + `cosmetic-boot.css` + `boot.js` — gated hides and the procedural engine (`:has-text`, `:uncheck`, …) only where the list requires them.

Pause removes `data-op*`. Packaged CSS is written as `html[data-op="1"] …` / `html[data-op-h~="host"] …` so it stops matching.

## Host gating (suffix-match traps)

`data-op-h` tokens are hostname suffixes. `data-op-h~="flipkart.com"` also matches `seller.flipkart.com`. Prefer `www.flipkart.com` or a small explicit alias.

**Amazon:** do not put retail apex hosts (`amazon.com`, `amazon.de`, …) in the darklist except `amazon.in` / `www.amazon.in` (India ATF/GWM). Shared PDP/SERP rules use list aliases `amazon-retail` / `amazon-en`, compiled to `data-op-amz` / `data-op-amz-en`. Apex-or-www only — not `aws.amazon.com`, Music, Seller Central. Enforced in `src/engine/amazon-list-policy.ts` and `scripts/validate-darklist.mjs`. See `src/engine/amazon-retail.ts`.

## Rule layers

| Layer | Where | Scope |
|-------|--------|--------|
| Vendor prefixes | `cosmetic-vendors.css` | Any site that loads those Shopify/Woo apps |
| Hostname list | `lists/darklist.txt` (filters repo is source of truth; engine copies for boot) | Named hosts; `! Version:` must match `packagedRev` |
| SW shards | `chrome.storage.local` via `src/background/sync.ts` | Fetched public list; `insertCSS` after commit |

Theme-native leftovers (e.g. mloshoes timers) stay hostname-scoped. Do not copy them into vendor CSS.

## Repo layout (engine)

- `src/engine/` — parser, compiler, domain index, Amazon allowlist, list-host policy
- `src/content/` — host-mark, boot, procedural mutator (isolated)
- `src/background/` — service worker, storage shards, subscription fetch
- `scripts/quarantine/` — maintainer harvest / prove-seeds; **not** shipped
- `docs/HOLDOUT_PROTOCOL.md`, `docs/FALSE_POSITIVE_MATRIX.md` — must-not before merge

## Filter list DSL

Supported markers: `##`, `#@#`, `#?#`

Procedural ops: `:has-text`, `:matches-path`, `:matches-attr`, `:matches-css`, `:upward`, `:watch-attr`, `:min-text-length`

Actions: `:uncheck`, `:click-dismiss`, `:remove-attr`, `:remove-class`, `:remove`, `:style`, `:unlock-scroll`

Reject at compile: `:xpath()`, `:others()`, `##^`, `#$#`, `+js()`, `:style()` containing `url`/`javascript`. Reject `:has-text` on bare `div`/`span`/`p`/`*`.

## Safety and limits

Checkout, cart, pay, and auth are frozen (`CONTRIBUTING.md`). A selector list cannot tell a fake countdown from a real one, cannot fix basket-sneaking, and cannot cover one-off theme widgets without a fingerprint or a hostname audit. That is accepted. Do not add runtime detectors to close it.
