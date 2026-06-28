# Plan: Cashflow Web App v3 — Full Spec Implementation

**Base:** `Old Version/code.gs` + `Old Version/dashboard-v2.html`
**Target:** Google Apps Script Web App dengan Google Sheets database
**Date:** 2026-06-28

---

## Keadaan Semasa

| Komponen | Status |
|----------|--------|
| Google Sheets | 4 tab: DATA (kosong), KATEGORI_MASUK, KATEGORI_KELUAR, KONFIG |
| Bank | 2 bank (boleh tambah) |
| Backend | `code.gs` solid (575 baris) — CRUD, transfer, bulk, baki recalc |
| Frontend | `dashboard-v2.html` (~1100+ baris) — Bootstrap 5, dark/light, sidebar, 8 pages |
| Cache | Client-side 30s memory cache sahaja — **TIADA CacheService** |

---

## Gap Spec vs Kod Lama

| # | Keperluan Spec PDF | Ada? | Tindakan |
|---|-------------------|------|----------|
| 1 | CacheService TTL 2 jam | ❌ | Task 1 |
| 2 | Panel Sisi Visualisasi (pie per bank) | ❌ | Task 5 |
| 3 | Pagination data-table | ❌ | Task 4 + Task 7 |
| 4 | Filter Hari spesifik | ⚠️ partial | Task 7 |
| 5 | Settings: Urus Kategori | ❌ | Task 2 + Task 6 |
| 6 | Settings: Urus Label Bank | ⚠️ limited | Task 3 + Task 6 |

---

## Task List

### TASK 1: Backend — CacheService (code.gs)

**Objective:** Server-side cache dengan TTL 2 jam menggunakan `CacheService.getScriptCache()`. Invalidate cache secara targeted bila ada write operation.

**Implementation:**
- Constant: `CACHE_TTL = 7200` (saat)
- Fungsi wrapper `getCachedOrFetch(key, fetchFn)`:
  ```
  try { cache.get(key) → parse JSON → return }
  catch → fetchFn() → try cache.put(key, JSON, TTL) → return data
  ```
  Fallback: kalau cache unavailable, direct fetch. App tak crash.
- Cache key format: `tx_<bank>_<year>` — raw array transaksi per bank per tahun
- Semua summary/yearly/chart data di-**derive** dari cached raw data, bukan di-cache berasingan
- `invalidateCache(bank, year)` — clearkan keys spesifik
- Panggil `invalidateCache()` dalam: `addTransaction()`, `addBulkTransactions()`, `addTransfer()`, `updateTransaction()`, `deleteTransaction()`, `saveConfig()`, `addCategory()`, `deleteCategory()`, `addBank()`, `updateBankLabel()`, `deleteBank()`
- Modify `getTransactions()`, `getAllTransactions()`, `getBatchSummaryData()`, `getBatchBankData()`, `getFullDataForCharts()`, `getYearlyData()` guna wrapper cache

**Validation:** Buka app → 2nd load dalam 2 jam tak panggil Sheets (check logs). Buat transaksi baru → cache invalidated → data refresh.

---

### TASK 2: Backend — Category CRUD (code.gs)

**Objective:** CRUD untuk kategori Masuk dan Keluar dalam Google Sheets.

**Fungsi baru:**
- `addCategory(type, name, icon)` — type = 'masuk' | 'keluar'. Append row ke KATEGORI_MASUK / KATEGORI_KELUAR. Validation: nama unik dalam sheet.
- `deleteCategory(type, name)` — Cari dan padam row dari sheet. Validation: tak boleh padam jika kategori digunakan dalam mana-mana transaksi di DATA.
- `getAllCategories()` — Return `{ masuk: [...], keluar: [...] }` — helper untuk frontend Settings page.
- `invalidateCache()` dipanggil bila kategori berubah (sebab kategori mempengaruhi display).

**Validation:** Tambah kategori → muncul di dropdown transaksi. Padam kategori → hilang dari dropdown. Padam kategori yg digunakan → error message.

---

### TASK 3: Backend — Bank CRUD (code.gs)

**Objective:** Tambah, rename, padam bank dari KONFIG + update konsistensi data.

**Fungsi baru:**
- `addBank(bankName, initialBalance)` — Tambah `BakiAwal_<name>` ke KONFIG, update `BankList`.
- `updateBankLabel(oldName, newName)` — Update nama bank dalam KONFIG (`BankList` + `BakiAwal_` keys). Update semua rekod DATA yang guna nama lama ke nama baru. Transfer pair kekal ikut `TransferID` (bukan nama bank).
- `deleteBank(bankName)` — Padam bank dari KONFIG. Validation: tak boleh padam jika ada transaksi dalam DATA untuk bank tersebut.
- `invalidateCache()` dipanggil untuk semua bank terlibat.

