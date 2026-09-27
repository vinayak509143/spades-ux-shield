# GetYourGuide — predictive sell-out badges

Audited 2026-09-27, English UI / INR, desktop 1360 x 900.

## Implemented scope

Two `www.getyourguide.com` procedural cosmetic rules in `lists/darklist.txt`:

- Activity-card `span` with the semantic ID suffix `-likelyToSellOut-badge`.
- The isolated `.badge-wrapper` directly under `#sticky-booking-assistant-configurator > .header` on an activity page.

Both require the entire text to equal `Likely to sell out`, and reject wrappers containing buttons, links, inputs, selects, textareas, or button-role elements. A third rule hides the same phrase on `span.c-marketplace-badge--primary` (basket recommendations and some cards) with no path limit, because that node is only the badge. No activity-specific numeric ID or hashed Vue attribute is used.

Positive routes for the card and activity-panel rules permit an optional locale prefix (`/en-gb/`), the homepage, destination paths ending in `-l<number>/`, activity paths ending in `-t<number>/` with or without a trailing slash, and `/cart`. Query strings are allowed. Checkout, payment, and authentication routes do not match those two rules.

This is a predictive scarcity message, not proof that inventory is fake. Actual dated availability (`Only 1 spot left`) remains visible, along with prices, discounts, reviews, participant/date/time selection, Continue, cancellation terms, and reserve-now/pay-later information. Consent and login interfaces remain untouched.

## Live evidence

| Surface | URL | Result |
|---|---|---|
| Home | https://www.getyourguide.com/ | Observed predictive badges; candidate hides them without changing visible prices/controls. |
| Destination | https://www.getyourguide.com/paris-l16/ | Seven observed badges hidden; 51 visible price/control nodes unchanged in the before/after comparison. |
| Activity | https://www.getyourguide.com/london-l57/from-london-full-day-tour-of-cotswolds-t215430/ | One predictive badge hidden; 50 visible price/control nodes unchanged. Badge area collapses without a persistent empty slot. |
| Date/time options | Same activity, October 16, 2026 | Date picker opens; 8:30 AM option and Continue remain usable. Actual `Only 1 spot left` remains visible. No purchase submitted. |
| Login overlay | Home → Profile → Log in or sign up | Email input and email/Google/Apple/Facebook controls remain visible. No credentials entered. |
| Empty cart | https://www.getyourguide.com/en-gb/cart | Basket was empty. A recommendation card used `span.c-marketplace-badge--primary` with the exact phrase. That badge is in scope. Prices on the card stay. |
| Populated checkout | Activity options → Continue → `/checkout?skipCart=true` | GetYourGuide error page; **not verified**. No payment or booking submitted. |

The positive comparisons bundled the repository's actual parser, compiler, and ProceduralEngine and applied the candidate rules to rendered pages. They are not claims of a completed live MV3 holdout.

On 2026-09-27 the unpacked extension was loaded in Chromium and checked live. The en-gb Tenerife activity (`t105353`, with the ranking query) hid the booking-panel badge; Select date, Check availability, the per-person price, free cancellation, and “Limited to 10 participants” stayed visible. `/en-gb/tenerife-l350/` hid the card id badges and left prices, struck-through prices, Top pick, and Certified by GetYourGuide visible. `/en-gb/cart` hid the recommendation badge on `span.c-marketplace-badge--primary` and left the certified label and prices visible. The basket had no reserved activity, and the date picker did not yield an add-to-basket click, so a filled basket line is still unchecked. Populated checkout remains an error page and is not verified.

## Screenshots

Before/after pairs are captured on the same rendered page:

- [Paris before](data/getyourguide/paris-before.png) / [Paris after](data/getyourguide/paris-after.png)
- [Activity before](data/getyourguide/activity-before.png) / [Activity after](data/getyourguide/activity-after.png)
- [Login overlay](data/getyourguide/login.png)
- [Empty cart after](data/getyourguide/cart-after.png)

Raw local audit JSON and temporary helper scripts remain under ignored `temp/`; no full DOM, credentials, or checkout-error identifiers are committed. No new permanent `audit-SITENAME.mjs` was introduced.

## Repeatable checks and release limits

`npm.cmd test -- test/content/getyourguide-rules.test.ts`

The focused tests compile the actual list and exercise the real procedural engine: locale and cart routes, frozen checkout and login routes, unrelated hosts, price/CTA text mixed into badges, and textless interactive descendants. They also ensure the path-scoped rules emit no unconditional CSS.

`npm.cmd run validate-darklist`

`npm.cmd run typecheck`

`npm.cmd run test:e2e`

Local list revision and `packagedRev`: `202609271900`. `npm.cmd run build` refreshes the packaged procedural rules. Reload the unpacked extension and existing tabs to use the local changes.

The filter repository is the production source of truth. These local changes have not been pushed or published there. The live packaged check covers the en-gb activity, Tenerife listing, and empty basket. A filled basket line and populated checkout are still unchecked. Do not claim those two surfaces verified.
