/* The home page: the Suba Mangala calculator and enrolment, order and repair tracking, this week's hours, the
   welcome, the hero's words drifting on scroll, and the counter photo warming to colour. What every page shares
   (header, menus, gold rate, reveals, entrance) is in site.js, which runs first and provides window.PJ. */
(function () {
  'use strict';
  var PJ = window.PJ, d = document;
  if (!PJ || !d.getElementById('hero')) return;
  var $ = PJ.$, $$ = PJ.$$, reduce = PJ.reduce, wa = PJ.wa, clamp = PJ.clamp, rs = PJ.rs, openWA = PJ.openWA;

  /* ---------- odometer: digits roll into place ---------- */
  var ODOS = [];
  function Odo(el) { this.el = el; this.cols = []; this.str = ''; this.wd = null; el.style.display = 'inline-flex'; el.style.alignItems = 'baseline'; this.measure(); this.set(el.textContent.trim(), true); ODOS.push(this); }
  Odo.prototype.measure = function () {
    var fs = parseFloat(getComputedStyle(this.el).fontSize) || 16, m = d.createElement('span');
    m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
    this.el.appendChild(m); this.wd = [];
    for (var k = 0; k < 10; k++) { m.textContent = String(k); this.wd.push(m.getBoundingClientRect().width / fs); }
    this.el.removeChild(m);
  };
  Odo.prototype.set = function (str, first) {
    var el = this.el, i;
    if (str.length !== this.str.length) {
      el.textContent = ''; this.cols = [];
      for (i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (/\d/.test(ch)) {
          var c = d.createElement('span'); c.style.cssText = 'display:inline-block;height:1.04em;overflow:hidden;vertical-align:baseline;transition:width 1.1s cubic-bezier(.2,.7,.2,1)';
          var s = d.createElement('span'); s.style.cssText = 'display:block;transition:transform 1.1s cubic-bezier(.2,.7,.2,1)';
          for (var k = 0; k < 10; k++) { var n = d.createElement('span'); n.style.cssText = 'display:block;height:1.04em;line-height:1.04em;text-align:center'; n.textContent = k; s.appendChild(n); }
          c.appendChild(s); el.appendChild(c); this.cols.push(s);
        } else { var p = d.createElement('span'); p.style.cssText = 'display:inline-block;line-height:1.04em'; p.textContent = ch; el.appendChild(p); this.cols.push(null); }
      }
      void el.offsetWidth;
    }
    for (i = 0; i < str.length; i++) {
      var col = this.cols[i]; if (!col) continue;
      col.style.transitionDelay = (reduce || first) ? '0ms' : (i * 60) + 'ms';
      col.style.transitionDuration = reduce ? '0s' : '';
      var dg = parseInt(str.charAt(i), 10);
      col.style.transform = 'translateY(' + (-dg * 10) + '%)';
      if (this.wd) col.parentNode.style.width = (this.wd[dg] + 0.02).toFixed(3) + 'em';
    }
    this.str = str;
  };

  var hero = $('#hero');

  /* ---------- Suba Mangala, as set out on the plan card ----------
     Monthly payments are converted into gold weight at each month's gold rate; the minimum scheme amount is Rs 10,000;
     after 6 or 12 months the customer buys any jewellery with the gold (wastage added to its weight); special gifts at the
     end. The weight shown here is only an illustration at today's 22K rate: the real weight is set by each month's rate.
     MIN_TOTAL is read as the least the whole plan may add up to, so a 6 month plan starts at Rs 2,000 a month and a 12
     month plan at Rs 1,000. Change the three numbers below if the plan changes. */
  var MIN_TOTAL = 10000, STEP = 1000, MAX_MONTHLY = 10000, gold = null;
  function minMonthly(mo) { return Math.max(STEP, Math.ceil(MIN_TOTAL / mo / STEP) * STEP); }
  function plan(mo, m) { var total = mo * m; return { total: total, grams: gold ? total / +gold.k22.gram : null }; }
  function g2(n) { return n.toFixed(2); }
  var amt = $('#amt'), coins = $('#coins'), gOdo = new Odo($('#c-grand')), months = 6;
  function lo() { return minMonthly(months); }
  function fillOf(m) { return ((m - lo()) / (MAX_MONTHLY - lo()) * 100) + '%'; }
  // the least a month may be depends on the plan's length
  function applyBounds() {
    amt.min = lo(); amt.max = MAX_MONTHLY;
    amt.value = clamp(+amt.value, lo(), MAX_MONTHLY);
    $('#t-min').textContent = 'Rs ' + rs(lo());
  }
  // the figures: with today's rate to hand the big figure is the gold weight and the total sits in the list; without it
  // the big figure is the total
  function renderNumbers() {
    var m = +amt.value, p = plan(months, m), known = p.grams !== null;
    amt.style.setProperty('--fill', fillOf(m));
    $('#amt-o').textContent = 'Rs ' + rs(m);
    $('#c-total').textContent = 'Rs ' + rs(p.total);
    $('#c-total-row').hidden = !known;
    $('#c-label').textContent = known ? 'Gold weight you could save' : 'You pay in total';
    $('#c-pre').textContent = known ? '≈' : 'Rs';
    $('#c-suf').hidden = !known;
    gOdo.set(known ? g2(p.grams) : rs(p.total));
    $('#coins-cap').textContent = months + ' monthly payments of Rs ' + rs(m) + ', then special gifts from Pushpa';
    $('#c-fine').textContent = 'Each month’s payment is converted into gold weight at that month’s gold rate' +
      (known ? ', so this is an illustration at today’s 22K rate of Rs ' + rs(Math.round(+gold.k22.gram)) + ' a gram (about ' + g2(p.grams / 8) + ' pawn), not a promise.' : '.');
    $('#c-live').textContent = months + ' months at Rs ' + rs(m) + ' a month: you pay Rs ' + rs(p.total) + ' in total' +
      (known ? ', about ' + g2(p.grams) + ' grams of gold at today’s rate' : '') + ', and special gifts at the end.';
  }
  function renderCalc(animate) {
    renderNumbers();
    var h = '';
    for (var i = 0; i < months; i++) h += '<span class="coin" style="--i:' + i + '">' + (i + 1) + '</span>';
    h += '<span class="plus">+</span><span class="coin gift" style="--i:' + (months + 1) + '"><svg class="fl"><use href="#flower"/></svg></span>';
    coins.innerHTML = h;
    coins.classList.toggle('m12', months === 12);
    var cs = $$('.coin', coins);
    if (reduce || !animate) cs.forEach(function (c) { c.style.transform = 'none'; c.style.opacity = 1; });
    else requestAnimationFrame(function () { cs.forEach(function (c) { c.classList.add('in'); }); });
  }
  var amtT;
  amt.addEventListener('input', function () { clearTimeout(amtT); var m = +amt.value; $('#amt-o').textContent = 'Rs ' + rs(m); amt.style.setProperty('--fill', fillOf(m)); amtT = setTimeout(function () { renderCalc(true); }, 120); });
  $('#amt-dn').addEventListener('click', function () { amt.value = clamp(+amt.value - STEP, lo(), MAX_MONTHLY); renderCalc(true); });
  $('#amt-up').addEventListener('click', function () { amt.value = clamp(+amt.value + STEP, lo(), MAX_MONTHLY); renderCalc(true); });
  $$('input[name="plan"]').forEach(function (r) { r.addEventListener('change', function () { months = +r.value; applyBounds(); renderCalc(true); }); });
  applyBounds();
  renderCalc(false);

  // the plan table: what each month adds up to over the plan, and the gold weight at today's rate once it is known
  function renderTables() {
    var html = '';
    [6, 12].forEach(function (mo) {
      html += '<table><caption>' + mo + ' month plan</caption><thead><tr><th scope="col">Monthly</th><th scope="col">You pay</th>' + (gold ? '<th scope="col">Gold today</th>' : '') + '</tr></thead><tbody>';
      for (var m = minMonthly(mo); m <= MAX_MONTHLY; m += STEP) { var p = plan(mo, m); html += '<tr><td>' + rs(m) + '</td><td>' + rs(p.total) + '</td>' + (gold ? '<td>' + g2(p.grams) + ' g</td>' : '') + '</tr>'; }
      html += '</tbody></table>';
    });
    $('#tables').innerHTML = html;
  }
  renderTables();
  PJ.onGold(function (g) { gold = g; renderNumbers(); renderTables(); });

  /* ---------- enrol: reserve a plan on WhatsApp; no NIC online ---------- */
  var enrol = $('#enrol'), eAm = $('#e-am'), ePl = $('#e-pl');
  // the amounts offered follow the plan's length, as in the calculator
  function fillAmounts(mo, keep) {
    eAm.innerHTML = '';
    for (var m = minMonthly(mo); m <= MAX_MONTHLY; m += STEP) { var o = d.createElement('option'); o.value = m; o.textContent = 'Rs ' + rs(m); eAm.appendChild(o); }
    if (keep >= minMonthly(mo)) eAm.value = String(keep);
  }
  fillAmounts(6, 5000);
  ePl.addEventListener('change', function () { fillAmounts(+ePl.value, +eAm.value); });
  $$('[data-enrol]').forEach(function (b) {
    b.addEventListener('click', function () {
      ePl.value = String(months); fillAmounts(months, +amt.value); $('#e-err').textContent = '';
      if (enrol.showModal) enrol.showModal(); else enrol.setAttribute('open', '');
      $('#e-nm').focus();
    });
  });
  $('#enrol-x').addEventListener('click', function () { enrol.close(); });
  enrol.addEventListener('click', function (e) { if (e.target === enrol) enrol.close(); });
  $('#eform').addEventListener('submit', function (e) {
    e.preventDefault();
    var nm = $('#e-nm').value.trim(), mb = $('#e-mb').value.trim();
    if (!nm || mb.replace(/\D/g, '').length < 9) { $('#e-err').textContent = !nm ? 'Please add your name.' : 'Please add a mobile number we can reach you on.'; (!nm ? $('#e-nm') : $('#e-mb')).focus(); return; }
    var mo = +ePl.value, mm = +eAm.value, p = plan(mo, mm);
    openWA(wa('I’d like to join the Suba Mangala plan. Name: ' + nm + '. Mobile: ' + mb + '. Plan: ' + mo + ' months at Rs ' + rs(mm) + ' a month (Rs ' + rs(p.total) + ' in total). Showroom: ' + $('#e-st').value + '.'));
    enrol.close();
  });

  /* ---------- track: the example timeline, and the request ---------- */
  var STEPS = {
    order: { cur: 1, s: [['Order placed', 'Design, karat and expected weight agreed.'], ['With the goldsmith', 'Your piece is being made.'], ['Quality check', 'We check the piece and its weight.'], ['Ready to collect', 'Collect it from your showroom.']] },
    repair: { cur: 2, s: [['Received', 'We note the piece and the work needed.'], ['Being repaired', 'With our goldsmith.'], ['Ready to collect', 'Bring your repair bill to the counter.'], ['Collected', 'Handed back to you.']] }
  };
  var tl = $('#tl'), tlBar = $('#tl-bar'), kind = 'order', tlSeen = false;
  function renderTL() {
    var k = STEPS[kind], h = '';
    k.s.forEach(function (st, i) {
      var cls = i < k.cur ? 'done' : i === k.cur ? 'cur' : '';
      h += '<li class="' + cls + '"><span class="dot" aria-hidden="true"><svg class="fl"><use href="#flower"/></svg></span><div><b>' + st[0] + '</b><span>' + st[1] + '</span></div></li>';
    });
    tl.innerHTML = h;
    tlBar.style.height = '0px';
    if (tlSeen) fillTL();
  }
  function fillTL() {
    var lis = $$('li', tl), cur = STEPS[kind].cur;
    var hgt = lis[cur].offsetTop - lis[0].offsetTop;
    requestAnimationFrame(function () { tlBar.style.height = Math.max(0, hgt) + 'px'; });
  }
  $$('input[name="kind"]').forEach(function (r) {
    r.addEventListener('change', function () { kind = r.value; $('#t-no-l').textContent = kind === 'order' ? 'Order number' : 'Repair bill number'; renderTL(); });
  });
  renderTL();
  $('#tform').addEventListener('submit', function (e) {
    e.preventDefault();
    var no = $('#t-no').value.trim(), ph = $('#t-ph').value.trim(), err = $('#t-err');
    if (!no) { err.textContent = 'Please enter your ' + (kind === 'order' ? 'order' : 'repair bill') + ' number.'; $('#t-no').focus(); return; }
    if (!/^\d{4}$/.test(ph)) { err.textContent = 'Please enter the last 4 digits of your mobile.'; $('#t-ph').focus(); return; }
    err.textContent = '';
    openWA(wa('please send me the status of my ' + (kind === 'order' ? 'order' : 'repair') + '. ' + (kind === 'order' ? 'Order' : 'Repair bill') + ' number: ' + no + '. Mobile ending ' + ph + '.'));
  });

  /* ---------- this week, in Sri Lanka time ---------- */
  (function () {
    var week = $('#week'), names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var now = new Date(), y, m, dd, wd, mins;
    try {
      var o = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).forEach(function (p) { o[p.type] = p.value; });
      y = +o.year; m = +o.month; dd = +o.day; wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday); mins = (+o.hour % 24) * 60 + +o.minute;
    } catch (e) { y = now.getFullYear(); m = now.getMonth() + 1; dd = now.getDate(); wd = now.getDay(); mins = now.getHours() * 60 + now.getMinutes(); }
    var start = Date.UTC(y, m - 1, dd - wd), html = '<div role="row" style="display:contents">';
    names.forEach(function (n, i) { html += '<div class="dh" role="columnheader"><abbr title="' + full[i] + '">' + n.toUpperCase() + '</abbr></div>'; });
    html += '</div><div role="row" style="display:contents">';
    for (var i = 0; i < 7; i++) {
      var dt = new Date(start + i * 864e5), sun = i === 0, close = sun ? 840 : 1170, today = i === wd;
      var state = today ? (mins >= 555 && mins < close ? 'Open now' : 'Today') : '';
      html += '<div class="day' + (sun ? ' sun' : '') + (today ? ' today' : '') + '" role="cell"' + (today ? ' data-state="' + state + '" aria-current="date"' : '') + '>' +
        '<span class="dn" aria-hidden="true">' + dt.getUTCDate() + '</span><span class="hr" aria-hidden="true">9.15 am<br>' + (sun ? '2.00 pm' : '7.30 pm') + '</span>' +
        '<span class="sr">' + full[i] + ' ' + dt.getUTCDate() + (today ? ', today, ' + state.toLowerCase() : '') + ', 9.15 am to ' + (sun ? '2.00 pm' : '7.30 pm') + '</span></div>';
    }
    week.innerHTML = html + '</div>';
  })();

  /* ---------- welcome ---------- */
  var hello = $$('.hello span'), hk = 0;
  hello[0].classList.add('lit');
  if (!reduce) setInterval(function () { hello[hk].classList.remove('lit'); hk = (hk + 1) % hello.length; hello[hk].classList.add('lit'); }, 2800);

  /* ---------- scroll: the counter photo warms from sepia to colour, and the hero's words drift away ---------- */
  var shopPh = $('#shop-ph'), ticking = false, hcopy = $('.hero .hcopy');
  function prog(el) { var r = el.getBoundingClientRect(), vh = window.innerHeight; return clamp((vh - r.top) / (vh + r.height), 0, 1); }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      shopPh.style.setProperty('--gs', reduce ? 0 : clamp(1 - (prog(shopPh) - 0.2) / 0.4, 0, 1).toFixed(3));
      // desktop: the hero's words drift up and fade a little as the page scrolls away from them
      var y = window.innerWidth > 820 && !reduce ? clamp(window.scrollY / hero.offsetHeight, 0, 1) : 0;
      hcopy.style.transform = y ? 'translate3d(0,' + (-y * 60).toFixed(1) + 'px,0)' : '';
      hcopy.style.opacity = y ? (1 - y * 0.6).toFixed(3) : '';
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { onScroll(); if (tlSeen) fillTL(); });
  onScroll();

  /* ---------- the calculator's coins and the timeline play when they come into view ---------- */
  var calcEl = $('.calc'), tlCard = $('.tl-card');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target; io.unobserve(t);
        if (t === calcEl) setTimeout(function () { renderCalc(true); }, 300);
        if (t === tlCard) { tlSeen = true; setTimeout(fillTL, 300); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(calcEl); io.observe(tlCard);
  } else { tlSeen = true; fillTL(); }

  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ODOS.forEach(function (o) { o.measure(); var s0 = o.str; o.str = ''; o.set(s0, true); }); });
})();
