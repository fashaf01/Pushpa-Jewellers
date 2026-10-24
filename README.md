# Pushpa Jewellers — Website

A static website for **Pushpa Jewellers (Pvt) Ltd**, *Forever Quality & Trust*,
since 1967. Negombo and Katunayake, Sri Lanka.

Design: **Plum, Gold & Petal**. Petal ivory is the paper, Pushpa plum the brand,
gold the metal. One mark (the Pushpa flower, since *pushpa* means flower) and one
frame (the cusped arch of an old doorway). It is meant to feel like a house that has been here since 1967:
book type, old paper, plum like printed velvet, gilt line ornament.

Six pages: the home page (`index.html`), the shop (`shop/index.html`, at `/shop/`), About us (`/about/`), and one page
for each of the three counter services: pawning, money exchange and airline ticketing (`/services/<name>/`). Suba Mangala
and order tracking stay on the home page.

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
(it too shows the call line in place of the rate, and has only the home page, so its links to the shop, About and the
service pages do not work).

## Files

```
index.html               the home page: markup, the inline SVG icon sprite, JSON-LD
shop/index.html          the shop
about/index.html         About us: the story, the marks, how we work, the name, the services, the showrooms
services/*/index.html    pawning, money-exchange, airline-ticketing: how it works, contact card, the other services
assets/css/styles.css    design tokens and all layout, both pages
assets/js/site.js        shared by every page: header, menus, gold rate bar, copy buttons,
                         header shrinking on scroll, reveals, the entrance
assets/js/main.js        home page only: Suba Mangala calculator and enrolment,
                         order tracking, opening-hours week, the welcome
assets/js/pieces.js      the shop's catalogue, one line per piece
assets/js/pieces-instagram.js   Pushpa's 32 Instagram pieces, shown in the shop alongside pieces.js
assets/js/shop.js        the shop: grid, filters, sorting, and each piece's page
assets/img/              photographs (webp) and favicon
assets/img/shop/         the shop photos, 1080 x 1350, and small/ grid copies, 540 x 675
assets/img/orn/          gold ornaments: corner, dividers, mandalas, the line-drawn lotus (svg)
api/gold.js              today's gold rate, a Vercel function served at /api/gold
tools/frame-photos.py    frames a product photo of any size for the shop, or cuts a close-up from it
tools/shop-thumbs.py     makes the small grid copies of new shop photos
```

## The shop

`/shop/` shows every piece in `assets/js/pieces.js` in list order, with its weight in grams and
in pawn (8 g) where one is known. Visitors can filter by the categories that have pieces (a
category with none gets no button), and sort by weight (the sort appears once any piece has a weight). Each
piece has its own page at `/shop/?piece=<slug>`: the large photo with the piece's other photos
underneath (swipe across the photo on a phone; on a computer use the arrows or the thumbs, and the
photo zooms in under the pointer), its price, description and details (karat, weight in grams and in pawn, kind,
categories), an "Ask about this piece" button that opens WhatsApp with the piece's name filled in, a call button, a
note on saving for it with Suba Mangala, a link to its Instagram post when it has one, a share button, and more
pieces of the same kind. Filters and sorting are in the address too
(`/shop/?cat=bangles&sort=light`), so any view can be shared; the home page's collection tiles
open the shop filtered this way.

