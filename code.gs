/**
 * 🏦 Rekod Bank 🏦 — Rekod Keluar Masuk Duit
 * KONFIGURASI NAMA TAB SHEET
 */
const DATA_SHEET           = 'DATA';
const KATEGORI_MASUK_SHEET = 'KATEGORI_MASUK';
const KATEGORI_KELUAR_SHEET = 'KATEGORI_KELUAR';
const CONFIG_SHEET         = 'KONFIG';
const CACHE_TTL            = 7200;
const PAGE_SIZE            = 25;
const MIN_YEAR             = 2026;
const MAX_YEAR             = 2035;

// ============================================================
//   CACHE SERVICE
// ============================================================

function getCachedOrFetch(key, fetchFn) {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(key);
    if (cached !== null) {
      return JSON.parse(cached);
    }
  } catch(e) {}

  var data = fetchFn();

  try {
    var cache = CacheService.getScriptCache();
    var json = JSON.stringify(data);
    if (json.length < 90000) {
      cache.put(key, json, CACHE_TTL);
    }
  } catch(e) {}

  return data;
}

function invalidateCache(bank, year) {
  try {
    var cache = CacheService.getScriptCache();
    var yearsToClear;
    if (year) {
      yearsToClear = [year];
    } else {
      yearsToClear = [];
      var maxYear = Math.max(MAX_YEAR, new Date().getFullYear() + 2);
      for (var y = MIN_YEAR; y <= maxYear; y++) yearsToClear.push(y);
    }
    if (bank) {
      yearsToClear.forEach(function(y) {
        cache.remove('tx_' + bank + '_' + y);
        cache.remove('tx_all_' + y);
      });
    } else {
      var config = getConfigDirect();
      config.bankList.forEach(function(b) {
        yearsToClear.forEach(function(y) {
          cache.remove('tx_' + b + '_' + y);
        });
      });
      yearsToClear.forEach(function(y) { cache.remove('tx_all_' + y); });
    }
    yearsToClear.forEach(function(y) {
      cache.remove('charts_' + y);
      cache.remove('charts_all_' + y);
      for (var m = 1; m <= 12; m++) cache.remove('charts_' + m + '_' + y);
    });
    cache.remove('cat_masuk');
    cache.remove('cat_keluar');
    cache.remove('categories');
  } catch(e) {}
}

// ============================================================
//   HELPER
// ============================================================

function sanitize(str, maxLength) {
  maxLength = maxLength || 500;
  if (!str) return '';
  return str.toString().trim().substring(0, maxLength);
}

function isValidDate(dateStr) {
  if (!dateStr) return false;
  var d = new Date(dateStr);
  return d instanceof Date && !isNaN(d);
}

function getSheetOrThrow(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Tab "' + name + '" tidak dijumpai dalam Google Sheet. Sila semak.');
  return sheet;
}

function toStoredDate(dateStr) {
  var now = new Date();
  var dateOnly = formatRowDate(new Date(dateStr));
  var timeStr = Utilities.formatDate(now, 'GMT+8', 'HH:mm:ss');
  return new Date(dateOnly + 'T' + timeStr + '+08:00');
}

function generateTransferID() {
  return 'T' + new Date().getTime();
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function formatRowDate(cell) {
  return cell instanceof Date ? Utilities.formatDate(cell, 'GMT+8', 'yyyy-MM-dd') : String(cell || '');
}

function parseDateParts(dateStr) {
  var m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
}

function rowMatchesExpected(row, expected) {
  if (!expected) return true;
  var rowDate = formatRowDate(row[0]);
  if (expected.date && rowDate !== expected.date) return false;
  if (expected.bank && (row[1] || '').toString() !== expected.bank) return false;
  if (expected.amount !== undefined && expected.amount !== null &&
      Math.abs(parseFloat(row[4] || 0) - parseFloat(expected.amount)) > 0.005) return false;
  if ((row[6] || '').toString() !== (expected.transferID || '').toString()) return false;
  return true;
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('🏦 Rekod Bank 🏦')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
//   KATEGORI
// ============================================================

function getCategoriesMasuk() {
  return getCachedOrFetch('cat_masuk', function() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KATEGORI_MASUK_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return [{ name: 'Lain-lain', icon: '📥' }];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    return data.map(function(row) {
      return { name: row[0] || 'Lain-lain', icon: row[1] || '📥' };
    }).filter(function(cat) { return cat.name; });
  });
}

function getCategoriesKeluar() {
  return getCachedOrFetch('cat_keluar', function() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KATEGORI_KELUAR_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return [{ name: 'Lain-lain', icon: '📤' }];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    return data.map(function(row) {
      return { name: row[0] || 'Lain-lain', icon: row[1] || '📤' };
    }).filter(function(cat) { return cat.name; });
  });
}

