# Attribution

Spades UX-Shield’s **engine, DSL, and original lists** (`lists/base.txt`, Amazon GWM overlays, this repository’s TypeScript) are original work. Packaged third-party cosmetics are **not**.

## Upstream filter lists

`npm run update-filters` (`scripts/fetch-third-party.mjs`) downloads public filter lists and writes `third-party-rules.txt`. That file is an **extract**, not a relicense.

### Fanboy’s Annoyance List (EasyList)

- **Maintainer:** Ryan “Fanboy” and EasyList contributors  
- **Source:** [https://secure.fanboy.co.nz/fanboy-annoyance.txt](https://secure.fanboy.co.nz/fanboy-annoyance.txt)  
- **Project:** [https://easylist.to/](https://easylist.to/)  
- **License:** GNU GPL v3 **and** Creative Commons Attribution-ShareAlike 3.0 Unported ([CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/))  
- **GPL text:** [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html)

EasyList-family lists require **attribution** and **share-alike** when you redistribute derived filter text. Shipping `third-party-rules.txt` in this repo is that redistribution.

### EasyList Cookie List

- **Maintainer:** EasyList contributors  
- **Source:** [https://easylist-downloads.adblockplus.org/fanboy-cookiemonster.txt](https://easylist-downloads.adblockplus.org/fanboy-cookiemonster.txt)  
  (`easylistcookie.txt` is not a live EasyList URL; Cookie List is published as Fanboy Cookie Monster.)  
- **Project:** [https://easylist.to/](https://easylist.to/)  
- **License:** GNU GPL v3 **and** CC BY-SA 3.0 (same EasyList terms as Fanboy)

Hostname-scoped cosmetic `##` extract only. This list targets consent / cookie walls; it is not a legal determination that a given banner is unlawful.

### EasyList Adblock Warning Removal List

- **Maintainer:** EasyList contributors  
- **Source:** [https://easylist-downloads.adblockplus.org/antiadblockfilters.txt](https://easylist-downloads.adblockplus.org/antiadblockfilters.txt)  
- **Project:** [https://easylist.to/](https://easylist.to/)  
- **License:** GNU GPL v3 **and** CC BY-SA 3.0 (same EasyList terms as Fanboy)

Cosmetic `##` extract only. Network anti-adblock filters are not imported.

### AdGuard Annoyances

- **Maintainer:** AdGuard Software Ltd  
- **Source (Chromium filter 14):** [https://filters.adtidy.org/extension/chromium/filters/14.txt](https://filters.adtidy.org/extension/chromium/filters/14.txt)  
- **Repository:** [https://github.com/AdguardTeam/AdguardFilters](https://github.com/AdguardTeam/AdguardFilters)  
- **License:** [GNU GPL v3](https://github.com/AdguardTeam/AdguardFilters/blob/master/LICENSE)

## What we extract

Spades UX-Shield extracts and redistributes only hostname-scoped cosmetic element-hiding selectors (`##`) from these lists via `scripts/fetch-third-party.mjs`. Upstream network-filtering, scriptlets, and procedural rules remain the property of their respective maintainers under their original licenses.

The extract also **drops** generic (`##` with no host), HTML filters (`##^`), snippets (`#$#`), scriptlets (`+js`), and (for this engine) checkout/payment/auth **critical-flow** cosmetics — see `CONTRIBUTING.md`.

## This engine (not the extract)

Original Spades source in this repository is intended to be licensed separately (MIT when `LICENSE` is present). **MIT does not replace GPL/CC-BY-SA on `third-party-rules.txt`.** Combined distributions that include the extract must honor upstream terms (attribution, share-alike / GPL as applicable).

## Filters community list

Live subscription text also lives in [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters). Do not paste EasyList/AdGuard blobs into that repo without the same attribution and licenses.
