# Bank Apps

Bank Apps ialah web app Google Apps Script untuk merekod duit masuk, duit keluar, transfer antara bank, baki semasa, kategori, dan carta ringkasan kewangan.

Data utama disimpan dalam Google Sheet. Fail `code.gs` bertindak sebagai backend Apps Script, manakala `index.html` ialah frontend web app.

## Fail Utama

- `code.gs` - backend Apps Script untuk transaksi, bank, kategori, cache, baki, search, sort, dan carta.
- `index.html` - frontend web app untuk UI, form, table, modal, chart, pagination, dan loader.
- `NOTA_PERUBAHAN.md` - dokumentasi penuh app dan nota teknikal.
- `DEPLOYMENT.md` - panduan deploy ke Google Apps Script.
- `TESTING.md` - checklist semakan manual.
- `CHANGELOG.md` - sejarah perubahan penting.
- `AGENTS.md` - panduan untuk AI/dev yang menyunting projek ini.

## Struktur Sheet

App memerlukan tab Google Sheet berikut:

- `DATA`
- `KATEGORI_MASUK`
- `KATEGORI_KELUAR`
- `KONFIG`

Column tab `DATA`:

- A: Tarikh
- B: Bank
- C: Jenis
- D: Kategori
- E: Amaun
- F: Nota
- G: Transfer ID
- H: Baki

## Fungsi Utama

- Ringkasan semua bank.
- Rekod masuk dan keluar.
- Transfer antara bank.
- Rekod pukal.
- Search transaksi termasuk amaun.
- Sort jadual akaun bank dan semua transaksi.
- Carta kategori masuk/keluar.
- Settings kategori dan bank.
- Confirmation modal seragam untuk tindakan penting.
- Perlindungan duplicate submit menggunakan `clientRequestId`.

## Nota Transfer

Transfer memang menghasilkan dua rekod:

- `Transfer Keluar` dari bank sumber.
- `Transfer Masuk` ke bank destinasi.

Kedua-duanya ditanda dengan `↔️` dan berkongsi `Transfer ID`.

## Dokumentasi Lanjut

Rujuk `NOTA_PERUBAHAN.md` untuk dokumentasi lengkap app, cara semak, troubleshooting, dan cadangan penambahbaikan.
