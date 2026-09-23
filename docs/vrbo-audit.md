# Vrbo audit (2026-09-22)

Headed Playwright: `node scripts/audit-vrbo.mjs`. Dump: `temp/vrbo-audit.json`.

Locale `en-US`, timezone `America/New_York`. Dates 2026-10-16 → 2026-10-17, 2 adults. No sign-in, no Book click.

## URLs

| Surface | Result |
|---------|--------|
| SERP | `www.vrbo.com` New York rental search rendered |
| Property | First listing link landed on **Bot or Not?** challenge — PDP not usable |

## Found (SERP)

| Text | Selector from the dump | Decision |
|------|------------------------|----------|
| `Only 10% of properties are available on our site for your dates.` | Generic `div.uitk-layout-flex` / `div.uitk-text.uitk-type-300` chain; page lists `[data-stid="results-header-message"]` (shared banner slot, no stable hook on the text node) | **Unhandled** — same class of issue as Booking `banner-neutral` / percent-unavailable banners |
| `New York is popular!` | Not isolated in snippet dump | **Unhandled** |

No per-card “We have N left” or “Booked N times” on this load.

## Must-not

- Rental prices in cards
- “More information about …” listing links

## Host

`www.vrbo.com` only. **No darklist rules** from this audit.
