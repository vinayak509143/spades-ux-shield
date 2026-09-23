# Ticketmaster full cosmetic audit (2026-09-24)

Headed Playwright: `node scripts/audit-ticketmaster.mjs`. Dump: `temp/ticketmaster-audit.json`. Screenshots: `temp/ticketmaster-*.png`.

Locale `en-US`, NYC geolocation. No sign-in, no checkout.

## Surfaces

| Surface | URL / result | Status |
|---------|----------------|--------|
| Search | `www.ticketmaster.com/search?q=concert` | **Rendered** — no pressure phrases in dump |
| Event | Alabama concert `/event/0200650DAA2033B0` | **Rendered** — no “few tickets left” / countdown hooks |
| Discover | `www.ticketmaster.com/discover/concerts` | **Rendered** — no pressure snippets |

## Classified hits

| Text | Label | Notes |
|------|-------|-------|
| (none) | — | Tightened harvest requires numbered pressure (`only N left`, `few tickets left`, `ends in HH:MM:SS`, etc.). No false “In Concert” title matches. |

## Must-not (not exercised on this load)

- Ticket price and “Get Tickets” on a live on-sale event (event page had no inventory UI in dump).

## Host

`www.ticketmaster.com` only. **No darklist rules** — audit incomplete for high-demand on-sales; not “clean.”
