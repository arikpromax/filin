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

  var apply = function (rooms, texts) {
    /* ціни й місткість номерів */
    CFG.prices = CFG.prices || {};
    (rooms || []).forEach(function (r) {
      var x = r.extra || {};
      var key = x.key || '';
      if (!key) return;
      CFG.prices[key] = num(r.price);
    });

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

  var remember = function (rooms, texts) {
    try { localStorage.setItem(BOX, JSON.stringify({ at: Date.now(), rooms: rooms, texts: texts })); }
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
  if (box) apply(box.rooms, box.texts);

  /* А свіже тягнемо тихо. Власник щойно змінив ціну в адмінці —
     гість побачить її за секунду, без перезавантаження. */
  Promise.all([
    get('/items?site_id=eq.' + id + '&collection=eq.rooms&order=sort_order&select=title,text,price,extra'),
    get('/texts?site_id=eq.' + id + '&select=key,value')
  ]).then(function (r) {
    apply(r[0], r[1]);
    remember(r[0], r[1]);
    repaint();
  }).catch(function () { /* бази немає — лишаємось на config.js */ });
})();