function getAllCategories() {
  return getCachedOrFetch('categories', function() {
    return {
      masuk: getCategoriesMasuk(),
      keluar: getCategoriesKeluar()
    };
  });
}

function addCategory(type, name, icon) {
  return withLock(function() { return addCategoryCore(type, name, icon); });
}

function addCategoryCore(type, name, icon) {
  if (!type || !name) return { status: 'error', message: 'Jenis kategori dan nama diperlukan' };
  var safeType = type.toLowerCase();
  if (safeType !== 'masuk' && safeType !== 'keluar') return { status: 'error', message: 'Jenis kategori tidak sah' };

  var sheetName = safeType === 'masuk' ? KATEGORI_MASUK_SHEET : KATEGORI_KELUAR_SHEET;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { status: 'error', message: 'Tab ' + sheetName + ' tidak dijumpai' };

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i][0] && existing[i][0].toString().trim().toLowerCase() === name.toLowerCase()) {
        return { status: 'error', message: 'Kategori ' + name + ' sudah wujud' };
      }
    }
  }

  sheet.appendRow([sanitize(name, 100), sanitize(icon, 10)]);
  invalidateCache();
  return { status: 'success', message: 'Kategori ' + name + ' berjaya ditambah' };
}

function deleteCategory(type, name) {
  return withLock(function() { return deleteCategoryCore(type, name); });
}

function deleteCategoryCore(type, name) {
  if (!type || !name) return { status: 'error', message: 'Jenis kategori dan nama diperlukan' };
  var safeType = type.toLowerCase();
  if (safeType !== 'masuk' && safeType !== 'keluar') return { status: 'error', message: 'Jenis kategori tidak sah' };

  var dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (dataSheet && dataSheet.getLastRow() >= 2) {
    var data = dataSheet.getRange(2, 4, dataSheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === name) {
        return { status: 'error', message: 'Kategori ' + name + ' sedang digunakan. Tidak boleh dipadam.' };
      }
    }
  }

  var sheetName = safeType === 'masuk' ? KATEGORI_MASUK_SHEET : KATEGORI_KELUAR_SHEET;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { status: 'error', message: 'Tab ' + sheetName + ' tidak dijumpai' };

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (vals[i][0] && vals[i][0].toString().trim() === name) {
        sheet.deleteRow(i + 2);
        invalidateCache();
        return { status: 'success', message: 'Kategori ' + name + ' berjaya dipadam' };
      }
    }
  }

  return { status: 'error', message: 'Kategori ' + name + ' tidak dijumpai' };
}

// ============================================================
//   KONFIG (with icons in column C)
// ============================================================

function getConfigDirect() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!sheet) return { bankList: ['Maybank', 'Bank Islam'], balances: {}, icons: {} };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { bankList: ['Maybank', 'Bank Islam'], balances: {}, icons: {} };

  var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var balances = {};
  var icons = {};
  var bankListStr = 'Maybank, Bank Islam';

  data.forEach(function(row) {
    var key = (row[0] || '').toString().trim();
    var val = (row[1] || '').toString().trim();
    var ico = (row[2] || '').toString().trim();

    if (key.startsWith('BakiAwal_')) {
      var bankName = key.replace('BakiAwal_', '');
      balances[bankName] = parseFloat(val) || 0;
      if (ico) icons[bankName] = ico;
    } else if (key === 'BankList') {
      bankListStr = val;
    }
  });

  var bankList = bankListStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean);

  bankList.forEach(function(bank) {
    if (balances[bank] === undefined) balances[bank] = 0;
    if (!icons[bank]) icons[bank] = '';
  });

  return { bankList: bankList, balances: balances, icons: icons };
}

function getConfig() {
  return getConfigDirect();
}

// ============================================================
//   BANK CRUD
// ============================================================

function addBank(bankName, initialBalance, icon) {
  return withLock(function() { return addBankCore(bankName, initialBalance, icon); });
}

