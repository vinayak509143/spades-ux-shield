# Outreach drafts

Copy-paste text for each channel in [COMMUNITY.md](./COMMUNITY.md). Every number below is checked against the repo on 2026-10-01; re-check before posting if the list has moved.

Facts used (keep them true):

- Engine: MIT. List: GPL-3.0-or-later. Manifest V3, Chrome 111+.
- Spades Darklist: 106 rules across about 15 shopping and travel sites (Amazon retail on 23 storefronts, Amazon.in, Agoda, Booking.com, Etsy, Expedia, GetYourGuide, Hotels.com, Shein, Temu, ThredUp, Travelocity, one Shopify store) plus a cosmetic-only extract of Fanboy's Annoyance List, EasyList Cookie List, and AdGuard Annoyances. Those three lists are named because their licences require attribution; they are inputs, not a claim of affiliation.
- No network blocking. No AI. No telemetry server. The only outbound requests are the list download from GitHub/jsDelivr and, if the user clicks it, a GitHub issue page.
- Safety: rules on checkout, cart, payment, login, 2FA, and account cancellation are rejected at list build and in review. At runtime the engine refuses `:uncheck` and other state mutation on those surfaces (`src/engine/critical-flow.ts`). Plain cosmetic hides rely on list review and tests, not a runtime guard. Say it this way; do not claim the runtime blocks every hide.
- Rule delivery: on 1.0.8 and later, static `host##selector` lines and text rules (`:has-text`) both reach installed users within about 12 hours through list sync, once `! Version:` is bumped. A store release is still required for engine changes and for anyone still on an older build. See [RULE_SHIPPING.md](./RULE_SHIPPING.md).
- Store: Chrome 1.0.7 is published; 1.0.9 is the current Chrome zip. Firefox 1.0.8 is published on addons.mozilla.org. Replace `[STORE STATUS]` below with whichever is live on the day you post.

Links:

- Chrome: https://chromewebstore.google.com/detail/spades-ux-shield/dmchnhnkofleiokmffmkigfnoeodpemf
- Firefox: https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/
- Engine: https://github.com/vinayak509143/spades-ux-shield
- List: https://github.com/vinayak509143/spades-ux-shield-filters
- Rule request form: https://github.com/vinayak509143/spades-ux-shield-filters/issues/new?template=rule-request.yml
- FilterLists submission: https://github.com/collinbarrett/FilterLists/issues/5825

---

## 1. Show HN

Post once, weekday, 8–10 am US Eastern. Stay in the thread for six hours. Do not edit the title after posting.

**Title (78 chars, under the 80 limit):**

```
Show HN: Spades UX-Shield – filter lists that hide dark patterns
```

**Text:**

```
Spades UX-Shield is a browser extension for Chrome and Firefox that hides fake urgency, scarcity chips,
and consent nags using plain-text filter lists. A rule names a site and a
selector. A rule looks like:

  www.booking.com##[data-testid="recommended-units"] div:has-text(/^We have \d+ left at this price$/i)

If the site and selector are on the list, the element is hidden. If they are
not, nothing happens. There is no AI and no guessing.

What it refuses to do:

- It does not block network requests or ads.
- It never sends browsing data anywhere. The only outbound requests are the
  list download from GitHub/jsDelivr and, if you click it, a GitHub issue page.
- Rules on checkout, cart, payment, login, 2FA, and account-cancellation flows
  are rejected when the list is built and again in review. At runtime the
  engine also refuses to uncheck or mutate controls on those surfaces. Plain
  cosmetic hides rely on list review and a holdout test per site, not a
  runtime guard, so I am saying that plainly.

Current list: 106 rules across about 15 shopping and travel sites (Amazon
retail on 23 storefronts, Booking.com, Agoda, Temu, Shein, Etsy, Expedia,
GetYourGuide, ThredUp, and a few more), plus a cosmetic-only
extract of Fanboy's Annoyance, EasyList Cookie, and AdGuard Annoyances.

The engine is MIT, the list is GPL-3.0-or-later, and it is a non-profit
volunteer project. I have hit the limit of what one person can audit, so the
ask is for rules, not stars:

- Add one host##selector line to lists/darklist.txt with a URL where it hits
  and a URL where it must not (price row, Add to cart).
- Or file a rule request with the site and the phrase you see.

A merged rule reaches installed copies of 1.0.8 and later within about 12
hours, after `! Version:` is bumped. Engine changes still need a store release.
See docs/RULE_SHIPPING.md.

Engine: https://github.com/vinayak509143/spades-ux-shield
List:   https://github.com/vinayak509143/spades-ux-shield-filters
Chrome:  https://chromewebstore.google.com/detail/spades-ux-shield/dmchnhnkofleiokmffmkigfnoeodpemf
Firefox: https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/
```

**Prepared answers for the thread** (write them as replies, not in the post):

