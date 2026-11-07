/* Gold rate — enter today's rate once and every gold-rate piece reprices */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, fmt, $, $$, on } = PJ;
  const PAWN = PJ.pricing.PAWN_G;

  PJ.views.pricing = {
    nav: 'pricing',
    title: 'Gold rate',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Loading rates'));
      const [rates, products] = await Promise.all([
        PJ.api.rates.list({ limit: 60 }),
        PJ.api.products.list({})
      ]);
      if (!ctx.alive()) return;

      const today = PJ.isoDay();
      const latest = rates[0] || null;
      const hasToday = latest && latest.date === today;
      let unit = PJ.storage.get('pj-rate-unit') === 'gram' ? 'gram' : 'pawn';
      const goldPieces = products.filter((p) => p.pricing_mode === 'gold_rate');

      /* Working values, always per gram */
      const entry = { 24: latest ? latest.per_gram[24] : null, 22: latest ? latest.per_gram[22] : null, 18: latest ? latest.per_gram[18] : null };
      const shown = (perGram) => (perGram ? Math.round(unit === 'pawn' ? perGram * PAWN : perGram) : '');

      el.innerHTML = String(html`
        ${ui.pageHead({
          title: 'Gold rate',
          meta: 'Enter the rate each morning. Every piece priced on the gold rate updates on the admin and the website.'
        })}

        <div class="grid-2 grid-2--rate">
          <form class="card" novalidate aria-labelledby="rateTitle">
            <header class="card__head">
              <div>
                <h2 class="card__title" id="rateTitle">${hasToday ? 'Today’s rate' : 'Enter today’s rate'} · ${fmt.date(new Date())}</h2>
                <p class="card__sub">${hasToday ? `Saved ${fmt.when(latest.updated_at)}${latest.updated_by ? ' by ' + latest.updated_by : ''}. Save again to correct it.` : latest ? `The last rate saved was for ${fmt.day(latest.date)}. The boxes start from it.` : 'No rate has been saved yet.'}</p>
              </div>
            </header>
            <div class="card__body">
              <div class="field">
                <span class="field__label" id="unitLbl">Enter the rate</span>
                <div class="seg seg--sm" role="radiogroup" aria-labelledby="unitLbl">
                  <label class="seg__opt"><input type="radio" name="unit" value="pawn" ${unit === 'pawn' ? 'checked' : ''}><span>Per pawn (8 g)</span></label>
                  <label class="seg__opt"><input type="radio" name="unit" value="gram" ${unit === 'gram' ? 'checked' : ''}><span>Per gram</span></label>
                </div>
              </div>
              <div class="rate-inputs">
                ${[22, 24, 18].map((k) => html`
                  <label class="field rate-input ${k === 22 ? 'rate-input--lead' : ''}">
                    <span class="field__label">${k}kt</span>
                    <span class="input-group"><span class="input-group__addon">Rs</span><input class="input" name="k${k}" type="number" min="0" step="10" inputmode="numeric" value="${shown(entry[k])}" required></span>
                    <span class="field__hint" data-conv="${k}"></span>
                  </label>`)}
              </div>
              <button class="btn btn--sm btn--ghost" type="button" data-act="derive">Work out 24kt and 18kt from 22kt</button>
              <p class="field__hint">Uses purity (22kt = 91.6%, 18kt = 75%). Overwrite either figure with the rate you actually buy and sell at.</p>
            </div>
            <p class="form-error" role="alert" hidden></p>
            <footer class="card__foot">
              <button class="btn btn--primary" type="submit">${ui.icon('check')}<span>Save today’s rate</span></button>
            </footer>
          </form>

          <section class="card" aria-labelledby="impactTitle">
            <header class="card__head">
              <div>
                <h2 class="card__title" id="impactTitle">What changes</h2>
                <p class="card__sub">${fmt.plural(goldPieces.length, 'piece follows', 'pieces follow')} the gold rate.</p>
              </div>
            </header>
            <div data-impact></div>
          </section>
        </div>

        <section class="card" aria-labelledby="histTitle">
          <header class="card__head">
            <div>
              <h2 class="card__title" id="histTitle">22kt per pawn, last ${Math.min(rates.length, 30)} rates</h2>
              <p class="card__sub">Hover the line for any day.</p>
            </div>
          </header>
          <div class="card__body"><div data-chart></div></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Date</th><th class="num">24kt / pawn</th><th class="num">22kt / pawn</th><th class="num">Change</th><th class="num">18kt / pawn</th><th>Entered by</th></tr></thead>
            <tbody>${rates.slice(0, 14).map((r, i) => {
              const prev = rates[i + 1];
              const ch = prev ? (r.per_gram[22] - prev.per_gram[22]) * PAWN : 0;
              return html`<tr>
                <td data-label="Date">${fmt.day(r.date)}${r.date === today ? html` <span class="pill pill--ready">Today</span>` : ''}</td>
                <td data-label="24kt / pawn" class="num">${fmt.money(r.per_gram[24] * PAWN)}</td>
                <td data-label="22kt / pawn" class="num strong">${fmt.money(r.per_gram[22] * PAWN)}</td>
                <td data-label="Change" class="num">${prev ? html`<span class="delta">${ch === 0 ? '—' : fmt.signedMoney(ch)}</span>` : html`<span class="muted">—</span>`}</td>
                <td data-label="18kt / pawn" class="num">${fmt.money(r.per_gram[18] * PAWN)}</td>
                <td data-label="Entered by" class="muted">${r.updated_by || '—'}</td>
              </tr>`;
            })}</tbody></table></div>
        </section>`);

      const form = $('form', el);
      const errEl = $('.form-error', form);

      function readEntry() {
        [24, 22, 18].forEach((k) => {
          const v = Number(form.elements['k' + k].value);
          entry[k] = v > 0 ? (unit === 'pawn' ? v / PAWN : v) : null;
        });
      }

      function drawHints() {
        [24, 22, 18].forEach((k) => {
          const hint = $(`[data-conv="${k}"]`, form);
          const g = entry[k];
          if (!g) { hint.textContent = ''; return; }
          hint.textContent = unit === 'pawn' ? `= ${fmt.money(g)} per gram` : `= ${fmt.money(g * PAWN)} per pawn`;
        });
      }

      function drawImpact() {
        const box = $('[data-impact]', el);
        if (!goldPieces.length) { box.innerHTML = String(ui.empty('No gold-rate pieces', 'Pieces priced on the gold rate will be listed here.')); return; }
        const proposed = { date: today, per_gram: { 24: entry[24], 22: entry[22], 18: entry[18] } };
        const rounding = PJ.ctx.rounding();
        const rows = goldPieces.map((p) => ({
          p,
          before: PJ.pricing.priceOf(p, latest, rounding).total,
          after: PJ.pricing.priceOf(p, proposed, rounding).total
        }));
        const shownRows = rows.slice(0, 7);
        box.innerHTML = String(html`<ul class="list">${shownRows.map(({ p, before, after }) => {
          const d = before != null && after != null ? after - before : 0;
          return html`<li class="list__item list__item--static">
            ${ui.thumb(p.images, 'sm')}
            <span class="list__main">${p.name}<span class="list__sub">${p.karat}kt · ${fmt.grams(p.weight_g)}</span></span>
            <span class="list__figure"><span class="num strong">${fmt.money(after)}</span>
              <span class="list__sub">${d ? html`<span class="delta">${fmt.signedMoney(d)}</span>` : 'no change'}</span></span>
          </li>`;
        })}</ul>
        ${rows.length > shownRows.length ? html`<p class="table-foot">and ${fmt.plural(rows.length - shownRows.length, 'more piece')}</p>` : ''}`);
      }

      function redrawInputs() {
        [24, 22, 18].forEach((k) => { form.elements['k' + k].value = shown(entry[k]); });
        drawHints();
      }

      on(form, 'input', 'input[type="number"]', () => { readEntry(); drawHints(); drawImpact(); });
      on(form, 'change', 'input[name="unit"]', (e, input) => {
        unit = input.value;
        try { PJ.storage.set('pj-rate-unit', unit); } catch (err) { /* fine */ }
        redrawInputs();
      });
      on(form, 'click', '[data-act="derive"]', () => {
        readEntry();
        if (!entry[22]) { ui.toast('Enter the 22kt rate first.', 'warn'); form.elements.k22.focus(); return; }
        const d = PJ.pricing.deriveFrom22(entry[22]);
        entry[24] = d[24];
        entry[18] = d[18];
        redrawInputs();
        drawImpact();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.hidden = true;
        readEntry();
        const missing = [22, 24, 18].find((k) => !entry[k]);
        if (missing) { errEl.textContent = `Enter the ${missing}kt rate.`; errEl.hidden = false; form.elements['k' + missing].focus(); return; }
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
          const saved = await PJ.api.rates.save({ date: today, per_gram: { 24: Math.round(entry[24]), 22: Math.round(entry[22]), 18: Math.round(entry[18]) } });
          PJ.ctx.rate = saved;
          PJ.bus.emit('rates:changed', saved);
          ui.toast(`Today’s rate saved — ${fmt.plural(goldPieces.length, 'piece')} repriced`);
          ctx.refresh();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        } finally {
          btn.disabled = false;
        }
      });

      const series = rates.slice(0, 30).reverse().map((r) => ({ date: r.date, value: r.per_gram[22] * PAWN }));
      PJ.charts.rate($('[data-chart]', el), series, '22kt gold per pawn');
      drawHints();
      drawImpact();
    }
  };
})();
