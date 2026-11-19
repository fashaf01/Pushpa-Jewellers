/* Pushpa Jewellers admin — pieces several screens share */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, fmt } = PJ;

  ui.statusPill = (status, order) => html`<span class="pill pill--${status}">${PJ.label.status(status, order)}</span>`;

  ui.paymentPill = (o) => {
    const s = o.payment_status;
    const text = s === 'advance' ? `${fmt.money(o.paid)} paid` : PJ.label.payment(s);
    return html`<span class="pill pill--pay-${s}">${text}</span>`;
  };

  ui.stockPill = (p) => {
    const s = PJ.pricing.stockState(p);
    const text = { ok: 'In stock', low: 'Low', out: 'Out of stock' }[s];
    return html`<span class="pill pill--stock-${s}">${text}</span>`;
  };

  /* "Rs 245,600" or a quiet note explaining why there is no price */
  ui.price = (p) => {
    const pr = PJ.ctx.price(p);
    if (pr.total == null) return html`<span class="muted">${pr.missing}</span>`;
    return html`<span class="num">${fmt.money(pr.total)}</span>`;
  };

  /* Per-showroom stock, compact: "Negombo 2 · Katunayake 1" */
  ui.stockLine = (p) => html`<span class="stock-line">${PJ.ctx.showrooms().map((s) => {
    const n = Number(p.stock && p.stock[s.id]) || 0;
    return html`<span class="stock-line__item ${n === 0 ? 'is-zero' : ''}"><span class="stock-line__name">${s.name}</span> <strong>${n}</strong></span>`;
  })}</span>`;

  const showroomOptions = (selected) => PJ.ctx.showrooms().map((s) => html`<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${s.name}</option>`);
  ui.showroomOptions = showroomOptions;

  ui.options = (list, selected) => list.map(([v, l]) => html`<option value="${v}" ${String(v) === String(selected) ? 'selected' : ''}>${l}</option>`);

  /* ------------------------------------------------------------------
     Stock adjustment and transfer — used on Stock and on each product
     ------------------------------------------------------------------ */
  ui.adjustStock = (p, showroom) =>
    ui.modal({
      title: 'Adjust stock',
      submitLabel: 'Save change',
      body: html`
        <p class="modal__lead">${p.name} <span class="muted">· ${p.sku}</span></p>
        <div class="field">
          <span class="field__label" id="adjKind">What happened?</span>
          <div class="seg seg--stack" role="radiogroup" aria-labelledby="adjKind">
            <label class="seg__opt"><input type="radio" name="kind" value="received" checked><span>New pieces arrived<small>From the workshop or a supplier</small></span></label>
            <label class="seg__opt"><input type="radio" name="kind" value="removed"><span>Pieces taken out<small>Damaged, sent for repair, or a correction</small></span></label>
            <label class="seg__opt"><input type="radio" name="kind" value="count"><span>Stock count<small>Set the exact number on the shelf</small></span></label>
          </div>
        </div>
        <div class="row row--2">
          <label class="field"><span class="field__label">Showroom</span><select class="select" name="showroom">${showroomOptions(showroom)}</select></label>
          <label class="field"><span class="field__label" data-qty-label>How many</span><input class="input" name="qty" type="number" min="0" step="1" inputmode="numeric" required></label>
        </div>
        <p class="field__hint" data-have></p>
        <label class="field"><span class="field__label">Note <span class="muted">(optional)</span></span><input class="input" name="note" placeholder="e.g. Batch from the workshop"></label>`,
      onOpen(form) {
        const sync = () => {
          const kind = form.elements.kind.value;
          const room = form.elements.showroom.value;
          const have = Number(p.stock[room]) || 0;
          form.querySelector('[data-qty-label]').textContent = kind === 'count' ? 'Pieces on the shelf' : 'How many';
          form.querySelector('[data-have]').textContent = `The system has ${have} in ${PJ.ctx.showroomName(room)}.`;
        };
        form.addEventListener('change', sync);
        sync();
      },
      async onSubmit(form) {
        const d = PJ.formData(form);
        if (d.qty == null || d.qty < 0) throw new Error('Enter how many pieces.');
        const body = { product_id: p.id, showroom: d.showroom, note: d.note };
        if (d.kind === 'count') Object.assign(body, { reason: 'count', count: d.qty });
        else Object.assign(body, { reason: d.kind, delta: d.kind === 'removed' ? -d.qty : d.qty });
        const out = await PJ.api.stock.adjust(body);
        ui.toast('Stock updated for ' + p.name);
        PJ.bus.emit('stock:changed');
        return out;
      }
    });

  ui.transferStock = (p) => {
    const rooms = PJ.ctx.showrooms();
    const from = rooms.find((s) => (Number(p.stock[s.id]) || 0) > 0) || rooms[0];
    const to = rooms.find((s) => s.id !== from.id) || rooms[0];
    return ui.modal({
      title: 'Move between showrooms',
      submitLabel: 'Move pieces',
      body: html`
        <p class="modal__lead">${p.name} <span class="muted">· ${p.sku}</span></p>
        <div class="row row--2">
          <label class="field"><span class="field__label">From</span><select class="select" name="from">${showroomOptions(from.id)}</select></label>
          <label class="field"><span class="field__label">To</span><select class="select" name="to">${showroomOptions(to.id)}</select></label>
        </div>
        <label class="field"><span class="field__label">How many</span><input class="input" name="qty" type="number" min="1" step="1" value="1" inputmode="numeric" required></label>
        <label class="field"><span class="field__label">Note <span class="muted">(optional)</span></span><input class="input" name="note"></label>`,
      async onSubmit(form) {
        const d = PJ.formData(form);
        const out = await PJ.api.stock.transfer({ product_id: p.id, from: d.from, to: d.to, qty: d.qty, note: d.note });
        ui.toast(`Moved ${d.qty} to ${PJ.ctx.showroomName(d.to)}`);
        PJ.bus.emit('stock:changed');
        return out;
      }
    });
  };

  PJ.MOVEMENT_REASONS = {
    sale: 'Sold on an order',
    received: 'New pieces arrived',
    removed: 'Taken out',
    count: 'Stock count',
    transfer_in: 'Moved in',
    transfer_out: 'Moved out',
    order_cancelled: 'Order cancelled — back on the shelf',
    order_edited: 'Order changed',
    adjustment: 'Adjustment'
  };

  /* ------------------------------------------------------------------
     WhatsApp update for the customer, worded for the order's status.
     Opens WhatsApp with the message ready; the staff member presses send.
     ------------------------------------------------------------------ */
  PJ.customerMessage = (o) => {
    const first = fmt.firstName(o.customer.name);
    const room = PJ.ctx.showrooms().find((s) => s.id === o.showroom) || {};
    const balance = o.total - o.paid;
    const owing = balance > 0 ? ` The balance is ${fmt.money(balance)}.` : '';
    const due = o.due_date ? ` We expect it to be ready by ${fmt.day(o.due_date)}.` : '';
    const n = o.number;
    const lines = {
      new: `Hello ${first}, thank you for your order ${n} with Pushpa Jewellers. We have received it and will confirm the details shortly.`,
      confirmed: `Hello ${first}, your order ${n} with Pushpa Jewellers is confirmed.${due}`,
      in_making: `Hello ${first}, your order ${n} is now with our goldsmiths in the workshop.${due} We will message you as soon as it is ready.`,
      ready: o.fulfilment === 'delivery'
        ? `Hello ${first}, good news — your order ${n} is ready and will be sent out shortly.${owing}`
        : `Hello ${first}, good news — your order ${n} is ready for collection at our ${room.name || ''} showroom${room.address ? ', ' + room.address : ''}.${owing} We are open Monday to Saturday 9.15 am – 7.30 pm and Sunday until 2 pm.`,
      dispatched: `Hello ${first}, your order ${n} is on its way${o.tracking && o.tracking.courier ? ' with ' + o.tracking.courier : ''}.${o.tracking && o.tracking.number ? ' Tracking number: ' + o.tracking.number + '.' : ''}`,
      completed: `Hello ${first}, thank you for choosing Pushpa Jewellers. We hope you love your piece — do visit us again.`,
      cancelled: `Hello ${first}, your order ${n} with Pushpa Jewellers has been cancelled. Please call us if this is not what you expected.`
    };
    return `${lines[o.status] || lines.new}\n\n— Pushpa Jewellers${room.name ? ', ' + room.name : ''}${room.phone ? ' · ' + room.phone : ''}`;
  };
})();
