/**
 * BankApps — Rekod Keluar Masuk Duit
 * KONFIGURASI NAMA TAB SHEET
 */
const DATA_SHEET           = 'DATA';
const KATEGORI_MASUK_SHEET = 'KATEGORI_MASUK';
const KATEGORI_KELUAR_SHEET = 'KATEGORI_KELUAR';
const CONFIG_SHEET         = 'KONFIG';

/**
 * HELPER: Sanitize input untuk elakkan XSS
 */
function sanitize(str, maxLength) {
  maxLength = maxLength || 500;
  if (!str) return '';
  return str.toString().trim().substring(0, maxLength);
}

/**
 * HELPER: Validate date format
 */
function isValidDate(dateStr) {
  if (!dateStr) return false;
  var d = new Date(dateStr);
  return d instanceof Date && !isNaN(d);
}

/**
 * HELPER: Generate unique Transfer ID
 */
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KATEGORI_MASUK_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [{ name: 'Lain-lain', icon: '📥' }];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  return data.map(function(row) {
    return { name: row[0] || 'Lain-lain', icon: row[1] || '📥' };
  }).filter(function(cat) { return cat.name; });
}

function getCategoriesKeluar() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(KATEGORI_KELUAR_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [{ name: 'Lain-lain', icon: '📤' }];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  return data.map(function(row) {
    return { name: row[0] || 'Lain-lain', icon: row[1] || '📤' };
  }).filter(function(cat) { return cat.name; });
}

// ============================================================
//   KONFIG
// ============================================================

function getConfig() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!sheet) return { bankList: ['Maybank', 'Bank Islam'], balances: {} };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { bankList: ['Maybank', 'Bank Islam'], balances: {} };

  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var config = {};
  var balances = {};
  var bankListStr = 'Maybank, Bank Islam';

  data.forEach(function(row) {
    var key = (row[0] || '').toString().trim();
    var val = (row[1] || '').toString().trim();

    if (key.startsWith('BakiAwal_')) {
      var bankName = key.replace('BakiAwal_', '');
      balances[bankName] = parseFloat(val) || 0;
    } else if (key === 'BankList') {
      bankListStr = val;
    }
  });

  var bankList = bankListStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean);

  bankList.forEach(function(bank) {
    if (balances[bank] === undefined) balances[bank] = 0;
  });

  return { bankList: bankList, balances: balances };
}

function saveConfig(initialBalances) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET);
  if (!sheet) return { status: 'error', message: 'Tab KONFIG tidak dijumpai' };

  var bankList = Object.keys(initialBalances);
  var rows = [];

  rows.push(['BankList', bankList.join(', ')]);
  bankList.forEach(function(bank) {
    rows.push(['BakiAwal_' + bank, initialBalances[bank]]);
  });

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).clearContent();
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return { status: 'success', message: 'Konfigurasi dikemaskini' };
}

// ============================================================
//   TRANSAKSI — BACA
// ============================================================

function getTransactions(month, year, bank, jenis) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

  var result = allData
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
      if (month && (d.getMonth() + 1) != month) return false;
      if (year && d.getFullYear() != year) return false;
      if (bank && item.bank !== bank) return false;
      if (jenis && item.jenis !== jenis) return false;
      return true;
    })
    .sort(function(a, b) {
      return new Date(a.date) - new Date(b.date) || a.rowId - b.rowId;
    });

  return result;
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

  var config = getConfig();
  var bakiAwal = config.balances[safeBank] || 0;
  var existingTx = getAllTransactions(safeBank);

  var runningBaki = bakiAwal;
  var insertIndex = existingTx.length;

  // Find insertion point based on date
  for (var i = 0; i < existingTx.length; i++) {
    if (new Date(safeDate) < new Date(existingTx[i].date)) {
      insertIndex = i;
      break;
    }
  }

  // Calculate new baki at insertion point
  for (var i = 0; i < insertIndex; i++) {
    runningBaki = calcNextBaki(runningBaki, existingTx[i].jenis, existingTx[i].amount);
  }

  var newBaki = calcNextBaki(runningBaki, safeJenis, safeAmount);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  sheet.appendRow([safeDate, safeBank, safeJenis, safeCategory, safeAmount, safeNote, safeTransferID, newBaki]);

  recalculateBalances(safeBank);
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

  // Record 1: Transfer Keluar from source bank
  addTransaction({
    date: data.date,
    bank: data.fromBank,
    jenis: 'Transfer Keluar',
    category: 'Transfer',
    amount: safeAmount,
    note: safeNote || ('Transfer ke ' + data.toBank),
    transferID: transferID
  });

  // Record 2: Transfer Masuk to destination bank
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
  sheet.getRange(safeRowId, 1, 1, 8)
    .setValues([[safeDate, safeBank, safeJenis, safeCategory, safeAmount, safeNote, safeTransferID, 0]]);

  recalculateBalances(safeBank);

  // If this was a transfer, also recalculate the other bank
  var existingRow = sheet.getRange(safeRowId, 1, 1, 8).getValues()[0];
  var oldBank = existingRow[1] || '';
  if (safeBank !== oldBank) recalculateBalances(oldBank);

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

  if (bank) recalculateBalances(bank);

  // If transfer and not deleting pair, also recalculate the other bank
  if (transferID && !deletePair) {
    var allBanks = getConfig().bankList;
    allBanks.forEach(function(b) {
      if (b !== bank) recalculateBalances(b);
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
  var config = getConfig();
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

  var config = getConfig();
  var bakiAwal = config.balances[bank] || 0;

  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

  // Build indexed list of rows for this bank
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

  // Sort by date
  bankRows.sort(function(a, b) { return a.date - b.date || a.sheetRow - b.sheetRow; });

  // Calculate running baki
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
  var config = getConfig();
  var bakiAwal = config.balances[bank] || 0;
  var tx = getAllTransactions(bank);

  var baki = bakiAwal;
  for (var i = 0; i < tx.length; i++) {
    baki = calcNextBaki(baki, tx[i].jenis, tx[i].amount);
  }
  return baki;
}

function getBatchSummaryData(month, year) {
  var config = getConfig();
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
  var config = getConfig();

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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  var data = { masuk: Array(12).fill(0), keluar: Array(12).fill(0) };
  if (!sheet || sheet.getLastRow() < 2) return data;

  sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues().forEach(function(row) {
    var d = new Date(row[0]);
    if (d.getFullYear() != year) return;
    if (bank && row[1] !== bank) return;

    var jenis = row[2] || '';
    var amount = parseFloat(row[4] || 0);
    var monthIdx = d.getMonth();

    if (jenis === 'Masuk' || jenis === 'Transfer Masuk') data.masuk[monthIdx] += amount;
    else if (jenis === 'Keluar' || jenis === 'Transfer Keluar') data.keluar[monthIdx] += amount;
  });

  return data;
}

function getYearlySummaryData(year) {
  var config = getConfig();
  var bankList = config.bankList;
  var result = {};

  bankList.forEach(function(bank) {
    result[bank] = getYearlyData(year, bank);
  });

  return result;
}

function getFullDataForCharts(year) {
  var config = getConfig();
  return {
    bankList: config.bankList,
    balances: config.balances,
    summary: getBatchSummaryData('', year),
    yearlySummary: getYearlySummaryData(year),
    categoriesMasuk: getCategoriesMasuk(),
    categoriesKeluar: getCategoriesKeluar()
  };
}
