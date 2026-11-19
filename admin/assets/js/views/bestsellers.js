/* Best sellers, and the homepage Favourites carousel they can feed */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, fmt, $, on } = PJ;

  const PERIODS = [['30', '30 days'], ['90', '90 days'], ['365', '12 months'], ['0', 'All time']];

  PJ.views.bestsellers = {
    nav: 'bestsellers',
    title: 'Best sellers',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Ranking pieces'));
      const days = PERIODS.some((p) => p[0] === ctx.query.days) ? ctx.query.days : '30';
      const [best, products] = await Promise.all([
        PJ.api.reports.bestSellers({ days: Number(days) || '', limit: 20 }),
        PJ.api.products.list({})
      ]);
      if (!ctx.alive()) return;

      const limit = (PJ.ctx.settings && PJ.ctx.settings.featured_limit) || 8;
      const byId = Object.fromEntries(products.map((p) => [p.id, p]));
      let featured = products.filter((p) => p.featured_rank).sort((a, b) => a.featured_rank - b.featured_rank).map((p) => p.id);
      const savedOrder = featured.join(',');
      const maxUnits = Math.max(1, ...best.map((b) => b.units));
      const totalRevenue = best.reduce((s, b) => s + b.revenue, 0);

      el.innerHTML = String(html`
        ${ui.pageHead({
          title: 'Best sellers',
          meta: 'Ranked by pieces sold on orders that were not cancelled. Use them to choose what the website shows first.'
        })}

        <div class="grid-2 grid-2--best">
          <section class="card card--flush" aria-labelledby="rankTitle">
            <header class="card__head">
              <div>
                <h2 class="card__title" id="rankTitle">Top pieces</h2>
                <p class="card__sub">${best.length ? `${fmt.money(totalRevenue)} from the top ${best.length}` : 'No sales in this period'}</p>
              </div>
              <div class="seg seg--sm" role="radiogroup" aria-label="Period">
                ${PERIODS.map(([k, l]) => html`<label class="seg__opt"><input type="radio" name="days" value="${k}" ${k === days ? 'checked' : ''}><span>${l}</span></label>`)}
              </div>
            </header>
            ${best.length ? html`<div class="table-wrap"><table class="table">
              <thead><tr><th class="num">#</th><th>Piece</th><th>Sold</th><th class="num">Value</th><th><span class="sr-only">Homepage</span></th></tr></thead>
              <tbody>${best.map((b, i) => html`<tr>
                <td data-label="Rank" class="num"><span class="rank">${i + 1}</span></td>
                <td data-label="Piece"><span class="cell-product">${ui.thumb(b.images, 'sm')}<span><a class="strong" href="#/products/${b.product_id}">${b.name}</a><span class="cell-sub">${fmt.plural(b.orders, 'order')}</span></span></span></td>
                <td data-label="Sold" class="nowrap"><span class="meter" aria-hidden="true"><span class="meter__fill" style="width:${Math.max(4, Math.round((b.units / maxUnits) * 100))}%"></span></span><span class="meter__value">${b.units}</span></td>
                <td data-label="Value" class="num">${fmt.money(b.revenue)}</td>
                <td class="cell-action">${byId[b.product_id] ? html`<button class="star" type="button" data-feature="${b.product_id}" aria-pressed="false"><span data-star-icon></span><span class="sr-only">Homepage favourite: ${b.name}</span></button>` : ''}</td>
              </tr>`)}</tbody></table></div>`
            : ui.empty('No sales in this period', 'Pick a longer period, or come back once orders are in.')}
          </section>

          <section class="card" aria-labelledby="homeTitle">
            <header class="card__head">
              <div>
                <h2 class="card__title" id="homeTitle">Homepage favourites</h2>
                <p class="card__sub">The website’s Favourites carousel shows these ${limit}, in this order.</p>
              </div>
            </header>
            <div class="card__body">
              <div data-featured></div>
              <label class="field"><span class="field__label">Add a piece</span>
                <select class="select" data-add-select><option value="">Choose a published piece…</option></select></label>
              <div class="btn-row">
                <button class="btn btn--sm btn--ghost" type="button" data-act="auto" ${best.length ? '' : 'disabled'}>Use the top ${limit} best sellers</button>
              </div>
            </div>
            <footer class="card__foot">
              <span class="muted small" data-dirty></span>
              <button class="btn btn--primary" type="button" data-act="save">Save homepage order</button>
            </footer>
          </section>
        </div>`);

      const listEl = $('[data-featured]', el);
      const addSel = $('[data-add-select]', el);
      const dirtyEl = $('[data-dirty]', el);

      function draw() {
        listEl.innerHTML = String(featured.length
          ? html`<ol class="sortable">${featured.map((id, i) => {
              const p = byId[id];
              return html`<li class="sortable__item">
                <span class="rank">${i + 1}</span>
                ${ui.thumb(p.images, 'sm')}
                <span class="list__main">${p.name}<span class="list__sub">${p.status !== 'published' ? html`<span class="warn-text">${p.status} — hidden on the site</span>` : PJ.label.category(p.category)}</span></span>
                <span class="sortable__btns">
                  <button class="btn btn--icon btn--sm btn--ghost" type="button" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${p.name} up">${ui.icon('up')}</button>
                  <button class="btn btn--icon btn--sm btn--ghost" type="button" data-down="${i}" ${i === featured.length - 1 ? 'disabled' : ''} aria-label="Move ${p.name} down">${ui.icon('down')}</button>
                  <button class="btn btn--icon btn--sm btn--ghost btn--danger-text" type="button" data-drop="${i}" aria-label="Remove ${p.name} from the homepage">${ui.icon('x')}</button>
                </span>
              </li>`;
            })}</ol>`
          : ui.empty('No favourites chosen', 'Add pieces below, or fill the list from the best sellers.'));

        const choices = products.filter((p) => p.status === 'published' && !featured.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name));
        addSel.innerHTML = String(html`<option value="">${featured.length >= limit ? `The list is full (${limit})` : 'Choose a published piece…'}</option>${choices.map((p) => html`<option value="${p.id}">${p.name} · ${p.sku}</option>`)}`);
        addSel.disabled = featured.length >= limit;

        const dirty = featured.join(',') !== savedOrder;
        dirtyEl.textContent = dirty ? 'Unsaved changes' : '';
        $('[data-act="save"]', el).disabled = !dirty;

        el.querySelectorAll('[data-feature]').forEach((btn) => {
          const isOn = featured.includes(btn.dataset.feature);
          btn.setAttribute('aria-pressed', String(isOn));
          btn.title = isOn ? 'In the homepage favourites — click to remove' : featured.length >= limit ? `The homepage list is full (${limit})` : 'Add to the homepage favourites';
          btn.disabled = !isOn && featured.length >= limit;
          btn.querySelector('[data-star-icon]').innerHTML = String(ui.icon(isOn ? 'star-fill' : 'star'));
        });
      }

      on(el, 'change', 'input[name="days"]', (e, input) => { location.hash = '#/bestsellers?days=' + input.value; });
      on(el, 'click', '[data-up]', (e, b) => { const i = Number(b.dataset.up); [featured[i - 1], featured[i]] = [featured[i], featured[i - 1]]; draw(); });
      on(el, 'click', '[data-down]', (e, b) => { const i = Number(b.dataset.down); [featured[i + 1], featured[i]] = [featured[i], featured[i + 1]]; draw(); });
      on(el, 'click', '[data-drop]', (e, b) => { featured.splice(Number(b.dataset.drop), 1); draw(); });
      on(el, 'click', '[data-feature]', (e, b) => {
        const id = b.dataset.feature;
        if (featured.includes(id)) featured = featured.filter((x) => x !== id);
        else if (featured.length < limit) featured.push(id);
        draw();
      });
      addSel.addEventListener('change', () => { if (addSel.value) { featured.push(addSel.value); draw(); } });
      on(el, 'click', '[data-act="auto"]', () => {
        const top = best.filter((b) => byId[b.product_id] && byId[b.product_id].status === 'published').map((b) => b.product_id);
        const rest = featured.filter((id) => !top.includes(id));
        featured = top.concat(rest).slice(0, limit);
        draw();
        ui.toast('Filled from the best sellers — save to put it live.');
      });
      on(el, 'click', '[data-act="save"]', async (e, btn) => {
        btn.disabled = true;
        try {
          await PJ.api.homepage.setFeatured(featured);
          ui.toast('Homepage favourites saved');
          ctx.refresh();
        } catch (err) { ui.fail(err); btn.disabled = false; }
      });

      draw();
    }
  };
})();