function addBankCore(bankName, initialBalance, icon) {
  var safeName = sanitize(bankName, 50);
  if (!safeName) return { status: 'error', message: 'Nama bank diperlukan' };
  if (safeName.indexOf(',') !== -1) return { status: 'error', message: 'Nama bank tidak boleh mengandungi koma' };

  var config = getConfigDirect();
  if (config.bankList.indexOf(safeName) !== -1) {
    return { status: 'error', message: 'Bank ' + safeName + ' sudah wujud' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!sheet) return { status: 'error', message: 'Tab KONFIG tidak dijumpai' };

  var newBankList = config.bankList.concat([safeName]);
  var rows = [['BankList', newBankList.join(', '), '']];
  newBankList.forEach(function(b) {
    var bal = b === safeName ? (initialBalance || 0) : (config.balances[b] || 0);
    var ico = b === safeName ? (icon || '') : (config.icons[b] || '');
    rows.push(['BakiAwal_' + b, bal, ico]);
  });

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);

  invalidateCache();
  return { status: 'success', message: 'Bank ' + safeName + ' berjaya ditambah', bankList: newBankList };
}

function updateBankLabel(oldName, newName, newIcon) {
  return withLock(function() { return updateBankLabelCore(oldName, newName, newIcon); });
}

function updateBankLabelCore(oldName, newName, newIcon) {
  if (!oldName || !newName) return { status: 'error', message: 'Nama lama dan baru diperlukan' };
  var safeNewName = sanitize(newName, 50);
  if (!safeNewName) return { status: 'error', message: 'Nama bank baru diperlukan' };
  if (safeNewName.indexOf(',') !== -1) return { status: 'error', message: 'Nama bank tidak boleh mengandungi koma' };
  if (oldName === safeNewName) return { status: 'error', message: 'Nama bank tidak berubah' };

  var config = getConfigDirect();
  if (config.bankList.indexOf(oldName) === -1) {
    return { status: 'error', message: 'Bank ' + oldName + ' tidak wujud' };
  }
  if (config.bankList.indexOf(safeNewName) !== -1) {
    return { status: 'error', message: 'Bank ' + safeNewName + ' sudah wujud' };
  }

  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!configSheet) return { status: 'error', message: 'Tab KONFIG tidak dijumpai' };
  var newBankList = config.bankList.map(function(b) { return b === oldName ? safeNewName : b; });
  var usedIcon = newIcon !== undefined ? sanitize(newIcon, 10) : (config.icons[oldName] || '');

  var rows = [['BankList', newBankList.join(', '), '']];
  newBankList.forEach(function(b) {
    var bal = b === safeNewName ? (config.balances[oldName] || 0) : (config.balances[b] || 0);
    var ico = b === safeNewName ? usedIcon : (config.icons[b] || '');
    rows.push(['BakiAwal_' + b, bal, ico]);
  });

  var lastRow = configSheet.getLastRow();
  if (lastRow >= 2) configSheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  configSheet.getRange(2, 1, rows.length, 3).setValues(rows);

  var dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (dataSheet && dataSheet.getLastRow() >= 2) {
    var bankCol = dataSheet.getRange(2, 2, dataSheet.getLastRow() - 1, 1).getValues();
    var runStart = -1;
    for (var i = 0; i <= bankCol.length; i++) {
      var isMatch = i < bankCol.length && bankCol[i][0] === oldName;
      if (isMatch && runStart === -1) runStart = i;
      if (!isMatch && runStart !== -1) {
        var runLen = i - runStart;
        var vals = [];
        for (var k = 0; k < runLen; k++) vals.push([safeNewName]);
        dataSheet.getRange(runStart + 2, 2, runLen, 1).setValues(vals);
        runStart = -1;
      }
    }
  }

  invalidateCache();
  return { status: 'success', message: 'Bank berjaya dinamakan semula', bankList: newBankList, oldName: oldName, newName: safeNewName };
}

function updateBankIcon(bankName, icon) {
  return withLock(function() { return updateBankIconCore(bankName, icon); });
}

function updateBankIconCore(bankName, icon) {
  var config = getConfigDirect();
  if (config.bankList.indexOf(bankName) === -1) {
    return { status: 'error', message: 'Bank ' + bankName + ' tidak wujud' };
  }

  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!configSheet) return { status: 'error', message: 'Tab KONFIG tidak dijumpai' };
  var lastRow = configSheet.getLastRow();
  if (lastRow >= 2) {
    var keys = configSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === 'BakiAwal_' + bankName) {
        configSheet.getRange(i + 2, 3).setValue(icon || '');
        invalidateCache();
        return { status: 'success', message: 'Ikon bank dikemaskini' };
      }
    }
  }

  return { status: 'error', message: 'Bank tidak dijumpai dalam KONFIG' };
}

function deleteBank(bankName) {
  return withLock(function() { return deleteBankCore(bankName); });
}

