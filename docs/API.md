# Shop admin — the API the backend must provide

The admin panel in `admin/` is finished front end. It talks to one REST API,
described here. Build these endpoints on the Hostinger plan (PHP 8 + MySQL is
what the shared plans give you), set `API_BASE_URL` in
`admin/assets/js/config.js`, and the panel goes live. No other change to the
front end is needed.

Until then the panel runs in **demo mode** on sample data in the browser.
`admin/assets/js/api.js` holds both adapters side by side. The demo adapter is
also the **reference implementation** of every rule below. When this document
and the demo disagree, the demo shows the intended behaviour.

---

## Conventions

| | |
|---|---|
| Base URL | e.g. `https://pushpa-jewellers.com/api` (no trailing slash) |
| Format | JSON in, JSON out. `Content-Type: application/json` |
| Auth | `Authorization: Bearer <token>` on every call except `/auth/login`, `/health` and `/public/*` |
| Timestamps | ISO 8601 in UTC: `"2026-11-07T04:12:00.000Z"` |
| Calendar dates | `date`, `due_date`: `"YYYY-MM-DD"` in Sri Lanka time (Asia/Colombo) |
| Money | Whole rupees as numbers: `245600`, never strings and never cents |
| IDs | Strings. Anything unique works (`"p_101"`, `"42"`, a UUID) |

### Errors

Send a 4xx/5xx status with a sentence a shop assistant can read:

```json
{ "error": "Only 1 × Gold chain in Negombo. Untick “from stock” to order it in." }
```

The panel shows `error` (or `message`) word for word. Status codes:

* `401`: not signed in or token expired. The panel returns to the sign-in screen.
* `404`: the record does not exist.
* `409`: the change conflicts with other data (e.g. deleting a product that is on orders).
* `422`: validation failed.

---

## Auth

### `POST /auth/login`

```json
{ "email": "owner@pushpa.lk", "password": "…" }
```

→ `200`

```json
{ "token": "opaque-random-string", "user": { "id": "u_1", "name": "Ruwan", "email": "owner@pushpa.lk", "role": "owner" } }
```

On a wrong password, return `401` with `{"error": "That email and password do not match."}`.

* Store passwords with PHP's `password_hash()` / `password_verify()`.
* Tokens: 32+ random bytes (`bin2hex(random_bytes(32))`), stored hashed, with an expiry (30 days is reasonable for a shop PC).
* `user.name` is written into the order history and the stock log as “by”.

### `POST /auth/logout`
Invalidate the token. → `204`

### `GET /health`
→ `200 {"ok": true}`. Settings → *Test the connection* uses it.

---

## Products

### The product object

```json
{
  "id": "p_101",
  "sku": "PJ-RG-0101",
  "name": "Diamond ring",
  "category": "rings",
  "badge": "Bridal",
  "description": "",
  "metal": "yellow_gold",
  "karat": 18,
  "weight_g": 3.6,
  "stones": "Natural diamonds · 0.42 ct",

  "pricing_mode": "gold_rate",
  "making_type": "percent",
  "making_value": 15,
  "stone_value": 240000,
  "fixed_price": 0,
  "show_price": false,

  "images": [ { "url": "https://pushpa-jewellers.com/uploads/ring-0101.jpg", "alt": "" } ],
  "stock": { "negombo": 2, "katunayake": 1 },
  "low_stock_at": 1,
  "status": "published",
  "featured_rank": 1,

  "created_at": "2026-10-26T05:30:00.000Z",
  "updated_at": "2026-11-07T03:10:00.000Z"
}
```

