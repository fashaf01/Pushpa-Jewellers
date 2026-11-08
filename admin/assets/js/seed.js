/* Pushpa Jewellers admin — demo data for DEMO MODE only.

   The first eight pieces are the ones in the website's Favourites carousel,
   with the same photographs, so the demo lines up with the live page.
   Weights, prices, customers and orders are illustrative. Dates are laid
   out relative to the day the demo is first opened, so it always looks current. */
(function () {
  'use strict';

  const PJ = window.PJ;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const IMG = 'https://img.magnific.com/free-photo/';

  const PRODUCTS = [
    { sku: 'PJ-RG-0101', name: 'Diamond ring', category: 'rings', badge: 'Bridal', metal: 'yellow_gold', karat: 18, weight_g: 3.6, stones: 'Natural diamonds · 0.42 ct', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 15, stone_value: 240000, show_price: false, img: 'gold-ring-with-diamonds_1203-1534.jpg', stock: [2, 1], featured: 1 },
    { sku: 'PJ-NK-0102', name: 'Bridal necklace', category: 'necklaces', badge: '22kt gold', metal: 'yellow_gold', karat: 22, weight_g: 42.6, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 14, stone_value: 0, show_price: true, img: 'top-view-bright-gold-necklace_23-2149836468.jpg', stock: [1, 0], featured: 2 },
    { sku: 'PJ-ER-0103', name: 'Gold earrings', category: 'earrings', badge: '', metal: 'yellow_gold', karat: 18, weight_g: 4.8, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 12, stone_value: 0, show_price: false, img: 'aesthetic-golden-earrings-assortment_23-2149846587.jpg', stock: [4, 3], featured: 3 },
    { sku: 'PJ-RG-0104', name: 'Gemstone ring', category: 'rings', badge: 'Gemstone', metal: 'yellow_gold', karat: 18, weight_g: 4.1, stones: 'Natural blue sapphire · 1.8 ct', pricing_mode: 'fixed', fixed_price: 365000, show_price: false, img: 'golden-ring-with-purple-gemstone_1203-1529.jpg', stock: [1, 1], featured: 4 },
    { sku: 'PJ-BR-0105', name: 'Gold bracelet', category: 'bracelets', badge: '', metal: 'yellow_gold', karat: 22, weight_g: 12.4, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 10, stone_value: 0, show_price: true, img: 'side-view-hand-holding-gold-bracelet_23-2149836428.jpg', stock: [3, 2], featured: 5 },
    { sku: 'PJ-ST-0106', name: 'Necklace, bracelet & earring set', category: 'sets', badge: '22kt gold', metal: 'yellow_gold', karat: 22, weight_g: 68.2, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 14, stone_value: 0, show_price: true, img: 'high-angle-shot-beautiful-golden-necklace-bracelet-earing-white-surface_181624-58013.jpg', stock: [1, 0], featured: 6 },
    { sku: 'PJ-PD-0107', name: 'Pendant necklace', category: 'pendants', badge: '', metal: 'yellow_gold', karat: 18, weight_g: 5.2, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 12, stone_value: 0, show_price: false, img: 'beautiful-luxury-necklace-jewelry-stand-neck_1339-7946.jpg', stock: [2, 2], featured: 7 },
    { sku: 'PJ-CH-0108', name: 'Gold chain', category: 'chains', badge: '22kt gold', metal: 'yellow_gold', karat: 22, weight_g: 16.0, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 8, stone_value: 0, show_price: true, img: 'top-view-gold-chain-white-background_23-2149836434.jpg', stock: [5, 3], featured: 8 },
    { sku: 'PJ-RG-0109', name: 'Wedding bands (pair)', category: 'rings', badge: 'Bridal', metal: 'yellow_gold', karat: 22, weight_g: 9.6, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 8, stone_value: 0, show_price: true, stock: [6, 4] },
    { sku: 'PJ-BG-0110', name: 'Baby bangle', category: 'bangles', badge: '', metal: 'yellow_gold', karat: 22, weight_g: 7.2, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 9, stone_value: 0, show_price: true, stock: [0, 1], low: 2 },
    { sku: 'PJ-RG-0111', name: 'Platinum band', category: 'rings', badge: '', metal: 'platinum', karat: null, weight_g: 6.5, stones: '', pricing_mode: 'fixed', fixed_price: 185000, show_price: true, stock: [2, 0] },
    { sku: 'PJ-PD-0112', name: 'Ceylon sapphire pendant', category: 'pendants', badge: 'Gemstone', metal: 'white_gold', karat: 18, weight_g: 3.2, stones: 'Ceylon blue sapphire · 2.1 ct', pricing_mode: 'fixed', fixed_price: 295000, show_price: false, stock: [1, 0], status: 'draft' },
    { sku: 'PJ-BG-0113', name: 'Gold bangles (set of four)', category: 'bangles', badge: '22kt gold', metal: 'yellow_gold', karat: 22, weight_g: 32.0, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 11, stone_value: 0, show_price: true, stock: [2, 1] },
    { sku: 'PJ-ER-0114', name: 'Jhumka earrings', category: 'earrings', badge: '', metal: 'yellow_gold', karat: 22, weight_g: 11.5, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 13, stone_value: 0, show_price: true, stock: [0, 0] },
    { sku: 'PJ-PD-0115', name: 'Thali pendant', category: 'pendants', badge: 'Bridal', metal: 'yellow_gold', karat: 22, weight_g: 8.0, stones: '', pricing_mode: 'gold_rate', making_type: 'flat', making_value: 18000, stone_value: 0, show_price: true, stock: [3, 1] },
    { sku: 'PJ-CH-0116', name: 'Men’s curb chain', category: 'chains', badge: '', metal: 'yellow_gold', karat: 22, weight_g: 24.0, stones: '', pricing_mode: 'gold_rate', making_type: 'percent', making_value: 8, stone_value: 0, show_price: true, stock: [1, 1] }
  ];

  const CUSTOMERS = [
    ['Nimali Perera', '077 000 1418', 'Lewis Place, Negombo'],
    ['Kasun Fernando', '071 000 2290', 'Kochchikade'],
    ['Dilani Rodrigo', '076 000 3157', 'Seeduwa'],
    ['Ruwan Cooray', '077 000 4462', 'Ja-Ela'],
    ['Shanika Mendis', '070 000 5531', 'Katunayake'],
    ['Tharindu Peiris', '072 000 6604', 'Wattala'],
    ['Anushka de Croos', '077 000 7719', 'Negombo'],
    ['Chathuri Gunawardena', '078 000 8826', 'Minuwangoda'],
    ['Fathima Rizna', '075 000 9935', 'Kurana, Negombo'],
    ['Malsha Fonseka', '071 000 1043', 'Kadana'],
    ['Priya Selvarajah', '077 000 1158', 'Colombo 13'],
    ['Roshan Costa', '076 000 1267', 'Pamunugama']
  ];

  /* Popular pieces come up more often, so "best sellers" has a story */
  const WEIGHTS = [2, 1, 6, 1, 5, 1, 3, 7, 6, 2, 1, 0, 2, 3, 4, 2];

  function pick(r, list) { return list[Math.floor(r() * list.length)]; }
  function pickWeighted(r, items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let x = r() * total;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
    return items[items.length - 1];
  }

  PJ.seed = function seed() {
    const r = rng(1967);
    const now = new Date();
    const at = (daysAgo, hour, min) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(hour, min, 0, 0);
      return d;
    };
    const iso = (d) => d.toISOString();
    const showroomIds = ['negombo', 'katunayake'];

    const settings = {
      shop_name: 'Pushpa Jewellers',
      showrooms: [
        { id: 'negombo', name: 'Negombo', phone: '031 223 3857', address: '67 & 69 Greens Road, Negombo' },
        { id: 'katunayake', name: 'Katunayake', phone: '077 777 0203', address: '8A Averiwatte Road, Katunayake' }
      ],
      price_rounding: 100,
      default_making_percent: 12,
      low_stock_default: 1,
      featured_limit: 8,
      market_premium_percent: 5.12,
      k22_percent_of_24k: 92,
      k18_percent_of_24k: 75
    };

    /* No gold rate is seeded. A made-up rate that looks real is worse than
       none: the panel asks for today's rate and every price follows what
       the person types. This reference only sizes the sample orders' prices. */
    const rates = [];
    const rate = { date: PJ.isoDay(now), per_gram: PJ.pricing.deriveFrom22(366000 / 8) };

    const products = PRODUCTS.map((p, i) => {
      const created = at(12 + i * 6, 11, 0); /* the carousel pieces are the newest */
      return {
        id: 'p_' + String(101 + i),
        sku: p.sku,
        name: p.name,
        category: p.category,
        badge: p.badge,
        description: '',
        metal: p.metal,
        karat: p.karat,
        weight_g: p.weight_g,
        stones: p.stones,
        pricing_mode: p.pricing_mode,
        making_type: p.making_type || 'percent',
        making_value: p.making_value == null ? 0 : p.making_value,
        stone_value: p.stone_value || 0,
        fixed_price: p.fixed_price || 0,
        show_price: p.show_price,
        images: p.img ? [{ url: IMG + p.img, alt: '' }] : [],
        stock: { negombo: p.stock[0], katunayake: p.stock[1] },
        low_stock_at: p.low == null ? 1 : p.low,
        status: p.status || 'published',
        featured_rank: p.featured || null,
        created_at: iso(created),
        updated_at: iso(created)
      };
    });

    const priceNow = (p) => PJ.pricing.priceOf(p, rate, 100).total || 0;

    /* Orders across the last seven weeks */
    const orders = [];
    const movements = [];
    let number = 1001;
    const plan = [];
    for (let i = 0; i < 34; i++) plan.push(Math.floor(Math.pow(r(), 1.35) * 48));
    plan.push(0, 0, 1, 1, 2); /* a few in the last days, so today is never blank */
    plan.sort((a, b) => b - a);

    plan.forEach((daysAgo) => {
      const [name, phone, address] = pick(r, CUSTOMERS);
      const showroom = r() < 0.68 ? 'negombo' : 'katunayake';
      const channel = pickWeighted(r, ['walk_in', 'whatsapp', 'phone', 'instagram', 'facebook'], [5, 4, 2, 2, 1]);
      const delivery = channel !== 'walk_in' && r() < 0.35;
      const lines = [];
      const n = r() < 0.22 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const p = pickWeighted(r, products, WEIGHTS);
        if (lines.some((l) => l.product_id === p.id)) continue;
        lines.push({ product_id: p.id, sku: p.sku, name: p.name, image: p.images[0] ? p.images[0].url : '', qty: 1, unit_price: Math.round(priceNow(p) * (0.97 + r() * 0.05) / 100) * 100, note: '', from_stock: true });
      }
      const created = at(daysAgo, 9 + Math.floor(r() * 9), Math.floor(r() * 60));
      if (created > now) created.setTime(now.getTime() - (20 + r() * 150) * 60000);

      const subtotal = lines.reduce((a, l) => a + l.qty * l.unit_price, 0);
      const discount = r() < 0.2 ? Math.round(subtotal * 0.02 / 500) * 500 : 0;
      const total = subtotal - discount;

      /* Older orders are done; recent ones are somewhere along the way */
      let status;
      if (daysAgo > 12) status = r() < 0.1 ? 'cancelled' : 'completed';
      else if (daysAgo > 5) status = pick(r, ['completed', 'completed', 'ready', 'in_making', delivery ? 'dispatched' : 'ready']);
      else status = pick(r, ['new', 'new', 'confirmed', 'in_making', 'ready', 'completed']);
      if (channel === 'walk_in' && status !== 'cancelled' && daysAgo > 0) status = r() < 0.7 ? 'completed' : status;

      const flow = PJ.orderFlow({ fulfilment: delivery ? 'delivery' : 'pickup' });
      const history = [{ type: 'status', status: 'new', at: iso(created), text: 'Order created', by: 'Staff' }];
      if (status === 'cancelled') {
        history.push({ type: 'status', status: 'cancelled', at: iso(new Date(created.getTime() + 864e5)), text: 'Customer changed their mind', by: 'Staff' });
      } else {
        const stop = flow.indexOf(status);
        const skipWorkshop = r() < 0.5;
        for (let s = 1; s <= stop; s++) {
          if (flow[s] === 'in_making' && skipWorkshop && status !== 'in_making') continue;
          const t = new Date(created.getTime() + s * (daysAgo > 3 ? 864e5 * 0.9 : 3600e3 * 3));
          if (t > now) break;
          history.push({ type: 'status', status: flow[s], at: iso(t), text: '', by: 'Staff' });
        }
      }

      let paid = 0;
      const payments = [];
      if (status === 'completed') paid = total;
      else if (status !== 'cancelled' && status !== 'new') paid = r() < 0.6 ? Math.round(total * 0.3 / 1000) * 1000 : 0;
      if (paid) {
        const method = pickWeighted(r, ['cash', 'card', 'bank', 'old_gold'], [5, 3, 2, 1]);
        payments.push({ amount: paid, method, at: iso(created), note: paid < total ? 'Advance' : '', by: 'Staff' });
        history.push({ type: 'payment', at: iso(created), text: `${PJ.fmt.money(paid)} received · ${PJ.label.method(method)}`, by: 'Staff' });
      }
      history.sort((a, b) => a.at.localeCompare(b.at));

      const last = history.filter((h) => h.type === 'status').pop();
      const id = 'o_' + number;
      const order = {
        id,
        number: 'PJ-' + number,
        created_at: iso(created),
        updated_at: last ? last.at : iso(created),
        channel,
        showroom,
        customer: { name, phone, email: '', address: delivery ? address : '' },
        items: lines,
        subtotal,
        discount,
        total,
        paid,
        payment_status: paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'advance',
        payments,
        fulfilment: delivery ? 'delivery' : 'pickup',
        due_date: status === 'completed' || status === 'cancelled' ? '' : PJ.isoDay(new Date(created.getTime() + 864e5 * (3 + Math.floor(r() * 10)))),
        status: last ? last.status : 'new',
        tracking: status === 'dispatched' ? { courier: 'Pronto Lanka', number: 'PL' + Math.floor(1e7 + r() * 9e7) } : { courier: '', number: '' },
        notes: lines.length && r() < 0.25 ? 'Resize to size 14 before collection.' : '',
        history
      };
      orders.push(order);
      number++;

      lines.forEach((l) => {
        movements.push({ id: 'm_' + movements.length, product_id: l.product_id, showroom, delta: -l.qty, reason: 'sale', note: '', order_number: order.number, at: iso(created), by: 'Staff' });
        if (status === 'cancelled') movements.push({ id: 'm_' + movements.length, product_id: l.product_id, showroom, delta: l.qty, reason: 'order_cancelled', note: '', order_number: order.number, at: history[history.length - 1].at, by: 'Staff' });
      });
    });

    /* A few deliveries from the workshop */
    [[2, 'p_109', 'negombo', 4], [9, 'p_103', 'katunayake', 3], [16, 'p_108', 'negombo', 4], [23, 'p_105', 'negombo', 2]].forEach(([d, pid, s, q]) => {
      movements.push({ id: 'm_' + movements.length, product_id: pid, showroom: s, delta: q, reason: 'received', note: 'From the workshop', order_number: '', at: iso(at(d, 10, 15)), by: 'Owner' });
    });
    movements.push({ id: 'm_' + movements.length, product_id: 'p_113', showroom: 'katunayake', delta: 1, reason: 'transfer_in', note: 'Moved from Negombo', order_number: '', at: iso(at(4, 15, 40)), by: 'Owner' });
    movements.push({ id: 'm_' + movements.length, product_id: 'p_113', showroom: 'negombo', delta: -1, reason: 'transfer_out', note: 'Moved to Katunayake', order_number: '', at: iso(at(4, 15, 40)), by: 'Owner' });
    movements.sort((a, b) => b.at.localeCompare(a.at));

    orders.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return { version: 2, settings, products, orders, movements, rates, next_order: number };
  };
})();