function deleteBankCore(bankName) {
  var config = getConfigDirect();
  if (config.bankList.indexOf(bankName) === -1) {
    return { status: 'error', message: 'Bank ' + bankName + ' tidak wujud' };
  }

  var tx = getAllTransactions(bankName);
  if (tx.length > 0) {
    return { status: 'error', message: 'Tidak boleh padam bank yang mempunyai transaksi. Sila padam semua transaksi terlebih dahulu.' };
  }

  var newBankList = config.bankList.filter(function(b) { return b !== bankName; });
  var rows = [['BankList', newBankList.join(', '), '']];
  newBankList.forEach(function(b) {
    rows.push(['BakiAwal_' + b, config.balances[b] || 0, config.icons[b] || '']);
  });

  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!configSheet) return { status: 'error', message: 'Tab KONFIG tidak dijumpai' };
  var lastRow = configSheet.getLastRow();
  if (lastRow >= 2) configSheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  if (rows.length > 0) configSheet.getRange(2, 1, rows.length, 3).setValues(rows);

  invalidateCache();
  return { status: 'success', message: 'Bank ' + bankName + ' berjaya dipadam', bankList: newBankList };
}

// ============================================================
//   TRANSAKSI — BACA
// ============================================================

function getTransactions(month, year, bank, jenis, day) {
  if (!year) year = new Date().getFullYear();
  var cacheKey = 'tx_' + (bank || 'all') + '_' + year;

  return getCachedOrFetch(cacheKey, function() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return [];

    var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

    return allData
      .map(function(row, index) {
        return {
          rowId: index + 2,
          date: formatRowDate(row[0]),
          bank: row[1] || '',
          jenis: row[2] || '',
          category: row[3] || '',
          amount: parseFloat(row[4] || 0),
          note: row[5] || '',
          transferID: row[6] || '',
          baki: parseFloat(row[7] || 0)
        };
      })
      .filter(function(item) {
        if (!item.date) return false;
        var dateParts = parseDateParts(item.date);
        if (!dateParts) return false;
        if (bank && item.bank !== bank) return false;
        if (year && dateParts.year != year) return false;
        return true;
      })
      .sort(function(a, b) {
        return a.date.localeCompare(b.date) || a.rowId - b.rowId;
      });
  }).filter(function(item) {
    var dateParts = parseDateParts(item.date);
    if (!dateParts) return false;
    if (month && dateParts.month != month) return false;
    if (jenis && item.jenis !== jenis) return false;
    if (day && dateParts.day != parseInt(day, 10)) return false;
    return true;
  });
}

function getTransactionsPaginated(bank, month, year, day, page, pageSize) {
  pageSize = pageSize || PAGE_SIZE;
  page = page || 1;
  var allTx = getTransactions(month, year, bank, null, day);
  var total = allTx.length;
  var totalPages = Math.ceil(total / pageSize);
  if (totalPages > 0 && page > totalPages) page = totalPages;
  var start = (page - 1) * pageSize;
  var transactions = allTx.slice(start, start + pageSize);
  return { transactions: transactions, total: total, page: page, pageSize: pageSize, totalPages: totalPages };
}

function getTransactionsPage(bank, month, year, exactDate, search, page, pageSize, sortKey, sortDirection) {
  pageSize = pageSize || PAGE_SIZE;
  page = page || 1;
  search = (search || '').toString().trim().toLowerCase();
  var searchAmount = parseFloat(search.replace(/,/g, ''));
  sortKey = ['date', 'bank', 'jenis', 'category', 'note', 'amount', 'baki'].indexOf(sortKey) !== -1 ? sortKey : 'date';
  sortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

  var allTx = getTransactions(month, year, bank)
    .filter(function(t) {
      if (exactDate && t.date !== exactDate) return false;
      if (search) {
        var haystack = [t.note, t.category, t.jenis, t.bank].join(' ').toLowerCase();
        var amountText = (parseFloat(t.amount) || 0).toFixed(2);
        var amountCompact = amountText.replace(/\.00$/, '');
        var amountMatches = !isNaN(searchAmount) && (
          Math.abs((parseFloat(t.amount) || 0) - searchAmount) < 0.005 ||
          amountText.indexOf(search) !== -1 ||
          amountCompact.indexOf(search) !== -1
        );
        if (haystack.indexOf(search) === -1 && !amountMatches) return false;
      }
      return true;
    })
    .sort(function(a, b) {
      var va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'amount' || sortKey === 'baki') {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
      } else {
        va = (va || '').toString().toLowerCase();
        vb = (vb || '').toString().toLowerCase();
      }
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return sortDirection === 'asc' ? (a.rowId || 0) - (b.rowId || 0) : (b.rowId || 0) - (a.rowId || 0);
    });

  var total = allTx.length;
  var totalPages = Math.ceil(total / pageSize);
  if (totalPages > 0 && page > totalPages) page = totalPages;
  var start = (page - 1) * pageSize;
  var transactions = allTx.slice(start, start + pageSize);
  return { transactions: transactions, total: total, page: page, pageSize: pageSize, totalPages: totalPages };
}

