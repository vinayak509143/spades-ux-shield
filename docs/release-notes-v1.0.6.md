## Spades UX-Shield v1.0.6

**Chrome Web Store:** upload `spades-ux-shield-v1.0.6.zip` from this release. Privacy policy: https://github.com/vinayak509143/spades-ux-shield/blob/main/PRIVACY.md

Store copy (short/long description, permissions): see [store/LISTING.md](../store/LISTING.md).

### Highlights

- **Amazon retail (23 storefronts):** `data-op-amz` host marks + `amazon-retail` / `amazon-en` list aliases — PDP social-proof and deal-badge hides without matching `aws.amazon.com`.
- **Amazon.in:** homepage GWM / ATF promos (unchanged scope).
- **Spades Darklist** `202609202100` — synced from [spades-ux-shield-filters](https://github.com/vinayak509143/spades-ux-shield-filters).
- Release zip verified via `npm run verify:zip`.

### Install (Load unpacked)

1. Download and extract so `manifest.json` is in the folder root.
2. `chrome://extensions` → Developer mode → **Load unpacked**.

### Verify (optional)

```bash
npm run verify:amazon
```

Headed Chrome only; checks amazon.in, amazon.com / .co.uk / .de, and aws.amazon.com must-not.
