# Changelog

## 2026-07-21

### Added

- Search transaksi ikut amaun di `Semua Transaksi`.
- Sort untuk jadual `Semua Transaksi`.
- Anak panah sort `↑`, `↓`, dan `↕`.
- Petunjuk transfer `↔️` pada jadual transaksi.
- Confirmation modal seragam untuk transaksi, kategori, bank, dan rename bank.
- `clientRequestId` untuk mengurangkan risiko duplicate submit.
- Loader `Menyimpan data...` semasa proses simpan.
- Dokumentasi repo: `README.md`, `AGENTS.md`, `DEPLOYMENT.md`, dan `TESTING.md`.

### Changed

- Filter dan carta tarikh tidak lagi bergantung pada `new Date('yyyy-mm-dd')`.
- Carta kategori masuk dan keluar dikira berasingan.
- Edit transfer kini sync tarikh, amaun, dan nota pasangan transfer.
- Ikon bank boleh dikosongkan.
- Settings delete/rename tidak lagi guna browser confirm.

### Fixed

- Risiko tarikh lari sehari akibat timezone.
- Risiko carta kategori bercampur antara masuk dan keluar.
- Risiko transaksi tersimpan dua kali jika request sama dihantar semula.

### Notes

- Transfer memang menghasilkan dua row secara sengaja: `Transfer Keluar` dan `Transfer Masuk`.
- Export CSV belum dibuat kerana Google Sheet boleh download data terus.
