# Firefox local package

Date: 2026-10-01
Status: approved

## Goal

Build a Firefox package from this repo so the extension can be loaded locally. The Chrome Web Store zip and `manifest.json` stay unchanged.

## Package

`npm run package:firefox` runs the existing build, copies the same files the Chrome zip contains, and writes a Firefox-only manifest into that copy.

Outputs:

- `dist-firefox/` unpacked extension
- `spades-ux-shield-firefox-v1.0.8.zip` (filename follows `package.json` version)

Version stays **1.0.8**.

The build fails if the Firefox zip is missing the Firefox id, or if the Chrome zip for the same version contains `browser_specific_settings`.

## Manifest (Firefox zip only)

```json
"browser_specific_settings": {
  "gecko": {
    "id": "spades-ux-shield@vinayak509143",
    "strict_min_version": "140.0",
    "data_collection_permissions": {
      "required": ["none"]
    }
  },
  "gecko_android": {
    "strict_min_version": "142.0"
  }
}
```

- The id is permanent. A later Mozilla listing must use this same id.
- Minimum Firefox is **140**. Firefox for Android is **142**. Those are the versions that understand the no-data declaration.
- `data_collection_permissions` is `required: ["none"]`. The extension does not collect or transmit personal data. This declaration is required for a new addons.mozilla.org submission.

## Behavior

Same rules, popup, and 12-hour list sync.

Firefox does not run extension service workers. The Firefox manifest lists `background.scripts` instead of `background.service_worker`, and the staged background file is a classic script. The Chrome manifest and Chrome bundle stay a module service worker.

Firefox accepts the `chrome.*` calls this extension uses. Synced CSS uses a document id when Firefox provides one, and the frame id otherwise. Closed shadow roots are not pierced on Firefox. Open shadow roots still are.

## Install

Firefox, `about:debugging`, This Firefox, Load Temporary Add-on, select `dist-firefox/manifest.json`.

Firefox removes a temporary add-on when it quits. An install that survives restart is a later Mozilla store submission.

## Checks

Unit test: adding Firefox settings does not mutate the Chrome manifest, and rejects a manifest that already has `browser_specific_settings`.

`verify-firefox-zip` reads `manifest.json` from inside the Firefox zip and checks the id, minimum version, and required files. If `spades-ux-shield-v1.0.8.zip` exists, its manifest must not contain `browser_specific_settings`.
