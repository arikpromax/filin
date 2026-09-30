(function () {
  'use strict';

  var CFG = window.FILIN || {};

  /* ── Зайняті дати в календарі. Поки в config.js немає booking.api,
     список порожній і всі дати вільні, як і раніше. ── */
  var BUSY = {};          // { lyuks: { "2026-10-05": true } }
  var busyLoaded = {};    // за який номер уже питали
  var redrawCal = function () {};   // сюди календар підставить свою перемальовку
  var busyFor = function (id) { return BUSY[id] || {}; };
  var curRoomId = function () {
    var r = document.querySelector('input[name="room"]:checked');
    return r ? r.value : '';
  };
  var loadBusy = function (id) {
    var api = (CFG.booking && CFG.booking.api) || '';
    if (!api || !id || busyLoaded[id]) return;
    busyLoaded[id] = true;
    fetch(api + (api.indexOf('?') < 0 ? '?' : '&') + 'room=' + encodeURIComponent(id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var list = j && (j.dates || j);   // { dates: [...] } або просто [...]
        if (!list || !list.length) return;
        var map = {};
        list.forEach(function (d) { map[String(d).slice(0, 10)] = true; });
        BUSY[id] = map;
        redrawCal();
      })
      .catch(function () { busyLoaded[id] = false; });
  };
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  /* ── Кожна сторінка відкривається згори (або одразу на блоці з #якоря),
        навіть якщо переглядач намагається відновити стару прокрутку ── */
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (x) {}
  var userScrolled = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { userScrolled = true; }, { passive: true, once: true });
  });
  var toStart = function () {
    if (userScrolled) return;
    var html = document.documentElement, prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    // Якір слухаємо лише коли людина прийшла за посиланням на розділ.
    // Просто оновили сторінку — відкриваємо згори, навіть якщо в адресі
    // лишився якір від кліку в меню.
    var reloaded = false;
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      reloaded = nav ? nav.type === 'reload' : performance.navigation && performance.navigation.type === 1;
    } catch (x) {}
    if (reloaded && location.hash.length > 1) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {}
    }
    var target = (!reloaded && location.hash.length > 1) ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else { window.scrollTo(0, 0); if (document.body) document.body.scrollIntoView({ block: 'start' }); }
    html.style.scrollBehavior = prev;
  };
  toStart();
  window.addEventListener('load', toStart);
  window.addEventListener('pageshow', toStart);
  [120, 400, 900].forEach(function (t) { setTimeout(toStart, t); });

  // Посилання на блоки цієї ж сторінки (#rooms, #about…) — плавно до блоку
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var t = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!t) return;
    e.preventDefault();
    userScrolled = true;
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', a.getAttribute('href')); } catch (x) {}
  });

  /* ── Значки в заглушках, поки немає фото (фото, коли з’явиться, ляже зверху) ── */
  var ICONS = {
    bed: '<path d="M3 18.5v-12M3 14h18v4.5M21 14v-2.5a3 3 0 0 0-3-3h-7.5V14"/><circle cx="6.8" cy="11" r="1.8"/>',
    sauna: '<path d="M3 20h18M5 20v-6h14v6M8 11c-1-1.2 1-2.3 0-3.5M12 11c-1-1.2 1-2.3 0-3.5M16 11c-1-1.2 1-2.3 0-3.5"/>',
    billiard: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="10.6" r="1.4"/><circle cx="12" cy="13.6" r="1.6"/>',
    cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12.5 3.5v2.5"/>',
    dish: '<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 10V8.5M10.3 8.5h3.4M2 20h20"/>',
    chef: '<path d="M7 17.5h10V21H7zM7 17.5v-4A4 4 0 0 1 6.5 5.6a4.6 4.6 0 0 1 5.5-2.4 4.6 4.6 0 0 1 5.5 2.4 4 4 0 0 1-.5 7.9v4M10 17.5v-3M14 17.5v-3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>',
    house: '<path d="M3 11 12 4l9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>'
  };
  var iconSVG = function (k) { return ICONS[k] ? '<svg class="ph__icon" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k] + '</svg>' : ''; };
  $$('.ph[data-icon]').forEach(function (el) { el.insertAdjacentHTML('afterbegin', iconSVG(el.getAttribute('data-icon'))); });

  /* ── Фото, яких ще немає, прибираємо — лишається світла заглушка ── */
  var dropBroken = function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { img.remove(); return; }
    img.addEventListener('error', function () { img.remove(); });
  };
  $$('.ph img').forEach(dropBroken);
  var hasImg = function (el) { return !!$('img', el); };

  /* ── Телефон: показуємо, лише якщо вказано в config.js ── */
  if (CFG.phone) {
    var digits = CFG.phone.replace(/[^\d+]/g, '');
    $$('a[data-phone-link]').forEach(function (a) {
      a.href = 'tel:' + digits;
      if (!a.hasAttribute('data-call')) a.textContent = CFG.phone;
    });
    $$('.needs-phone').forEach(function (el) { el.hidden = false; });
    $$('.no-phone').forEach(function (el) { el.hidden = true; });
  }
  // «Зателефонуйте нам» — з номером, якщо він є в config.js, інакше — Instagram
  var callHTML = function (lower) {
    var w = lower ? 'зателефонуйте' : 'Зателефонуйте';
    return CFG.phone
      ? '<a class="bk__call" href="tel:' + CFG.phone.replace(/[^\d+]/g, '') + '">' + w + ' нам: ' + CFG.phone + '</a>'
      : w + ' нам або <a href="' + (CFG.instagram || 'https://www.instagram.com/cafe__filin__/') + '" target="_blank" rel="noopener">напишіть в Instagram</a>';
  };
  // Телефони в підвалі — з config.js → phones
  if (CFG.phones && CFG.phones.length) {
    $$('[data-foot-phones]').forEach(function (p) {
      p.innerHTML = CFG.phones.map(function (n) {
        var d = String(n).replace(/\D/g, '');
        return '<a href="tel:' + (d.length === 10 && d.charAt(0) === '0' ? '+38' + d : '+' + d) + '">' + String(n).replace(/[<>&]/g, '') + '</a>';
      }).join('<br>');
    });
  }
  if (CFG.instagram) {
    $$('a[href*="instagram.com"]').forEach(function (a) { a.href = CFG.instagram; });
  }

  /* ── Плавна поява блоків при скролі ── */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ── «Нагору» ── */
  $$('[data-to-top]').forEach(function (b) {
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  });

  /* ── Меню-бургер: висувна панель справа ── */
  var drawer = $('#drawer'), burger = $('.menu-btn');
  var drawerOpen = false;
  function setDrawer(open) {
    if (!drawer || !burger) return;
    drawerOpen = open;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('no-scroll', open);
    burger.setAttribute('aria-label', open ? 'Закрити навігацію' : 'Відкрити навігацію сайту');
    if (open) {
      var first = $('.drawer__list a', drawer);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    }
  }
  if (drawer && burger) {
    burger.addEventListener('click', function () { setDrawer(!drawerOpen); });
    $$('[data-drawer-close]', drawer).forEach(function (el) { el.addEventListener('click', function () { setDrawer(false); }); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerOpen) { setDrawer(false); burger.focus(); }
    });
  }

  /* ── Карта: позначка з’являється, щойно в config.js є координати ── */
  var mapFrame = $('[data-map]');
  if (mapFrame && CFG.map && CFG.map.lat && CFG.map.lng) {
    var la = parseFloat(CFG.map.lat), ln = parseFloat(CFG.map.lng);
    if (!isNaN(la) && !isNaN(ln)) {
      var d = 0.012;   // приблизно кілометр навколо точки
      mapFrame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        (ln - d) + '%2C' + (la - d / 2) + '%2C' + (ln + d) + '%2C' + (la + d / 2) +
        '&layer=mapnik&marker=' + la + '%2C' + ln;
    }
  }
  /* ── Рядки першого блоку тануть по черзі, кожен коли дійде до верху ── */
  // «Кафе» і «Філін» — окремі рядки, інакше вони тануть удвох одночасно
  var heroLines = [];
  $$('.hero__inner > *').forEach(function (el) {
    if (el.classList.contains('hero__h')) { heroLines = heroLines.concat(Array.prototype.slice.call(el.children)); }
    else { heroLines.push(el); }
  });
  if (heroLines.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var lQueued = false, lSettle = 0;
    var lineFade = function () {
      lQueued = false;
      var vh = window.innerHeight;
      var end = -vh * 0.1;   // тут рядок уже повністю зник
      heroLines.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        if (el.__top0 === undefined) el.__top0 = top + window.scrollY;   // де рядок стоїть без прокрутки
        // танути починає з верхньої третини вікна, але не раніше, ніж зрушить з місця
        var start = Math.min(vh * 0.35, el.__top0);   // звідки починає танути
        var grace = vh * 0.08;   // поки не від’їхали хоч трохи — усе чітке
        var p = Math.min(1, Math.max(0, (start - top - grace) / Math.max(1, start - end)));
        el.style.setProperty('--hs', (1 - p * 0.5).toFixed(3));
        el.style.setProperty('--ho', (1 - p).toFixed(3));
        el.style.setProperty('--hb', (p * 50).toFixed(1) + 'px');
      });
    };
    lineFade();
    window.addEventListener('scroll', function () {
      if (!lQueued) { lQueued = true; requestAnimationFrame(lineFade); }
      clearTimeout(lSettle);
      lSettle = setTimeout(lineFade, 120);   // останній кадр, коли прокрутка стихла
    }, { passive: true });
    // зум, поворот екрана чи дозавантажений шрифт зсувають розкладку —
    // збережені початкові місця стають хибними, тож забуваємо їх і міряємо наново
    var remeasure = function () {
      heroLines.forEach(function (el) { el.__top0 = undefined; });
      lineFade();
    };
    window.addEventListener('resize', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    window.addEventListener('load', remeasure);
  }
  /* ── Смуга з логотипом зверху (коли гортаєш) і кнопки «Меню» / «Назад» у тон темних місць під ними ── */
  var darkEls = $$('.hero, .leisure');
  var topbar = $('[data-topbar]'), heroTop = $('.hero'), backBtn = $('.back-btn');
  if (darkEls.length && burger) {
    var toneQueued = false;
    var overDark = function (btn) {
      if (root.classList.contains('bar-on')) return false;
      var b = btn.getBoundingClientRect(), mid = b.top + b.height / 2;
      return darkEls.some(function (el) { var r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    };
    var tone = function () {
      toneQueued = false;
      if (topbar) {
        // на головній — після першого екрана, на інших сторінках — щойно почали гортати
        var on = window.scrollY > (heroTop ? heroTop.offsetHeight - 80 : 60);
        topbar.classList.toggle('is-on', on);
        root.classList.toggle('bar-on', on);
      }
      burger.classList.toggle('on-dark', overDark(burger));
      if (backBtn) backBtn.classList.toggle('on-dark', overDark(backBtn));
    };
    tone();
    window.addEventListener('scroll', function () {
      if (!toneQueued) { toneQueued = true; requestAnimationFrame(tone); }
    }, { passive: true });
    window.addEventListener('resize', tone);
  }

  /* ── «Зараз відкрито» / «Зараз зачинено» — за київським часом ── */
  var statusEls = $$('[data-open-status]');
  if (statusEls.length) {
    var hours = CFG.hours || { open: '07:00', close: '23:00' };
    var toMin = function (t) { var p = String(t).split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); };
    var nowMin = function () {
      var d = new Date();
      for (var i = 0, zones = ['Europe/Kyiv', 'Europe/Kiev']; i < zones.length; i++) {
        try {
          var parts = new Intl.DateTimeFormat('en-GB', { timeZone: zones[i], hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
          var get = function (type) { for (var j = 0; j < parts.length; j++) if (parts[j].type === type) return +parts[j].value; return 0; };
          return (get('hour') % 24) * 60 + get('minute');
        } catch (x) {}
      }
      return d.getHours() * 60 + d.getMinutes();
    };
    var showStatus = function () {
      var m = nowMin(), open = toMin(hours.open), close = toMin(hours.close);
      var isOpen = close > open ? (m >= open && m < close) : (m >= open || m < close);
      var left = (close - m + 1440) % 1440;
      var state = !isOpen ? 'closed' : (left <= 60 ? 'soon' : 'open');
      var text = state === 'open' ? 'Зараз відкрито'
               : state === 'soon' ? 'Зачиняємось о ' + hours.close
               : 'Зараз зачинено';
      statusEls.forEach(function (el) {
        el.classList.remove('status--open', 'status--soon', 'status--closed');
        el.classList.add('status', 'status--' + state);
        el.innerHTML = '<i class="status__dot" aria-hidden="true"></i>' + text;
        el.hidden = false;
      });
    };
    showStatus();
    setInterval(showStatus, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) showStatus(); });
  }

  /* ── Перегляд фото на весь екран ── */
  var lb = $('#lightbox'), lbItems = [], lbIndex = 0;
  var openLightbox = function () {};
  if (lb) {
    var lbImg = $('img', lb), lbCap = $('figcaption', lb);
    var lbShow = function (i) {
      var n = lbItems.length;
      lbIndex = (i + n) % n;
      lbImg.src = lbItems[lbIndex].src;
      lbImg.alt = lbItems[lbIndex].caption || '';
      lbCap.textContent = lbItems[lbIndex].caption || '';
      $$('.lightbox__nav', lb).forEach(function (b) { b.hidden = n < 2; });
    };
    openLightbox = function (items, i) {
      if (!items.length) return;
      lbItems = items; lbShow(i);
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    };
    $('[data-close]', lb).addEventListener('click', function () { lb.close(); });
    $('[data-prev]', lb).addEventListener('click', function () { lbShow(lbIndex - 1); });
    $('[data-next]', lb).addEventListener('click', function () { lbShow(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
      if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    });
  }

  // Галерея альбомами: рахуємо, скільки фото альбому справді є, і показуємо число
  $$('.gal__card').forEach(function (card) {
    var names = (card.getAttribute('data-album') || '').split(',')
      .map(function (t) { return t.trim(); }).filter(Boolean);
    var title = card.getAttribute('data-title') || '';
    var countEl = $('.gal__count', card);
    var found = [];
    var done = 0;
    var finish = function () {
      if (++done < names.length) return;
      if (!found.length) { countEl.textContent = 'фото скоро'; return; }
      countEl.textContent = found.length + ' фото';
      var cover = new Image();
      cover.src = found[0];
      cover.alt = title;
      card.insertBefore(cover, $('.gal__cap', card));
      card.addEventListener('click', function () {
        openLightbox(found.map(function (src) { return { src: src, caption: title }; }), 0);
      });
    };
    if (!names.length) { countEl.textContent = 'фото скоро'; return; }
    names.forEach(function (src) {
      var probe = new Image();
      probe.onload = function () { found.push(src); finish(); };
      probe.onerror = finish;
      probe.src = src;
    });
  });

  // стрілки під галереєю гортають на одну картку
  var galTrack = $('[data-gal]');
  if (galTrack) {
    $$('[data-gal-nav]').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = $('.gal__card', galTrack);
        var step = card ? card.getBoundingClientRect().width + 24 : 300;
        galTrack.scrollBy({ left: step * (+b.getAttribute('data-gal-nav')), behavior: 'smooth' });
      });
    });
  }
  /* ── Гортання фото номера (стрілки, свайп, мініатюри) ── */
  $$('.slider').forEach(function (slider) {
    var track = $('.slider__track', slider), slides = $$('.slide', slider);
    var count = $('.slider__count', slider);
    var holder = slider.closest('[data-name]');
    var name = holder ? holder.getAttribute('data-name') : '';
    var gallery = slider.closest('.room-gallery');
    var thumbs = gallery ? $$('.thumb', gallery) : [];
    var current = function () { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); };
    var go = function (i) {
      var n = slides.length;
      i = (i + n) % n;
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    };
    var sync = function () {
      var i = current();
      if (count) count.textContent = (i + 1) + ' / ' + slides.length;
      thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === i); });
    };
    $('.slider__btn--prev', slider).addEventListener('click', function () { go(current() - 1); });
    $('.slider__btn--next', slider).addEventListener('click', function () { go(current() + 1); });
    track.addEventListener('scroll', sync, { passive: true });
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () { go(parseInt(t.getAttribute('data-go'), 10) || 0); });
    });
    slides.forEach(function (sl) {
      sl.addEventListener('click', function () {
        if (!hasImg(sl)) return;
        var loaded = slides.filter(hasImg);
        openLightbox(loaded.map(function (x) {
          return { src: x.getAttribute('data-src'), caption: name };
        }), loaded.indexOf(sl));
      });
    });
  });

  /* ==========================================================
     БРОНЮВАННЯ: дати + гості (як на trivago), пошук, результати
     ========================================================== */
  var MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  var MON = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];
  var WD = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var LIMITS = { adults: [1, 8], children: [0, 6], rooms: [1, 3] };

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var toISO = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var fmtLong = function (iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; };
  var fmtShort = function (iso) { var d = parse(iso); return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  var nights = function (a, b) { return Math.round((parse(b) - parse(a)) / 864e5); };
  var plural = function (n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  var nightsText = function (n) { return n + ' ' + plural(n, 'ніч', 'ночі', 'ночей'); };
  var money = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₴'; };
  var todayISO = toISO(new Date());

  // Вибір зберігається між сторінками (головна → номери → номер)
  var KEY = 'filin-search';
  var S = { in: '', out: '', adults: 2, children: 0, rooms: 1, gset: false };   // gset — гостей обрав сам гість
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved) Object.keys(S).forEach(function (k) { if (saved[k] !== undefined) S[k] = saved[k]; });
  } catch (x) {}
  if (S.in && S.in < todayISO) { S.in = ''; S.out = ''; }
  var save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (x) {} };
  var guestsText = function () {
    var t = S.adults + ' ' + plural(S.adults, 'дорослий', 'дорослих', 'дорослих');
    if (S.children) t += ', ' + S.children + ' ' + plural(S.children, 'дитина', 'дитини', 'дітей');
    return S.rooms > 1 ? t + ' · ' + S.rooms + ' ' + plural(S.rooms, 'номер', 'номери', 'номерів') : t;
  };
  // гостей не може бути більше, ніж вміщують обрані номери
  var clampGuests = function (cap) {
    if (!cap) return;
    var max = cap * S.rooms;
    if (S.adults <= max) return;
    S.adults = Math.max(1, Math.min(S.adults, max));
    // дітей не чіпаємо — вони не входять у місткість
  };
  var listeners = [];
  var changed = function () { save(); listeners.forEach(function (fn) { fn(); }); };

  function initWidget(bw) {
    var cal = $('[data-cal]', bw);
    var view = S.in ? parse(S.in) : new Date();
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    // якщо показуємо один місяць, а до його кінця менше тижня — одразу відкриваємо наступний
    var now = new Date();
    if (!S.in && (+bw.getAttribute('data-months') || 2) === 1 &&
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() < 7) {
      view = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    var openPanel = null;

    var setText = function () {
      $('[data-text="dates"]', bw).textContent = S.in && S.out
        ? fmtShort(S.in) + ' — ' + fmtShort(S.out) + ' · ' + nightsText(nights(S.in, S.out))
        : (S.in ? fmtShort(S.in) + ' — оберіть виїзд' : 'Оберіть дати');
      var gt = $('[data-text="guests"]', bw);
      if (gt) gt.textContent = guestsText();
      $('[data-text="hint"]', bw).textContent = !S.in ? 'Оберіть дату заїзду'
        : !S.out ? 'Оберіть дату виїзду' : nightsText(nights(S.in, S.out));
      var box = bw.closest('.booking');
      var cap = box ? +box.getAttribute('data-cap') || 0 : 0;
      var full = cap && S.adults >= cap * S.rooms;
      Object.keys(LIMITS).forEach(function (k) {
        if (!$('[data-val="' + k + '"]', bw)) return;
        $('[data-val="' + k + '"]', bw).textContent = S[k];
        $$('[data-step="' + k + '"]', bw).forEach(function (b) {
          var d = +b.getAttribute('data-d');
          b.disabled = d < 0 ? S[k] <= LIMITS[k][0] : S[k] >= LIMITS[k][1] || (full && k !== 'rooms');
        });
      });
      // підказка про місткість номера — під лічильниками гостей
      var gp = $('[data-panel="guests"]', bw);
      if (gp && cap) {
        var hint = $('[data-cap-hint]', gp);
        if (!hint) {
          hint = document.createElement('p');
          hint.className = 'step__hint'; hint.setAttribute('data-cap-hint', '');
          gp.insertBefore(hint, $('.btn', gp));
        }
        var room = box.getAttribute('data-room') || 'цьому номері';
        hint.textContent = 'У номері «' + room + '» — до ' + cap + ' ' + plural(cap, 'гостя', 'гостей', 'гостей') +
          (full ? '. Щоб поселити більше гостей, додайте ще номер або оберіть інший.' : '.');
      }
    };

    var renderCal = function () {
      var html = '<div class="cal__nav">' +
        '<button type="button" data-cal-nav="-1" aria-label="Попередній місяць"' +
        (view.getFullYear() === new Date().getFullYear() && view.getMonth() === new Date().getMonth() ? ' disabled' : '') + '><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>' +
        '<button type="button" data-cal-nav="1" aria-label="Наступний місяць"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div><div class="cal__months">';
      var months = +bw.getAttribute('data-months') || 2;
      for (var m = 0; m < months; m++) {
        var first = new Date(view.getFullYear(), view.getMonth() + m, 1);
        var days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        var lead = (first.getDay() + 6) % 7; // тиждень з понеділка
        html += '<div class="cal__month"><p class="cal__title">' + MONTHS[first.getMonth()] + ' ' + first.getFullYear() + '</p><div class="cal__grid">';
        ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'].forEach(function (w) { html += '<span class="cal__wd">' + w + '</span>'; });
        for (var b = 0; b < lead; b++) html += '<span></span>';
        for (var d = 1; d <= days; d++) {
          var iso = toISO(new Date(first.getFullYear(), first.getMonth(), d));
          var cls = 'cal__day';
          var busy = busyFor(curRoomId())[iso];
          if (busy) cls += ' is-busy';
          if (iso === todayISO) cls += ' is-today';
          if (iso === S.in) cls += ' is-start';
          if (iso === S.out) cls += ' is-end';
          if (S.in && S.out && iso > S.in && iso < S.out) cls += ' is-range';
          html += '<button type="button" class="' + cls + '" data-day="' + iso + '"' + (iso < todayISO || busy ? ' disabled' : '') + (busy ? ' title="Уже заброньовано"' : '') + '>' + d + '</button>';
        }
        html += '</div></div>';
      }
      cal.innerHTML = html + '</div>';
    };

    redrawCal = renderCal;

    var close = function () {
      if (!openPanel) return;
      $('[data-panel="' + openPanel + '"]', bw).hidden = true;
      $('[data-pop="' + openPanel + '"]', bw).setAttribute('aria-expanded', 'false');
      openPanel = null;
    };
    var open = function (name) {
      if (openPanel === name) { close(); return; }
      close();
      document.dispatchEvent(new CustomEvent('filin:closepops', { detail: bw }));
      openPanel = name;
      if (name === 'cal') renderCal();
      $('[data-panel="' + name + '"]', bw).hidden = false;
      $('[data-pop="' + name + '"]', bw).setAttribute('aria-expanded', 'true');
    };
    bw.openDates = function () { open('cal'); };

    $$('[data-pop]', bw).forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-pop')); });
    });
    $$('[data-pop-close]', bw).forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('filin:closepops', function (e) { if (e.detail !== bw) close(); });
    // шлях кліку беремо на момент натискання: календар перемальовується, і клікнута дата вже не в документі
    document.addEventListener('click', function (e) { if (openPanel && e.composedPath().indexOf(bw) === -1) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    cal.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-cal-nav]');
      if (nav) {
        view = new Date(view.getFullYear(), view.getMonth() + (+nav.getAttribute('data-cal-nav')), 1);
        renderCal();
        return;
      }
      var day = e.target.closest('[data-day]');
      if (!day || day.disabled) return;
      var iso = day.getAttribute('data-day');
      if (!S.in || S.out || iso <= S.in) { S.in = iso; S.out = ''; }
      else { S.out = iso; }
      renderCal(); changed();
      if (S.out) setTimeout(close, 280);
    });
    cal.addEventListener('mouseover', function (e) {
      if (!S.in || S.out) return;
      var day = e.target.closest('[data-day]');
      var h = day && !day.disabled ? day.getAttribute('data-day') : '';
      $$('[data-day]', cal).forEach(function (b) {
        var iso = b.getAttribute('data-day');
        b.classList.toggle('is-preview', !!h && iso > S.in && iso <= h);
      });
    });
    $('[data-cal-clear]', bw).addEventListener('click', function () { S.in = ''; S.out = ''; renderCal(); changed(); });

    $$('[data-step]', bw).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-step'), d = +b.getAttribute('data-d');
        S[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], S[k] + d));
        if (k !== 'rooms') S.gset = true;
        var box = bw.closest('.booking');
        if (box) clampGuests(+box.getAttribute('data-cap') || 0);
        changed();
      });
    });

    listeners.push(setText);
    setText();
  }
  $$('[data-bw]').forEach(initWidget);

  /* ── Вікна (фільтр, бронювання): кнопки «×» / «Показати» і клік по затемненню ── */
  var openDialog = function (d) {
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    d.scrollTop = 0;
  };
  $$('dialog.bpanel, dialog.dish-dlg, dialog.bk').forEach(function (d) {
    $$('[data-dialog-close]', d).forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  });

  /* ── Галочка «З дітьми»: відкриває лічильник, знята — обнуляє ── */
  var kidsOn = $('[data-kids-on]'), kidsRow = $('[data-kids-row]');
  if (kidsOn && kidsRow) {
    kidsOn.checked = S.children > 0;
    kidsRow.hidden = !kidsOn.checked;
    kidsOn.addEventListener('change', function () {
      kidsRow.hidden = !kidsOn.checked;
      if (kidsOn.checked) { if (!S.children) S.children = 1; }
      else S.children = 0;
      S.gset = true;
      changed();
    });
  }
  /* ── Номери на головній: ціни й підказка, коли гостей більше, ніж уміщує номер ── */
  var grid = $('[data-rooms]');
  if (grid) {
    var rcs = $$('.rc', grid);
    var prices = CFG.prices || {};

    var render = function () {
      var n = S.in && S.out ? nights(S.in, S.out) : 0;
      rcs.forEach(function (c) {
        var price = +prices[c.getAttribute('data-room-id')] || 0;
        var pEl = $('[data-price]', c);
        if (pEl) pEl.textContent = !price ? 'Ціну уточнимо'
          : n ? money(price * n) + ' за ' + nightsText(n) : 'від ' + money(price) + ' / ніч';
      });
      // дорослих більше, ніж уміщує найбільший номер — підказуємо подзвонити
      var maxCap = Math.max.apply(null, rcs.map(function (c) { return +c.getAttribute('data-cap'); }));
      var tooMany = S.adults > maxCap;
      var empty = $('[data-empty]');
      if (empty) empty.hidden = !tooMany;
      var rinfo = $('[data-rinfo]');
      if (rinfo) rinfo.hidden = tooMany;
      var et = $('[data-empty-text]');
      if (et) et.textContent = 'Номера на ' + S.adults + ' ' + plural(S.adults, 'дорослого', 'дорослих', 'дорослих') +
        ' у нас немає — найбільший уміщує ' + maxCap + '. Зателефонуйте — підберемо кілька номерів поруч.';
      var cu = $('[data-call-us]');
      if (cu) cu.hidden = !tooMany;
    };

    // уся картка номера відкриває його сторінку (крім кнопки «Забронювати»)
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.rc[data-href]');
      if (card && !e.target.closest('a, button')) location.href = card.getAttribute('data-href');
    });
    listeners.push(render);
    render();
  }
  /* ── «Інші номери»: гортання вбік ── */
  $$('[data-carousel]').forEach(function (c) {
    var track = $('[data-car-track]', c), btns = $$('[data-car]', c);
    var upd = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns.forEach(function (b) { b.disabled = +b.getAttribute('data-car') < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max; });
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () { track.scrollBy({ left: +b.getAttribute('data-car') * track.clientWidth * .8, behavior: 'smooth' }); });
    });
    track.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  });

  /* ── Сторінка номера: ціна й обрані дати біля кнопки «Забронювати» ── */
  var roomPrices = $$('[data-room-price]');
  if (roomPrices.length) {
    var upRoom = function () {
      var n = S.in && S.out ? nights(S.in, S.out) : 0;
      roomPrices.forEach(function (el) {
        var p = +(CFG.prices || {})[el.getAttribute('data-room-price')] || 0;
        el.textContent = !p ? 'Ціну уточнимо' : n ? money(p * n) + ' за ' + nightsText(n) : 'від ' + money(p) + ' / ніч';
      });
      $$('[data-room-dates]').forEach(function (el) {
        el.hidden = !n;
        if (n) el.textContent = fmtShort(S.in) + ' — ' + fmtShort(S.out) + ' · ' + guestsText();
      });
    };
    listeners.push(upRoom);
    upRoom();
  }

  /* ==========================================================
     ВІКНО БРОНЮВАННЯ: форма зліва, «чек» для гостя справа
     ========================================================== */
  var bk = $('#bk'), bkForm = $('#bk-form');
  if (bk && bkForm) {
    var PR = CFG.prices || {}, EXP = CFG.extras || {};
    var fe = bkForm.elements;
    var rcpt = $('[data-rcpt]', bk), go = $('.bk__go', bk), bkDone = $('.bk__done', bk), bkErr = $('.book__error', bk);
    var X = { saunaHours: 2 }, XLIM = { saunaHours: [1, 4] };
    var capNote = false;   // показати підказку про місткість (натиснули «+» у повному номері або гостей зменшили)
    var bkNo = '', daysKey = null;
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var priceText = function (v) { return v > 0 ? money(v) : 'уточнимо'; };
    // прокрутка всередині вікна так, щоб верхня смуга не закривала блок
    var bkScrollTo = function (el) {
      var top = el.getBoundingClientRect().top - bk.getBoundingClientRect().top + bk.scrollTop - $('.bk__bar', bk).offsetHeight - 14;
      bk.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    };
    var getRoom = function () {
      var r = $('input[name="room"]:checked', bkForm);
      return r ? { id: r.value, name: r.getAttribute('data-name'), cap: +r.getAttribute('data-cap') } : null;
    };
    var on = function (k) { return !!(fe[k] && fe[k].checked); };
    var val = function (k) { return fe[k] ? String(fe[k].value).trim() : ''; };
    var viaVal = function () { var r = $('input[name="via"]:checked', bkForm); return r ? r.value : ''; };
    var dayText = function (iso) { return iso ? fmtShort(iso) : 'у день заїзду'; };
    var guestsLine = function () {
      return S.adults + ' ' + plural(S.adults, 'дорослий', 'дорослих', 'дорослих') +
        (S.children ? ', ' + S.children + ' ' + plural(S.children, 'дитина', 'дитини', 'дітей') : '');
    };
    // дні проживання — для вибору дня сауни й більярду
    var fillDays = function () {
      var days = [];
      if (S.in && S.out) {
        for (var d = parse(S.in), end = parse(S.out); d < end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(toISO(d));
      }
      $$('select[data-days]', bkForm).forEach(function (sel) {
        var cur = sel.value;
        sel.innerHTML = days.length
          ? days.map(function (iso) { return '<option value="' + iso + '">' + fmtShort(iso) + '</option>'; }).join('')
          : '<option value="">у день заїзду</option>';
        if (days.indexOf(cur) > -1) sel.value = cur;
      });
    };
    // що треба, щоб надіслати
    var missing = function () {
      var m = [];
      if (!getRoom()) m.push('номер');
      if (!S.in || !S.out) m.push('дати');
      if (!val('name')) m.push('ім’я');
      if (val('phone').replace(/\D/g, '').length < 9) m.push('телефон');
      return m;
    };
    // рядки «чеку»: [назва, значення, дрібний підпис, ціна|undefined, порожньо?]
    var build = function () {
      var r = getRoom(), n = S.in && S.out ? nights(S.in, S.out) : 0;
      var main = [], money_ = [], info = [], sum = 0, unknown = false;
      main.push(['Номер', r ? '«' + r.name + '»' + (S.rooms > 1 ? ' × ' + S.rooms : '') : 'оберіть номер', '', undefined, !r]);
      main.push(['Заїзд', S.in ? fmtShort(S.in) : 'оберіть дату', '', undefined, !S.in]);
      main.push(['Виїзд', S.out ? fmtShort(S.out) : 'оберіть дату', '', undefined, !S.out]);
      main.push(['Гості', guestsLine(), '', undefined, false]);
      var add = function (name, detail, v) {
        if (v > 0) sum += v; else unknown = true;
        money_.push([name, '', detail, v, false]);
      };
      if (r && n) {
        var pn = +PR[r.id] || 0;
        add('Проживання', nightsText(n) + (S.rooms > 1 ? ' × ' + S.rooms + ' номери' : '') + (pn ? ' × ' + money(pn) : ''), pn * n * S.rooms);
      } else {
        money_.push(['Проживання', '—', 'з’явиться після вибору дат', undefined, true]);
      }
      if (on('sauna')) add('Прогрів сауни', dayText(val('saunaDay')) + ', ' + val('saunaTime') + ' · ' + X.saunaHours + ' год', (+EXP.sauna || 0) * X.saunaHours);
      info.push(['Ім’я', val('name') || 'не вказано', '', undefined, !val('name')]);
      info.push(['Телефон', val('phone') || 'не вказано', '', undefined, !val('phone')]);
      info.push(['Зв’язок', viaVal(), '', undefined, false]);
      if (val('note')) info.push(['Побажання', val('note'), '', undefined, false]);
      var total = !r || !n ? '—' : sum && unknown ? money(sum) + ' + уточнимо' : sum ? money(sum) : 'уточнимо';
      return { r: r, n: n, main: main, money: money_, info: info, total: total, sum: sum, unknown: unknown };
    };

    var render = function () {
      if (daysKey !== S.in + S.out) { daysKey = S.in + S.out; fillDays(); }
      // картки послуг: позначені розкриваються, біля кожної — ціна
      $$('.bk-ex', bkForm).forEach(function (box) {
        var k = box.getAttribute('data-ex'), more = $('.bk-ex__more', box);
        box.classList.toggle('is-on', on(k));
        if (more) more.hidden = !on(k);
        var p = +EXP[k] || 0;
        $('[data-ex-price]', box).textContent = p ? money(p) + ' / год' : 'ціну уточнимо';
      });
      Object.keys(X).forEach(function (k) {
        var o = $('[data-xval="' + k + '"]', bkForm);
        if (o) o.textContent = X[k] + ' год';
        $$('[data-xstep="' + k + '"]', bkForm).forEach(function (b) {
          b.disabled = +b.getAttribute('data-d') < 0 ? X[k] <= XLIM[k][0] : X[k] >= XLIM[k][1];
        });
      });

      // гостей більше, ніж уміщує номер: пропонуємо більший номер, а якщо це найбільший — зателефонувати
      var rr = getRoom(), note = $('[data-cap-note]', bk);
      var full = rr && S.adults >= rr.cap;
      if (!full) capNote = false;
      // «+» у повному номері лишається натискним (блідим) — натискання показує підказку
      $$('[data-step][data-d="1"]', bkForm).forEach(function (btn) {
        var k = btn.getAttribute('data-step');
        if (LIMITS[k] && S[k] < LIMITS[k][1]) btn.disabled = false;
        btn.classList.toggle('is-max', !!full);
      });
      note.hidden = !(capNote && full);
      if (!note.hidden) {
        // до двох більших номерів (по одному на кожну місткість) — щоб підказка була короткою
        var all = $$('input[name="room"]', bkForm), caps = [], bigger = [];
        var maxCap = Math.max.apply(null, all.map(function (x) { return +x.getAttribute('data-cap'); }));
        all.slice().sort(function (a, b) { return a.getAttribute('data-cap') - b.getAttribute('data-cap'); }).forEach(function (x) {
          var c = +x.getAttribute('data-cap');
          if (c > rr.cap && caps.indexOf(c) === -1 && bigger.length < 2) { caps.push(c); bigger.push(x); }
        });
        var head = '<b>У номері «' + rr.name + '» — до ' + rr.cap + ' ' + plural(rr.cap, 'гостя', 'гостей', 'гостей') + '.</b> ';
        note.innerHTML = bigger.length
          ? head + 'Вас більше — оберіть ' + bigger.map(function (x) {
              return '<button type="button" class="bk__pick" data-pick="' + x.value + '">«' + x.getAttribute('data-name') + '» (до ' + x.getAttribute('data-cap') + ')</button>';
            }).join(' або ') + '. Якщо вас більше ' + maxCap + ' — ' + callHTML(true) + '.'
          : head + 'Це наш найбільший номер. Вас більше — ' + callHTML(true) + ', підберемо кілька номерів поруч.';
      }

      var R = build();
      var dl = function (rows, cls) {
        return '<dl class="rcpt__grp' + (cls ? ' ' + cls : '') + '">' + rows.map(function (x) {
          return '<div class="rcpt__row' + (x[4] ? ' is-empty' : '') + '"><dt>' + esc(x[0]) + (x[2] ? '<small>' + esc(x[2]) + '</small>' : '') + '</dt>' +
            '<dd>' + esc(x[3] !== undefined ? priceText(x[3]) : x[1]) + '</dd></div>';
        }).join('') + '</dl>';
      };
      $('[data-r-rows]', bk).innerHTML = dl(R.main) + dl(R.money, 'rcpt__grp--money') + dl(R.info);
      $('[data-r-total]', bk).textContent = R.total;
      $('[data-m-total]', bk).textContent = R.total === '—' ? 'Бронювання' : 'Разом: ' + R.total;
      $('[data-m-sum]', bk).textContent = R.r ? '«' + R.r.name + '»' + (R.n ? ' · ' + nightsText(R.n) : ' · оберіть дати') : 'Оберіть номер';
      var m = missing(), done = 4 - m.length;
      $('[data-r-bar]', bk).style.width = (done / 4 * 100) + '%';
      $('[data-r-left]', bk).textContent = m.length ? 'Заповнено ' + done + ' з 4 · залишилось: ' + m.join(', ') : 'Усе заповнено — можна надсилати';
      if (!bkErr.hidden && !m.length) bkErr.hidden = true;
    };

    var selId = '';
    var showSel = function () {
      var r = $('input[name="room"]:checked', bkForm);
      if (!r || r.value === selId) return;
      selId = r.value;
      $('[data-sel-name]', bk).textContent = '«' + r.getAttribute('data-name') + '»';
      $('[data-sel-meta]', bk).textContent = r.getAttribute('data-meta');
      $('[data-sel-ph]', bk).innerHTML = '<img src="' + r.getAttribute('data-img') + '" alt="" onerror="this.remove()">';
    };
    var setRoom = function () {
      loadBusy(curRoomId());
      showSel();
      var r = getRoom();
      bkForm.setAttribute('data-room', r ? r.name : '');
      bkForm.setAttribute('data-cap', r ? r.cap : '');
      S.rooms = 1;                                   // кілька номерів — телефоном
      if (r && S.adults > r.cap) { clampGuests(r.cap); capNote = S.gset; }   // зменшили те, що гість обрав сам — пояснюємо
      changed();
    };
    // «+» у повному номері не мовчить — пояснює, що робити
    bkForm.addEventListener('click', function (e) {
      var plus = e.target.closest('[data-step="adults"][data-d="1"]'), r = getRoom();
      if (plus && r && S.adults >= r.cap) { e.stopPropagation(); capNote = true; render(); }
    }, true);
    $('[data-cap-note]', bk).addEventListener('click', function (e) {
      var pick = e.target.closest('[data-pick]');
      if (!pick) return;
      $('input[name="room"][value="' + pick.getAttribute('data-pick') + '"]', bkForm).checked = true;
      capNote = false;
      setRoom();
      var sel = $('[data-bk-sel]', bk);                // підсвічуємо: номер змінився
      sel.classList.remove('is-new'); void sel.offsetWidth; sel.classList.add('is-new');
    });
    var lock = function (done) {
      bkForm.inert = done;
      bkForm.classList.toggle('is-locked', done);
      rcpt.classList.toggle('is-done', done);
      go.hidden = done; bkDone.hidden = !done;
    };

    bkForm.addEventListener('change', function (e) {
      if (e.target.name === 'room') setRoom(); else render();
    });
    bkForm.addEventListener('input', render);
    $$('[data-xstep]', bkForm).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-xstep');
        X[k] = Math.min(XLIM[k][1], Math.max(XLIM[k][0], X[k] + (+b.getAttribute('data-d'))));
        render();
      });
    });
    listeners.push(render);

    // «Забронювати» на картці номера, на сторінці номера й у нижній панелі
    $$('[data-book]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setDrawer(false);
        var id = btn.getAttribute('data-book');
        var radio = $('input[name="room"][value="' + id + '"]', bkForm);
        if (radio) radio.checked = true;
        var d = new Date();
        bkNo = 'F-' + pad(d.getDate()) + pad(d.getMonth() + 1) + '-' + (100 + Math.floor(Math.random() * 900));
        $('[data-r-no]', bk).textContent = '№ ' + bkNo + ' · ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
        lock(false);
        bkErr.hidden = true;
        capNote = false;
        setRoom();
        busyLoaded = {};   // бронь могли скасувати — перепитуємо
        openDialog(bk);
        // одразу показуємо календар (після цього кліку — інакше він закриє календар як «клік поза ним»)
        if (!S.in || !S.out) setTimeout(function () { $('[data-bw]', bkForm).openDates(); }, 0);
      });
    });

    // на телефоні: панель з підсумком ховається, коли «чек» на екрані
    var mbar = $('.bk__mbar', bk);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { mbar.classList.toggle('is-away', en[0].isIntersecting); }, { root: bk, threshold: .2 }).observe(rcpt);
    }
    $('[data-to-rcpt]', bk).addEventListener('click', function () { bkScrollTo(rcpt); });

    bkForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = missing(), r = getRoom();
      fe.name.classList.toggle('invalid', m.indexOf('ім’я') > -1);
      fe.phone.classList.toggle('invalid', m.indexOf('телефон') > -1);
      var msg = m.length ? 'Заповніть: ' + m.join(', ') + '.' : '';
      if (r && S.adults > r.cap * S.rooms) {
        msg += (msg ? ' ' : '') + 'У номері «' + r.name + '» до ' + r.cap + ' ' + plural(r.cap, 'гостя', 'гостей', 'гостей') + ' — додайте ще номер або оберіть інший.';
      }
      if (msg) {
        bkErr.textContent = msg; bkErr.hidden = false;
        // показуємо, що саме заповнити
        if (m[0] === 'дати') { var sec = $('[data-sec="dates"]', bkForm); $('[data-bw]', sec).openDates(); bkScrollTo(sec); }
        else if (m[0] === 'ім’я') fe.name.focus();
        else if (m[0] === 'телефон') fe.phone.focus();
        return;
      }
      bkErr.hidden = true;

      var R = build(), n = R.n, extras = [];
      if (on('sauna')) extras.push('Прогріти сауну: ' + dayText(val('saunaDay')) + ', ' + val('saunaTime') + ', ' + X.saunaHours + ' год');
      var L = ['Заявка на бронювання № ' + bkNo,
        'Номер: «' + r.name + '»',
        'Заїзд: ' + fmtLong(S.in),
        'Виїзд: ' + fmtLong(S.out) + ' (' + nightsText(n) + ')',
        'Гості: ' + guestsLine()].concat(extras);
      L.push('Ім’я: ' + val('name'), 'Телефон: ' + val('phone'), 'Зв’язок: ' + viaVal());
      if (val('note')) L.push('Побажання: ' + val('note'));
      if (R.sum) L.push('Попередньо: ' + R.total);

      var data = {
        number: bkNo, room: r.name, from: fmtLong(S.in), to: fmtLong(S.out), nights: n,
        adults: S.adults, children: S.children, rooms: S.rooms, extras: extras.join('; '),
        name: val('name'), phone: val('phone'), via: viaVal(), note: val('note'),
        total: R.sum ? R.total : 'уточнити', message: L.join('\n')
      };

      var btn = $('button[type="submit"]', go), label = $('span', btn);
      btn.disabled = true; label.textContent = 'Надсилаємо…';
      sendBooking(data).then(function () {
        lock(true);
        // на комп’ютері колонка з «чеком» гортається сама по собі, на телефоні — усе вікно
        var side = $('.bk__side', bk);
        if (getComputedStyle(side).position === 'sticky') side.scrollTop = 0;
        else bkScrollTo(bkDone);
      }, function (why) {
        bkErr.textContent = why === 'not-configured'
          ? 'Надсилання заявок ще не підключене — заявка нікуди не пішла.'
          : 'Не вдалося надіслати заявку. Перевірте інтернет і спробуйте ще раз.';
        bkErr.hidden = false;
      }).then(function () { btn.disabled = false; label.textContent = 'Надіслати заявку'; });
    });
  }

  /* ── Вакансії: список із config.js, відгук — дзвінком власнику ── */
  var vbox = $('[data-jobs]');
  if (vbox) {
    var JOBS = CFG.jobs || {};
    var jesc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var telOf = function (p) { var d = String(p).replace(/\D/g, ''); return 'tel:' + (d.length === 10 && d.charAt(0) === '0' ? '+38' + d : '+' + d); };
    // номер, на який відгукуються: головний із config.js, інакше перший зі списку вакансій
    var ownPhone = CFG.phone || (JOBS.phones && JOBS.phones[0]) || '';
    var ownTel = ownPhone ? telOf(ownPhone) : '';
    var actHTML = ownPhone
      ? '<div class="vcard__act"><a class="btn" href="' + ownTel + '"><span>Відгукнутись</span></a>' +
        '<a class="vcard__tel" href="' + ownTel + '">' + jesc(ownPhone) + '</a></div>'
      : '';
    if (JOBS.list) {
      var jobs = JOBS.list.map(function (j) { return typeof j === 'string' ? { title: j } : j; });
      // кожна вакансія — окрема картка: значок, назва, що робити, кнопка відгуку
      vbox.innerHTML = jobs.length
        ? jobs.map(function (j) {
            return '<article class="vcard"><span class="vcard__icon" data-vicon="' + jesc(j.icon || 'dish') + '"></span>' +
              '<h2 class="vcard__h">' + jesc(j.title) + '</h2>' +
              (j.duties && j.duties.length ? '<ul class="vcard__list">' + j.duties.map(function (d) { return '<li>' + jesc(d) + '</li>'; }).join('') + '</ul>' : '') +
              actHTML + '</article>';
          }).join('')
        : '<p class="vcard vcard--none">Зараз відкритих вакансій немає. Зателефонуйте — скажемо, коли з’явиться місце.</p>';
    }
    $$('[data-vicon]').forEach(function (el) {
      el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[el.getAttribute('data-vicon')] || ICONS.dish) + '</svg>';
    });
  }

  /* ── Куди йде заявка: Google Таблиця, Telegram або інший сервіс (див. config.js) ── */
  function sendBooking(data) {
    var tg = CFG.telegram || {};
    if (CFG.googleScript) {
      // звичайний текст, без заголовків — так Google приймає запит із сайту
      return fetch(CFG.googleScript, { method: 'POST', body: JSON.stringify(data) })
        .then(function (res) { return res.json(); })
        .then(function (j) { if (!j || !j.ok) throw new Error('google'); });
    }
    if (tg.token && tg.chat) {
      return fetch('https://api.telegram.org/bot' + tg.token + '/sendMessage', {
        method: 'POST', body: new URLSearchParams({ chat_id: tg.chat, text: data.message })
      }).then(function (res) { return res.json(); })
        .then(function (j) { if (!j || !j.ok) throw new Error('telegram'); });
    }
    if (CFG.formEndpoint) {
      return fetch(CFG.formEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data)
      }).then(function (res) { if (!res.ok) throw new Error('endpoint'); });
    }
    return Promise.reject('not-configured');
  }

  /* ==========================================================
     МЕНЮ КАФЕ: страви з фото, кошик, вигляд «для офіціанта»
     ========================================================== */
  var MENU = window.FILIN_MENU || [];
  var DISH = {};
  MENU.forEach(function (c) { c.items.forEach(function (d) { d.cat = c.cat; DISH[d.id] = d; }); });
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
  var dishWord = function (n) { return plural(n, 'страва', 'страви', 'страв'); };

  var cardHTML = function (d, withQty) {
    return '<article class="dcard" data-dish="' + d.id + '">' +
      '<button type="button" class="dcard__photo ph" data-icon="dish" data-open-dish="' + d.id + '" aria-label="' + esc(d.name) + ': фото й опис">' +
        iconSVG('dish') + '<span class="ph__label">Фото страви</span><img src="dish-' + d.id + '.jpg" alt="' + esc(d.name) + '" loading="lazy"></button>' +
      '<div class="dcard__body">' +
        '<h3 class="dcard__name"><button type="button" data-open-dish="' + d.id + '">' + esc(d.name) + '</button></h3>' +
        (d.desc ? '<p class="dcard__desc">' + esc(d.desc) + '</p>' : '') +
        '<div class="dcard__foot"><b class="dcard__price">' + money(d.price) + '</b>' +
          (withQty ? '<div class="qty" data-qty="' + d.id + '"></div>' : '<a class="dcard__link" href="menu.html#dish-' + d.id + '">До меню</a>') +
        '</div></div></article>';
  };


  var menuRoot = $('[data-menu]');
  if (menuRoot) {
    // кошик зберігається в цьому браузері, доки гість не очистить його
    var CART_KEY = 'filin-cart';
    var cart = { items: {} };
    try {
      var c0 = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
      if (c0 && c0.items) cart = { items: c0.items };
    } catch (x) {}
    Object.keys(cart.items).forEach(function (id) { if (!DISH[id]) delete cart.items[id]; });
    var saveCart = function () { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (x) {} };
    var qtyOf = function (id) { return cart.items[id] || 0; };
    var count = function () { return Object.keys(cart.items).reduce(function (n, id) { return n + cart.items[id]; }, 0); };
    var total = function () { return Object.keys(cart.items).reduce(function (n, id) { return n + cart.items[id] * DISH[id].price; }, 0); };

    // розділи та страви
    $('[data-mcats]').innerHTML = MENU.map(function (c) { return '<a class="chip" href="#cat-' + c.id + '">' + esc(c.cat) + '</a>'; }).join('');
    menuRoot.innerHTML = MENU.map(function (c) {
      return '<section class="mcat" id="cat-' + c.id + '"><h2 class="mcat__title">' + esc(c.cat) + '</h2>' +
        '<div class="dgrid">' + c.items.map(function (d) { return cardHTML(d, true); }).join('') + '</div></section>';
    }).join('');
    $$('img', menuRoot).forEach(dropBroken);

    var qtyHTML = function (id, big) {
      var n = qtyOf(id);
      if (!n) return '<button type="button" class="qty__add" data-inc="' + id + '">' + (big ? 'Додати в кошик' : '+ Додати') + '</button>';
      return '<button type="button" class="qty__btn" data-dec="' + id + '" aria-label="Менше">−</button>' +
        '<output class="qty__n">' + n + '</output>' +
        '<button type="button" class="qty__btn" data-inc="' + id + '" aria-label="Більше">+</button>';
    };
    var cartDlg = $('#cart'), dishDlg = $('#dish'), bar = $('[data-open-cart]');
    var currentDish = '';

    var renderCart = function () {
      $$('[data-qty]').forEach(function (el) { el.innerHTML = qtyHTML(el.getAttribute('data-qty')); });
      var dq = $('[data-dish-qty]');
      if (dq && currentDish) dq.innerHTML = qtyHTML(currentDish, true);
      var n = count(), sum = total();
      bar.hidden = !n;
      $('[data-dock]').classList.toggle('has-cart', !!n);
      $('[data-cart-count]').textContent = n + ' ' + dishWord(n);
      $('[data-cart-sum]').textContent = money(sum);
      $('[data-cart-total]').textContent = money(sum);
      var ids = Object.keys(cart.items);
      $('[data-cart-list]').innerHTML = ids.length
        ? '<ul class="cart__list">' + ids.map(function (id) {
            var d = DISH[id];
            return '<li class="cart__item">' +
              '<p class="cart__line"><b>' + cart.items[id] + ' ×</b> ' + esc(d.name) + '</p>' +
              '<span class="cart__sum">' + money(d.price * cart.items[id]) + '</span>' +
              '<div class="qty" data-qty="' + id + '">' + qtyHTML(id) + '</div></li>';
          }).join('') + '</ul>'
        : '<p class="cart__empty">Кошик порожній. Додайте страви з меню.</p>';
      var tip = $('.cart__tip'); if (tip) tip.hidden = !ids.length;
      $('[data-cart-extra]').hidden = !ids.length;
    };
    var setQty = function (id, n) {
      if (n > 0) cart.items[id] = Math.min(n, 30); else delete cart.items[id];
      saveCart(); renderCart();
    };

    document.addEventListener('click', function (e) {
      var inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), open = e.target.closest('[data-open-dish]');
      if (inc) { var i = inc.getAttribute('data-inc'); setQty(i, qtyOf(i) + 1); return; }
      if (dec) { var j = dec.getAttribute('data-dec'); setQty(j, qtyOf(j) - 1); return; }
      if (open) { openDish(open.getAttribute('data-open-dish')); return; }
      var dc = e.target.closest('[data-menu] .dcard');
      if (dc && !e.target.closest('.qty, a')) openDish(dc.getAttribute('data-dish'));
    });

    var openDish = function (id) {
      var d = DISH[id];
      if (!d) return;
      currentDish = id;
      var ph = $('.dish-dlg__photo', dishDlg);
      var old = $('img', ph); if (old) old.remove();
      var img = new Image(); img.alt = d.name; img.src = 'dish-' + id + '.jpg'; dropBroken(img); ph.appendChild(img);
      $('[data-dish-cat]', dishDlg).textContent = d.cat;
      $('[data-dish-name]', dishDlg).textContent = d.name;
      $('[data-dish-desc]', dishDlg).textContent = d.desc || '';
      $('[data-dish-price]', dishDlg).textContent = money(d.price);
      renderCart();
      openDialog(dishDlg);
    };
    dishDlg.addEventListener('close', function () { currentDish = ''; });

    // кошик
    bar.addEventListener('click', function () { openDialog(cartDlg); });
    $$('[data-cart-clear]').forEach(function (b) {
      b.addEventListener('click', function () {
        cart = { items: {} };
        saveCart(); renderCart(); cartDlg.close();
      });
    });

    renderCart();

    // «Розділи»: список розділів у вікні + назва поточного розділу на нижній панелі
    var secDlg = $('#sections'), secList = $('[data-sections]'), cur = $('[data-dock-cur]');
    secList.innerHTML = MENU.map(function (c, i) {
      return '<li><button type="button" data-goto="cat-' + c.id + '">' +
        '<span class="sections__n">' + pad(i + 1) + '</span>' +
        '<span class="sections__name">' + esc(c.cat) + '</span>' +
        '<span class="sections__count">' + c.items.length + ' ' + dishWord(c.items.length) + '</span></button></li>';
    }).join('');
    $('[data-open-sections]').addEventListener('click', function () { openDialog(secDlg); });
    secList.addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (!b) return;
      secDlg.close();
      userScrolled = true;
      document.getElementById(b.getAttribute('data-goto')).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var setCur = function (id) {
      var c = MENU.filter(function (x) { return 'cat-' + x.id === id; })[0];
      if (!c) return;
      cur.textContent = c.cat;
      $$('[data-goto]', secList).forEach(function (b) { b.classList.toggle('is-cur', b.getAttribute('data-goto') === id); });
      $$('[data-mcats] .chip').forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + id); });
    };
    setCur('cat-' + MENU[0].id);
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) setCur(en.target.id); });
      }, { rootMargin: '-35% 0px -60% 0px' });
      $$('.mcat').forEach(function (sec) { spy.observe(sec); });
    }

    // посилання з головної: menu.html#dish-borshch — одразу відкриваємо страву
    var m = location.hash.match(/^#dish-(.+)$/);
    if (m && DISH[m[1]]) {
      var card = $('[data-dish="' + m[1] + '"]');
      userScrolled = true;   // не повертати сторінку вгору — ми вже на потрібній страві
      if (card) card.scrollIntoView({ block: 'center' });
      openDish(m[1]);
    }
  }
})();