- *"Why not an existing ad blocker with a custom list?"* — Do not name another product unless the commenter does. If they do: most static `host##` lines are ordinary cosmetic syntax and will load elsewhere. Two things are specific to this extension. It refuses rules and state changes on checkout, payment, and login, and it can rewrite a label (`:replace-text`, so "ADD THE LAST 1!" becomes "Add to cart") instead of hiding the button. Pasting the raw list into a general blocker does not get that freeze.
- *"Sites will rotate class names."* — They do. Hashed classes are never shipped; rules key on analytics attributes (`data-testid`, `data-element-name`) or exact sentence text inside a stable container. Temu rotates class hashes per surface and the text rules survived three audits. When a site changes structure a rule dies and needs a person, same as any filter list.
- *"How do you know you are not hiding legitimate stock information?"* — Each site has a holdout doc with URLs where the rule must not fire and a false-positive matrix. Examples that stay visible on purpose: prices, "56% OFF", "Pay $N today", real delivery estimates, Sign in, Book. The Temu rule for "Fastest delivery in N business days" only fires on the deal-timer copy, not on a normal shipping line.
- *"Is this legal / is hiding site content a ToS problem?"* — It is client-side CSS in the user's own browser, the same category as ad blockers and reader mode. It does not alter requests or scrape.
- *"Firefox?"* — Yes. Version 1.0.8 is on Firefox Add-ons, including Firefox for Android: https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/
- *"Why GPL for the list and MIT for the engine?"* — The list includes extracts of GPL-3.0 and CC BY-SA lists and keeps those licences. The engine has no such dependency.

---

## 2. Email to deceptive.design (Harry Brignull)

Subject: `A filter-list extension that hides listed dark patterns, for your tools list`

```
Hi Harry,

I maintain Spades UX-Shield, a non-profit open source extension for Chrome and Firefox that
hides dark-pattern UI from plain-text filter lists. A rule names a site and
a selector, and that element is hidden. It targets the patterns you document:
fake urgency, fake scarcity, confirmshaming labels on buy buttons, and
consent nags. It does not touch checkout, payment, or login, does not block
ads, and sends no browsing data anywhere.

The list currently covers about 15 large shopping and travel sites (Amazon,
Booking.com, Agoda, Temu, Shein, Etsy, Expedia and others), 106
rules, GPL-3.0-or-later. Each site has an audit with the element, the phrase,
and what must stay visible. There is also a machine-readable catalog of
observed patterns with regulatory categories that may be useful to you or
people who cite your taxonomy:

https://github.com/vinayak509143/spades-ux-shield/blob/main/docs/data/temu-pattern-catalog-2026-09-26.json

Would you consider listing it as a consumer tool on deceptive.design? I am
also happy to align the pattern categories in our catalog with your type
names so the two can be cross-referenced.

Engine: https://github.com/vinayak509143/spades-ux-shield
List:   https://github.com/vinayak509143/spades-ux-shield-filters
Chrome:  https://chromewebstore.google.com/detail/spades-ux-shield/dmchnhnkofleiokmffmkigfnoeodpemf
Firefox: https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/

Thank you for the work on the taxonomy; it is the reason the list has a
vocabulary at all.

Vinayak Patankar
```

---

## 3. Email to evidence-collecting organisations

Use for the Dark Patterns Tip Line (Consumer Reports and partners), EFF, noyb, Mozilla Foundation. Change the first line per recipient. Offer the catalog, not the extension.

Subject: `Machine-readable dark-pattern evidence from a filter-list project`

```
Hello,

I run Spades UX-Shield, a non-profit open source project that hides dark
patterns in the browser using deterministic filter lists. The extension is
the delivery vehicle; the part that may be useful to you is the evidence
trail behind each rule.

For every site we cover there is an audit that records the exact element,
the phrase shown to the user (for example "We have 5 left at this price",
"Booked 27 times today", "ADD THE LAST 1!"), the page type, the date, and
what legitimate content sits next to it. The Temu audit is also exported as
JSON with a regulatory category per pattern:

https://github.com/vinayak509143/spades-ux-shield/blob/main/docs/REGULATORY_EVIDENCE.md
https://github.com/vinayak509143/spades-ux-shield/blob/main/docs/data/temu-pattern-catalog-2026-09-26.json

It is not personal data and not a legal finding. It is a dated record of what
a retailer's page showed and where. If a structured feed like this would
help your work, I would like to know what fields you would want, and I can
make the export match.

Everything is MIT/GPL and volunteer-run; there is no company behind it.

Vinayak Patankar
https://github.com/vinayak509143/spades-ux-shield
```

---

## 4. Fediverse / Bluesky

One post, no thread needed. Attach the Booking.com before/after image from `screenshots/Booking.com/`.

```
Spades UX-Shield: a Chrome and Firefox extension that hides fake urgency and scarcity
("Only 3 left!", "Booked 27 times today") from plain-text filter lists.

No AI. No telemetry. Never touches checkout, payment, or login.
MIT engine, GPL list, non-profit.

106 rules so far. I need people who can write one host##selector line.

https://github.com/vinayak509143/spades-ux-shield-filters
Firefox: https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/
```

---

