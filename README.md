# Pushpa Jewellers — Landing Page

A static landing page for **Pushpa Jewellers (Pvt) Ltd**, *Forever Quality & Trust*,
since 1967. Negombo and Katunayake, Sri Lanka.

Design: **Plum, Gold & Petal**. Petal ivory is the paper, Pushpa plum the brand,
gold the metal. One mark (the Pushpa flower, since *pushpa* means flower) and one
frame (the arch).

No build step, no dependencies. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

`node build.js` inlines the CSS, JS, favicon and every image into a single
self-contained `dist/pushpa-jewellers.html`, for hosting that serves one file.

## Files

```
index.html               markup, the inline SVG icon sprite, JSON-LD
assets/css/styles.css    design tokens and all layout
assets/js/main.js        hero turn, Suba Mangala calculator, enrol dialog, order tracking,
                         opening-hours week, scroll reveals
assets/img/              photographs (webp) and favicon
assets/img/orn/          gold ornaments: corner, dividers, mandalas (svg)
```

## Sections

1. **Hero.** Opens on Pushpa in 1967, then turns to today. The 1967 / Today switch moves between them.
2. **Marks.** 916, 750, 1967 and "weighed for you" stamps.
3. **Suba Mangala.** The 6 and 12 month gold purchase plan, with a calculator and the full plan table.
4. **Track your order.** Order or repair-bill lookup, sent on WhatsApp.
5. **Services.** Pawning, money exchange and airline ticketing.
6. **The collection.** Necklaces, bangles, rings and pendants.
7. **About.** 1967, the pride of Negombo.
8. **Visit.** This week's opening hours in Sri Lanka time, three showrooms, phone lines.

### The hero is 16:9 on desktop

Both hero photographs are 1920 x 1080, so from 821px wide the hero takes that same
16:9 shape and shows each bride whole, uncropped. On screens shorter than 16:9
(most laptops, once the browser bar is counted) the hero runs a little past the
fold, so the headline and buttons are centred in the part you see on arrival, and
the 1967 / Today switch is lifted onto the first screen. Below 821px the phone
layout puts the photo on top and the copy underneath.

The rule is the `desktop: the hero is 16:9` block in `styles.css`.

## Suba Mangala figures

On the 6 month plan the cash gift is half of one instalment. On the 12 month plan
it is one full instalment. Instalments run Rs 1,000 to Rs 10,000 in steps of 1,000.
The calculator and both plan tables come from the one `plan()` function in `main.js`.

## WhatsApp

There is no backend. Enrolling, tracking and every "Ask about" link open WhatsApp
with the message pre-filled. The number is at the top of `main.js` and in the
`wa.me` links in `index.html`:

```js
var WA = 'https://wa.me/94777770203?text=';
```

## Fonts

- **The Seasons** (Adobe Fonts kit `tiq7fhn`) for the big headlines. **Add the
  site's domain to this kit in Adobe Fonts > Web Projects**, or the kit will not
  serve on the live site. The page falls back to Cinzel if it does not load.
- **Cinzel, Figtree, Pinyon Script, Noto Serif Sinhala and Noto Serif Tamil**
  from Google Fonts.

## Business details used on the page

**Please check each one before the site goes live.**

| | |
|---|---|
| Founded | 1967, Greens Road, Negombo |
| Showrooms | 67 Greens Road, Negombo (head office) · 150A Sea Street, Negombo · 8A Averiwatte, Katunayake |
| Hotline | 031 223 8822 |
| Tel | 031 223 3857 · 031 222 2404 · Katunayake 011 225 4689 |
| WhatsApp | 077 777 0203 |
| Hours | Mon–Sat 9.15 am – 7.30 pm · Sun 9.15 am – 2.00 pm |
| Instagram | [@pushpajewellers_official](https://www.instagram.com/pushpajewellers_official/) |
| Facebook | [pushpajewellerspvtltd](https://www.facebook.com/pushpajewellerspvtltd/) |
| Services | Suba Mangala plan, order and repair tracking, pawning, money exchange (Western Union, MoneyGram, Ria), airline ticketing |

The same details are in the `JewelryStore` JSON-LD in `<head>`. Update both together.

## Product photography

`tools/fetch-images.sh` pulls a whole WordPress/WooCommerce media library into
`product-images/`, with a `manifest.tsv` of titles and alt text:

```sh
sh tools/fetch-images.sh https://saravanas.lk
```

**Before using any photograph, confirm it is the client's to use** and that the
licence covers commercial use.

## Notes

- Responsive from 320px up, with no horizontal scroll.
- Honours `prefers-reduced-motion`. The intro, hero turn, reveals and coin
  animations all switch off.
- Focus states, ARIA labels and live regions throughout. The Sinhala and Tamil
  lines carry `lang` attributes.
