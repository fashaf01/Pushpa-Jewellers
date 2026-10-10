# Pushpa Jewellers — Landing Page

A static landing page for **Pushpa Jewellers (Pvt) Ltd**, *Forever Quality & Trust*,
since 1967. Negombo and Katunayake, Sri Lanka.

Design: **Plum, Gold & Petal**. Petal ivory is the paper, Pushpa plum the brand,
gold the metal. One mark (the Pushpa flower, since *pushpa* means flower) and one
frame (the arch).

No build step, no dependencies. It is hosted on Vercel at
**https://pushpa-jewellers.vercel.app**. Locally, open `index.html` or serve the folder:

```bash
python3 -m http.server 8000
```

A plain static server has no `/api/gold`, so locally the top bar shows
"Call 031 223 8822 for today's gold rate" instead of the rate.

`node build.js` inlines the CSS, JS, favicon and every image into a single
self-contained `dist/pushpa-jewellers.html`, for hosting that serves one file
(it too shows the call line in place of the rate).

## Files

```
index.html               markup, the inline SVG icon sprite, JSON-LD
assets/css/styles.css    design tokens and all layout
assets/js/main.js        hero turn, Suba Mangala calculator, enrol dialog, order tracking,
                         opening-hours week, scroll reveals
assets/img/              photographs (webp) and favicon
assets/img/orn/          gold ornaments: corner, dividers, mandalas (svg)
api/gold.js              today's gold rate, a Vercel function served at /api/gold
```

## Today's gold rate

The bar at the top of the page shows 24K and 22K per pawn (8 g); tapping it shows
per gram too. It stays at the top while the page scrolls.

The page calls `/api/gold` (`api/gold.js`). That function converts the international
gold price (gold-api.com) into rupees with the day's USD/LKR rate (open.er-api.com),
and Vercel's CDN keeps each answer for an hour. 22K is 22/24 of the 24K price. The
page reloads the rate every 30 minutes and whenever the tab comes back into view.

This is the market price, not the counter price, and the two can differ; the
details panel says so. To show the showroom's own counter rate instead, set
`GOLD_24K_PAWN_LKR` and `GOLD_22K_PAWN_LKR` (whole rupees per pawn, for example
`360000`) in the Vercel project under Settings > Environment Variables, then
redeploy. Remove them to go back to the market price.

If the rate cannot be fetched, the bar reads "Call 031 223 8822 for today's gold rate".

## Sections

1. **Hero.** Opens on Pushpa in 1967, then turns to today. The 1967 / Today switch moves between them.
   On phones the photo comes first, with the switch on its bottom edge and the copy centred below:
   a label, a two-line headline, one button and a text link.
2. **Marks.** 916, 750, 1967 and "weighed for you" stamps.
3. **Suba Mangala.** The 6 and 12 month gold purchase plan, with a calculator and the full plan table.
4. **Track your order.** Order or repair-bill lookup, sent on WhatsApp.
5. **Services.** Pawning, money exchange and airline ticketing.
6. **The collection.** Necklaces, bangles, rings and pendants.
7. **About.** 1967, the pride of Negombo.
8. **Visit.** This week's opening hours in Sri Lanka time, three showrooms, phone lines.

### Hero photos: one size for desktop, one for phones

Each hero photo (today, and 1967) comes in two sizes, so four files in all. Every
desktop screen shows the desktop photo in the same shape, and every phone the phone photo.

| | Desktop (821px and wider) | Phone (820px and narrower) |
|---|---|---|
| Shape | 12:5 | 4:5 |
| Size | **1920 x 800** | **1080 x 1350** (an Instagram portrait post) |
| Files | `hero-now.webp`, `hero-then.webp` | `hero-now-mobile.webp`, `hero-then-mobile.webp` |
| Framing | Put the bride in the right half. The left half sits under the headline and is darkened. | The whole photo shows; only the bottom fifth fades into plum, with the 1967 / Today switch on its bottom edge. Keep the face and jewellery above that. |

To change a photo, replace the file in `assets/img/` with one of the same name and
size. The files there now are crops of the original 1920 x 1080 photographs (the phone
crops are 864 x 1080, the same 4:5 shape).

At 12:5 the whole hero, the 1967 / Today switch included, fits on the first screen of
most laptops and desktops. Between 821px and 1279px wide the headline needs a little
more height than 12:5 gives, so the hero grows and trims the photo's sides. Tablets
use the phone photo with its height capped at 680px, which trims the bottom. The rules
are the `desktop: one shape on every screen` block and the `phones:` lines in `styles.css`.

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
