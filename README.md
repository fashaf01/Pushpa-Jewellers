# Pushpa Jewellers — Landing Page

A static landing page for **Pushpa Jewellers (Pvt) Ltd** — *Forever Trusted Jewellers
since 1967* — Negombo and Katunayake, Sri Lanka.

No build step, no dependencies. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

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

## Replacing the illustrations with real photography

Every image on the page is drawn in SVG. That was a constraint, not a preference:
the build environment blocks all outbound network access, so the Instagram and
Facebook product shots could not be downloaded. The line art is a deliberate
placeholder that looks intentional rather than broken — but real photographs of
real pieces will sell far better.

Each slot follows the same shape:

```html
<div class="product__media surface surface--stone">
  <svg class="art" viewBox="0 0 300 300" aria-hidden="true">…</svg>
</div>
```

To use a photograph, replace the `<svg class="art">` with:

```html
<img class="art" src="assets/img/solitaire-ring.jpg" alt="Solitaire engagement ring in 18kt white gold"
     style="object-fit:cover" loading="lazy" width="800" height="800">
```

`.art` is already absolutely positioned to fill its slot, so nothing else changes.
Drop the `surface surface--stone` classes from the parent once a photo covers it.

Slots, and the crop each one wants:

| Section | Slots | Crop |
|---|---|---|
| Hero, left panel | 1 | portrait, loose stones on cloth |
| Hero, right panel | 1 | portrait, model wearing stacked rings |
| Collections | 4 | landscape, single piece on a plain ground |
| Favourites carousel | 8 | square, packshot on white |
| Workshop | 2 | portrait — bench in use, and a stone in tweezers |
| Our story tiles | 4 | mixed |
| Bridal | 3 | tall portrait |
| Showrooms | 2 | wide, shopfront or interior |

For the carousel, the eight `<article class="product">` blocks also carry the name,
metal/stone spec and price line — update those alongside the images.

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
