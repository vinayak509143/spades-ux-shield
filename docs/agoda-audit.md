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

Rules use `www.agoda.com` only. Apex `agoda.com` would also match partner and admin hosts.
