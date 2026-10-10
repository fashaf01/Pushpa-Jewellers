#!/usr/bin/env python3
"""Frames a product photo of any size for the shop.

Finds the piece in the photo, centres it with even margins in the shop's 4:5 frame, and extends the photo's own
background where the frame runs past the edge. Pieces that hang from the top (chains, collars) stay pinned to the
top edge. Styled backdrops (a coloured box behind the piece) are centre-cropped instead.

    python3 tools/frame-photos.py <photo> <slug>          e.g.  python3 tools/frame-photos.py ~/ring.jpg rose-ring

writes assets/img/shop/<slug>.webp (1080 x 1350) and assets/img/shop/small/<slug>.webp (540 x 675).
For a second photo of the same piece use the slug rose-ring-2, and so on. Needs Pillow and NumPy.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 1080, 1350
SHOP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img', 'shop')


def piece_mask(arr):
    """The gold and stones: saturated or dark pixels, against a pale, unsaturated background."""
    f = arr.astype(np.float32) / 255
    mx, mn = f.max(2), f.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return (sat > 0.22) | (mx < 0.45)


def piece_box(arr):
    ys, xs = np.nonzero(piece_mask(arr))
    if len(xs) < 50:
        return None
    return (np.percentile(xs, 0.3), np.percentile(ys, 0.3), np.percentile(xs, 99.7), np.percentile(ys, 99.7))


def is_backdrop(arr):
    """A styled backdrop: the photo's border itself is strongly coloured."""
    b = np.concatenate([arr[:8].reshape(-1, 3), arr[-8:].reshape(-1, 3), arr[:, :8].reshape(-1, 3), arr[:, -8:].reshape(-1, 3)]).astype(np.float32) / 255
    mx, mn = b.max(1), b.min(1)
    return np.median((mx - mn) / np.maximum(mx, 1e-6)) > 0.3


def extend(img, l, t, r, b):
    """Pad by carrying the background outward. The piece is painted out first (replaced by the blurred background
    around it), so a chain crossing an edge is not smeared into the padding; the original photo sits in the middle."""
    if max(l, t, r, b) == 0:
        return img
    arr = np.asarray(img)
    m = Image.fromarray((piece_mask(arr) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    bgc = tuple(int(v) for v in np.median(arr[~np.asarray(m).astype(bool)], axis=0))
    flat = Image.composite(Image.new('RGB', img.size, bgc), img, m)
    clean = Image.composite(flat.filter(ImageFilter.GaussianBlur(40)), img, m)
    out = Image.fromarray(np.pad(np.asarray(clean), ((t, b), (l, r), (0, 0)), mode='edge'))
    out.paste(img, (l, t))
    soft = out.filter(ImageFilter.GaussianBlur(14))
    mask = Image.new('L', out.size, 255)
    mask.paste(0, (l, t, l + img.width, t + img.height))
    return Image.composite(soft, out, mask.filter(ImageFilter.GaussianBlur(10)))


def frame(path):
    img = Image.open(path).convert('RGB')
    arr = np.asarray(img)
    w, h = img.size
    if is_backdrop(arr):
        cw = min(w, round(h * 4 / 5)); ch = round(cw * 5 / 4)
        x0, y0 = (w - cw) // 2, (h - ch) // 2
        return img.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.LANCZOS)
    x0, y0, x1, y1 = piece_box(arr) or (0, 0, w, h)
    bw, bh = x1 - x0, y1 - y0
    m = 0.11 * max(bw, bh * 0.8)
    cw = max(bw + 2 * m, (bh + 2 * m) * 4 / 5); ch = cw * 5 / 4
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if y0 <= 0.06 * h:
        cy = ch / 2
    L, T = round(cx - cw / 2), round(cy - ch / 2)
    R, B = L + round(cw), T + round(ch)
    if R - L <= w:
        L, R = (0, R - L) if L < 0 else ((w - (R - L), w) if R > w else (L, R))
    if B - T <= h:
        T, B = (0, B - T) if T < 0 else ((h - (B - T), h) if B > h else (T, B))
    pl, pt, pr, pb = max(0, -L), max(0, -T), max(0, R - w), max(0, B - h)
    big = extend(img, pl, pt, pr, pb)
    return big.crop((L + pl, T + pt, R + pl, B + pt)).resize((W, H), Image.LANCZOS)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    photo, slug = sys.argv[1], sys.argv[2]
    im = frame(photo)
    os.makedirs(os.path.join(SHOP, 'small'), exist_ok=True)
    im.save(os.path.join(SHOP, slug + '.webp'), 'WEBP', quality=86, method=6)
    im.resize((540, 675), Image.LANCZOS).save(os.path.join(SHOP, 'small', slug + '.webp'), 'WEBP', quality=80, method=6)
    print(f'assets/img/shop/{slug}.webp and small/{slug}.webp')