| Field | Values |
|---|---|
| `category` | `rings` `necklaces` `earrings` `bangles` `bracelets` `pendants` `chains` `sets` `other` |
| `metal` | `yellow_gold` `white_gold` `rose_gold` `platinum` `silver` `other` |
| `karat` | `24` `22` `18`, or `null` for metals other than gold |
| `pricing_mode` | `gold_rate` (gold only) or `fixed` |
| `making_type` | `percent` or `flat` (rupees) |
| `show_price` | `false` → the website says “Price on enquiry” |
| `images` | ordered; the first is the main photo |
| `stock` | one key per showroom id, from settings |
| `status` | `published` (on the website) · `draft` (hidden) · `archived` (sold/retired, hidden, kept for history) |
| `featured_rank` | `1`–`8` = position in the homepage Favourites carousel; `null` = not featured |

### Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/products` | Query: `status` = `active` (default: everything but archived) · `published` · `draft` · `archived` · `all`; `category`; `search` (name, SKU, stones, badge); `featured=1`. Newest `updated_at` first. |
| `GET` | `/products/{id}` | |
| `POST` | `/products` | Body: the writable fields below, plus `stock` (opening count per showroom) and `featured` (bool). → the new product. |
| `PUT` | `/products/{id}` | Body: the writable fields, plus `featured` (bool). **Does not change stock**; that goes through `/stock/*`. |
| `DELETE` | `/products/{id}` | Refuse with `409` if any order references it (tell them to archive instead). |

Writable fields: `sku name category badge description metal karat weight_g stones
pricing_mode making_type making_value stone_value fixed_price show_price images
low_stock_at status`.

Rules:

* `name` required. `sku` unique; if blank, make one (`PJ-RG-0117`: category code + next number).
* `pricing_mode: gold_rate` requires a gold `metal`, a `karat` and `weight_g > 0`.
* `pricing_mode: fixed` requires `fixed_price > 0`.
* Opening stock on create is logged as a `received` movement (“Opening stock”).
* `featured: true` on a product without a rank puts it at the end of the list; `false` removes it and closes up the other ranks.

### `POST /uploads`

`multipart/form-data` with one field, `file` (a JPEG the browser has already
resized to at most 1600 px). → `{"url": "https://…/uploads/abc123.jpg"}`

Save it under `public_html/uploads/` with a random name. Accept only
`image/jpeg`, `image/png` and `image/webp`, and check them with `getimagesize()`, not just the
extension. The URL goes into the product's `images` when the product is saved.

---

## How a price is worked out

Run this on the server too, so the website shows the same figure as the admin.
(`admin/assets/js/pricing.js` → `priceOf`)

```
fixed:      price = fixed_price

gold_rate:  rate   = latest gold rate, per gram, for the piece's karat
            metal  = weight_g × rate
            making = making_type == "percent" ? metal × making_value / 100
                                              : making_value
            price  = round(metal + making + stone_value, to settings.price_rounding)
```

Rounding is to the nearest step (default Rs 100). If the karat has no rate
yet, there is no price; show “Price on enquiry”.

---

## Stock

Each change is a **movement**:

```json
{ "id": "m_1", "product_id": "p_108", "showroom": "negombo", "delta": -1,
  "reason": "sale", "note": "", "order_number": "PJ-1040",
  "at": "2026-11-07T04:12:00.000Z", "by": "Ruwan" }
```

`reason`: `received` `removed` `count` `transfer_in` `transfer_out` `sale`
`order_cancelled` `order_edited`.

| Method | Path | Body / query |
|---|---|---|
| `POST` | `/stock/adjust` | `{product_id, showroom, reason: "received", delta: 3, note}` or `{…, reason: "removed", delta: -1}` or `{…, reason: "count", count: 4}` (a stock count sets the exact number; log the difference). Never let stock go below 0. → the updated product. |
| `POST` | `/stock/transfer` | `{product_id, from, to, qty, note}` → two movements (`transfer_out`, `transfer_in`). → the product. |
| `GET` | `/stock/movements` | `product_id` (optional), `limit` (default 100). Newest first. Add `product_name` and `product_sku` to each row. |

---

## Gold rates

```json
{ "date": "2026-11-07", "per_gram": { "24": 46896, "22": 43000, "18": 35207 },
  "updated_at": "2026-11-07T03:50:00.000Z", "updated_by": "Ruwan" }
```

