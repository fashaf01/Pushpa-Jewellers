/* The home page: the hero's turn from 1967 to today, the Suba Mangala calculator and enrolment, order and repair
   tracking, this week's hours, the welcome, and the counter photo warming to colour. What every page shares
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

  /* ---------- hero: opens on Pushpa in 1967, then turns to today; the switch moves between them ---------- */
  var hero = $('#hero'), eraLive = $('#era-live'), thenC = $('#then-c'), nowC = $('#now-c'), eraBtns = $$('[data-era]', hero), firstT = [];
  function setEra(then, quiet) {
    hero.classList.toggle('is-then', then);
    eraBtns.forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-era') === 'then') === then)); });
    thenC.setAttribute('aria-hidden', String(!then)); nowC.setAttribute('aria-hidden', String(then));
    if (!quiet) eraLive.textContent = then ? 'Showing Pushpa in 1967.' : 'Showing Pushpa today.';
  }
  function endFirst() { firstT.forEach(clearTimeout); firstT = []; hero.classList.remove('is-first'); }
  eraBtns.forEach(function (b) {
    b.addEventListener('click', function () { var then = b.getAttribute('data-era') === 'then'; endFirst(); if (then !== hero.classList.contains('is-then')) setEra(then); });
  });
  // start on 1967 without animating into it (the flower loader covers this moment)
  if (!reduce) { hero.classList.add('still'); setEra(true, true); void hero.offsetWidth; requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.remove('still'); }); }); }
  function playFirst() {
    if (reduce || !hero.classList.contains('is-then')) return;
    hero.classList.add('is-first');
    firstT.push(setTimeout(function () { setEra(false, true); }, 2400));
    firstT.push(setTimeout(function () { hero.classList.remove('is-first'); }, 3400));
  }

  /* ---------- Suba Mangala: 6 months, gift = half an instalment; 12 months, gift = one instalment ---------- */
  function plan(months, m) { var total = months * m, gift = months === 6 ? m / 2 : m; return { total: total, gift: gift, grand: total + gift }; }
  var amt = $('#amt'), coins = $('#coins'), gOdo = new Odo($('#c-grand')), months = 6;
  function renderCalc(animate) {
    var m = +amt.value, p = plan(months, m);
    amt.style.setProperty('--fill', ((m - 1000) / 9000 * 100) + '%');
    $('#amt-o').textContent = 'Rs ' + rs(m);
    $('#c-total').textContent = 'Rs ' + rs(p.total);
    $('#c-gift').textContent = '+ Rs ' + rs(p.gift);
    gOdo.set(rs(p.grand));
    $('#coins-cap').textContent = months + ' monthly instalments of Rs ' + rs(m) + ', then a gift from Pushpa';
    $('#c-live').textContent = months + ' months at Rs ' + rs(m) + ': you pay Rs ' + rs(p.total) + ', gift Rs ' + rs(p.gift) + ', gold you can buy Rs ' + rs(p.grand) + '.';
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
  amt.addEventListener('input', function () { clearTimeout(amtT); var m = +amt.value; $('#amt-o').textContent = 'Rs ' + rs(m); amt.style.setProperty('--fill', ((m - 1000) / 9000 * 100) + '%'); amtT = setTimeout(function () { renderCalc(true); }, 120); });
  $('#amt-dn').addEventListener('click', function () { amt.value = clamp(+amt.value - 1000, 1000, 10000); renderCalc(true); });
  $('#amt-up').addEventListener('click', function () { amt.value = clamp(+amt.value + 1000, 1000, 10000); renderCalc(true); });
  $$('input[name="plan"]').forEach(function (r) { r.addEventListener('change', function () { months = +r.value; renderCalc(true); }); });
  renderCalc(false);

  // the leaflet's two tables, generated from the same rule
  (function () {
    var html = '';
    [6, 12].forEach(function (mo) {
      html += '<table><caption>' + mo + ' month plan</caption><thead><tr><th scope="col">Monthly</th><th scope="col">Total</th><th scope="col">Gift</th><th scope="col">You can buy</th></tr></thead><tbody>';
      for (var m = 1000; m <= 10000; m += 1000) { var p = plan(mo, m); html += '<tr><td>' + rs(m) + '</td><td>' + rs(p.total) + '</td><td>' + rs(p.gift) + '</td><td>' + rs(p.grand) + '</td></tr>'; }
      html += '</tbody></table>';
    });
    $('#tables').innerHTML = html;
  })();

  /* ---------- enrol: reserve a plan on WhatsApp; no NIC online ---------- */
  var enrol = $('#enrol'), eAm = $('#e-am');
  for (var m = 1000; m <= 10000; m += 1000) { var o = d.createElement('option'); o.value = m; o.textContent = 'Rs ' + rs(m); eAm.appendChild(o); }
  $$('[data-enrol]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('#e-pl').value = String(months); eAm.value = amt.value; $('#e-err').textContent = '';
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
    var mo = +$('#e-pl').value, mm = +eAm.value, p = plan(mo, mm);
    openWA(wa('I’d like to join the Suba Mangala plan. Name: ' + nm + '. Mobile: ' + mb + '. Plan: ' + mo + ' months at Rs ' + rs(mm) + ' a month (gold value Rs ' + rs(p.grand) + '). Showroom: ' + $('#e-st').value + '.'));
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

  /* ---------- scroll: the counter photo warms from sepia to colour ---------- */
  var shopPh = $('#shop-ph'), ticking = false;
  function prog(el) { var r = el.getBoundingClientRect(), vh = window.innerHeight; return clamp((vh - r.top) / (vh + r.height), 0, 1); }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      shopPh.style.setProperty('--gs', reduce ? 0 : clamp(1 - (prog(shopPh) - 0.2) / 0.4, 0, 1).toFixed(3));
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

  /* ---------- entrance: once the flower has drawn, 1967 holds, then turns to today ---------- */
  PJ.onLoaded(playFirst);
})();
