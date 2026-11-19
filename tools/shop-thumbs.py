#!/usr/bin/env python3
"""Makes the 540 x 675 grid copies of the shop photos.

Every assets/img/shop/<slug>.webp without a copy in assets/img/shop/small/ gets one.
Run it after adding photos:  python3 tools/shop-thumbs.py   (needs Pillow: pip install pillow)
"""
import os
from PIL import Image

shop = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img', 'shop')
small = os.path.join(shop, 'small')
os.makedirs(small, exist_ok=True)

made = 0
for name in sorted(os.listdir(shop)):
    if not name.endswith('.webp') or os.path.exists(os.path.join(small, name)):
        continue
    im = Image.open(os.path.join(shop, name)).convert('RGB')
    im.resize((540, round(540 * im.height / im.width)), Image.LANCZOS).save(os.path.join(small, name), 'WEBP', quality=80, method=6)
    made += 1
    print('made small/' + name)
print(f'{made} new grid cop{"y" if made == 1 else "ies"}')
