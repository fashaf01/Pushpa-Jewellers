/* Sign in — and, on a live shop, the owner's first-time setup and
   invited staff creating their accounts */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html } = PJ;

  const field = (label, name, type, extra) => html`
    <label class="field"><span class="field__label">${label}</span>
      <input class="input" name="${name}" type="${type}" ${extra || ''} required></label>`;

  PJ.views.login = {
    public: true,
    title: 'Sign in',
    async render(el) {
      const demo = PJ.api.mode === 'demo';
      let mode = 'login';
      if (!demo) {
        try {
          const st = await PJ.api.auth.status();
          if (st && st.needs_setup) mode = 'setup';
        } catch (e) { /* the sign-in form will show the real error */ }
      }

      const draw = (message) => {
        const titles = { login: 'Sign in', setup: 'Set up the shop', register: 'Create your account' };
        el.innerHTML = String(html`
          <main class="login">
            <form class="login__card" novalidate>
              <div class="brand brand--lg">
                <span class="brand__mark">Pushpa</span>
                <span class="brand__sub">Jewellers · Shop admin</span>
              </div>
              <h1 class="login__title" tabindex="-1">${titles[mode]}</h1>
              ${demo ? html`<p class="notice notice--info">Demo mode — any email and password will do. Everything you change stays in this browser.</p>` : ''}
              ${mode === 'setup' ? html`<p class="notice notice--info">First time here. Create the owner account with the shop owner’s email. You can invite staff afterwards in Settings.</p>` : ''}
              ${mode === 'register' ? html`<p class="notice notice--info">Use the email the shop owner invited. Pick a password only you know.</p>` : ''}
              ${message ? html`<p class="notice notice--ok">${message}</p>` : ''}
              ${mode !== 'login' ? field('Your name', 'name', 'text', html`autocomplete="name"`) : ''}
              ${field('Email', 'email', 'email', demo ? html`autocomplete="username" value="owner@pushpa.lk"` : html`autocomplete="username"`)}
              ${field('Password', 'password', 'password', mode === 'login'
                ? html`autocomplete="current-password" ${demo ? html`value="demo"` : ''}`
                : html`autocomplete="new-password" minlength="8"`)}
              ${mode !== 'login' ? html`<p class="field__hint">At least 8 characters.</p>` : ''}
              <p class="form-error" role="alert" hidden></p>
              <button class="btn btn--primary btn--block" type="submit">${mode === 'login' ? 'Sign in' : 'Create account'}</button>
              ${!demo && mode === 'login' ? html`<button class="btn btn--ghost btn--block" type="button" data-mode="register">Invited by the shop? Create your account</button>` : ''}
              ${!demo && mode === 'register' ? html`<button class="btn btn--ghost btn--block" type="button" data-mode="login">I already have an account</button>` : ''}
            </form>
            <p class="login__foot">Forever trusted jewellers since 1967 · Negombo &amp; Katunayake</p>
          </main>`);

        const form = el.querySelector('form');
        const err = form.querySelector('.form-error');
        form.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          err.hidden = true;
          const d = PJ.formData(form);
          if (!d.email || !d.password || (mode !== 'login' && !d.name)) {
            err.textContent = mode === 'login' ? 'Enter your email and password.' : 'Fill in your name, email and a password.';
            err.hidden = false;
            return;
          }
          const btn = form.querySelector('[type="submit"]');
          const label = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Please wait…';
          try {
            const res = mode === 'setup' ? await PJ.api.auth.setup(d)
              : mode === 'register' ? await PJ.api.auth.register(d)
              : await PJ.api.auth.login(d.email, d.password);
            PJ.session.set(res.token, res.user);
            PJ.app.start();
          } catch (ex) {
            if (ex.status === 409 && mode === 'setup') { mode = 'login'; draw('The owner account already exists. Sign in.'); return; }
            err.textContent = ex.message;
            err.hidden = false;
            btn.disabled = false;
            btn.textContent = label;
          }
        });
        const first = form.querySelector('input');
        if (first && !first.value) first.focus();
      };

      draw();
    }
  };
})();
