#!/usr/bin/env python3
"""Generate sticker-style masthead portraits matching Ferñent reference.

All content (silhouette + white outline) stays INSIDE the red circle —
no peek/overflow. Face is zoomed to fill the circle like a tight avatar;
shoulders/chest fill the lower arc.

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
CIRCLE_DIAM = int(OUT_SIZE * 0.92)
CIRCLE_CX = OUT_SIZE // 2
CIRCLE_CY = OUT_SIZE // 2
OUTLINE_ITERS = 3
SHADOW_BLUR = 10
SHADOW_OFFSET = (3, 5)
SHADOW_ALPHA = 80

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


def face_center_and_width(rgba: Image.Image) -> tuple[float, float]:
    """Horizontal face center + head width from upper opaque span."""
    a = np.array(rgba.split()[-1]) > 20
    h, w = a.shape
    row_w = a.sum(axis=1)
    tops = np.where(row_w > max(3, int(w * 0.02)))[0]
    if tops.size == 0:
        return w / 2.0, w * 0.4
    y_top = int(tops[0])
    y1 = min(h - 1, y_top + max(8, int(h * 0.08)))
    y2 = min(h - 1, y_top + max(16, int(h * 0.20)))
    cols = np.where(a[y1 : y2 + 1].any(axis=0))[0]
    if cols.size == 0:
        return w / 2.0, w * 0.4
    return float(cols[0] + cols[-1]) / 2.0, float(cols[-1] - cols[0] + 1)


def dilate_alpha(alpha: Image.Image, iters: int) -> Image.Image:
    a = alpha
    for _ in range(iters):
        a = a.filter(ImageFilter.MaxFilter(7))
    a = a.filter(ImageFilter.GaussianBlur(1.2))
    return a.point(lambda p: 255 if p > 48 else 0)


def multiply_alpha(rgba: Image.Image, mask: Image.Image) -> Image.Image:
    a = rgba.split()[-1]
    out = (
        np.array(a, dtype=np.float32) * (np.array(mask, dtype=np.float32) / 255.0)
    ).astype(np.uint8)
    return Image.fromarray(out, mode="L")


def fit_subject(cut: Image.Image, circle_r: int) -> tuple[Image.Image, int, int]:
    """Scale + position: face large, bottom of bust on the lower arc."""
    face_cx, face_w = face_center_and_width(cut)
    outline_budget = OUTLINE_ITERS * 4 + 10
    usable = float(circle_r * 2 - outline_budget * 2)

    circle_top = CIRCLE_CY - circle_r
    circle_bot = CIRCLE_CY + circle_r

    # Fill disc height with overshoot so the lower arc is covered after clip.
    scale = (usable * 1.18) / cut.height

    # Ensure head is large enough for a tight avatar.
    min_face = usable * 0.55
    max_face = usable * 0.72
    if face_w * scale < min_face:
        scale = min_face / max(face_w, 1.0)
    if face_w * scale > max_face:
        scale = max_face / max(face_w, 1.0)

    tw = max(1, int(round(cut.width * scale)))
    th = max(1, int(round(cut.height * scale)))
    cut = cut.resize((tw, th), Image.Resampling.LANCZOS)

    paste_x = int(round(CIRCLE_CX - face_cx * scale))

    # Bottom-align into the lower arc.
    paste_y = circle_bot - cut.height + int(circle_r * 0.08)
    min_y = circle_top + max(4, outline_budget // 3)
    if paste_y < min_y:
        paste_y = min_y

    return cut, paste_x, paste_y


def compose(cut: Image.Image, out_path: Path) -> None:
    cut = to_grayscale_keep_alpha(cut)
    cut = crop_to_subject(cut)

    circle_r = CIRCLE_DIAM // 2
    circle_bbox = [
        CIRCLE_CX - circle_r,
        CIRCLE_CY - circle_r,
        CIRCLE_CX + circle_r,
        CIRCLE_CY + circle_r,
    ]

    cut, paste_x, paste_y = fit_subject(cut, circle_r)

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

    # Strict circle clip — silhouette + white outline never peek outside.
    clip = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
    ImageDraw.Draw(clip).ellipse(circle_bbox, fill=255)
    sticker.putalpha(multiply_alpha(sticker, clip))
    sh_layer.putalpha(multiply_alpha(sh_layer, clip))

    canvas = Image.alpha_composite(canvas, sh_layer)
    canvas = Image.alpha_composite(canvas, sticker)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path.name} subject={cut.size} paste=({paste_x},{paste_y})")


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
