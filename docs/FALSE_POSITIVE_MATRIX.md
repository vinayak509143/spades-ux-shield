# Per-selector false-positive matrix

Site-level smoke: [HOLDOUT_PROTOCOL.md](./HOLDOUT_PROTOCOL.md) (5 positive / 5 negative URLs).

**New vendor CSS** (`cosmetic-vendors.css`) or **new hostname rules** (filters repo / packaged extract) also need **per-selector** checks before merge.

## For each proposed selector

| Step | Requirement |
|------|-------------|
| **Hit** | One page where the widget should disappear (app demo or a store that loads that plugin). |
| **Must-not** | Checkout/cart, login/2FA, Wikipedia or GitHub article, storefront **without** that plugin (prefix must not clip unrelated UI). |
| **Iframes** | With `all_frames: true`, open CMP/consent/Shopify overlay frames; confirm `html[data-op]` in frame, parent scroll/click still work. |
| **PR evidence** | Before/after screenshots (top document + overlay iframe if any). No passwords, cards, or full DOM dumps. |

## Automatic guards (CI)

- `test/engine/vendor-css.test.ts` — vendor file denylist (no `.banner`, `.modal`, `role="dialog"`, `[class*="modal"]`, hashed `css-` classes).
- `test/engine/compiler-lint.test.ts` — invalid selectors dropped; valid neighbors kept.
- `npm run validate-pending` — quarantine lines must pass `parseList` + `isExtractableCosmeticLine` + denylist.

## Reject without merge

- `[class*="modal"]`, `.banner`, `div[role="dialog"]`, `[class*="css-"]` hash chasing.
- Any rule that fails a must-not page → **revert** (same as holdout negative fail).

Positive-only Playwright that never opens checkout is **not** enough.

## Shopify vendor seeds

Global prefixes live in `cosmetic-vendors.css`. Theme-native leftovers stay hostname-scoped in `lists/darklist.txt` (see mloshoes.com). Prove with `npm run prove-seeds` (live) and `npm run holdout-shopify` (local fixtures). Never harvest `/cart`, `/checkout`, or `/login`.

