# Firefox local install

This package is for loading Spades UX-Shield in Firefox on your machine. It is not listed on addons.mozilla.org.

## Rebuild the submitted zip

Reviewed against Node.js 24.18.1. Any Node.js 22 or newer works. npm is included with Node.js. Windows, macOS, and Linux can run the same commands.

1. Install Node.js 22 or newer from https://nodejs.org/.
2. Unzip the source archive and open a terminal in that folder.
3. Run:

```bash
npm ci
npm run package:firefox
```

`npm run package:firefox` is the build script. It installs nothing by itself. `npm ci` installs the exact dependency versions from `package-lock.json`, including esbuild. The script then bundles the TypeScript and writes `spades-ux-shield-firefox-v1.0.8.zip`.

Do not run `npm run update-filters` when reproducing the submitted zip. That command downloads third-party lists again, and those lists change.

## Build

```bash
npm run package:firefox
```

That writes:

- `dist-firefox/` — unpacked extension
- `spades-ux-shield-firefox-v1.0.8.zip` — the same files, for a later Mozilla submission

The filename follows `manifest.json`. The Chrome zip is a different file and does not get a Firefox id.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `dist-firefox/manifest.json`.

Firefox 140 or newer is required. Firefox for Android requires 142. The extension id inside the package is `spades-ux-shield@vinayak509143`. The package tells Firefox this extension collects no personal data. Keep that id if this is later submitted to Mozilla.

Firefox removes a temporary add-on when it quits. An install that stays after restart needs a Mozilla listing.

## What is different on Firefox

Rules, the popup, and the 12-hour list sync are the same. Firefox starts the background script as an event page, because it does not run extension service workers. Closed shadow roots are not pierced, because Firefox does not provide Chrome's closed-shadow API. Open shadow roots still are.
