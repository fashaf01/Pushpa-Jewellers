/* Products — catalogue list and the product editor */
(function () {
  'use strict';

  const PJ = window.PJ;
  const cfg = window.PJ_CONFIG || {};
  const { html, ui, fmt, $, $$, on } = PJ;

  /* ==================================================================
     LIST
     ================================================================== */
  PJ.views.products = {
    nav: 'products',
    title: 'Products',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Loading products'));
      const all = await PJ.api.products.list({ status: 'all' });
      if (!ctx.alive()) return;

      const state = {
        q: ctx.query.q || '',
        category: ctx.query.category || '',
        status: ctx.query.status || 'active'
      };

      el.innerHTML = String(html`
        ${ui.pageHead({
          title: 'Products',
          meta: 'Photos, prices, stock and what shows on the website.',
          actions: html`<a class="btn btn--primary" href="#/products/new">${ui.icon('plus')}<span>Add product</span></a>`
        })}
        <div class="toolbar">
          <label class="search">
            ${ui.icon('search')}
            <span class="sr-only">Search products</span>
            <input class="input" type="search" name="q" value="${state.q}" placeholder="Name, SKU or stone" autocomplete="off">
          </label>
          <label class="field field--inline"><span class="sr-only">Category</span>
            <select class="select" name="category"><option value="">All categories</option>${ui.options(PJ.CATEGORIES, state.category)}</select></label>
          <label class="field field--inline"><span class="sr-only">Status</span>
            <select class="select" name="status">${ui.options([['active', 'Published & drafts'], ['published', 'Published'], ['draft', 'Drafts'], ['archived', 'Archived'], ['all', 'Everything']], state.status)}</select></label>
        </div>
        <div class="card card--flush" data-list></div>`);

      const listEl = $('[data-list]', el);

      function rows() {
        const q = state.q.toLowerCase();
        return all.filter((p) => {
          if (state.status === 'active' && p.status === 'archived') return false;
          if (state.status !== 'active' && state.status !== 'all' && p.status !== state.status) return false;
          if (state.category && p.category !== state.category) return false;
          if (q && !(p.name + ' ' + p.sku + ' ' + p.stones + ' ' + p.badge).toLowerCase().includes(q)) return false;
          return true;
        });
      }

      function draw() {
        const list = rows();
        listEl.innerHTML = String(list.length
          ? html`<div class="table-wrap"><table class="table table--rows">
            <thead><tr><th>Piece</th><th>Category</th><th>Metal</th><th class="num">Price today</th><th>Stock</th><th>Status</th><th><span class="sr-only">Homepage</span></th></tr></thead>
            <tbody>${list.map((p) => html`
              <tr class="is-link" data-href="#/products/${p.id}">
                <td data-label="Piece"><span class="cell-product">${ui.thumb(p.images, 'md')}<span><a class="strong" href="#/products/${p.id}">${p.name}</a><span class="cell-sub mono">${p.sku}</span></span></span></td>
                <td data-label="Category">${PJ.label.category(p.category)}</td>
                <td data-label="Metal"><span class="cell">${PJ.label.metalLine(p)}<span class="cell-sub">${p.weight_g ? fmt.grams(p.weight_g) : ''}${p.stones ? (p.weight_g ? ' · ' : '') + p.stones : ''}</span></span></td>
                <td data-label="Price today" class="num"><span class="cell">${ui.price(p)}<span class="cell-sub">${p.pricing_mode === 'gold_rate' ? 'follows gold rate' : 'fixed'}${p.show_price ? '' : ' · on enquiry'}</span></span></td>
                <td data-label="Stock">${ui.stockLine(p)}</td>
                <td data-label="Status"><span class="pill pill--p-${p.status}">${{ published: 'Published', draft: 'Draft', archived: 'Archived' }[p.status]}</span></td>
                <td data-label="Homepage" class="cell-action">
                  <button class="star" type="button" data-star="${p.id}" aria-pressed="${Boolean(p.featured_rank)}" title="${p.featured_rank ? 'In the homepage favourites — click to remove' : 'Add to the homepage favourites'}">
                    ${ui.icon(p.featured_rank ? 'star-fill' : 'star')}<span class="sr-only">Homepage favourite</span>
                  </button>
                </td>
              </tr>`)}</tbody></table></div>
            <p class="table-foot">${fmt.plural(list.length, 'piece')}${list.length !== all.length ? ` of ${all.length}` : ''}</p>`
          : ui.empty('No pieces match', 'Clear the search or pick another category.', html`<a class="btn" href="#/products/new">${ui.icon('plus')}<span>Add a product</span></a>`));
      }

      function syncUrl() {
        const params = new URLSearchParams();
        if (state.q) params.set('q', state.q);
        if (state.category) params.set('category', state.category);
        if (state.status !== 'active') params.set('status', state.status);
        const s = params.toString();
        history.replaceState(null, '', '#/products' + (s ? '?' + s : ''));
      }

      on(el, 'input', 'input[name="q"]', (e, input) => { state.q = input.value.trim(); syncUrl(); draw(); });
      on(el, 'change', 'select', (e, sel) => { state[sel.name] = sel.value; syncUrl(); draw(); });
      on(el, 'click', 'tr[data-href]', (e, tr) => { if (!e.target.closest('a, button')) location.hash = tr.dataset.href; });
      on(el, 'click', '[data-star]', async (e, btn) => {
        const p = all.find((x) => x.id === btn.dataset.star);
        const limit = (PJ.ctx.settings && PJ.ctx.settings.featured_limit) || 8;
        const count = all.filter((x) => x.featured_rank).length;
        if (!p.featured_rank && count >= limit) {
          ui.toast(`The homepage shows ${limit} favourites and all ${limit} are taken. Remove one first, or reorder them on Best sellers.`, 'warn');
          return;
        }
        btn.disabled = true;
        try {
          const saved = await PJ.api.products.update(p.id, { featured: !p.featured_rank });
          Object.assign(p, saved);
          if (!saved.featured_rank) {
            /* ranks close up behind the removed piece */
            const fresh = await PJ.api.products.list({ status: 'all' });
            fresh.forEach((f) => { const local = all.find((x) => x.id === f.id); if (local) local.featured_rank = f.featured_rank; });
          }
          ui.toast(saved.featured_rank ? `${p.name} added to the homepage favourites` : `${p.name} removed from the homepage`);
          draw();
        } catch (err) { ui.fail(err); btn.disabled = false; }
      });

      draw();
    }
  };

  /* ==================================================================
     EDITOR
     ================================================================== */
  function blank() {
    const s = PJ.ctx.settings || {};
    const stock = {};
    PJ.ctx.showrooms().forEach((r) => { stock[r.id] = 0; });
    return {
      id: null, sku: '', name: '', category: 'rings', badge: '', description: '',
      metal: 'yellow_gold', karat: 22, weight_g: null, stones: '',
      pricing_mode: 'gold_rate', making_type: 'percent', making_value: s.default_making_percent || 12,
      stone_value: 0, fixed_price: 0, show_price: true,
      images: [], stock, low_stock_at: s.low_stock_default == null ? 1 : s.low_stock_default,
      status: 'published', featured_rank: null
    };
  }

  function breakdown(p) {
    const pr = PJ.ctx.price(p);
    if (pr.total == null) return html`<p class="breakdown__missing">${ui.icon('alert', 'icon--inline')} ${pr.missing}</p>`;
    if (pr.mode === 'fixed') {
      return html`<dl class="breakdown"><div class="breakdown__total"><dt>Price</dt><dd>${fmt.money(pr.total)}</dd></div></dl>`;
    }
    const rate = PJ.ctx.rate;
    return html`<dl class="breakdown">
      <div><dt>Gold · ${fmt.grams(p.weight_g)} × ${fmt.money(pr.perGram)}/g <span class="muted">(${p.karat}kt, ${fmt.day(rate.date)})</span></dt><dd>${fmt.money(pr.metal)}</dd></div>
      <div><dt>Making charge${p.making_type === 'percent' ? ` · ${p.making_value || 0}%` : ''}</dt><dd>${fmt.money(pr.making)}</dd></div>
      ${pr.stones ? html`<div><dt>Stones & extras</dt><dd>${fmt.money(pr.stones)}</dd></div>` : ''}
      <div class="breakdown__total"><dt>Price today <span class="muted">rounded to ${fmt.money(PJ.ctx.rounding())}</span></dt><dd>${fmt.money(pr.total)}</dd></div>
    </dl>`;
  }

  PJ.views.product = {
    nav: 'products',
    title: 'Product',
    async render(el, ctx) {
      const editing = ctx.params.id && ctx.params.id !== 'new';
      el.innerHTML = String(ui.loading('Loading'));
      const p = editing ? await PJ.api.products.get(ctx.params.id) : blank();
      if (!ctx.alive()) return;

      let images = (p.images || []).slice();
      let uploading = 0;
      const gold = PJ.pricing.isGold(p.metal);

      el.innerHTML = String(html`
        ${ui.pageHead({
          back: '#/products',
          backLabel: 'Products',
          title: editing ? p.name : 'Add a product',
          meta: editing ? html`<span class="mono">${p.sku}</span> · last changed ${fmt.when(p.updated_at)}` : 'Photos first, then the details. You can save as a draft and finish later.'
        })}

        <form class="form" novalidate>
          <div class="grid-2 grid-2--product">
            <div class="stack">

              <section class="card" aria-labelledby="pPhotos">
                <header class="card__head">
                  <div>
                    <h2 class="card__title" id="pPhotos">Photos</h2>
                    <p class="card__sub">The first photo is the main one on the website. Square photos on a plain background look best.</p>
                  </div>
                </header>
                <div class="card__body">
                  <div class="photos" data-photos></div>
                  <div class="dropzone" data-drop>
                    ${ui.icon('upload')}
                    <p><strong>Drop photos here</strong> or</p>
                    <label class="btn btn--sm">
                      <input type="file" accept="image/*" multiple data-file class="sr-only">
                      ${ui.icon('image')}<span>Choose photos</span>
                    </label>
                    <button class="btn btn--sm btn--ghost" type="button" data-act="url">Use an image link</button>
                    <p class="dropzone__hint">On a phone, “Choose photos” can open the camera. Large photos are shrunk before upload.</p>
                  </div>
                </div>
              </section>

              <section class="card" aria-labelledby="pDetails">
                <header class="card__head"><h2 class="card__title" id="pDetails">Details</h2></header>
                <div class="card__body">
                  <label class="field"><span class="field__label">Name</span><input class="input" name="name" value="${p.name}" placeholder="e.g. Bridal necklace" required></label>
                  <div class="row row--3">
                    <label class="field"><span class="field__label">Category</span><select class="select" name="category">${ui.options(PJ.CATEGORIES, p.category)}</select></label>
                    <label class="field"><span class="field__label">SKU</span><input class="input mono" name="sku" value="${p.sku}" placeholder="Made for you if blank"></label>
                    <label class="field"><span class="field__label">Badge <span class="muted">(optional)</span></span><input class="input" name="badge" value="${p.badge}" list="badgeList" placeholder="e.g. Bridal"></label>
                  </div>
                  <datalist id="badgeList">${PJ.BADGES.map((b) => html`<option value="${b}"></option>`)}</datalist>
                  <div class="row row--3">
                    <label class="field"><span class="field__label">Metal</span><select class="select" name="metal">${ui.options(PJ.METALS, p.metal)}</select></label>
                    <label class="field"><span class="field__label">Karat</span><select class="select" name="karat" ${gold ? '' : 'disabled'}>${ui.options(PJ.KARATS.map((k) => [k, k + 'kt']), p.karat)}</select></label>
                    <label class="field"><span class="field__label">Weight</span><span class="input-group"><input class="input" name="weight_g" type="number" min="0" step="0.01" inputmode="decimal" value="${p.weight_g == null ? '' : p.weight_g}"><span class="input-group__addon">g</span></span></label>
                  </div>
                  <label class="field"><span class="field__label">Stones & details <span class="muted">(optional)</span></span><input class="input" name="stones" value="${p.stones}" placeholder="e.g. Natural blue sapphire · 1.8 ct"></label>
                  <label class="field"><span class="field__label">Description <span class="muted">(optional)</span></span><textarea class="textarea" name="description" rows="3">${p.description}</textarea></label>
                </div>
              </section>

              <section class="card" aria-labelledby="pPrice">
                <header class="card__head"><h2 class="card__title" id="pPrice">Price</h2></header>
                <div class="card__body">
                  <div class="field">
                    <span class="field__label" id="pMode">How is it priced?</span>
                    <div class="seg" role="radiogroup" aria-labelledby="pMode">
                      <label class="seg__opt"><input type="radio" name="pricing_mode" value="gold_rate" ${p.pricing_mode === 'gold_rate' ? 'checked' : ''} ${gold ? '' : 'disabled'}><span>Today’s gold rate</span></label>
                      <label class="seg__opt"><input type="radio" name="pricing_mode" value="fixed" ${p.pricing_mode === 'fixed' ? 'checked' : ''}><span>Fixed price</span></label>
                    </div>
                  </div>

                  <div data-mode="gold_rate">
                    <div class="row row--2">
                      <div class="field">
                        <span class="field__label" id="pMaking">Making charge</span>
                        <div class="input-row">
                          <div class="seg seg--sm" role="radiogroup" aria-labelledby="pMaking">
                            <label class="seg__opt"><input type="radio" name="making_type" value="percent" ${p.making_type !== 'flat' ? 'checked' : ''}><span>%</span></label>
                            <label class="seg__opt"><input type="radio" name="making_type" value="flat" ${p.making_type === 'flat' ? 'checked' : ''}><span>Rs</span></label>
                          </div>
                          <input class="input" name="making_value" type="number" min="0" step="0.5" inputmode="decimal" value="${p.making_value}" aria-labelledby="pMaking">
                        </div>
                      </div>
                      <label class="field"><span class="field__label">Stones & extras</span><span class="input-group"><span class="input-group__addon">Rs</span><input class="input" name="stone_value" type="number" min="0" step="100" inputmode="numeric" value="${p.stone_value || ''}" placeholder="0"></span></label>
                    </div>
                  </div>

                  <div data-mode="fixed">
                    <label class="field"><span class="field__label">Price</span><span class="input-group"><span class="input-group__addon">Rs</span><input class="input" name="fixed_price" type="number" min="0" step="100" inputmode="numeric" value="${p.fixed_price || ''}"></span></label>
                  </div>

                  <div data-breakdown></div>

                  <label class="check"><input type="checkbox" name="show_price" ${p.show_price ? 'checked' : ''}><span>Show the price on the website <small>Untick to show “Price on enquiry” instead</small></span></label>
                </div>
              </section>
            </div>

            <div class="stack">
              <section class="card" aria-labelledby="pVis">
                <header class="card__head"><h2 class="card__title" id="pVis">On the website</h2></header>
                <div class="card__body">
                  <label class="field"><span class="field__label">Status</span>
                    <select class="select" name="status">${ui.options([['published', 'Published — visible'], ['draft', 'Draft — hidden for now'], ['archived', 'Archived — sold or retired']], p.status)}</select></label>
                  <label class="switch"><input type="checkbox" name="featured" role="switch" ${p.featured_rank ? 'checked' : ''}><span class="switch__track" aria-hidden="true"></span><span>Show in homepage favourites${p.featured_rank ? html` <span class="muted">· position ${p.featured_rank}</span>` : ''}</span></label>
                </div>
              </section>

              <section class="card" aria-labelledby="pStock">
                <header class="card__head"><h2 class="card__title" id="pStock">Stock</h2></header>
                <div class="card__body">
                  ${editing ? html`
                    <dl class="facts facts--stock">
                      ${PJ.ctx.showrooms().map((s) => html`<div><dt>${s.name}</dt><dd>${Number(p.stock[s.id]) || 0}</dd></div>`)}
                    </dl>
                    <div class="btn-row">
                      <button class="btn btn--sm" type="button" data-act="adjust">Adjust stock</button>
                      ${PJ.ctx.showrooms().length > 1 ? html`<button class="btn btn--sm btn--ghost" type="button" data-act="transfer">${ui.icon('transfer')}<span>Move</span></button>` : ''}
                    </div>`
                  : html`
                    <div class="row row--2">
                      ${PJ.ctx.showrooms().map((s) => html`<label class="field"><span class="field__label">${s.name}</span><input class="input" name="stock_${s.id}" type="number" min="0" step="1" inputmode="numeric" value="0"></label>`)}
                    </div>`}
                  <label class="field"><span class="field__label">Warn me when total stock is at or below</span><input class="input input--narrow" name="low_stock_at" type="number" min="0" step="1" inputmode="numeric" value="${p.low_stock_at}"></label>
                </div>
              </section>

              ${editing ? html`
                <section class="card" aria-labelledby="pHist">
                  <header class="card__head"><h2 class="card__title" id="pHist">Recent stock changes</h2></header>
                  <div data-moves>${ui.loading()}</div>
                </section>` : ''}
            </div>
          </div>

          <p class="form-error" role="alert" hidden></p>
          <div class="savebar">
            ${editing ? html`<button class="btn btn--ghost btn--danger-text savebar__left" type="button" data-act="delete">${ui.icon('trash')}<span>Delete</span></button>` : ''}
            <a class="btn btn--ghost" href="#/products">Cancel</a>
            <button class="btn btn--primary" type="submit">${editing ? 'Save changes' : 'Add product'}</button>
          </div>
        </form>`);

      const form = $('form', el);
      const errEl = $('.form-error', el);
      const photosEl = $('[data-photos]', el);

      /* ---------- photos ---------- */
      function drawPhotos() {
        photosEl.innerHTML = String(html`
          ${images.map((img, i) => html`
            <figure class="photo ${i === 0 ? 'photo--main' : ''}">
              <img src="${PJ.safeUrl(img.url)}" alt="${i === 0 ? 'Main photo' : 'Photo ' + (i + 1)}" onerror="this.closest('.photo').classList.add('photo--broken')">
              ${i === 0 ? html`<span class="photo__tag">Main</span>` : ''}
              <div class="photo__actions">
                ${i > 0 ? html`<button class="btn btn--icon btn--sm" type="button" data-move="${i}" data-dir="-1" aria-label="Move photo ${i + 1} earlier">${ui.icon('arrow-left')}</button>` : ''}
                ${i > 0 ? html`<button class="btn btn--sm" type="button" data-main="${i}">Make main</button>` : ''}
                ${i < images.length - 1 ? html`<button class="btn btn--icon btn--sm" type="button" data-move="${i}" data-dir="1" aria-label="Move photo ${i + 1} later">${ui.icon('chevron-right')}</button>` : ''}
                <button class="btn btn--icon btn--sm btn--danger-text" type="button" data-remove-photo="${i}" aria-label="Remove photo ${i + 1}">${ui.icon('trash')}</button>
              </div>
            </figure>`)}
          ${Array.from({ length: uploading }, () => html`<div class="photo photo--uploading" role="status"><span class="spinner"></span><span>Uploading…</span></div>`)}`);
        photosEl.hidden = !images.length && !uploading;
      }

      async function addFiles(files) {
        const list = Array.from(files || []).filter((f) => /^image\//.test(f.type));
        if (!list.length) { ui.toast('Pick image files — JPG, PNG or WebP.', 'warn'); return; }
        const demo = PJ.api.mode === 'demo';
        for (const file of list) {
          uploading++;
          drawPhotos();
          try {
            const max = demo ? 900 : cfg.IMAGE_MAX_PX || 1600;
            const q = demo ? 0.8 : cfg.IMAGE_QUALITY || 0.85;
            const { blob, name } = await PJ.resizeImage(file, max, q);
            const res = await PJ.api.uploadImage(blob, name);
            images.push({ url: res.url, alt: '' });
          } catch (err) {
            ui.fail(err);
          } finally {
            uploading--;
            drawPhotos();
          }
        }
      }

      const fileInput = $('[data-file]', el);
      fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
      const drop = $('[data-drop]', el);
      ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
      drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

      on(el, 'click', '[data-move]', (e, btn) => {
        const i = Number(btn.dataset.move);
        const j = i + Number(btn.dataset.dir);
        [images[i], images[j]] = [images[j], images[i]];
        drawPhotos();
      });
      on(el, 'click', '[data-main]', (e, btn) => {
        const i = Number(btn.dataset.main);
        images.unshift(images.splice(i, 1)[0]);
        drawPhotos();
      });
      on(el, 'click', '[data-remove-photo]', (e, btn) => {
        images.splice(Number(btn.dataset.removePhoto), 1);
        drawPhotos();
      });
      on(el, 'click', '[data-act="url"]', async () => {
        const url = await ui.modal({
          title: 'Add a photo from a link',
          submitLabel: 'Add photo',
          body: html`<label class="field"><span class="field__label">Image address</span><input class="input" name="url" type="url" placeholder="https://…/necklace.jpg" required></label>
            <p class="field__hint">A direct link to a .jpg, .png or .webp file.</p>`,
          onSubmit(f) {
            const u = PJ.safeUrl(f.elements.url.value);
            if (!/^https?:\/\//i.test(u)) throw new Error('Paste a full link starting with https://');
            return u;
          }
        });
        if (url) { images.push({ url, alt: '' }); drawPhotos(); }
      });

      /* ---------- metal & pricing ---------- */
      function current() {
        const d = PJ.formData(form);
        return Object.assign({}, p, d, {
          karat: PJ.pricing.isGold(d.metal) ? Number(form.elements.karat.value) : null,
          pricing_mode: form.elements.pricing_mode.value || 'fixed'
        });
      }

      function syncPricing() {
        const metal = form.elements.metal.value;
        const isGold = PJ.pricing.isGold(metal);
        form.elements.karat.disabled = !isGold;
        const goldRadio = form.querySelector('input[name="pricing_mode"][value="gold_rate"]');
        goldRadio.disabled = !isGold;
        if (!isGold && goldRadio.checked) form.querySelector('input[name="pricing_mode"][value="fixed"]').checked = true;
        const mode = form.elements.pricing_mode.value;
        $$('[data-mode]', el).forEach((box) => { box.hidden = box.dataset.mode !== mode; });
        $('[data-breakdown]', el).innerHTML = String(breakdown(current()));
      }

      form.addEventListener('input', syncPricing);
      form.addEventListener('change', syncPricing);

      /* ---------- stock ---------- */
      async function drawMoves() {
        const box = $('[data-moves]', el);
        if (!box) return;
        try {
          const moves = await PJ.api.stock.movements({ product_id: p.id, limit: 6 });
          if (!el.isConnected) return;
          box.innerHTML = String(moves.length
            ? html`<ul class="mini-list mini-list--padded">${moves.map((m) => html`<li>
                <span>${PJ.MOVEMENT_REASONS[m.reason] || m.reason}<span class="cell-sub">${fmt.when(m.at)} · ${PJ.ctx.showroomName(m.showroom)}${m.order_number ? ' · ' + m.order_number : ''}</span></span>
                <span class="delta ${m.delta > 0 ? 'delta--up' : 'delta--down'}">${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}</span>
              </li>`)}</ul>`
            : html`<p class="card__body muted">No stock changes recorded yet.</p>`);
        } catch (err) { box.innerHTML = String(html`<p class="card__body muted">${err.message}</p>`); }
      }

      on(el, 'click', '[data-act="adjust"]', async () => { if (await ui.adjustStock(p, PJ.ctx.showrooms()[0].id)) ctx.refresh(); });
      on(el, 'click', '[data-act="transfer"]', async () => { if (await ui.transferStock(p)) ctx.refresh(); });

      on(el, 'click', '[data-act="delete"]', async () => {
        const ok = await ui.confirm({
          title: `Delete ${p.name}?`,
          message: 'This removes the piece and its photos from the admin and the website. To keep its sales history, set the status to Archived instead.',
          confirmLabel: 'Delete for good',
          danger: true
        });
        if (!ok) return;
        try {
          await PJ.api.products.remove(p.id);
          ui.toast(`${p.name} deleted`);
          location.hash = '#/products';
        } catch (err) { ui.fail(err); }
      });

      /* ---------- save ---------- */
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.hidden = true;
        if (uploading) { errEl.textContent = 'Wait for the photos to finish uploading.'; errEl.hidden = false; return; }
        const d = PJ.formData(form);
        const isGold = PJ.pricing.isGold(d.metal);
        const body = {
          name: d.name,
          sku: d.sku,
          category: d.category,
          badge: d.badge,
          description: d.description,
          metal: d.metal,
          karat: isGold ? Number(form.elements.karat.value) : null,
          weight_g: d.weight_g,
          stones: d.stones,
          pricing_mode: form.elements.pricing_mode.value || 'fixed',
          making_type: form.elements.making_type.value || 'percent',
          making_value: d.making_value || 0,
          stone_value: d.stone_value || 0,
          fixed_price: d.fixed_price || 0,
          show_price: d.show_price,
          images,
          low_stock_at: d.low_stock_at || 0,
          status: d.status,
          featured: d.featured
        };
        if (!editing) {
          body.stock = {};
          PJ.ctx.showrooms().forEach((s) => { body.stock[s.id] = d['stock_' + s.id] || 0; });
        }
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
          const saved = editing ? await PJ.api.products.update(p.id, body) : await PJ.api.products.create(body);
          ui.toast(editing ? 'Changes saved' : `${saved.name} added`);
          PJ.bus.emit('stock:changed');
          if (editing) ctx.refresh();
          else location.hash = '#/products/' + saved.id;
        } catch (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
          errEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } finally {
          btn.disabled = false;
        }
      });

      drawPhotos();
      syncPricing();
      drawMoves();
    }
  };
})();
