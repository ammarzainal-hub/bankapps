/**
 * BankApps — Rekod Keluar Masuk Duit
 * KONFIGURASI NAMA TAB SHEET
 */
const DATA_SHEET           = 'DATA';
const KATEGORI_MASUK_SHEET = 'KATEGORI_MASUK';
const KATEGORI_KELUAR_SHEET = 'KATEGORI_KELUAR';
const CONFIG_SHEET         = 'KONFIG';
const CACHE_TTL            = 7200;
const PAGE_SIZE            = 25;

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
    var yearsToClear = year ? [year] : [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
    if (bank) {
      yearsToClear.forEach(function(y) {
        cache.remove('tx_' + bank + '_' + y);
      });
    } else {
      var config = getConfigDirect();
      config.bankList.forEach(function(b) {
        yearsToClear.forEach(function(y) {
          cache.remove('tx_' + b + '_' + y);
        });
      });
    }
    yearsToClear.forEach(function(y) { cache.remove('charts_' + y); });
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

function generateTransferID() {
  return 'T' + new Date().getTime();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BankApps — Rekod Bank')
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
  for (var i = 2; i <= lastRow; i++) {
    var cellVal = sheet.getRange(i, 1).getValue();
    if (cellVal && cellVal.toString().trim() === name) {
      sheet.deleteRow(i);
      invalidateCache();
      return { status: 'success', message: 'Kategori ' + name + ' berjaya dipadam' };
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

function saveConfig(initialBalances, initialIcons) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!sheet) return { status: 'error', message: 'Tab KONFIG tidak dijumpai' };

  initialIcons = initialIcons || {};
  var bankList = Object.keys(initialBalances);
  var rows = [];

  rows.push(['BankList', bankList.join(', '), '']);
  bankList.forEach(function(bank) {
    rows.push(['BakiAwal_' + bank, initialBalances[bank], (initialIcons[bank] || '')]);
  });

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  invalidateCache();
  return { status: 'success', message: 'Konfigurasi dikemaskini' };
}

// ============================================================
//   BANK CRUD
// ============================================================

function addBank(bankName, initialBalance, icon) {
  var safeName = sanitize(bankName, 50);
  if (!safeName) return { status: 'error', message: 'Nama bank diperlukan' };

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
  if (!oldName || !newName) return { status: 'error', message: 'Nama lama dan baru diperlukan' };
  if (oldName === newName) return { status: 'error', message: 'Nama bank tidak berubah' };

  var config = getConfigDirect();
  if (config.bankList.indexOf(oldName) === -1) {
    return { status: 'error', message: 'Bank ' + oldName + ' tidak wujud' };
  }
  if (config.bankList.indexOf(newName) !== -1) {
    return { status: 'error', message: 'Bank ' + newName + ' sudah wujud' };
  }

  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  var newBankList = config.bankList.map(function(b) { return b === oldName ? newName : b; });
  var usedIcon = (newIcon !== undefined && newIcon !== '') ? newIcon : (config.icons[oldName] || '');

  var rows = [['BankList', newBankList.join(', '), '']];
  newBankList.forEach(function(b) {
    var bal = b === newName ? (config.balances[oldName] || 0) : (config.balances[b] || 0);
    var ico = b === newName ? usedIcon : (config.icons[b] || '');
    rows.push(['BakiAwal_' + b, bal, ico]);
  });

  var lastRow = configSheet.getLastRow();
  if (lastRow >= 2) configSheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  configSheet.getRange(2, 1, rows.length, 3).setValues(rows);

  var dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (dataSheet && dataSheet.getLastRow() >= 2) {
    var dataLastRow = dataSheet.getLastRow();
    for (var i = 2; i <= dataLastRow; i++) {
      var cellVal = dataSheet.getRange(i, 2).getValue();
      if (cellVal === oldName) {
        dataSheet.getRange(i, 2).setValue(newName);
      }
    }
  }

  invalidateCache();
  return { status: 'success', message: 'Bank berjaya dinamakan semula', bankList: newBankList, oldName: oldName, newName: newName };
}

function updateBankIcon(bankName, icon) {
  var config = getConfigDirect();
  if (config.bankList.indexOf(bankName) === -1) {
    return { status: 'error', message: 'Bank ' + bankName + ' tidak wujud' };
  }

  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  var lastRow = configSheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    var key = configSheet.getRange(i, 1).getValue();
    if (key === 'BakiAwal_' + bankName) {
      configSheet.getRange(i, 3).setValue(icon || '');
      invalidateCache();
      return { status: 'success', message: 'Ikon bank dikemaskini' };
    }
  }

  return { status: 'error', message: 'Bank tidak dijumpai dalam KONFIG' };
}

function deleteBank(bankName) {
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
          date: row[0] instanceof Date ? Utilities.formatDate(row[0], 'GMT+8', 'yyyy-MM-dd') : String(row[0] || ''),
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
        var d = new Date(item.date);
        if (isNaN(d)) return false;
        if (bank && item.bank !== bank) return false;
        if (year && d.getFullYear() != year) return false;
        return true;
      })
      .sort(function(a, b) {
        return new Date(a.date) - new Date(b.date) || a.rowId - b.rowId;
      });
  }).filter(function(item) {
    var d = new Date(item.date);
    if (month && (d.getMonth() + 1) != month) return false;
    if (jenis && item.jenis !== jenis) return false;
    if (day && d.getDate() != parseInt(day)) return false;
    return true;
  });
}

