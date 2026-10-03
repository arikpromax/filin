/* ============================================================
   Звʼязок із адмінкою (платформа arawebsite, Supabase).

   Сайт повністю працює й без бази — усе, що в config.js, це його
   налаштування за замовчуванням. Щойно в CFG.siteId зʼявиться номер
   сайту, цей файл:

     • підміняє ціни номерів, телефони, години й реквізити тим,
       що власник вписав в адмінці;
     • дає вікну бронювання дві речі — які дати вже зайняті
       і куди надіслати нову бронь.

   Порядок у сторінці: config.js → platform.js → main.js.
   Свіже з бази приїжджає за секунду, тому показуємо спершу те,
   що лишилось у памʼяті браузера з минулого разу, а щойно приїде
   нове — тихо підміняємо. База мовчить — сайт працює як раніше.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.FILIN || {};
  var id = Number(CFG.siteId || 0);
  if (!id) return;                       // номера сайту ще немає — нічого не робимо

  var DB = 'https://ortiatyxntdikaldepbp.supabase.co/rest/v1';
  var KEY = 'sb_publishable_UW1Z8ukEU1XWVCdQxIGkDw_firK4hpO'; /* публічний ключ лише на читання */

  var BR = String.fromCharCode(10);          // перенос рядка в тексті з адмінки
  var NOTNUM = new RegExp('[^\\d+]', 'g');   // усе, крім цифр і плюса
  var head = { apikey: KEY, 'Content-Type': 'application/json' };

  var get = function (path) {
    return fetch(DB + path, { headers: { apikey: KEY } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); });
  };

  /* Виклик функції бази. keep — щоб запит устиг піти, навіть коли
     вкладку вже закривають. */
  var rpc = function (name, args, keep) {
    return fetch(DB + '/rpc/' + name, {
      method: 'POST', headers: head,
      body: JSON.stringify(args || {}),
      keepalive: !!keep
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); });
  };

  /* ---------- що вміє вікно бронювання ---------- */
  window.FILIN_DB = {
    id: id,

    /* Зайняті дати для одного типу номера. Повертає ["2026-10-05", …].
       База рахує сама: дата зайнята, лише коли розібрали ВСІ номери
       цього типу (скільки їх — власник вписує в адмінці). */
    busy: function (room) {
      return rpc('booking_busy', { p_site: id, p_room: String(room || '') })
        .then(function (rows) {
          return (rows || []).map(function (r) { return typeof r === 'string' ? r : r.d; })
            .filter(Boolean);
        });
    },

    /* Зайнятий час сауни: [{day, from_hour, hours}] */
    saunaBusy: function () {
      return rpc('sauna_busy', { p_site: id }).catch(function () { return []; });
    },

    /* Оформити бронь. Повертає {ok:true, ref} або {ok:false, why}. */
    place: function (p) {
      return rpc('place_booking', {
        p_site: id,
        p_room: String(p.room || ''),
        p_in: p.from,
        p_out: p.to,
        p_adults: Number(p.adults) || 1,
        p_children: Number(p.children) || 0,
        p_rooms: Number(p.rooms) || 1,
        p_guest: p.guest || {},
        p_extras: p.extras || {},
        p_total: Number(p.total) || 0
      });
    }
  };

  /* ---------- вміст: ціни номерів і тексти ---------- */
  var num = function (v) { return Number(String(v == null ? '' : v).replace(/[^\d.]/g, '')) || 0; };

  var apply = function (rooms, texts, live) {
    /* ціни й місткість номерів */
    CFG.prices = CFG.prices || {};
    (rooms || []).forEach(function (r) {
      var x = r.extra || {};
      var key = x.key || '';
      if (!key) return;
      CFG.prices[key] = num(r.price);
    });
    if (!live) { paintGrid(rooms || []); paintBkRooms(rooms || []); }
    paintRooms(rooms || [], live);

    /* прості тексти */
    var T = {};
    (texts || []).forEach(function (r) { T[r.key] = r.value; });
    var has = function (k) { return T[k] != null && T[k] !== ''; };

    if (has('phone')) CFG.phone = T.phone;
    var phones = [T.phone, T.phone2].filter(Boolean);
    if (phones.length) CFG.phones = phones;

    CFG.hours = CFG.hours || {};
    if (has('hours_open')) CFG.hours.open = T.hours_open;
    if (has('hours_close')) CFG.hours.close = T.hours_close;

    CFG.rules = CFG.rules || {};
    if (has('check_in')) CFG.rules.checkIn = T.check_in;
    if (has('check_out')) CFG.rules.checkOut = T.check_out;

    CFG.extras = CFG.extras || {};
    if (T.sauna_price != null) CFG.extras.sauna = num(T.sauna_price);

    CFG.payment = CFG.payment || {};
    if (T.prepay != null) CFG.payment.prepay = T.prepay;
    if (T.pay_recipient != null) CFG.payment.recipient = T.pay_recipient;
    if (T.pay_iban != null) CFG.payment.iban = T.pay_iban;
    if (T.pay_edrpou != null) CFG.payment.edrpou = T.pay_edrpou;
    if (T.pay_note != null) CFG.payment.note = T.pay_note;

    /* Кожен рядок на сторінці підписаний у розмітці як data-txt="ключ".
       Тому новий текст з адмінки підхоплюється без жодної зміни коду:
       досить дописати ключ у міграції й повісити його на потрібний абзац. */
    paint(T);
  };

  /* ---------- підстановка в сторінку ---------- */
  var esc = function (t) {
    return String(t).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  };

  /* Список фото картки: в адмінці це поле «Фото», перше — головне. */
  var picsOf = function (r) {
    var x = r.extra || {};
    var list = Array.isArray(x.photos) ? x.photos.filter(Boolean) : [];
    if (!list.length && r.image_url) list = [r.image_url];
    return list;
  };

  /* Список номерів на головній. Додали номер в адмінці — зʼявиться
     картка, прибрали — зникне. Малюємо до запуску main.js: саме він
     рахує ціни й відкриває вікно бронювання з цих карток.
     Номер без своєї сторінки просто не має посилання — забронювати
     його все одно можна. */
  var paintGrid = function (rooms) {
    var grid = document.querySelector("[data-rooms]");
    if (!grid || !rooms.length) return;
    var info = grid.querySelector(".rinfo");
    Array.prototype.forEach.call(grid.querySelectorAll(".rc"), function (el) { el.remove(); });

    var html = rooms.map(function (r) {
      var x = r.extra || {};
      var key = esc(x.key || "");
      var name = esc(r.title || "");
      var pic = picsOf(r)[0] || "";
      var page = String(x.page || "").trim();
      var photo = page
        ? '<a class="rc__photo ph" data-icon="bed" href="' + esc(page) +
          '" aria-label="Відкрити номер «' + name + '»">'
        : '<div class="rc__photo ph" data-icon="bed">';
      var photoEnd = page ? "</a>" : "</div>";
      var title = page
        ? '<h3 class="rc__name"><a href="' + esc(page) + '">' + name + "</a></h3>"
        : '<h3 class="rc__name">' + name + "</h3>";
      return '<article class="rc" id="' + key + '" data-room-id="' + key +
        '" data-cap="' + esc(x.cap || 2) + '"' + (page ? ' data-href="' + esc(page) + '"' : "") + ">" +
        photo +
          '<span class="ph__label">Фото</span>' +
          (pic ? '<img src="' + esc(pic) + '" alt="Номер «' + name +
            '»" loading="lazy" onerror="this.remove()">' : "") +
          '<span class="rc__hover"><b>' + name + "</b><span>Детальніше про номер</span></span>" +
        photoEnd +
        '<div class="rc__body">' +
          '<p class="rc__kind">Номер у мотелі</p>' + title +
          '<p class="rc__meta">' + esc(x.meta || "") + "</p>" +
          '<div class="rc__foot"><p class="rc__price" data-price></p>' +
          '<button class="btn" type="button" data-book="' + key +
          '"><span>Забронювати</span></button></div>' +
        "</div></article>";
    }).join("");

    if (info) info.insertAdjacentHTML("beforebegin", html);
    else grid.insertAdjacentHTML("beforeend", html);
  };

  /* Той самий список у вікні бронювання — щоб у чеку стояла та сама назва. */
  var paintBkRooms = function (rooms) {
    var box = document.querySelector(".bk-rooms");
    if (!box || !rooms.length) return;
    box.innerHTML = rooms.map(function (r) {
      var x = r.extra || {};
      var pic = picsOf(r)[0] || "";
      return '<input type="radio" name="room" value="' + esc(x.key || "") +
        '" data-name="' + esc(r.title || "") + '" data-cap="' + esc(x.cap || 2) +
        '" data-meta="' + esc(x.meta || "") + '" data-img="' + esc(pic) + '">';
    }).join("");
  };

  /* Зручності номера: власник веде один список (колекція amenities),
     а в кожному номері ставить галочки — назви зберігаються рядками. */
  var GROUPS = ['Ванна кімната', 'Спальня', 'Інтернет', 'Медіа', 'Кухня', 'Інше'];
  var GROUP_ICON = { 'Ванна кімната': 'bath', 'Спальня': 'bed', 'Інтернет': 'wifi', 'Медіа': 'tv', 'Кухня': 'cup', 'Інше': 'dot' };
  var AMEN = [];   // увесь список зручностей сайту
  var roomAmenities = function (r) {
    var x = r.extra || {};
    var chosen = String(x.amenities || '').split(/[\n,;]+/).map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean);
    var picked = AMEN.filter(function (a) { return chosen.indexOf(String(a.title).trim().toLowerCase()) > -1; });
    var groups = GROUPS.map(function (g) {
      return {
        title: g, icon: GROUP_ICON[g],
        items: picked.filter(function (a) { return ((a.extra || {}).group || 'Інше') === g; })
          .map(function (a) { return a.title; })
      };
    });
    var cap = Number(x.cap) || 0;
    var chips = [];
    if (cap) chips.push({ icon: 'guests', text: cap === 1 ? '1 гість' : 'До ' + cap + ' гостей' });
    if (x.beds) chips.push({ icon: 'bed', text: String(x.beds).charAt(0).toUpperCase() + String(x.beds).slice(1) });
    picked.forEach(function (a) {
      var ax = a.extra || {};
      if (ax.top === true || ax.top === 'true') chips.push({ icon: GROUP_ICON[ax.group] || 'dot', text: a.title });
    });
    return { groups: groups, chips: chips, beds: x.beds || '', has: !!AMEN.length };
  };

  /* Назви, підписи й фото номерів. Картки на головній знаходимо за
     data-room-id, сторінку номера — за кнопкою «Забронювати» на ній,
     а ще оновлюємо список у вікні бронювання, щоб чек показував те саме. */
  var paintRooms = function (rooms, live) {
    var pageBtn = document.querySelector(".room-book [data-book]");
    var pageKey = pageBtn ? pageBtn.getAttribute("data-book") : "";
    var set = function (el, v) { if (el && v) el.textContent = v; };

    rooms.forEach(function (r) {
      var x = r.extra || {};
      var key = x.key || "";
      if (!key) return;
      var pics = picsOf(r);

      /* картка на головній */
      var card = document.querySelector('.rc[data-room-id="' + key + '"]');
      if (card) {
        set(card.querySelector(".rc__name a"), r.title);
        set(card.querySelector(".rc__hover b"), r.title);
        set(card.querySelector(".rc__meta"), x.meta);
        if (x.cap) card.setAttribute("data-cap", x.cap);
        var ci = card.querySelector(".rc__photo img");
        if (ci && pics[0]) ci.src = pics[0];
      }

      /* перемикач номера у вікні бронювання — з нього береться назва в чеку */
      var radio = document.querySelector('input[name="room"][value="' + key + '"]');
      if (radio) {
        if (r.title) radio.setAttribute("data-name", r.title);
        if (x.meta) radio.setAttribute("data-meta", x.meta);
        if (x.cap) radio.setAttribute("data-cap", x.cap);
        if (pics[0]) radio.setAttribute("data-img", pics[0]);
      }

      /* сторінка цього номера */
      if (key === pageKey) {
        set(document.querySelector(".room-head h1"), r.title);
        set(document.querySelector(".room-head__meta"), x.meta);
        set(document.querySelector(".room-about p"), r.text);
        var lab = document.querySelector(".room-book__label");
        if (lab && r.title) lab.textContent = "Номер «" + r.title + "»";
        if (r.title) document.title = r.title + " — мотель «Філін»";
        if (!live) paintSlider(pics, r.title || "");
        var am = roomAmenities(r);
        if (am.beds) {
          var bedsEl = document.querySelector(".rbeds");
          if (bedsEl) bedsEl.innerHTML = "<b>Ліжка:</b> " + esc(am.beds);
        }
        if (am.has) {
          // main.js ще не запущений — він сам намалює з CFG; уже запущений — малюємо одразу
          CFG.facilities = am.groups;
          CFG.roomChips = am.chips;
          if (typeof window.FILIN_FACILITIES === "function") window.FILIN_FACILITIES(am.groups);
          if (typeof window.FILIN_CHIPS === "function") window.FILIN_CHIPS(am.chips);
        }
      }
    });
  };

  /* Гортання фото на сторінці номера. Малюємо до запуску main.js —
     саме він вішає на слайди стрілки, свайп і відкриття на весь екран. */
  var paintSlider = function (pics, name) {
    var track = document.querySelector(".room-gallery .slider__track");
    var thumbs = document.querySelector(".room-gallery .thumbs");
    if (!track || !pics.length) return;
    track.innerHTML = pics.map(function (u, i) {
      return '<button class="slide ph" data-icon="bed" type="button" data-src="' + esc(u) +
        '" aria-label="Відкрити фото ' + (i + 1) + '">' +
        '<span class="ph__label">Фото ' + (i + 1) + "</span>" +
        '<img src="' + esc(u) + '" alt="' + esc(name) + ', фото ' + (i + 1) +
        '" loading="lazy" onerror="this.remove()"></button>';
    }).join("");
    if (thumbs) {
      thumbs.innerHTML = pics.map(function (u, i) {
        return '<button class="thumb ph' + (i ? "" : " is-active") +
          '" type="button" data-go="' + i + '" aria-label="Фото ' + (i + 1) + '">' +
          '<span class="ph__label">' + (i + 1) + "</span>" +
          '<img src="' + esc(u) + '" alt="" loading="lazy" onerror="this.remove()"></button>';
      }).join("");
    }
    var count = document.querySelector(".room-gallery .slider__count");
    if (count) count.textContent = "1 / " + pics.length;
  };

  /* Фото першого екрана. Завантажені в адмінці замінюють ті, що лежать
     поруч із сайтом; немає жодного — лишаються файли hero-1 і hero-2. */
  var heroTimer = 0;
  var paintHero = function (pics) {
    var box = document.querySelector(".hero__media");
    if (!box || !pics.length) return;
    /* Фото може бути скільки завгодно, тож зміну веде скрипт, а не
       покадрова анімація у стилях: вона вміє рівно два знімки. */
    box.innerHTML = pics.map(function (u, i) {
      return '<img class="hero__pic' + (i ? "" : " is-on") + '" src="' + esc(u) + '" alt="">';
    }).join("");
    if (pics.length < 2) return;
    var imgs = box.querySelectorAll(".hero__pic");
    var at = 0;
    clearInterval(heroTimer);
    heroTimer = setInterval(function () {
      imgs[at].classList.remove("is-on");
      at = (at + 1) % imgs.length;
      imgs[at].classList.add("is-on");
    }, 6000);
  };
  var paint = function (T) {
    var each = function (sel, fn) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
    };

    // Звичайні тексти. Переноси рядків лишаються переносами.
    each('[data-txt]', function (el) {
      var v = T[el.getAttribute('data-txt')];
      if (v == null || v === '') return;
      if (String(v).indexOf(BR) > -1) el.innerHTML = esc(v).split(BR).join('<br>');
      else el.textContent = v;
    });

    // Телефон: один ключ задає і напис, і посилання для дзвінка.
    each('[data-tel]', function (el) {
      var v = T[el.getAttribute('data-tel')];
      if (v == null || v === '') return;
      el.textContent = v;
      var d = String(v).replace(NOTNUM, '');
      if (d.length === 10 && d.charAt(0) === '0') d = '+38' + d;
      if (el.tagName === 'A') el.href = 'tel:' + d;
    });

    // Посилання, які власник міняє сам: Instagram, маршрут, карта.
    each('[data-link]', function (el) {
      var v = T[el.getAttribute('data-link')];
      if (v) el.href = v;
    });
  };

  /* Рядки бази розкладаємо по колекціях: один запит на весь вміст. */
  var byCol = function (rows) {
    var m = {};
    (rows || []).forEach(function (r) { (m[r.collection] = m[r.collection] || []).push(r); });
    return m;
  };

  /* Часті питання. Це звичайні <details>, скрипт їх не чіпає,
     тож список можна перемальовувати будь-коли. */
  var paintFaq = function (rows) {
    var box = document.querySelector(".faq__list");
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (r) {
      return '<details class="faq__item"><summary>' + esc(r.title) +
        '</summary><p>' + esc(r.text) + "</p></details>";
    }).join("");
  };

  /* Фотогалерея. Кожен рядок — альбом: назва, значок і список фото.
     Малюємо до запуску main.js, бо саме він вішає на картки відкриття. */
  var paintGallery = function (rows) {
    var box = document.querySelector("[data-gal]");
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (r) {
      var x = r.extra || {};
      var pics = picsOf(r);
      var name = esc(r.title);
      return '<button class="gal__card ph" type="button" data-icon="' + esc(x.icon || "cup") +
        '" data-title="' + name + '" data-album="' + esc(pics.join(",")) + '">' +
        '<span class="ph__label">' + name + "</span>" +
        '<span class="gal__cap"><span class="gal__count">фото скоро</span><b>' + name + "</b></span>" +
        '<svg class="gal__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>' +
        "</button>";
    }).join("");
  };

  /* Меню кафе. main.js читає window.FILIN_MENU один раз на старті,
     тому підставляємо збережене ДО нього, а свіже лягає в памʼять
     і підхопиться на наступному відкритті сторінки. */
  var applyMenu = function (cats, dishes) {
    if (!cats.length && !dishes.length) return;
    var byCat = {};
    var out = cats.map(function (c) {
      var key = (c.extra && c.extra.catkey) || ("c" + c.id);
      var row = { cat: c.title, id: key, items: [] };
      byCat[key] = row;
      return row;
    });
    dishes.forEach(function (d) {
      var x = d.extra || {};
      var row = byCat[x.cat];
      if (!row) return;
      row.items.push({
        id: x.dishid || ("d" + d.id),
        name: d.title,
        desc: d.text || "",
        price: num(d.price),
        img: d.image_url || "",
        top: x.top === true || x.top === "true"
      });
    });
    window.FILIN_MENU = out.filter(function (c) { return c.items.length; });
  };

  /* Увесь вміст за раз. live = true — це свіже з мережі, коли сторінка
     вже намальована: тоді меню й галерею не чіпаємо, щоб не збити
     гостю кошик і відкрите фото. */
  var applyAll = function (items, texts, live) {
    var by = byCol(items);
    AMEN = by.amenities || [];
    apply(by.rooms || [], texts, live);
    paintHero(picsOf((by.site_photos || [])[0] || {}));
    paintFaq(by.faq || []);
    if (!live) {
      paintGallery(by.gallery || []);
      applyMenu(by.mcats || [], by.menu || []);
    }
  };
  /* Ціни вже намальовані на сторінці — підміняємо їх на місці,
     щоб не перемальовувати весь блок і не збити гостю вибір. */
  var repaint = function () {
    var box = document.querySelectorAll('[data-room-price]');
    if (!box.length || typeof window.FILIN_PRICES !== 'function') return;
    window.FILIN_PRICES();
  };

  /* ---------- памʼять браузера ---------- */
  var BOX = 'filin_cfg_' + id;
  var OLD = 7 * 24 * 3600 * 1000;      // старіше тижня не беремо

  var remember = function (items, texts) {
    try { localStorage.setItem(BOX, JSON.stringify({ at: Date.now(), items: items, texts: texts })); }
    catch (e) { /* памʼять могла скінчитись — переживемо */ }
  };
  var recall = function () {
    try {
      var box = JSON.parse(localStorage.getItem(BOX) || 'null');
      if (!box || !box.at || Date.now() - box.at > OLD) return null;
      return box;
    } catch (e) { return null; }
  };

  /* Збережене прикладаємо одразу, ще до main.js — тож сторінка
     малюється одразу з правильними цінами. */
  var box = recall();
  if (box && box.items) applyAll(box.items, box.texts, false);

  /* А свіже тягнемо тихо. Власник щойно змінив ціну в адмінці —
     гість побачить її за секунду, без перезавантаження. */
  Promise.all([
    get('/items?site_id=eq.' + id +
        '&order=collection,sort_order&select=id,collection,title,text,price,image_url,extra'),
    get('/texts?site_id=eq.' + id + '&select=key,value')
  ]).then(function (r) {
    applyAll(r[0], r[1], true);
    remember(r[0], r[1]);
    repaint();
  }).catch(function () { /* бази немає — лишаємось на config.js */ });
})();
