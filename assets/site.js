/* =========================================================================
   Smilez Photography Kenya -- site behaviour
   Vanilla, no libraries. Every enhancement here is optional: if this file
   fails to load the pages still read, navigate and convert.

   NOTE ON ORDERING: every `let`/`const` below is declared ABOVE the first
   function that touches it. Hoisting a `let` under a function that references
   it throws a TDZ ReferenceError which kills the rest of the script silently.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- preload splash -------------------------------------------- */
  var splash = document.getElementById('splash');
  function dismissSplash() {
    root.classList.add('splash-done');
    window.setTimeout(function () {
      if (splash && splash.parentNode) { splash.parentNode.removeChild(splash); }
    }, 600);
  }
  if (splash) {
    if (document.readyState === 'complete') {
      window.setTimeout(dismissSplash, 260);
    } else {
      window.addEventListener('load', function () { window.setTimeout(dismissSplash, 260); });
    }
    /* belt and braces -- never trap someone behind the splash */
    window.setTimeout(dismissSplash, 2600);
  }

  /* ---------- mobile nav ------------------------------------------------- */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');
  if (nav && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- smart sticky header --------------------------------------- */
  /* Hides on downward scroll, comes back on ANY upward scroll. */
  var header = document.querySelector('.site-header');
  var lastY = window.pageYOffset;
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset;
    if (nav && nav.classList.contains('is-open')) { lastY = y; ticking = false; return; }
    if (y > lastY && y > 220) {
      header.classList.add('is-hidden');
    } else if (y < lastY) {
      header.classList.remove('is-hidden');
    }
    lastY = y < 0 ? 0 : y;
    ticking = false;
  }
  if (header) {
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
  }

  /* ---------- scroll reveal ---------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');
  function revealAll() {
    for (var i = 0; i < revealables.length; i++) { revealables[i].classList.add('is-in'); }
  }
  if (revealables.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealAll();
    } else {
      /* Only NOW do we arm the hidden state -- content was visible until here. */
      root.classList.add('reveal-on');
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('is-in');
            io.unobserve(entries[i].target);
          }
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      for (var j = 0; j < revealables.length; j++) { io.observe(revealables[j]); }
      /* Safety net: anything still hidden after 2.5s gets shown regardless. */
      window.setTimeout(revealAll, 2500);
    }
  }
  /* Exposed so the QA screenshots can force a reveal on file:// without
     having to fake a scroll. */
  window.__revealAll = revealAll;

  /* ---------- video: muted autoplay at ~55% visible ---------------------- */
  var vids = document.querySelectorAll('.vid video');
  function setupVideo(v) {
    var wrap = v.closest('.vid');
    var btn = wrap ? wrap.querySelector('.sound-toggle') : null;
    var onIcon = btn ? btn.querySelector('[data-on]') : null;
    var offIcon = btn ? btn.querySelector('[data-off]') : null;
    var label = btn ? btn.querySelector('[data-label]') : null;

    v.muted = true;
    v.setAttribute('muted', '');
    v.playsInline = true;

    function paintButton() {
      if (!btn) { return; }
      if (onIcon) { onIcon.style.display = v.muted ? 'none' : ''; }
      if (offIcon) { offIcon.style.display = v.muted ? '' : 'none'; }
      if (label) { label.textContent = v.muted ? 'Sound on' : 'Sound off'; }
      btn.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
    }
    paintButton();

    if (btn) {
      btn.addEventListener('click', function () {
        v.muted = !v.muted;
        if (!v.muted && v.paused) { v.play().catch(function () {}); }
        paintButton();
      });
    }

    /* Under reduced-motion we do NOT autoplay -- but the video stays visible
       and tappable. Hiding it would remove the tap target entirely. */
    if (reduceMotion || !('IntersectionObserver' in window)) {
      v.setAttribute('controls', '');
      return;
    }

    var vio = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.isIntersecting && e.intersectionRatio >= 0.55) {
          e.target.play().catch(function () {});
        } else {
          e.target.pause();
        }
      }
    }, { threshold: [0, 0.55, 0.9] });
    vio.observe(v);
  }
  for (var k = 0; k < vids.length; k++) { setupVideo(vids[k]); }

  /* ---------- gallery filters ------------------------------------------- */
  var filterBar = document.getElementById('filters');
  var galItems = document.querySelectorAll('.gal-item');
  var galEmpty = document.getElementById('gal-empty');

  function applyFilter(cat) {
    var shown = 0;
    for (var i = 0; i < galItems.length; i++) {
      var cats = (galItems[i].getAttribute('data-cat') || '').split(/\s+/);
      var on = cat === 'all' || cats.indexOf(cat) !== -1;
      galItems[i].hidden = !on;
      if (on) { shown++; }
    }
    if (galEmpty) { galEmpty.hidden = shown !== 0; }
  }

  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) { return; }
      var all = filterBar.querySelectorAll('.filter');
      for (var i = 0; i < all.length; i++) { all[i].setAttribute('aria-pressed', 'false'); }
      btn.setAttribute('aria-pressed', 'true');
      applyFilter(btn.getAttribute('data-filter'));
    });
  }

  /* ---------- lightbox --------------------------------------------------- */
  /* Reads src + caption straight off the DOM tiles. There is deliberately no
     duplicate JS array of image data to drift out of sync with the markup. */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var lbCap = document.getElementById('lb-cap');
  var lbCount = document.getElementById('lb-count');
  var lastFocus = null;
  var visible = [];
  var idx = 0;

  function collectVisible() {
    visible = [];
    for (var i = 0; i < galItems.length; i++) {
      if (!galItems[i].hidden) { visible.push(galItems[i]); }
    }
  }

  function show(i) {
    if (!visible.length) { return; }
    idx = (i + visible.length) % visible.length;
    var item = visible[idx];
    var img = item.querySelector('img');
    var full = img.getAttribute('data-full') || img.getAttribute('src');
    lbImg.setAttribute('src', full);
    lbImg.setAttribute('alt', img.getAttribute('alt') || '');
    lbCap.textContent = img.getAttribute('alt') || '';
    lbCount.textContent = (idx + 1) + ' / ' + visible.length;
  }

  function openLb(item) {
    collectVisible();
    var at = visible.indexOf(item);
    lastFocus = document.activeElement;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    show(at < 0 ? 0 : at);
    var closeBtn = lb.querySelector('.lb-close');
    if (closeBtn) { closeBtn.focus(); }
  }

  function closeLb() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  if (lb && galItems.length) {
    for (var m = 0; m < galItems.length; m++) {
      (function (item) {
        var b = item.querySelector('button');
        if (b) { b.addEventListener('click', function () { openLb(item); }); }
      }(galItems[m]));
    }
    lb.addEventListener('click', function (e) {
      var act = e.target.closest('[data-lb]');
      if (act) {
        var what = act.getAttribute('data-lb');
        if (what === 'close') { closeLb(); }
        if (what === 'prev') { show(idx - 1); }
        if (what === 'next') { show(idx + 1); }
        return;
      }
      if (e.target === lb || e.target.classList.contains('lb-stage')) { closeLb(); }
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) { return; }
      if (e.key === 'Escape') { closeLb(); }
      if (e.key === 'ArrowLeft') { show(idx - 1); }
      if (e.key === 'ArrowRight') { show(idx + 1); }
    });
  }

  /* ---------- booking form -> WhatsApp ----------------------------------- */
  /* Static hosting, no backend. The form composes a structured message in the
     CUSTOMER's voice and hands it to WhatsApp (or email as a fallback), which
     is the channel he actually answers anyway. */
  var bookForm = document.getElementById('booking-form');
  var WA_NUMBER = '254726667711';
  var MAIL_TO = 'smilezphotographykenya@gmail.com';

  function composeMessage(fd) {
    var lines = [];
    lines.push('Hi Smilez Photography, I’d like to book a shoot.');
    lines.push('');
    lines.push('Name: ' + (fd.name || '—'));
    lines.push('Shoot: ' + (fd.service || '—'));
    if (fd.date) { lines.push('Preferred date: ' + fd.date); }
    if (fd.where) { lines.push('Location: ' + fd.where); }
    if (fd.details) { lines.push(''); lines.push(fd.details); }
    return lines.join('\n');
  }

  function readForm(form) {
    return {
      name: (form.elements.name.value || '').trim(),
      service: (form.elements.service.value || '').trim(),
      date: (form.elements.date.value || '').trim(),
      where: (form.elements.where.value || '').trim(),
      details: (form.elements.details.value || '').trim()
    };
  }

  if (bookForm) {
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = composeMessage(readForm(bookForm));
      window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
    var mailBtn = document.getElementById('send-email');
    if (mailBtn) {
      mailBtn.addEventListener('click', function () {
        var d = readForm(bookForm);
        var subject = 'Shoot enquiry' + (d.service ? ' — ' + d.service : '');
        window.location.href = 'mailto:' + MAIL_TO
          + '?subject=' + encodeURIComponent(subject)
          + '&body=' + encodeURIComponent(composeMessage(d));
      });
    }
  }

  /* ---------- current year ----------------------------------------------- */
  var yr = document.querySelectorAll('[data-year]');
  for (var y = 0; y < yr.length; y++) { yr[y].textContent = String(new Date().getFullYear()); }
}());
