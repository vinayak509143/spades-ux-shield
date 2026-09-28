# Agoda audit (2026-09-22)

Headed Playwright: `node scripts/audit-agoda.mjs`. Dump: `temp/agoda-audit.json`.

Locale `en-US`, timezone `America/New_York`. No sign-in, no book click. Final host was `www.agoda.com` on both pages.

## URLs

| Surface | Requested | Result |
|---------|-----------|--------|
| SERP | `https://www.agoda.com/search?city=318&checkIn=2026-09-25&checkOut=2026-09-26&rooms=1&adults=2&children=0&locale=en-us&currency=USD` | Title `Agoda \| Hotels in New York (NY) \| Best Price Guarantee!` |
| Property | First hotel card | Quality Inn JFK Airport Rockaway Blvd (`/quality-inn_34/hotel/new-york-ny-us.html`) |

## Found

| Text | Where | Selector from the dump | Decision |
|------|--------|------------------------|----------|
| `Hurry! N% of properties… fully booked!` | SERP site banner | `h5` + `:has-text(/^Hurry!.*fully booked!/i)` | **Rule** (2026-09-28) |
| `Booked N times today` | SERP card | `[data-element-name="ssr-property-card-today-book"]`, `[data-testid="property-badge-today-booking-container"]`, `[data-badge-id="today-booking"]`. `data-selenium` on these nodes is empty. | **Rule** (static) |
| `Popular! Last booked …` | SERP card aside | `[data-badge-id="lbk"]` only. Do not hide the parent `aside[data-element-name="property-info-icon-message"]`. | **Rule** |
| `Last booked N minutes/hours ago` | Property room header | `[data-testid="room-badge-last_booked_x_hours_ago"]` | **Rule** |
| `Last booked N minutes ago` | Property room offer (the `kDAUGs` span) | `[data-testid="room-offer"] span` + exact last-booked text. Do not hide the offer card. | **Rule** |
| `Rooms in {city} are in high demand…` | SERP site banner | `[data-element-name="hero-banner-container"]` (+ procedural `p.kite-js-Typography` fallback) | **Rule** |
| `Cheapest price you've seen!` | Property room grid | `[data-element-name="room-grid-urgency-message"]` (any tag, not only `p`) | **Rule** |
| `Limited availability` / `Last N rooms!` | Property room grid | `span` exact-text rules | **Rule** |
| `Booked N times in last 24 hr` | SERP property card | `[data-selenium="ssr-property-card-booking-last-24h"]`. Inner span classes are styled-components (`sc-aXZVg`). Parents `property-badge-today-booking-container`, `ssr-property-card-today-book`. | **Rule** on the `data-selenium` hook only. |
| `This property is in high demand!` | Property, above the room grid | `article.UserEngagement.UserEngagement--demand` / `h4.UserEngagement__Title` inside `.UserEngagementContainer`. | **Rule** on `article.UserEngagement--demand`. BEM, not a hash. |
| `Hurry up! 3 room types have already sold out for your dates!` | Property room grid | Element has `data-selenium="hurry-up-sold-out-message"` (audit hint also saw a sibling attribute `sold-out-urgency`). Inner span is `sc-`. Parent `#roomGridContent`. | **Rule** on `[data-selenium="hurry-up-sold-out-message"]`. |
| `The highest bookable price…` | SERP card | `[data-selenium="fpc-cor-price"]` | **Must not.** That node explains the crossed-out price. |
| `N booked` next to room prices | Property room grid | No stable hook captured (sample text only). | **Unhandled.** Do not hide a price row to catch it. |
| `Special Price - Limited time only!` | SERP sample | No element chain in the dump. | **Unhandled.** |

Not on this load: “X people are looking”.

## Must-not (visible on this dump)

- Crossed-price copy: `[data-selenium="fpc-cor-price"]`
- Sign in: visible “Sign in” control. The audit dumper labels every `data-testid` / `data-element-name` as `data-selenium`, so do not treat that hint as the attribute name.
- Room prices and “Select your room” stay. Do not hide `#roomGridContent` or `#property-main-content`.

## Host

Rules use `www.agoda.com` and `www.agoda.co.in` (same DOM hooks). Do not use bare `agoda.com` — partner/admin hosts.
