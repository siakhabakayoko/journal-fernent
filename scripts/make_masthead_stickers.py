#!/usr/bin/env python3
"""Generate sticker-style masthead portraits matching Ferñent reference.

Usage (from repo root, with /workspace/.venv-img):
  /workspace/.venv-img/bin/python scripts/make_masthead_stickers.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from rembg import new_session, remove

FERNENT_RED = (225, 6, 0, 255)  # #E10600
OUT_SIZE = 1024
CIRCLE_DIAM = int(OUT_SIZE * 0.80)
CIRCLE_CX = OUT_SIZE // 2
CIRCLE_CY = int(OUT_SIZE * 0.58)
OUTLINE_ITERS = 4
SHADOW_BLUR = 14
SHADOW_OFFSET = (5, 8)
SHADOW_ALPHA = 100

ABOUT = Path(__file__).resolve().parents[1] / "public" / "about"
SOURCES = [
    (ABOUT / "assane-samb.jpg", ABOUT / "masthead-assane.png"),
    (ABOUT / "birane-gaye.jpg", ABOUT / "masthead-birane.png"),
]


def remove_bg(img: Image.Image, session) -> Image.Image:
    out = remove(img.convert("RGB"), session=session)
    return out.convert("RGBA")


def to_grayscale_keep_alpha(rgba: Image.Image) -> Image.Image:
    r, g, b, a = rgba.split()
    gray = ImageOps.grayscale(Image.merge("RGB", (r, g, b)))
    gray = ImageOps.autocontrast(gray, cutoff=1)
    return Image.merge("RGBA", (gray, gray, gray, a))


def bbox_opaque(alpha: Image.Image, thresh: int = 20) -> tuple[int, int, int, int]:
    a = np.array(alpha)
    mask = a > thresh
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not rows.any() or not cols.any():
        return (0, 0, alpha.width, alpha.height)
    y0, y1 = np.where(rows)[0][[0, -1]]
    x0, x1 = np.where(cols)[0][[0, -1]]
    return int(x0), int(y0), int(x1) + 1, int(y1) + 1


def crop_to_subject(rgba: Image.Image, pad: int = 2) -> Image.Image:
    x0, y0, x1, y1 = bbox_opaque(rgba.split()[-1])
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(rgba.width, x1 + pad)
    y1 = min(rgba.height, y1 + pad)
    return rgba.crop((x0, y0, x1, y1))


def dilate_alpha(alpha: Image.Image, iters: int) -> Image.Image:
    a = alpha
    for _ in range(iters):
        a = a.filter(ImageFilter.MaxFilter(9))
    a = a.filter(ImageFilter.GaussianBlur(1.5))
    return a.point(lambda p: 255 if p > 48 else 0)


def multiply_alpha(rgba: Image.Image, mask: Image.Image) -> Image.Image:
    a = rgba.split()[-1]
    out = (
        np.array(a, dtype=np.float32) * (np.array(mask, dtype=np.float32) / 255.0)
    ).astype(np.uint8)
    return Image.fromarray(out, mode="L")


def compose(cut: Image.Image, out_path: Path) -> None:
    cut = to_grayscale_keep_alpha(cut)
    cut = crop_to_subject(cut)

    circle_r = CIRCLE_DIAM // 2
    circle_top = CIRCLE_CY - circle_r
    circle_bot = CIRCLE_CY + circle_r
    circle_bbox = [
        CIRCLE_CX - circle_r,
        CIRCLE_CY - circle_r,
        CIRCLE_CX + circle_r,
        CIRCLE_CY + circle_r,
    ]

    target_w = int(CIRCLE_DIAM * 0.90)
    scale = target_w / cut.width
    target_h = int(cut.height * scale)

    peek_top = int(OUT_SIZE * 0.025)
    desired_h = circle_bot - peek_top + int(OUT_SIZE * 0.02)
    if target_h < desired_h * 0.92 or target_h > desired_h * 1.15:
        scale = desired_h / cut.height
        target_w = int(cut.width * scale)
        target_h = int(cut.height * scale)

    max_w = int(OUT_SIZE * 0.92)
    if target_w > max_w:
        scale = max_w / cut.width
        target_w = int(cut.width * scale)
        target_h = int(cut.height * scale)

    cut = cut.resize((max(1, target_w), max(1, target_h)), Image.Resampling.LANCZOS)
    paste_x = CIRCLE_CX - cut.width // 2
    paste_y = peek_top

    bottom = paste_y + cut.height
    if bottom < circle_bot - 40:
        shift = min(circle_bot - 20 - bottom, paste_y - int(OUT_SIZE * 0.02))
        if shift > 0:
            paste_y += shift

    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))

    circle_layer = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(circle_layer).ellipse(circle_bbox, fill=FERNENT_RED)
    canvas = Image.alpha_composite(canvas, circle_layer)

    alpha = cut.split()[-1]
    outline_a = dilate_alpha(alpha, OUTLINE_ITERS)

    black = Image.new("L", cut.size, 0)
    sh = Image.merge(
        "RGBA",
        (
            black,
            black,
            black,
            outline_a.point(lambda p: int(p * SHADOW_ALPHA / 255) if p else 0),
        ),
    ).filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
    sh_layer = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    sh_layer.paste(sh, (paste_x + SHADOW_OFFSET[0], paste_y + SHADOW_OFFSET[1]), sh)

    sticker = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    white = Image.new("L", cut.size, 255)
    outline_img = Image.merge("RGBA", (white, white, white, outline_a))
    sticker.paste(outline_img, (paste_x, paste_y), outline_img)
    sticker.paste(cut, (paste_x, paste_y), cut)

    # Bottom of body clipped to red circle; head (and natural shoulder tops) peek above
    clip = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
    d = ImageDraw.Draw(clip)
    d.rectangle([0, 0, OUT_SIZE, circle_top], fill=255)
    d.ellipse(circle_bbox, fill=255)

    sticker.putalpha(multiply_alpha(sticker, clip))
    sh_layer.putalpha(multiply_alpha(sh_layer, clip))

    canvas = Image.alpha_composite(canvas, sh_layer)
    canvas = Image.alpha_composite(canvas, sticker)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} size={canvas.size}")


def main() -> None:
    print("Loading rembg session u2net_human_seg ...")
    session = new_session("u2net_human_seg")
    for jpg, dst in SOURCES:
        print(f"Processing {jpg.name} -> {dst.name} ...")
        cut = remove_bg(Image.open(jpg), session)
        compose(cut, dst)
    print("Done.")


if __name__ == "__main__":
    main()
