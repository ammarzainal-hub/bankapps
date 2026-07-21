# Testing Checklist

Checklist manual selepas perubahan atau deploy.

## Load App

- Buka web app.
- Pastikan sidebar muncul.
- Pastikan ringkasan bank muncul.
- Pastikan tiada toast error semasa load pertama.

## Tambah Transaksi

- Tambah transaksi `Masuk`.
- Tambah transaksi `Keluar`.
- Pastikan button menjadi disabled/gray semasa simpan.
- Pastikan loader `Menyimpan data...` muncul.
- Pastikan transaksi masuk sekali sahaja walaupun button ditekan laju.

## Duplicate Submit

- Tekan `Simpan` beberapa kali dengan cepat.
- Semak tab `DATA`.
- Pastikan hanya satu row transaksi biasa ditambah.

## Transfer

- Buat transfer antara dua bank berbeza.
- Pastikan dua row dibuat.
- Pastikan row ada `Transfer ID` sama.
- Pastikan paparan jadual menunjukkan `↔️ Transfer Keluar` dan `↔️ Transfer Masuk`.
- Edit nota salah satu transfer.
- Pastikan nota pasangan transfer turut berubah.

## Semua Transaksi

- Search ikut nota.
- Search ikut kategori.
- Search ikut bank.
- Search ikut amaun seperti `50` atau `50.00`.
- Sort ikut `Tarikh`, `Bank`, `Amaun`, dan `Baki`.
- Pastikan arrow sort berubah antara `↑` dan `↓`.

## Akaun Bank

- Buka satu bank dari sidebar.
- Filter ikut tarikh.
- Sort ikut tarikh dan amaun.
- Edit transaksi.
- Padam transaksi menggunakan modal.

## Rekod Pukal

- Tambah beberapa row.
- Isi dua row sah dan satu row kosong.
- Simpan semua.
- Pastikan hanya row yang ada amaun sah disimpan.

## Settings Kategori

- Tambah kategori masuk.
- Tambah kategori keluar.
- Padam kategori yang belum digunakan.
- Pastikan modal confirmation muncul.

## Settings Bank

- Tambah bank dummy.
- Tukar ikon bank.
- Kosongkan ikon bank.
- Tukar nama bank dummy.
- Padam bank dummy jika tiada transaksi.

## Carta

- Buka `Carta & Graf`.
- Pastikan carta load tanpa error.
- Pastikan kategori masuk dan keluar tidak bercampur.

## Troubleshooting Ringkas

- Jika data tidak update, klik refresh app dan refresh browser.
- Jika tab tidak dijumpai, semak nama tab Google Sheet.
- Jika baki pelik, semak baki awal dan susunan tarikh transaksi.