The admin enters rates per pawn (8 g) or per gram, but **always sends per gram**.

| Method | Path | |
|---|---|---|
| `GET` | `/gold-rates?limit=60` | Newest first. The first row is “the current rate”. |
| `POST` | `/gold-rates` | `{date, per_gram}`. All three karats required. **Upsert by date**: saving twice on one day corrects that day's rate. |

---

## Orders

### The order object

```json
{
  "id": "o_1040",
  "number": "PJ-1040",
  "created_at": "…", "updated_at": "…",
  "channel": "whatsapp",
  "showroom": "negombo",
  "customer": { "name": "Nimali Perera", "phone": "077 000 1418", "email": "", "address": "" },
  "items": [
    { "product_id": "p_108", "sku": "PJ-CH-0108", "name": "Gold chain", "image": "https://…",
      "qty": 1, "unit_price": 743000, "note": "18 inch", "from_stock": true },
    { "product_id": null, "sku": "", "name": "Resize grandmother's ring", "image": "",
      "qty": 1, "unit_price": 3500, "note": "", "from_stock": false }
  ],
  "subtotal": 746500, "discount": 1500, "total": 745000,
  "paid": 100000, "payment_status": "advance",
  "payments": [ { "amount": 100000, "method": "cash", "at": "…", "note": "", "by": "Ruwan" } ],
  "fulfilment": "pickup",
  "due_date": "2026-11-14",
  "status": "confirmed",
  "tracking": { "courier": "", "number": "" },
  "notes": "Gift wrap",
  "history": [
    { "type": "status", "status": "new", "at": "…", "text": "Order created", "by": "Ruwan" },
    { "type": "payment", "at": "…", "text": "Rs 100,000 received · Cash", "by": "Ruwan" },
    { "type": "status", "status": "confirmed", "at": "…", "text": "Checked with customer", "by": "Ruwan" }
  ]
}
```

| Field | Values |
|---|---|
| `channel` | `walk_in` `whatsapp` `phone` `instagram` `facebook` `website` |
| `status` | `new` → `confirmed` → `in_making` → `ready` → `dispatched` (delivery only) → `completed`; or `cancelled` |
| `payment_status` | `unpaid` (paid = 0) · `advance` (0 < paid < total) · `paid` (paid ≥ total), always worked out on the server |
| `payments[].method` | `cash` `card` `bank` `old_gold` `other` |
| `fulfilment` | `pickup` or `delivery` |
| `history[].type` | `status` `payment` `edit` |

### Endpoints

| Method | Path | Body / query |
|---|---|---|
| `GET` | `/orders` | `status` = one status, or `open` (everything except completed and cancelled), or blank for all; `search` (number, name, phone, ignoring spaces); `limit` (default 500). Newest first. |
| `GET` | `/orders/{id}` | Accept the id **or** the order number (`PJ-1040`); the stock log links by number. |
| `POST` | `/orders` | `{customer, channel, showroom, fulfilment, due_date, discount, notes, items[], payment: {amount, method}, status?}`. `status: "completed"` means *sold at the counter*. → the order. |
| `PUT` | `/orders/{id}` | Same body without `payment`/`status`. → the order. |
| `POST` | `/orders/{id}/status` | `{status, note, tracking?: {courier, number}}` → the order. |
| `POST` | `/orders/{id}/payments` | `{amount, method, note}` → the order. |

### Rules the server must enforce

1. **Numbers** are sequential: `PJ-1001`, `PJ-1002`, …
2. **Totals** come from the items: `subtotal = Σ qty × unit_price`,
   `discount` capped at the subtotal, `total = subtotal − discount`. Ignore any totals the client sends.
