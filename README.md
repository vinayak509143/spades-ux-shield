# ♠️ Spades UX-Shield

**A zero-cost, purely deterministic, client-side shield against deceptive UX and dark patterns.**

Spades UX-Shield is a Manifest V3 browser extension that neutralizes manipulative web design—like fake countdown timers, confirmshaming, forced continuity traps, and roach motels—before they even render on your screen.

Unlike other dark pattern detectors that rely on heavy machine learning, slow DOM heuristics, or local LLMs, Spades relies on a **deterministic, community-driven filter list architecture** (inspired by uBlock Origin). It is blisteringly fast, perfectly private, and costs $0 to host.

## ✨ Why This Architecture?

Academic researchers and startups have tried to build AI to "detect" dark patterns, resulting in massive CPU overhead and high false-positive rates that break legitimate checkout flows.

Spades UX-Shield takes a different approach:

* **Zero AI, Zero Heuristics:** We use strict CSS selectors and procedural DOM mutation rules. If a fake timer is on the filter list, it dies. If it's not, it lives. Zero guesswork.
* **First-Paint Execution:** Cosmetic rules are injected synchronously via `document_start`. Dark patterns are hidden *before* the page flashes white, resulting in 0 Cumulative Layout Shift (CLS).
* **Pure Client-Side:** No telemetry, no backend servers, no API keys.
* **$0 Infrastructure:** Filter lists are plain text files fetched directly from GitHub via ETags.

## ⚙️ How It Works

1. **The Engine:** A highly optimized TypeScript parser reads raw text rules (e.g., `scam-shop.com##.fake-timer`).
2. **The Index:** Rules are compiled into a memory-efficient Reversed-Label Trie, sharded in `chrome.storage.local`.
3. **The Mutator:** A lightweight `MutationObserver` watches the DOM. It uses `requestIdleCallback` and `requestAnimationFrame` to safely uncheck sneaky checkboxes and hide modals without thrashing your CPU.

## 🚀 Installation

Not on the Chrome Web Store yet. Load unpacked from a GitHub Release (no terminal).

### From a Release ZIP

1. Download `spades-ux-shield-v1.0.1.zip` from [Releases](https://github.com/vinayak509143/spades-ux-shield/releases/latest).
2. Extract the archive. You should see `manifest.json` in that folder (not a nested `dist/` only).
3. Open `chrome://extensions/` (or `edge://extensions/`).
4. Enable **Developer mode**.
5. **Load unpacked** → select the extracted folder.

### From source

1. Clone this repository.
2. Run `npm install`, `npm run update-filters`, and `npm run build`.
3. **Load unpacked** → this repository folder (the directory that contains `manifest.json`, not `dist/` alone).

## 🛡️ The Filter Syntax

Spades uses a custom DSL that extends standard cosmetic filtering. We support native CSS hiding alongside powerful procedural actions:

* **Hide a fake timer:** `scam-site.com##.urgency-banner`
* **Confirmshaming (Text Match):** `sneaky-news.com##button:has-text("No thanks, I hate saving money")`
* **Defeat Forced Continuity:** `sketchy-airlines.com/checkout/*##input[name="travel_insurance"]:uncheck`
* **Bypass Roach Motels:** `read-it-all.com##.signup-wall:click-dismiss`

Want to help us break dark patterns? Contribute to the official filter list in our [filters repository](https://github.com/vinayak509143/spades-ux-shield-filters)! See [CONTRIBUTING.md](CONTRIBUTING.md) (checkout/pay/auth are frozen).

## Licenses & attribution

Original engine source is intended as MIT when `LICENSE` is present. **`third-party-rules.txt` is not MIT** — it is a cosmetic extract of Fanboy/EasyList and AdGuard Annoyances (GPL-3.0 / CC BY-SA 3.0). See [ATTRIBUTION.md](ATTRIBUTION.md).

## 🛠️ Tech Stack

* **TypeScript** (Strict Mode)
* **Manifest V3** (Service Workers, Isolated Worlds)
* **esbuild** (Bundling)
* **Vitest & Playwright** (Testing)

## 🤝 Contributing

Found a website using dark patterns? Click the **Report broken page** link in the extension popup to open a pre-filled GitHub issue for our community filter list (no telemetry, no DOM dumps).

Quality holdout (manual): [docs/HOLDOUT_PROTOCOL.md](docs/HOLDOUT_PROTOCOL.md).

```bash
npm test          # unit tests
npm run test:e2e  # extension + CLS fixture (builds first)
```