function getAllTransactions(bank) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

  return allData
    .map(function(row, index) {
      return {
        rowId: index + 2,
        date: formatRowDate(row[0]),
        bank: row[1] || '',
        jenis: row[2] || '',
        category: row[3] || '',
        amount: parseFloat(row[4] || 0),
        note: row[5] || '',
        transferID: row[6] || '',
        baki: parseFloat(row[7] || 0)
      };
    })
    .filter(function(item) {
      if (!item.date) return false;
      if (!parseDateParts(item.date)) return false;
      if (bank && item.bank !== bank) return false;
      return true;
    })
    .sort(function(a, b) {
      return a.date.localeCompare(b.date) || a.rowId - b.rowId;
    });
}

function getTransactionByRowId(rowId) {
  if (!rowId) throw new Error('ID transaksi diperlukan');
  var safeRowId = parseInt(rowId);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < safeRowId || safeRowId < 2) {
    throw new Error('Transaksi tidak dijumpai');
  }

  var row = sheet.getRange(safeRowId, 1, 1, 8).getValues()[0];
  if (!row || !row[0]) throw new Error('Transaksi tidak dijumpai');

  return {
    rowId: safeRowId,
    date: formatRowDate(row[0]),
    bank: row[1] || '',
    jenis: row[2] || '',
    category: row[3] || '',
    amount: parseFloat(row[4] || 0),
    note: row[5] || '',
    transferID: row[6] || '',
    baki: parseFloat(row[7] || 0)
  };
}

// ============================================================
//   TRANSAKSI — TAMBAH / EDIT
// ============================================================

function addTransaction(data) {
  return withLock(function() { return addTransactionCore(data); });
}

function addTransactionCore(data) {
  if (!data) throw new Error('Data tidak diberikan');
  if (!isValidDate(data.date)) throw new Error('Tarikh tidak sah');
  if (!data.bank) throw new Error('Bank diperlukan');
  if (!data.jenis) throw new Error('Jenis transaksi diperlukan');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amaun mesti lebih dari 0');
  if (!data.category) throw new Error('Kategori diperlukan');

  var safeDate = toStoredDate(data.date);
  var safeBank = sanitize(data.bank, 50);
  var safeJenis = sanitize(data.jenis, 50);
  var safeCategory = sanitize(data.category, 100);
  var safeAmount = parseFloat(data.amount);
  var safeNote = sanitize(data.note, 500);
  var safeTransferID = sanitize(data.transferID, 100);

  var sheet = getSheetOrThrow(DATA_SHEET);
  sheet.appendRow([safeDate, safeBank, safeJenis, safeCategory, safeAmount, safeNote, safeTransferID, 0]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  recalculateBalances(safeBank);
  invalidateCache(safeBank);
  return { status: 'success', message: 'Transaksi berjaya ditambah' };
}

function addTransfer(data) {
  if (!data) throw new Error('Data tidak diberikan');
  if (!isValidDate(data.date)) throw new Error('Tarikh tidak sah');
  if (!data.fromBank || !data.toBank) throw new Error('Bank sumber dan destinasi diperlukan');
  if (data.fromBank === data.toBank) throw new Error('Bank sumber dan destinasi tidak boleh sama');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amaun mesti lebih dari 0');

  return withLock(function() {
    var sheet = getSheetOrThrow(DATA_SHEET);
    var transferID = generateTransferID();
    var safeDate = toStoredDate(data.date);
    var safeFromBank = sanitize(data.fromBank, 50);
    var safeToBank = sanitize(data.toBank, 50);
    var safeAmount = parseFloat(data.amount);
    var safeNote = sanitize(data.note, 500);
    var rows = [
      [safeDate, safeFromBank, 'Transfer Keluar', 'Transfer', safeAmount, safeNote || ('Transfer ke ' + safeToBank), transferID, 0],
      [safeDate, safeToBank, 'Transfer Masuk', 'Transfer', safeAmount, safeNote || ('Transfer dari ' + safeFromBank), transferID, 0]
    ];

    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);
    sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

    recalculateBalancesMulti([safeFromBank, safeToBank]);
    invalidateCache(safeFromBank);
    invalidateCache(safeToBank);

    return { status: 'success', message: 'Transfer berjaya direkodkan' };
  });
}

