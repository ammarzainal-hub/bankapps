# Dokumentasi Bank Apps

Tarikh kemaskini: 21 Julai 2026

## Tujuan App

Bank Apps ialah web app Google Apps Script untuk rekod duit masuk, duit keluar, transfer antara bank, baki semasa, kategori perbelanjaan/pendapatan, dan ringkasan carta.

Data disimpan dalam Google Sheet. Web app hanya menjadi paparan dan borang untuk mengurus data dengan lebih kemas.

## Fail Utama

- `code.gs` - backend Google Apps Script. Urus baca/tulis Google Sheet, cache, kira baki, filter, search, kategori, bank, dan transfer.
- `index.html` - frontend web app. Urus UI, jadual, modal, carta, borang, pagination, sort, dan panggilan `google.script.run`.
- `NOTA_PERUBAHAN.md` - dokumentasi ringkas app dan nota teknikal.

## Struktur Google Sheet

App bergantung pada tab berikut:

- `DATA`
- `KATEGORI_MASUK`
- `KATEGORI_KELUAR`
- `KONFIG`

## Tab `DATA`

Tab ini menyimpan semua transaksi.

Column yang digunakan:

- A: Tarikh
- B: Bank
- C: Jenis
- D: Kategori
- E: Amaun
- F: Nota
- G: Transfer ID
- H: Baki

Jenis transaksi yang digunakan:

- `Masuk`
- `Keluar`
- `Transfer Masuk`
- `Transfer Keluar`

Nota:

- Transfer akan menghasilkan dua rekod: satu keluar dari bank asal dan satu masuk ke bank destinasi.
- Kedua-dua rekod transfer berkongsi `Transfer ID` yang sama.
- Column `Baki` dikira semula oleh app berdasarkan tarikh dan susunan transaksi.

## Tab Kategori

Tab kategori ada dua:

- `KATEGORI_MASUK`
- `KATEGORI_KELUAR`

Column yang digunakan:

- A: Nama kategori
- B: Ikon kategori

Kategori digunakan untuk dropdown semasa tambah transaksi dan untuk carta pecahan kategori.

## Tab `KONFIG`

Tab ini menyimpan senarai bank, baki awal, dan ikon bank.

Format yang digunakan:

- `BankList` - senarai bank dipisahkan dengan koma.
- `BakiAwal_NamaBank` - baki awal untuk bank tersebut.
- Column C boleh menyimpan ikon bank.

Contoh:

```text
BankList        Maybank, Bank Islam
BakiAwal_Maybank        1000        🐯
BakiAwal_Bank Islam     500         🏦
```

## Fungsi Utama App

## 1. Ringkasan

Halaman ringkasan memaparkan:

- Senarai akaun bank.
- Baki semasa setiap bank.
- Jumlah masuk.
- Jumlah keluar.
- Jumlah transaksi.
- Purata belanja harian.
- Unjuran belanja bulanan.
- Carta masuk vs keluar.
- Carta kategori.

## 2. Akaun Bank

Setiap bank ada halaman detail sendiri.

Fungsi:

- Lihat baki semasa.
- Lihat jumlah masuk dan keluar.
- Lihat transaksi bank tersebut.
- Filter transaksi ikut tarikh.
- Sort jadual ikut tarikh, jenis, kategori, nota, amaun, atau baki.
- Tambah rekod masuk.
- Tambah rekod keluar.
- Edit transaksi.
- Padam transaksi.
- Buat transfer dari modal bank.

## 3. Semua Transaksi

Halaman ini memaparkan semua transaksi merentas semua bank.

Fungsi:

- Search nota, kategori, jenis, bank, dan amaun.
- Filter ikut bank.
- Filter ikut tarikh.
- Pagination.
- Sort ikut tarikh, bank, jenis, kategori, nota, amaun, atau baki.
- Edit transaksi.
- Padam transaksi.

Search amaun menyokong contoh:

- `50`
- `50.00`
- `1,250.50`

## 4. Tambah Transaksi

Halaman ini untuk tambah transaksi biasa dengan cepat.

Input utama:

- Tarikh
- Bank
- Jenis transaksi
- Kategori
- Amaun
- Nota

## 5. Transfer

Halaman transfer digunakan untuk pindah duit antara dua bank.

Input utama:

- Tarikh
- Bank sumber
- Bank destinasi
- Amaun
- Nota

Kesan transfer:

- Rekod `Transfer Keluar` ditambah pada bank sumber.
- Rekod `Transfer Masuk` ditambah pada bank destinasi.
- Kedua-dua rekod berkongsi `Transfer ID`.
- Rekod transfer ditanda dengan `↔️` dalam jadual.

## 6. Rekod Pukal

Halaman ini digunakan untuk masukkan banyak transaksi sekaligus.

Fungsi:

- Tambah beberapa baris transaksi.
- Guna tarikh default.
- Pilih bank, jenis, kategori, amaun, dan nota bagi setiap baris.
- Simpan semua transaksi yang mempunyai amaun sah.

## 7. Carta & Analitik

Halaman carta memaparkan:

- Perbandingan bulan.
- Trend baki bank tahunan.
- Masuk vs keluar mengikut bank.
- Trend baki bank.
- Pecahan kategori wang masuk.
- Pecahan kategori wang keluar.

Nota:

- Kategori masuk dan keluar dikira berasingan supaya carta tidak bercampur.

## 8. Settings

Settings ada dua bahagian:

- Kategori
- Bank

Kategori:

- Tambah kategori masuk/keluar.
- Padam kategori jika tidak digunakan.

Bank:

- Tambah bank baru.
- Tetapkan baki awal.
- Tetapkan ikon bank.
- Tukar nama bank.
- Padam bank jika tiada transaksi.
- Kosongkan ikon bank jika tidak mahu guna ikon.

## Peraturan Penting

## Tarikh

App menyimpan dan memaparkan tarikh dalam format stabil `yyyy-mm-dd` untuk filter, sort, dan carta.

Tujuan:

- Elak tarikh lari sehari disebabkan timezone.
- Pastikan transaksi masuk bulan/tahun yang betul.

## Baki

Baki dikira berdasarkan:

- Baki awal bank dari `KONFIG`.
- Susunan transaksi mengikut tarikh.
- Jenis transaksi.

Formula ringkas:

- `Masuk` tambah baki.
- `Transfer Masuk` tambah baki.
- `Keluar` tolak baki.
- `Transfer Keluar` tolak baki.

## Transfer

Transfer perlu dua bank berbeza.

Bila edit transaksi transfer:

- Tarikh pasangan transfer akan dikemaskini.
- Amaun pasangan transfer akan dikemaskini.
- Nota pasangan transfer akan dikemaskini.

Bila padam transaksi transfer:

- Modal akan beri pilihan untuk padam kedua-dua rekod transfer.

## Cache

App menggunakan `CacheService` untuk mempercepat bacaan data.

Cache akan dibersihkan bila:

- Tambah transaksi.
- Edit transaksi.
- Padam transaksi.
- Tambah kategori.
- Padam kategori.
- Tambah bank.
- Tukar nama bank.
- Tukar ikon bank.
- Padam bank.

Butang refresh dalam app juga boleh membersihkan cache untuk view tertentu.

## Duplicate Submit Protection

App menggunakan `clientRequestId` untuk mengurangkan risiko transaksi tersimpan dua kali.

Flow yang menghantar `clientRequestId`:

- Tambah transaksi cepat.
- Tambah transaksi melalui modal akaun bank.
- Transfer dari halaman transfer.
- Transfer dari modal akaun bank.
- Rekod pukal.

Cara kerja:

- Frontend jana ID unik setiap kali user tekan simpan.
- Backend semak ID tersebut dalam cache.
- Jika request sama sampai kali kedua, backend pulangkan response lama dan tidak tambah row baru.
- Cache ID request disimpan sementara selama 6 jam.

Nota:

- Transfer masih menghasilkan dua row secara sengaja.
- Dua row transfer bukan duplicate, tetapi pasangan `Transfer Keluar` dan `Transfer Masuk`.

## Confirmation Modal

Tindakan penting menggunakan popout/modal app yang sama.

Digunakan untuk:

- Padam transaksi.
- Padam kategori.
- Padam bank.
- Tukar nama bank.

Tujuan:

- UI lebih konsisten.
- Tidak bergantung pada browser confirm.
- Mesej tindakan lebih jelas.

## Sort Jadual

Tanda sort:

- `↓` bermaksud sort menurun.
- `↑` bermaksud sort menaik.
- `↕` bermaksud column boleh disort tetapi tidak aktif.

Jadual akaun bank boleh sort secara local pada data bank tersebut.

Jadual semua transaksi sort di server supaya melibatkan semua hasil filter/search, bukan hanya page semasa.

## Cara Semak Selepas Deploy

## Semak Transaksi Biasa

