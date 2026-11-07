/* Orders — list, tracking page, and the new/edit form */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, fmt, $, $$, on } = PJ;

  const TABS = [
    ['open', 'Open'],
    ['new', 'New'],
    ['confirmed', 'Confirmed'],
    ['in_making', 'Workshop'],
    ['ready', 'Ready'],
    ['dispatched', 'Out for delivery'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
    ['all', 'All']
  ];

  const isOpen = (o) => o.status !== 'completed' && o.status !== 'cancelled';
  const itemsSummary = (o) => (o.items.length ? o.items[0].name + (o.items.length > 1 ? ` + ${o.items.length - 1} more` : '') : '—');

  /* ==================================================================
     LIST
     ================================================================== */
  PJ.views.orders = {
    nav: 'orders',
    title: 'Orders',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Loading orders'));
      const all = await PJ.api.orders.list({});
      if (!ctx.alive()) return;

      let tab = TABS.some((t) => t[0] === ctx.query.tab) ? ctx.query.tab : 'open';
      let search = ctx.query.q || '';

      const count = (key) => all.filter((o) => (key === 'all' ? true : key === 'open' ? isOpen(o) : o.status === key)).length;

      el.innerHTML = String(html`
        ${ui.pageHead({
          title: 'Orders',
          meta: 'Every order from the counter, WhatsApp, phone and social — and where each one is.',
          actions: html`<a class="btn btn--primary" href="#/orders/new">${ui.icon('plus')}<span>New order</span></a>`
        })}
        <div class="toolbar">
          <label class="search">
            ${ui.icon('search')}
            <span class="sr-only">Search orders</span>
            <input class="input" type="search" name="q" placeholder="Order number, name or phone" value="${search}" autocomplete="off">
          </label>
        </div>
        <div class="tabs" role="tablist" aria-label="Filter by status">
          ${TABS.map(([k, l]) => html`<button class="tab" type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${l} <span class="tab__count">${count(k)}</span></button>`)}
        </div>
        <div class="card card--flush" data-list></div>`);

      const listEl = $('[data-list]', el);

      function draw() {
        const q = search.toLowerCase().replace(/\s+/g, '');
        const rows = all.filter((o) => {
          if (tab === 'open' && !isOpen(o)) return false;
          if (tab !== 'open' && tab !== 'all' && o.status !== tab) return false;
          if (q && !(o.number + o.customer.name + o.customer.phone).toLowerCase().replace(/\s+/g, '').includes(q)) return false;
          return true;
        });
        listEl.innerHTML = String(rows.length
          ? html`<div class="table-wrap"><table class="table table--rows">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>${rows.map((o) => html`
                <tr class="is-link" data-href="#/orders/${o.id}">
                  <td data-label="Order"><span class="cell-head"><a class="strong" href="#/orders/${o.id}">${o.number}</a><span class="only-mobile">${ui.statusPill(o.status, o)}</span></span><span class="cell-sub">${fmt.when(o.created_at)} · ${PJ.label.channel(o.channel)}</span></td>
                  <td data-label="Customer"><span class="cell">${o.customer.name}<span class="cell-sub">${o.customer.phone}</span></span></td>
                  <td data-label="Items"><span class="cell">${itemsSummary(o)}<span class="cell-sub">${PJ.ctx.showroomName(o.showroom)} · ${o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</span></span></td>
                  <td data-label="Total" class="num">${fmt.money(o.total)}</td>
                  <td data-label="Payment">${ui.paymentPill(o)}</td>
                  <td data-label="Status" class="hide-mobile">${ui.statusPill(o.status, o)}</td>
                  <td data-label="Due" class="${o.due_date && isOpen(o) ? '' : 'is-empty'}">${o.due_date && isOpen(o) ? html`<span class="nowrap ${o.due_date < PJ.isoDay() ? 'overdue' : ''}">${fmt.dueDay(o.due_date)}</span>` : html`<span class="muted">—</span>`}</td>
                </tr>`)}</tbody></table></div>`
          : ui.empty(search ? 'No orders match that search' : 'No orders here', search ? 'Try a phone number without spaces, or the order number like PJ-1042.' : 'Orders with this status will appear here.'));
      }

      function syncUrl() {
        const params = new URLSearchParams();
        if (tab !== 'open') params.set('tab', tab);
        if (search) params.set('q', search);
        const str = params.toString();
        history.replaceState(null, '', '#/orders' + (str ? '?' + str : ''));
      }

      on(el, 'click', '[data-tab]', (e, btn) => {
        tab = btn.dataset.tab;
        $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        syncUrl();
        draw();
      });
      on(el, 'input', 'input[name="q"]', (e, input) => { search = input.value.trim(); syncUrl(); draw(); });
      on(el, 'click', 'tr[data-href]', (e, tr) => { if (!e.target.closest('a')) location.hash = tr.dataset.href; });

      draw();
    }
  };

  /* ==================================================================
     ORDER PAGE — tracking, payments, customer updates
     ================================================================== */
  function statusModal(o, target) {
    const delivery = o.fulfilment === 'delivery';
    const needsTracking = target === 'dispatched';
    return ui.modal({
      title: target === 'cancelled' ? `Cancel ${o.number}?` : `Mark ${o.number} as ${PJ.label.status(target, o).toLowerCase()}`,
      submitLabel: target === 'cancelled' ? 'Cancel order' : 'Update status',
      cancelLabel: target === 'cancelled' ? 'Keep order' : 'Back',
      danger: target === 'cancelled',
      body: html`
        ${target === 'cancelled' ? html`<p>Pieces taken from stock for this order go back on the shelf.</p>` : ''}
        ${needsTracking ? html`
          <div class="row row--2">
            <label class="field"><span class="field__label">Courier</span><input class="input" name="courier" value="${o.tracking.courier || ''}" placeholder="e.g. Pronto, Domex, own driver"></label>
            <label class="field"><span class="field__label">Tracking number</span><input class="input" name="number" value="${o.tracking.number || ''}"></label>
          </div>` : ''}
        <label class="field"><span class="field__label">Note for the history <span class="muted">(optional)</span></span>
          <textarea class="textarea" name="note" rows="2" placeholder="${target === 'cancelled' ? 'Why it was cancelled' : delivery ? 'e.g. Handed to rider at 3 pm' : 'e.g. Resized to 14'}"></textarea></label>`,
      async onSubmit(form) {
        const d = PJ.formData(form);
        const body = { status: target, note: d.note };
        if (needsTracking) body.tracking = { courier: d.courier, number: d.number };
        return PJ.api.orders.setStatus(o.id, body);
      }
    });
  }

  function paymentModal(o) {
    const balance = Math.max(0, o.total - o.paid);
    return ui.modal({
      title: 'Record a payment',
      submitLabel: 'Record payment',
      body: html`
        <p class="modal__lead">${o.number} · balance ${fmt.money(balance)}</p>
        <div class="row row--2">
          <label class="field"><span class="field__label">Amount received</span>
            <span class="input-group"><span class="input-group__addon">Rs</span><input class="input" name="amount" type="number" min="1" step="1" inputmode="numeric" value="${balance || ''}" required></span></label>
          <label class="field"><span class="field__label">How they paid</span><select class="select" name="method">${ui.options(PJ.PAYMENT_METHODS, 'cash')}</select></label>
        </div>
        <label class="field"><span class="field__label">Note <span class="muted">(optional)</span></span><input class="input" name="note" placeholder="e.g. Receipt 4471, or old gold 6.2 g"></label>`,
      async onSubmit(form) {
        const d = PJ.formData(form);
        return PJ.api.orders.addPayment(o.id, d);
      }
    });
  }

  function stepper(o) {
    const flow = PJ.orderFlow(o);
    const current = flow.indexOf(o.status);
    if (o.status === 'cancelled') {
      return html`<div class="stepper stepper--cancelled"><p>${ui.icon('x')} This order was cancelled.</p></div>`;
    }
    return html`<ol class="stepper" aria-label="Order progress">
      ${flow.map((s, i) => {
        const state = i < current ? 'is-done' : i === current ? 'is-current' : '';
        return html`<li class="step ${state}">
          <button class="step__btn" type="button" data-status="${s}" ${i === current ? html`aria-current="step" disabled` : ''}>
            <span class="step__dot" aria-hidden="true">${i < current ? ui.icon('check') : i + 1}</span>
            <span class="step__label">${PJ.label.status(s, o)}</span>
          </button>
        </li>`;
      })}
    </ol>`;
  }

  function timeline(o) {
    const items = o.history.slice().reverse();
    return html`<ol class="timeline">
      ${items.map((h) => html`<li class="timeline__item timeline__item--${h.type}">
        <span class="timeline__dot" aria-hidden="true"></span>
        <div>
          <p class="timeline__title">${h.type === 'status' ? PJ.label.status(h.status, o) : h.type === 'payment' ? 'Payment' : 'Edited'}</p>
          ${h.text ? html`<p class="timeline__text">${h.text}</p>` : ''}
          <p class="timeline__meta">${fmt.when(h.at)}${h.by ? ' · ' + h.by : ''}</p>
        </div>
      </li>`)}
    </ol>`;
  }

  PJ.views.order = {
    nav: 'orders',
    title: 'Order',
    async render(el, ctx, justChanged) {
      el.innerHTML = String(ui.loading('Loading the order'));
      const o = await PJ.api.orders.get(ctx.params.id);
      if (!ctx.alive()) return;

      const flow = PJ.orderFlow(o);
      const i = flow.indexOf(o.status);
      const next = o.status !== 'cancelled' && i > -1 && i < flow.length - 1 ? flow[i + 1] : null;
      const balance = o.total - o.paid;
      const wa = PJ.waLink(o.customer.phone, PJ.customerMessage(o));
      const room = PJ.ctx.showrooms().find((s) => s.id === o.showroom) || {};

      el.innerHTML = String(html`
        ${ui.pageHead({
          back: '#/orders',
          backLabel: 'Orders',
          title: html`${o.number} ${ui.statusPill(o.status, o)}`,
          meta: `${fmt.when(o.created_at)} · ${PJ.label.channel(o.channel)} · ${room.name || o.showroom} showroom · ${o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}`,
          actions: html`
            <a class="btn" href="#/orders/${o.id}/edit">${ui.icon('edit')}<span>Edit</span></a>
            ${wa ? html`<a class="btn" href="${wa}" target="_blank" rel="noopener">${ui.icon('chat')}<span>WhatsApp update</span></a>` : ''}`
        })}

        ${justChanged && wa ? html`
          <div class="notice notice--ok notice--action">
            ${ui.icon('check')}
            <p><strong>Status saved.</strong> Let ${fmt.firstName(o.customer.name)} know — the message is written for you.</p>
            <a class="btn btn--sm btn--primary" href="${wa}" target="_blank" rel="noopener">${ui.icon('chat')}<span>Send on WhatsApp</span></a>
          </div>` : ''}

        <section class="card card--progress" aria-label="Progress">
          ${stepper(o)}
          <div class="progress-actions">
            ${next ? html`<button class="btn btn--primary" type="button" data-status="${next}">Mark as ${PJ.label.status(next, o).toLowerCase()} ${ui.icon('chevron-right')}</button>` : ''}
            ${o.status === 'cancelled' ? html`<button class="btn" type="button" data-status="new">Reopen order</button>` : ''}
            ${o.status !== 'cancelled' && o.status !== 'completed' ? html`<button class="btn btn--ghost btn--danger-text" type="button" data-status="cancelled">Cancel order</button>` : ''}
          </div>
        </section>

        <div class="grid-2">
          <div class="stack">
            <section class="card card--flush" aria-labelledby="itemsTitle">
              <header class="card__head"><h2 class="card__title" id="itemsTitle">Items</h2></header>
              <ul class="lines">
                ${o.items.map((it) => html`<li class="line">
                  ${ui.thumb(it.image ? [{ url: it.image }] : [], 'md')}
                  <div class="line__main">
                    ${it.product_id ? html`<a class="strong" href="#/products/${it.product_id}">${it.name}</a>` : html`<span class="strong">${it.name}</span>`}
                    <span class="cell-sub">${[it.sku, it.product_id ? (it.from_stock ? 'from stock' : 'made to order') : 'custom item'].filter(Boolean).join(' · ')}</span>
                    ${it.note ? html`<span class="cell-sub">${it.note}</span>` : ''}
                  </div>
                  <span class="line__qty">× ${it.qty}</span>
                  <span class="line__price num">${fmt.money(it.qty * it.unit_price)}</span>
                </li>`)}
              </ul>
              <dl class="totals">
                <div><dt>Subtotal</dt><dd>${fmt.money(o.subtotal)}</dd></div>
                ${o.discount ? html`<div><dt>Discount</dt><dd>−${fmt.money(o.discount)}</dd></div>` : ''}
                <div class="totals__grand"><dt>Total</dt><dd>${fmt.money(o.total)}</dd></div>
              </dl>
            </section>

            <section class="card" aria-labelledby="histTitle">
              <header class="card__head"><h2 class="card__title" id="histTitle">History</h2></header>
              <div class="card__body">${timeline(o)}</div>
            </section>
          </div>

          <div class="stack">
            <section class="card" aria-labelledby="custTitle">
              <header class="card__head"><h2 class="card__title" id="custTitle">Customer</h2></header>
              <div class="card__body">
                <p class="strong">${o.customer.name}</p>
                <p><a class="link" href="${PJ.telLink(o.customer.phone)}">${o.customer.phone}</a></p>
                ${o.customer.email ? html`<p><a class="link" href="mailto:${o.customer.email}">${o.customer.email}</a></p>` : ''}
                ${o.customer.address ? html`<p class="muted pre">${o.customer.address}</p>` : ''}
                <div class="btn-row">
                  <a class="btn btn--sm" href="${PJ.telLink(o.customer.phone)}">${ui.icon('phone')}<span>Call</span></a>
                  ${wa ? html`<a class="btn btn--sm" href="${wa}" target="_blank" rel="noopener">${ui.icon('chat')}<span>WhatsApp</span></a>` : ''}
                </div>
              </div>
            </section>

            <section class="card" aria-labelledby="payTitle">
              <header class="card__head"><h2 class="card__title" id="payTitle">Payment</h2>${ui.paymentPill(o)}</header>
              <div class="card__body">
                <dl class="totals totals--plain">
                  <div><dt>Total</dt><dd>${fmt.money(o.total)}</dd></div>
                  <div><dt>Paid</dt><dd>${fmt.money(o.paid)}</dd></div>
                  <div class="totals__grand"><dt>${balance < 0 ? 'Overpaid' : 'Balance due'}</dt><dd>${fmt.money(Math.abs(balance))}</dd></div>
                </dl>
                ${o.payments.length ? html`<ul class="mini-list">${o.payments.map((p) => html`<li><span>${fmt.when(p.at)} · ${PJ.label.method(p.method)}${p.note ? ' · ' + p.note : ''}</span><span class="num">${fmt.money(p.amount)}</span></li>`)}</ul>` : ''}
                ${balance > 0 && o.status !== 'cancelled' ? html`<button class="btn btn--sm" type="button" data-act="pay">${ui.icon('wallet')}<span>Record payment</span></button>` : ''}
              </div>
            </section>

            <section class="card" aria-labelledby="fulTitle">
              <header class="card__head"><h2 class="card__title" id="fulTitle">${o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</h2></header>
              <div class="card__body">
                <dl class="facts">
                  <div><dt>Showroom</dt><dd>${room.name || o.showroom}</dd></div>
                  <div><dt>Due</dt><dd>${o.due_date ? fmt.day(o.due_date) : '—'}</dd></div>
                  ${o.fulfilment === 'delivery' ? html`
                    <div><dt>Courier</dt><dd>${o.tracking.courier || '—'}</dd></div>
                    <div><dt>Tracking</dt><dd class="mono">${o.tracking.number || '—'}</dd></div>` : ''}
                </dl>
              </div>
            </section>

            ${o.notes ? html`
              <section class="card" aria-labelledby="noteTitle">
                <header class="card__head"><h2 class="card__title" id="noteTitle">Notes</h2></header>
                <div class="card__body"><p class="pre">${o.notes}</p></div>
              </section>` : ''}
          </div>
        </div>`);

      on(el, 'click', '[data-status]', async (e, btn) => {
        const res = await statusModal(o, btn.dataset.status);
        if (!res) return;
        ui.toast(`${o.number} is now ${PJ.label.status(res.status, res).toLowerCase()}`);
        PJ.bus.emit('orders:changed');
        ctx.refresh(true);
      });

      on(el, 'click', '[data-act="pay"]', async () => {
        const res = await paymentModal(o);
        if (!res) return;
        ui.toast('Payment recorded');
        ctx.refresh(false);
      });
    }
  };

  /* ==================================================================
     NEW / EDIT ORDER
     ================================================================== */
  PJ.views.orderForm = {
    nav: 'orders',
    title: 'Order',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Loading'));
      const editing = Boolean(ctx.params.id);
      const [products, existing] = await Promise.all([
        PJ.api.products.list({}),
        editing ? PJ.api.orders.get(ctx.params.id) : null
      ]);
      if (!ctx.alive()) return;

      const rooms = PJ.ctx.showrooms();
      const o = existing || {
        customer: { name: '', phone: '', email: '', address: '' },
        channel: 'walk_in',
        showroom: rooms[0] && rooms[0].id,
        fulfilment: 'pickup',
        due_date: '',
        items: [],
        discount: 0,
        notes: ''
      };
      let items = o.items.map((it) => Object.assign({}, it));
      const byId = Object.fromEntries(products.map((p) => [p.id, p]));

      el.innerHTML = String(html`
        ${ui.pageHead({
          back: editing ? `#/orders/${o.id}` : '#/orders',
          backLabel: editing ? o.number : 'Orders',
          title: editing ? `Edit ${o.number}` : 'New order'
        })}
        <form class="form" novalidate>
          <div class="grid-2">
            <div class="stack">
              <section class="card" aria-labelledby="fItems">
                <header class="card__head"><h2 class="card__title" id="fItems">Items</h2></header>
                <div class="card__body">
                  <div class="picker">
                    <label class="search">
                      ${ui.icon('search')}
                      <span class="sr-only">Find a piece to add</span>
                      <input class="input" type="search" data-picker placeholder="Add a piece — type a name or SKU" autocomplete="off" aria-controls="pickerResults">
                    </label>
                    <ul class="picker__results" id="pickerResults" hidden></ul>
                  </div>
                  <div data-items></div>
                  <button class="btn btn--sm btn--ghost" type="button" data-act="custom">${ui.icon('plus')}<span>Add a custom item (bespoke, repair, alteration)</span></button>
                </div>
                <dl class="totals">
                  <div><dt>Subtotal</dt><dd data-subtotal></dd></div>
                  <div><dt><label for="discount">Discount</label></dt><dd><span class="input-group input-group--sm"><span class="input-group__addon">Rs</span><input class="input" id="discount" name="discount" type="number" min="0" step="100" inputmode="numeric" value="${o.discount || ''}"></span></dd></div>
                  <div class="totals__grand"><dt>Total</dt><dd data-total></dd></div>
                </dl>
              </section>

              <section class="card" aria-labelledby="fNotes">
                <header class="card__head"><h2 class="card__title" id="fNotes">Notes</h2></header>
                <div class="card__body">
                  <label class="field"><span class="sr-only">Notes</span>
                    <textarea class="textarea" name="notes" rows="3" placeholder="Ring size, engraving, anything the workshop needs to know">${o.notes}</textarea></label>
                </div>
              </section>
            </div>

            <div class="stack">
              <section class="card" aria-labelledby="fCust">
                <header class="card__head"><h2 class="card__title" id="fCust">Customer</h2></header>
                <div class="card__body">
                  <label class="field"><span class="field__label">Name</span><input class="input" name="c_name" value="${o.customer.name}" autocomplete="off" required></label>
                  <label class="field"><span class="field__label">Phone</span><input class="input" name="c_phone" type="tel" inputmode="tel" value="${o.customer.phone}" placeholder="077 123 4567" required></label>
                  <label class="field"><span class="field__label">Email <span class="muted">(optional)</span></span><input class="input" name="c_email" type="email" value="${o.customer.email}"></label>
                </div>
              </section>

              <section class="card" aria-labelledby="fOrder">
                <header class="card__head"><h2 class="card__title" id="fOrder">Order</h2></header>
                <div class="card__body">
                  <div class="row row--2">
                    <label class="field"><span class="field__label">Came in by</span><select class="select" name="channel">${ui.options(PJ.CHANNELS, o.channel)}</select></label>
                    <label class="field"><span class="field__label">Showroom</span><select class="select" name="showroom">${ui.showroomOptions(o.showroom)}</select></label>
                  </div>
                  <div class="field">
                    <span class="field__label" id="fFul">Fulfilment</span>
                    <div class="seg" role="radiogroup" aria-labelledby="fFul">
                      <label class="seg__opt"><input type="radio" name="fulfilment" value="pickup" ${o.fulfilment !== 'delivery' ? 'checked' : ''}><span>Pickup</span></label>
                      <label class="seg__opt"><input type="radio" name="fulfilment" value="delivery" ${o.fulfilment === 'delivery' ? 'checked' : ''}><span>Delivery</span></label>
                    </div>
                  </div>
                  <label class="field" data-address ${o.fulfilment === 'delivery' ? '' : 'hidden'}><span class="field__label">Delivery address</span>
                    <textarea class="textarea" name="c_address" rows="2">${o.customer.address}</textarea></label>
                  <label class="field"><span class="field__label">Due date <span class="muted">(optional)</span></span><input class="input" name="due_date" type="date" value="${o.due_date}"></label>
                </div>
              </section>

              ${!editing ? html`
                <section class="card" aria-labelledby="fPay">
                  <header class="card__head"><h2 class="card__title" id="fPay">Payment now</h2></header>
                  <div class="card__body">
                    <div class="row row--2">
                      <label class="field"><span class="field__label">Amount received</span>
                        <span class="input-group"><span class="input-group__addon">Rs</span><input class="input" name="pay_amount" type="number" min="0" step="100" inputmode="numeric" placeholder="0"></span></label>
                      <label class="field"><span class="field__label">Method</span><select class="select" name="pay_method">${ui.options(PJ.PAYMENT_METHODS, 'cash')}</select></label>
                    </div>
                    <p class="field__hint">Leave at 0 if nothing is paid yet. You can record payments later on the order.</p>
                    <label class="check"><input type="checkbox" name="counter_sale"><span>Sold at the counter — mark the order completed straight away</span></label>
                  </div>
                </section>` : ''}
            </div>
          </div>

          <p class="form-error" role="alert" hidden></p>
          <div class="savebar">
            <a class="btn btn--ghost" href="${editing ? `#/orders/${o.id}` : '#/orders'}">Cancel</a>
            <button class="btn btn--primary" type="submit">${editing ? 'Save changes' : 'Create order'}</button>
          </div>
        </form>`);

      const form = $('form', el);
      const itemsEl = $('[data-items]', el);
      const pickerInput = $('[data-picker]', el);
      const results = $('#pickerResults', el);
      const errEl = $('.form-error', el);

      const showroom = () => form.elements.showroom.value;
      const available = (p) => Number(p.stock[showroom()]) || 0;

      function drawItems() {
        itemsEl.innerHTML = String(items.length
          ? html`<ul class="lines lines--edit">${items.map((it, i) => {
              const p = it.product_id ? byId[it.product_id] : null;
              return html`<li class="line line--edit" data-i="${i}">
                ${ui.thumb(p ? p.images : it.image ? [{ url: it.image }] : [], 'md')}
                <div class="line__main">
                  ${p ? html`<span class="strong">${it.name}</span><span class="cell-sub">${p.sku} · ${available(p)} in ${PJ.ctx.showroomName(showroom())}</span>`
                    : html`<label class="field field--tight"><span class="sr-only">Description</span><input class="input input--sm" data-f="name" value="${it.name}" placeholder="What is being made or repaired"></label>`}
                  <label class="field field--tight"><span class="sr-only">Note</span><input class="input input--sm" data-f="note" value="${it.note || ''}" placeholder="Size, engraving, stone… (optional)"></label>
                  ${p ? html`<label class="check check--sm"><input type="checkbox" data-f="from_stock" ${it.from_stock ? 'checked' : ''}><span>Take from stock</span></label>` : ''}
                </div>
                <label class="field field--tight line__qty"><span class="field__label">Qty</span><input class="input input--sm" data-f="qty" type="number" min="1" step="1" inputmode="numeric" value="${it.qty}"></label>
                <label class="field field--tight line__price"><span class="field__label">Unit price</span>
                  <span class="input-group input-group--sm"><span class="input-group__addon">Rs</span><input class="input input--sm" data-f="unit_price" type="number" min="0" step="100" inputmode="numeric" value="${it.unit_price || ''}"></span></label>
                <button class="btn btn--icon btn--ghost" type="button" data-remove="${i}" aria-label="Remove ${it.name || 'item'}">${ui.icon('trash')}</button>
              </li>`;
            })}</ul>`
          : html`<p class="lines__empty">No items yet. Search above to add a piece from the catalogue.</p>`);
        drawTotals();
      }

      function drawTotals() {
        const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
        const discount = Number(form.elements.discount.value) || 0;
        $('[data-subtotal]', el).textContent = fmt.money(subtotal);
        $('[data-total]', el).textContent = fmt.money(Math.max(0, subtotal - discount));
      }

      function addProduct(p) {
        const existingLine = items.find((it) => it.product_id === p.id);
        if (existingLine) existingLine.qty += 1;
        else {
          const pr = PJ.ctx.price(p);
          items.push({ product_id: p.id, sku: p.sku, name: p.name, qty: 1, unit_price: pr.total || 0, note: '', from_stock: available(p) > 0 });
        }
        pickerInput.value = '';
        results.hidden = true;
        drawItems();
        if (!PJ.ctx.price(p).total) ui.toast(`Enter the price for ${p.name} — it has no automatic price.`, 'warn');
      }

      function drawResults() {
        const q = pickerInput.value.trim().toLowerCase();
        if (!q) { results.hidden = true; return; }
        const hits = products.filter((p) => p.status !== 'archived' && (p.name + ' ' + p.sku).toLowerCase().includes(q)).slice(0, 8);
        results.innerHTML = String(hits.length
          ? hits.map((p) => html`<li><button class="picker__opt" type="button" data-add="${p.id}">
              ${ui.thumb(p.images, 'sm')}
              <span class="list__main">${p.name}<span class="list__sub">${p.sku} · ${available(p)} in ${PJ.ctx.showroomName(showroom())}</span></span>
              ${ui.price(p)}
            </button></li>`)
          : html`<li class="picker__none">No piece matches “${pickerInput.value}”. Add it as a custom item below.</li>`);
        results.hidden = false;
      }

      pickerInput.addEventListener('input', drawResults);
      pickerInput.addEventListener('focus', drawResults);
      pickerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const first = $('[data-add]', results);
          if (first) first.click();
        }
        if (e.key === 'Escape') results.hidden = true;
        if (e.key === 'ArrowDown') { const first = $('[data-add]', results); if (first) { e.preventDefault(); first.focus(); } }
      });
      results.addEventListener('keydown', (e) => {
        const opts = $$('[data-add]', results);
        const i = opts.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' && i < opts.length - 1) { e.preventDefault(); opts[i + 1].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? opts[i - 1] : pickerInput).focus(); }
        if (e.key === 'Escape') { results.hidden = true; pickerInput.focus(); }
      });
      document.addEventListener('click', function close(e) {
        if (!el.isConnected) { document.removeEventListener('click', close); return; }
        if (!e.target.closest('.picker')) results.hidden = true;
      });

      on(el, 'click', '[data-add]', (e, btn) => addProduct(byId[btn.dataset.add]));
      on(el, 'click', '[data-act="custom"]', () => {
        items.push({ product_id: null, sku: '', name: '', qty: 1, unit_price: 0, note: '', from_stock: false });
        drawItems();
        const inputs = $$('[data-f="name"]', itemsEl);
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
      on(el, 'click', '[data-remove]', (e, btn) => { items.splice(Number(btn.dataset.remove), 1); drawItems(); });
      on(el, 'input', '[data-f]', (e, input) => {
        const i = Number(input.closest('[data-i]').dataset.i);
        const f = input.dataset.f;
        items[i][f] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
        if (f === 'qty' || f === 'unit_price') drawTotals();
      });
      on(el, 'change', '[data-f="from_stock"]', (e, input) => {
        const i = Number(input.closest('[data-i]').dataset.i);
        items[i].from_stock = input.checked;
      });
      form.elements.discount.addEventListener('input', drawTotals);
      form.elements.showroom.addEventListener('change', drawItems);
      on(el, 'change', 'input[name="fulfilment"]', () => {
        $('[data-address]', el).hidden = form.elements.fulfilment.value !== 'delivery';
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.hidden = true;
        const d = PJ.formData(form);
        const body = {
          customer: { name: d.c_name, phone: d.c_phone, email: d.c_email, address: d.fulfilment === 'delivery' ? d.c_address : '' },
          channel: d.channel,
          showroom: d.showroom,
          fulfilment: d.fulfilment,
          due_date: d.due_date,
          discount: d.discount || 0,
          notes: d.notes,
          items: items.map((it) => ({ product_id: it.product_id, name: it.name, qty: it.qty, unit_price: it.unit_price, note: it.note, from_stock: it.from_stock }))
        };
        if (!editing) {
          body.payment = { amount: d.pay_amount || 0, method: d.pay_method };
          if (d.counter_sale) body.status = 'completed';
        }
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
          const saved = editing ? await PJ.api.orders.update(o.id, body) : await PJ.api.orders.create(body);
          ui.toast(editing ? `${saved.number} saved` : `${saved.number} created`);
          PJ.bus.emit('orders:changed');
          location.hash = '#/orders/' + saved.id;
        } catch (ex) {
          errEl.textContent = ex.message;
          errEl.hidden = false;
          errEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } finally {
          btn.disabled = false;
        }
      });

      drawItems();
    }
  };
})();