function updateTransaction(data) {
  return withLock(function() { return updateTransactionCore(data); });
}

function updateTransactionCore(data) {
  if (!data) throw new Error('Data tidak diberikan');
  if (!data.rowId) throw new Error('ID transaksi diperlukan');
  if (!isValidDate(data.date)) throw new Error('Tarikh tidak sah');
  if (!data.bank) throw new Error('Bank diperlukan');
  if (!data.jenis) throw new Error('Jenis transaksi diperlukan');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amaun mesti lebih dari 0');
  if (!data.category) throw new Error('Kategori diperlukan');

  var safeRowId = parseInt(data.rowId);
  var safeBank = sanitize(data.bank, 50);
  var safeJenis = sanitize(data.jenis, 50);
  var safeCategory = sanitize(data.category, 100);
  var safeAmount = parseFloat(data.amount);
  var safeNote = sanitize(data.note, 500);
  var safeTransferID = sanitize(data.transferID || '', 100);

  var sheet = getSheetOrThrow(DATA_SHEET);
  if (isNaN(safeRowId) || safeRowId < 2 || safeRowId > sheet.getLastRow()) {
    throw new Error('Transaksi tidak dijumpai. Sila refresh dan cuba lagi.');
  }

  var oldRow = sheet.getRange(safeRowId, 1, 1, 8).getValues()[0];
  if (data.expected && !rowMatchesExpected(oldRow, data.expected)) {
    throw new Error('Rekod telah berubah di tempat lain. Sila refresh dan cuba lagi.');
  }
  var oldBank = oldRow[1] || '';
  var oldTransferID = (oldRow[6] || '').toString();
  var safeDate = (formatRowDate(oldRow[0]) === String(data.date)) ? oldRow[0] : toStoredDate(data.date);

  sheet.getRange(safeRowId, 1, 1, 8)
    .setValues([[safeDate, safeBank, safeJenis, safeCategory, safeAmount, safeNote, safeTransferID, 0]]);
  sheet.getRange(safeRowId, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  var banksToRecalc = {};
  banksToRecalc[safeBank] = true;
  if (oldBank) banksToRecalc[oldBank] = true;

  if (oldTransferID) {
    var pair = findTransferPair(oldTransferID, safeRowId);
    if (pair) {
      sheet.getRange(pair.rowId, 1).setValue(safeDate);
      sheet.getRange(pair.rowId, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sheet.getRange(pair.rowId, 5).setValue(safeAmount);
      sheet.getRange(pair.rowId, 6).setValue(safeNote);
      if (pair.bank) banksToRecalc[pair.bank] = true;
    }
  }

  var recalcNames = Object.keys(banksToRecalc);
  recalculateBalancesMulti(recalcNames);
  recalcNames.forEach(function(b) { invalidateCache(b); });

  return { status: 'success', message: 'Transaksi berjaya dikemaskini' };
}

// ============================================================
//   TRANSAKSI — PADAM
// ============================================================

function deleteTransaction(rowId, deletePair, expected) {
  return withLock(function() {
    if (!rowId) throw new Error('ID transaksi diperlukan');
    var safeRowId = parseInt(rowId);
    deletePair = deletePair || false;

    var sheet = getSheetOrThrow(DATA_SHEET);
    if (isNaN(safeRowId) || safeRowId < 2 || safeRowId > sheet.getLastRow()) {
      throw new Error('Transaksi tidak dijumpai. Sila refresh dan cuba lagi.');
    }

    var row = sheet.getRange(safeRowId, 1, 1, 8).getValues()[0];
    if (expected && !rowMatchesExpected(row, expected)) {
      throw new Error('Rekod telah berubah di tempat lain. Sila refresh dan cuba lagi.');
    }

    var bank = row[1] || '';
    var transferID = row[6] || '';

    var pairBank = '';
    if (transferID) {
      var pair = findTransferPair(transferID, safeRowId);
      if (pair) pairBank = pair.bank || '';
    }

    if (deletePair && transferID) {
      deleteTransferPair(transferID, safeRowId);
    } else {
      sheet.deleteRow(safeRowId);
    }

    var banksToRecalc = {};
    if (bank) banksToRecalc[bank] = true;
    if (pairBank) banksToRecalc[pairBank] = true;
    var recalcNames = Object.keys(banksToRecalc);
    recalculateBalancesMulti(recalcNames);
    recalcNames.forEach(function(b) { invalidateCache(b); });

    return { status: 'success', message: 'Transaksi berjaya dipadam' };
  });
}

function findTransferPair(transferID, excludeRowId) {
  if (!transferID) return null;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  for (var i = 0; i < allData.length; i++) {
    if ((i + 2) !== excludeRowId && (allData[i][6] || '') === transferID) {
      return { rowId: i + 2, bank: allData[i][1] || '' };
    }
  }
  return null;
}

function deleteTransferPair(transferID, excludeRowId) {
  var pair = findTransferPair(transferID, excludeRowId);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);

  if (pair) {
    sheet.deleteRow(Math.max(excludeRowId, pair.rowId));
    if (excludeRowId !== pair.rowId) {
      sheet.deleteRow(Math.min(excludeRowId, pair.rowId));
    }
  } else {
    sheet.deleteRow(excludeRowId);
  }
}

// ============================================================
//   TRANSAKSI — PUKAL
// ============================================================

function addBulkTransactions(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new Error('Tiada data untuk ditambah');
  }

  return withLock(function() {
    var sheet = getSheetOrThrow(DATA_SHEET);
    var banksToRecalc = {};
    var toAppend = [];

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!isValidDate(r.date)) throw new Error('Baris ' + (i + 1) + ': Tarikh tidak sah');
      if (!r.bank) throw new Error('Baris ' + (i + 1) + ': Bank diperlukan');
      if (!r.jenis) throw new Error('Baris ' + (i + 1) + ': Jenis transaksi diperlukan');
      if (!r.amount || parseFloat(r.amount) <= 0) throw new Error('Baris ' + (i + 1) + ': Amaun mesti lebih dari 0');
      if (!r.category) throw new Error('Baris ' + (i + 1) + ': Kategori diperlukan');

      toAppend.push([
        toStoredDate(r.date),
        sanitize(r.bank, 50),
        sanitize(r.jenis, 50),
        sanitize(r.category, 100),
        parseFloat(r.amount),
        sanitize(r.note, 500),
        sanitize(r.transferID || '', 100),
        0
      ]);

      banksToRecalc[r.bank] = true;
    }

    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, toAppend.length, 8).setValues(toAppend);
    sheet.getRange(startRow, 1, toAppend.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

    var bankNames = Object.keys(banksToRecalc);
    recalculateBalancesMulti(bankNames);
    bankNames.forEach(function(bank) { invalidateCache(bank); });

    return { status: 'success', message: rows.length + ' transaksi berjaya ditambah' };
  });
}

