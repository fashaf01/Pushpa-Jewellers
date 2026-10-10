/* Shared by every page: helpers, the header (services menu and phone menu), today's gold rate, copy buttons,
   the header shrinking and the WhatsApp button appearing on scroll, scroll reveals, and the entrance.
   Page scripts (main.js for the home page, shop.js for the shop) run after this and use window.PJ. */
(function () {
  'use strict';
  var d = document;
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = 'https://wa.me/94777770203?text=';
  function wa(t) { return WA + encodeURIComponent('Hello Pushpa Jewellers, ' + t); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rs(n) { return n.toLocaleString('en-US'); }
  var toast = $('#toast'), tt;
  function say(m) { toast.textContent = m; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('show'); }, 2200); }
  function openWA(url) { var w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url; }

  // callbacks for the entrance and for the gold rate, safe to register before or after either happens
  var isLoaded = false, onLoad = [], gold = null, onGold = [];
  window.PJ = {
    $: $, $$: $$, reduce: reduce, wa: wa, clamp: clamp, rs: rs, say: say, openWA: openWA,
    onLoaded: function (fn) { if (isLoaded) fn(); else onLoad.push(fn); },
    onGold: function (fn) { if (gold) fn(gold); onGold.push(fn); }
  };

  /* ---------- masthead, services menu, phone menu ---------- */
  var mast = $('#mast'), ddB = $('#dd-b'), ddM = $('#dd-m');
  ddB.addEventListener('click', function () { var o = ddM.hidden; ddM.hidden = !o; ddB.setAttribute('aria-expanded', String(o)); });
  d.addEventListener('click', function (e) { if (!e.target.closest('.dd')) { ddM.hidden = true; ddB.setAttribute('aria-expanded', 'false'); } });
  $$('a', ddM).forEach(function (a) { a.addEventListener('click', function () { ddM.hidden = true; ddB.setAttribute('aria-expanded', 'false'); }); });
  var menu = $('#menu');
  // focus the menu itself, not its close button, so opening it by touch draws no focus ring
  $('#burger').addEventListener('click', function () { if (menu.showModal) menu.showModal(); else menu.setAttribute('open', ''); menu.focus(); });
  $('#menu-x').addEventListener('click', function () { menu.close ? menu.close() : menu.removeAttribute('open'); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { if (menu.close) menu.close(); }); });

  /* ---------- today's gold rate (api/gold.js): 24K and 22K per pawn in the bar; tap for per gram too ---------- */
  var rateB = $('#rate'), rateD = $('#rate-d');
  function loadGold() {
    if (!window.fetch) return;
    fetch('/api/gold', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (g) {
      if (!g || !g.k24 || !g.k22) return;
      gold = g;
      $('#r24').textContent = rs(+g.k24.pawn);
      $('#r22').textContent = rs(+g.k22.pawn);
      rateB.hidden = false;
      $('#rate-fb').hidden = true;
      onGold.forEach(function (fn) { fn(g); });
    }).catch(function () {});
  }
  rateB.addEventListener('click', function () {
    if (!gold) return;
    var when = new Date(gold.updated), time = '';
    try { if (!isNaN(when)) time = when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' }); } catch (e) {}
    $('#rate-t').innerHTML = '<thead><tr><th scope="col">Purity</th><th scope="col">Per gram</th><th scope="col">Per pawn (8 g)</th></tr></thead><tbody>' +
      '<tr><th scope="row">24K</th><td>Rs ' + rs(+gold.k24.gram) + '</td><td>Rs ' + rs(+gold.k24.pawn) + '</td></tr>' +
      '<tr><th scope="row">22K</th><td>Rs ' + rs(+gold.k22.gram) + '</td><td>Rs ' + rs(+gold.k22.pawn) + '</td></tr></tbody>';
    $('#rate-note').innerHTML = (gold.source === 'showroom'
      ? '<p>Today’s rate at our counter.</p>'
      : '<p>The international gold market price, converted to rupees at today’s exchange rate and refreshed every hour. Our counter rate can differ, so call to confirm before you visit.</p>') +
      (time ? '<p class="tab">Updated ' + time + ', Sri Lanka time</p>' : '');
    if (rateD.showModal) rateD.showModal(); else rateD.setAttribute('open', '');
    rateD.focus();
  });
  $('#rate-x').addEventListener('click', function () { rateD.close(); });
  rateD.addEventListener('click', function (e) { if (e.target === rateD) rateD.close(); });
  loadGold();
  setInterval(loadGold, 30 * 60 * 1000);
  d.addEventListener('visibilitychange', function () { if (!d.hidden) loadGold(); });

  /* ---------- copy a phone number ---------- */
  $$('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      try { navigator.clipboard.writeText(v).then(function () { say('Copied ' + v); }, function () { say(v); }); } catch (e) { say(v); }
    });
  });

  /* ---------- scroll: the header shrinks, the WhatsApp button appears ---------- */
  var fab = $('#fab'), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      mast.classList.toggle('small', window.scrollY > 60);
      fab.classList.toggle('show', window.scrollY > window.innerHeight * .8);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- reveals ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.rv').forEach(function (el) { if (!el.closest('.hero')) io.observe(el); });
  } else $$('.rv').forEach(function (el) { el.classList.add('in'); });

  try { if (d.fonts && d.fonts.load) d.fonts.load('1em "the-seasons"').then(function (f) { if (f && f.length) d.documentElement.classList.add('has-seasons'); }, function () {}); } catch (e) {}

  /* ---------- entrance: after the flower has drawn, where a page has the intro ---------- */
  setTimeout(function () {
    d.body.classList.add('loaded');
    isLoaded = true;
    onLoad.forEach(function (fn) { fn(); });
  }, reduce || !$('.intro') ? 0 : 1900);
})();
