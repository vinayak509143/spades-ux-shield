# Spades UX-Shield

A small Chrome extension that hides cookie walls, newsletter pop-ups, fake countdown timers, app-install nags, and other dark patterns. It works from plain-text filter lists, the same way uBlock Origin's cosmetic filters do. There is no AI in it, no server, and nothing is sent anywhere.

## What it does

- Hides elements with CSS. A rule looks like `example.com##.newsletter-overlay`. If the site and selector are on the list, the element is hidden before the page paints. If they aren't, nothing happens.
- Ships with a cosmetic-only extract of Fanboy's Annoyance List, EasyList Cookie List and AdGuard Annoyances, plus [Spades Darklist](https://github.com/vinayak509143/spades-ux-shield-filters) (Shopify urgency apps, Amazon retail PDP social-proof, Amazon.in homepage promos, and other hostname-scoped rules).
- Pulls updates to my list from GitHub about twice a day. The third-party extract is baked in at build time.
- Has a popup with two switches (this tab, this domain) and a "Report broken page" link that opens a pre-filled GitHub issue.

## What it doesn't do

- It does not block network requests or ads.
- It does not read page content for anything except matching selectors.
- It stays away from checkout, payment and login pages. Rules for those are dropped when the list is built and refused again at runtime.
- It does not guess. If a pattern isn't on the list, it stays on the page.

## Install

Not in the Chrome Web Store yet.

From a release zip:

1. Download `spades-ux-shield-v1.0.5.zip` from [Releases](https://github.com/vinayak509143/spades-ux-shield/releases/latest).
2. Unzip it. `manifest.json` should be at the top level of the folder.
3. Open `chrome://extensions`, turn on Developer mode, click Load unpacked and pick that folder.

From source:

```bash
git clone https://github.com/vinayak509143/spades-ux-shield.git
cd spades-ux-shield
npm install
npm run update-filters
npm run build
```

Then Load unpacked on the repository folder (the one with `manifest.json`).

### Verify Amazon rules (optional)

After `npm run build`:

```bash
npm run verify:amazon
```

Checks `amazon.in` holdout targets and retail `data-op-amz` on `.com` / `.co.uk` / `.de`, with `aws.amazon.com` must-not. See [docs/HOLDOUT_PROTOCOL.md](docs/HOLDOUT_PROTOCOL.md).

## How it works

Three content scripts run at `document_start` on every page. The first stamps `<html>` with hostname suffixes (`data-op-h`) and, on the 23 Amazon **retail** storefronts only, `data-op-amz` / `data-op-amz-en` (not `aws.amazon.com` or other Amazon subdomains). Bundled CSS uses `html[data-op-h~="host"]` for normal sites and `amazon-retail` / `amazon-en` list aliases for shared PDP rules. A small boot stylesheet and optional `MutationObserver` apply procedural rules (`:has-text`, `:uncheck`) only where the list requires them.

The service worker keeps my list in `chrome.storage.local`, split into shards by domain, and injects the matching CSS with `chrome.scripting.insertCSS` when a page commits.

Filter syntax is the usual `host##selector` with a few procedural extras. Details in [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Site rules go in [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters), either as an issue or a PR to `lists/darklist.txt`. Engine changes go here; run `npm test` first, and `npm run test:e2e` if you touch injection.

[CONTRIBUTING.md](CONTRIBUTING.md) lists what is off limits: checkout, payment, login and account-cancellation flows. Before calling a site fixed, go through [docs/HOLDOUT_PROTOCOL.md](docs/HOLDOUT_PROTOCOL.md).

## Licence

Engine code is MIT. `third-party-rules.txt` is an extract of GPL-3.0 / CC BY-SA 3.0 lists and keeps those licences. See [ATTRIBUTION.md](ATTRIBUTION.md).

Privacy: [PRIVACY.md](PRIVACY.md). Short version: nothing leaves your browser unless you click the report link.

## Support

It's free and there is no paid tier. If you'd like to cover the Web Store fee or a coffee: [ko-fi.com/spadesxx](https://ko-fi.com/spadesxx). Starring the repo or sending in a rule helps just as much.
