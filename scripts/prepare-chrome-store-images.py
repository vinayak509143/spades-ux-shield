"""
Build Chrome Web Store image assets from the promotional banner.

Promos use letterboxing (fit entire artwork; only empty margin is cropped/padded).

Usage:
  python scripts/prepare-chrome-store-images.py [path-to-banner.png]

Looks for store/original-banner.* or store/Firefly.png by default.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store"
FALLBACK_BG = (14, 16, 20)


def default_source() -> Path | None:
    candidates = [
        "original-banner.png",
        "original-banner.jpg",
        "original-banner.jpeg",
        "Firefly.png",
        "firefly.png",
    ]
    for name in candidates:
        p = OUT / name
        if p.is_file():
            return p
    return None


def sample_edge_background(img: Image.Image) -> tuple[int, int, int]:
    """Average corner pixels so letterbox bars match the banner edges."""
    w, h = img.size
    pts = []
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        pts.append(img.getpixel((x, y))[:3])
    r = sum(p[0] for p in pts) // len(pts)
    g = sum(p[1] for p in pts) // len(pts)
    b = sum(p[2] for p in pts) // len(pts)
    return (r, g, b)


def fit_contain(
    img: Image.Image,
    tw: int,
    th: int,
    bg: tuple[int, int, int],
) -> Image.Image:
    iw, ih = img.size
    scale = min(tw / iw, th / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (tw, th), bg)
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def crop_icon_square(img: Image.Image) -> Image.Image:
    """Shield-only square for 128px store icon (not the full banner text)."""
    w, h = img.size
    side = int(min(w * 0.52, h * 0.95))
    cx = int(w * 0.27)
    cy = int(h * 0.50)
    left = max(0, cx - side // 2)
    top = max(0, cy - side // 2)
    right = min(w, left + side)
    bottom = min(h, top + side)
    left = max(0, right - side)
    top = max(0, bottom - side)
    return img.crop((left, top, right, bottom))


def main() -> None:
    if len(sys.argv) > 1:
        src = Path(sys.argv[1])
    else:
        found = default_source()
        if found is None:
            print(
                "Source image not found.\n"
                "Paste your banner as store/original-banner.png or store/Firefly.png",
                file=sys.stderr,
            )
            sys.exit(1)
        src = found

    if not src.is_file():
        print(f"Source image not found: {src}", file=sys.stderr)
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    banner = Image.open(src).convert("RGB")
    bg = sample_edge_background(banner)
    print(f"Source: {src} ({banner.size[0]}x{banner.size[1]}) letterbox bg={bg}")

    icon_sq = crop_icon_square(banner)
    for size, name in ((128, "icon-128.png"), (48, "icon-48.png"), (16, "icon-16.png")):
        path = OUT / name
        icon_sq.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)
        print(f"Wrote {path} ({size}x{size})")

    fit_contain(banner, 1400, 560, bg).save(OUT / "marquee-1400x560.png", optimize=True)
    print("Wrote marquee-1400x560.png (1400x560, full artwork)")

    fit_contain(banner, 1280, 800, bg).save(OUT / "promo-1280x800.png", optimize=True)
    print("Wrote promo-1280x800.png (1280x800, full artwork)")

    fit_contain(banner, 440, 280, bg).save(OUT / "promo-small-440x280.png", optimize=True)
    print("Wrote promo-small-440x280.png (440x280, full artwork)")

    print("Done. Shield+text are never cropped on promos; only side/top bars are padded.")


if __name__ == "__main__":
    main()
