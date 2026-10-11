/* The shop: the collection grid, filtered by category and sorted by weight, and a page for each piece at
   ?piece=<slug>. Filters and sorting live in the address too (?cat=bangles&sort=light), so any view can be shared.
   The pieces come from pieces.js; the header, menus and gold rate from site.js.
   Motion: cards rise into place as they come into view; a piece's photos slide under the finger; and where the
   browser has view transitions, a card's photo grows into the piece's page and shrinks back into its card. */
(function () {
  'use strict';
  var PJ = window.PJ, d = document;
  // Pushpa's own pieces (Instagram) spread evenly through the others, so they are never bunched at the end
  function mix(own, rest) {
    var total = own.length + rest.length, slots = {}, out = [], k, pos;
    own.forEach(function (p, r) {
      pos = Math.floor((r + 0.5) * total / own.length);
      while (slots[pos]) pos++;
      slots[pos] = p;
    });
    for (k = 0, pos = 0; pos < total; pos++) out.push(slots[pos] || rest[k++]);
    return out;
  }
  var P = mix(window.PIECES_INSTAGRAM || [], window.PIECES || []);
  if (!PJ || !P.length || !d.getElementById('grid')) return;
  var $ = PJ.$, $$ = PJ.$$, rs = PJ.rs, wa = PJ.wa, reduce = PJ.reduce;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var IMG = '../assets/img/shop/', IG = 'https://www.instagram.com/pushpajewellers_official/p/';
  var CATS = [['all', 'All'], ['necklaces', 'Necklaces'], ['earrings', 'Earrings'], ['rings', 'Rings'], ['bracelets', 'Bracelets'], ['bangles', 'Bangles'], ['pendants', 'Pendants'], ['bridal', 'Bridal']];
  var CAT = {}; CATS.forEach(function (c) { CAT[c[0]] = c[1]; });
  var SORTS = { 'new': 1, light: 1, heavy: 1 };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pawn(g) { return (Math.round(g / 8 * 100) / 100).toFixed(2); }

  // weights as numbers: a set ('+') sorts by its total, a range ('–') by its lightest piece
  var BY = {};
  P.forEach(function (p, i) {
    p.i = i;
    p.grams = (p.weight.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    p.isSet = p.weight.indexOf('+') > -1;
    p.sortG = !p.grams.length ? null : p.isSet ? p.grams.reduce(function (a, b) { return a + b; }, 0) : p.grams[0];
    BY[p.slug] = p;
  });
  function weightText(p) { return p.weight ? esc(p.weight) + (p.note ? ' <small>(' + esc(p.note) + ')</small>' : '') : ''; }
  // in the piece page's capitals (Cinzel), keep the unit a lowercase g
  function unit(h) { return h.replace(/ g(?=$| |<)/g, ' <span class="u">g</span>'); }
  function pawnText(p) { return p.grams.length ? p.grams.map(pawn).join(p.isSet ? ' + ' : ' – ') : ''; }

  /* ---------- state, kept in the address ---------- */
  var grid = $('#grid'), gridView = $('#shop'), pieceView = $('#piece'), count = $('#count'), sortSel = $('#sort'), chips = $('#chips');
  var state = read();
  function read() {
    var q = new URLSearchParams(location.search), cat = q.get('cat'), sort = q.get('sort'), piece = q.get('piece');
    return { cat: CAT[cat] ? cat : 'all', sort: SORTS[sort] ? sort : 'new', piece: BY[piece] ? piece : null };
  }
  function href(s) {
    var q = new URLSearchParams();
    if (s.piece) q.set('piece', s.piece);
    else { if (s.cat !== 'all') q.set('cat', s.cat); if (s.sort !== 'new') q.set('sort', s.sort); }
    var str = q.toString();
    return str ? '?' + str : './';
  }

  /* ---------- the grid ---------- */
  function card(p) {
    var wt = p.weight ? '<i>' + weightText(p) + ' · ' + pawnText(p) + ' pawn</i>' : '';
    return '<li class="pc"><a href="?piece=' + p.slug + '" data-piece="' + p.slug + '">' +
      '<div class="ph"' + (p.photos > 1 ? ' data-alt="' + IMG + 'small/' + p.slug + '-2.webp"' : '') + '><img src="' + IMG + 'small/' + p.slug + '.webp" data-full="' + IMG + p.slug + '.webp" alt="' + esc(p.name) + '" width="540" height="675" loading="lazy" decoding="async"></div>' +
      '<b>' + esc(p.name) + '</b><span class="m">' + esc(p.kind) + '</span>' + wt + '</a></li>';
  }
  function list(cat, sort) {
    var out = P.filter(function (p) { return cat === 'all' || p.cats.indexOf(cat) > -1; });
    if (sort !== 'new') out.sort(function (a, b) {
      if (a.sortG === null || b.sortG === null) return (a.sortG === null) - (b.sortG === null) || a.i - b.i; // unweighed pieces last
      return sort === 'light' ? a.sortG - b.sortG : b.sortG - a.sortG;
    });
    return out;
  }
  sortSel.closest('.sort').hidden = !P.some(function (p) { return p.grams.length; });
  // a category with no pieces yet has no button
  CATS = CATS.filter(function (c) { return c[0] === 'all' || P.some(function (p) { return p.cats.indexOf(c[0]) > -1; }); });
  CATS.forEach(function (c) { CAT[c[0]] = c[1]; });
  chips.innerHTML = CATS.map(function (c) {
    var n = c[0] === 'all' ? P.length : P.filter(function (p) { return p.cats.indexOf(c[0]) > -1; }).length;
    return '<button type="button" class="chip" data-cat="' + c[0] + '" aria-pressed="false">' + c[1] + '<span>' + n + '</span></button>';
  }).join('');
  // cards rise into place as they come into view, a few at a time
  var cio = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    var k = 0;
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.style.setProperty('--c', Math.min(k++, 7));
      e.target.classList.add('in');
      cio.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -5% 0px' }) : null;
  function reveal(root, now) {
    $$('.pc', root).forEach(function (c) {
      if (now || !cio) c.classList.add('in', 'seen');
      else cio.observe(c);
    });
  }
  // on a desk, a card's second photo fades in under the pointer, fetched the first time the card is hovered
  if (fine) d.addEventListener('mouseover', function (e) {
    var a = e.target.closest && e.target.closest('.pc a'), ph = a && $('.ph[data-alt]', a);
    if (!ph || ph.hasAttribute('data-got')) return;
    ph.setAttribute('data-got', '');
    var im = new Image();
    im.className = 'alt pre'; im.alt = '';
    im.onload = function () { ph.appendChild(im); requestAnimationFrame(function () { requestAnimationFrame(function () { im.classList.remove('pre'); }); }); };
    im.src = ph.getAttribute('data-alt');
  });
  chips.querySelectorAll('.chip').forEach(function (c, i) { c.style.setProperty('--i', i); });
  function renderGrid(now) {
    var items = list(state.cat, state.sort);
    if (cio) $$('.pc', grid).forEach(function (c) { cio.unobserve(c); });
    grid.innerHTML = items.map(card).join('');
    reveal(grid, now);
    count.textContent = items.length + (items.length === 1 ? ' piece' : ' pieces') + (state.cat === 'all' ? '' : ' in ' + CAT[state.cat].toLowerCase());
    $$('.chip', chips).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === state.cat)); });
    sortSel.value = state.sort;
  }
  // a grid copy that is missing falls back to the full photo
  d.addEventListener('error', function (e) {
    var t = e.target;
    if (t.tagName === 'IMG' && t.dataset.full && t.src.indexOf('/small/') > -1) t.src = t.dataset.full;
  }, true);

  /* ---------- a piece: its photos slide under the finger, or turn with the arrows and the thumbs below ---------- */
  function photo(p, i, small) { return IMG + (small ? 'small/' : '') + p.slug + (i > 1 ? '-' + i : '') + '.webp'; }
  function gallery(p) {
    var n = p.photos || 1, sl = '', th = '';
    for (var i = 1; i <= n; i++) {
      sl += '<div class="pv-sl"><img src="' + photo(p, i) + '" alt="' + esc(p.name) + (i === 1 ? ', ' + esc(p.about) : ', photo ' + i + ' of ' + n) + '" width="1080" height="1350" decoding="async"></div>';
      th += '<button type="button" class="pv-th" data-photo="' + i + '" aria-pressed="' + (i === 1) + '" aria-label="Photo ' + i + ' of ' + n + '" style="--i:' + i + '"><img src="' + photo(p, i, true) + '" data-full="' + photo(p, i) + '" alt="" width="540" height="675"></button>';
    }
    return '<div class="pv-gal"><figure class="pv-ph">' +
      '<div class="pv-track" id="pv-track"' + (n > 1 ? ' tabindex="0" aria-label="Photos of the ' + esc(p.name) + ', ' + n + ' in all"' : '') + '>' + sl + '</div>' +
      (n > 1
        ? '<button type="button" class="pv-nav prev" data-step="-1" aria-label="Previous photo"><svg aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
          '<button type="button" class="pv-nav next" data-step="1" aria-label="Next photo"><svg aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
          '<span class="pv-count" aria-hidden="true"><b id="pv-n">1</b> / ' + n + '</span>'
        : '') +
      '</figure>' + (n > 1 ? '<div class="pv-ths">' + th + '</div>' : '') + '</div>';
  }
  /* The photos are one row that slides by position alone (a transform), not by scrolling, so it behaves the same on every
     phone. The row is set to touch-action: pan-y in the styles, so a finger on a photo always scrolls the page up and down.
     A drag that is clearly sideways moves the row with the finger; on release it settles on the next photo, the same one or
     the one before, by how far and how fast the finger went. Each photo glides a little slower than its frame. */
  var shown = 1, gal = null; // shown: the photo in view; gal: the open piece's row { t, n, w, x }
  function mark(i) {
    shown = i;
    var c = $('#pv-n');
    if (c) c.textContent = i;
    $$('.pv-th', pieceView).forEach(function (t) { t.setAttribute('aria-pressed', String(+t.getAttribute('data-photo') === i)); });
  }
  // x: the row's offset in px (0, or negative). The photos' glide (--f, --a) follows it, from the same x.
  function place(x, animate) {
    gal.x = x;
    gal.t.classList.toggle('glide', !!animate && !reduce);
    gal.t.style.transform = 'translate3d(' + x + 'px,0,0)';
    var at = -x / gal.w, sl = gal.t.children;
    for (var k = 0; k < sl.length; k++) {
      var f = Math.max(-1, Math.min(1, k - at));
      sl[k].style.setProperty('--f', f.toFixed(3));
      sl[k].style.setProperty('--a', Math.abs(f).toFixed(3));
    }
  }
  function show(i, noWrap) {
    if (!gal || gal.n < 2) return;
    if (noWrap && (i < 1 || i > gal.n)) return;
    i = (i - 1 + gal.n) % gal.n + 1;
    mark(i);
    place(-(i - 1) * gal.w, true);
  }
  function initGallery() {
    var t = $('#pv-track');
    shown = 1;
    gal = t ? { t: t, n: t.children.length, w: t.clientWidth || 1, x: 0 } : null;
    if (gal) place(0, false);
  }
  window.addEventListener('resize', function () {
    if (!gal || !gal.t.isConnected) return;
    gal.w = gal.t.clientWidth || 1;
    place(-(shown - 1) * gal.w, false);
  });
  // where the row is right now, even part-way through a glide, so a touch can take hold of it
  function rowX() {
    if (!gal.t.classList.contains('glide')) return gal.x;
    try { return new DOMMatrix(getComputedStyle(gal.t).transform).m41; } catch (err) { return gal.x; }
  }
  var tch = null;
  pieceView.addEventListener('touchstart', function (e) {
    var t = e.target.closest && e.target.closest('#pv-track');
    if (!gal || !t || gal.n < 2 || e.touches.length !== 1) { tch = null; return; }
    var c = e.touches[0], x = rowX();
    place(x, false);
    tch = { x: c.clientX, y: c.clientY, from: x, lock: null, lx: c.clientX, lt: e.timeStamp, vx: 0 };
  }, { passive: true });
  pieceView.addEventListener('touchmove', function (e) {
    if (!tch || !gal) return;
    var c = e.touches[0], dx = c.clientX - tch.x, dy = c.clientY - tch.y;
    if (!tch.lock) {
      // wait until the finger has gone far enough to tell; it is sideways only if clearly more sideways than up or down
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      tch.lock = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
    }
    if (tch.lock !== 'x') return;
    var min = -(gal.n - 1) * gal.w, x = tch.from + dx;
    if (x > 0) x *= 0.35; else if (x < min) x = min + (x - min) * 0.35; // a little give past the first and the last photo
    place(x, false);
    var dt = e.timeStamp - tch.lt;
    if (dt > 0) tch.vx = (c.clientX - tch.lx) / dt;
    tch.lx = c.clientX; tch.lt = e.timeStamp;
  }, { passive: true });
  function lift(e) {
    if (!tch) return;
    var d = tch; tch = null;
    if (!gal) return;
    // a touch that stopped a glide but then did not drag sideways (a tap, or a swipe up or down) lets the row finish its glide
    if (d.lock !== 'x') { if (Math.abs(gal.x + (shown - 1) * gal.w) > 1) place(-(shown - 1) * gal.w, true); return; }
    var c = e.changedTouches && e.changedTouches[0];
    // a cancelled touch has no finger position of its own, so use the last one seen
    var endX = e.type === 'touchcancel' || !c ? d.lx : c.clientX;
    if (e.type === 'touchcancel' || e.timeStamp - d.lt > 80) d.vx = 0; // a finger that paused before lifting is not a flick
    var dx = endX - d.x, start = Math.round(-d.from / gal.w);
    var far = Math.abs(dx) > gal.w * 0.18 || Math.abs(d.vx) > 0.35;
    show(Math.max(0, Math.min(gal.n - 1, start + (far ? (dx < 0 ? 1 : -1) : 0))) + 1);
  }
  pieceView.addEventListener('touchend', lift, { passive: true });
  pieceView.addEventListener('touchcancel', lift, { passive: true });
  // on a desk: the arrows and thumbs below, the arrow keys, and a sideways swipe on a trackpad
  pieceView.addEventListener('click', function (e) {
    var b = e.target.closest('.pv-th, .pv-nav');
    if (b) show(b.classList.contains('pv-nav') ? shown + +b.getAttribute('data-step') : +b.getAttribute('data-photo'));
  });
  pieceView.addEventListener('keydown', function (e) {
    if (!gal || !e.target.closest || !e.target.closest('#pv-track')) return;
    if (e.key === 'ArrowLeft') { show(shown - 1, true); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { show(shown + 1, true); e.preventDefault(); }
  });
  var wheeled = 0;
  pieceView.addEventListener('wheel', function (e) {
    if (!gal || gal.n < 2 || !e.target.closest('#pv-track')) return;
    if (Math.abs(e.deltaX) < 8 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
    e.preventDefault();
    if (e.timeStamp - wheeled < 450) return;
    wheeled = e.timeStamp;
    show(shown + (e.deltaX > 0 ? 1 : -1), true);
  }, { passive: false });
  // on a desk, the photo under the pointer is seen closer, and follows the pointer
  if (fine && !reduce) {
    pieceView.addEventListener('mousemove', function (e) {
      var t = e.target.closest('.pv-track');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      t.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      t.classList.add('zoom');
    });
    pieceView.addEventListener('mouseout', function (e) {
      var t = e.target.closest('.pv-track');
      if (t && !t.contains(e.relatedTarget)) t.classList.remove('zoom');
    });
  }
  function renderPiece(p) {
    var cat = p.cats[0], more = list(cat, 'new').filter(function (q) { return q !== p; }).slice(0, 4);
    var ask = wa('I’d like to ask about the ' + p.name + (p.weight ? ' (' + p.weight + ')' : '') + ' I saw on your website.');
    pieceView.innerHTML =
      '<div class="wrap">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="../">Home</a><span aria-hidden="true">/</span><a href="./" data-cat="all">The collection</a><span aria-hidden="true">/</span><a href="?cat=' + cat + '" data-cat="' + cat + '">' + CAT[cat] + '</a></nav>' +
        '<div class="pv">' +
          gallery(p) +
          '<div class="pv-c">' +
            '<span class="label"><svg class="fl" aria-hidden="true"><use href="#flower"/></svg>' + esc(p.kind) + '</span>' +
            '<h1 class="pv-h">' + esc(p.name) + '</h1>' +
            (p.weight
              ? '<dl class="pv-wt"><div><dt>Weight</dt><dd>' + unit(weightText(p)) + '</dd></div><div><dt>In pawn</dt><dd>' + pawnText(p) + '</dd></div></dl>'
              : '<p class="pv-wt none">We will confirm the weight of this piece when you ask.</p>') +
            '<p class="pv-d">' + esc(p.about) + '</p>' +
            '<p class="pv-price">Gold is priced by its weight at the day’s rate, so the price of a piece moves with the market. Ask us for today’s price and we will reply on WhatsApp.<span id="pv-rate"></span></p>' +
            '<div class="pv-ctas">' +
              '<a class="btn" href="' + ask + '" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-wa"/></svg>Ask about this piece</a>' +
              '<a class="btn ghost" href="tel:+94312238822"><svg aria-hidden="true"><use href="#i-call"/></svg>031 223 8822</a>' +
            '</div>' +
            (p.ig ? '<a class="alink" href="' + IG + p.ig + '/" target="_blank" rel="noopener">See it on Instagram <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>' : '') +
          '</div>' +
        '</div>' +
        (more.length ? '<section class="pv-more" aria-labelledby="more-h"><h2 class="h2" id="more-h">More ' + CAT[cat].toLowerCase() + '</h2><ul class="grid">' + more.map(card).join('') + '</ul></section>' : '') +
      '</div>';
    initGallery();
    reveal(pieceView);
    showRate();
  }
  var gold = null;
  function showRate() {
    var el = $('#pv-rate');
    if (el && gold) el.innerHTML = ' Gold today: 22K <b>Rs ' + rs(+gold.k22.pawn) + '</b> a pawn, the market rate.';
  }
  PJ.onGold(function (g) { gold = g; showRate(); });

  /* ---------- show the view the address asks for ---------- */
  // where the browser can, the photo grows out of its card into the piece's page and back (a view transition)
  // not on touch screens: a phone does not need a page transition standing between a tap and the next scroll
  var vt = !!d.startViewTransition && !reduce && fine;
  function morph(from, update, to) {
    if (!vt || !from) { update(); return; }
    from.style.viewTransitionName = 'pj-photo';
    var end;
    d.startViewTransition(function () {
      from.style.viewTransitionName = '';
      update();
      end = to && to();
      if (end) end.style.viewTransitionName = 'pj-photo';
    }).finished.then(function () { if (end) end.style.viewTransitionName = ''; }, function () { if (end) end.style.viewTransitionName = ''; });
  }
  function cardPhoto(slug, root) { return slug ? $('a[data-piece="' + slug + '"] .ph', root) : null; }
  function piecePhoto() { return $('.pv-ph', pieceView); }
  // jump, not glide: the page underneath has just been replaced
  // The page glides to anchors by default (html { scroll-behavior: smooth }), and a glide ignores the user's finger until it is
  // done, so the jump to the top switches gliding off first, and reads the style back so the browser applies that before the jump.
  function jump(y) {
    var h = d.documentElement, was = h.style.scrollBehavior;
    h.style.scrollBehavior = 'auto';
    void getComputedStyle(h).scrollBehavior;
    window.scrollTo(0, y);
    h.style.scrollBehavior = was;
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var gridY = 0;
  function render(fromNav) {
    var p = state.piece && BY[state.piece];
    gridView.hidden = !!p; pieceView.hidden = !p;
    if (p) { renderPiece(p); d.title = p.name + ' · Pushpa Jewellers'; if (fromNav) jump(0); }
    else { renderGrid(fromNav === 'back'); d.title = (state.cat === 'all' ? 'The collection' : CAT[state.cat]) + ' · Pushpa Jewellers'; if (fromNav === 'back') jump(gridY); }
  }
  function go(next, push, from) {
    if (next.piece && !state.piece) gridY = window.scrollY;
    morph(from, function () {
      state = next;
      history[push ? 'pushState' : 'replaceState'](null, '', href(state));
      render(true);
    }, piecePhoto);
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[data-piece], a[data-cat], .chip');
    if (!a) return;
    e.preventDefault();
    if (a.hasAttribute('data-piece')) go({ cat: state.cat, sort: state.sort, piece: a.getAttribute('data-piece') }, true, $('.ph', a));
    else {
      // a category: from a piece's breadcrumb it is a new page, from the chips it only refilters
      var was = state.piece;
      morph(was && piecePhoto(), function () {
        state = { cat: a.getAttribute('data-cat'), sort: state.sort, piece: null };
        history[was ? 'pushState' : 'replaceState'](null, '', href(state));
        render(false);
        if (was) jump(0);
      }, function () { return cardPhoto(was, grid); });
    }
  });
  sortSel.addEventListener('change', function () { go({ cat: state.cat, sort: sortSel.value, piece: null }, false); });
  window.addEventListener('popstate', function (e) {
    var was = state.piece, next = read();
    // a browser that animated the swipe back itself has already shown the change
    var from = e.hasUAVisualTransition ? null : was ? piecePhoto() : cardPhoto(next.piece, grid);
    morph(from, function () {
      state = next;
      render(was && !state.piece ? 'back' : true);
    }, function () { return state.piece ? piecePhoto() : cardPhoto(was, grid); });
  });
  render(false);
})();