**Validation:** Rename bank → semua transaksi lama tunjuk nama baru → baki kekal betul. Transfer antara bank kekal berfungsi lepas rename. Padam bank ada transaksi → error.

---

### TASK 4: Backend — Pagination API + Day Filter (code.gs)

**Objective:** Support pagination dan day-level filtering.

**Fungsi baru/modified:**
- `getTransactionsPaginated(bank, month, year, day, page, pageSize)` → Return `{ transactions, total, page, pageSize, totalPages }`
  - Internal: fetch dari cache, filter ikut month/year/day, return sliced page
  - `PAGE_SIZE = 25`
- Enhance existing `getTransactions()` — tambah parameter `day` untuk filter hari spesifik
- Enhance `getBatchBankData()` — pass day filter ke `getTransactions()`

**Validation:** Load 50+ transaksi → API return total 50, totalPages 2 → page 1 ada 25 rekod, page 2 ada 25.

---

### TASK 5: Frontend — Sidebar Pie Charts per Bank (index.html)

**Objective:** Pie/doughnut chart mini dalam sidebar submenu setiap bank, menunjukkan nisbah Masuk vs Keluar untuk bulan/tahun semasa.

**Implementation:**
- Dalam sidebar submenu "Akaun Bank", setiap bank item paparkan:
  - Nama bank + ikon (sedia ada)
  - Doughnut chart mini (Chart.js, ~40px diameter) — 2 slice: Masuk (hijau `#10b981`) + Keluar (merah `#ef4444`)
  - Label peratusan kecil
- Data dari `getBatchSummaryData()` — panggil sekali masa page load
- Render hanya bila sidebar visible (desktop). Jangan render pada mobile collapsed state.
- Update bila `loadAllData()` dipanggil (selepas refresh atau transaksi baru)

**Validation:** Sidebar tunjuk chart untuk setiap bank. Buat transaksi baru → chart update. Mobile view → chart tak render.

---

### TASK 6: Frontend — Settings Page (index.html)

**Objective:** Satu page `#page-settings` dengan 2 tab — Urus Kategori & Urus Bank. Gantikan page Konfigurasi lama.

**Implementation:**
- Page baru `#page-settings` dengan tab bar: `[Kategori] [Bank]`
- Sidebar "SISTEM" section: ganti "Konfigurasi" → "Settings"

**Tab Kategori:**
- 2 sub-tab: "Masuk" / "Keluar"
- Senarai kategori sedia ada dengan butang 🗑️ padam
- Form tambah: input nama + input emoji/icon + butang "Tambah"
- Integrasi: `addCategory()`, `deleteCategory()`, `getAllCategories()`
- Validation: tak boleh padam kategori yg digunakan

**Tab Bank:**
- Senarai bank sedia ada (dari `bankList`)
- Setiap bank: inline edit nama (pencil icon → input field → save), butang 🗑️ padam
- Borang tambah bank baru: input nama + input baki awal (RM)
- Integrasi: `addBank()`, `updateBankLabel()`, `deleteBank()`
- Auto-refresh `bankList`, update sidebar labels, dropdowns selepas perubahan
- Validation: nama unik, tak boleh padam bank ada transaksi

**Validation:** Tambah bank baru → muncul di sidebar + dropdown + semua page. Rename bank → semua UI update, data kekal. Tab Kategori → CRUD berfungsi.

---

### TASK 7: Frontend — Pagination UI + Day Filter (index.html)

**Objective:** Tambah pagination controls dan day filter ke semua transaction tables.

**Implementation:**

**Pagination (semua table: bank detail + semua transaksi):**
- `PAGE_SIZE = 25`
- Controls di bawah table: `← Previous | Page X of Y | Next →`
- Client-side slice: `transactions.slice(pageStart, pageStart + PAGE_SIZE)`
- Reset ke page 1 bila user tukar filter
- Pagination hidden bila total ≤ 25 rekod
- Tambah pagination ke `#bankTransactionBody` DAN `#allTxTableBody`

**Day Filter:**
- Date picker `#bankFilterDate` di page detail bank — dah ada, pastikan berfungsi dengan pagination
- Tambah date picker di page "Semua Transaksi" (`#allTxFilterDate` — dah ada)
- Bila user pilih tarikh, clear month/year filter (atau vice versa) untuk elak konflik
- Button "Reset" untuk clearkan semua filter

