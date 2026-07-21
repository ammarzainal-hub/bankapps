# Deployment

Panduan ringkas deploy Bank Apps ke Google Apps Script.

## Fail Yang Perlu Ada Di Apps Script

- `code.gs`
- `index.html`

Fail `.md` hanya dokumentasi repo dan tidak perlu deploy ke Apps Script.

## Langkah Deploy Manual

1. Buka project Google Apps Script yang disambungkan dengan Google Sheet.
2. Pastikan kandungan `code.gs` dan `index.html` dikemaskini.
3. Klik `Deploy`.
4. Pilih `Manage deployments` jika mahu update deployment sedia ada.
5. Pilih versi baru.
6. Klik `Deploy`.
7. Buka URL web app dan test fungsi utama.

## Tetapan Web App

Cadangan biasa:

- Execute as: pemilik script.
- Who has access: ikut keperluan penggunaan.

## Selepas Deploy

Semak fungsi berikut:

- Load halaman ringkasan.
- Tambah transaksi.
- Transfer antara bank.
- Search amaun di `Semua Transaksi`.
- Sort jadual.
- Padam transaksi menggunakan modal.

## Jika Data Tidak Update

1. Klik refresh dalam app.
2. Refresh browser.
3. Pastikan deployment yang dibuka ialah deployment terbaru.
4. Semak tab Google Sheet masih bernama betul.

## Tab Sheet Diperlukan

- `DATA`
- `KATEGORI_MASUK`
- `KATEGORI_KELUAR`
- `KONFIG`
