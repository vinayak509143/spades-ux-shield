# 10-URL holdout protocol

Empirical smoke test for Spades UX-Shield. This is **not** coverage of the [deceptive.design](https://deceptive.design/) taxonomy. It only checks: (1) listed cosmetic nags hide without a blank hole when we claim they do, (2) **critical flows are never mutated**.

Use a **fresh profile** with only this unpacked extension (after `npm run build`). Toggle the extension **off** on the same URL if a positive target is ambiguous (A/B).

## Expected behavior

| Class | Pass |
|--------|------|
| **Positive** | Target nag/promo is not visible after load + 2s; no persistent empty slot (row collapses or content shifts). `html[data-op="1"]` is set. |
| **Negative** | **Zero** Spades hide class / `op-hide` on payment/auth controls. Page is usable (sign in, view cart, pay test, read article). No checkout field `:uncheck`. |

Record pass/fail in the PR or issue. Do not paste passwords, card numbers, or full DOM.

## 5 positive targets (expect hide)

| # | URL | What to look for |
|---|-----|------------------|
| 1 | `https://www.amazon.in/` | GWM first tile / ATF video-cashback promo **gone**; remaining tiles shift left (no white column). |
| 1b | `https://www.amazon.in/dp/B0792MKTDD` (or any in-stock PDP) | `#socialProofingAsinFaceout_feature_div` (“bought in past month”) **gone**; price, In stock, Add to cart, delivery “Order within …” **stay**. |
| 1c | `https://www.amazon.in/s?k=headphones` | `.a-badge` “Limited time deal” / “Ends in …” **gone**; product cards and Sponsored labels **stay**. |
| 1d | `https://www.amazon.com/dp/B0792MKTDD` + `https://www.amazon.co.uk/dp/B0792MKTDD` | `html[data-op-amz="1"]`; social-proof faceout **gone**; Add to cart **stays**. India-only GWM rules must **not** apply on `.com`. |
| 1e | `https://aws.amazon.com/` | **No** `data-op-amz` (retail alias must not match AWS). Page usable. |
| 1f | `https://www.flipkart.com/search?q=earphones` | “Only few left” / “Only N left” SERP chips **gone**; “Bank Offer” chips **stay**. |
| 1g | Flipkart PDP from SERP (in-stock) | Add to cart / Buy now **stay**; price visible. |
| 1h | `https://www.booking.com/hotel/us/element-times-square.html` (dates filled) | Room-table “We have N left” **gone**; `#hp_book_now_button` and the price **stay**. SERP hash chips may remain. |
| 1i | `https://www.agoda.com/search?city=318` (New York, dates filled) | “Booked N times in last 24 hr” **gone**; crossed price (`fpc-cor-price`) and Sign in **stay**. |
| 1j | Expedia / Hotels.com / Travelocity SERP (New York, 2026-10-16→17) | “We have N left at this price” **gone**; listing prices **stay**. Vrbo **N/A** (no rule). |
| 1k | Etsy listing that shows “Only N left and in N carts” (manual Chrome if automation is challenged) | Scarcity line and “Sale ends in” countdown **gone**; price and Add to cart **stay**. |
| 2 | `https://www.cnn.com/` (open an article) | Sticky video / newsletter modal listed by annoyances lists — hidden or dismissible without covering the article. |
| 3 | `https://timesofindia.indiatimes.com/` | Floating interstitial / app nag if present — hidden. If none on that load, mark **N/A** (not fail). |
| 4 | Recipe blog with a CMP (e.g. a site that shows a cookie banner; pick one from Fanboy that you can load legally) | Cookie consent overlay hidden **or** page readable; if your jurisdiction requires consent UI, use a site you already accept — this is engineering QA, not legal advice. |
| 5 | `https://weather.com/` or `https://www.accuweather.com/` | Newsletter / app / nag overlay hidden when the list has a host rule. **N/A** if no nag. |

## 5 negative targets (expect zero mutation)

| # | URL | Must not break |
|---|-----|----------------|
| 1 | `https://www.amazon.in/gp/cart/view.html` (signed-in cart OK) | Cart line items, checkout CTA, Amazon Pay — **visible and clickable**. |
| 1b | `https://www.flipkart.com/viewcart` | Cart / place-order path **usable** (empty cart OK). |
| 1c | Booking.com property room table + Agoda search card | Reserve / Sign in / price **visible**. Do not open checkout. |
| 2 | `https://github.com/` settings or any PR (`https://github.com/vinayak509143/spades-ux-shield`) | Review, comment, merge controls intact. |
| 3 | Stripe Checkout test (or `https://checkout.stripe.com/` sample if you have one; otherwise a **test-mode** Checkout Session you own) | Card fields, Pay button — **no** hide/uncheck. |
| 4 | `https://en.wikipedia.org/wiki/Dark_pattern` | Reading mode; no missing infobox/content from over-broad `##`. |
| 5 | `https://accounts.google.com/` (login gate) | Email/password (or account chooser) **usable**. Do not automate credentials in CI. |

## Automation

`npm run test:stress` covers **positive #1** (Amazon.in GWM spam-reload) only.

`npm test` / `npm run test:e2e` cover engine fixtures, **not** this matrix.

Per-selector vendor / generated rules: [FALSE_POSITIVE_MATRIX.md](./FALSE_POSITIVE_MATRIX.md).

This protocol is **manual** (or a future Playwright file that **does not** submit payments). CI must never use real cards or production Stripe keys.

## Failures

- Positive fail → add a **hostname-scoped** cosmetic in the [filters repo](https://github.com/vinayak509143/spades-ux-shield-filters) or `lists/darklist.txt` **if** it is in-scope (`CONTRIBUTING.md`).
- Negative fail → **revert the rule**. Do not “fix” checkout with more `:uncheck`.