| App | Demo storefront | Expected prefix | Last prove-seeds |
|-----|-----------------|-----------------|------------------|
| Hurrify demo | https://demo-hurrier-countdown-timer.myshopify.com/products/gap-disney-mickey-mouse-graphic-tee | `hurrify-` absent; theme uses `.product-count` / `.delivery-time-info` | pass — `lists/darklist.txt` hostname rules; `node test/scripts/verify-hurrier-rules.mjs` |
| Hextom Free Shipping Bar | https://sigma-28.myshopify.com/products/cycling-tee (headed 2026-09-23) | `hextom-` absent on PDP (`#fsb_container` / `.fsb_background`); keep global `hextom-` line | skip — prefix-absent (`prove-seeds`) |
| Sales Pop | https://sales-pop-demo.myshopify.com/products/jaxon-shoes (headed 2026-09-23) | `sales-pop-` absent (`.popup-guide` only); keep global line | skip — prefix-absent (`prove-seeds`) |
| Qikify Salekit | https://qikify-salekit.myshopify.com/products/foldover-boots (headed 2026-09-23) | `qsk-popup-` merged in `cosmetic-vendors.css` | pass — `qsk-popup-:2`, `fomo-:2` (`prove-seeds`) |
| Smart Popup | https://smartpopupdemo.myshopify.com/ | discover | pass — no seed prefix |
| MLO Shoes | https://mloshoes.com/ | hostname in `lists/darklist.txt` | pass — vendor miss expected |
| Local vendor fixture | http://127.0.0.1:4173/vendor-widget.html | `hurrify-` / `hextom-` / `privy-` | pass — hidden |
| Amazon.in PDP / SERP | https://www.amazon.in/dp/B0792MKTDD + https://www.amazon.in/s?k=headphones | `amazon.in` ATF + `amazon-retail` / `amazon-en` aliases (`src/engine/amazon-retail.ts`) | pass — must-not cart + buy box; `node test/scripts/verify-amazon-in-rules.mjs` |
| Amazon retail (global) | https://www.amazon.com/dp/B0792MKTDD, https://www.amazon.co.uk/dp/B0792MKTDD, https://www.amazon.de/dp/B0792MKTDD | `amazon-retail` / `amazon-en` only — **never** `data-op-h~="amazon.com"` | `node test/scripts/verify-amazon-retail-rules.mjs` |
| AWS (must-not) | https://aws.amazon.com/ | no `data-op-amz` | same script |
| Flipkart SERP + PDP | https://www.flipkart.com/search?q=boat+earphones + in-stock PDP | `www.flipkart.com` only; `div.HZ0E6r.Rm9_cy` + scarcity text | `npm run verify:flipkart` (headed) |
| Booking.com property | https://www.booking.com/hotel/us/element-times-square.html | `www.booking.com` only; `li.bui-list__item.bui-text--color-destructive-dark` + “We have N left”. SERP hash unhandled | `npm run verify:booking` (headed) |
| Agoda SERP + property | https://www.agoda.com/search?city=318 + hotel PDP | `www.agoda.com` only; `ssr-property-card-booking-last-24h`, `article.UserEngagement--demand`, `hurry-up-sold-out-message`. Not `fpc-cor-price` | `npm run verify:agoda` (headed) |
| Expedia SERP | https://www.expedia.com/Hotel-Search?destination=New+York&startDate=2026-10-16&endDate=2026-10-17&adults=2&rooms=1 | `www.expedia.com` only; UITK `div.uitk-text.uitk-type-end` + scarcity text | `npm run verify:expedia` (headed) |
| Hotels.com SERP | https://www.hotels.com/Hotel-Search?destination=New+York&startDate=2026-10-16&endDate=2026-10-17&adults=2&rooms=1 | `www.hotels.com` only; same UITK scarcity line | `npm run verify:hotels` (headed) |
| Travelocity SERP | https://www.travelocity.com/Hotel-Search?destination=New+York&startDate=2026-10-16&endDate=2026-10-17&adults=2&rooms=1 | `www.travelocity.com` only | `npm run verify:travelocity` (headed) |
| Vrbo | https://www.vrbo.com/search?destination=New+York&startDate=2026-10-16&endDate=2026-10-17&adults=2 | No rule — percent-unavailable banner unhandled | audit only (`docs/vrbo-audit.md`) |
| Ticketmaster | https://www.ticketmaster.com/search?q=concert + sample `/event/` (full audit 2026-09-24) | No pressure phrases on rendered surfaces | **No rule** — not clean; on-sale scarcity not seen (`docs/ticketmaster-audit.md`) |
| eBay | https://www.ebay.com/sch/i.html?_nkw=trading+cards&LH_Auction=1 (full audit 2026-09-24) | No `N watching` / `almost gone` card to follow | **No rule** — not clean (`docs/ebay-audit.md`) |
| Shein | US + EU (`us`/`www` + `euqs.shein.com`) | US: sold/add-to-cart, scarcity, cart timers; EU: `span.tags-text` sold/surge/returning-customers | **Rule** — Price Drop promo label stays (`docs/shein-audit.md`) |
| Airbnb | `www.airbnb.com` SERP + listing (full audit 2026-09-24, US VPN) | No per-listing viewer/scarcity in dump | **No rule** — both surfaces rendered; not “clean” (`docs/airbnb-audit.md`) |
| Etsy | Listing + cart (2026-09-24) | `p[class*="wt-text-title"].wt-sem-text-critical`, `span.wt-text-body-small.wt-sem-text-critical`, `p[data-24-hour-sale-wrapper]` | **Rule** — cart “Just N available” included; price, Remove, checkout stay (`docs/etsy-audit.md`) |
| Temu | Logged-in home + search (2026-09-26) | `span[class]` whose whole text is ONLY N LEFT, N sold, Limited stock, or Almost out / Add now! Almost out! | **Rule** — `Add now!` alone stays; price stays; PDP body did not hydrate (`docs/temu-audit.md`) |
| AliExpress | Home + PDP (2026-09-26) | `N sold` — PDP `span[class*="reviewer--sold"]` candidate; SERP hash class | **No rule** — PDP hook pending confirm (`docs/aliexpress-audit.md`) |
| Myntra | SERP + PDP (2026-09-26, IN) | No pressure on earphones load | **No rule** (`docs/myntra-audit.md`) |
| H&M | `www2.hm.com` PLP (2026-09-26) | Bot/challenge | **No rule** — incomplete (`docs/hm-audit.md`) |
| Zara | PLP (2026-09-26) | No snippets; weak follow URL | **No rule** (`docs/zara-audit.md`) |
| ASOS | Search + PDP (2026-09-26) | No pressure snippets | **No rule** (`docs/asos-audit.md`) |
| eBay | SERP re-run (2026-09-26) | Still no `N watching` card | **No rule** (`docs/ebay-audit.md`) |
