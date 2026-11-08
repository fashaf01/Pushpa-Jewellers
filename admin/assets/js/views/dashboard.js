/* Dashboard — what needs doing today */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, fmt } = PJ;

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  /* New orders first, then ready ones, then whatever is due soonest */
  const PRIORITY = { new: 0, ready: 1, confirmed: 2, in_making: 3, dispatched: 4 };
  function attentionOrder(a, b) {
    return (PRIORITY[a.status] - PRIORITY[b.status]) || String(a.due_date || '9').localeCompare(String(b.due_date || '9'));
  }

  PJ.views.dashboard = {
    nav: 'dashboard',
    title: 'Dashboard',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Loading today’s summary'));

      const [sales, open, products, best] = await Promise.all([
        PJ.api.reports.sales({ days: 14 }),
        PJ.api.orders.list({ status: 'open' }),
        PJ.api.products.list({}),
        PJ.api.reports.bestSellers({ days: 30, limit: 5 })
      ]);
      if (!ctx.alive()) return;

      const user = PJ.session.user() || {};
      const today = sales[sales.length - 1] || { total: 0, orders: 0 };
      const yesterday = sales[sales.length - 2] || { total: 0 };
      const fortnight = sales.reduce((s, d) => s + d.total, 0);
      const ready = open.filter((o) => o.status === 'ready').length;
      const fresh = open.filter((o) => o.status === 'new').length;
      const low = products.filter((p) => p.status !== 'archived' && PJ.pricing.stockState(p) !== 'ok')
        .sort((a, b) => PJ.pricing.totalStock(a) - PJ.pricing.totalStock(b));
      const out = low.filter((p) => PJ.pricing.stockState(p) === 'out').length;
      const rate = PJ.ctx.rate;
      const rateToday = rate && rate.date === PJ.isoDay();
      const pawn22 = rate ? rate.per_gram[22] * PJ.pricing.PAWN_G : null;
      const delta = today.total - yesterday.total;

      el.innerHTML = String(html`
        ${ui.pageHead({
          eyebrow: fmt.date(new Date()),
          title: `${greeting()}${user.name ? ', ' + fmt.firstName(user.name) : ''}`,
          actions: html`
            <a class="btn" href="#/products/new">${ui.icon('plus')}<span>Add product</span></a>
            <a class="btn btn--primary" href="#/orders/new">${ui.icon('plus')}<span>New order</span></a>`
        })}

        ${!rateToday ? html`
          <div class="notice notice--warn notice--action">
            ${ui.icon('alert')}
            ${rate
              ? html`<p><strong>Today’s gold rate hasn’t been entered.</strong> Gold-rate prices are still using ${fmt.day(rate.date)}’s rate.</p>`
              : html`<p><strong>No gold rate has been entered yet.</strong> Gold pieces have no price until you enter today’s rate.</p>`}
            <a class="btn btn--sm btn--primary" href="#/pricing">Enter today’s rate</a>
          </div>` : ''}

        <section class="kpis" aria-label="Today at a glance">
          <a class="kpi" href="#/orders?tab=all">
            <span class="kpi__label">Sales today</span>
            <span class="kpi__value">${fmt.money(today.total)}</span>
            <span class="kpi__sub">${fmt.plural(today.orders, 'order')} · ${delta === 0 ? 'same as yesterday' : html`<span class="${delta > 0 ? 'up' : 'down'}">${fmt.signedMoney(delta)}</span> vs yesterday`}</span>
          </a>
          <a class="kpi" href="#/orders">
            <span class="kpi__label">Open orders</span>
            <span class="kpi__value">${fmt.num(open.length)}</span>
            <span class="kpi__sub">${fresh} new · ${ready} ready</span>
          </a>
          <a class="kpi ${low.length ? 'kpi--warn' : ''}" href="#/stock?filter=low">
            <span class="kpi__label">Low or out of stock</span>
            <span class="kpi__value">${fmt.num(low.length)}</span>
            <span class="kpi__sub">${out} out of stock</span>
          </a>
          <a class="kpi ${rateToday ? '' : 'kpi--warn'}" href="#/pricing">
            <span class="kpi__label">22kt gold, per pawn</span>
            <span class="kpi__value">${fmt.money(pawn22)}</span>
            <span class="kpi__sub">${rateToday ? (PJ.pricing.isAutoRate(rate) ? 'Today’s market rate, automatic' : 'Updated today') : html`${ui.icon('alert', 'icon--inline')} Not updated today`}</span>
          </a>
        </section>

        <div class="dash">
          <section class="card dash__sales" aria-labelledby="salesTitle">
            <header class="card__head">
              <div>
                <h2 class="card__title" id="salesTitle">Sales, last 14 days</h2>
                <p class="card__sub">${fmt.money(fortnight)} across ${fmt.plural(sales.reduce((s, d) => s + d.orders, 0), 'order')}</p>
              </div>
            </header>
            <div class="card__body"><div data-chart="sales"></div></div>
          </section>

          <section class="card dash__attention" aria-labelledby="attTitle">
            <header class="card__head">
              <h2 class="card__title" id="attTitle">Orders needing attention</h2>
              <a class="btn btn--sm btn--ghost" href="#/orders">All orders</a>
            </header>
            ${open.length
              ? html`<ul class="list">${open.slice().sort(attentionOrder).slice(0, 6).map((o) => html`
                <li><a class="list__item" href="#/orders/${o.id}">
                  <span class="list__main">
                    <strong>${o.number}</strong> · ${o.customer.name}
                    <span class="list__sub">${o.items.map((i) => i.name).join(', ')}${o.due_date ? html` · due ${fmt.day(o.due_date)}` : ''}</span>
                  </span>
                  ${ui.statusPill(o.status, o)}
                </a></li>`)}</ul>`
              : ui.empty('Nothing waiting', 'Every order is completed. New ones will show up here.')}
          </section>

          <section class="card" aria-labelledby="lowTitle">
            <header class="card__head">
              <h2 class="card__title" id="lowTitle">Running low</h2>
              <a class="btn btn--sm btn--ghost" href="#/stock?filter=low">Stock</a>
            </header>
            ${low.length
              ? html`<ul class="list">${low.slice(0, 6).map((p) => html`
                <li><a class="list__item" href="#/products/${p.id}">
                  ${ui.thumb(p.images, 'sm')}
                  <span class="list__main">${p.name}<span class="list__sub">${ui.stockLine(p)}</span></span>
                  ${ui.stockPill(p)}
                </a></li>`)}</ul>`
              : ui.empty('Shelves are full', 'No piece is at or below its alert level.')}
          </section>

          <section class="card" aria-labelledby="bestTitle">
            <header class="card__head">
              <h2 class="card__title" id="bestTitle">Best sellers, 30 days</h2>
              <a class="btn btn--sm btn--ghost" href="#/bestsellers">See all</a>
            </header>
            ${best.length
              ? html`<ol class="list list--ranked">${best.map((b, i) => html`
                <li><a class="list__item" href="#/products/${b.product_id}">
                  <span class="rank">${i + 1}</span>
                  ${ui.thumb(b.images, 'sm')}
                  <span class="list__main">${b.name}<span class="list__sub">${fmt.money(b.revenue)}</span></span>
                  <span class="list__figure">${fmt.plural(b.units, 'sold', 'sold')}</span>
                </a></li>`)}</ol>`
              : ui.empty('No sales yet', 'Best sellers appear once orders come in.')}
          </section>
        </div>`);

      PJ.charts.sales(el.querySelector('[data-chart="sales"]'), sales);
    }
  };
})();
