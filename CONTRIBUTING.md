# Contributing

The **engine** (parser, compiler, MV3 injection, popup) lives in this repository: [spades-ux-shield](https://github.com/vinayak509143/spades-ux-shield).

**Filter rules** (CSS selectors for real sites) belong in [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters). Use [CONTRIBUTING.md there](https://github.com/vinayak509143/spades-ux-shield-filters/blob/main/CONTRIBUTING.md): **rule-request** issues, PRs to `lists/darklist.txt`, or **breakage** reports. The extension popup **Report broken page** opens the breakage template (no telemetry, no DOM dumps). Run `npm run validate-darklist` before opening an engine PR that touches the bundled copy of the list.

Engine PRs here: run `npm test` (and `npm run test:e2e` when you touch boot/CSS injection).

## Safety policy & out-of-scope surfaces

### Strict ban (do not add rules)

Do **not** target:

- Checkout, cart, or order-review URLs (`/checkout`, `/gp/cart`, `/gp/buy`, pay iframes)
- Payment gateways: Stripe, PayPal, Razorpay, Amazon Pay, card/CVV fields
- Authentication: login, 2FA, password reset, account picker
- Account **cancellation** or **subscription-management** mazes

`:uncheck` / `:click-dismiss` / element hide on those surfaces can **break purchases** or lock people out of their accounts.

`scripts/lib/extract-cosmetic.mjs` **rejects** imported third-party lines whose host, path, or selector matches this freeze. Do not work around it.

### Out of scope (not a CSS problem)

These [deceptive.design](https://deceptive.design/types) types **cannot** be solved by cosmetic injection and are **prohibited** from production `lists/darklist.txt`:

- Drip pricing / hidden costs
- Hard-to-cancel / roach-motel **account flows** (Prime, Audible, “call to cancel”)
- Trick wording, comparison prevention, hidden subscriptions as **legal copy**

The DSL examples using `example.com` hosts (including `sketchy-airlines.example.com/checkout/*`) are **fixtures for the parser**, not a template for Amazon/Stripe.

### In scope

Interruptive **cosmetic** UI only:

- Cookie walls and consent nags
- Newsletter / signup overlays
- Sticky media players and app-install banners
- Isolated hero / ATF promo tiles (e.g. Amazon.in Gateway Window first slot)

Amazon homepage GWM rules stay **ATF/home**. Never extend them to cart or pay.

## Holdout

Before claiming a site is “fixed,” follow [docs/HOLDOUT_PROTOCOL.md](docs/HOLDOUT_PROTOCOL.md).

New `cosmetic-vendors.css` prefixes or quarantine lines: [docs/FALSE_POSITIVE_MATRIX.md](docs/FALSE_POSITIVE_MATRIX.md). Run `npm run validate-pending` before merging `lists/pending-review.txt`. Shopify app demos: `npm run crawl-demos` (Playwright storefronts, not App Store HTML) then human-merge `temp/pending-vendor-rules.css`.

## Licenses

Third-party extracts: [ATTRIBUTION.md](ATTRIBUTION.md).
