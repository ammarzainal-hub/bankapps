# AGENTS.md

Panduan untuk AI agent atau developer yang menyunting projek ini.

## Konteks Projek

Projek ini ialah Google Apps Script web app.

- Backend utama: `code.gs`
- Frontend utama: `index.html`
- Data source: Google Sheet
- Dokumentasi utama: `NOTA_PERUBAHAN.md`

## Prinsip Edit

- Buat perubahan kecil dan tepat.
- Jangan ubah nama tab Google Sheet tanpa sebab kuat.
- Jangan pecahkan `index.html` kepada banyak fail kecuali diminta.
- Kekalkan Bahasa Melayu pada UI dan mesej user.
- Kekalkan gaya sedia ada: fungsi plain JavaScript, Apps Script, dan inline UI yang sudah digunakan.
- Jangan buang folder `Old Version` kecuali diminta.

## Tab Sheet Yang Kritikal

- `DATA`
- `KATEGORI_MASUK`
- `KATEGORI_KELUAR`
- `KONFIG`

## Perkara Yang Perlu Dijaga

- `DATA` column A-H mesti kekal selaras dengan kod.
- Transfer mesti kekal dua rekod dengan `Transfer ID` sama.
- Baki dikira semula selepas tambah/edit/padam transaksi.
- Cache mesti dibersihkan selepas data berubah.
- `clientRequestId` perlu dihantar untuk flow tambah transaksi bagi elak duplicate submit.

## Flow Tambah Transaksi

Flow frontend yang menambah data:

- `handleQuickTxSubmit()`
- `handleTxSubmit()` bila `rowId` kosong
- `handleTransferPageSubmit()`
- `handleTransferSubmit()`
- `submitBulkData()`

Backend berkaitan:

- `addTransaction()`
- `addTransfer()`
- `addBulkTransactions()`

## Checklist Selepas Edit

- Semak `git diff --check -- "code.gs" "index.html"`.
- Test tambah transaksi biasa.
- Test transfer.
- Test edit dan padam transaksi.
- Test search amaun.
- Test sort jadual.
- Test settings kategori/bank jika berkaitan.

## Jangan Buat Tanpa Arahan

- Jangan commit/push tanpa arahan user.
- Jangan reset/revert perubahan user.
- Jangan tambah dependency build tool.
- Jangan tukar struktur Apps Script besar-besaran tanpa keperluan jelas.
