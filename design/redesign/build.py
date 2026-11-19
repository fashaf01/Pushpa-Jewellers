# Inlines the fonts and photos into one self-contained preview page.
import base64, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
site = sys.argv[1]
out = sys.argv[2]
IMGS = {
    'lockup': 'assets/img/lockup.webp', 'hero': 'assets/img/hero-1.webp',
    'cat-necklaces': 'assets/img/cat-necklaces.webp', 'cat-rings': 'assets/img/cat-rings.webp',
    'cat-bangles': 'assets/img/cat-bangles.webp', 'cat-pendants': 'assets/img/cat-pendants.webp',
    'p1': 'assets/img/shop/small/stacked-bar-bangle.webp', 'p2': 'assets/img/shop/small/gold-leaf-bridal-necklace.webp',
    'p3': 'assets/img/shop/small/five-stone-ring.webp', 'p4': 'assets/img/shop/small/enamel-flower-bracelet.webp',
}
def uri(path, mime):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(path, 'rb').read()).decode())
html = open(os.path.join(here, 'template.html')).read()
html = re.sub(r'\{\{IMG:([\w-]+)\}\}', lambda m: uri(os.path.join(site, IMGS[m.group(1)]), 'image/webp'), html)
html = re.sub(r'\{\{FONT:([\w-]+)\}\}', lambda m: '"' + uri(os.path.join(here, 'fonts', m.group(1) + '.woff2'), 'font/woff2') + '"', html)
left = re.findall(r'\{\{[^}]+\}\}', html)
assert not left, left
open(out, 'w').write(html)
print(out, '%d KB' % (len(html) // 1024))
