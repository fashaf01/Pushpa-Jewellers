/* ==========================================================================
   Pushpa Jewellers — the shop API (docs/API.md), framework-free.

   createApp({ db, blob, ownerEmail }) returns handle(request) → { status, body }.
   api/main.js adapts it to Vercel; tests run it against an in-memory Postgres.

   The business rules mirror the demo adapter in admin/assets/js/api.js:
   order numbers, stock following orders, payment status, best sellers.
   ========================================================================== */
const crypto = require('crypto');
const SCHEMA = require('./schema');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const bad = (message) => fail(422, message);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bangles', 'bracelets', 'pendants', 'chains', 'sets', 'other'];
const METALS = ['yellow_gold', 'white_gold', 'rose_gold', 'platinum', 'silver', 'other'];
const GOLD = ['yellow_gold', 'white_gold', 'rose_gold'];
const KARATS = [24, 22, 18];
const STATUSES = ['new', 'confirmed', 'in_making', 'ready', 'dispatched', 'completed', 'cancelled'];
const CHANNELS = ['walk_in', 'whatsapp', 'phone', 'instagram', 'facebook', 'website'];
const METHODS = { cash: 'Cash', card: 'Card', bank: 'Bank transfer', old_gold: 'Old gold exchange', other: 'Other' };
const SKU_CODES = { rings: 'RG', necklaces: 'NK', earrings: 'ER', bangles: 'BG', bracelets: 'BR', pendants: 'PD', chains: 'CH', sets: 'ST' };
const STATUS_LABEL = { new: 'New', confirmed: 'Confirmed', in_making: 'In the workshop', ready: 'Ready', dispatched: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };

const DEFAULT_SETTINGS = {
  shop_name: 'Pushpa Jewellers',
  showrooms: [
    { id: 'negombo', name: 'Negombo', phone: '031 223 3857', address: '67 & 69 Greens Road, Negombo' },
    { id: 'katunayake', name: 'Katunayake', phone: '077 777 0203', address: '8A Averiwatte Road, Katunayake' }
  ],
  price_rounding: 100,
  default_making_percent: 12,
  low_stock_default: 1,
  featured_limit: 8,
  /* Sri Lankan market rate = international price × (1 + premium). Calibrated
     8 Nov 2026 against the market's 24K Rs 366,000 / 22K Rs 336,700 a pawn. */
  market_premium_percent: 5.12,
  k22_percent_of_24k: 92,
  k18_percent_of_24k: 75
};

const GRAMS_PER_OUNCE = 31.1034768;
const round100 = (n) => Math.round(n / 100) * 100;

const PRODUCT_COLS = `id, sku, name, category, badge, description, metal, karat,
  weight_g::float8 as weight_g, stones, pricing_mode, making_type,
  making_value::float8 as making_value, stone_value::float8 as stone_value,
  fixed_price::float8 as fixed_price, show_price, images, stock, low_stock_at,
  status, featured_rank, created_at, updated_at`;

const ORDER_COLS = `id, number, created_at, updated_at, channel, showroom, customer, items,
  subtotal::float8 as subtotal, discount::float8 as discount, total::float8 as total,
  paid::float8 as paid, payment_status, payments, fulfilment, due_date::text as due_date,
  status, tracking, notes, history`;

/* Sri Lanka is UTC+5:30 all year */
const COLOMBO_MS = 330 * 60000;
const colomboDay = (d) => new Date(new Date(d).getTime() + COLOMBO_MS).toISOString().slice(0, 10);
const colomboStart = (daysAgo) => new Date(Date.parse(colomboDay(new Date()) + 'T00:00:00Z') - COLOMBO_MS - daysAgo * 864e5);

const nowIso = () => new Date().toISOString();
const money = (n) => 'Rs ' + Math.round(n).toLocaleString('en-US');
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
const json = (v) => JSON.stringify(v);

/* ------------------------------------------------------------------
   Passwords — scrypt, built into Node
   ------------------------------------------------------------------ */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pw), salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [alg, saltHex, keyHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64);
  const want = Buffer.from(keyHex, 'hex');
  return want.length === key.length && crypto.timingSafeEqual(key, want);
}
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

/* ------------------------------------------------------------------
   Multipart — one file field is all the API takes
   ------------------------------------------------------------------ */
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType || '');
  if (!m) return [];
  const boundary = Buffer.from('--' + (m[1] || m[2]));
  const parts = [];
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    const start = pos + boundary.length;
    if (buf.slice(start, start + 2).toString() === '--') break;
    const headerEnd = buf.indexOf('\r\n\r\n', start);
    if (headerEnd === -1) break;
    const next = buf.indexOf(boundary, headerEnd + 4);
    if (next === -1) break;
    const head = buf.slice(start, headerEnd).toString();
    const name = /name="([^"]*)"/i.exec(head);
    const filename = /filename="([^"]*)"/i.exec(head);
    const type = /content-type:\s*([^\r\n]+)/i.exec(head);
    parts.push({ name: name && name[1], filename: filename && filename[1], type: type ? type[1].trim() : '', data: buf.slice(headerEnd + 4, next - 2) });
    pos = next;
  }
  return parts;
}

