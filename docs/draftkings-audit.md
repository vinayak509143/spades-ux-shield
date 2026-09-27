# DraftKings audit (2026-09-21)

Live: Playwright against [https://www.draftkings.com/](https://www.draftkings.com/). Helper: `node scripts/audit-draftkings.mjs` (headless from this machine is **Access Denied**; dump below is from a non-headless session).

## Host / geo

This URL is **not one site**. Geo and product switch the document:

| Load | What we got |
|------|-------------|
| This audit | `www.draftkings.com` → **Ontario Sportsbook** landing (`Ontario Sports Betting - Bet Online \| DraftKings Sportsbook`) |
| Public US marketing | Daily Fantasy / “play free for your share of millions” (different chrome) |
| Headless CI | Akamai **Access Denied** — no `verify:draftkings` until we have a stable, unblocked dump |

Do **not** copy `draftkings.com` into `data-op-h` (would suffix-match `sportsbook.`, `casino.`, `rg.`, `myaccount.`). Any future rule is **one hostname at a time** after that host’s dump.

## Must-not (frozen — do not hide)

From this landing, all of these are visible and **out of scope**:

- **Auth:** `SIGN IN` → `sportsbook.draftkings.com/login` (`a.header_nav__links__link`); `SIGN UP` → `/auth…#promos` (`[data-testid="button"]` — generic, unusable anyway)
- **Pay / wager:** deposit, bet slip, place bet (not on this marketing page; still frozen on sportsbook)
- **Responsible gaming:** “Gambling Problem? Call ConnexOntario…”, footer `1-800-GAMBLER`, `Responsible Gaming` → `rg.draftkings.com`
- **Legal / age:** 19+, physically present in ONT, Terms, Privacy

Hiding RG or age copy is a product and legal fail, not a dark-pattern win.

## Candidates (this dump)

| Text | Hint | Verdict |
|------|------|---------|
| Hero “SIGN UP” | `[data-testid="button"]` + hashed `div.css-x2jlgg` | Skip — auth CTA + generic testid + hashed class |
| “Download Now” / “Download the app” | `[data-testid="button"]` in `div.button_container` | App nag is in-scope **in principle**; selector is **not** stable (shared testid with Sign Up) |
| FAQ “Don’t miss the chance to place a bet…” | `p` / `a` | Skip — `:has-text` on `p` is banned; this is copy, not a widget |

No countdown, scarcity chip, or separate social-proof widget on this Ontario landing. **37** `[class*="css-"]` nodes — same “stop if hashed only” rule as Flipkart.

## What CSS cannot fix (still dark patterns)

Mathur-style issues that stay **out of `darklist.txt`**:

- First-deposit “play free / millions in prizes” **misdirection** (terms, not a hideable overlay on this load)
- Geo lock / eligibility as **obstruction**
- Sportsbook **forced account** before betting
- Loss-chasing / gamification inside the product (not cosmetic nags)

## Next dump (if we continue)

1. US-present sportsbook `…/featured` **and** DFS lobby — same host-scope discipline.
2. Record promo rail / odds-boost **widgets** with stable ids; still never login, deposit, bet slip, RG.
3. No CI verify while Akamai blocks headless.

**No `darklist.txt` lines from this pass.**
