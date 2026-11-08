/* Pushpa Jewellers admin — catalogue vocabulary and the price formula.

   The same formula must run on the server for the public website, so it is
   written out in plain terms in docs/API.md ("How a price is worked out"). */
(function () {
  'use strict';

  const PJ = window.PJ;

  PJ.CATEGORIES = [
    ['rings', 'Rings'],
    ['necklaces', 'Necklaces'],
    ['earrings', 'Earrings'],
    ['bangles', 'Bangles'],
    ['bracelets', 'Bracelets'],
    ['pendants', 'Pendants'],
    ['chains', 'Chains'],
    ['sets', 'Bridal & sets'],
    ['other', 'Other']
  ];

  PJ.METALS = [
    ['yellow_gold', 'Yellow gold'],
    ['white_gold', 'White gold'],
    ['rose_gold', 'Rose gold'],
    ['platinum', 'Platinum'],
    ['silver', 'Silver'],
    ['other', 'Other']
  ];

  PJ.KARATS = [24, 22, 18];

  PJ.BADGES = ['Bridal', '22kt gold', 'Gemstone', 'New', 'Best seller', 'Bespoke'];

  PJ.ORDER_STATUSES = [
    ['new', 'New'],
    ['confirmed', 'Confirmed'],
    ['in_making', 'In the workshop'],
    ['ready', 'Ready'],
    ['dispatched', 'Out for delivery'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled']
  ];

  PJ.CHANNELS = [
    ['walk_in', 'Walk-in'],
    ['whatsapp', 'WhatsApp'],
    ['phone', 'Phone call'],
    ['instagram', 'Instagram'],
    ['facebook', 'Facebook'],
    ['website', 'Website']
  ];

  PJ.PAYMENT_METHODS = [
    ['cash', 'Cash'],
    ['card', 'Card'],
    ['bank', 'Bank transfer'],
    ['old_gold', 'Old gold exchange'],
    ['other', 'Other']
  ];

  const label = (list, key) => (list.find((x) => x[0] === key) || [key, key || '—'])[1];
  PJ.label = {
    category: (k) => label(PJ.CATEGORIES, k),
    metal: (k) => label(PJ.METALS, k),
    channel: (k) => label(PJ.CHANNELS, k),
    method: (k) => label(PJ.PAYMENT_METHODS, k),
    /* "Ready" reads differently for a collection and a delivery */
    status(k, order) {
      if (k === 'ready') return order && order.fulfilment === 'delivery' ? 'Ready to dispatch' : 'Ready for pickup';
      return label(PJ.ORDER_STATUSES, k);
    },
    payment: (k) => ({ paid: 'Paid', advance: 'Advance paid', unpaid: 'Unpaid', refunded: 'Refunded' }[k] || k),
    /* "22kt yellow gold" · "Platinum" */
    metalLine(p) {
      const metal = PJ.label.metal(p.metal);
      const gold = isGold(p.metal);
      return gold && p.karat ? `${p.karat}kt ${metal.toLowerCase()}` : metal;
    }
  };

  /* Steps an order moves through, in order. Delivery adds "Out for delivery". */
  PJ.orderFlow = (order) =>
    ['new', 'confirmed', 'in_making', 'ready']
      .concat(order && order.fulfilment === 'delivery' ? ['dispatched'] : [])
      .concat(['completed']);

  /* ------------------------------------------------------------------
     Gold rate
     Sri Lankan shops quote gold per pawn (sovereign) — 8 grams.
     Rates are stored per gram, keyed by karat.
     ------------------------------------------------------------------ */
  const PAWN_G = 8;
  const PURITY = { 24: 0.999, 22: 0.916, 18: 0.75 };

  function isGold(metal) {
    return metal === 'yellow_gold' || metal === 'white_gold' || metal === 'rose_gold';
  }

  /* Fill 24kt and 18kt from a 22kt figure by purity — a starting point the
     shop can overwrite with the rate it actually buys at. */
  function deriveFrom22(per22) {
    const pure = per22 / PURITY[22];
    const r3 = (n) => Math.round(n * 1000) / 1000;
    return { 24: r3(pure * PURITY[24]), 22: r3(per22), 18: r3(pure * PURITY[18]) };
  }

  function roundTo(n, step) {
    const s = Number(step) || 1;
    return Math.round(n / s) * s;
  }

  /* Work out a piece's price.
     rate: { date, per_gram: { 24, 22, 18 } } — the latest saved gold rate
     Returns the parts so screens can show the working, not just a total. */
  function priceOf(p, rate, rounding = 100) {
    const out = { mode: p.pricing_mode, total: null, metal: 0, making: 0, stones: 0, perGram: null, missing: null };

    if (p.pricing_mode === 'fixed') {
      out.total = Number(p.fixed_price) || null;
      if (!out.total) out.missing = 'No price set';
      return out;
    }

    /* gold_rate */
    if (!isGold(p.metal)) { out.missing = 'Only gold can follow the gold rate'; return out; }
    const perGram = rate && rate.per_gram ? Number(rate.per_gram[p.karat]) : NaN;
    if (!perGram) { out.missing = p.karat ? `No ${p.karat}kt rate saved yet` : 'Pick a karat'; return out; }
    const weight = Number(p.weight_g);
    if (!weight) { out.missing = 'Add the weight in grams'; return out; }

    out.perGram = perGram;
    out.metal = weight * perGram;
    out.making = p.making_type === 'flat' ? Number(p.making_value) || 0 : (out.metal * (Number(p.making_value) || 0)) / 100;
    out.stones = Number(p.stone_value) || 0;
    out.total = roundTo(out.metal + out.making + out.stones, rounding);
    return out;
  }

  const totalStock = (p) => Object.values(p.stock || {}).reduce((a, b) => a + (Number(b) || 0), 0);

  function stockState(p) {
    const t = totalStock(p);
    if (t <= 0) return 'out';
    if (t <= (Number(p.low_stock_at) || 0)) return 'low';
    return 'ok';
  }

  PJ.pricing = { PAWN_G, PURITY, isGold, deriveFrom22, roundTo, priceOf, totalStock, stockState };

  /* Shared context loaded once after sign-in: settings and the latest rate */
  PJ.ctx = {
    settings: null,
    rate: null,
    showrooms() { return (this.settings && this.settings.showrooms) || []; },
    showroomName(id) { const s = this.showrooms().find((x) => x.id === id); return s ? s.name : id; },
    rounding() { return (this.settings && this.settings.price_rounding) || 100; },
    price(p) { return priceOf(p, this.rate, this.rounding()); }
  };
})();