function getTransactionsPaginated(bank, month, year, day, page, pageSize) {
  pageSize = pageSize || PAGE_SIZE;
  page = page || 1;
  var allTx = getTransactions(month, year, bank, null, day);
  var total = allTx.length;
  var totalPages = Math.ceil(total / pageSize);
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
        date: row[0] instanceof Date ? Utilities.formatDate(row[0], 'GMT+8', 'yyyy-MM-dd') : String(row[0] || ''),
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
      var d = new Date(item.date);
      if (isNaN(d)) return false;
      if (bank && item.bank !== bank) return false;
      return true;
    })
    .sort(function(a, b) {
      return new Date(a.date) - new Date(b.date) || a.rowId - b.rowId;
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
    date: row[0] instanceof Date ? Utilities.formatDate(row[0], 'GMT+8', 'yyyy-MM-dd') : String(row[0] || ''),
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
  if (!data) throw new Error('Data tidak diberikan');
  if (!isValidDate(data.date)) throw new Error('Tarikh tidak sah');
  if (!data.bank) throw new Error('Bank diperlukan');
  if (!data.jenis) throw new Error('Jenis transaksi diperlukan');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amaun mesti lebih dari 0');
  if (!data.category) throw new Error('Kategori diperlukan');

  var safeDate = new Date(data.date);
  var safeBank = sanitize(data.bank, 50);
  var safeJenis = sanitize(data.jenis, 50);
  var safeCategory = sanitize(data.category, 100);
  var safeAmount = parseFloat(data.amount);
  var safeNote = sanitize(data.note, 500);
  var safeTransferID = sanitize(data.transferID, 100);

  var config = getConfigDirect();
  var bakiAwal = config.balances[safeBank] || 0;
  var existingTx = getAllTransactions(safeBank);

  var runningBaki = bakiAwal;
  var insertIndex = existingTx.length;

  for (var i = 0; i < existingTx.length; i++) {
    if (new Date(safeDate) < new Date(existingTx[i].date)) {
      insertIndex = i;
      break;
    }
  }

  for (var i = 0; i < insertIndex; i++) {
    runningBaki = calcNextBaki(runningBaki, existingTx[i].jenis, existingTx[i].amount);
  }

  var newBaki = calcNextBaki(runningBaki, safeJenis, safeAmount);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  sheet.appendRow([safeDate, safeBank, safeJenis, safeCategory, safeAmount, safeNote, safeTransferID, newBaki]);

  recalculateBalances(safeBank);
  invalidateCache(safeBank);
  return { status: 'success', message: 'Transaksi berjaya ditambah' };
}

function addTransfer(data) {
  if (!data) throw new Error('Data tidak diberikan');
  if (!isValidDate(data.date)) throw new Error('Tarikh tidak sah');
  if (!data.fromBank || !data.toBank) throw new Error('Bank sumber dan destinasi diperlukan');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amaun mesti lebih dari 0');

  var transferID = generateTransferID();
  var safeDate = new Date(data.date);
  var safeAmount = parseFloat(data.amount);
  var safeNote = sanitize(data.note, 500);

  addTransaction({
    date: data.date,
    bank: data.fromBank,
    jenis: 'Transfer Keluar',
    category: 'Transfer',
    amount: safeAmount,
    note: safeNote || ('Transfer ke ' + data.toBank),
    transferID: transferID
  });

  addTransaction({
    date: data.date,
    bank: data.toBank,
    jenis: 'Transfer Masuk',
    category: 'Transfer',
    amount: safeAmount,
    note: safeNote || ('Transfer dari ' + data.fromBank),
    transferID: transferID
  });

  return { status: 'success', message: 'Transfer berjaya direkodkan' };
}

function updateTransaction(data) {
  if (!data) throw new Error('Data tidak diberikan');
  if (!data.rowId) throw new Error('ID transaksi diperlukan');
  if (!isValidDate(data.date)) throw new Error('Tarikh tidak sah');
  if (!data.bank) throw new Error('Bank diperlukan');
  if (!data.jenis) throw new Error('Jenis transaksi diperlukan');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amaun mesti lebih dari 0');
  if (!data.category) throw new Error('Kategori diperlukan');

  var safeRowId = parseInt(data.rowId);
  var safeDate = new Date(data.date);
  var safeBank = sanitize(data.bank, 50);
  var safeJenis = sanitize(data.jenis, 50);
  var safeCategory = sanitize(data.category, 100);
  var safeAmount = parseFloat(data.amount);
  var safeNote = sanitize(data.note, 500);
  var safeTransferID = sanitize(data.transferID || '', 100);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);

  var oldRow = sheet.getRange(safeRowId, 1, 1, 8).getValues()[0];
  var oldBank = oldRow[1] || '';

  sheet.getRange(safeRowId, 1, 1, 8)
    .setValues([[safeDate, safeBank, safeJenis, safeCategory, safeAmount, safeNote, safeTransferID, 0]]);

  recalculateBalances(safeBank);
  if (safeBank !== oldBank) recalculateBalances(oldBank);

  invalidateCache(safeBank);
  if (safeBank !== oldBank) invalidateCache(oldBank);

  return { status: 'success', message: 'Transaksi berjaya dikemaskini' };
}