1. Tambah transaksi masuk.
2. Tambah transaksi keluar.
3. Semak transaksi muncul dalam akaun bank.
4. Semak transaksi muncul dalam semua transaksi.
5. Semak baki berubah dengan betul.
6. Tekan simpan beberapa kali dengan cepat dan pastikan row tidak berganda.

## Semak Tarikh

1. Tambah transaksi pada tarikh tertentu.
2. Filter tarikh yang sama di `Semua Transaksi`.
3. Filter bulan yang sama.
4. Pastikan transaksi muncul di tarikh dan bulan yang betul.

## Semak Search

1. Pergi `Semua Transaksi`.
2. Search ikut nota.
3. Search ikut kategori.
4. Search ikut bank.
5. Search ikut amaun seperti `50` atau `50.00`.

## Semak Sort

1. Pergi halaman akaun bank.
2. Klik header `Tarikh`, `Amaun`, atau `Baki`.
3. Pastikan arrow berubah antara `↑` dan `↓`.
4. Pergi `Semua Transaksi`.
5. Ulang semakan sort pada semua column.

## Semak Transfer

1. Buat transfer antara dua bank.
2. Pastikan dua rekod diwujudkan.
3. Pastikan kedua-dua rekod ada tanda `↔️`.
4. Edit nota salah satu rekod transfer.
5. Pastikan nota pasangan transfer turut berubah.
6. Cuba padam transfer dan semak pilihan padam pasangan transfer.

## Semak Settings

1. Tambah kategori baru.
2. Padam kategori yang belum digunakan.
3. Tambah bank dummy.
4. Tukar ikon bank.
5. Kosongkan ikon bank.
6. Tukar nama bank dummy.
7. Padam bank dummy jika tiada transaksi.

## Nota Yang Belum Dibuat

## Backup CSV Dalam App

Belum dibuat kerana data berada dalam Google Sheet dan boleh dimuat turun terus dari Google Sheet.

## Audit Log

Belum dibuat.

Jika dibuat nanti, cadangan tab baru:

- `LOG`

Contoh data log:

- Tarikh masa
- Tindakan
- Bank
- Row ID
- Amaun lama
- Amaun baru
- Nota

Audit log berguna jika ramai pengguna atau mahu trace perubahan data.

## Server Validation Penuh

Belum dibuat sepenuhnya.

Maksud server validation penuh:

- Server semak bank memang wujud dalam `KONFIG`.
- Server semak kategori memang wujud dalam tab kategori.
- Server semak jenis transaksi hanya nilai yang dibenarkan.

Risiko sekarang rendah jika app digunakan melalui UI biasa.

## Recalculate Semua Baki

Belum dibuat sebagai butang khas.

Tidak kritikal jika data jarang diedit terus dari Google Sheet.

## Pecah Fail CSS/JS

Belum dibuat.

Apps Script boleh pecahkan fail kepada beberapa `.html`, contohnya:

- `styles.html`
- `scripts.html`
- `index.html`

Namun buat masa ini satu fail `index.html` masih lebih mudah deploy dan maintain untuk app ini.

## Troubleshooting

## Tab Tidak Dijumpai

Jika keluar mesej seperti `Tab KONFIG tidak dijumpai`, semak nama tab Google Sheet.

Nama tab mesti tepat:

- `DATA`
- `KATEGORI_MASUK`
- `KATEGORI_KELUAR`
- `KONFIG`

## Data Tidak Update

Cuba:

1. Klik refresh dalam app.
2. Refresh browser.
3. Semak Google Sheet sama ada data memang tersimpan.

## Baki Nampak Pelik

Semak:

- Tarikh transaksi.
- Jenis transaksi.
- Amaun transaksi.
- Baki awal dalam `KONFIG`.
- Rekod transfer mempunyai pasangan yang betul.

## Kategori Tidak Boleh Dipadam

Kategori yang sedang digunakan dalam transaksi tidak boleh dipadam.

Tujuan:

- Elak transaksi lama kehilangan kategori.

## Bank Tidak Boleh Dipadam

Bank yang mempunyai transaksi tidak boleh dipadam.

Tujuan:

- Elak transaksi lama kehilangan nama bank.

## Cadangan Penambahbaikan Masa Depan

Keutamaan rendah:

- Audit log.
- Server validation penuh.
- Butang recalculate semua baki.
- Export CSV terus dari app.
- Pecahkan `index.html` kepada beberapa fail kecil jika app makin besar.
