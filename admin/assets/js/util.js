/* Pushpa Jewellers admin — shared helpers: safe HTML, formatting, UI bits */
(function () {
  'use strict';

  const PJ = (window.PJ = window.PJ || {});
  PJ.views = PJ.views || {};

  /* ------------------------------------------------------------------
     Safe HTML templates
     html`<p>${name}</p>` escapes every interpolated value unless it is
     itself an html`` result, so data from the API can never inject markup.
     ------------------------------------------------------------------ */
  class Safe {
    constructor(s) { this.s = s; }
    toString() { return this.s; }
  }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  function piece(v) {
    if (v == null || v === false) return '';
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(piece).join('');
    return esc(v);
  }

  function html(strings, ...vals) {
    let out = strings[0];
    for (let i = 0; i < vals.length; i++) out += piece(vals[i]) + strings[i + 1];
    return new Safe(out);
  }
  html.raw = (s) => new Safe(String(s));

  /* Only let through URLs that are images or ordinary links */
  function safeUrl(u) {
    const s = String(u || '').trim();
    if (/^(https?:)?\/\//i.test(s) || /^data:image\/(png|jpe?g|webp|gif);/i.test(s) || /^blob:/i.test(s)) return s;
    if (/^[\w./-][\w./%?=&#-]*$/.test(s) && !/^javascript:/i.test(s)) return s;
    return '';
  }

  /* ------------------------------------------------------------------
     DOM
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* Delegated listener: on(view, 'click', '[data-act="save"]', fn) */
  function on(root, type, selector, fn) {
    root.addEventListener(type, (e) => {
      const target = e.target.closest(selector);
      if (target && root.contains(target)) fn(e, target);
    });
  }

  /* Tiny event bus so the sidebar can react to data changes */
  const listeners = {};
  PJ.bus = {
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); }
  };

  /* localStorage that never throws (private windows, blocked storage) */
  PJ.storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { window.localStorage.setItem(key, value); },
    remove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };

  /* ------------------------------------------------------------------
     Formatting — Sri Lankan rupees, en-GB dates
     ------------------------------------------------------------------ */
  const numFmt = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 });
  const dec2 = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 });
  const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const shortDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
  const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  function toDate(d) { return d instanceof Date ? d : new Date(d); }

  /* Local calendar date as YYYY-MM-DD (not UTC — a 1 am order in Colombo is still "today") */
  function isoDay(d = new Date()) {
    const x = toDate(d);
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${x.getFullYear()}-${m}-${day}`;
  }

  /* Parse YYYY-MM-DD as a local date (new Date('2026-11-07') would be UTC midnight) */
  function fromDay(s) {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const fmt = {
    num: (n) => (n == null || isNaN(n) ? '—' : numFmt.format(n)),
    money: (n) => (n == null || isNaN(n) ? '—' : 'Rs ' + numFmt.format(Math.round(n))),
    signedMoney: (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + 'Rs ' + numFmt.format(Math.abs(Math.round(n))),
    compact(n) {
      const a = Math.abs(n);
      if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
      return String(Math.round(n));
    },
    grams: (n) => (n == null || n === '' || isNaN(n) ? '—' : dec2.format(n) + ' g'),
    date: (d) => (d ? dayFmt.format(toDate(d)) : '—'),
    /* "12 Nov" this year, "12 Nov 2027" otherwise */
    dueDay: (s) => (s ? (fromDay(s).getFullYear() === new Date().getFullYear() ? shortDay.format(fromDay(s)) : dayFmt.format(fromDay(s))) : '—'),
    day: (s) => (s ? dayFmt.format(fromDay(s)) : '—'),
    shortDay: (d) => shortDay.format(toDate(d)),
    weekday: (d) => weekday.format(toDate(d)),
    time: (d) => timeFmt.format(toDate(d)).replace(' ', ' '),
    /* "Today, 3:15 pm" · "Yesterday, 11:02 am" · "4 Nov, 9:30 am" */
    when(d) {
      const x = toDate(d);
      const today = isoDay();
      const yest = isoDay(new Date(Date.now() - 864e5));
      const day = isoDay(x);
      const t = fmt.time(x);
      if (day === today) return 'Today, ' + t;
      if (day === yest) return 'Yesterday, ' + t;
      return shortDay.format(x) + ', ' + t;
    },
    plural: (n, one, many) => `${fmt.num(n)} ${n === 1 ? one : many || one + 's'}`,
    firstName: (name) => String(name || '').trim().split(/\s+/)[0] || ''
  };

  /* Sri Lankan mobile → WhatsApp international form: 0771234567 → 94771234567 */
  function waNumber(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('0') && d.length === 10) d = '94' + d.slice(1);
    if (d.length === 9 && d.startsWith('7')) d = '94' + d;
    return d.length >= 11 ? d : '';
  }

  function waLink(phone, text) {
    const n = waNumber(phone);
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : '';
  }

  const telLink = (phone) => 'tel:' + String(phone || '').replace(/[^\d+]/g, '');

  /* ------------------------------------------------------------------
     UI pieces
     ------------------------------------------------------------------ */
  const ui = {};

  ui.icon = (name, cls = '') => html`<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

  /* Product thumbnail — falls back to a quiet placeholder, never a broken image */
  ui.thumb = (images, size = 'md', alt = '') => {
    const url = safeUrl(images && images[0] && images[0].url);
    return url
      ? html`<span class="thumb thumb--${size}"><img src="${url}" alt="${alt}" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('thumb--empty');this.remove()"></span>`
      : html`<span class="thumb thumb--${size} thumb--empty" ${alt ? html`role="img" aria-label="${alt}"` : html`aria-hidden="true"`}></span>`;
  };

  ui.pageHead = ({ title, back, backLabel, meta, actions, eyebrow }) => html`
    <header class="page-head">
      <div class="page-head__text">
        ${back ? html`<a class="page-head__back" href="${back}">${ui.icon('arrow-left')}<span>${backLabel || 'Back'}</span></a>` : ''}
        ${eyebrow ? html`<p class="page-head__eyebrow">${eyebrow}</p>` : ''}
        <h1 class="page-head__title" tabindex="-1">${title}</h1>
        ${meta ? html`<p class="page-head__meta">${meta}</p>` : ''}
      </div>
      ${actions ? html`<div class="page-head__actions">${actions}</div>` : ''}
    </header>`;

  ui.empty = (title, body, action) => html`
    <div class="empty">
      <p class="empty__title">${title}</p>
      ${body ? html`<p class="empty__body">${body}</p>` : ''}
      ${action || ''}
    </div>`;

  ui.loading = (label = 'Loading') => html`<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span><span>${label}…</span></div>`;

  ui.errorState = (err) => html`
    <div class="empty empty--error" role="alert">
      <p class="empty__title">Something went wrong</p>
      <p class="empty__body">${(err && err.message) || String(err)}</p>
      <button class="btn" type="button" onclick="window.dispatchEvent(new HashChangeEvent('hashchange'))">Try again</button>
    </div>`;

  /* Toasts */
  ui.toast = (message, type = 'ok') => {
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = String(html`${ui.icon(type === 'ok' ? 'check' : 'alert')}<span>${message}</span>`);
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 300);
    }, type === 'ok' ? 3200 : 6000);
  };

  ui.fail = (err) => ui.toast((err && err.message) || 'Something went wrong.', 'error');

  /* ------------------------------------------------------------------
     Modal dialogs on the native <dialog> element (focus trap and Esc
     for free). The body is a form; onSubmit returns false to keep it open.
     ------------------------------------------------------------------ */
  ui.modal = ({ title, body, submitLabel = 'Save', cancelLabel = 'Cancel', danger = false, wide = false, onSubmit, onOpen }) =>
    new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'modal' + (wide ? ' modal--wide' : '');
      dlg.innerHTML = String(html`
        <form class="modal__form" novalidate>
          <header class="modal__head">
            <h2 class="modal__title">${title}</h2>
            <button class="btn btn--icon btn--ghost" type="button" data-close aria-label="Close">${ui.icon('x')}</button>
          </header>
          <div class="modal__body">${body}</div>
          <p class="form-error" role="alert" hidden></p>
          <footer class="modal__foot">
            <button class="btn btn--ghost" type="button" data-close>${cancelLabel}</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="submit">${submitLabel}</button>
          </footer>
        </form>`);
      document.body.appendChild(dlg);
      const form = dlg.querySelector('form');
      const errEl = dlg.querySelector('.form-error');
      let result = null;

      const close = () => dlg.close();
      dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
      dlg.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]') || e.target === dlg) close();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.hidden = true;
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
          const out = onSubmit ? await onSubmit(form) : true;
          if (out === false) return;
          result = out === undefined ? true : out;
          close();
        } catch (err) {
          errEl.textContent = err.message || String(err);
          errEl.hidden = false;
        } finally {
          btn.disabled = false;
        }
      });

      dlg.showModal();
      if (onOpen) onOpen(form);
      const first = form.querySelector('.modal__body input:not([type="hidden"]), .modal__body select, .modal__body textarea');
      if (first) first.focus();
    });

  ui.confirm = ({ title, message, confirmLabel = 'Confirm', danger = false }) =>
    ui.modal({
      title,
      body: html`<p>${message}</p>`,
      submitLabel: confirmLabel,
      danger
    }).then(Boolean);

  /* A validation error the form can show next to the right field */
  class FieldError extends Error {
    constructor(field, message) { super(message); this.field = field; }
  }

  /* Read a form into a plain object; numbers where the input is numeric */
  function formData(form) {
    const out = {};
    $$('input, select, textarea', form).forEach((el) => {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else if (el.type === 'number') out[el.name] = el.value === '' ? null : Number(el.value);
      else out[el.name] = el.value.trim();
    });
    return out;
  }

  /* ------------------------------------------------------------------
     Images — shrink in the browser before upload
     ------------------------------------------------------------------ */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`“${file.name}” could not be read as an image.`)); };
      img.src = url;
    });
  }

  async function resizeImage(file, maxPx, quality) {
    if (!/^image\//.test(file.type)) throw new Error(`“${file.name}” is not an image.`);
    const img = await loadImage(file);
    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; /* transparent PNGs get a white ground, as packshots do */
    g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return { blob, name, width: w, height: h };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function download(filename, text, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  Object.assign(PJ, {
    html, esc, safeUrl, $, $$, on, fmt, isoDay, fromDay, waNumber, waLink, telLink,
    ui, FieldError, formData, resizeImage, blobToDataUrl, download
  });
})();