// ============================================================
//   TRANSAKSI — PADAM
// ============================================================

function deleteTransaction(rowId, deletePair) {
  if (!rowId) throw new Error('ID transaksi diperlukan');
  var safeRowId = parseInt(rowId);
  deletePair = deletePair || false;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  var row = sheet.getRange(safeRowId, 1, 1, 8).getValues()[0];
  var bank = row[1] || '';
  var transferID = row[6] || '';

  if (deletePair && transferID) {
    deleteTransferPair(transferID, safeRowId);
  } else {
    sheet.deleteRow(safeRowId);
  }

  if (bank) {
    recalculateBalances(bank);
    invalidateCache(bank);
  }

  if (transferID && !deletePair) {
    var allBanks = getConfigDirect().bankList;
    allBanks.forEach(function(b) {
      if (b !== bank) {
        recalculateBalances(b);
        invalidateCache(b);
      }
    });
  }

  return { status: 'success', message: 'Transaksi berjaya dipadam' };
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
    if (pair.bank) recalculateBalances(pair.bank);
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

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  var config = getConfigDirect();
  var banksToRecalc = {};

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!isValidDate(r.date)) throw new Error('Baris ' + (i + 1) + ': Tarikh tidak sah');
    if (!r.bank) throw new Error('Baris ' + (i + 1) + ': Bank diperlukan');
    if (!r.jenis) throw new Error('Baris ' + (i + 1) + ': Jenis transaksi diperlukan');
    if (!r.amount || parseFloat(r.amount) <= 0) throw new Error('Baris ' + (i + 1) + ': Amaun mesti lebih dari 0');
    if (!r.category) throw new Error('Baris ' + (i + 1) + ': Kategori diperlukan');

    sheet.appendRow([
      new Date(r.date),
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

  for (var bank in banksToRecalc) {
    recalculateBalances(bank);
    invalidateCache(bank);
  }

  return { status: 'success', message: rows.length + ' transaksi berjaya ditambah' };
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;

  var config = getConfigDirect();
  var bakiAwal = config.balances[bank] || 0;

  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

  var bankRows = [];
  for (var i = 0; i < allData.length; i++) {
    if (allData[i][1] === bank) {
      bankRows.push({
        sheetRow: i + 2,
        date: allData[i][0] instanceof Date ? allData[i][0] : new Date(allData[i][0] || ''),
        jenis: allData[i][2] || '',
        amount: parseFloat(allData[i][4] || 0)
      });
    }
  }

  bankRows.sort(function(a, b) { return a.date - b.date || a.sheetRow - b.sheetRow; });

  var baki = bakiAwal;
  for (var j = 0; j < bankRows.length; j++) {
    baki = calcNextBaki(baki, bankRows[j].jenis, bankRows[j].amount);
    sheet.getRange(bankRows[j].sheetRow, 8).setValue(baki);
  }
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
    var categoryTotals = {};

    tx.forEach(function(t) {
      if (t.jenis === 'Masuk') totalMasuk += t.amount;
      else if (t.jenis === 'Keluar') totalKeluar += t.amount;
      else if (t.jenis === 'Transfer Masuk') totalTransferMasuk += t.amount;
      else if (t.jenis === 'Transfer Keluar') totalTransferKeluar += t.amount;

      if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
      categoryTotals[t.category] += t.amount;
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
      categoryTotals: categoryTotals
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
    var d = new Date(t.date);
    var monthIdx = d.getMonth();
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

function getFullDataForCharts(year) {
  return getCachedOrFetch('charts_' + year, function() {
    var config = getConfigDirect();
    return {
      bankList: config.bankList,
      balances: config.balances,
      icons: config.icons,
      summary: getBatchSummaryData('', year),
      yearlySummary: getYearlySummaryData(year),
      categoriesMasuk: getCategoriesMasuk(),
      categoriesKeluar: getCategoriesKeluar()
    };
  });
}