// ============================================================
//   BAKI — RECALCULATE
// ============================================================

function calcNextBaki(currentBaki, jenis, amount) {
  var a = parseFloat(amount) || 0;
  if (jenis === 'Masuk' || jenis === 'Transfer Masuk') return currentBaki + a;
  if (jenis === 'Keluar' || jenis === 'Transfer Keluar') return currentBaki - a;
  return currentBaki;
}

function recalculateBalances(bank) {
  if (!bank) return;
  recalculateBalancesMulti([bank]);
}

function recalculateBalancesMulti(banks) {
  if (!banks || banks.length === 0) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;

  var config = getConfigDirect();
  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  var touched = false;

  banks.forEach(function(bank) {
    if (!bank) return;

    var bankRows = [];
    for (var i = 0; i < allData.length; i++) {
      if (allData[i][1] === bank) {
        bankRows.push({
          index: i,
          date: allData[i][0] instanceof Date ? allData[i][0] : new Date(allData[i][0] || ''),
          jenis: allData[i][2] || '',
          amount: parseFloat(allData[i][4] || 0)
        });
      }
    }

    if (bankRows.length === 0) return;

    bankRows.sort(function(a, b) { return a.date - b.date || a.index - b.index; });

    var baki = config.balances[bank] || 0;
    for (var j = 0; j < bankRows.length; j++) {
      baki = calcNextBaki(baki, bankRows[j].jenis, bankRows[j].amount);
      allData[bankRows[j].index][7] = baki;
    }
    touched = true;
  });

  if (!touched) return;

  var bakiCol = allData.map(function(row) { return [row[7]]; });
  sheet.getRange(2, 8, bakiCol.length, 1).setValues(bakiCol);
}

// ============================================================
//   BATCH DATA
// ============================================================

function getBakiSemasa(bank) {
  var config = getConfigDirect();
  var bakiAwal = config.balances[bank] || 0;
  var tx = getAllTransactions(bank);

  var baki = bakiAwal;
  for (var i = 0; i < tx.length; i++) {
    baki = calcNextBaki(baki, tx[i].jenis, tx[i].amount);
  }
  return baki;
}

