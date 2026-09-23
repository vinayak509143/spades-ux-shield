# Booking.com audit (2026-09-22)

Headed Playwright: `node scripts/audit-booking.mjs`. Dump: `temp/booking-audit.json`.

Locale `en-US`, timezone `America/New_York`. No sign-in, no Reserve click. Final host was `www.booking.com` on both pages (a `chal_t` query param was added; listings still rendered).

## URLs

| Surface | Requested | Result |
|---------|-----------|--------|
| SERP | `searchresults.html?ss=New+York&checkin=2026-09-25&checkout=2026-09-26&group_adults=2&no_rooms=1` | Title `Booking.com: Hotels in New York. Book your hotel now!` |
| Property | First `/hotel/` card, then `hotel/us/element-times-square.html` with the same dates | Element by Marriott New York Times Square West |

## Found

| Text | Where | Selector from the dump | Decision |
|------|--------|------------------------|----------|
| `We have N left at this price` | SERP cards | Node class `cc87802d18` (and parents `b2bd50e031`, `f049fb9621`). No `data-testid` in six ancestors. Hint collapsed to bare `div` because the class is a hash. | **Unhandled.** Do not ship the hash. |
| `77% of places to stay are unavailable for your dates on our site.` | SERP banner | `h3` id `:rps:` (React `useId`). Parent `[data-testid="banner-neutral"]`. | **Unhandled.** Id is generated. `banner-neutral` is a generic banner slot. |
| `We have 5 left` | Property room table, conditions cell, next to the price and “Select Rooms” | `li.bui-list__item.bui-text--color-destructive-dark` inside `ul.hprt-conditions-bui` / `td.hprt-table-cell-conditions`. Own text is only that sentence. | **Rule.** Text-filter so other red list rows stay. This is not the room `<select>` and not the price cell. |
| `Unlock member-only discounts` / Sign in | Promo banner | `[data-testid="promotional-banner-content-cta"]` | **Must not.** Auth. |

Not on this load: “X people are looking”, booking-count toasts, countdown timers.

## Must-not (visible on this dump)

- Price: `[data-testid="price-and-discounted-price"]` (SERP, e.g. `US$429`); property column `th.hprt-table-header-cell.hprt-table-header-price`
- Reserve: `#hp_book_now_button`
- See availability: `[data-testid="availability-cta"]`
- Sign in: `[data-testid="header-sign-in-button"]`

## Host

Rules use `www.booking.com` only. Apex `booking.com` would also match `admin.` / `join.` / `secure.`.