function imageKind(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ['image/jpeg', 'jpg'];
  if (b.length > 8 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ['image/png', 'png'];
  if (b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return ['image/webp', 'webp'];
  return null;
}

/* ------------------------------------------------------------------
   Price — the same formula as admin/assets/js/pricing.js
   ------------------------------------------------------------------ */
function priceOf(p, rate, rounding) {
  if (p.pricing_mode === 'fixed') return Number(p.fixed_price) || null;
  if (!GOLD.includes(p.metal) || !rate) return null;
  const perGram = Number(rate.per_gram && rate.per_gram[p.karat]);
  const weight = Number(p.weight_g);
  if (!perGram || !weight) return null;
  const metal = weight * perGram;
  const making = p.making_type === 'flat' ? Number(p.making_value) || 0 : (metal * (Number(p.making_value) || 0)) / 100;
  const step = Number(rounding) || 100;
  return Math.round((metal + making + (Number(p.stone_value) || 0)) / step) * step;
}

async function defaultFetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

module.exports = function createApp({ db, blob, ownerEmail, fetchJson = defaultFetchJson }) {
  /* ------------------------------------------------------------------
     Schema — created on first use after a deploy
     ------------------------------------------------------------------ */
  let ready = null;
  function ensureSchema() {
    if (!ready) {
      ready = db.tx(async (q) => {
        await q('select pg_advisory_xact_lock(717171)');
        await q(SCHEMA);
        await q('insert into settings (id, data) values (1, $1::jsonb) on conflict (id) do nothing', [json(DEFAULT_SETTINGS)]);
      }).catch((e) => { ready = null; throw e; });
    }
    return ready;
  }

  /* ------------------------------------------------------------------
     Shared reads
     ------------------------------------------------------------------ */
  async function getSettings(q = db.query) {
    const rows = await q('select data from settings where id = 1');
    return rows.length ? rows[0].data : DEFAULT_SETTINGS;
  }
  const roomName = (s, id) => (s.showrooms.find((r) => r.id === id) || { name: id }).name;

  async function getProduct(q, id) {
    if (!UUID.test(String(id))) fail(404, 'That product no longer exists.');
    const rows = await q(`select ${PRODUCT_COLS} from products where id = $1`, [id]);
    if (!rows.length) fail(404, 'That product no longer exists.');
    return rows[0];
  }

  async function lockProduct(q, id) {
    if (!UUID.test(String(id))) fail(404, 'That product no longer exists.');
    const rows = await q(`select ${PRODUCT_COLS} from products where id = $1 for update`, [id]);
    if (!rows.length) fail(404, 'That product no longer exists.');
    return rows[0];
  }

  async function getOrder(q, idOrNumber, lock = false) {
    const key = String(idOrNumber || '');
    const by = UUID.test(key) ? 'id = $1' : 'number = upper($1)';
    const rows = await q(`select ${ORDER_COLS} from orders where ${by}${lock ? ' for update' : ''}`, [key]);
    if (!rows.length) fail(404, 'That order no longer exists.');
    return rows[0];
  }

  async function move(q, s, productId, room, delta, reason, note, orderNumber, by) {
    if (!s.showrooms.some((r) => r.id === room)) bad('Unknown showroom.');
    await q(`update products
               set stock = jsonb_set(stock, array[$2::text], to_jsonb(coalesce((stock->>$2)::int, 0) + $3::int), true),
                   updated_at = now()
             where id = $1`, [productId, room, delta]);
    await q(`insert into stock_movements (product_id, showroom, delta, reason, note, order_number, by_name)
             values ($1, $2, $3, $4, $5, $6, $7)`, [productId, room, delta, reason, str(note), orderNumber || '', by]);
  }

  /* ------------------------------------------------------------------
     Market gold rate — worked out automatically, every day
     International gold (gold-api.com, USD an ounce) × USD→LKR (open.er-api.com)
     × the Sri Lankan market premium; 22K and 18K as a share of 24K; pawns
     rounded to Rs 100 as the shops quote them. Cached for 30 minutes.
     ------------------------------------------------------------------ */
  let marketCache = null;
  let marketFailedAt = 0;
  async function fetchMarket() {
    if (marketCache && Date.now() - marketCache.at < 30 * 60000) return marketCache;
    if (Date.now() - marketFailedAt < 10 * 60000 && !marketCache) throw new HttpError(503, 'The market gold price could not be fetched just now.');
    try {
      const [gold, fx] = await Promise.all([
        fetchJson('https://api.gold-api.com/price/XAU'),
        fetchJson('https://open.er-api.com/v6/latest/USD')
      ]);
      const usdOz = Number(gold && gold.price);
      const usdLkr = Number(fx && fx.rates && fx.rates.LKR);
      if (!(usdOz > 0) || !(usdLkr > 0)) throw new Error('gold or exchange rate missing');
      marketCache = { at: Date.now(), usdOz, usdLkr, updated: typeof gold.updatedAt === 'string' ? gold.updatedAt : nowIso() };
      return marketCache;
    } catch (e) {
      marketFailedAt = Date.now();
      if (marketCache) return marketCache; /* keep the last good figures */
      console.error('market gold price failed:', e.message);
      throw new HttpError(503, 'The market gold price could not be fetched just now.');
    }
  }

  async function marketRate(s) {
    const m = await fetchMarket();
    const premium = num(s.market_premium_percent) != null ? num(s.market_premium_percent) : DEFAULT_SETTINGS.market_premium_percent;
    const k22 = num(s.k22_percent_of_24k) || DEFAULT_SETTINGS.k22_percent_of_24k;
    const k18 = num(s.k18_percent_of_24k) || DEFAULT_SETTINGS.k18_percent_of_24k;
    const pawn24 = round100((m.usdOz / GRAMS_PER_OUNCE) * m.usdLkr * 8 * (1 + premium / 100));
    const pawn = { 24: pawn24, 22: round100((pawn24 * k22) / 100), 18: round100((pawn24 * k18) / 100) };
    const perGram = (p) => Math.round((p / 8) * 1000) / 1000;
    return {
      pawn,
      per_gram: { 24: perGram(pawn[24]), 22: perGram(pawn[22]), 18: perGram(pawn[18]) },
      premium_percent: premium,
      usd_per_ounce: Math.round(m.usdOz * 100) / 100,
      usd_lkr: Math.round(m.usdLkr * 100) / 100,
      updated: m.updated
    };
  }

  const AUTO_BY = 'Automatic (market rate)';

  /* If nobody has entered today's rate, put the market rate in for the day.
     A rate a person saves replaces it. Never breaks the request it runs in. */
  async function ensureTodayRate() {
    const today = colomboDay(new Date());
    try {
      const have = await db.query('select 1 from gold_rates where date = $1', [today]);
      if (have.length) return;
      const r = await marketRate(await getSettings());
      await db.query(`insert into gold_rates (date, per_gram, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
                      on conflict (date) do nothing`, [today, json(r.per_gram), AUTO_BY]);
    } catch (e) {
      if (!(e instanceof HttpError)) console.error('automatic gold rate failed:', e.message);
    }
  }

  /* ------------------------------------------------------------------
     Auth
     ------------------------------------------------------------------ */
  async function currentUser(headers) {
    const m = /^Bearer\s+(.+)$/i.exec(headers.authorization || headers.Authorization || '');
    if (!m) fail(401, 'Please sign in.');
    const rows = await db.query(
      `select u.id, u.email, u.name, u.role from sessions s join users u on u.id = s.user_id
        where s.token_hash = $1 and s.expires_at > now()`, [sha256(m[1].trim())]);
    if (!rows.length) fail(401, 'Your session has ended. Please sign in again.');
    return rows[0];
  }

  async function startSession(q, user) {
    const token = crypto.randomBytes(32).toString('hex');
    await q(`insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '30 days')`, [sha256(token), user.id]);
    await q(`delete from sessions where expires_at < now()`);
    return { token, user: publicUser(user) };
  }

  function checkNewAccount(b) {
    const email = str(b.email, 200).toLowerCase();
    const name = str(b.name, 80);
    const password = String(b.password || '');
    if (!name) bad('Enter your name.');
    if (!EMAIL.test(email)) bad('Enter a valid email address.');
    if (password.length < 8) bad('Use a password of at least 8 characters.');
    return { email, name, password };
  }

  const auth = {
    async status() {
      const [{ n }] = await db.query('select count(*)::int as n from users');
      return { needs_setup: n === 0 };
    },
    async setup(b) {
      const a = checkNewAccount(b);
      return db.tx(async (q) => {
        await q('select pg_advisory_xact_lock(717172)');
        const [{ n }] = await q('select count(*)::int as n from users');
        if (n > 0) fail(409, 'The owner account already exists. Sign in instead.');
        if (!ownerEmail) fail(403, 'The owner email has not been set for this shop yet.');
        if (a.email !== String(ownerEmail).trim().toLowerCase()) fail(403, 'Only the shop owner’s email can create the first account.');
        const [u] = await q(`insert into users (email, name, role, password_hash) values ($1, $2, 'owner', $3) returning id, email, name, role`,
          [a.email, a.name, hashPassword(a.password)]);
        return startSession(q, u);
      });
    },
    async register(b) {
      const a = checkNewAccount(b);
      return db.tx(async (q) => {
        const inv = await q('select email, name, role from invites where email = $1', [a.email]);
        if (!inv.length) fail(403, 'This email has not been invited. Ask the shop owner to add you in Settings.');
        const exists = await q('select 1 from users where email = $1', [a.email]);
        if (exists.length) fail(409, 'An account with this email already exists. Sign in instead.');
        const [u] = await q(`insert into users (email, name, role, password_hash) values ($1, $2, $3, $4) returning id, email, name, role`,
          [a.email, a.name || inv[0].name, inv[0].role, hashPassword(a.password)]);
        await q('delete from invites where email = $1', [a.email]);
        return startSession(q, u);
      });
    },
    async login(b) {
      const email = str(b.email, 200).toLowerCase();
      const rows = await db.query('select id, email, name, role, password_hash from users where email = $1', [email]);
      if (!rows.length || !checkPassword(b.password, rows[0].password_hash)) {
        await new Promise((r) => setTimeout(r, 400));
        fail(401, 'That email and password do not match.');
      }
      return db.tx((q) => startSession(q, rows[0]));
    },
    async logout(headers) {
      const m = /^Bearer\s+(.+)$/i.exec(headers.authorization || '');
      if (m) await db.query('delete from sessions where token_hash = $1', [sha256(m[1].trim())]);
      return null;
    }
  };

  /* ------------------------------------------------------------------
     Staff (owner only)
     ------------------------------------------------------------------ */
  const staff = {
    async list() {
      const users = await db.query('select id, email, name, role, created_at from users order by created_at');
      const invites = await db.query('select email, name, role, created_at from invites order by created_at');
      return { users, invites };
    },
    async invite(b) {
      const email = str(b.email, 200).toLowerCase();
      if (!EMAIL.test(email)) bad('Enter a valid email address.');
      const role = b.role === 'owner' ? 'owner' : 'staff';
      const exists = await db.query('select 1 from users where email = $1', [email]);
      if (exists.length) bad('That person already has an account.');
      await db.query(`insert into invites (email, name, role) values ($1, $2, $3)
                      on conflict (email) do update set name = excluded.name, role = excluded.role`, [email, str(b.name, 80), role]);
      return staff.list();
    },
    async uninvite(email) {
      await db.query('delete from invites where email = $1', [String(email || '').toLowerCase()]);
      return staff.list();
    },
    async remove(id, me) {
      if (!UUID.test(String(id))) fail(404, 'No such account.');
      if (id === me.id) bad('You cannot remove your own account.');
      const owners = await db.query(`select id from users where role = 'owner'`);
      if (owners.length === 1 && owners[0].id === id) bad('The shop needs at least one owner.');
      await db.query('delete from users where id = $1', [id]);
      return staff.list();
    }
  };

  /* ------------------------------------------------------------------
     Products
     ------------------------------------------------------------------ */
  const WRITABLE = ['sku', 'name', 'category', 'badge', 'description', 'metal', 'karat', 'weight_g', 'stones', 'pricing_mode',
    'making_type', 'making_value', 'stone_value', 'fixed_price', 'show_price', 'images', 'low_stock_at', 'status'];

  function normaliseProduct(v) {
    const out = {
      sku: str(v.sku, 40),
      name: str(v.name, 120),
      category: CATEGORIES.includes(v.category) ? v.category : 'other',
      badge: str(v.badge, 40),
      description: str(v.description, 2000),
      metal: METALS.includes(v.metal) ? v.metal : 'other',
      karat: null,
      weight_g: num(v.weight_g),
      stones: str(v.stones, 200),
      pricing_mode: v.pricing_mode === 'fixed' ? 'fixed' : 'gold_rate',
      making_type: v.making_type === 'flat' ? 'flat' : 'percent',
      making_value: Math.max(0, num(v.making_value) || 0),
      stone_value: Math.max(0, num(v.stone_value) || 0),
      fixed_price: Math.max(0, num(v.fixed_price) || 0),
      show_price: v.show_price !== false,
      images: (Array.isArray(v.images) ? v.images : [])
        .filter((i) => i && /^https?:\/\//i.test(String(i.url || '')))
        .slice(0, 12)
        .map((i) => ({ url: String(i.url).slice(0, 1000), alt: str(i.alt, 200) })),
      low_stock_at: Math.max(0, Math.round(num(v.low_stock_at) || 0)),
      status: ['published', 'draft', 'archived'].includes(v.status) ? v.status : 'published'
    };
    if (GOLD.includes(out.metal) && KARATS.includes(Number(v.karat))) out.karat = Number(v.karat);
    if (out.weight_g != null && out.weight_g < 0) out.weight_g = null;
    return out;
  }

  function validateProduct(v) {
    if (!v.name) bad('Give the piece a name.');
    if (v.pricing_mode === 'gold_rate') {
      if (!GOLD.includes(v.metal)) bad('Only gold pieces can follow the gold rate. Use a fixed price for this one.');
      if (!v.karat) bad('Pick the karat, so the right gold rate is used.');
      if (!(v.weight_g > 0)) bad('Add the weight in grams — the gold-rate price needs it.');
    } else if (!(v.fixed_price > 0)) bad('Add the price.');
  }

  async function checkSku(q, sku, id) {
    const rows = await q('select id from products where lower(sku) = lower($1)', [sku]);
    if (rows.some((r) => r.id !== id)) bad(`Another piece already uses SKU ${sku}.`);
  }

  async function nextSku(q, category) {
    const rows = await q('select sku from products');
    const n = rows.reduce((m, r) => Math.max(m, Number((String(r.sku).match(/(\d+)$/) || [])[1]) || 0), 100) + 1;
    return `PJ-${SKU_CODES[category] || 'OT'}-${String(n).padStart(4, '0')}`;
  }

  const productParams = (v) => [v.sku, v.name, v.category, v.badge, v.description, v.metal, v.karat, v.weight_g, v.stones,
    v.pricing_mode, v.making_type, v.making_value, v.stone_value, v.fixed_price, v.show_price, json(v.images), v.low_stock_at, v.status];

  async function renumberFeatured(q) {
    await q(`with r as (select id, row_number() over (order by featured_rank, name) as rn from products where featured_rank is not null)
             update products p set featured_rank = r.rn from r where p.id = r.id`);
  }

  const products = {
    async list(p) {
      const where = [];
      const params = [];
      const status = p.status || 'active';
      if (status === 'active') where.push(`status <> 'archived'`);
      else if (status !== 'all') { params.push(status); where.push(`status = $${params.length}`); }
      if (p.category) { params.push(p.category); where.push(`category = $${params.length}`); }
      if (p.featured) where.push('featured_rank is not null');
      if (p.search) {
        params.push('%' + String(p.search).replace(/[%_\\]/g, '\\$&') + '%');
        where.push(`(name || ' ' || sku || ' ' || stones || ' ' || badge) ilike $${params.length}`);
      }
      return db.query(`select ${PRODUCT_COLS} from products ${where.length ? 'where ' + where.join(' and ') : ''} order by updated_at desc`, params);
    },
    get: (id) => getProduct(db.query, id),
    async create(d, user) {
      return db.tx(async (q) => {
        const s = await getSettings(q);
        const v = normaliseProduct(Object.assign({ making_value: s.default_making_percent, low_stock_at: s.low_stock_default }, d));
        validateProduct(v);
        v.sku = v.sku || await nextSku(q, v.category);
        await checkSku(q, v.sku, null);
        const stock = Object.fromEntries(s.showrooms.map((r) => [r.id, 0]));
        const [row] = await q(`insert into products (sku, name, category, badge, description, metal, karat, weight_g, stones,
            pricing_mode, making_type, making_value, stone_value, fixed_price, show_price, images, low_stock_at, status, stock)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19::jsonb) returning id`,
          productParams(v).concat([json(stock)]));
        for (const [room, qty] of Object.entries(d.stock || {})) {
          const n = Math.round(num(qty) || 0);
          if (n > 0) await move(q, s, row.id, room, n, 'received', 'Opening stock', '', user.name);
        }
        if (d.featured) await q('update products set featured_rank = (select coalesce(max(featured_rank), 0) + 1 from products) where id = $1', [row.id]);
        return getProduct(q, row.id);
      });
    },
    async update(id, d) {
      return db.tx(async (q) => {
        const cur = await lockProduct(q, id);
        const merged = Object.assign({}, cur);
        WRITABLE.forEach((k) => { if (k in d) merged[k] = d[k]; });
        const v = normaliseProduct(merged);
        validateProduct(v);
        v.sku = v.sku || cur.sku;
        await checkSku(q, v.sku, id);
        await q(`update products set sku=$1, name=$2, category=$3, badge=$4, description=$5, metal=$6, karat=$7, weight_g=$8, stones=$9,
            pricing_mode=$10, making_type=$11, making_value=$12, stone_value=$13, fixed_price=$14, show_price=$15, images=$16::jsonb,
            low_stock_at=$17, status=$18, updated_at=now() where id=$19`, productParams(v).concat([id]));
        if ('featured' in d) {
          if (d.featured && !cur.featured_rank) {
            await q('update products set featured_rank = (select coalesce(max(featured_rank), 0) + 1 from products) where id = $1', [id]);
          } else if (!d.featured && cur.featured_rank) {
            await q('update products set featured_rank = null where id = $1', [id]);
            await renumberFeatured(q);
          }
        }
        return getProduct(q, id);
      });
    },
    async remove(id) {
      return db.tx(async (q) => {
        const p = await lockProduct(q, id);
        const used = await q('select 1 from orders where items @> $1::jsonb limit 1', [json([{ product_id: id }])]);
        if (used.length) fail(409, `${p.name} appears on past orders, so it can’t be deleted. Set it to Archived instead — it disappears from the website but the order history stays intact.`);
        await q('delete from products where id = $1', [id]);
        if (p.featured_rank) await renumberFeatured(q);
        return { ok: true };
      });
    }
  };

  /* ------------------------------------------------------------------
     Stock
     ------------------------------------------------------------------ */
  const stock = {
    async adjust(d, user) {
      return db.tx(async (q) => {
        const s = await getSettings(q);
        const p = await lockProduct(q, d.product_id);
        const room = String(d.showroom || '');
        if (!s.showrooms.some((r) => r.id === room)) bad('Pick a showroom.');
        const have = Number(p.stock[room]) || 0;
        const reason = ['received', 'removed', 'count'].includes(d.reason) ? d.reason : 'adjustment';
        let delta = Math.round(num(d.delta) || 0);
        if (reason === 'count') {
          const count = num(d.count);
          if (count == null || count < 0) bad('Enter how many pieces are on the shelf.');
          delta = Math.round(count) - have;
          if (!delta) bad(`The count matches what the system already has (${have}).`);
        }
        if (!delta) bad('Enter how many pieces.');
        if (have + delta < 0) bad(`There ${have === 1 ? 'is' : 'are'} only ${have} in ${roomName(s, room)}.`);
        await move(q, s, p.id, room, delta, reason, d.note, '', user.name);
        return getProduct(q, p.id);
      });
    },
    async transfer(d, user) {
      return db.tx(async (q) => {
        const s = await getSettings(q);
        const p = await lockProduct(q, d.product_id);
        const qty = Math.round(num(d.qty) || 0);
        if (d.from === d.to) bad('Pick two different showrooms.');
        if (qty <= 0) bad('Enter how many pieces to move.');
        const have = Number(p.stock[d.from]) || 0;
        if (qty > have) bad(`Only ${have} in ${roomName(s, d.from)}.`);
        await move(q, s, p.id, d.from, -qty, 'transfer_out', d.note || 'Moved to ' + roomName(s, d.to), '', user.name);
        await move(q, s, p.id, d.to, qty, 'transfer_in', d.note || 'Moved from ' + roomName(s, d.from), '', user.name);
        return getProduct(q, p.id);
      });
    },
    async movements(p) {
      const params = [];
      let where = '';
      if (p.product_id) {
        if (!UUID.test(String(p.product_id))) return [];
        params.push(p.product_id);
        where = 'where m.product_id = $1';
      }
      params.push(Math.min(500, Math.max(1, Math.round(num(p.limit) || 100))));
      return db.query(`select m.id, m.product_id, m.showroom, m.delta, m.reason, m.note, m.order_number, m.at, m.by_name as "by",
                              coalesce(p.name, 'Deleted piece') as product_name, coalesce(p.sku, '') as product_sku
                         from stock_movements m left join products p on p.id = m.product_id
                         ${where} order by m.at desc limit $${params.length}`, params);
    }
  };

  /* ------------------------------------------------------------------
     Gold rates
     ------------------------------------------------------------------ */
  const RATE_COLS = 'date::text as date, per_gram, updated_at, updated_by';
  const rates = {
    async list(p) {
      await ensureTodayRate();
      return db.query(`select ${RATE_COLS} from gold_rates order by date desc limit $1`, [Math.min(400, Math.max(1, Math.round(num(p.limit) || 60)))]);
    },
    async save(d, user) {
      const g = d.per_gram || {};
      const per = {};
      KARATS.forEach((k) => {
        const v = num(g[k]);
        if (!(v > 0)) bad(`Enter the ${k}kt rate.`);
        per[k] = Math.round(v * 1000) / 1000; /* per gram, so a pawn (8 g) rate round-trips exactly */
      });
      const date = DAY.test(String(d.date || '')) ? d.date : colomboDay(new Date());
      const [row] = await db.query(`insert into gold_rates (date, per_gram, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
          on conflict (date) do update set per_gram = excluded.per_gram, updated_at = now(), updated_by = excluded.updated_by
          returning ${RATE_COLS}`, [date, json(per), user.name]);
      return row;
    }
  };

  /* ------------------------------------------------------------------
     Orders
     ------------------------------------------------------------------ */
  const payStatus = (paid, total) => (paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'advance');
  const hist = (type, status, text, by) => ({ type, status: status || null, at: nowIso(), text: text || '', by });

  async function normaliseItems(q, items) {
    if (!Array.isArray(items) || !items.length) bad('Add at least one item to the order.');
    if (items.length > 50) bad('That is too many items for one order.');
    const ids = items.map((it) => it && it.product_id).filter(Boolean);
    if (ids.some((id) => !UUID.test(String(id)))) bad('One of the pieces on this order no longer exists.');
    const found = ids.length ? await q('select id, sku, name, images from products where id = any($1::uuid[])', [ids]) : [];
    const byId = Object.fromEntries(found.map((p) => [p.id, p]));
    return items.map((it) => {
      const qty = Math.max(1, Math.round(num(it.qty) || 1));
      const unit = Math.max(0, num(it.unit_price) || 0);
      const name = str(it.name, 160);
      if (it.product_id) {
        const p = byId[it.product_id];
        if (!p) bad('One of the pieces on this order no longer exists.');
        return { product_id: p.id, sku: p.sku, image: (p.images[0] && p.images[0].url) || '', name: name || p.name, qty, unit_price: unit, note: str(it.note, 300), from_stock: Boolean(it.from_stock) };
      }
      if (!name) bad('Every custom item needs a description.');
      return { product_id: null, sku: '', image: '', name, qty, unit_price: unit, note: str(it.note, 300), from_stock: false };
    });
  }

  async function buildOrder(q, s, d) {
    const c = d.customer || {};
    const customer = { name: str(c.name, 120), phone: str(c.phone, 40), email: str(c.email, 200), address: str(c.address, 500) };
    if (!customer.name) bad('Add the customer’s name.');
    if (!customer.phone) bad('Add the customer’s phone number, so the shop can reach them.');
    if (!s.showrooms.some((r) => r.id === d.showroom)) bad('Pick a showroom.');
    const items = await normaliseItems(q, d.items);
    const subtotal = items.reduce((t, it) => t + it.qty * it.unit_price, 0);
    const discount = Math.min(subtotal, Math.max(0, num(d.discount) || 0));
    return {
      channel: CHANNELS.includes(d.channel) ? d.channel : 'walk_in',
      showroom: d.showroom,
      customer,
      items,
      subtotal,
      discount,
      total: subtotal - discount,
      fulfilment: d.fulfilment === 'delivery' ? 'delivery' : 'pickup',
      due_date: DAY.test(String(d.due_date || '')) ? d.due_date : null,
      notes: str(d.notes, 2000)
    };
  }

  /* What an order holds back from the shelves: { "productId|showroom": qty } */
  function held(o) {
    const out = {};
    if (!o || o.status === 'cancelled') return out;
    o.items.forEach((it) => {
      if (!it.product_id || !it.from_stock) return;
      const k = it.product_id + '|' + o.showroom;
      out[k] = (out[k] || 0) + it.qty;
    });
    return out;
  }

  async function reconcile(q, s, before, after, takeReason, returnReason, number, by) {
    const a = held(before);
    const b = held(after);
    const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort(); /* stable lock order */
    for (const k of keys) {
      const diff = (b[k] || 0) - (a[k] || 0);
      if (!diff) continue;
      const [pid, room] = k.split('|');
      const rows = await q('select id, name, stock from products where id = $1 for update', [pid]);
      if (!rows.length) continue;
      const have = Number(rows[0].stock[room]) || 0;
      if (diff > 0 && have < diff) bad(`Only ${have} × ${rows[0].name} in ${roomName(s, room)}. Untick “from stock” to order it in.`);
      await move(q, s, pid, room, -diff, diff > 0 ? takeReason : returnReason, '', number, by);
    }
  }

  async function saveOrderRow(q, o) {
    await q(`update orders set channel=$1, showroom=$2, customer=$3::jsonb, items=$4::jsonb, subtotal=$5, discount=$6, total=$7,
               paid=$8, payment_status=$9, payments=$10::jsonb, fulfilment=$11, due_date=$12, status=$13, tracking=$14::jsonb,
               notes=$15, history=$16::jsonb, updated_at=now()
             where id=$17`,
      [o.channel, o.showroom, json(o.customer), json(o.items), o.subtotal, o.discount, o.total, o.paid,
        payStatus(o.paid, o.total), json(o.payments), o.fulfilment, o.due_date, o.status, json(o.tracking), o.notes, json(o.history), o.id]);
    return getOrder(q, o.id);
  }

  const orders = {
    async list(p) {
      const where = [];
      const params = [];
      if (p.status === 'open') where.push(`status not in ('completed', 'cancelled')`);
      else if (STATUSES.includes(p.status)) { params.push(p.status); where.push(`status = $${params.length}`); }
      params.push(Math.min(2000, Math.max(1, Math.round(num(p.limit) || 500))));
      let rows = await db.query(`select ${ORDER_COLS} from orders ${where.length ? 'where ' + where.join(' and ') : ''}
                                  order by created_at desc limit $${params.length}`, params);
      if (p.search) {
        const s = String(p.search).toLowerCase().replace(/\s+/g, '');
        rows = rows.filter((o) => (o.number + o.customer.name + o.customer.phone).toLowerCase().replace(/\s+/g, '').includes(s));
      }
      return rows;
    },
    get: (id) => getOrder(db.query, id),
    async create(d, user) {
      return db.tx(async (q) => {
        const s = await getSettings(q);
        const f = await buildOrder(q, s, d);
        /* Take stock first under a placeholder, so an order refused for
           stock never uses up an order number and leaves a gap */
        const pending = 'pending-' + crypto.randomUUID();
        let status = d.status === 'completed' ? 'completed' : 'new';
        await reconcile(q, s, null, { status, showroom: f.showroom, items: f.items }, 'sale', 'order_edited', pending, user.name);
        const [{ n }] = await q(`select nextval('order_number_seq') as n`);
        const number = 'PJ-' + n;
        await q('update stock_movements set order_number = $1 where order_number = $2', [number, pending]);
        const history = [hist('status', 'new', 'Order created', user.name)];
        const payments = [];
        let paid = 0;
        const amount = num(d.payment && d.payment.amount) || 0;
        if (amount > 0) {
          const method = METHODS[d.payment.method] ? d.payment.method : 'cash';
          payments.push({ amount, method, at: nowIso(), note: '', by: user.name });
          paid = amount;
          history.push(hist('payment', null, `${money(amount)} received · ${METHODS[method]}`, user.name));
        }
        if (status === 'completed') history.push(hist('status', 'completed', 'Sold at the counter', user.name));
        const [row] = await q(`insert into orders (number, channel, showroom, customer, items, subtotal, discount, total, paid, payment_status,
              payments, fulfilment, due_date, status, notes, history)
            values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16::jsonb) returning id`,
          [number, f.channel, f.showroom, json(f.customer), json(f.items), f.subtotal, f.discount, f.total, paid, payStatus(paid, f.total),
            json(payments), f.fulfilment, f.due_date, status, f.notes, json(history)]);
        return getOrder(q, row.id);
      });
    },
    async update(id, d, user) {
      return db.tx(async (q) => {
        const s = await getSettings(q);
        const cur = await getOrder(q, id, true);
        const f = await buildOrder(q, s, d);
        const next = Object.assign({}, cur, f);
        await reconcile(q, s, cur, next, 'sale', 'order_edited', cur.number, user.name);
        next.history = cur.history.concat([hist('edit', null, 'Order details edited', user.name)]);
        return saveOrderRow(q, next);
      });
    },
    async setStatus(id, d, user) {
      return db.tx(async (q) => {
        const s = await getSettings(q);
        if (!STATUSES.includes(d.status)) bad('Unknown status.');
        const cur = await getOrder(q, id, true);
        if (cur.status === d.status && !str(d.note)) bad('The order already has that status.');
        const next = Object.assign({}, cur, { status: d.status });
        if (d.tracking) next.tracking = { courier: str(d.tracking.courier, 80), number: str(d.tracking.number, 80) };
        await reconcile(q, s, cur, next, 'sale', 'order_cancelled', cur.number, user.name);
        next.history = cur.history.concat([hist('status', d.status, str(d.note), user.name)]);
        return saveOrderRow(q, next);
      });
    },
    async addPayment(id, d, user) {
      return db.tx(async (q) => {
        const cur = await getOrder(q, id, true);
        const amount = num(d.amount);
        if (!(amount > 0)) bad('Enter the amount received.');
        const method = METHODS[d.method] ? d.method : 'cash';
        const note = str(d.note, 200);
        const next = Object.assign({}, cur);
        next.payments = cur.payments.concat([{ amount, method, at: nowIso(), note, by: user.name }]);
        next.paid = next.payments.reduce((t, x) => t + Number(x.amount), 0);
        next.history = cur.history.concat([hist('payment', null, `${money(amount)} received · ${METHODS[method]}${note ? ' — ' + note : ''}`, user.name)]);
        return saveOrderRow(q, next);
      });
    }
  };

  /* ------------------------------------------------------------------
     Reports — by Sri Lankan calendar day
     ------------------------------------------------------------------ */
  const reports = {
    async sales(p) {
      const days = Math.min(366, Math.max(1, Math.round(num(p.days) || 14)));
      const rows = [];
      for (let i = days - 1; i >= 0; i--) rows.push({ date: colomboDay(Date.now() - i * 864e5), total: 0, orders: 0 });
      const index = Object.fromEntries(rows.map((r, i) => [r.date, i]));
      const found = await db.query(`select created_at, total::float8 as total from orders where status <> 'cancelled' and created_at >= $1`, [colomboStart(days - 1)]);
      found.forEach((o) => {
        const i = index[colomboDay(o.created_at)];
        if (i == null) return;
        rows[i].total += o.total;
        rows[i].orders += 1;
      });
      return rows;
    },
    async bestSellers(p) {
      const days = Math.round(num(p.days) || 0);
      const params = [];
      let where = `status <> 'cancelled'`;
      if (days > 0) { params.push(colomboStart(days - 1)); where += ' and created_at >= $1'; }
      const found = await db.query(`select items from orders where ${where}`, params);
      const tally = {};
      found.forEach((o) => o.items.forEach((it) => {
        if (!it.product_id) return;
        const t = (tally[it.product_id] = tally[it.product_id] || { product_id: it.product_id, units: 0, revenue: 0, orders: 0 });
        t.units += it.qty;
        t.revenue += it.qty * it.unit_price;
        t.orders += 1;
      }));
      const ids = Object.keys(tally);
      if (!ids.length) return [];
      const prods = await db.query('select id, name, sku, images, featured_rank, status from products where id = any($1::uuid[])', [ids]);
      return prods
        .map((pr) => Object.assign(tally[pr.id], { name: pr.name, sku: pr.sku, images: pr.images, featured_rank: pr.featured_rank, status: pr.status }))
        .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
        .slice(0, Math.min(200, Math.max(1, Math.round(num(p.limit) || 50))));
    }
  };

  /* ------------------------------------------------------------------
     Homepage, settings, uploads, public
     ------------------------------------------------------------------ */
  async function setFeatured(b) {
    const ids = b.product_ids;
    if (!Array.isArray(ids) || ids.some((id) => !UUID.test(String(id)))) bad('Send a list of product ids.');
    return db.tx(async (q) => {
      await q('update products set featured_rank = null where featured_rank is not null');
      for (let i = 0; i < ids.length; i++) {
        const r = await q('update products set featured_rank = $2 where id = $1 returning id', [ids[i], i + 1]);
        if (!r.length) bad('One of those pieces no longer exists.');
      }
      return q(`select ${PRODUCT_COLS} from products where featured_rank is not null order by featured_rank`);
    });
  }

  async function updateSettings(d) {
    return db.tx(async (q) => {
      const rows = await q('select data from settings where id = 1 for update');
      const s = rows.length ? rows[0].data : DEFAULT_SETTINGS;
      if (d.shop_name !== undefined) s.shop_name = str(d.shop_name, 80) || s.shop_name;
      ['price_rounding', 'default_making_percent', 'low_stock_default', 'featured_limit'].forEach((k) => {
        const v = num(d[k]);
        if (v != null && v >= 0) s[k] = v;
      });
      const inRange = (k, lo, hi) => { const v = num(d[k]); if (v != null) { if (v < lo || v > hi) bad(`Keep that between ${lo} and ${hi}.`); s[k] = v; } };
      inRange('market_premium_percent', 0, 30);
      inRange('k22_percent_of_24k', 80, 100);
      inRange('k18_percent_of_24k', 60, 90);
      if (Array.isArray(d.showrooms)) {
        d.showrooms.forEach((u) => {
          const room = s.showrooms.find((r) => r.id === u.id);
          if (room) Object.assign(room, { name: str(u.name, 60) || room.name, phone: str(u.phone, 40), address: str(u.address, 200) });
        });
      }
      await q(`insert into settings (id, data) values (1, $1::jsonb) on conflict (id) do update set data = excluded.data`, [json(s)]);
      return s;
    });
  }

  async function upload(raw, contentType) {
    if (!blob) fail(503, 'Photo storage is not connected yet.');
    const file = parseMultipart(raw, contentType).find((x) => x.name === 'file' && x.data.length);
    if (!file) bad('Choose a photo to upload.');
    if (file.data.length > 4 * 1024 * 1024) bad('That photo is too large. Use one under 4 MB.');
    const kind = imageKind(file.data);
    if (!kind) bad('That file is not a JPG, PNG or WebP photo.');
    const url = await blob.put(`products/${crypto.randomUUID()}.${kind[1]}`, file.data, kind[0]);
    return { url };
  }

  /* The shop's counter rate for the website, in the shape the website's
     gold strip reads (24K and 22K per gram and per pawn). is_today tells the
     website whether staff have entered today's rate yet (Sri Lankan date). */
  async function publicGoldRate() {
    await ensureTodayRate();
    const [r] = await db.query(`select ${RATE_COLS} from gold_rates order by date desc limit 1`);
    if (!r) fail(404, 'No gold rate has been entered yet.');
    const k = (karat) => {
      const gram = Number(r.per_gram[karat]);
      return { gram: Math.round(gram), pawn: Math.round(gram * 8) };
    };
    return {
      source: r.updated_by === AUTO_BY ? 'market' : 'showroom',
      currency: 'LKR',
      date: r.date,
      is_today: r.date === colomboDay(new Date()),
      k24: k(24),
      k22: k(22),
      k18: k(18),
      updated: new Date(r.updated_at).toISOString()
    };
  }

  async function publicMarketRate() {
    let s = DEFAULT_SETTINGS;
    try { s = Object.assign({}, DEFAULT_SETTINGS, await getSettings()); } catch (e) { /* no database yet: defaults */ }
    const r = await marketRate(s);
    const k = (karat) => ({ gram: Math.round(r.per_gram[karat]), pawn: r.pawn[karat] });
    return {
      source: 'market',
      currency: 'LKR',
      date: colomboDay(new Date()),
      k24: k(24), k22: k(22), k18: k(18),
      per_gram: r.per_gram,
      premium_percent: r.premium_percent,
      usd_per_ounce: r.usd_per_ounce,
      usd_lkr: r.usd_lkr,
      updated: r.updated
    };
  }

  async function publicProducts(p) {
    const s = await getSettings();
    const [rate] = await db.query(`select ${RATE_COLS} from gold_rates order by date desc limit 1`);
    const params = [];
    let where = `status = 'published'`;
    if (p.featured) where += ' and featured_rank is not null';
    if (p.category) { params.push(p.category); where += ` and category = $${params.length}`; }
    const rows = await db.query(`select ${PRODUCT_COLS} from products where ${where} order by featured_rank nulls last, name`, params);
    return rows.map((r) => ({
      id: r.id, name: r.name, category: r.category, badge: r.badge, metal: r.metal, karat: r.karat, weight_g: r.weight_g,
      stones: r.stones, description: r.description, images: r.images, featured_rank: r.featured_rank,
      price: r.show_price ? priceOf(r, rate, s.price_rounding) : null
    }));
  }

  /* ------------------------------------------------------------------
     Routing
     ------------------------------------------------------------------ */
  const ROUTES = [
    ['GET', 'health', { public: true }, async () => { await db.query('select 1'); return { ok: true, mode: 'live' }; }],
    ['GET', 'auth/status', { public: true }, () => auth.status()],
    ['POST', 'auth/setup', { public: true }, (r) => auth.setup(r.body)],
    ['POST', 'auth/register', { public: true }, (r) => auth.register(r.body)],
    ['POST', 'auth/login', { public: true }, (r) => auth.login(r.body)],
    ['POST', 'auth/logout', { public: true }, (r) => auth.logout(r.headers)],
    ['GET', 'auth/me', {}, (r) => publicUser(r.user)],
    ['GET', 'public/products', { public: true }, (r) => publicProducts(r.query)],
    ['GET', 'public/gold-rate', { public: true }, () => publicGoldRate()],
    ['GET', 'public/market-rate', { public: true, noDb: true }, () => publicMarketRate()],

    ['GET', 'staff', { owner: true }, () => staff.list()],
    ['POST', 'staff/invites', { owner: true }, (r) => staff.invite(r.body)],
    ['DELETE', 'staff/invites/:email', { owner: true }, (r) => staff.uninvite(r.params.email)],
    ['DELETE', 'staff/:id', { owner: true }, (r) => staff.remove(r.params.id, r.user)],

    ['GET', 'products', {}, (r) => products.list(r.query)],
    ['POST', 'products', {}, (r) => products.create(r.body, r.user)],
    ['GET', 'products/:id', {}, (r) => products.get(r.params.id)],
    ['PUT', 'products/:id', {}, (r) => products.update(r.params.id, r.body, r.user)],
    ['DELETE', 'products/:id', {}, (r) => products.remove(r.params.id)],
    ['POST', 'uploads', {}, (r) => upload(r.raw, r.contentType)],

    ['POST', 'stock/adjust', {}, (r) => stock.adjust(r.body, r.user)],
    ['POST', 'stock/transfer', {}, (r) => stock.transfer(r.body, r.user)],
    ['GET', 'stock/movements', {}, (r) => stock.movements(r.query)],

    ['GET', 'gold-rates', {}, (r) => rates.list(r.query)],
    ['POST', 'gold-rates', {}, (r) => rates.save(r.body, r.user)],

    ['GET', 'orders', {}, (r) => orders.list(r.query)],
    ['POST', 'orders', {}, (r) => orders.create(r.body, r.user)],
    ['GET', 'orders/:id', {}, (r) => orders.get(r.params.id)],
    ['PUT', 'orders/:id', {}, (r) => orders.update(r.params.id, r.body, r.user)],
    ['POST', 'orders/:id/status', {}, (r) => orders.setStatus(r.params.id, r.body, r.user)],
    ['POST', 'orders/:id/payments', {}, (r) => orders.addPayment(r.params.id, r.body, r.user)],

    ['GET', 'reports/sales', {}, (r) => reports.sales(r.query)],
    ['GET', 'reports/best-sellers', {}, (r) => reports.bestSellers(r.query)],
    ['PUT', 'homepage/featured', {}, (r) => setFeatured(r.body)],
    ['GET', 'settings', {}, async () => Object.assign({}, DEFAULT_SETTINGS, await getSettings())],
    ['PUT', 'settings', {}, (r) => updateSettings(r.body)]
  ];

  function match(method, path) {
    const parts = path.split('/').filter(Boolean);
    for (const [m, pattern, opts, fn] of ROUTES) {
      if (m !== method) continue;
      const segs = pattern.split('/');
      if (segs.length !== parts.length) continue;
      const params = {};
      if (segs.every((s, i) => (s[0] === ':' ? (params[s.slice(1)] = decodeURIComponent(parts[i]), true) : s === parts[i]))) {
        return { opts, fn, params };
      }
    }
    return null;
  }

  /* request: { method, path, query, headers, raw (Buffer), contentType } */
  return async function handle(request) {
    try {
      const method = String(request.method || 'GET').toUpperCase();
      const path = String(request.path || '').replace(/^\/+|\/+$/g, '');
      const route = match(method, path);
      if (!route) fail(404, 'No such API route.');
      if (!route.opts.noDb) await ensureSchema();
      else await ensureSchema().catch(() => null); /* works before the database is connected */

      let body = {};
      const type = request.contentType || '';
      if (/json/i.test(type) && request.raw && request.raw.length) {
        try { body = JSON.parse(request.raw.toString('utf8')); } catch (e) { bad('The request was not valid JSON.'); }
        if (!body || typeof body !== 'object') body = {};
      }

      const ctx = { body, query: request.query || {}, headers: request.headers || {}, params: route.params, raw: request.raw || Buffer.alloc(0), contentType: type };
      if (!route.opts.public) {
        ctx.user = await currentUser(ctx.headers);
        if (route.opts.owner && ctx.user.role !== 'owner') fail(403, 'Only the shop owner can do that.');
      }
      const out = await route.fn(ctx);
      return out == null ? { status: 204, body: null } : { status: method === 'POST' && /^(products|orders)$/.test(path) ? 201 : 200, body: out };
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
      if (e && e.status === 503) return { status: 503, body: { error: e.message, code: e.publicCode || 'unavailable' } };
      if (e && e.code === '23505') return { status: 409, body: { error: 'That already exists.' } };
      console.error(e);
      return { status: 500, body: { error: 'Something went wrong on the server. Please try again.' } };
    }
  };
};

module.exports.priceOf = priceOf;
module.exports.parseMultipart = parseMultipart;