function getBatchSummaryData(month, year) {
  var config = getConfigDirect();
  var bankList = config.bankList;

  var summary = { banks: {}, grandTotalMasuk: 0, grandTotalKeluar: 0 };

  bankList.forEach(function(bank) {
    var tx = getTransactions(month, year, bank);
    var totalMasuk = 0, totalKeluar = 0, totalTransferMasuk = 0, totalTransferKeluar = 0;
    var categoryTotals = {}, categoryTotalsMasuk = {}, categoryTotalsKeluar = {};

    tx.forEach(function(t) {
      var isMasuk = t.jenis === 'Masuk' || t.jenis === 'Transfer Masuk';
      var isKeluar = t.jenis === 'Keluar' || t.jenis === 'Transfer Keluar';
      if (t.jenis === 'Masuk') totalMasuk += t.amount;
      else if (t.jenis === 'Keluar') totalKeluar += t.amount;
      else if (t.jenis === 'Transfer Masuk') totalTransferMasuk += t.amount;
      else if (t.jenis === 'Transfer Keluar') totalTransferKeluar += t.amount;

      if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
      categoryTotals[t.category] += t.amount;
      if (isMasuk) {
        if (!categoryTotalsMasuk[t.category]) categoryTotalsMasuk[t.category] = 0;
        categoryTotalsMasuk[t.category] += t.amount;
      } else if (isKeluar) {
        if (!categoryTotalsKeluar[t.category]) categoryTotalsKeluar[t.category] = 0;
        categoryTotalsKeluar[t.category] += t.amount;
      }
    });

    summary.banks[bank] = {
      bakiSemasa: getBakiSemasa(bank),
      totalMasuk: totalMasuk + totalTransferMasuk,
      totalKeluar: totalKeluar + totalTransferKeluar,
      totalMasukSahaja: totalMasuk,
      totalKeluarSahaja: totalKeluar,
      totalTransferMasuk: totalTransferMasuk,
      totalTransferKeluar: totalTransferKeluar,
      count: tx.length,
      categoryTotals: categoryTotals,
      categoryTotalsMasuk: categoryTotalsMasuk,
      categoryTotalsKeluar: categoryTotalsKeluar
    };

    summary.grandTotalMasuk += summary.banks[bank].totalMasuk;
    summary.grandTotalKeluar += summary.banks[bank].totalKeluar;
  });

  return summary;
}

function getBatchBankData(bank, month, year) {
  var tx = getTransactions(month, year, bank);
  var bakiSemasa = getBakiSemasa(bank);
  var config = getConfigDirect();

  return {
    bank: bank,
    bakiAwal: config.balances[bank] || 0,
    bakiSemasa: bakiSemasa,
    transactions: tx,
    yearlyData: getYearlyData(year, bank),
    categoriesMasuk: getCategoriesMasuk(),
    categoriesKeluar: getCategoriesKeluar()
  };
}

function getYearlyData(year, bank) {
  var tx = getTransactions(null, year, bank);
  var data = { masuk: Array(12).fill(0), keluar: Array(12).fill(0) };

  tx.forEach(function(t) {
    var dateParts = parseDateParts(t.date);
    if (!dateParts) return;
    var monthIdx = dateParts.month - 1;
    var amount = parseFloat(t.amount) || 0;
    if (t.jenis === 'Masuk' || t.jenis === 'Transfer Masuk') data.masuk[monthIdx] += amount;
    else if (t.jenis === 'Keluar' || t.jenis === 'Transfer Keluar') data.keluar[monthIdx] += amount;
  });

  return data;
}

function getYearlySummaryData(year) {
  var config = getConfigDirect();
  var bankList = config.bankList;
  var result = {};

  bankList.forEach(function(bank) {
    result[bank] = getYearlyData(year, bank);
  });

  return result;
}

function getFullDataForCharts(year, month) {
  var summaryMonth = month || '';
  var cacheKey = 'charts_' + (summaryMonth || 'all') + '_' + year;
  return getCachedOrFetch(cacheKey, function() {
    var config = getConfigDirect();
    return {
      bankList: config.bankList,
      balances: config.balances,
      icons: config.icons,
      summary: getBatchSummaryData(summaryMonth, year),
      yearlySummary: getYearlySummaryData(year),
      categoriesMasuk: getCategoriesMasuk(),
      categoriesKeluar: getCategoriesKeluar()
    };
  });
}

function getMonthComparisonData(monthA, yearA, monthB, yearB) {
  return {
    monthA: getBatchSummaryData(monthA, yearA),
    monthB: getBatchSummaryData(monthB, yearB),
    bankList: getConfigDirect().bankList
  };
}
