#!/usr/bin/env python3
"""
Generate PWA/icon assets from a source logo image.

Why:
- `index.html` references `/logo.png`
- `public/manifest.webmanifest` references `pwa-192x192.png` and `pwa-512x512.png`
- Some repos ended up with placeholder files (tiny "Favicon" text), which breaks install icons.

Default outputs (in ./public):
- logo.png (512x512)
- pwa-192x192.png (192x192)
- pwa-512x512.png (512x512)
- logo-westfalia.png (512x512)  # legacy name used by manifest in this repo
- favicon.ico (multi-size)
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def _alpha_bbox(img: Image.Image):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[3]
    return alpha.getbbox()


def _crop_left_square(img: Image.Image) -> Image.Image:
    """Take a square crop from the left side (good for wide logos with an icon on the left)."""
    w, h = img.size
    side = min(w, h)
    return img.crop((0, 0, side, side))


def _make_square_icon(
    src: Image.Image,
    size: int,
    scale: float,
    background_rgba: tuple[int, int, int, int],
) -> Image.Image:
    # Start with the left square crop to avoid tiny text in square icons.
    img = _crop_left_square(src.convert("RGBA"))

    bbox = _alpha_bbox(img)
    if bbox:
        img = img.crop(bbox)

    canvas = Image.new("RGBA", (size, size), background_rgba)
    target = max(1, int(size * scale))

    # Resize while keeping aspect ratio.
    img.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.alpha_composite(img, (x, y))
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="public/logo-dpdl.png", help="Source logo PNG/SVG/JPG path")
    ap.add_argument("--out-dir", default="public", help="Output directory (usually ./public)")
    ap.add_argument(
        "--bg",
        default="#ffffff",
        help="Background color (hex) used for icons (default: white)",
    )
    ap.add_argument(
        "--scale",
        type=float,
        default=0.78,
        help="Icon scale inside the square canvas (default: 0.78)",
    )
    args = ap.parse_args()

    src_path = Path(args.src)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not src_path.exists():
        raise SystemExit(f"Source file not found: {src_path}")

    bg = args.bg.lstrip("#")
    if len(bg) != 6:
        raise SystemExit("bg must be a 6-digit hex color, e.g. #ffffff")
    bg_rgb = tuple(int(bg[i : i + 2], 16) for i in (0, 2, 4))
    bg_rgba = (bg_rgb[0], bg_rgb[1], bg_rgb[2], 255)

    src = Image.open(src_path).convert("RGBA")

    icon_512 = _make_square_icon(src, 512, args.scale, bg_rgba)
    icon_192 = _make_square_icon(src, 192, args.scale, bg_rgba)

    (out_dir / "logo.png").write_bytes(b"")  # ensure file exists even if save fails mid-way
    icon_512.save(out_dir / "logo.png", format="PNG", optimize=True)
    icon_192.save(out_dir / "pwa-192x192.png", format="PNG", optimize=True)
    icon_512.save(out_dir / "pwa-512x512.png", format="PNG", optimize=True)

    # Legacy filename referenced by manifest in this repo.
    icon_512.save(out_dir / "logo-westfalia.png", format="PNG", optimize=True)

    # Favicon (multi-size). Use opaque background for predictable rendering.
    fav_base = _make_square_icon(src, 256, args.scale, bg_rgba)
    fav_base.save(
        out_dir / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )

    print("Wrote:")
    for name in ["logo.png", "pwa-192x192.png", "pwa-512x512.png", "logo-westfalia.png", "favicon.ico"]:
        p = out_dir / name
        print(f"- {p} ({p.stat().st_size} bytes)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