3. Items with a `product_id` get `sku`, `image` and (if blank) `name` filled from the product.
4. **Stock follows the order.** Work out what the order holds:
   `Σ qty` per (product, showroom) for items with `from_stock: true`, and nothing
   for a cancelled order. On create, edit and status change, move stock by the difference
   between *held before* and *held after*:
   * create → take (`sale`), refuse with `422` if the showroom hasn't enough;
   * edit → take or return the difference (`sale` / `order_edited`);
   * cancel → return everything (`order_cancelled`); re-open → take it again.
5. Every status change, payment and edit appends to `history` with the signed-in user's name.
6. `paid = Σ payments.amount`; `payment_status` from the rule above.
7. Do all of the above in **one database transaction** per request.

---

## Reports

### `GET /reports/sales?days=14`
One row per day, **oldest first, including days with no sales**:

```json
[ { "date": "2026-10-25", "total": 0, "orders": 0 }, { "date": "2026-10-26", "total": 412000, "orders": 2 } ]
```
Count every order that is not cancelled, by the day it was created (Colombo time).

### `GET /reports/best-sellers?days=30&limit=20`
`days` blank = all time. Orders not cancelled; items with a `product_id`.
Ranked by units, then by value:

```json
[ { "product_id": "p_103", "name": "Gold earrings", "sku": "PJ-ER-0103", "images": [ … ],
    "units": 4, "revenue": 748100, "orders": 4, "featured_rank": 3, "status": "published" } ]
```

---

## Homepage favourites

### `PUT /homepage/featured`
`{"product_ids": ["p_101", "p_102", …]}` in carousel order. Set `featured_rank`
1…n on those, `null` on every other product. → the featured products.

---

## Settings

### `GET /settings` · `PUT /settings`

```json
{
  "shop_name": "Pushpa Jewellers",
  "showrooms": [
    { "id": "negombo", "name": "Negombo", "phone": "031 223 3857", "address": "67 & 69 Greens Road, Negombo" },
    { "id": "katunayake", "name": "Katunayake", "phone": "077 777 0203", "address": "8A Averiwatte Road, Katunayake" }
  ],
  "price_rounding": 100,
  "default_making_percent": 12,
  "low_stock_default": 1,
  "featured_limit": 8
}
```

`PUT` takes any subset. Showroom `id`s are fixed: names, phones and addresses
can change, and the ids are the keys in every product's `stock`.

---

## For the public website (no auth)

The admin does not call these. The website does once it is wired up, so that changes
made in the admin show on the site:

* `GET /public/products?featured=1` → published products in `featured_rank` order, each with
  `price` (from the formula, or `null` when `show_price` is false) and the main image.
* `GET /public/products?category=rings` → the published pieces in a category.

Never expose stock counts, costs, orders or customers on public routes.

---

## Hostinger notes

* **Layout** that needs no CORS:

  ```
  public_html/
    index.html        ← the website
    assets/
    admin/            ← this panel
    api/              ← the PHP API (index.php + .htaccess)
    uploads/          ← product photos
  ```

* **Routing**: `api/.htaccess`

  ```apache
  RewriteEngine On
  # Apache on shared hosting drops the Authorization header unless told to keep it
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^ index.php [QSA,L]
  ```

* **If the API lives on another domain**, answer `OPTIONS` preflights and send
  `Access-Control-Allow-Origin: <admin origin>`,
  `Access-Control-Allow-Headers: Authorization, Content-Type`,
  `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`.

* **Database**: one table per object above, plus link tables: `users`, `tokens`, `products`,
  `product_images`, `product_stock (product_id, showroom_id, qty)`,
  `stock_movements`, `gold_rates (date PK)`, `orders`, `order_items`,
  `order_payments`, `order_history`, `settings`, `showrooms`. Use PDO with prepared
  statements throughout.

* **Seeding**: in demo mode, Settings → *Download data* exports everything in
  exactly these shapes, a ready test fixture for the importer.

* Serve everything over **HTTPS** (free SSL is in hPanel), and keep
  `admin/` out of search results (the page already sends `noindex`).
