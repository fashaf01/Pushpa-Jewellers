/* Settings — shop details, pricing defaults, connection, demo data */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html, ui, $, on } = PJ;

  PJ.views.settings = {
    nav: 'settings',
    title: 'Settings',
    async render(el, ctx) {
      el.innerHTML = String(ui.loading('Loading settings'));
      const s = await PJ.api.settings.get();
      if (!ctx.alive()) return;
      const demo = PJ.api.mode === 'demo';
      const me = PJ.session.user() || {};
      const owner = me.role === 'owner';

      el.innerHTML = String(html`
        ${ui.pageHead({ title: 'Settings' })}

        <div class="grid-2">
          <form class="stack" novalidate data-form>
            <section class="card" aria-labelledby="sShop">
              <header class="card__head"><h2 class="card__title" id="sShop">Showrooms</h2></header>
              <div class="card__body">
                <p class="field__hint">Used on orders, stock, and in the WhatsApp messages sent to customers.</p>
                ${s.showrooms.map((r) => html`
                  <fieldset class="fieldset">
                    <legend>${r.name}</legend>
                    <div class="row row--2">
                      <label class="field"><span class="field__label">Name</span><input class="input" name="room_${r.id}_name" value="${r.name}"></label>
                      <label class="field"><span class="field__label">Phone</span><input class="input" name="room_${r.id}_phone" value="${r.phone}" type="tel"></label>
                    </div>
                    <label class="field"><span class="field__label">Address</span><input class="input" name="room_${r.id}_address" value="${r.address}"></label>
                  </fieldset>`)}
              </div>
            </section>

            <section class="card" aria-labelledby="sDefaults">
              <header class="card__head"><h2 class="card__title" id="sDefaults">Pricing & stock defaults</h2></header>
              <div class="card__body">
                <div class="row row--3">
                  <label class="field"><span class="field__label">Round prices to</span>
                    <select class="select" name="price_rounding">${ui.options([[1, 'Rs 1'], [10, 'Rs 10'], [100, 'Rs 100'], [500, 'Rs 500'], [1000, 'Rs 1,000']], s.price_rounding)}</select></label>
                  <label class="field"><span class="field__label">Default making charge</span>
                    <span class="input-group"><input class="input" name="default_making_percent" type="number" min="0" step="0.5" value="${s.default_making_percent}"><span class="input-group__addon">%</span></span></label>
                  <label class="field"><span class="field__label">Default low-stock alert</span>
                    <input class="input" name="low_stock_default" type="number" min="0" step="1" value="${s.low_stock_default}"></label>
                </div>
                <label class="field"><span class="field__label">Homepage favourites to show</span>
                  <input class="input input--narrow" name="featured_limit" type="number" min="1" max="24" step="1" value="${s.featured_limit}"></label>
                <p class="field__hint">The website’s Favourites carousel is laid out for 8.</p>
              </div>
              <footer class="card__foot"><button class="btn btn--primary" type="submit">Save settings</button></footer>
            </section>
          </form>

          <div class="stack">
            <section class="card" aria-labelledby="sConn">
              <header class="card__head"><h2 class="card__title" id="sConn">Connection</h2>
                <span class="pill ${demo ? 'pill--in_making' : 'pill--ready'}">${demo ? 'Demo data' : 'Live'}</span></header>
              <div class="card__body prose">
                ${demo && PJ.sampleOnly ? html`
                  <p>This is the live shop’s address, but its <strong>database isn’t connected yet</strong>, so the panel is showing sample data kept in this browser.</p>
                  <p>Once the database is connected, this page asks for a sign-in and everything you enter is saved for the whole shop.</p>` : ''}
                ${demo && !PJ.sampleOnly ? html`
                  <p>The panel is running on <strong>demo data saved in this browser</strong>. Nothing is sent anywhere, and another computer will not see these changes.</p>
                  <p>To go live, set <code>API_BASE_URL</code> in <code>admin/assets/js/config.js</code> to the Hostinger API address — the endpoints are listed in <code>docs/API.md</code>.</p>`
                : html`
                  <p>Connected to the shop’s database. Everyone signed in sees the same pieces, orders, stock and gold rate, on any computer or phone.</p>
                  <button class="btn btn--sm" type="button" data-act="test">Test the connection</button>
                  <p class="field__hint" data-test-result role="status"></p>`}
              </div>
            </section>

            ${demo ? html`
              <section class="card" aria-labelledby="sData">
                <header class="card__head"><h2 class="card__title" id="sData">Demo data</h2></header>
                <div class="card__body prose">
                  <p>Download everything as a JSON file — handy for seeding the real database — or start again from the sample shop.</p>
                  <div class="btn-row">
                    <button class="btn btn--sm" type="button" data-act="export">${ui.icon('download')}<span>Download data</span></button>
                    <button class="btn btn--sm btn--ghost btn--danger-text" type="button" data-act="reset">Reset demo data</button>
                  </div>
                </div>
              </section>` : ''}

            <section class="card" aria-labelledby="sYou">
              <header class="card__head"><h2 class="card__title" id="sYou">${!demo && owner ? 'Staff' : 'Signed in'}</h2></header>
              <div class="card__body" data-staff>
                <p class="strong">${me.name || 'Staff'}</p>
                <p class="muted">${me.email || ''}</p>
              </div>
            </section>
          </div>
        </div>`);

      const form = $('[data-form]', el);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = PJ.formData(form);
        const body = {
          price_rounding: Number(d.price_rounding),
          default_making_percent: d.default_making_percent,
          low_stock_default: d.low_stock_default,
          featured_limit: d.featured_limit,
          showrooms: s.showrooms.map((r) => ({
            id: r.id,
            name: d[`room_${r.id}_name`],
            phone: d[`room_${r.id}_phone`],
            address: d[`room_${r.id}_address`]
          }))
        };
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
          PJ.ctx.settings = await PJ.api.settings.update(body);
          PJ.bus.emit('settings:changed');
          ui.toast('Settings saved');
        } catch (err) { ui.fail(err); } finally { btn.disabled = false; }
      });

      on(el, 'click', '[data-act="test"]', async () => {
        const out = $('[data-test-result]', el);
        out.textContent = 'Checking…';
        try {
          await PJ.api.health();
          out.textContent = 'The server answered. All good.';
        } catch (err) { out.textContent = err.message; }
      });

      /* ---------- staff (live shop, owner only) ---------- */
      async function drawStaff() {
        const box = $('[data-staff]', el);
        if (!box || demo || !owner) return;
        let list;
        try { list = await PJ.api.staff.list(); } catch (err) { box.innerHTML = String(html`<p class="muted">${err.message}</p>`); return; }
        if (!el.isConnected) return;
        box.innerHTML = String(html`
          <ul class="mini-list" style="margin-top:0">
            ${list.users.map((u) => html`<li>
              <span><strong>${u.name || u.email}</strong><span class="cell-sub">${u.email} · ${u.role === 'owner' ? 'Owner' : 'Staff'}</span></span>
              ${u.id === me.id ? html`<span class="muted small">You</span>` : html`<button class="btn btn--sm btn--ghost btn--danger-text" type="button" data-remove-user="${u.id}" data-name="${u.name || u.email}">Remove</button>`}
            </li>`)}
            ${list.invites.map((i) => html`<li>
              <span><strong>${i.name || i.email}</strong><span class="cell-sub">${i.email} · invited, not signed up yet</span></span>
              <button class="btn btn--sm btn--ghost" type="button" data-uninvite="${i.email}">Cancel invite</button>
            </li>`)}
          </ul>
          <form class="stack" data-invite style="gap:0;margin-top:1rem" novalidate>
            <div class="row row--2">
              <label class="field"><span class="field__label">Name</span><input class="input" name="name" autocomplete="off"></label>
              <label class="field"><span class="field__label">Email</span><input class="input" name="email" type="email" autocomplete="off"></label>
            </div>
            <label class="check" style="margin-bottom:0.75rem"><input type="checkbox" name="owner"><span>Owner — can also invite and remove staff</span></label>
            <div><button class="btn btn--sm" type="submit">Invite</button></div>
          </form>
          <p class="field__hint" style="margin-top:0.75rem">After inviting, send them the admin link. They choose “Invited by the shop? Create your account” and set their own password.</p>`);

        $('[data-invite]', box).addEventListener('submit', async (e) => {
          e.preventDefault();
          const d = PJ.formData(e.target);
          try {
            await PJ.api.staff.invite({ name: d.name, email: d.email, role: d.owner ? 'owner' : 'staff' });
            ui.toast(`${d.name || d.email} invited`);
            drawStaff();
          } catch (err) { ui.fail(err); }
        });
      }

      on(el, 'click', '[data-uninvite]', async (e, btn) => {
        try { await PJ.api.staff.uninvite(btn.dataset.uninvite); drawStaff(); } catch (err) { ui.fail(err); }
      });
      on(el, 'click', '[data-remove-user]', async (e, btn) => {
        const ok = await ui.confirm({ title: `Remove ${btn.dataset.name}?`, message: 'They will be signed out and can no longer open the admin. Their past orders and stock changes stay.', confirmLabel: 'Remove', danger: true });
        if (!ok) return;
        try { await PJ.api.staff.remove(btn.dataset.removeUser); ui.toast('Removed'); drawStaff(); } catch (err) { ui.fail(err); }
      });
      drawStaff();

      on(el, 'click', '[data-act="export"]', async () => {
        const data = await PJ.api.demo.exportAll();
        PJ.download(`pushpa-admin-data-${PJ.isoDay()}.json`, JSON.stringify(data, null, 2));
      });

      on(el, 'click', '[data-act="reset"]', async () => {
        const ok = await ui.confirm({
          title: 'Reset the demo data?',
          message: 'Every product, order, photo and rate you changed in this browser goes back to the sample shop.',
          confirmLabel: 'Reset',
          danger: true
        });
        if (!ok) return;
        await PJ.api.demo.reset();
        await PJ.app.loadContext();
        PJ.bus.emit('orders:changed');
        ui.toast('Demo data reset');
        location.hash = '#/';
      });
    }
  };
})();
