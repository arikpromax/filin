// Скрипт для Google Таблиці: приймає заявки з сайту «Філін» (бронювання й вакансії),
// записує кожну новим рядком і (за бажанням) надсилає сповіщення в Telegram.
// Як підключити — README.md, розділ «Куди приходять заявки».

// Необов’язково: сповіщення в Telegram. Токен бота від @BotFather і ваш chat id.
// Тут їх не видно відвідувачам сайту — вони зберігаються лише у вашій таблиці.
var TELEGRAM_TOKEN = '';
var TELEGRAM_CHAT = '';

// Стовпці таблиці: [поле із сайту, заголовок]
var COLUMNS = [
  ['created',  'Коли надіслано'],
  ['number',   '№ заявки'],
  ['room',     'Номер'],
  ['from',     'Заїзд'],
  ['to',       'Виїзд'],
  ['nights',   'Ночей'],
  ['adults',   'Дорослі'],
  ['children', 'Діти'],
  ['extras',   'Додатково'],
  ['name',     'Ім’я'],
  ['phone',    'Телефон'],
  ['via',      'Зв’язок'],
  ['note',     'Побажання'],
  ['total',    'Попередня сума']
];

// Заявки на роботу (сторінка «Вакансії») — на окремий аркуш «Вакансії»
var JOB_COLUMNS = [
  ['created',  'Коли надіслано'],
  ['vacancy',  'Вакансія'],
  ['name',     'Ім’я'],
  ['phone',    'Телефон'],
  ['age',      'Вік'],
  ['about',    'Про себе']
];

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var isJob = data.kind === 'job';
  var columns = isJob ? JOB_COLUMNS : COLUMNS;
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = isJob ? (book.getSheetByName('Вакансії') || book.insertSheet('Вакансії')) : book.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(columns.map(function (c) { return c[1]; }));
    sheet.setFrozenRows(1);
  }
  data.created = new Date();
  sheet.appendRow(columns.map(function (c) {
    var v = data[c[0]];
    if (v === undefined || v === null) return '';
    // текст, що починається з = + - @, таблиця вважала б формулою (телефон +380… теж)
    return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
  }));

  if (TELEGRAM_TOKEN && TELEGRAM_CHAT) {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
      method: 'post',
      payload: { chat_id: TELEGRAM_CHAT, text: data.message || '' },
      muteHttpExceptions: true
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
