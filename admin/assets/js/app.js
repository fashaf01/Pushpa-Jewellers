/* Pushpa Jewellers admin — shell, navigation and routing */
(function () {
  'use strict';

  const PJ = window.PJ;
  const cfg = window.PJ_CONFIG || {};
  const { html, ui, $ } = PJ;

  /* Order matters: literal segments before :params */
  const ROUTES = [
    ['/', 'dashboard'],
    ['/login', 'login'],
    ['/orders', 'orders'],
    ['/orders/new', 'orderForm'],
    ['/orders/:id', 'order'],
    ['/orders/:id/edit', 'orderForm'],
    ['/products', 'products'],
    ['/products/new', 'product'],
    ['/products/:id', 'product'],
    ['/stock', 'stock'],
    ['/pricing', 'pricing'],
    ['/bestsellers', 'bestsellers'],
    ['/settings', 'settings']
  ];

  const NAV = [
    ['dashboard', '#/', 'Dashboard', 'grid'],
    ['orders', '#/orders', 'Orders', 'bag'],
    ['products', '#/products', 'Products', 'gem'],
    ['stock', '#/stock', 'Stock', 'boxes'],
    ['pricing', '#/pricing', 'Gold rate', 'trend'],
    ['bestsellers', '#/bestsellers', 'Best sellers', 'star'],
    ['settings', '#/settings', 'Settings', 'sliders']
  ];

  PJ.views.notFound = {
    title: 'Not found',
    render(el) {
      el.innerHTML = String(html`${ui.pageHead({ title: 'Page not found' })}${ui.empty('That page doesn’t exist', 'It may have been moved. Head back to the dashboard.', html`<a class="btn" href="#/">Dashboard</a>`)}`);
    }
  };

  function match(path) {
    const parts = path.split('/').filter(Boolean);
    for (const [pattern, name] of ROUTES) {
      const segs = pattern.split('/').filter(Boolean);
      if (segs.length !== parts.length) continue;
      const params = {};
      const ok = segs.every((s, i) => {
        if (s[0] === ':') { params[s.slice(1)] = decodeURIComponent(parts[i]); return true; }
        return s === parts[i];
      });
      if (ok) return { name, params };
    }
    return { name: 'notFound', params: {} };
  }

  function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, query] = raw.split('?');
    return { path, query: Object.fromEntries(new URLSearchParams(query || '')) };
  }

  const root = () => document.getElementById('app');
  let shell = null;
  let seq = 0;

  /* ------------------------------------------------------------------
     Shell
     ------------------------------------------------------------------ */
  function renderShell() {
    const user = PJ.session.user() || {};
    const demo = PJ.api.mode === 'demo';
    root().innerHTML = String(html`
      <div class="app">
        <aside class="sidebar" id="sidebar" aria-label="Main">
          <div class="sidebar__brand">
            <a class="brand" href="#/"><span class="brand__mark">Pushpa</span><span class="brand__sub">Jewellers · Admin</span></a>
            <button class="btn btn--icon btn--ghost sidebar__close" type="button" data-nav-close aria-label="Close menu">${ui.icon('x')}</button>
          </div>
          <nav class="nav">
            ${NAV.map(([key, href, label, icon]) => html`
              <a class="nav__item" href="${href}" data-nav="${key}">
                ${ui.icon(icon)}<span>${label}</span>
                ${key === 'orders' ? html`<span class="nav__badge" data-badge="orders" hidden></span>` : ''}
              </a>`)}
          </nav>
          <div class="sidebar__foot">
            <a class="rate-chip" href="#/pricing" data-rate-chip></a>
            <a class="nav__item nav__item--quiet" href="${cfg.SITE_URL || '../index.html'}" target="_blank" rel="noopener">${ui.icon('external')}<span>View website</span></a>
            <div class="whoami">
              <span class="whoami__avatar" aria-hidden="true">${(user.name || 'S').slice(0, 1)}</span>
              <span class="whoami__text"><strong>${user.name || 'Staff'}</strong><span>${demo ? 'Demo mode' : user.role || ''}</span></span>
              <button class="btn btn--icon btn--ghost" type="button" data-signout aria-label="Sign out" title="Sign out">${ui.icon('logout')}</button>
            </div>
          </div>
        </aside>
        <div class="scrim" data-nav-close></div>

        <div class="main">
          <header class="topbar">
            <button class="btn btn--icon btn--ghost" type="button" data-nav-open aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${ui.icon('menu')}</button>
            <a class="brand brand--sm" href="#/"><span class="brand__mark">Pushpa</span><span class="brand__sub">Admin</span></a>
            <a class="rate-chip rate-chip--top" href="#/pricing" data-rate-chip></a>
          </header>
          ${demo ? html`<div class="demo-bar">${ui.icon('alert')}<span><strong>Demo mode.</strong> Sample data, saved in this browser only. <a href="#/settings">How to go live</a></span></div>` : ''}
          <div class="view" id="view"></div>
        </div>
      </div>`);

    shell = root().querySelector('.app');
    shell.querySelector('[data-nav-open]').addEventListener('click', () => setNav(true));
    shell.addEventListener('click', (e) => {
      if (e.target.closest('[data-nav-close]') || (e.target.closest('.nav__item') && shell.classList.contains('is-nav-open'))) setNav(false);
      if (e.target.closest('[data-signout]')) signOut();
    });

    drawRateChip();
    refreshBadges();
  }

  /* Mobile drawer */
  function setNav(open) {
    if (!shell) return;
    const openBtn = shell.querySelector('[data-nav-open]');
    shell.classList.toggle('is-nav-open', open);
    document.body.classList.toggle('is-locked', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) shell.querySelector('.nav__item').focus();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shell && shell.classList.contains('is-nav-open')) {
      setNav(false);
      shell.querySelector('[data-nav-open]').focus();
    }
  });

  function setActiveNav(key) {
    if (!shell) return;
    shell.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function drawRateChip() {
    if (!shell) return;
    const r = PJ.ctx.rate;
    const fresh = r && r.date === PJ.isoDay();
    shell.querySelectorAll('[data-rate-chip]').forEach((chip) => {
      chip.classList.toggle('is-stale', !fresh);
      chip.innerHTML = String(r
        ? html`<span class="rate-chip__label">22kt / pawn</span><span class="rate-chip__value">${PJ.fmt.money(r.per_gram[22] * PJ.pricing.PAWN_G)}</span><span class="rate-chip__when">${fresh ? 'Today' : 'Not updated today'}</span>`
        : html`<span class="rate-chip__label">Gold rate</span><span class="rate-chip__value">Not set</span>`);
      chip.setAttribute('aria-label', r ? `22 karat gold rate ${PJ.fmt.money(r.per_gram[22] * 8)} per pawn, ${fresh ? 'updated today' : 'not updated today'}` : 'Gold rate not set');
    });
  }

  async function refreshBadges() {
    if (!shell) return;
    try {
      const fresh = await PJ.api.orders.list({ status: 'new' });
      const badge = shell.querySelector('[data-badge="orders"]');
      if (!badge) return;
      badge.textContent = fresh.length;
      badge.hidden = !fresh.length;
      badge.setAttribute('aria-label', `${fresh.length} new`);
    } catch (e) { /* the badge is a nicety */ }
  }

  PJ.bus.on('orders:changed', refreshBadges);
  PJ.bus.on('rates:changed', drawRateChip);
  PJ.bus.on('auth:expired', () => {
    shell = null;
    ui.toast('Your session ended. Please sign in again.', 'warn');
    showLogin();
  });

  /* ------------------------------------------------------------------
     Routing
     ------------------------------------------------------------------ */
  function showLogin() {
    shell = null;
    document.title = 'Sign in · Pushpa Jewellers admin';
    if (location.hash !== '#/login') history.replaceState(null, '', '#/login');
    PJ.views.login.render(root());
    const h = root().querySelector('h1');
    if (h) h.focus();
  }

  async function mount(name, params, focus) {
    const view = PJ.views[name];
    const host = document.getElementById('view');
    const token = seq;
    const el = document.createElement('div');
    el.className = 'page';
    host.replaceChildren(el);
    document.title = `${view.title} · Pushpa Jewellers admin`;
    setActiveNav(view.nav);

    const ctx = {
      params,
      query: parseHash().query,
      alive: () => token === seq
    };
    /* Re-run this screen in a fresh element after a change; `extra` reaches render */
    ctx.refresh = (extra) => {
      if (token !== seq) return;
      const next = document.createElement('div');
      next.className = 'page';
      host.replaceChildren(next);
      ctx.query = parseHash().query;
      Promise.resolve(view.render(next, ctx, extra)).catch((err) => fail(next, err));
    };

    try {
      await view.render(el, ctx);
      if (focus && token === seq) {
        const h = el.querySelector('h1');
        if (h) h.focus({ preventScroll: true });
      }
    } catch (err) {
      fail(el, err);
    }
  }

  function fail(el, err) {
    if (err && err.status === 401) return; /* handled by auth:expired */
    console.error(err);
    el.innerHTML = String(ui.errorState(err));
  }

  async function route() {
    seq++;
    const { path } = parseHash();
    const m = match(path);
    const signedIn = Boolean(PJ.session.token());

    if (!signedIn) { showLogin(); return; }
    if (m.name === 'login') { location.hash = '#/'; return; }
    if (!shell) { await start(); return; }

    window.scrollTo(0, 0);
    await mount(m.name, m.params, true);
  }

  async function loadContext() {
    const [settings, rates] = await Promise.all([PJ.api.settings.get(), PJ.api.rates.list({ limit: 1 })]);
    PJ.ctx.settings = settings;
    PJ.ctx.rate = rates[0] || null;
    drawRateChip();
  }

  async function start() {
    if (!PJ.session.token()) { showLogin(); return; }
    root().innerHTML = String(ui.loading('Opening the shop'));
    try {
      await loadContext();
    } catch (err) {
      if (err.status === 401) return;
      root().innerHTML = String(html`<div class="boot-error">${ui.errorState(err)}</div>`);
      return;
    }
    renderShell();
    if (/^#\/login/.test(location.hash) || !location.hash) history.replaceState(null, '', '#/');
    seq++;
    const { path } = parseHash();
    const m = match(path);
    await mount(m.name, m.params, true);
  }

  async function signOut() {
    await PJ.api.auth.logout();
    PJ.session.clear();
    shell = null;
    showLogin();
  }

  PJ.app = { start, loadContext, signOut };

  window.addEventListener('hashchange', route);
  PJ.bus.on('settings:changed', () => { if (shell) renderShell(); route(); });
  start();
})();
