/* Pushpa Jewellers — landing page behaviour */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     PHOTOGRAPHY
     Paste an image URL against a slot and that slot switches from the
     drawn placeholder to the real photograph. Leave a slot empty and the
     drawing stays, so the page never shows a hole.

     Any direct image URL works — Unsplash CDN links (the
     https://images.unsplash.com/photo-… address behind "Download"),
     or your own files committed under assets/img/.

     Add ?w=1600&q=80&fm=webp to an Unsplash URL to keep it light.
     ------------------------------------------------------------------ */
  var PHOTOS = {
    heroAside:          'https://img.magnific.com/free-photo/young-brunette-model-demonstrating-jewelry_7502-7050.jpg',   /* tall — a model wearing a bridal set     */

    catNecklaces:       'https://img.magnific.com/free-photo/young-model-demonstrating-golden-necklace_7502-7049.jpg',   /* portrait lifestyle, neck and chest      */
    catEarrings:        'https://img.magnific.com/free-photo/model-demonstrating-silver-earrings_7502-7054.jpg',   /* portrait lifestyle, ear detail          */
    catRings:           'https://img.magnific.com/free-photo/young-model-demonstrating-expensive-ring_7502-7051.jpg',   /* portrait lifestyle, hand                */
    catBangles:         'https://img.magnific.com/free-photo/woman-s-arms-wearing-beautiful-jewelry_23-2149640597.jpg',   /* portrait lifestyle, wrist               */

    prodSolitaire:      'https://img.magnific.com/free-photo/gold-ring-with-diamonds_1203-1534.jpg',   /* square packshot                         */
    prodBridalNecklace: 'https://img.magnific.com/free-photo/top-view-bright-gold-necklace_23-2149836468.jpg',
    prodStuds:          'https://img.magnific.com/free-photo/aesthetic-golden-earrings-assortment_23-2149846587.jpg',
    prodSapphire:       'https://img.magnific.com/free-photo/golden-ring-with-purple-gemstone_1203-1529.jpg',
    prodTennis:         'https://img.magnific.com/free-photo/side-view-hand-holding-gold-bracelet_23-2149836428.jpg',
    prodBangles:        'https://img.magnific.com/free-photo/high-angle-shot-beautiful-golden-necklace-bracelet-earing-white-surface_181624-58013.jpg',
    prodPendant:        'https://img.magnific.com/free-photo/beautiful-luxury-necklace-jewelry-stand-neck_1339-7946.jpg',
    prodChain:          'https://img.magnific.com/free-photo/top-view-gold-chain-white-background_23-2149836434.jpg',

    workshop:           'https://img.magnific.com/free-photo/medium-shot-jeweler-making-jewellery_23-2150931446.jpg',   /* bench, tools, a jeweller at work        */

    bridalSet:          'https://img.magnific.com/free-photo/charming-model-with-dark-hair-shows-rich-golden-earrings-necklace-ring_8353-5040.jpg',   /* tall portrait                           */
    bridalEarrings:     'https://img.magnific.com/free-photo/long-earring-with-violet-precious-stones-hang-from-woman-s-ear_8353-5042.jpg',
    bridalBangles:      'https://img.magnific.com/free-photo/model-shows-earrings-ring-with-beautiful-blue-precious-stones_8353-5044.jpg',

    showroomNegombo:    'https://img.magnific.com/free-photo/golden-jewelry-store-window_1398-4127.jpg',   /* wide — shopfront or interior            */
    showroomKatunayake: 'https://img.magnific.com/free-photo/gold-jewelry-with-gems-showcase_1398-4327.jpg'
  };

  Object.keys(PHOTOS).forEach(function (key) {
    var url = PHOTOS[key];
    if (!url) return;
    document.querySelectorAll('[data-photo="' + key + '"]').forEach(function (slot) {
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.className = 'art art--photo';
      img.loading = 'lazy';
      img.decoding = 'async';
      /* Keep the drawing until the photograph has actually loaded, so a
         broken or slow URL never leaves an empty panel. */
      img.addEventListener('load', function () {
        var drawn = slot.querySelector('svg.art');
        if (drawn) drawn.remove();
        slot.classList.add('has-photo');
      });
      slot.appendChild(img);
    });
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Current year
     ------------------------------------------------------------------ */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     Sticky header shadow
     ------------------------------------------------------------------ */
  var header = document.getElementById('header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------------ */
  var drawer = document.getElementById('drawer');
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    document.body.classList.add('is-locked');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (openBtn) {
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.focus();
    }
  }

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeDrawer();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeDrawer();
  });

  /* Keep focus inside the drawer while it is open */
  document.addEventListener('focusin', function (e) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    if (!drawer.contains(e.target)) {
      var first = drawer.querySelector('a, button');
      if (first) first.focus();
    }
  });

  /* ------------------------------------------------------------------
     Featured carousel
     ------------------------------------------------------------------ */
  var viewport = document.getElementById('carousel');
  var prevBtn = document.querySelector('[data-carousel-prev]');
  var nextBtn = document.querySelector('[data-carousel-next]');

  if (viewport && prevBtn && nextBtn) {
    var step = function () {
      var card = viewport.querySelector('.product');
      if (!card) return viewport.clientWidth;
      var gap = parseFloat(getComputedStyle(viewport.querySelector('.carousel__track')).columnGap) || 20;
      return card.getBoundingClientRect().width + gap;
    };

    /* The viewport is padded so the track can bleed to the page edge, and
       scroll snapping rests the first card at scrollLeft === that padding —
       not at 0. Measure it rather than comparing against zero. */
    var syncButtons = function () {
      var pad = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      var max = viewport.scrollWidth - viewport.clientWidth;
      prevBtn.disabled = viewport.scrollLeft <= pad + 4;
      nextBtn.disabled = viewport.scrollLeft >= max - pad - 4;
    };

    var scrollBy = function (dir) {
      viewport.scrollBy({
        left: dir * step(),
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    };

    prevBtn.addEventListener('click', function () { scrollBy(-1); });
    nextBtn.addEventListener('click', function () { scrollBy(1); });
    viewport.addEventListener('scroll', syncButtons, { passive: true });
    window.addEventListener('resize', syncButtons);
    syncButtons();

    /* Arrow-key support when the carousel has focus */
    viewport.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollBy(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollBy(-1); }
    });
  }

  /* ------------------------------------------------------------------
     Wishlist toggles — local to the visitor's own browser
     ------------------------------------------------------------------ */
  document.querySelectorAll('.product__wish').forEach(function (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
    });
  });

  /* ------------------------------------------------------------------
     Assurance marquee — duplicate the items so the loop is seamless
     ------------------------------------------------------------------ */
  var track = document.getElementById('assuranceTrack');
  if (track && !reduceMotion) {
    track.innerHTML += track.innerHTML;
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealables = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Appointment form
     There is no backend here, so a valid submission hands the enquiry to
     WhatsApp — which is how the showroom actually takes bookings.
     Swap this for a real POST when an endpoint exists.
     ------------------------------------------------------------------ */
  var WHATSAPP_NUMBER = '94777770203';
  var form = document.getElementById('appointForm');
  var status = document.getElementById('formStatus');

  function setInvalid(input, invalid) {
    var field = input.closest('.field');
    if (field) field.classList.toggle('is-invalid', invalid);
  }

  if (form) {
    form.querySelectorAll('input, textarea, select').forEach(function (input) {
      input.addEventListener('input', function () { setInvalid(input, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.elements.name;
      var phone = form.elements.phone;
      var ok = true;

      if (!name.value.trim()) { setInvalid(name, true); ok = false; }

      /* Sri Lankan numbers: allow 07XXXXXXXX, 0XXXXXXXXX and +94XXXXXXXXX */
      var digits = phone.value.replace(/[^\d+]/g, '');
      if (!/^(\+94\d{9}|0\d{9})$/.test(digits)) { setInvalid(phone, true); ok = false; }

      if (!ok) {
        var firstBad = form.querySelector('.field.is-invalid input');
        if (firstBad) firstBad.focus();
        return;
      }

      var lines = [
        'Appointment request — Pushpa Jewellers',
        'Name: ' + name.value.trim(),
        'Phone: ' + phone.value.trim(),
        'Showroom: ' + form.elements.showroom.value,
        'Interested in: ' + form.elements.interest.value
      ];
      var note = form.elements.message.value.trim();
      if (note) lines.push('Note: ' + note);

      window.open(
        'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank',
        'noopener'
      );

      if (status) {
        status.textContent =
          'Thank you, ' + name.value.trim().split(' ')[0] +
          '. Your request is ready to send in WhatsApp — or call us on 031 223 3857.';
        status.classList.add('is-visible');
      }
      form.reset();
    });
  }

  /* ------------------------------------------------------------------
     Highlight the section currently in view in the primary nav
     ------------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.setAttribute(
            'aria-current',
            link.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false'
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { spy.observe(section); });
  }
})();
