/* The shop: the collection grid, filtered by category and sorted by weight, and a page for each piece at
   ?piece=<slug>. Filters and sorting live in the address too (?cat=bangles&sort=light), so any view can be shared.
   The pieces come from pieces.js; the header, menus and gold rate from site.js. */
(function () {
  'use strict';
  var PJ = window.PJ, P = window.PIECES, d = document;
  if (!PJ || !P || !d.getElementById('grid')) return;
  var $ = PJ.$, $$ = PJ.$$, rs = PJ.rs, wa = PJ.wa;
  var IMG = '../assets/img/shop/', IG = 'https://www.instagram.com/pushpajewellers_official/p/';
  var CATS = [['all', 'All'], ['necklaces', 'Necklaces'], ['bangles', 'Bangles'], ['rings', 'Rings'], ['pendants', 'Pendants'], ['bracelets', 'Bracelets'], ['bridal', 'Bridal']];
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
      '<div class="ph"><img src="' + IMG + 'small/' + p.slug + '.webp" data-full="' + IMG + p.slug + '.webp" alt="' + esc(p.name) + '" width="540" height="675" loading="lazy" decoding="async"></div>' +
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
  chips.innerHTML = CATS.map(function (c) {
    var n = c[0] === 'all' ? P.length : P.filter(function (p) { return p.cats.indexOf(c[0]) > -1; }).length;
    return '<button type="button" class="chip" data-cat="' + c[0] + '" aria-pressed="false">' + c[1] + '<span>' + n + '</span></button>';
  }).join('');
  function renderGrid() {
    var items = list(state.cat, state.sort);
    grid.innerHTML = items.map(card).join('');
    count.textContent = items.length + (items.length === 1 ? ' piece' : ' pieces') + (state.cat === 'all' ? '' : ' in ' + CAT[state.cat].toLowerCase());
    $$('.chip', chips).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === state.cat)); });
    sortSel.value = state.sort;
  }
  // a grid copy that is missing falls back to the full photo
  d.addEventListener('error', function (e) {
    var t = e.target;
    if (t.tagName === 'IMG' && t.dataset.full && t.src.indexOf('/small/') > -1) t.src = t.dataset.full;
  }, true);

  /* ---------- a piece ---------- */
  function photo(p, i, small) { return IMG + (small ? 'small/' : '') + p.slug + (i > 1 ? '-' + i : '') + '.webp'; }
  function thumbs(p) {
    var n = p.photos || 1, h = '';
    if (n < 2) return '';
    for (var i = 1; i <= n; i++) h += '<button type="button" class="pv-th" data-photo="' + i + '" aria-pressed="' + (i === 1) + '" aria-label="Photo ' + i + ' of ' + n + '"><img src="' + photo(p, i, true) + '" data-full="' + photo(p, i) + '" alt="" width="540" height="675"></button>';
    return '<div class="pv-ths">' + h + '</div>';
  }
  var shown = 1;
  function show(i) {
    var p = state.piece && BY[state.piece], n = p ? p.photos || 1 : 1;
    if (n < 2) return;
    shown = (i - 1 + n) % n + 1;
    $('#pv-img').src = photo(p, shown);
    $$('.pv-th', pieceView).forEach(function (t) { t.setAttribute('aria-pressed', String(+t.getAttribute('data-photo') === shown)); });
  }
  pieceView.addEventListener('click', function (e) {
    var b = e.target.closest('.pv-th');
    if (b) show(+b.getAttribute('data-photo'));
  });
  // on phones, a sideways swipe across the photo turns to the next or previous one
  var x0 = null, y0 = 0;
  pieceView.addEventListener('touchstart', function (e) {
    x0 = e.touches.length === 1 && e.target.closest('.pv-ph') ? e.touches[0].clientX : null;
    if (x0 !== null) y0 = e.touches[0].clientY;
  }, { passive: true });
  pieceView.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(shown + (dx < 0 ? 1 : -1));
  }, { passive: true });
  function renderPiece(p) {
    var cat = p.cats[0], more = list(cat, 'new').filter(function (q) { return q !== p; }).slice(0, 4);
    var ask = wa('I’d like to ask about the ' + p.name + (p.weight ? ' (' + p.weight + ')' : '') + ' I saw on your website.');
    pieceView.innerHTML =
      '<div class="wrap">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="../">Home</a><span aria-hidden="true">/</span><a href="./" data-cat="all">The collection</a><span aria-hidden="true">/</span><a href="?cat=' + cat + '" data-cat="' + cat + '">' + CAT[cat] + '</a></nav>' +
        '<div class="pv">' +
          '<div class="pv-gal"><figure class="pv-ph"><img id="pv-img" src="' + IMG + p.slug + '.webp" alt="' + esc(p.name) + ', ' + esc(p.about) + '" width="1080" height="1350"></figure>' + thumbs(p) + '</div>' +
          '<div class="pv-c">' +
            '<span class="label"><svg class="fl" aria-hidden="true"><use href="#flower"/></svg>' + esc(p.kind) + '</span>' +
            '<h1 class="pv-h">' + esc(p.name) + '</h1>' +
            (p.weight
              ? '<dl class="pv-wt"><div><dt>Weight</dt><dd>' + unit(weightText(p)) + '</dd></div><div><dt>In pawn</dt><dd>' + pawnText(p) + '</dd></div></dl>'
              : '<p class="pv-wt none">Ask us for the weight of this piece.</p>') +
            '<p class="pv-d">' + esc(p.about) + '</p>' +
            '<p class="pv-price">Gold is priced by weight at the day’s rate, so ask us for today’s price of this piece.<span id="pv-rate"></span></p>' +
            '<div class="pv-ctas">' +
              '<a class="btn" href="' + ask + '" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-chat"/></svg>Ask about this piece</a>' +
              '<a class="btn ghost" href="tel:+94312238822"><svg aria-hidden="true"><use href="#i-call"/></svg>031 223 8822</a>' +
            '</div>' +
            (p.ig ? '<a class="alink" href="' + IG + p.ig + '/" target="_blank" rel="noopener">See it on Instagram <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>' : '') +
          '</div>' +
        '</div>' +
        (more.length ? '<section class="pv-more" aria-labelledby="more-h"><h2 class="h2" id="more-h">More ' + CAT[cat].toLowerCase() + '</h2><ul class="grid">' + more.map(card).join('') + '</ul></section>' : '') +
      '</div>';
    shown = 1;
    // fetch the other photos once the first has arrived, so turning to them is instant
    $('#pv-img').addEventListener('load', function () {
      for (var i = 2; i <= (p.photos || 1); i++) new Image().src = photo(p, i);
    }, { once: true });
    showRate();
  }
  var gold = null;
  function showRate() {
    var el = $('#pv-rate');
    if (el && gold) el.innerHTML = ' Gold today: 22K <b>Rs ' + rs(+gold.k22.pawn) + '</b> a pawn, the market rate.';
  }
  PJ.onGold(function (g) { gold = g; showRate(); });

  /* ---------- show the view the address asks for ---------- */
  // jump, not glide: the page underneath has just been replaced
  function jump(y) { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var gridY = 0;
  function render(fromNav) {
    var p = state.piece && BY[state.piece];
    gridView.hidden = !!p; pieceView.hidden = !p;
    if (p) { renderPiece(p); d.title = p.name + ' · Pushpa Jewellers'; if (fromNav) jump(0); }
    else { renderGrid(); d.title = (state.cat === 'all' ? 'The collection' : CAT[state.cat]) + ' · Pushpa Jewellers'; if (fromNav === 'back') jump(gridY); }
  }
  function go(next, push) {
    if (next.piece && !state.piece) gridY = window.scrollY;
    state = next;
    history[push ? 'pushState' : 'replaceState'](null, '', href(state));
    render(true);
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[data-piece], a[data-cat], .chip');
    if (!a) return;
    e.preventDefault();
    if (a.hasAttribute('data-piece')) go({ cat: state.cat, sort: state.sort, piece: a.getAttribute('data-piece') }, true);
    else {
      // a category: from a piece's breadcrumb it is a new page, from the chips it only refilters
      var fromPiece = !!state.piece;
      state = { cat: a.getAttribute('data-cat'), sort: state.sort, piece: null };
      history[fromPiece ? 'pushState' : 'replaceState'](null, '', href(state));
      render(false);
      if (fromPiece) jump(0);
    }
  });
  sortSel.addEventListener('change', function () { go({ cat: state.cat, sort: sortSel.value, piece: null }, false); });
  window.addEventListener('popstate', function () { var wasPiece = !!state.piece; state = read(); render(wasPiece && !state.piece ? 'back' : true); });
  render(false);
})();
