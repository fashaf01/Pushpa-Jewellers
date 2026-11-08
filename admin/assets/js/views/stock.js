/* Stock — levels per showroom, adjustments, transfers, and the movement log */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, fmt, $, $$, on } = PJ;

  PJ.views.stock = {
    nav: 'stock',
    title: 'Stock',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Counting stock'));
      const [products, moves] = await Promise.all([
        PJ.api.products.list({}),
        PJ.api.stock.movements({ limit: 60 })
      ]);
      if (!ctx.alive()) return;

      const rooms = PJ.ctx.showrooms();
      const state = { tab: ctx.query.tab === 'history' ? 'history' : 'levels', filter: ctx.query.filter || 'all', q: '' };

      const pieces = products.reduce((s, p) => s + PJ.pricing.totalStock(p), 0);
      const value = products.reduce((s, p) => s + PJ.pricing.totalStock(p) * (PJ.ctx.price(p).total || 0), 0);
      const lowCount = products.filter((p) => PJ.pricing.stockState(p) === 'low').length;
      const outCount = products.filter((p) => PJ.pricing.stockState(p) === 'out').length;

      el.innerHTML = String(html`
        ${ui.pageHead({ title: 'Stock', meta: 'What is on the shelves in each showroom. Sales on orders come off automatically.' })}

        <section class="kpis kpis--compact" aria-label="Stock summary">
          <div class="kpi"><span class="kpi__label">Pieces in stock</span><span class="kpi__value">${fmt.num(pieces)}</span>
            <span class="kpi__sub">${rooms.map((r) => `${r.name} ${products.reduce((s, p) => s + (Number(p.stock[r.id]) || 0), 0)}`).join(' · ')}</span></div>
          <div class="kpi"><span class="kpi__label">Stock value at today’s rate</span><span class="kpi__value">${fmt.money(value)}</span>
            <span class="kpi__sub">${PJ.ctx.rate ? `Gold pieces at the ${fmt.day(PJ.ctx.rate.date)} rate` : 'Enter today’s gold rate to value gold pieces'}</span></div>
          <button class="kpi ${lowCount ? 'kpi--warn' : ''}" type="button" data-filter="low"><span class="kpi__label">Running low</span><span class="kpi__value">${fmt.num(lowCount)}</span><span class="kpi__sub">At or below their alert level</span></button>
          <button class="kpi ${outCount ? 'kpi--warn' : ''}" type="button" data-filter="out"><span class="kpi__label">Out of stock</span><span class="kpi__value">${fmt.num(outCount)}</span><span class="kpi__sub">None in any showroom</span></button>
        </section>

        <div class="tabs" role="tablist" aria-label="Stock views">
          <button class="tab" type="button" role="tab" data-tab="levels" aria-selected="${state.tab === 'levels'}">Stock levels</button>
          <button class="tab" type="button" role="tab" data-tab="history" aria-selected="${state.tab === 'history'}">History</button>
        </div>
        <div data-panel></div>`);

      const panel = $('[data-panel]', el);

      function levels() {
        const q = state.q.toLowerCase();
        const list = products.filter((p) => {
          const s = PJ.pricing.stockState(p);
          if (state.filter === 'low' && s === 'ok') return false;
          if (state.filter === 'out' && s !== 'out') return false;
          if (q && !(p.name + ' ' + p.sku).toLowerCase().includes(q)) return false;
          return true;
        }).sort((a, b) => a.name.localeCompare(b.name));

        return html`
          <div class="toolbar">
            <label class="search">${ui.icon('search')}<span class="sr-only">Search stock</span>
              <input class="input" type="search" name="q" value="${state.q}" placeholder="Find a piece" autocomplete="off"></label>
            <div class="seg seg--sm" role="radiogroup" aria-label="Show">
              ${[['all', 'All'], ['low', 'Low & out'], ['out', 'Out only']].map(([k, l]) => html`<label class="seg__opt"><input type="radio" name="filter" value="${k}" ${state.filter === k ? 'checked' : ''}><span>${l}</span></label>`)}
            </div>
          </div>
          <div class="card card--flush">
            ${list.length ? html`<div class="table-wrap"><table class="table table--rows">
              <thead><tr><th>Piece</th>${rooms.map((r) => html`<th class="num">${r.name}</th>`)}<th class="num">Total</th><th class="num">Alert at</th><th>State</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>${list.map((p) => html`<tr>
                <td data-label="Piece"><span class="cell-product">${ui.thumb(p.images, 'sm')}<span><a class="strong" href="#/products/${p.id}">${p.name}</a><span class="cell-sub mono">${p.sku}</span></span></span></td>
                ${rooms.map((r) => html`<td data-label="${r.name}" class="num"><button class="qty-btn ${(Number(p.stock[r.id]) || 0) === 0 ? 'is-zero' : ''}" type="button" data-adjust="${p.id}" data-room="${r.id}" aria-label="Adjust ${p.name} in ${r.name}">${Number(p.stock[r.id]) || 0}</button></td>`)}
                <td data-label="Total" class="num strong">${PJ.pricing.totalStock(p)}</td>
                <td data-label="Alert at" class="num muted">${p.low_stock_at}</td>
                <td data-label="State">${ui.stockPill(p)}</td>
                <td class="cell-action"><div class="btn-row btn-row--end">
                  <button class="btn btn--sm" type="button" data-adjust="${p.id}">Adjust</button>
                  ${rooms.length > 1 ? html`<button class="btn btn--sm btn--ghost btn--icon" type="button" data-transfer="${p.id}" aria-label="Move ${p.name} between showrooms" title="Move between showrooms">${ui.icon('transfer')}</button>` : ''}
                </div></td>
              </tr>`)}</tbody></table></div>`
            : ui.empty('Nothing to show', state.filter === 'all' ? 'No pieces match that search.' : 'Every piece is above its alert level.')}
          </div>`;
      }

      function historyPanel() {
        return html`<div class="card card--flush">
          ${moves.length ? html`<div class="table-wrap"><table class="table table--rows">
            <thead><tr><th>When</th><th>Piece</th><th>Showroom</th><th class="num">Change</th><th>Why</th><th>By</th></tr></thead>
            <tbody>${moves.map((m) => html`<tr>
              <td data-label="When">${fmt.when(m.at)}</td>
              <td data-label="Piece"><a class="strong" href="#/products/${m.product_id}">${m.product_name}</a><span class="cell-sub mono">${m.product_sku}</span></td>
              <td data-label="Showroom">${PJ.ctx.showroomName(m.showroom)}</td>
              <td data-label="Change" class="num"><span class="delta ${m.delta > 0 ? 'delta--up' : 'delta--down'}">${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}</span></td>
              <td data-label="Why"><span class="cell">${PJ.MOVEMENT_REASONS[m.reason] || m.reason}${m.order_number ? html` · <a class="link" href="#/orders/${m.order_number}">${m.order_number}</a>` : ''}${m.note ? html`<span class="cell-sub">${m.note}</span>` : ''}</span></td>
              <td data-label="By" class="muted">${m.by}</td>
            </tr>`)}</tbody></table></div>`
          : ui.empty('No stock changes yet', 'Deliveries, sales and counts will be listed here.')}
        </div>`;
      }

      function draw() {
        panel.innerHTML = String(state.tab === 'levels' ? levels() : historyPanel());
      }

      function syncUrl() {
        const params = new URLSearchParams();
        if (state.tab !== 'levels') params.set('tab', state.tab);
        if (state.filter !== 'all') params.set('filter', state.filter);
        const s = params.toString();
        history.replaceState(null, '', '#/stock' + (s ? '?' + s : ''));
      }

      const byId = (id) => products.find((p) => p.id === id);

      on(el, 'click', '[data-tab]', (e, btn) => {
        state.tab = btn.dataset.tab;
        $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        syncUrl();
        draw();
      });
      on(el, 'click', '[data-filter]', (e, btn) => {
        state.tab = 'levels';
        state.filter = btn.dataset.filter;
        $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === 'levels')));
        syncUrl();
        draw();
      });
      on(el, 'change', 'input[name="filter"]', (e, input) => { state.filter = input.value; syncUrl(); draw(); });
      on(el, 'input', 'input[name="q"]', (e, input) => {
        state.q = input.value.trim();
        const pos = input.selectionStart;
        draw();
        const again = $('input[name="q"]', panel);
        again.focus();
        again.setSelectionRange(pos, pos);
      });
      on(el, 'click', '[data-adjust]', async (e, btn) => {
        const p = byId(btn.dataset.adjust);
        if (await ui.adjustStock(p, btn.dataset.room || rooms[0].id)) ctx.refresh();
      });
      on(el, 'click', '[data-transfer]', async (e, btn) => {
        if (await ui.transferStock(byId(btn.dataset.transfer))) ctx.refresh();
      });

      draw();
    }
  };
})();
