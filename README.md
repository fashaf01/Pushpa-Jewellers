# Pushpa Jewellers — Landing Page

A static landing page for **Pushpa Jewellers (Pvt) Ltd** — *Forever Trusted Jewellers
since 1967* — Negombo and Katunayake, Sri Lanka.

No build step, no dependencies. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

`node build.js` inlines the CSS, JS and favicon into a single self-contained
`dist/pushpa-jewellers.html`, for hosting that serves one file.

## Files

```
index.html              markup + the inline SVG sprite that draws every illustration
assets/css/styles.css   design tokens and all layout
assets/js/main.js       drawer, carousel, scroll reveal, form handling
assets/img/favicon.svg  tab icon
```

## Business details used on the page

These came from the company's public listings and social profiles. **Please check
each one before the site goes live.**

| | |
|---|---|
| Founded | 1967 |
| Negombo (flagship) | 67 & 69 Greens Road, Negombo 11500 |
| Katunayake | 8A Averiwatte Road, Katunayake |
| Phone | 031 223 3857 · 031 222 2404 · 077 777 0203 |
| Hours | Mon–Sat 9.15 am – 7.30 pm · Sun 9.15 am – 2.00 pm |
| Instagram | [@pushpajewellers_official](https://www.instagram.com/pushpajewellers_official/) |
| Facebook | [pushpajewellerspvtltd](https://www.facebook.com/pushpajewellerspvtltd/) |
| Products | 22kt & 18kt gold, diamonds, platinum, gemstones |
| Services | Retail, bespoke, bridal, gold pawning, authorised money exchange |

**Not yet filled in:** a public email address. Search the directory listings and
you find `pushpaairtravels@gmail.com`, which belongs to the sister travel
business — so it is deliberately left off the page rather than guessed at.
Add the real one to the footer and the `JewelryStore` JSON-LD block when you have it.

## Getting the real photography

The build environment has no outbound network access — every host, including
Instagram, Facebook and the old WooCommerce site, is refused by the egress
proxy. So the images have to be fetched from a machine that can reach them.

`tools/fetch-images.sh` pulls a whole WordPress/WooCommerce media library:

```sh
sh tools/fetch-images.sh https://saravanas.lk
```

It walks `/wp-json/wp/v2/media`, saves every image into `product-images/`, and
writes `manifest.tsv` mapping each file to its title and alt text — which is
what tells us which shot is which piece. If the REST route is disabled it
prints a `wget` fallback that mirrors `/wp-content/uploads/`.

Commit that folder and the images can be wired into the slots below.

**Before using them, confirm the photographs are the client's to use.** Product
photography is normally owned by whoever shot it, and a site being "the old
site" is worth verifying if the domain belongs to a different trading name.

## Adding photography

Every image is drawn in SVG. To use real photographs, you do not touch the
markup — open `assets/js/main.js` and paste a URL against the slot you want:

```js
var PHOTOS = {
  heroAside: 'https://images.unsplash.com/photo-XXXX?w=1600&q=80&fm=webp',
  catRings:  'assets/img/rings.jpg',
  ...
};
```

A slot with a URL swaps to the photograph; a slot left empty keeps its
drawing, so the page never shows a hole. The drawing is only removed once the
photograph has actually loaded, so a broken or slow URL degrades quietly.

Any direct image URL works: an Unsplash CDN link (the
`https://images.unsplash.com/photo-…` address behind their Download button),
or your own file committed under `assets/img/`. Appending
`?w=1600&q=80&fm=webp` to an Unsplash URL keeps the page light.

The nineteen slots, and the crop each one wants:

| Key | Where | Crop |
|---|---|---|
| `heroAside` | Hero, right panel | tall portrait — model wearing a bridal set |
| `catNecklaces` `catEarrings` `catRings` `catBangles` | Category strip | portrait lifestyle — neck, ear, hand, wrist |
| `prodSolitaire` `prodBridalNecklace` `prodStuds` `prodSapphire` `prodTennis` `prodBangles` `prodPendant` `prodChain` | Favourites carousel | square packshot on white |
| `workshop` | Workshop panel | bench, tools, a jeweller at work |
| `bridalSet` `bridalEarrings` `bridalBangles` | Bridal | tall portrait |
| `showroomNegombo` `showroomKatunayake` | Showrooms | wide — shopfront or interior |

Two cautions worth keeping in mind:

- **Stock photography is not your stock.** A generic photo beside a specific
  listing ("22kt gold · 42.6 g") reads as a real product that you can be asked
  to sell. Use stock for the atmosphere slots — hero, categories, bridal,
  workshop, showrooms — and hold the eight carousel slots for photographs of
  pieces you actually have.
- **Check the licence covers commercial use.** The Unsplash licence does; many
  other "free" libraries require attribution or bar commercial use.

## Prices

Gold pieces read **"At today's gold rate"** rather than a fixed figure, because
22kt prices track the daily rate. Stone-led pieces read **"Price on enquiry."**
Weights and carats in the markup are illustrative — swap them for the real stock.

## The appointment form

There is no backend. A valid submission opens WhatsApp with the enquiry pre-filled,
which is how the showroom already takes bookings. The number is at the top of
`main.js`:

```js
var WHATSAPP_NUMBER = '94777770203';
```

To post to a real endpoint instead, replace the `window.open(...)` call in the
submit handler with your `fetch`.

## Notes

- Fonts load from Google Fonts (Cormorant Garamond + Jost) with system fallbacks.
- Responsive from 320px up; no horizontal overflow at any width tested.
- Honours `prefers-reduced-motion`; skip link, focus states and ARIA labels throughout.
- `JewelryStore` JSON-LD in `<head>` carries both showrooms for local search.

## Artifact pages

`artifacts/pushpa-gold.html` is the source of the hosted preview at
https://claude.ai/artifact/8gnoEVsiHEB4ka8ZfKiRqK: a 3D gold bangle over a
moonstone doorstep (three.js r128 from cdnjs), a display case lit by the
cursor, and a jeweller's scale that weighs a set in pawn. Its `img/` files are
stored with the artifact, not in this repository.