**Refresh Button 🔄:**
- Letak di topbar, sebelah filter year/month dropdown
- Ikon: 🔄
- Bila ditekan, clearkan cache untuk scope page semasa:
  - Ringkasan → semua bank, tahun dipilih
  - Detail Bank → bank tersebut, tahun dipilih
  - Carta → semua bank, tahun dipilih
  - Semua Transaksi → semua bank
- Panggil `google.script.run.invalidateCache()` atau reload data
- Toast: "Data dikemaskini 🔄"

**Validation:** 50+ rekod → pagination muncul, navigate page. Pilih tarikh → table filter ke tarikh tu sahaja. Tekan refresh → data reload, cache cleared.

---

### TASK 8: Integrasi & Polish (index.html + code.gs)

**Objective:** Kemas kini navigation, theme support, error handling, dan final polish.

**Implementation:**
- Update `doGet()` — serve `index.html` baru
- Sidebar navigation: update "SISTEM" section → "Settings" (ganti "Konfigurasi")
- Dark/light theme: pastikan semua komponen baru (pagination, settings tabs, sidebar charts) respect CSS variables
- Error boundary: semua `google.script.run` calls ada `.withFailureHandler()` yang display toast
- Cache TTL indicator: optional — tunjuk "Last updated: XX min ago" di topbar atau footer
- Mobile responsive: sidebar collapse behavior kekal berfungsi

**Validation:** Full flow — tambah transaksi → cache refresh → semua page update. Dark mode toggle → semua komponen respond. Mobile view → sidebar collapse, semua page accessible.

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Cache granularity | Raw tx data per bank per year | Kurang cache keys, semua derivasi dari satu source |
| Cache invalidation | Targeted (bank + year) | Jangan clearkan data bank lain bila transaksi di satu bank sahaja |
| Pagination | Client-side slice | Data dah di-cache, < 5000 rekod — slice < 1ms |
| Settings page | Single page, 2 tabs | Kurang sidebar clutter, UX cohesive |
| Sidebar charts | Chart.js doughnut, 40px | Kongsi library sama, mini size untuk sidebar |
| Bank rename | Name-based + TransferID pair | Transfer pair ikut ID bukan nama, selamat |
| Refresh button | Per-section cache clearing | 🔄 di topbar, targeted invalidate |
| Theme | CSS variables (sedia ada) | Dark/light kekal dengan variables, komponen baru ikut pattern |

---

## Sidebar Structure (Final)

```
MENU
 ├ Ringkasan
 ├ Akaun Bank (expandable ▼)
 │   ├ 🐯 Maybank      [●──○] 63% masuk   ← pie mini
 │   └ ☪️ Bank Islam   [○○─●] 28% masuk   ← pie mini
 ├ Transaksi (expandable ▼)
 │   ├ Semua Transaksi
 │   ├ Tambah Transaksi
 │   └ Transfer
 └ Rekod Pukal
ANALITIK
 └ Carta & Graf
SISTEM
 └ Settings  ← page dengan tab Kategori | Bank
```
**3 sections, 7 links** (sama jumlah dengan versi lama, tapi fungsi bertambah)

---

## Validation Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Buka app, load ringkasan | Cache miss → fetch dari Sheets. Reload dalam 2 jam → dari cache |
| 2 | Tambah transaksi baru | Cache invalidated, data refresh, sidebar chart update |
| 3 | Transfer antara bank | Baki kedua bank dikemaskini. Transfer pair linked via TransferID |
| 4 | Tambah 50+ transaksi, buka detail bank | Pagination tunjuk 25/page, navigate next/prev |
| 5 | Filter tarikh spesifik | Table filter ke tarikh tu sahaja |
| 6 | Tekan 🔄 di topbar | Cache cleared, data reload, toast dipapar |
| 7 | Tambah kategori baru | Muncul di dropdown transaksi |
| 8 | Padam kategori yg digunakan | Error message, kategori kekal |
| 9 | Rename bank | Semua transaksi guna nama baru. Transfer kekal. |
| 10 | Tambah bank baru | Muncul di semua dropdown, sidebar, navigation |
| 11 | Padam bank ada transaksi | Error message |
| 12 | Toggle dark/light mode | Semua komponen (pagination, settings, charts) ikut tema |
| 13 | 2 user buka serentak | Cache dikongsi (GAS CacheService shared), data konsisten |
| 14 | CacheService unavailable | Fallback direct Sheets, app tak crash |
| 15 | Sidebar charts di mobile | Tak render (save resources) |
