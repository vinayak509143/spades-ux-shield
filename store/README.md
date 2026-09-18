# Chrome Web Store assets

**Original:** keep `Firefly.png` or `original-banner.png` here (never overwritten).

**Generate** (letterbox — full logo + text, no content crop):

```powershell
python scripts/prepare-chrome-store-images.py
```

| Output | Size |
|--------|------|
| `icon-128.png` | 128×128 (shield crop only) |
| `marquee-1400x560.png` | Marquee promo |
| `promo-1280x800.png` | Screenshot / large promo |
| `promo-small-440x280.png` | Small promo tile |

You do **not** need Photopea unless you want manual touch-ups.
