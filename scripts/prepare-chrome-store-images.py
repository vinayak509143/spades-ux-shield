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

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store"
FALLBACK_BG = (14, 16, 20)


def default_source() -> Path | None:
    candidates = [
        "Spadeslogoonly.png",
        "Spadeslogoonly.PNG",
        "shield-only.png",
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


def detect_shield_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """Tight bbox of the cyan shield. Drops the dim browser frame; keeps the shield point."""
    w, h = img.size
    px = img.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(int(h * 0.02), int(h * 0.98)):
        for x in range(int(w * 0.02), int(w * 0.98)):
            r, g, b = px[x, y][:3]
            if b > 110 and g > 90 and b >= g - 20 and (g + b) > r * 2.4 and (g + b) > 220:
                xs.append(x)
                ys.append(y)
    if len(xs) < 1000:
        raise RuntimeError("Could not find shield in banner (not enough cyan pixels)")
    xs.sort()
    ys.sort()
    n = len(xs)

    def pct(vals: list[int], p: float) -> int:
        return vals[min(n - 1, max(0, int(n * p)))]

    # Keep the shield point; trim dim browser chrome on the sides/top.
    minx = pct(xs, 0.06)
    maxx = pct(xs, 0.94)
    miny = pct(ys, 0.04)
    maxy = pct(ys, 0.94)
    return minx, miny, maxx, maxy


def is_shield_pixel(r: int, g: int, b: int) -> bool:
    return b > 110 and g > 90 and b >= g - 20 and (g + b) > r * 2.4 and (g + b) > 220


def square_logo_rgba(img: Image.Image) -> Image.Image:
    """Fit an already-transparent logo onto a square canvas. No recolor/cutout."""
    src = img.convert("RGBA")
    bbox = src.split()[3].getbbox()
    if bbox:
        src = src.crop(bbox)
    cw, ch = src.size
    side = int(max(cw, ch) * 1.04)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(src, ((side - cw) // 2, (side - ch) // 2), src)
    return canvas


def extract_shield_rgba(img: Image.Image) -> Image.Image:
    """
    Opaque shield badge on transparent pixels.

    Do not keep the photo's charcoal square (looks like a tile on chrome://extensions).
    Do not keep wireframe-only (looks faded). Fill the shield silhouette, then stamp
    the original cyan mesh and spade at alpha 255.
    """
    rgb = img.convert("RGB")
    minx, miny, maxx, maxy = detect_shield_bbox(rgb)
    pad = 6
    rgb = rgb.crop(
        (
            max(0, minx - pad),
            max(0, miny - pad),
            min(rgb.size[0], maxx + pad),
            min(rgb.size[1], maxy + pad),
        )
    )
    w, h = rgb.size
    px = rgb.load()
    cyan_m = Image.new("L", (w, h), 0)
    cm = cyan_m.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if is_shield_pixel(r, g, b):
                cm[x, y] = 255

    cyan_m = cyan_m.filter(ImageFilter.MaxFilter(7))
    cm = cyan_m.load()
    filled = Image.new("L", (w, h), 0)
    fp = filled.load()
    for y in range(h):
        xs = [x for x in range(w) if cm[x, y] > 128]
        if len(xs) < 2:
            continue
        for x in range(xs[0], xs[-1] + 1):
            fp[x, y] = 255
    filled = filled.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    fp = filled.load()

    body = (8, 32, 40)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    cx0, cx1 = int(w * 0.28), int(w * 0.72)
    cy0, cy1 = int(h * 0.22), int(h * 0.72)

    for y in range(h):
        for x in range(w):
            if fp[x, y] < 128:
                continue
            r, g, b = px[x, y]
            luma = r + g + b
            if is_shield_pixel(r, g, b):
                # Punch up the neon; never drop alpha.
                g2 = min(255, int(g * 1.15))
                b2 = min(255, int(b * 1.2))
                r2 = min(r, 80)
                op[x, y] = (r2, g2, b2, 255)
            elif cx0 <= x <= cx1 and cy0 <= y <= cy1 and luma < 70:
                op[x, y] = (12, 14, 16, 255)
            else:
                op[x, y] = (*body, 255)

    bbox = filled.getbbox()
    if bbox is None:
        raise RuntimeError("Shield mask was empty")
    cut = out.crop(bbox)
    cw, ch = cut.size
    side = int(max(cw, ch) * 1.04)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cut, ((side - cw) // 2, (side - ch) // 2), cut)
    return canvas


def main() -> None:
    icons_only = "--icons-only" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--icons-only"]
    if args:
        src = Path(args[0])
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
    raw = Image.open(src)
    print(f"Source: {src} ({raw.size[0]}x{raw.size[1]} {raw.mode})")

    has_alpha = raw.mode in ("RGBA", "LA") or (raw.mode == "P" and "transparency" in raw.info)
    if has_alpha:
        icon_sq = square_logo_rgba(raw)
    else:
        icon_sq = extract_shield_rgba(raw.convert("RGB"))
    for size, name in ((128, "icon-128.png"), (48, "icon-48.png"), (16, "icon-16.png")):
        path = OUT / name
        icon_sq.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)
        print(f"Wrote {path} ({size}x{size} RGBA)")

    if icons_only:
        print("Icons only — used your logo as-is (transparent square).")
        return

    banner = raw.convert("RGB")
    bg = sample_edge_background(banner)

    fit_contain(banner, 1400, 560, bg).save(OUT / "marquee-1400x560.png", optimize=True)
    print("Wrote marquee-1400x560.png (1400x560, full artwork)")

    fit_contain(banner, 1280, 800, bg).save(OUT / "promo-1280x800.png", optimize=True)
    print("Wrote promo-1280x800.png (1280x800, full artwork)")

    fit_contain(banner, 440, 280, bg).save(OUT / "promo-small-440x280.png", optimize=True)
    print("Wrote promo-small-440x280.png (440x280, full artwork)")

    print("Done. Shield+text are never cropped on promos; only side/top bars are padded.")


if __name__ == "__main__":
    main()
