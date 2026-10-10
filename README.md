# Pushpa Jewellers — Website

A static website for **Pushpa Jewellers (Pvt) Ltd**, *Forever Quality & Trust*,
since 1967. Negombo and Katunayake, Sri Lanka.

Design: **Plum, Gold & Petal**. Petal ivory is the paper, Pushpa plum the brand,
gold the metal. One mark (the Pushpa flower, since *pushpa* means flower) and one
frame (the arch).

Two pages: the home page (`index.html`) and the shop (`shop/index.html`, at `/shop/`).

No build step, no dependencies. It is hosted on Vercel at
**https://pushpa-jewellers.vercel.app**. Locally, serve the folder (the shop needs a server,
since it lives at `/shop/`):

```bash
python3 -m http.server 8000
```

A plain static server has no `/api/gold`, so locally the top bar shows
"Call 031 223 8822 for today's gold rate" instead of the rate.

`node build.js` inlines the CSS, JS, favicon and every image of the home page into a
single self-contained `dist/pushpa-jewellers.html`, for hosting that serves one file
(it too shows the call line in place of the rate, and has no shop).

## Files

```
index.html               the home page: markup, the inline SVG icon sprite, JSON-LD
shop/index.html          the shop
assets/css/styles.css    design tokens and all layout, both pages
assets/js/site.js        shared by both pages: header, menus, gold rate bar, copy buttons,
                         header shrinking on scroll, reveals, the entrance
assets/js/main.js        home page only: hero turn, Suba Mangala calculator and enrolment,
                         order tracking, opening-hours week, the welcome
assets/js/pieces.js      the shop's catalogue, one line per piece
assets/js/pieces-instagram.js   Pushpa's 32 Instagram pieces, kept for switching back
assets/js/shop.js        the shop: grid, filters, sorting, and each piece's page
assets/img/              photographs (webp) and favicon
assets/img/shop/         the shop photos, 1080 x 1350, and small/ grid copies, 540 x 675
assets/img/orn/          gold ornaments: corner, dividers, mandalas (svg)
api/gold.js              today's gold rate, a Vercel function served at /api/gold
tools/frame-photos.py    frames a product photo of any size for the shop, or cuts a close-up from it
tools/shop-thumbs.py     makes the small grid copies of new shop photos
```

## The shop

`/shop/` shows every piece in `assets/js/pieces.js` in list order, with its weight in grams and
in pawn (8 g) where one is known. Visitors can filter by necklaces, bangles, rings, pendants,
bracelets or bridal, and sort by weight (the sort appears once any piece has a weight). Each
piece has its own page at `/shop/?piece=<slug>`: the large photo with the piece's other photos
underneath (tap one to show it, or swipe across the photo on a phone), weight, description, today's 22K rate, an "Ask about this piece" button that
opens WhatsApp with the piece's name filled in, a call button, a link to its Instagram post when
it has one, and more pieces of the same kind. Filters and sorting are in the address too
(`/shop/?cat=bangles&sort=light`), so any view can be shared; the home page's collection tiles
open the shop filtered this way.

**What it shows now.** 93 sample pieces photographed for another client, used with permission
to preview the shop with clean product photography until Pushpa's own photographs arrive. They
have no weights. Each has a close-up as its last photo, cut from its main photo by
`frame-photos.py --closeup`; six also have a second real photo. Pushpa's 32 Instagram pieces are kept in `assets/js/pieces-instagram.js` with
their photos; to show them instead, change `pieces.js` to `pieces-instagram.js` in
`shop/index.html`.

**To add a piece:**

1. Frame its photo for the shop. Any size works:
   `python3 tools/frame-photos.py path/to/photo.jpg rose-ring`
   This finds the piece, centres it in the shop's 4:5 frame (1080 x 1350) with the photo's own
   background carried out to the edges, and writes `assets/img/shop/rose-ring.webp` and its grid
   copy in `small/`. A second photo of the same piece: `... photo2.jpg rose-ring-2`. A close-up
   cut from the same photo: `python3 tools/frame-photos.py --closeup path/to/photo.jpg rose-ring-2`.
   Real photos from other angles show the piece better than a close-up, so use those when there are some.
   (Needs Pillow and NumPy. A photo already 1080 x 1350 can go straight into `assets/img/shop/`,
   then `python3 tools/shop-thumbs.py` makes its grid copy.)
2. Add a line at the top of `assets/js/pieces.js`, with `photos: 2` if it has a second photo
   (`photos: 3` for three, and so on).
   The comments there explain each field.

The shop page shares the home page's header, menus, footer and gold rate panel. They are
copied into `shop/index.html` with links pointing back to the home page, so a change to any
of them has to be made in both files.

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
2. **The collection.** Necklaces, bangles, rings and pendants, each opening the shop filtered to it.
3. **Marks.** 916, 750, 1967 and "weighed for you" stamps.
4. **Suba Mangala.** The 6 and 12 month gold purchase plan, with a calculator and the full plan table.
5. **Track your order.** Order or repair-bill lookup, sent on WhatsApp.
6. **Services.** Pawning, money exchange and airline ticketing.
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
