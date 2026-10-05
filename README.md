# Pushpa Jewellers website

The storefront for Pushpa Jewellers (Pvt) Ltd, Negombo — forever trusted jewellers since 1967.

It is a static, mobile-first site: one `index.html` with eight views (home, shop, product, bridal,
money exchange, our story, visit, saved) switched by the URL hash, e.g. `#shop-bangles-w2` or
`#p-ballerina-pendant`. There is no build step.

```
public/                 the web root
  index.html            page shell, header, footer, overlays
  assets/css/site.css   design tokens and all styles (mobile first)
  assets/js/site.js     catalogue data, views, router, interactions
  assets/img/           product photography, hero crops, logos, icons
  assets/video/         Instagram reels (H.264/AAC)
  assets/fonts/         Marcellus and Figtree (latin subset, OFL)
Caddyfile               static file server config
Dockerfile              Caddy image that serves public/
railway.json            Railway build and healthcheck settings
docs/asset-sources.csv  where every photo and reel came from
```

## Run it locally

Any static server works:

```sh
cd public && python3 -m http.server 8000
```

or, matching production:

```sh
docker build -t pushpa . && docker run -p 3000:3000 -e PORT=3000 pushpa
```

## Deploy

Railway builds the `Dockerfile` and serves on `$PORT`; `/health` answers `ok` for the healthcheck.
Pushing to the connected branch redeploys.

## Editing the catalogue

Pieces live in the `P` array at the top of `assets/js/site.js`, newest first. Each has a slug (`s`),
photo file (`f`, without `.webp`), name, type, categories, weight text (`w`), weight in grams for
sorting and filtering (`g`, or `null` when no weight is printed), the focal point of the photo
(`fp`, used for the close-up) and its Instagram post id.

## Before going live

- Confirm addresses, phone numbers and opening hours with the shop.
- Confirm the shop approves reusing its Instagram photographs and reels on the website
  (see `docs/asset-sources.csv`).
- Piece names and one-line descriptions were written from the photographs; stones are described by
  colour only.
