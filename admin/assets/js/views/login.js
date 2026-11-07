/* Sign in */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html } = PJ;

  PJ.views.login = {
    public: true,
    title: 'Sign in',
    render(el) {
      const demo = PJ.api.mode === 'demo';
      el.innerHTML = String(html`
        <main class="login">
          <form class="login__card" novalidate>
            <div class="brand brand--lg">
              <span class="brand__mark">Pushpa</span>
              <span class="brand__sub">Jewellers · Shop admin</span>
            </div>
            <h1 class="login__title" tabindex="-1">Sign in</h1>
            ${demo
              ? html`<p class="notice notice--info">Demo mode — any email and password will do. Everything you change stays in this browser.</p>`
              : ''}
            <label class="field"><span class="field__label">Email</span>
              <input class="input" name="email" type="email" autocomplete="username" required ${demo ? html`value="owner@pushpa.lk"` : ''}></label>
            <label class="field"><span class="field__label">Password</span>
              <input class="input" name="password" type="password" autocomplete="current-password" required ${demo ? html`value="demo"` : ''}></label>
            <p class="form-error" role="alert" hidden></p>
            <button class="btn btn--primary btn--block" type="submit">Sign in</button>
          </form>
          <p class="login__foot">Forever trusted jewellers since 1967 · Negombo &amp; Katunayake</p>
        </main>`);

      const form = el.querySelector('form');
      const err = form.querySelector('.form-error');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.hidden = true;
        const { email, password } = PJ.formData(form);
        if (!email || !password) {
          err.textContent = 'Enter your email and password.';
          err.hidden = false;
          return;
        }
        const btn = form.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Signing in…';
        try {
          const res = await PJ.api.auth.login(email, password);
          PJ.session.set(res.token, res.user);
          PJ.app.start();
        } catch (ex) {
          err.textContent = ex.message;
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = 'Sign in';
        }
      });
    }
  };
})();