## 5. Reddit

Post to one subreddit per day. Read each subreddit's self-promotion rule first; r/privacy requires the post to be about privacy, not the product.

**r/opensource** — title:

```
I built a filter-list engine for dark patterns and hit the one-maintainer wall. Looking for rule contributors.
```

Body: reuse the Show HN text, drop the first paragraph's code example, keep the "what it refuses to do" list and the ask.

**r/privacy** — title:

```
A dark-pattern blocker that sends nothing anywhere: what "no telemetry" looks like in the code
```

Body:

```
I maintain an open source extension that hides fake urgency and scarcity
banners using filter lists. Since this subreddit cares about the plumbing,
here is what "no telemetry" means concretely:

- Outbound requests: one GET to GitHub/jsDelivr for the list, about twice a
  day. That is all. No analytics, no error reporting, no ping on install.
- The "Report Dark Pattern & Broken Page" link opens a GitHub issue in a new
  tab with the registrable domain, an anonymised path (IDs and emails
  replaced), the extension version, and rule IDs. No cookies, no HTML, no
  query strings. You see the form before anything is sent.
- Permissions: storage, scripting, webNavigation, alarms, and <all_urls>.
  The last one is needed because rules are hostname-scoped across many
  sites. Every rule is gated on a host marker the page has to carry.

Privacy policy is the same text in the repo and the store:
https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md

Engine: https://github.com/vinayak509143/spades-ux-shield
```

**r/chrome_extensions** — title:

```
Spades UX-Shield (MV3): hides fake urgency/scarcity from filter lists, open source, looking for rule authors
```

Body: Show HN text without the code example.

---

## 6. Note to researchers

Send to people who publish on dark patterns (for example Colin Gray's group at Purdue, Arunesh Mathur). Keep it short; they get many emails.

Subject: `Open dataset of live dark-pattern instances, from a filter-list project`

```
Dear Dr. [Name],

Your work on dark-pattern taxonomies gave a vocabulary to a project I run:
Spades UX-Shield, an open source browser extension that hides listed
dark-pattern UI using deterministic filter rules.

A side effect of maintaining it is a dated record of live instances: site,
page type, exact phrase, DOM anchor, and what legitimate content is adjacent.
The Temu set is exported as JSON with a category per instance, and the other
site audits are in Markdown:

https://github.com/vinayak509143/spades-ux-shield/tree/main/docs

If a corpus like this is useful for your work, I would like to align our
category names with your taxonomy so it is citable. I would also welcome
being told where the categorisation is wrong.

Everything is MIT/GPL and volunteer-run.

Vinayak Patankar
https://github.com/vinayak509143/spades-ux-shield
```

---

## 7. Funding paragraph

Use as the summary field for NLnet, Sovereign Tech Fund, Mozilla Open Source Support, or GitHub Sponsors.

```
Spades UX-Shield is a non-profit open source browser extension and filter
list that hides deceptive interface patterns (fake urgency, fake scarcity,
confirmshaming, consent nags) using deterministic, community-maintained
rules. A rule names a site and a selector. The list is scoped to
manipulation rather than advertising, and it is designed to be safe by
construction: rules on checkout, payment, login, and account-cancellation
flows are rejected at build and review time, and the runtime refuses to
mutate controls on those surfaces. It collects no browsing data. The engine
is MIT and the list is GPL-3.0-or-later. Firefox 1.0.8 is published at
https://addons.mozilla.org/en-GB/firefox/addon/spades-ux-shield/.
Funding would pay for (1) the
engine change that lets community rules reach users without a store review,
and (2) a part-time reviewer so breakage reports are
answered within a day. The project is maintained by one person and is
seeking co-maintainers.
```

---

## 8. Good-first-issue template for the filters repo

Open 8–10 of these from `docs/*-audit.md`. Label: `good first issue`, `rule-request`.

Title:

```
[rule] www.example.com — hide "Only N left!" chip on product page
```

Body:

```
**Site:** www.example.com
**Page type:** product page
**Phrase shown:** "Only 3 left!" (orange chip under the price)
**Proof URL:** https://www.example.com/p/12345
**Must stay visible:** price, strike-through price, Add to cart, delivery estimate
**Notes:** classes are hashed; anchor on the data-testid or the exact sentence.
Audit: https://github.com/vinayak509143/spades-ux-shield/blob/main/docs/example-audit.md

Done when: one line in lists/darklist.txt, `! Version:` bumped, CI green,
before/after screenshot in the PR.
```

---

## Order of operations

1. Upload 1.0.8 to the Chrome Web Store and wait for it to publish. Replace `[STORE STATUS]` everywhere.
2. Open the good-first issues (section 8).
3. Show HN (section 1). Everything else can wait until that thread is over.
4. deceptive.design and researcher emails (sections 2 and 6) the same week.
5. Fediverse, Bluesky, Reddit, one per day (sections 4 and 5).
6. Evidence organisations and funding (sections 3 and 7) once there is at least one outside contributor, so the application can say "community", not "one person".
