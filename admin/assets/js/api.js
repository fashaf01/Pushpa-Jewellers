/* ==========================================================================
   Pushpa Jewellers admin — the data layer

   Every screen talks to PJ.api and nothing else. There are two adapters
   behind it with the same shape:

     live  — HTTP calls to the REST API in docs/API.md (Hostinger backend)
     demo  — the same operations against sample data in localStorage

   The demo adapter is also the reference implementation of the business
   rules the backend should copy: order numbers, stock coming off when an
   order is placed and going back when it is cancelled, payment status,
   best-seller ranking.
   ========================================================================== */
(function () {
  'use strict';

  const PJ = window.PJ;
  const cfg = window.PJ_CONFIG || {};

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }
  PJ.ApiError = ApiError;

  /* ------------------------------------------------------------------
     Session — the signed-in user and their token
     ------------------------------------------------------------------ */
  const TOKEN_KEY = 'pj-admin-token';
  const USER_KEY = 'pj-admin-user';
  let memToken = null;
  let memUser = null;

  PJ.session = {
    token: () => PJ.storage.get(TOKEN_KEY) || memToken,
    user() {
      try { return JSON.parse(PJ.storage.get(USER_KEY)) || memUser; } catch (e) { return memUser; }
    },
    set(token, user) {
      memToken = token;
      memUser = user;
      try {
        PJ.storage.set(TOKEN_KEY, token);
        PJ.storage.set(USER_KEY, JSON.stringify(user));
      } catch (e) { /* storage blocked — the session lasts until the tab closes */ }
    },
    clear() {
      memToken = memUser = null;
      PJ.storage.remove(TOKEN_KEY);
      PJ.storage.remove(USER_KEY);
    }
  };

  const enc = encodeURIComponent;
  function qs(params) {
    const s = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== '' && v != null) s.set(k, v);
    });
    const str = s.toString();
    return str ? '?' + str : '';
  }

  /* ==================================================================
     LIVE — REST over HTTP
     ================================================================== */
  function httpAdapter(base) {
    async function req(method, path, body, opts = {}) {
      const headers = { Accept: 'application/json' };
      const token = PJ.session.token();
      if (token) headers.Authorization = 'Bearer ' + token;
      let payload;
      if (body instanceof FormData) payload = body;
      else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }

      let res;
      try {
        res = await fetch(base + path, { method, headers, body: payload });
      } catch (e) {
        throw new ApiError('Cannot reach the server. Check the internet connection and try again.', 0);
      }

      const text = await res.text();
      let data = null;
      if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }

      if (res.status === 401 && !opts.login) {
        PJ.session.clear();
        PJ.bus.emit('auth:expired');
        throw new ApiError('Your session has ended. Please sign in again.', 401);
      }
      if (!res.ok) {
        const msg = (data && (data.error || data.message)) ||
          (res.status === 401 ? 'That email and password do not match.' : `The server returned an error (${res.status}).`);
        throw new ApiError(msg, res.status, data);
      }
      return data;
    }

    return {
      mode: 'live',
      base,
      health: () => req('GET', '/health'),
      auth: {
        status: () => req('GET', '/auth/status', undefined, { login: true }),
        setup: (d) => req('POST', '/auth/setup', { name: d.name, email: d.email, password: d.password }, { login: true }),
        register: (d) => req('POST', '/auth/register', { name: d.name, email: d.email, password: d.password }, { login: true }),
        login: (email, password) => req('POST', '/auth/login', { email, password }, { login: true }),
        logout: () => req('POST', '/auth/logout').catch(() => null)
      },
      staff: {
        list: () => req('GET', '/staff'),
        invite: (d) => req('POST', '/staff/invites', d),
        uninvite: (email) => req('DELETE', '/staff/invites/' + enc(email)),
        remove: (id) => req('DELETE', '/staff/' + enc(id))
      },
      products: {
        list: (p) => req('GET', '/products' + qs(p)),
        get: (id) => req('GET', '/products/' + enc(id)),
        create: (d) => req('POST', '/products', d),
        update: (id, d) => req('PUT', '/products/' + enc(id), d),
        remove: (id) => req('DELETE', '/products/' + enc(id))
      },
      uploadImage(blob, name) {
        const fd = new FormData();
        fd.append('file', blob, name);
        return req('POST', '/uploads', fd);
      },
      stock: {
        adjust: (d) => req('POST', '/stock/adjust', d),
        transfer: (d) => req('POST', '/stock/transfer', d),
        movements: (p) => req('GET', '/stock/movements' + qs(p))
      },
      rates: {
        list: (p) => req('GET', '/gold-rates' + qs(p)),
        save: (d) => req('POST', '/gold-rates', d)
      },
      orders: {
        list: (p) => req('GET', '/orders' + qs(p)),
        get: (id) => req('GET', '/orders/' + enc(id)),
        create: (d) => req('POST', '/orders', d),
        update: (id, d) => req('PUT', '/orders/' + enc(id), d),
        setStatus: (id, d) => req('POST', '/orders/' + enc(id) + '/status', d),
        addPayment: (id, d) => req('POST', '/orders/' + enc(id) + '/payments', d)
      },
      reports: {
        bestSellers: (p) => req('GET', '/reports/best-sellers' + qs(p)),
        sales: (p) => req('GET', '/reports/sales' + qs(p))
      },
      homepage: {
        setFeatured: (ids) => req('PUT', '/homepage/featured', { product_ids: ids })
      },
      settings: {
        get: () => req('GET', '/settings'),
        update: (d) => req('PUT', '/settings', d)
      }
    };
  }

  /* ==================================================================
     DEMO — the same API against localStorage
     ================================================================== */
  function demoAdapter() {
    const KEY = 'pj-admin-demo-v1';
    let db = null;

    function load() {
      if (db) return db;
      const raw = PJ.storage.get(KEY);
      if (raw) { try { db = JSON.parse(raw); } catch (e) { db = null; } }
      if (!db || db.version !== 1) { db = PJ.seed(); persist(); }
      return db;
    }

    function persist() {
      try {
        PJ.storage.set(KEY, JSON.stringify(db));
      } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
          throw new ApiError('This browser’s demo storage is full. Use fewer or smaller photos, or reset the demo data in Settings.', 507);
        }
        /* storage blocked entirely — carry on in memory for this tab */
      }
    }

    const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
    const nowIso = () => new Date().toISOString();
    const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 10);
    const who = () => (PJ.session.user() || {}).name || 'Staff';
    const pause = () => new Promise((r) => setTimeout(r, 90));
    const fail = (msg, status = 422) => { throw new ApiError(msg, status); };

    /* Run a read or a write; a write that cannot be saved is rolled back */
    async function run(fn, write = false) {
      await pause();
      load();
      const before = write ? JSON.stringify(db) : null;
      try {
        const out = fn();
        if (write) persist();
        return clone(out);
      } catch (e) {
        if (before) db = JSON.parse(before);
        throw e;
      }
    }

    const findProduct = (id) => db.products.find((p) => p.id === id) || fail('That product no longer exists.', 404);
    const findOrder = (id) => db.orders.find((o) => o.id === id || o.number === id) || fail('That order no longer exists.', 404);
    const latestRate = () => db.rates[0] || null;
    const showroomIds = () => db.settings.showrooms.map((s) => s.id);

    function move(product, showroom, delta, reason, note, orderNumber) {
      if (!showroomIds().includes(showroom)) fail('Unknown showroom.');
      const have = Number(product.stock[showroom]) || 0;
      product.stock[showroom] = have + delta;
      product.updated_at = nowIso();
      db.movements.unshift({ id: uid('m'), product_id: product.id, showroom, delta, reason, note: note || '', order_number: orderNumber || '', at: nowIso(), by: who() });
    }

    /* ---------- products ---------- */

    const PRODUCT_FIELDS = ['sku', 'name', 'category', 'badge', 'description', 'metal', 'karat', 'weight_g', 'stones',
      'pricing_mode', 'making_type', 'making_value', 'stone_value', 'fixed_price', 'show_price', 'images', 'low_stock_at', 'status'];

    function validateProduct(d, id) {
      if (!d.name) fail('Give the piece a name.');
      if (d.sku && db.products.some((p) => p.sku.toLowerCase() === d.sku.toLowerCase() && p.id !== id)) fail(`Another piece already uses SKU ${d.sku}.`);
      if (d.pricing_mode === 'gold_rate') {
        if (!PJ.pricing.isGold(d.metal)) fail('Only gold pieces can follow the gold rate. Use a fixed price for this one.');
        if (!d.karat) fail('Pick the karat, so the right gold rate is used.');
        if (!(Number(d.weight_g) > 0)) fail('Add the weight in grams — the gold-rate price needs it.');
      } else if (!(Number(d.fixed_price) > 0)) fail('Add the price.');
    }

    function nextSku(category) {
      const code = { rings: 'RG', necklaces: 'NK', earrings: 'ER', bangles: 'BG', bracelets: 'BR', pendants: 'PD', chains: 'CH', sets: 'ST' }[category] || 'OT';
      const n = db.products.reduce((m, p) => Math.max(m, Number((p.sku.match(/(\d+)$/) || [])[1]) || 0), 100) + 1;
      return `PJ-${code}-${String(n).padStart(4, '0')}`;
    }

    function listProducts(p = {}) {
      let rows = db.products.slice();
      const status = p.status || 'active';
      if (status === 'active') rows = rows.filter((x) => x.status !== 'archived');
      else if (status !== 'all') rows = rows.filter((x) => x.status === status);
      if (p.category) rows = rows.filter((x) => x.category === p.category);
      if (p.featured) rows = rows.filter((x) => x.featured_rank);
      if (p.search) {
        const q = p.search.toLowerCase();
        rows = rows.filter((x) => (x.name + ' ' + x.sku + ' ' + x.stones + ' ' + x.badge).toLowerCase().includes(q));
      }
      return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }

    /* ---------- orders ---------- */

    function paymentStatus(o) {
      if (o.paid <= 0) return 'unpaid';
      return o.paid >= o.total ? 'paid' : 'advance';
    }

    function normaliseItems(items) {
      if (!Array.isArray(items) || !items.length) fail('Add at least one item to the order.');
      return items.map((it) => {
        const qty = Math.max(1, Math.round(Number(it.qty) || 1));
        const unit = Math.max(0, Number(it.unit_price) || 0);
        let base = { product_id: null, sku: '', image: '' };
        if (it.product_id) {
          const p = findProduct(it.product_id);
          base = { product_id: p.id, sku: p.sku, image: p.images[0] ? p.images[0].url : '' };
        }
        if (!it.name && !base.product_id) fail('Every custom item needs a description.');
        return Object.assign(base, {
          name: it.name || (base.product_id ? findProduct(base.product_id).name : ''),
          qty,
          unit_price: unit,
          note: it.note || '',
          from_stock: Boolean(it.product_id && it.from_stock)
        });
      });
    }

    /* What an order holds back from the shelves, as { "productId|showroom": qty } */
    function heldStock(o) {
      const out = {};
      if (!o || o.status === 'cancelled') return out;
      o.items.forEach((it) => {
        if (!it.product_id || !it.from_stock) return;
        const k = it.product_id + '|' + o.showroom;
        out[k] = (out[k] || 0) + it.qty;
      });
      return out;
    }

    /* Move stock by the difference between what an order held before and after */
    function reconcileStock(before, after, reasonTake, reasonReturn, orderNumber) {
      const a = heldStock(before);
      const b = heldStock(after);
      const keys = new Set(Object.keys(a).concat(Object.keys(b)));
      keys.forEach((k) => {
        const diff = (b[k] || 0) - (a[k] || 0);
        if (!diff) return;
        const [pid, showroom] = k.split('|');
        const p = db.products.find((x) => x.id === pid);
        if (!p) return;
        if (diff > 0 && (Number(p.stock[showroom]) || 0) < diff) {
          fail(`Only ${p.stock[showroom] || 0} × ${p.name} in ${PJ.ctx.showroomName(showroom)}. Untick “from stock” to order it in.`);
        }
        move(p, showroom, -diff, diff > 0 ? reasonTake : reasonReturn, '', orderNumber);
      });
    }

    function buildOrder(d, base) {
      const c = d.customer || {};
      if (!c.name) fail('Add the customer’s name.');
      if (!c.phone) fail('Add the customer’s phone number, so the shop can reach them.');
      if (!showroomIds().includes(d.showroom)) fail('Pick a showroom.');
      const items = normaliseItems(d.items);
      const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
      const discount = Math.min(subtotal, Math.max(0, Number(d.discount) || 0));
      return Object.assign(base, {
        channel: d.channel || 'walk_in',
        showroom: d.showroom,
        customer: { name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' },
        items,
        subtotal,
        discount,
        total: subtotal - discount,
        fulfilment: d.fulfilment === 'delivery' ? 'delivery' : 'pickup',
        due_date: d.due_date || '',
        notes: d.notes || '',
        updated_at: nowIso()
      });
    }

    function since(days) {
      if (!days) return '';
      const d = new Date();
      d.setDate(d.getDate() - Number(days) + 1);
      return PJ.isoDay(d);
    }

    return {
      mode: 'demo',
      base: '',
      health: () => run(() => ({ ok: true, mode: 'demo' })),

      auth: {
        login: (email, password) =>
          run(() => {
            if (!email || !password) fail('Enter an email and a password.');
            const local = email.split('@')[0].replace(/[._-]+/g, ' ');
            const name = local.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Owner';
            return { token: 'demo-' + Date.now(), user: { id: 'u_demo', name, email, role: 'owner' } };
          }),
        logout: () => run(() => null)
      },

      products: {
        list: (p) => run(() => listProducts(p)),
        get: (id) => run(() => findProduct(id)),
        create: (d) =>
          run(() => {
            validateProduct(d);
            const p = { id: uid('p'), created_at: nowIso(), updated_at: nowIso(), featured_rank: null, stock: {} };
            PRODUCT_FIELDS.forEach((k) => { if (k in d) p[k] = d[k]; });
            p.sku = p.sku || nextSku(p.category);
            p.images = p.images || [];
            showroomIds().forEach((s) => { p.stock[s] = 0; });
            db.products.unshift(p);
            /* Opening stock is recorded as a delivery, so the history adds up */
            Object.entries(d.stock || {}).forEach(([s, q]) => { if (Number(q) > 0) move(p, s, Number(q), 'received', 'Opening stock'); });
            if (d.featured) {
              const ranks = db.products.filter((x) => x.featured_rank).length;
              p.featured_rank = ranks + 1;
            }
            return p;
          }, true),
        update: (id, d) =>
          run(() => {
            const p = findProduct(id);
            const next = Object.assign({}, p, d);
            validateProduct(next, id);
            PRODUCT_FIELDS.forEach((k) => { if (k in d) p[k] = d[k]; });
            if ('featured' in d) {
              if (d.featured && !p.featured_rank) p.featured_rank = db.products.filter((x) => x.featured_rank).length + 1;
              if (!d.featured && p.featured_rank) {
                p.featured_rank = null;
                db.products.filter((x) => x.featured_rank).sort((a, b) => a.featured_rank - b.featured_rank).forEach((x, i) => { x.featured_rank = i + 1; });
              }
            }
            p.updated_at = nowIso();
            return p;
          }, true),
        remove: (id) =>
          run(() => {
            const p = findProduct(id);
            if (db.orders.some((o) => o.items.some((it) => it.product_id === id))) {
              fail(`${p.name} appears on past orders, so it can’t be deleted. Set it to Archived instead — it disappears from the website but the order history stays intact.`, 409);
            }
            db.products = db.products.filter((x) => x.id !== id);
            db.movements = db.movements.filter((m) => m.product_id !== id);
            return { ok: true };
          }, true)
      },

      async uploadImage(blob) {
        await pause();
        return { url: await PJ.blobToDataUrl(blob) };
      },

      stock: {
        adjust: (d) =>
          run(() => {
            const p = findProduct(d.product_id);
            const have = Number(p.stock[d.showroom]) || 0;
            let delta = Math.round(Number(d.delta) || 0);
            if (d.reason === 'count') delta = Math.round(Number(d.count)) - have;
            if (!delta) fail(d.reason === 'count' ? `The count matches what the system already has (${have}).` : 'Enter how many pieces.');
            if (have + delta < 0) fail(`There ${have === 1 ? 'is' : 'are'} only ${have} in ${PJ.ctx.showroomName(d.showroom)}.`);
            move(p, d.showroom, delta, d.reason || 'adjustment', d.note);
            return p;
          }, true),
        transfer: (d) =>
          run(() => {
            const p = findProduct(d.product_id);
            const qty = Math.round(Number(d.qty) || 0);
            if (d.from === d.to) fail('Pick two different showrooms.');
            if (qty <= 0) fail('Enter how many pieces to move.');
            const have = Number(p.stock[d.from]) || 0;
            if (qty > have) fail(`Only ${have} in ${PJ.ctx.showroomName(d.from)}.`);
            move(p, d.from, -qty, 'transfer_out', d.note || 'Moved to ' + PJ.ctx.showroomName(d.to));
            move(p, d.to, qty, 'transfer_in', d.note || 'Moved from ' + PJ.ctx.showroomName(d.from));
            return p;
          }, true),
        movements: (p = {}) =>
          run(() => {
            let rows = db.movements;
            if (p.product_id) rows = rows.filter((m) => m.product_id === p.product_id);
            return rows.slice(0, Number(p.limit) || 100).map((m) => {
              const prod = db.products.find((x) => x.id === m.product_id);
              return Object.assign({}, m, { product_name: prod ? prod.name : 'Deleted piece', product_sku: prod ? prod.sku : '' });
            });
          })
      },

      rates: {
        list: (p = {}) => run(() => db.rates.slice(0, Number(p.limit) || 60)),
        save: (d) =>
          run(() => {
            const g = d.per_gram || {};
            PJ.KARATS.forEach((k) => { if (!(Number(g[k]) > 0)) fail(`Enter the ${k}kt rate.`); });
            const entry = {
              date: d.date || PJ.isoDay(),
              per_gram: { 24: Math.round(g[24] * 1000) / 1000, 22: Math.round(g[22] * 1000) / 1000, 18: Math.round(g[18] * 1000) / 1000 },
              updated_at: nowIso(),
              updated_by: who()
            };
            db.rates = db.rates.filter((r) => r.date !== entry.date);
            db.rates.push(entry);
            db.rates.sort((a, b) => b.date.localeCompare(a.date));
            return entry;
          }, true)
      },

      orders: {
        list: (p = {}) =>
          run(() => {
            let rows = db.orders.slice();
            if (p.status === 'open') rows = rows.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
            else if (p.status) rows = rows.filter((o) => o.status === p.status);
            if (p.search) {
              const q = p.search.toLowerCase().replace(/\s+/g, '');
              rows = rows.filter((o) => (o.number + o.customer.name + o.customer.phone).toLowerCase().replace(/\s+/g, '').includes(q));
            }
            return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, Number(p.limit) || 500);
          }),
        get: (id) => run(() => findOrder(id)),
        create: (d) =>
          run(() => {
            const number = 'PJ-' + db.next_order;
            const o = buildOrder(d, { id: 'o_' + db.next_order, number, created_at: nowIso(), status: 'new', payments: [], paid: 0, tracking: { courier: '', number: '' }, history: [] });
            o.history.push({ type: 'status', status: 'new', at: nowIso(), text: 'Order created', by: who() });
            reconcileStock(null, o, 'sale', 'order_edited', number);
            const pay = d.payment || {};
            if (Number(pay.amount) > 0) {
              o.payments.push({ amount: Number(pay.amount), method: pay.method || 'cash', at: nowIso(), note: '', by: who() });
              o.paid = Number(pay.amount);
              o.history.push({ type: 'payment', at: nowIso(), text: `${PJ.fmt.money(pay.amount)} received · ${PJ.label.method(pay.method || 'cash')}`, by: who() });
            }
            if (d.status === 'completed') {
              o.status = 'completed';
              o.history.push({ type: 'status', status: 'completed', at: nowIso(), text: 'Sold at the counter', by: who() });
            }
            o.payment_status = paymentStatus(o);
            db.orders.unshift(o);
            db.next_order++;
            return o;
          }, true),
        update: (id, d) =>
          run(() => {
            const o = findOrder(id);
            const before = clone(o);
            buildOrder(d, o);
            reconcileStock(before, o, 'sale', 'order_edited', o.number);
            o.payment_status = paymentStatus(o);
            o.history.push({ type: 'edit', at: nowIso(), text: 'Order details edited', by: who() });
            return o;
          }, true),
        setStatus: (id, d) =>
          run(() => {
            const o = findOrder(id);
            if (!PJ.ORDER_STATUSES.some((s) => s[0] === d.status)) fail('Unknown status.');
            if (o.status === d.status && !d.note) fail('The order already has that status.');
            const before = clone(o);
            o.status = d.status;
            if (d.tracking) o.tracking = { courier: d.tracking.courier || '', number: d.tracking.number || '' };
            /* Cancelling puts held pieces back on the shelf; reopening takes them again */
            reconcileStock(before, o, 'sale', 'order_cancelled', o.number);
            o.history.push({ type: 'status', status: d.status, at: nowIso(), text: d.note || '', by: who() });
            o.updated_at = nowIso();
            return o;
          }, true),
        addPayment: (id, d) =>
          run(() => {
            const o = findOrder(id);
            const amount = Number(d.amount);
            if (!(amount > 0)) fail('Enter the amount received.');
            o.payments.push({ amount, method: d.method || 'cash', at: nowIso(), note: d.note || '', by: who() });
            o.paid = o.payments.reduce((s, x) => s + x.amount, 0);
            o.payment_status = paymentStatus(o);
            o.history.push({ type: 'payment', at: nowIso(), text: `${PJ.fmt.money(amount)} received · ${PJ.label.method(d.method || 'cash')}${d.note ? ' — ' + d.note : ''}`, by: who() });
            o.updated_at = nowIso();
            return o;
          }, true)
      },

      reports: {
        /* Ranked by pieces sold, then by value, over non-cancelled orders */
        bestSellers: (p = {}) =>
          run(() => {
            const from = since(p.days);
            const tally = {};
            db.orders.forEach((o) => {
              if (o.status === 'cancelled' || (from && PJ.isoDay(o.created_at) < from)) return;
              o.items.forEach((it) => {
                if (!it.product_id) return;
                const t = (tally[it.product_id] = tally[it.product_id] || { product_id: it.product_id, units: 0, revenue: 0, orders: 0 });
                t.units += it.qty;
                t.revenue += it.qty * it.unit_price;
                t.orders += 1;
              });
            });
            return Object.values(tally)
              .map((t) => {
                const prod = db.products.find((x) => x.id === t.product_id);
                return prod ? Object.assign(t, { name: prod.name, sku: prod.sku, images: prod.images, featured_rank: prod.featured_rank, status: prod.status }) : null;
              })
              .filter(Boolean)
              .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
              .slice(0, Number(p.limit) || 50);
          }),
        /* One row per day, oldest first, including days with no sales */
        sales: (p = {}) =>
          run(() => {
            const days = Number(p.days) || 14;
            const rows = [];
            for (let i = days - 1; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              rows.push({ date: PJ.isoDay(d), total: 0, orders: 0 });
            }
            const index = Object.fromEntries(rows.map((r, i) => [r.date, i]));
            db.orders.forEach((o) => {
              if (o.status === 'cancelled') return;
              const i = index[PJ.isoDay(o.created_at)];
              if (i == null) return;
              rows[i].total += o.total;
              rows[i].orders += 1;
            });
            return rows;
          })
      },

      homepage: {
        setFeatured: (ids) =>
          run(() => {
            if (!Array.isArray(ids)) fail('Send a list of product ids.');
            db.products.forEach((p) => { p.featured_rank = null; });
            ids.forEach((id, i) => { findProduct(id).featured_rank = i + 1; });
            return db.products.filter((p) => p.featured_rank).sort((a, b) => a.featured_rank - b.featured_rank);
          }, true)
      },

      settings: {
        get: () => run(() => db.settings),
        update: (d) =>
          run(() => {
            const s = db.settings;
            if (d.shop_name !== undefined) s.shop_name = d.shop_name || s.shop_name;
            ['price_rounding', 'default_making_percent', 'low_stock_default', 'featured_limit'].forEach((k) => {
              if (d[k] != null && !isNaN(d[k])) s[k] = Number(d[k]);
            });
            if (Array.isArray(d.showrooms)) {
              d.showrooms.forEach((upd) => {
                const room = s.showrooms.find((x) => x.id === upd.id);
                if (room) Object.assign(room, { name: upd.name || room.name, phone: upd.phone || '', address: upd.address || '' });
              });
            }
            return s;
          }, true)
      },

      /* Demo-only extras */
      demo: {
        exportAll: () => run(() => db),
        reset: () => run(() => { db = PJ.seed(); return { ok: true }; }, true)
      }
    };
  }

  const base = String(cfg.API_BASE_URL || '').trim().replace(/\/+$/, '');
  PJ.api = base ? httpAdapter(base) : demoAdapter();
})();