**The price on a piece's card and page.** A piece with `price` (rupees) shows that price. **Every piece now has a
sample price, put in to show the design: replace them with the real prices before the site goes live** (the sample
figures are the weight at about Rs 31,250 a gram plus 16% where the weight is known, and a typical figure for the
kind of piece where it is not). A piece with a weight and a `karat`
shows its gold value today: the weight times today's rate for that karat (from `/api/gold`), rounded to Rs 100, with
the weight, karat and rate per gram written under it and a plain note that making charges are added at the counter.
A set adds its pieces' weights; a range of weights gives a range of values. Anything else reads "Price on request".
Delete a piece's `price` to fall back to these.
The 28 Instagram pieces whose posts print a weight also print 22KT, so they carry `karat: 22`. Setting the showroom's
own rate in Vercel (see *Today's gold rate*) makes these values use it.

**What it shows now.** 104 pieces from two lists:

- 72 pieces from the photos uploaded in `assets/img/shop` (`assets/js/pieces.js`), each with two
  photos. Their names and descriptions are written from the product names; their weights are not
  known yet, so each page asks for the weight.
- Pushpa's 32 pieces from Instagram (`assets/js/pieces-instagram.js`), with their weights and a
  link to each post. Their second photo is a close-up cropped from the post.

The shop spreads the Instagram pieces evenly through the others (`mix()` in `shop.js`). Photos
that would need background added to fill the 4:5 frame are cut to a clean 4:5 window of the photo
instead, so no background is invented. Watermarks in the uploaded photos are cropped out.

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

Every page shares the home page's header, menus, footer and gold rate panel. They are
copied into each page with links rewritten for where the page sits, so a change to any of
them has to be made in all six files (`index.html`, `shop/`, `about/` and the three under `services/`).

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

## The intro

The home page opens on the logo, in the classic way: a warm light comes up behind it, the logo fades up into place, a
fine gold rule draws out either side of the Pushpa flower beneath it, the motto, *Forever Quality & Trust*, follows,
and after 2.6 seconds the intro fades away. It is all CSS (the `intro` block in `styles.css`). The timing is the
`animation-delay` on `.intro`; `site.js` reads it from there to start the hero's entrance as the intro lifts, so change
it in the CSS only. The logo's size is `.intro-logo` (220px wide on desktop). Other pages have no intro, and it is
skipped for visitors who ask for reduced motion.

## Logo size

The masthead logo is `--logo` (82px on desktop, 72px on phones and tablets) and `--logo-s` once a desktop page has
scrolled (58px), at the top of `styles.css`. The header's height, the jump-link landing point and the hero's height
are all worked out from these, so change the logo size there and nothing else needs to move.

## Sections

1. **Hero.** Pushpa today: the bride beside the brass lamp. On phones the photo comes first, with the copy
   centred below: a label, a two-line headline, one button and a text link.
2. **Marks.** 916, 750, 1967 and "weighed for you" stamps.
3. **The collection.** Necklaces, bangles, rings and pendants, each opening the shop filtered to it.
4. **Suba Mangala.** The 6 and 12 month gold purchase plan, with a calculator and the full plan table.
5. **Track your order.** Order or repair-bill lookup, sent on WhatsApp.
6. **Services.** Pawning, money exchange and airline ticketing, each linking to its own page.
7. **About.** 1967, the pride of Negombo, with a View more button to the About page.
8. **Visit.** This week's opening hours in Sri Lanka time, three showrooms, phone lines.

### The About and service pages

They are written only from facts already on the site (1967 on Greens Road, the three showrooms, the 916 and 750
marks, weighing in front of the customer, the services and their partners). Add the real history (who founded
Pushpa, milestones, old photographs) to `about/index.html` when the family can share it, and check the steps on
each service page against how the counter actually works, including what a customer should bring.

### Hero photo: one size for desktop, one for phones

The hero photo comes in two sizes. Every desktop screen shows the desktop photo in the same shape, and every phone
the phone photo.

| | Desktop (821px and wider) | Phone (820px and narrower) |
|---|---|---|
| Shape | 2:1 | 4:5 |
| Size | **1774 x 887** | **1120 x 1400** |
| File | `hero-now.webp` | `hero-now-mobile.webp` |
| Framing | Put the bride in the right half. The left half sits under the headline and is darkened. | The whole photo shows; only the bottom fifth fades into plum, under the copy. Keep the face and jewellery above that. |

To change the photo, replace the file in `assets/img/` with one of the same name and size (any size in the same shape
works).

On a screen tall enough the whole 2:1 photo shows. On a short screen the hero is cut to the screen's height, but no
lower than 560px, trimming the photo's lower edge, so the whole hero stays on the first screen of most laptops and
desktops. Between 821px and 1279px wide the headline needs a little more height, so the hero grows and trims the
photo's sides. Tablets use the phone photo with its height capped at 680px, which trims the bottom. The rules are the
`desktop: one shape on every screen` block and the `phones:` lines in `styles.css`.

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
- **EB Garamond** for all reading text, an old book type. It runs small, so `font-size-adjust` (`--text-adjust`)
  sizes it up to match the sizes in the stylesheet; the display faces opt out of that.
- **Cinzel** for the small capitals: navigation, buttons, labels, links.
- **Cinzel, EB Garamond, Pinyon Script, Noto Serif Sinhala and Noto Serif Tamil**
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
- Heritage details, all at the top of `styles.css` as drawn data URIs: a fine paper grain on the ivory (`--paper`); plum
  as printed velvet, small gold florets on a fine nap (`--damask`, `--velvet`); the cusped arch (`--arch-mask`,
  `--arch-line` on the collection photos, `--arch-tall` behind page titles); gilt corner brackets on framed cards
  (`--brackets`); and the old label shape with inward corners for tiles (`--label`). The line-drawn lotus
  (`assets/img/orn/lotus-line.svg`) grows at the foot of the Suba Mangala section and of page titles. Steps on the About and service
  pages are numbered in Roman capitals, ruled like an old account book. Ornaments stand on something: the lotus's stems
  run to the bottom of its drawing, so it grows from the lower edge of the section it sits in, and a page title's
  arch stands on a gilt threshold at the foot of the band, with a lotus either side.
- The header shrinks on scroll on desktop only. On phones and tablets it keeps one height, so
  nothing moves under the finger and jump links always land just under it (`scroll-margin-top`).
- Phone details: form fields are 16px or larger (a smaller one makes iPhones zoom the page when
  it is tapped), taps do not flash grey, and the colour behind the page when it is pulled past
  the top or bottom is the header's plum.
- On a product page the photos are one row that slides by a transform (`place()` in `shop.js`), not by scrolling, so it
  behaves the same on every phone. The row is `touch-action: pan-y`, so a finger on the photo always scrolls the page up and
  down; a drag that is clearly sideways moves the row with the finger and settles on a photo when released. Arrows, thumbs,
  the arrow keys and a sideways trackpad swipe work on a computer. Jumping to the top of the page when a product opens switches
  the page's gliding off first, because a glide ignores the user's finger until it is done.
- The round WhatsApp button on phones is the site's wine with a white WhatsApp glyph (`#i-wa` in the icon sprite).
- Motion: the logo through smoke, the hero's photo and headline arriving as it lifts, reveals as sections arrive (headings
  open out, ornaments unfold, the collection's photos settle into their arches, the service
  medals turn in), a light across buttons, gold underlines, and in the shop, cards rising into
  place, photos that slide under the finger, and a card's photo growing into its piece's page
  and back (view transitions, only on screens with a mouse, in browsers that have them).
- Honours `prefers-reduced-motion`: all of that switches off.
- Focus states, ARIA labels and live regions throughout. The Sinhala and Tamil
  lines carry `lang` attributes.
