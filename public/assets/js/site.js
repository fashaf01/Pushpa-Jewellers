(function () {
  var IG = 'https://www.instagram.com/pushpajewellers_official/p/';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Newest first, in the order the shop posted them. fp = where the piece sits in the photo.
  var P = [
    { s: 'stacked-bar-bangle', f: 'product-gold-bangles-styled-with-a-saree', n: 'Stacked bar bangle', k: 'Bangle', c: ['bangles'], w: '12.470 g', g: 12.47, fp: '40% 50%', ig: 'DeCPWHHgKD8', d: 'Five slim bars of gold, the upper rows set with small stones, shown here with a cream saree.' },
    { s: 'five-stone-ring', f: 'product-floral-gold-ring', n: 'Five-stone ring', k: 'Ring', c: ['rings'], w: '1.120 g', g: 1.12, fp: '60% 45%', ig: 'Dd9FajfDB2q', d: 'A slim band with five small claw-set stones along the top.' },
    { s: 'gold-leaf-bridal-necklace', f: 'product-wedding-necklace-on-model', n: 'Gold leaf bridal necklace', k: 'Necklace', c: ['necklaces', 'bridal'], w: '24.380 g', g: 24.38, fp: '50% 55%', ig: 'Dd2_cGXCTjA', d: 'A collar of tapered gold leaves with stone-set veins and a single drop at the centre.' },
    { s: 'cross-pendant', f: 'product-gold-cross-pendant', n: 'Cross pendant', k: 'Pendant', c: ['pendants'], w: '12.020 g', g: 12.02, fp: '50% 68%', ig: 'DdwJSBmCT2E', d: 'A plain polished cross, shown on a curb chain.' },
    { s: 'blue-stone-clover-pendant', f: 'product-gemstone-pendant-on-model', n: 'Blue stone clover pendant', k: 'Pendant', c: ['pendants'], w: '2.550 g', g: 2.55, fp: '57% 66%', ig: 'Ddf7V7-jVXh', d: 'A four-petal clover frame holding a blue stone, on a fine chain.' },
    { s: 'everyday-wave-bangle', f: 'product-everyday-gold-bangle', n: 'Everyday wave bangle', k: 'Bangle', c: ['bangles'], w: '7.250 g', g: 7.25, fp: '45% 72%', ig: 'DdaxhQ_js9N', d: 'A hinged bangle with a stone-set wave crossing the front, made for daily wear.' },
    { s: 'infinity-ring', f: 'product-gold-engagement-ring', n: 'Infinity ring', k: 'Ring', c: ['rings'], w: '1.280 g', g: 1.28, fp: '50% 58%', ig: 'DdEQ89AEhxr', d: 'A polished infinity loop with one side set with small stones.' },
    { s: 'leaf-vine-necklace', f: 'product-statement-necklace-on-model', n: 'Leaf vine necklace', k: 'Necklace', c: ['necklaces'], w: '', g: null, fp: '45% 48%', ig: 'Dc_AfHzjbh6', d: 'A vine of gold leaves edged with small stones, meeting in a leaf-shaped drop.' },
    { s: 'coloured-stone-pendants', f: 'product-gemstone-jewellery-assortment', n: 'Coloured stone pendants', k: 'Set of three', c: ['pendants'], w: '1.740 – 2.100 g', g: 1.74, fp: '50% 50%', ig: 'Dc8uu1BE15v', d: 'Three pendants: an open geometric frame, a stone-set leaf and a ring of coloured stones.' },
    { s: 'enamel-flower-bracelet', f: 'product-floral-bracelet', n: 'Enamel flower bracelet', k: 'Bracelet', c: ['bracelets'], w: '6.680 g', g: 6.68, fp: '70% 72%', ig: 'Dc0urZygNtv', d: 'A gold chain of enamel flowers in red, white and purple.' },
    { s: 'red-stone-crescent-pendant', f: 'product-red-gemstone-pendant', n: 'Red stone crescent pendant', k: 'Pendant', c: ['pendants'], w: '2.050 g', g: 2.05, fp: '50% 60%', ig: 'DclT_xTDr6f', d: 'A crescent of gold curling around a round red stone, with a stone-set edge.' },
    { s: 'patterned-bangle', f: 'product-patterned-gold-bangles', n: 'Patterned bangle', k: 'Bangle', c: ['bangles'], w: '30.480 g', g: 30.48, fp: '50% 45%', ig: 'DcdKAPsgFUD', d: 'A wide bangle of engraved bands with a scrolling pattern and small polished accents.' },
    { s: 'red-stone-halo-pendant', f: 'product-circular-gemstone-pendant', n: 'Red stone halo pendant', k: 'Pendant', c: ['pendants'], w: '2.760 g', g: 2.76, fp: '52% 55%', ig: 'DcV23OOCaCR', d: 'A circle of red stones ringed with small clear stones, on a twisted chain.' },
    { s: 'infinity-link-bracelet', f: 'product-delicate-chain-bracelet', n: 'Infinity link bracelet', k: 'Bracelet', c: ['bracelets'], w: '9.800 g', g: 9.8, fp: '40% 62%', ig: 'DcLIF7GGeBf', d: 'A chain of infinity links, each set with small stones.' },
    { s: 'ballerina-pendant', f: 'product-ballerina-pendant', n: 'Ballerina pendant', k: 'Pendant', c: ['pendants'], w: '2.550 g', g: 2.55, fp: '50% 45%', ig: 'DcITBfwldTy', d: 'A dancer en pointe with a skirt of four blue stones.' },
    { s: 'red-stone-fine-necklace', f: 'product-fine-necklace-on-model', n: 'Red stone fine necklace', k: 'Necklace', c: ['necklaces'], w: '', g: null, fp: '60% 62%', ig: 'Db4v3jmjJNH', d: 'A fine chain of small red stones, worn close to the neck.' },
    { s: 'heart-link-bracelet', f: 'product-bracelet-on-model', n: 'Heart link bracelet', k: 'Bracelet', c: ['bracelets'], w: '', g: null, fp: '75% 72%', ig: 'Db2bdVHFeKl', d: 'A chain of open heart-shaped links.' },
    { s: 'branch-necklace-and-earrings', f: 'product-bridal-necklace-and-earrings', n: 'Branch necklace & earrings', k: 'Bridal set', c: ['necklaces', 'bridal'], w: '9.100 g', g: 9.1, note: 'necklace', fp: '55% 60%', ig: 'DbvS75qgdUo', d: 'A spray of fine gold branches tipped with small stones, with matching drop earrings.' },
    { s: 'triple-wave-cuff', f: 'product-statement-cuff-on-model', n: 'Triple-wave cuff', k: 'Bangle', c: ['bangles'], w: '17.390 g', g: 17.39, fp: '55% 62%', ig: 'DbqIUVjjHED', d: 'Three stone-set waves held in an open cuff.' },
    { s: 'fine-link-bracelet', f: 'product-minimal-bracelet-on-wrist', n: 'Fine link bracelet', k: 'Bracelet', c: ['bracelets'], w: '2.020 g', g: 2.02, fp: '45% 42%', ig: 'DbiavXRjv2e', d: 'A very fine link bracelet for everyday wear.' },
    { s: 'bridal-necklace-and-cuff', f: 'product-bridal-necklace-and-cuff-set', n: 'Bridal necklace & cuff', k: 'Bridal set', c: ['bridal', 'necklaces', 'bangles'], w: '11.580 g + 18.880 g', g: 11.58, fp: '50% 40%', ig: 'DbcvRA2DKZZ', d: 'A necklace of open links with a stone-set drop, paired with a fretwork cuff.' },
    { s: 'red-stone-line-necklace', f: 'product-necklace-with-coloured-stones', n: 'Red stone line necklace', k: 'Necklace', c: ['necklaces'], w: '12.770 g', g: 12.77, fp: '55% 58%', ig: 'DbXQ9owiGPR', d: 'A line of oval red stones in gold settings.' },
    { s: 'open-cage-cuff', f: 'product-gold-statement-cuff', n: 'Open-cage cuff', k: 'Bangle', c: ['bangles'], w: '23.530 g', g: 23.53, fp: '55% 50%', ig: 'DbUy6vNFTPe', d: 'An open cage of gold bars with stone-set rails.' },
    { s: 'five-row-bangle', f: 'product-layered-gold-bangle', n: 'Five-row bangle', k: 'Bangle', c: ['bangles'], w: '20.830 g', g: 20.83, fp: '40% 55%', ig: 'DbIqk1rlUw8', d: 'Five rows of gold, two of them set with small stones.' },
    { s: 'rose-gold-pendants', f: 'product-layered-pendant-necklaces', n: 'Rose gold pendants', k: 'Pair', c: ['pendants'], w: '1.150 g + 2.320 g', g: 1.15, fp: '45% 50%', ig: 'Da4bbf5DCv4', d: 'Two rose gold pendants: an open geometric knot and a stone-set crescent.' },
    { s: 'open-wave-cuff', f: 'product-geometric-gold-cuff', n: 'Open wave cuff', k: 'Bangle', c: ['bangles'], w: '10.830 g', g: 10.83, fp: '65% 55%', ig: 'DazRCdPAEyJ', d: 'An open cuff of stacked stone-set waves.' },
    { s: 'fine-drop-necklace', f: 'product-delicate-drop-necklace', n: 'Fine drop necklace', k: 'Necklace', c: ['necklaces'], w: '1.080 g', g: 1.08, fp: '45% 66%', ig: 'DaweU5cFTr_', d: 'A small curled drop on a fine chain.' },
    { s: 'wedding-band-pair', f: 'product-wedding-ring-pair', n: 'Wedding band pair', k: 'Rings', c: ['rings', 'bridal'], w: '', g: null, fp: '50% 70%', ig: 'DafQjwsFMYH', d: 'A matching pair of polished gold bands.' },
    { s: 'zigzag-bangle', f: 'product-structured-gold-bangle', n: 'Zigzag bangle', k: 'Bangle', c: ['bangles'], w: '7.660 g', g: 7.66, fp: '50% 55%', ig: 'DaUunV-DCmn', d: 'A bangle with a zigzag front and a stone-set edge.' },
    { s: 'station-chain-necklace', f: 'product-fine-necklace-with-small-details', n: 'Station chain necklace', k: 'Necklace', c: ['necklaces'], w: '3.730 g', g: 3.73, fp: '40% 35%', ig: 'DZ_vbBzCZgq', d: 'A fine chain with small gold stations along its length.' },
    { s: 'filigree-pendants', f: 'product-decorative-gold-pendants', n: 'Filigree pendants', k: 'Pair', c: ['pendants'], w: '2.840 g + 2.430 g', g: 2.43, fp: '50% 50%', ig: 'DZpNIAKD4Ah', d: 'Two traditional filigree pendants: a heart and a paisley drop.' },
    { s: 'anchor-and-helm-pendant', f: 'product-nautical-pendant-necklace', n: 'Anchor & helm pendant', k: 'Pendant', c: ['pendants'], w: '9.140 g', g: 9.14, fp: '55% 70%', ig: 'DZkDbh9AmJt', d: 'A ship’s wheel and anchor pendant on a fine chain.' }
  ];
  var BY = {}; P.forEach(function (p) { BY[p.s] = p; });
  var WEIGHED = P.filter(function (p) { return p.g !== null; });

  var CATS = [
    { id: 'necklaces', name: 'Necklaces', img: 'cat-necklaces' },
    { id: 'bangles', name: 'Bangles', img: 'cat-bangles' },
    { id: 'rings', name: 'Rings', img: 'cat-rings' },
    { id: 'pendants', name: 'Pendants', img: 'cat-pendants' },
    { id: 'bracelets', name: 'Bracelets', img: 'cat-bracelets' },
    { id: 'bridal', name: 'Bridal', img: 'cat-bridal' }
  ];
  var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });
  var BANDS = [
    { id: 'w1', name: 'Under 3 g', min: 0, max: 3 },
    { id: 'w2', name: '3 – 10 g', min: 3, max: 10 },
    { id: 'w3', name: '10 – 20 g', min: 10, max: 20 },
    { id: 'w4', name: 'Over 20 g', min: 20, max: 1e9 }
  ];
  var BAND = {}; BANDS.forEach(function (b) { BAND[b.id] = b; });
  var SORTS = [['new', 'Newest'], ['light', 'Weight: light to heavy'], ['heavy', 'Weight: heavy to light']];
  var NAV = [['shop', 'Shop'], ['bridal', 'Bridal'], ['exchange', 'Exchange'], ['story', 'Our story'], ['visit', 'Visit']];
  var PHONES = [['Negombo', '031 223 3857'], ['Negombo', '031 222 2404'], ['Katunayake', '077 777 0203']];

  var state = { q: '', sort: 'new', weighed: false };
  var app = document.getElementById('app');
  var lastRoute = null;
  var scrollFns = [];
  var cleanups = [];

  // ---------- this browser only: saved and recently viewed ----------
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || '[]').filter(function (s) { return BY[s]; }); } catch (e) { return []; } }
  function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  var saved = load('pj-saved'), recent = load('pj-recent');
  function isSaved(s) { return saved.indexOf(s) > -1; }
  function setCount() { var el = document.getElementById('savedCount'); el.textContent = saved.length; el.setAttribute('data-n', saved.length); }

  // ---------- helpers ----------
  function esc(t) { return String(t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function img(f) { return 'assets/img/' + f + '.webp'; }
  function ico(id) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function catHref(c) { return 'shop-' + c; }
  function wt(p) { return p.w ? p.w + ' · 22KT' : 'Ask for weight'; }
  function inCat(p, c) { return !c || p.c.indexOf(c) > -1; }
  function inBand(p, b) { return !b || (p.g !== null && p.g >= BAND[b].min && p.g < BAND[b].max); }
  function count(c, b) { return P.filter(function (p) { return inCat(p, c) && inBand(p, b); }).length; }
  function saveBtn(p) { return '<button class="save" type="button" data-save="' + p.s + '" aria-pressed="' + isSaved(p.s) + '" aria-label="Save ' + esc(p.n) + '">' + ico('heart') + '</button>'; }
  function card(p, eager) {
    return '<article class="card"><a class="card-link" href="#p-' + p.s + '"><div class="card-img"><img src="' + img(p.f) + '" alt="' + esc(p.n) + '" style="--fp:' + p.fp + '"' + (eager ? '' : ' loading="lazy"') + ' width="1080" height="1350"></div><h3>' + esc(p.n) + '</h3><p class="card-kind">' + esc(p.k) + '</p><p class="card-wt num' + (p.w ? '' : ' ask') + '">' + wt(p) + '</p></a>' + saveBtn(p) + '</article>';
  }
  function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">/</span>' : '') + (last ? '<span aria-current="page">' + esc(it[1]) + '</span>' : '<a href="#' + it[0] + '">' + esc(it[1]) + '</a>');
    }).join('') + '</nav>';
  }
  function head(label, title, intro, right, id) {
    return '<div class="head"><div>' + (label ? '<p class="label">' + label + '</p>' : '') + '<h2' + (id ? ' id="' + id + '"' : '') + '>' + title + '</h2>' + (intro ? '<p>' + intro + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }
  function arrows(id) { return '<div class="arrows"><button class="round" type="button" data-row="' + id + '" data-dir="-1" aria-label="Scroll left">' + ico('left') + '</button><button class="round" type="button" data-row="' + id + '" data-dir="1" aria-label="Scroll right">' + ico('right') + '</button></div>'; }
  function row(id, list) { return '<div class="row-wrap"><div class="swipe" id="' + id + '">' + list.map(function (p) { return card(p); }).join('') + '</div><div class="progress" aria-hidden="true"><i data-prog="' + id + '"></i></div></div>'; }
  function telHref(n) { return 'tel:+94' + n.replace(/\s/g, '').slice(1); }

  function storesHtml() {
    function phones(list) { return list.map(function (n) { return '<a href="' + telHref(n) + '">' + n + '</a>'; }).join(' · '); }
    return '<div class="stores">' +
      '<div class="store" data-reveal><p class="label">Flagship</p><h3>Negombo</h3><dl><dt>Address</dt><dd>67 &amp; 69 Greens Road, Negombo 11500</dd><dt>Call</dt><dd class="num">' + phones(['031 223 3857', '031 222 2404']) + '</dd><dt>Hours</dt><dd class="num">Mon – Sat, 9.15 am – 7.30 pm<br>Sun, 9.15 am – 2.00 pm</dd></dl><div class="store-acts"><a class="more" href="https://www.google.com/maps/search/?api=1&amp;query=Pushpa+Jewellers+Greens+Road+Negombo" target="_blank" rel="noopener">Directions ' + ico('arrow') + '</a></div></div>' +
      '<div class="store" data-reveal><p class="label">Showroom</p><h3>Katunayake</h3><dl><dt>Address</dt><dd>8A Averiwatte Road, Katunayake</dd><dt>Call</dt><dd class="num">' + phones(['077 777 0203']) + '</dd><dt>Hours</dt><dd class="num">Mon – Sat, 9.15 am – 7.30 pm<br>Sun, 9.15 am – 2.00 pm</dd></dl><div class="store-acts"><a class="more" href="https://www.google.com/maps/search/?api=1&amp;query=Pushpa+Jewellers+Averiwatte+Road+Katunayake" target="_blank" rel="noopener">Directions ' + ico('arrow') + '</a></div></div>' +
      '</div>';
  }
  function reelsHtml() {
    var R = [
      ['gold-purity-explainer', 'What 22KT means', '1:25', 'How gold purity is measured, and what the karat on a piece tells you.'],
      ['gemstone-jewellery-showcase', 'Find your colour', '0:12', 'Gemstone pieces in every shade, matched to what you wear.'],
      ['jewellery-collection-showcase', 'Rings, tried on', '0:10', 'Stacking rings and a matching necklace, worn in the showroom.']
    ];
    return '<div class="swipe reels" id="reels">' + R.map(function (r) {
      return '<figure class="reel"><video controls playsinline preload="none" poster="assets/img/' + r[0] + '-poster.webp" aria-label="' + r[1] + '"><source src="assets/video/' + r[0] + '.mp4" type="video/mp4"></video><figcaption><div class="reel-meta"><h3>' + r[1] + '</h3><span class="len num">' + r[2] + '</span></div><p>' + r[3] + '</p></figcaption></figure>';
    }).join('') + '</div>';
  }
  function stackHtml() {
    var S = [BY['gold-leaf-bridal-necklace'], BY['branch-necklace-and-earrings'], BY['bridal-necklace-and-cuff']];
    return '<div class="stack" id="stack">' + S.map(function (p, i) {
      return '<article class="stack-card" style="--i:' + i + '"><a class="stack-in" href="#p-' + p.s + '"><img src="' + img(p.f) + '" alt="' + esc(p.n) + '" loading="lazy" width="1080" height="1350"><div class="stack-cap"><p class="k">' + esc(p.k) + '</p><h3>' + esc(p.n) + '</h3><p class="w"><b class="num">' + p.w + ' · 22KT</b><span>View piece ' + ico('arrow') + '</span></p></div></a></article>';
    }).join('') + '</div>';
  }
  function exchangeSplit(tag, id) {
    return '<div class="wrap split">' +
      '<div class="split-copy" data-reveal><p class="label">Authorised money exchange</p><' + tag + (id ? ' id="' + id + '"' : '') + '>Don’t lose your salary to a bad rate</' + tag + '>' +
      '<p>Back from work abroad, or sending money home? Change your dollars, euros and pounds at our counter, in the same visit as your gold.</p>' +
      '<div class="currencies" aria-label="US dollars, euros and pounds"><span>$</span><span>€</span><span>£</span></div>' +
      '<div><p class="label" style="margin-bottom:4px">Call for today’s rate</p><a class="phone-big num" href="tel:+94312233857">031 223 3857</a></div></div>' +
      '<div class="split-img" data-reveal><img src="assets/img/money-exchange-service.webp" alt="Pushpa Jewellers money exchange poster: Don’t lose your salary to a bad exchange rate" loading="lazy" width="1080" height="1350"></div></div>';
  }

  // ---------- views ----------
  function viewHome() {
    var newest = WEIGHED.slice(0, 10);
    var ticks = '';
    for (var t = 5; t <= 30; t += 5) ticks += '<b style="left:' + ((t - 1) * 36) + 'px">' + t + ' g</b>';
    ticks += '<b style="left:0">1 g</b>';
    var dots = WEIGHED.map(function (p) { return '<i style="left:' + ((Math.min(p.g, 31) - 1) * 36) + 'px"></i>'; }).join('');
    return '' +
      '<section class="hero" aria-label="Featured">' +
        '<h1 class="vh">Pushpa Jewellers, forever trusted jewellers since 1967, Negombo</h1>' +
        '<div class="hero-track" id="heroTrack">' +
          '<a class="hero-panel" href="#shop-w1"><img src="assets/img/hero-everyday.webp" alt="A fine 22KT gold drop necklace worn with a white silk top" width="1080" height="1250" style="--pos:50% 55%"><div class="hero-copy"><h2>Everyday Gold</h2><p>Light 22KT pieces from 1.080 g</p><span class="go">Shop now ' + ico('arrow') + '</span></div></a>' +
          '<a class="hero-panel" href="#bridal"><img src="assets/img/hero-bridal.webp" alt="A gold leaf bridal necklace worn with a white silk top" width="928" height="1152" style="--pos:50% 45%"><div class="hero-copy"><h2>Bridal Gold</h2><p>Necklaces &amp; sets for the wedding day</p><span class="go">Shop now ' + ico('arrow') + '</span></div></a>' +
        '</div>' +
        '<div class="hero-dots" id="heroDots"><button type="button" aria-label="Everyday Gold" aria-current="true"></button><button type="button" aria-label="Bridal Gold" aria-current="false"></button></div>' +
      '</section>' +
      '<div class="marquee" aria-label="About the shop"><div class="marquee-track">' + [0, 1].map(function (k) { return '<ul' + (k ? ' aria-hidden="true"' : '') + '><li class="q">Excellent craftsmanship for generations</li><li>Est. 1967</li><li>22KT &amp; 18KT gold</li><li>Ceylon gemstones</li><li>Bridal &amp; bespoke</li><li>Money exchange</li><li>Negombo &amp; Katunayake</li></ul>'; }).join('') + '</div></div>' +

      '<section class="sec" aria-labelledby="t-cat"><div class="wrap">' + head('Collections', 'Shop by piece', '', '<a class="more" href="#shop">All jewellery ' + ico('arrow') + '</a>', 't-cat') + '</div>' +
        '<div class="swipe tiles" id="tiles">' + CATS.map(function (c) { return '<a class="tile" href="#' + catHref(c.id) + '"><div class="tile-img"><img src="' + img(c.img) + '" alt="" loading="lazy" width="1080" height="1350"></div><div class="tile-cap"><strong>' + c.name + '</strong><span class="num">' + count(c.id) + '</span></div></a>'; }).join('') + '</div>' +
      '</section>' +

      '<section class="sec line" aria-labelledby="t-scale"><div class="wrap">' + head('By weight', 'Find a piece by its weight', 'Gold is priced by weight. Slide the scale to the weight you have in mind.', '', 't-scale') +
        '<div class="scale"><div class="scale-read" aria-hidden="true"><strong class="num" id="scaleVal">7.3 g</strong><span>22KT gold</span></div>' +
        '<div class="scale-box"><div class="scale-track" id="scaleTrack" tabindex="0" role="slider" aria-label="Gold weight" aria-valuemin="1" aria-valuemax="31" aria-valuenow="7.3" aria-valuetext="7.3 grams"><div class="scale-inner"><span class="sp"></span><div class="ruler" id="ruler">' + ticks + dots + '</div><span class="sp"></span></div></div><span class="needle" aria-hidden="true"></span></div>' +
        '<p class="scale-hint">Gold dots mark the pieces in the shop</p>' +
        '<div class="near" id="near" aria-live="polite"></div>' +
        '<div class="scale-cta"><a class="more" id="scaleLink" href="#shop-w2">See all 3 – 10 g pieces ' + ico('arrow') + '</a></div></div>' +
      '</div></section>' +

      '<section class="sec line" aria-labelledby="t-new"><div class="wrap">' + head('New in', 'New pieces in 22KT gold', '', '<div style="display:flex;gap:18px;align-items:center">' + '<a class="more" href="#shop">See all ' + P.length + ' ' + ico('arrow') + '</a>' + arrows('newRow') + '</div>', 't-new') + '</div>' + row('newRow', newest) + '</section>' +

      '<section class="sec line" aria-labelledby="t-bridal"><div class="wrap">' + head('Bridal', 'Gold for the wedding day', 'Three bridal pieces, from a 9.100 g branch necklace to a 24.380 g leaf collar.', '', 't-bridal') + stackHtml() +
        '<div class="stack-end"><a class="btn" href="#bridal">See all bridal pieces</a></div></div></section>' +

      '<section class="sec tint" aria-labelledby="t-ex">' + exchangeSplit('h2', 't-ex') + '</section>' +

      '<section class="sec" aria-labelledby="t-reels"><div class="wrap">' + head('On Instagram', 'From the showroom', '', '<a class="more" href="https://www.instagram.com/pushpajewellers_official/" target="_blank" rel="noopener">Follow ' + ico('arrow') + '</a>', 't-reels') + '</div>' + reelsHtml() + '</section>' +

      '<section class="sec line" aria-labelledby="t-visit"><div class="wrap">' + head('Visit', 'Come and try them on', 'Two showrooms, open seven days a week.', '<a class="more" href="#visit">Plan a visit ' + ico('arrow') + '</a>', 't-visit') + storesHtml() + '</div></section>';
  }

  function shopHash(cat, band) { return 'shop' + (cat ? '-' + cat : '') + (band ? '-' + band : ''); }
  function filterList(cat, band) {
    var q = state.q.trim().toLowerCase();
    var list = P.filter(function (p) {
      return inCat(p, cat) && inBand(p, band) && (!state.weighed || p.g !== null) && (!q || (p.n + ' ' + p.k + ' ' + p.c.join(' ') + ' ' + p.d).toLowerCase().indexOf(q) > -1);
    });
    if (state.sort !== 'new') list = list.slice().sort(function (a, b) {
      if (a.g === null && b.g === null) return 0; if (a.g === null) return 1; if (b.g === null) return -1;
      return state.sort === 'light' ? a.g - b.g : b.g - a.g;
    });
    return list;
  }
  function viewShop(cat, band) {
    var title = cat ? CAT[cat].name : 'All jewellery';
    var thumbs = '<a class="thumb" href="#' + shopHash('', band) + '"' + (!cat ? ' aria-current="page"' : '') + '><span class="thumb-all">All</span><span>All</span></a>' +
      CATS.map(function (c) { return '<a class="thumb" href="#' + shopHash(c.id, band) + '"' + (c.id === cat ? ' aria-current="page"' : '') + '><img src="' + img(c.img) + '" alt="" width="96" height="96"><span>' + c.name + '</span></a>'; }).join('');
    return '<div class="wrap page-head shop-head">' + crumbs(cat ? [['home', 'Home'], ['shop', 'Shop'], ['', title]] : [['home', 'Home'], ['', 'Shop']]) + '<h1>' + esc(title) + '</h1></div>' +
      '<nav class="thumbs" aria-label="Categories">' + thumbs + '</nav>' +
      '<div class="toolbar"><div class="wrap toolbar-in"><button class="tool" type="button" id="filterBtn" aria-haspopup="dialog">' + ico('filter') + 'Filter<span class="n num" id="filterN" hidden></span></button><span class="tool-count num" id="toolCount" aria-live="polite"></span><button class="tool" type="button" id="sortBtn" aria-haspopup="dialog">' + ico('sort') + '<span id="sortLabel">Sort</span></button></div></div>' +
      '<div class="wrap"><div class="active-chips" id="activeChips" hidden></div><div class="results" id="results"></div></div>';
  }
  function fillShop(cat, band) {
    var list = filterList(cat, band);
    document.getElementById('toolCount').textContent = list.length + (list.length === 1 ? ' piece' : ' pieces');
    var sortName = { new: 'Newest', light: 'Lightest', heavy: 'Heaviest' }[state.sort];
    document.getElementById('sortLabel').textContent = sortName;
    var n = (band ? 1 : 0) + (state.weighed ? 1 : 0);
    var nEl = document.getElementById('filterN'); nEl.hidden = !n; nEl.textContent = n;
    var chips = [];
    if (band) chips.push('<a class="chip" href="#' + shopHash(cat, '') + '" aria-label="Remove filter ' + BAND[band].name + '">' + BAND[band].name + ' <span class="x" aria-hidden="true">×</span></a>');
    if (state.weighed) chips.push('<button class="chip" type="button" data-unweighed aria-label="Remove filter: listed weight only">Listed weight only <span class="x" aria-hidden="true">×</span></button>');
    if (state.q.trim()) chips.push('<button class="chip" type="button" data-unsearch aria-label="Clear search">“' + esc(state.q.trim()) + '” <span class="x" aria-hidden="true">×</span></button>');
    var ac = document.getElementById('activeChips');
    ac.hidden = !chips.length;
    ac.innerHTML = chips.join('') + (chips.length > 1 ? '<button class="clear-all" type="button" data-clearall>Clear all</button>' : '');
    document.getElementById('results').innerHTML = list.length
      ? '<div class="grid">' + list.map(function (p, i) { return card(p, i < 6); }).join('') + '</div>'
      : '<div class="empty"><h2>No pieces match</h2><p>Try another category, weight or word.</p><button class="btn ghost" type="button" data-clearall>Clear filters</button></div>';
  }
  function openFilter(cat, band) {
    function body() {
      return '<div class="f-block"><p class="f-title">Gold weight</p><div class="chips">' +
        '<button class="chip" type="button" data-fband=""' + ' aria-pressed="' + (!tmp.band) + '">Any weight</button>' +
        BANDS.map(function (b) { return '<button class="chip num" type="button" data-fband="' + b.id + '" aria-pressed="' + (tmp.band === b.id) + '">' + b.name + ' <span style="opacity:.6">' + count(cat, b.id) + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="f-block"><p class="f-title">Show</p><label class="opt" for="fWeighed"><span>Only pieces with a listed weight</span><input type="checkbox" id="fWeighed"' + (tmp.weighed ? ' checked' : '') + '></label></div>' +
        '<div class="f-block"><p class="f-title">Category</p><div class="chips"><button class="chip" type="button" data-fcat="" aria-pressed="' + (!tmp.cat) + '">All</button>' + CATS.map(function (c) { return '<button class="chip" type="button" data-fcat="' + c.id + '" aria-pressed="' + (tmp.cat === c.id) + '">' + c.name + '</button>'; }).join('') + '</div></div>';
    }
    var tmp = { cat: cat, band: band, weighed: state.weighed };
    function n() { var s = state.weighed; state.weighed = tmp.weighed; var k = filterList(tmp.cat, tmp.band).length; state.weighed = s; return k; }
    function foot() { return '<button class="btn ghost" type="button" data-freset>Reset</button><button class="btn" type="button" data-fapply>Show ' + n() + ' pieces</button>'; }
    openSheet('Filter', body(), foot(), function (panel) {
      panel.addEventListener('click', function (e) {
        var b = e.target.closest('[data-fband]'), c = e.target.closest('[data-fcat]');
        if (b) tmp.band = b.getAttribute('data-fband');
        else if (c) tmp.cat = c.getAttribute('data-fcat');
        else if (e.target.closest('[data-freset]')) tmp = { cat: '', band: '', weighed: false };
        else if (e.target.closest('[data-fapply]')) { state.weighed = tmp.weighed; closeSheet(); go(shopHash(tmp.cat, tmp.band), true, true); return; }
        else return;
        document.getElementById('sheetBody').innerHTML = body(); document.getElementById('sheetFoot').innerHTML = foot();
      });
      panel.addEventListener('change', function (e) { if (e.target.id === 'fWeighed') { tmp.weighed = e.target.checked; document.getElementById('sheetFoot').innerHTML = foot(); } });
    });
  }
  function openSort(cat, band) {
    var body = SORTS.map(function (s) { return '<label class="opt" for="so-' + s[0] + '"><span>' + s[1] + '</span><input type="radio" name="sort" id="so-' + s[0] + '" value="' + s[0] + '"' + (state.sort === s[0] ? ' checked' : '') + '></label>'; }).join('');
    openSheet('Sort', body, '', function (panel) {
      panel.addEventListener('change', function (e) { if (e.target.name === 'sort') { state.sort = e.target.value; fillShop(cat, band); setTimeout(closeSheet, 180); } });
    });
  }

  function viewPiece(p) {
    var c0 = p.c[0], cat = CAT[c0];
    var more = P.filter(function (o) { return o !== p && o.c.indexOf(c0) > -1; }).slice(0, 8);
    var rec = recent.filter(function (s) { return s !== p.s; }).map(function (s) { return BY[s]; }).slice(0, 8);
    var facts = '<dl class="facts"><dt>Type</dt><dd>' + esc(p.k) + '</dd><dt>Gold weight</dt><dd class="num">' + (p.w ? p.w + (p.note ? ' (' + p.note + ')' : '') : 'Ask the showroom') + '</dd><dt>Purity</dt><dd>' + (p.w ? '22KT gold' : 'Ask the showroom') + '</dd><dt>Collection</dt><dd>' + p.c.map(function (c) { return '<a href="#' + catHref(c) + '">' + CAT[c].name + '</a>'; }).join(', ') + '</dd></dl>';
    return '<div class="has-bar"><div class="wrap p-top"><a class="back" href="#' + catHref(c0) + '">' + ico('back') + cat.name + '</a></div>' +
      '<div class="wrap p-grid">' +
        '<div class="gallery"><div class="g-track" id="gTrack">' +
          '<div class="g-slide main" id="gMain"><img src="' + img(p.f) + '" alt="' + esc(p.n) + ': ' + esc(p.d) + '" width="1080" height="1350"></div>' +
          '<div class="g-slide detail" style="--fp:' + p.fp + '"><img src="' + img(p.f) + '" alt="Close-up of the ' + esc(p.n.toLowerCase()) + '" loading="lazy" width="1080" height="1350"><span class="g-tag">Close-up</span></div>' +
        '</div><div class="g-dots" id="gDots"><button type="button" aria-label="Photo 1 of 2" aria-current="true"></button><button type="button" aria-label="Photo 2 of 2" aria-current="false"></button></div></div>' +
        '<div class="info">' +
          '<p class="label">' + esc(p.k) + '</p><h1>' + esc(p.n) + '</h1>' +
          '<div class="wbox">' + (p.w ? '<div><span class="k">Gold weight</span><span class="v num">' + p.w + '</span></div><div><span class="k">Purity</span><span class="v">22KT</span></div>' : '<div><span class="k">Gold weight</span><span class="v">Ask the showroom</span></div>') + '</div>' +
          '<p class="price-note">Priced by weight at the day’s gold rate. <b class="num">Call 031 223 3857</b> for today’s price.</p>' +
          '<div class="p-acts"><button class="btn" type="button" data-ask="' + p.s + '">' + ico('phone') + 'Ask about this piece</button><button class="btn ghost" type="button" data-save="' + p.s + '" aria-pressed="' + isSaved(p.s) + '" aria-label="Save ' + esc(p.n) + '">' + ico('heart') + '</button></div>' +
          '<p class="desc">' + esc(p.d) + '</p>' +
          '<div class="acc">' +
            '<details open><summary>Details</summary><div class="acc-body">' + facts + '</div></details>' +
            '<details><summary>In the showrooms</summary><div class="acc-body"><p>Both showrooms are open seven days a week. Call ahead to check this piece is at the counter you plan to visit.</p><p><a href="#visit">Addresses and opening hours</a></p></div></details>' +
            '<details><summary>About the price</summary><div class="acc-body"><p>The weight shown is the gold weight printed on the shop’s photograph of this piece. Gold is priced by weight, so ask the showroom to confirm the weight and today’s 22KT rate before you buy.</p></div></details>' +
            '<details><summary>Caring for your gold</summary><div class="acc-body"><p>Keep each piece in its own pouch so stones and edges don’t scratch one another. Take jewellery off before swimming, cleaning or putting on perfume and lotion, and wipe it with a soft dry cloth after wearing.</p></div></details>' +
            '<details><summary>Photograph</summary><div class="acc-body"><p><a href="' + IG + p.ig + '/" target="_blank" rel="noopener">See this piece on Instagram ↗</a></p></div></details>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (more.length ? '<section class="sec" aria-labelledby="t-more"><div class="wrap">' + head('', 'More ' + (c0 === 'bridal' ? 'bridal pieces' : cat.name.toLowerCase()), '', '<div style="display:flex;gap:18px;align-items:center"><a class="more" href="#' + catHref(c0) + '">See all ' + ico('arrow') + '</a>' + arrows('moreRow') + '</div>', 't-more') + '</div>' + row('moreRow', more) + '</section>' : '') +
      (rec.length ? '<section class="sec line" aria-labelledby="t-rec"><div class="wrap">' + head('', 'Recently viewed', '', arrows('recRow'), 't-rec') + '</div>' + row('recRow', rec) + '</section>' : '') +
      '<div class="buybar"><button class="btn ghost sq" type="button" data-save="' + p.s + '" aria-pressed="' + isSaved(p.s) + '" aria-label="Save ' + esc(p.n) + '">' + ico('heart') + '</button><button class="btn" type="button" data-ask="' + p.s + '">' + ico('phone') + 'Ask about this piece</button></div>' +
    '</div>';
  }
  function openAsk(p) {
    var list = p ? [p] : saved.map(function (s) { return BY[s]; });
    var details = list.map(function (o) { return o.n + (o.w ? ', ' + o.w + ', 22KT' : ''); }).join('\n');
    var body = '<p style="color:var(--muted);margin-bottom:6px">Call or visit and mention ' + (p ? 'this piece' : 'these pieces') + '. We’ll confirm the weight and today’s rate.</p>' +
      PHONES.map(function (ph) { return '<div class="phone-row"><div><span>' + ph[0] + '</span><a class="num" href="' + telHref(ph[1]) + '">' + ph[1] + '</a></div><button class="copy" type="button" data-copy="' + ph[1] + '">Copy</button></div>'; }).join('') +
      '<p style="color:var(--muted);font-size:14px;margin-top:14px" class="num">Mon – Sat 9.15 am – 7.30 pm · Sun 9.15 am – 2.00 pm</p>';
    var foot = '<button class="btn ghost" type="button" data-copy="' + esc(details) + '" data-copy-label="' + (p ? 'Piece details copied' : 'Saved list copied') + '">Copy ' + (p ? 'details' : 'list') + '</button><a class="btn" href="#visit">Plan a visit</a>';
    openSheet(p ? 'Ask about this piece' : 'Ask about your saved pieces', body, foot, function (panel) {
      panel.querySelector('a.btn').addEventListener('click', closeSheet);
    });
  }

  function viewBridal() {
    var bridal = P.filter(function (p) { return p.c.indexOf('bridal') > -1; });
    var bangles = P.filter(function (p) { return p.c.indexOf('bangles') > -1 && p.g >= 17 && p.c.indexOf('bridal') < 0; });
    return '<div class="wrap page-head">' + crumbs([['home', 'Home'], ['', 'Bridal']]) + '</div>' +
      '<section class="sec" style="padding-top:8px"><div class="wrap split"><div class="split-copy" data-reveal><p class="label">Bridal</p><h1>Bridal Gold</h1><p>Bridal necklaces, sets and wedding bands in 22KT gold. Bring your family to the showroom and try the pieces on together.</p><div class="callout"><i></i><span class="num">9.100 g → 24.380 g<small>The bridal necklaces on this page</small></span></div><div><a class="btn" href="#visit">Plan a bridal visit</a></div></div><div class="split-img"><img src="assets/img/product-wedding-necklace-on-model.webp" alt="Gold leaf bridal necklace on a model" width="928" height="1152"></div></div></section>' +
      '<section class="sec line" aria-labelledby="t-b1"><div class="wrap">' + head('Scroll the set', 'Three bridal pieces', '', '', 't-b1') + stackHtml() + '</div></section>' +
      '<section class="sec line" aria-labelledby="t-b2"><div class="wrap">' + head('', 'All bridal pieces', '', '', 't-b2') + '<div class="grid">' + bridal.map(function (p) { return card(p); }).join('') + '</div></div></section>' +
      '<section class="sec line" aria-labelledby="t-b3"><div class="wrap">' + head('Pair with', 'Bangles to wear with them', 'Wide cuffs and bangles over 17 g.', arrows('bRow'), 't-b3') + '</div>' + row('bRow', bangles) + '</section>';
  }
  function viewExchange() {
    return '<div class="wrap page-head">' + crumbs([['home', 'Home'], ['', 'Money exchange']]) + '</div>' +
      '<section class="sec" style="padding-top:8px">' + exchangeSplit('h1') + '</section>' +
      '<section class="sec line"><div class="wrap"><div class="services">' +
        '<div class="service" data-reveal><p class="label">Currencies</p><h3>Dollars, euros, pounds</h3><p>Bring foreign notes to the counter and change them into rupees.</p></div>' +
        '<div class="service" data-reveal><p class="label">Hours</p><h3>Seven days</h3><p class="num">Mon – Sat, 9.15 am – 7.30 pm. Sun, 9.15 am – 2.00 pm.</p></div>' +
        '<div class="service" data-reveal><p class="label">Rates</p><h3>Quoted on the day</h3><p class="num">Rates change daily. Call 031 223 3857 for today’s rate before you come.</p></div>' +
      '</div></div></section>';
  }
  function viewStory() {
    var S = [
      ['Bridal sets', 'Necklaces, earrings, cuffs and wedding bands for the wedding day.', '#bridal'],
      ['Bespoke commissions', 'Bring a sketch or a photo and talk it through at the counter.', '#visit'],
      ['Ceylon gemstones', 'Pendants, rings and necklaces set with coloured stones.', '#shop-pendants'],
      ['Gold pawning', 'Raise cash against your gold at the counter. Ask for the terms.', '#visit'],
      ['Money exchange', 'Dollars, euros and pounds changed at the day’s rate.', '#exchange']
    ];
    return '<div class="wrap page-head">' + crumbs([['home', 'Home'], ['', 'Our story']]) + '</div>' +
      '<section class="sec" style="padding-top:8px"><div class="wrap split"><div class="split-img"><img src="assets/img/showroom.webp" alt="A customer at the counter of the Pushpa Jewellers showroom in Negombo" width="928" height="1152"></div><div class="split-copy" data-reveal><p class="label">Since 1967</p><h1>The Pride of Negombo</h1><p>Pushpa Jewellers has sold gold in Negombo since 1967. The flagship showroom is at 67 &amp; 69 Greens Road, with a second showroom on Averiwatte Road in Katunayake.</p><p>The shop’s own line is printed on its photographs: excellent craftsmanship for generations.</p><div class="callout"><i></i><span class="num">1967<small>Forever trusted jewellers since</small></span></div><a class="more" href="#visit">Visit the showrooms ' + ico('arrow') + '</a></div></div></section>' +
      '<section class="sec line" aria-labelledby="t-svc"><div class="wrap">' + head('At the counter', 'What we do', '', '', 't-svc') + '<div class="services">' +
        S.map(function (s) { return '<a class="service" href="' + s[2] + '" data-reveal><div><h3>' + s[0] + '</h3><p>' + s[1] + '</p></div>' + ico('arrow') + '</a>'; }).join('') +
      '</div></div></section>' +
      '<section class="sec line" aria-labelledby="t-r"><div class="wrap">' + head('On Instagram', 'From the showroom', '', '', 't-r') + '</div>' + reelsHtml() + '</section>';
  }
  function viewVisit() {
    return '<div class="wrap page-head">' + crumbs([['home', 'Home'], ['', 'Visit us']]) + '<h1>Visit the showrooms</h1><p>Two showrooms, open seven days a week. Call ahead if you’re coming to see a particular piece.</p></div>' +
      '<section class="sec" style="padding-top:12px"><div class="wrap">' + storesHtml() + '</div></section>' +
      '<section class="sec line"><div class="wrap split flip"><div class="split-img" data-reveal><img src="assets/img/showroom.webp" alt="The Pushpa Jewellers counter in Negombo" loading="lazy" width="928" height="1152"></div><div class="split-copy" data-reveal><p class="label">Before you come</p><h2>Save the pieces you want to see</h2><p>Tap the heart on any piece. Your saved list stays in this browser, so you can show it at the counter or read it out on the phone.</p><a class="more" href="#saved">Your saved pieces ' + ico('arrow') + '</a></div></div></section>';
  }
  function viewSaved() {
    var list = saved.map(function (s) { return BY[s]; });
    return '<div class="wrap page-head">' + crumbs([['home', 'Home'], ['', 'Saved']]) + '<h1>Saved pieces</h1><p>Kept in this browser. Show the list at the counter, or call and read it out.</p>' +
      (list.length ? '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px"><button class="btn" type="button" data-ask="">' + ico('phone') + 'Ask about these</button></div>' : '') + '</div>' +
      '<section class="sec" style="padding-top:20px"><div class="wrap">' + (list.length
        ? '<div class="grid">' + list.map(function (p) { return card(p, true); }).join('') + '</div>'
        : '<div class="empty"><h2>Nothing saved yet</h2><p>Tap the heart on any piece to keep it here.</p><a class="btn" href="#shop">Shop all jewellery</a></div>') + '</div></section>';
  }

  // ---------- behaviours ----------
  function bindRows() {
    app.querySelectorAll('.swipe[id]').forEach(function (el) {
      var bar = app.querySelector('[data-prog="' + el.id + '"]');
      var btns = app.querySelectorAll('[data-row="' + el.id + '"]');
      function upd() {
        var max = el.scrollWidth - el.clientWidth;
        if (bar) { var w = el.clientWidth / el.scrollWidth; bar.style.width = (w * 100) + '%'; bar.style.transform = 'translateX(' + (max > 0 ? (el.scrollLeft / max) * ((1 - w) / w) * 100 : 0) + '%)'; }
        if (btns.length) { btns[0].disabled = el.scrollLeft <= 2; btns[1].disabled = el.scrollLeft >= max - 2; }
      }
      el.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
      btns.forEach(function (b) { b.addEventListener('click', function () { var c = el.firstElementChild; el.scrollBy({ left: (c ? c.getBoundingClientRect().width + 18 : 300) * 2 * Number(b.getAttribute('data-dir')), behavior: reduce ? 'auto' : 'smooth' }); }); });
      upd();
      window.addEventListener('resize', upd); cleanups.push(function () { window.removeEventListener('resize', upd); });
    });
  }
  function bindScale() {
    var track = document.getElementById('scaleTrack'); if (!track) return;
    var ruler = document.getElementById('ruler'), val = document.getElementById('scaleVal'), near = document.getElementById('near'), link = document.getElementById('scaleLink');
    var PPG = 36, MIN = 1, MAX = 31, lastKey = '';
    function pad() { var h = track.clientWidth / 2 + 'px'; track.querySelectorAll('.sp').forEach(function (sp) { sp.style.width = h; }); }
    function value() { return Math.max(MIN, Math.min(MAX, MIN + track.scrollLeft / PPG)); }
    function render() {
      var v = value(), shown = v.toFixed(1);
      val.textContent = shown + ' g';
      track.setAttribute('aria-valuenow', shown); track.setAttribute('aria-valuetext', shown + ' grams');
      var list = WEIGHED.slice().sort(function (a, b) { return Math.abs(a.g - v) - Math.abs(b.g - v); }).slice(0, 3);
      var key = list.map(function (p) { return p.s; }).join();
      if (key !== lastKey) {
        var first = !lastKey; lastKey = key;
        var html = list.map(function (p) { return card(p, true); }).join('');
        if (first || reduce) near.innerHTML = html;
        else { near.classList.add('fade'); setTimeout(function () { near.innerHTML = html; near.classList.remove('fade'); }, 120); }
      }
      var band = BANDS.filter(function (b) { return v >= b.min && v < b.max; })[0] || BANDS[3];
      link.href = '#shop-' + band.id;
      link.firstChild.textContent = 'See all ' + band.name + ' pieces ';
    }
    pad();
    track.scrollLeft = (7.25 - MIN) * PPG;
    near.innerHTML = ''; render();
    track.addEventListener('scroll', function () { requestAnimationFrame(render); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (!d) return; e.preventDefault(); track.scrollLeft += d * PPG / 2;
    });
    // Drag with a mouse; touch scrolls natively.
    var down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = track.scrollLeft; track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointermove', function (e) { if (down) track.scrollLeft = sl - (e.clientX - sx); });
    track.addEventListener('pointerup', function () { down = false; });
    window.addEventListener('resize', pad); cleanups.push(function () { window.removeEventListener('resize', pad); });
  }
  function bindHero() {
    var tr = document.getElementById('heroTrack'); if (!tr) return;
    var dots = document.querySelectorAll('#heroDots button');
    function upd() { var i = Math.round(tr.scrollLeft / (tr.clientWidth || 1)); dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === i)); }); }
    tr.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { tr.scrollTo({ left: k * tr.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }); });
  }
  function bindStack() {
    var cards = app.querySelectorAll('.stack-card'); if (!cards.length || reduce) return;
    scrollFns.push(function () {
      for (var i = 0; i < cards.length - 1; i++) {
        var top = parseFloat(getComputedStyle(cards[i]).top) || 0;
        var nxt = cards[i + 1].getBoundingClientRect().top;
        var h = cards[i].offsetHeight || 1;
        var p = Math.max(0, Math.min(1, 1 - (nxt - top) / h));
        cards[i].style.transform = 'scale(' + (1 - 0.06 * p) + ')';
        var im = cards[i].querySelector('img'); if (im) im.style.filter = 'brightness(' + (1 - 0.35 * p) + ')';
      }
    });
  }
  function bindReels() {
    var el = document.getElementById('reels'); if (!el) return;
    var items = Array.prototype.slice.call(el.children);
    function upd() {
      var mid = el.scrollLeft + el.clientWidth / 2;
      items.forEach(function (it) {
        var c = it.offsetLeft + it.offsetWidth / 2, d = Math.min(1, Math.abs(c - mid) / it.offsetWidth);
        if (!reduce) it.style.transform = 'scale(' + (1 - 0.1 * d) + ')';
        it.style.opacity = String(1 - 0.5 * d);
        var v = it.querySelector('video'); if (d > 0.6 && v && !v.paused) v.pause();
      });
    }
    el.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
    // start on the middle reel
    requestAnimationFrame(function () { if (items[1]) el.scrollLeft = items[1].offsetLeft - (el.clientWidth - items[1].offsetWidth) / 2; upd(); });
  }
  function bindGallery() {
    var tr = document.getElementById('gTrack'); if (!tr) return;
    var dots = document.querySelectorAll('#gDots button');
    tr.addEventListener('scroll', function () { var i = Math.round(tr.scrollLeft / tr.clientWidth); dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === i)); }); }, { passive: true });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { tr.scrollTo({ left: k * tr.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }); });
    var m = document.getElementById('gMain'), im = m.querySelector('img');
    m.addEventListener('mousemove', function (e) { if (window.innerWidth < 960) return; var b = m.getBoundingClientRect(); im.style.transformOrigin = ((e.clientX - b.left) / b.width * 100) + '% ' + ((e.clientY - b.top) / b.height * 100) + '%'; m.classList.add('on'); });
    m.addEventListener('mouseleave', function () { m.classList.remove('on'); });
  }
  function bindReveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    var targets = app.querySelectorAll('[data-reveal], .card-img, .tile-img, .split-img');
    targets.forEach(function (el) {
      if (el.closest('.near') || el.closest('.stack')) return;
      if (el.getBoundingClientRect().top > window.innerHeight) { el.setAttribute('data-reveal', ''); el.classList.add('pre'); io.observe(el); }
    });
    cleanups.push(function () { io.disconnect(); });
  }

  // ---------- sheet ----------
  var sheet = document.getElementById('sheet'), sheetPanel = sheet.querySelector('.sheet-panel'), sheetOpener = null;
  function lock(on) { document.documentElement.classList.toggle('lock', on); }
  function openSheet(title, body, foot, bind) {
    sheetOpener = document.activeElement;
    document.getElementById('sheetTitle').textContent = title;
    document.getElementById('sheetBody').innerHTML = body;
    var f = document.getElementById('sheetFoot'); f.innerHTML = foot; f.hidden = !foot;
    var fresh = sheetPanel.cloneNode(true); sheetPanel.parentNode.replaceChild(fresh, sheetPanel); sheetPanel = fresh;
    bindGrab();
    sheet.hidden = false; lock(true);
    requestAnimationFrame(function () { sheet.classList.add('open'); var b = sheetPanel.querySelector('.sheet-body button, .sheet-body input, .sheet-body a, .sheet-foot button'); if (b) b.focus({ preventScroll: true }); });
    if (bind) bind(sheetPanel);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('open'); sheetPanel.style.transform = '';
    setTimeout(function () { sheet.hidden = true; if (!anyOverlay()) lock(false); if (sheetOpener && sheetOpener.focus) sheetOpener.focus({ preventScroll: true }); }, reduce ? 0 : 320);
  }
  function bindGrab() {
    var g = sheetPanel.querySelector('.sheet-grab'), y0 = null, dy = 0;
    g.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; sheetPanel.style.transition = 'none'; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', function (e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sheetPanel.style.transform = 'translateY(' + dy + 'px)'; });
    function end() { if (y0 === null) return; y0 = null; sheetPanel.style.transition = ''; if (dy > 110) closeSheet(); else sheetPanel.style.transform = ''; }
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  }
  sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close-sheet]')) closeSheet(); });

  // ---------- menu and search overlays ----------
  var menu = document.getElementById('menu'), search = document.getElementById('search'), ovOpener = null;
  function anyOverlay() { return !menu.hidden || !search.hidden || !sheet.hidden; }
  function openOv(el) { ovOpener = document.activeElement; el.hidden = false; lock(true); requestAnimationFrame(function () { el.classList.add('open'); }); }
  function closeOv(el, keepFocus) {
    if (el.hidden) return;
    el.classList.remove('open');
    setTimeout(function () { el.hidden = true; if (!anyOverlay()) lock(false); if (!keepFocus && ovOpener && ovOpener.focus) ovOpener.focus({ preventScroll: true }); }, reduce ? 0 : 260);
  }
  document.getElementById('menuBtn').addEventListener('click', function () { openOv(menu); setTimeout(function () { var a = menu.querySelector('.menu-links a'); if (a) a.focus({ preventScroll: true }); }, 50); });
  document.getElementById('searchBtn').addEventListener('click', function () { renderSearch(); openOv(search); setTimeout(function () { document.getElementById('q').focus(); }, 60); });
  [menu, search].forEach(function (el) { el.addEventListener('click', function (e) { if (e.target.closest('[data-close-ov]')) closeOv(el); else if (e.target.closest('a[href^="#"]')) closeOv(el, true); }); });
  function renderSearch() {
    var q = document.getElementById('q').value.trim().toLowerCase();
    var body = document.getElementById('searchBody');
    if (!q) {
      body.innerHTML = '<div class="s-group stagger"><p class="f-title" style="--n:1">Popular</p><div class="chips" style="--n:2">' + ['bangle', 'pendant', 'ring', 'bridal', 'red stone', 'cuff'].map(function (t) { return '<button class="chip" type="button" data-term="' + t + '">' + t + '</button>'; }).join('') + '</div></div>' +
        '<div class="s-group stagger"><p class="f-title" style="--n:3">By weight</p><div class="chips" style="--n:4">' + BANDS.map(function (b) { return '<a class="chip num" href="#shop-' + b.id + '">' + b.name + '</a>'; }).join('') + '</div></div>' +
        '<div class="s-group stagger"><p class="f-title" style="--n:5">New in</p><div class="s-results" style="--n:6">' + WEIGHED.slice(0, 4).map(sRow).join('') + '</div></div>';
      return;
    }
    var list = P.filter(function (p) { return (p.n + ' ' + p.k + ' ' + p.c.join(' ') + ' ' + p.d).toLowerCase().indexOf(q) > -1; });
    body.innerHTML = '<div class="s-group"><p class="f-title num">' + list.length + (list.length === 1 ? ' piece' : ' pieces') + '</p><div class="s-results">' + list.slice(0, 8).map(sRow).join('') + '</div>' +
      (list.length ? '<div style="margin-top:18px"><a class="btn block" href="#shop" data-search-all>See ' + (list.length > 8 ? 'all ' + list.length : 'them') + ' in the shop</a></div>' : '<p style="color:var(--muted)">Nothing matches “' + esc(q) + '”. Try bangle, ring or pendant.</p>') + '</div>';
  }
  function sRow(p) { return '<a class="s-row" href="#p-' + p.s + '"><img src="' + img(p.f) + '" alt="" width="56" height="70" loading="lazy"><div><b>' + esc(p.n) + '</b><span>' + esc(p.k) + '</span></div><em class="num">' + (p.w || '') + '</em></a>'; }
  document.getElementById('q').addEventListener('input', renderSearch);
  document.getElementById('searchForm').addEventListener('submit', function (e) { e.preventDefault(); state.q = document.getElementById('q').value; closeOv(search, true); go('shop', false, true); });
  search.addEventListener('click', function (e) {
    var t = e.target.closest('[data-term]'); if (t) { document.getElementById('q').value = t.getAttribute('data-term'); renderSearch(); document.getElementById('q').focus(); }
    if (e.target.closest('[data-search-all]')) { state.q = document.getElementById('q').value; if (parse().v === 'shop') { e.preventDefault(); closeOv(search, true); render(); } }
  });

  // ---------- router ----------
  function parse() {
    var h = (location.hash || '#home').slice(1);
    if (h.indexOf('p-') === 0 && BY[h.slice(2)]) { var p = BY[h.slice(2)]; return { v: 'piece', p: p, nav: 'shop' }; }
    if (h === 'shop' || h.indexOf('shop-') === 0) {
      var cat = '', band = '';
      h.split('-').slice(1).forEach(function (x) { if (CAT[x]) cat = x; if (BAND[x]) band = x; });
      return { v: 'shop', cat: cat, band: band, nav: cat === 'bridal' ? 'bridal' : 'shop' };
    }
    if (['bridal', 'exchange', 'story', 'visit', 'saved'].indexOf(h) > -1) return { v: h, nav: h };
    return { v: 'home', nav: '' };
  }
  function go(hash, keepScroll, force) { if (location.hash.slice(1) === hash) { if (force) render(); } else { keep = !!keepScroll; location.hash = hash; } }
  var keep = false;
  function navHtml(cur) { return NAV.map(function (n) { return '<a href="#' + n[0] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join(''); }
  function menuHtml(cur) {
    var L = [['shop', 'Shop all', P.length + ' pieces'], ['bridal', 'Bridal', ''], ['exchange', 'Money exchange', ''], ['story', 'Our story', ''], ['visit', 'Visit us', ''], ['saved', 'Saved', saved.length ? saved.length + ' saved' : '']];
    return L.map(function (l, i) { return '<li style="--n:' + i + '"><a href="#' + l[0] + '"' + (l[0] === cur ? ' aria-current="page"' : '') + '>' + l[1] + '<span class="num">' + l[2] + '</span></a></li>'; }).join('');
  }

  function render() {
    cleanups.forEach(function (f) { f(); }); cleanups = []; scrollFns = [];
    var r = parse();
    var sameShop = r.v === 'shop' && lastRoute && lastRoute.v === 'shop';
    var stay = keep || sameShop; keep = false;
    var y = window.scrollY;
    var html;
    if (r.v === 'piece') html = viewPiece(r.p);
    else if (r.v === 'shop') html = viewShop(r.cat, r.band);
    else if (r.v === 'bridal') html = viewBridal();
    else if (r.v === 'exchange') html = viewExchange();
    else if (r.v === 'story') html = viewStory();
    else if (r.v === 'visit') html = viewVisit();
    else if (r.v === 'saved') html = viewSaved();
    else html = viewHome();
    app.innerHTML = html;
    document.body.classList.toggle('bar', r.v === 'piece');
    if (r.v === 'shop') {
      fillShop(r.cat, r.band);
      document.getElementById('filterBtn').addEventListener('click', function () { openFilter(r.cat, r.band); });
      document.getElementById('sortBtn').addEventListener('click', function () { openSort(r.cat, r.band); });
      app.addEventListener('click', shopClicks);
      cleanups.push(function () { app.removeEventListener('click', shopClicks); });
      var cur = app.querySelector('.thumb[aria-current]'); if (cur) cur.parentNode.scrollLeft = Math.max(0, cur.offsetLeft - 16 - (cur.parentNode.clientWidth - cur.offsetWidth) / 3);
    }
    if (r.v === 'piece') {
      recent = [r.p.s].concat(recent.filter(function (s) { return s !== r.p.s; })).slice(0, 12); store('pj-recent', recent);
      bindGallery();
    }
    bindHero(); bindRows(); bindScale(); bindStack(); bindReels();
    document.getElementById('hdNav').innerHTML = navHtml(r.nav);
    document.getElementById('menuLinks').innerHTML = menuHtml(r.v === 'shop' && !r.cat ? 'shop' : r.nav);
    window.scrollTo(0, stay ? y : 0);
    bindReveal();
    if (!stay && lastRoute) { app.focus({ preventScroll: true }); if (!reduce && app.animate) app.animate([{ opacity: 0.4, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
    lastRoute = r;
    var titles = { shop: r.cat ? CAT[r.cat] && CAT[r.cat].name : 'Shop', bridal: 'Bridal', exchange: 'Money exchange', story: 'Our story', visit: 'Visit us', saved: 'Saved pieces' };
    document.title = r.v === 'home' ? 'Pushpa Jewellers' : (r.v === 'piece' ? r.p.n : titles[r.v]) + ' · Pushpa Jewellers';
    tick();
  }
  function shopClicks(e) {
    var r = parse();
    if (e.target.closest('[data-unweighed]')) { state.weighed = false; fillShop(r.cat, r.band); }
    else if (e.target.closest('[data-unsearch]')) { state.q = ''; document.getElementById('q').value = ''; fillShop(r.cat, r.band); }
    else if (e.target.closest('[data-clearall]')) { state.q = ''; state.weighed = false; document.getElementById('q').value = ''; if (r.band || r.cat) go('shop', true); else fillShop(r.cat, r.band); }
  }
  var ticking = false;
  function tick() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; scrollFns.forEach(function (f) { f(); }); }); }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);

  // ---------- global clicks ----------
  var toastT;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-save]');
    if (s) {
      e.preventDefault();
      var id = s.getAttribute('data-save');
      if (isSaved(id)) saved.splice(saved.indexOf(id), 1); else saved.unshift(id);
      store('pj-saved', saved); setCount();
      document.querySelectorAll('[data-save="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(isSaved(id))); b.classList.remove('pop'); void b.offsetWidth; if (isSaved(id)) b.classList.add('pop'); });
      toast(isSaved(id) ? 'Saved: ' + BY[id].n : 'Removed from saved pieces');
      if (lastRoute && lastRoute.v === 'saved') { keep = true; render(); }
      return;
    }
    var a = e.target.closest('[data-ask]');
    if (a) { var id2 = a.getAttribute('data-ask'); openAsk(id2 ? BY[id2] : null); return; }
    var c = e.target.closest('[data-copy]');
    if (c) {
      var text = c.getAttribute('data-copy'), msg = c.getAttribute('data-copy-label') || 'Copied ' + text;
      try { navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast('Couldn’t copy. Select the text instead.'); }); }
      catch (err) { toast('Couldn’t copy. Select the text instead.'); }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!sheet.hidden) closeSheet(); else if (!search.hidden) closeOv(search); else if (!menu.hidden) closeOv(menu);
  });
  window.addEventListener('hashchange', function () { closeSheet(); closeOv(menu, true); closeOv(search, true); render(); });

  // ---------- today's gold rate ----------
  var gold = null;
  function money(n) { return Number(n).toLocaleString('en-US'); }
  function loadGold() {
    if (!window.fetch) return;
    fetch('/api/gold', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
      if (!d || !d.k24 || !d.k22) return;
      gold = d;
      document.getElementById('r24').textContent = money(d.k24.pawn);
      document.getElementById('r22').textContent = money(d.k22.pawn);
      document.getElementById('rateBtn').hidden = false;
      document.getElementById('rateFallback').hidden = true;
    }).catch(function () {});
  }
  document.getElementById('rateBtn').addEventListener('click', function () {
    if (!gold) return;
    var when = new Date(gold.updated);
    var time = isNaN(when) ? '' : when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' });
    var note = gold.source === 'showroom'
      ? '<p>Today\u2019s rate at our counter.</p>'
      : '<p>The international gold market price, converted to rupees at today\u2019s exchange rate and refreshed every hour. Our counter rate can differ; call to confirm before you visit.</p>';
    var body = '<table class="rate-table"><thead><tr><th scope="col">Purity</th><th scope="col">Per gram</th><th scope="col">Per pawn (8 g)</th></tr></thead><tbody>' +
      '<tr><th scope="row">24K</th><td>Rs ' + money(gold.k24.gram) + '</td><td>Rs ' + money(gold.k24.pawn) + '</td></tr>' +
      '<tr><th scope="row">22K</th><td>Rs ' + money(gold.k22.gram) + '</td><td>Rs ' + money(gold.k22.pawn) + '</td></tr></tbody></table>' +
      '<div class="rate-note">' + note + (time ? '<p class="num">Updated ' + time + ' (Sri Lanka time)</p>' : '') + '</div>';
    openSheet('Today\u2019s gold rate', body, '<a class="btn ghost" href="tel:+94312233857">' + ico('phone') + 'Call us</a><a class="btn" href="#shop">Shop now</a>', function (panel) {
      panel.querySelector('.sheet-foot a.btn:not(.ghost)').addEventListener('click', closeSheet);
    });
  });
  loadGold();
  setInterval(loadGold, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadGold(); });

  var hd = document.getElementById('hd');
  function measureHead() { document.documentElement.style.setProperty('--head-h', hd.offsetHeight + 'px'); }
  var compact = false;
  window.addEventListener('scroll', function () {
    var c = window.scrollY > 40;
    if (c !== compact) { compact = c; hd.classList.toggle('compact', c); setTimeout(measureHead, 380); }
  }, { passive: true });
  window.addEventListener('resize', measureHead);

  document.getElementById('year').textContent = new Date().getFullYear();

  setCount();
  render();
  measureHead();
})();
