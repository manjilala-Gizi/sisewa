# SiSewa — Sewa Fasilitas Poltekkes Kemenkes Makassar

Prototipe tahap 1 aplikasi penyewaan fasilitas yang dikelola Unit Bisnis.
Bentuknya PWA (bisa dipasang di HP), disimpan di GitHub Pages, dengan Google Sheet sebagai database.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `index.html` | Seluruh tampilan aplikasi (katalog, pemesanan, cek pesanan, panel admin) |
| `config.js` | Tempat menempel URL Web App Google Apps Script |
| `Code.gs` | Skrip backend, ditempel di Apps Script milik Google Sheet |
| `manifest.json`, `sw.js`, `icon-*.png` | Kelengkapan PWA |

## Mode demo

Selama `API_URL` di `config.js` masih kosong, aplikasi berjalan dengan data contoh yang
tersimpan di browser masing-masing. Sandi admin demo: `admin123`.
Mode ini cocok untuk presentasi ke pimpinan sebelum database disiapkan.

## Langkah 1 — Siapkan Google Sheet

1. Buat Google Sheet baru, misalnya bernama **Database SiSewa**.
2. Buka **Ekstensi > Apps Script**, hapus isi bawaan, lalu tempel seluruh isi `Code.gs`.
3. Buka **Setelan proyek** (ikon roda gigi) dan pastikan zona waktu **(GMT+08:00) Makassar**.
4. Pilih fungsi `setup` lalu klik **Jalankan**. Izinkan akses saat diminta.
   Empat sheet akan terbentuk: `Fasilitas`, `Booking`, `Blokir`, `Pengaturan`.
5. Di sheet **Pengaturan**, ganti:
   - `admin_password` — sandi panel admin (wajib diganti)
   - `wa_admin` — nomor WhatsApp admin, format 628xxxx
   - `info_rekening` — rekening resmi penerimaan
   - `catatan_umum` — teks kecil di bawah katalog (boleh dikosongkan)
6. Di sheet **Fasilitas**, ganti data contoh dengan fasilitas dan tarif resmi.

## Langkah 2 — Terbitkan sebagai Web App

1. Di Apps Script: **Terapkan > Deployment baru > Jenis: Aplikasi web**.
2. **Jalankan sebagai:** Saya. **Yang memiliki akses:** Siapa saja.
3. Klik **Terapkan**, lalu salin URL yang berakhiran `/exec`.
4. Tempel URL itu di `config.js`:

   ```js
   window.SISEWA_CONFIG = {
     API_URL: 'https://script.google.com/macros/s/XXXX/exec'
   };
   ```

Setiap kali `Code.gs` diubah, buat versi baru lewat
**Terapkan > Kelola deployment > Edit > Versi: Versi baru** supaya perubahan berlaku.

## Langkah 3 — Unggah ke GitHub

1. Buat repository baru, misalnya `sisewa`.
2. Unggah semua berkas di folder ini (kecuali `Code.gs` boleh ikut sebagai arsip).
3. **Settings > Pages > Branch: main / root > Save**.
4. Aplikasi tayang di `https://<nama-akun>.github.io/sisewa/`.

Setelah mengunggah perubahan, naikkan angka `VERSI` di `sw.js` (misalnya `sisewa-v2`)
supaya HP pengguna mengambil versi terbaru.

## Cara mengisi sheet Fasilitas

| Kolom | Isi |
|---|---|
| `id` | Kode singkat unik tanpa spasi, misalnya `LBT1` |
| `nama`, `kategori`, `deskripsi`, `kapasitas` | Teks bebas; `kategori` menjadi tombol filter |
| `ikon` | Satu emoji |
| `satuan` | `jam` (lapangan), `sesi` (gedung), atau `hari` (kendaraan) |
| `jam_buka`, `jam_tutup` | Angka jam, misalnya `7` dan `22`; untuk `hari` isi `0` dan `24` |
| `tarif_internal`, `tarif_mitra`, `tarif_umum` | Angka tanpa titik, per satuan |
| `tambahan` | Format `Nama:harga;Nama:harga`, misalnya `Sound system:500000;LCD proyektor:300000` |
| `aktif` | `ya` untuk ditampilkan, selain itu disembunyikan |

Satuan `sesi` memakai tiga pilihan tetap: Pagi 08.00–12.00 (1 sesi), Siang 13.00–17.00 (1 sesi),
Sehari penuh 08.00–17.00 (2 sesi). Jamnya bisa diubah di konstanta `SESI` pada `index.html` dan `Code.gs`
(keduanya harus sama).

## Alur status pesanan

`Menunggu` → `Disetujui` → `Lunas` → `Selesai`, atau `Ditolak` / `Batal`.

Jadwal ditahan selama status belum `Ditolak` atau `Batal`. Begitu pesanan ditolak atau dibatalkan,
slotnya otomatis terbuka lagi.

## Yang sudah dijaga di sisi server

- Total harga dihitung ulang di Apps Script dari tarif di sheet, bukan dari kiriman browser.
- Pemesanan memakai kunci (LockService), jadi dua orang tidak bisa mengambil slot yang sama.
- Halaman publik hanya menerima jam yang terisi, tanpa nama atau nomor HP penyewa lain.
- Sandi admin diperiksa di server dan tidak pernah dikirim ke halaman publik.

## Keterbatasan prototipe ini

- Bukti pembayaran dikirim lewat WhatsApp ke admin, belum diunggah di aplikasi.
- Admin memakai satu sandi bersama, belum akun per orang.
- Biaya tambahan dihitung sekali per pesanan (belum per jam atau per hari).
- Belum ada notifikasi WhatsApp otomatis; admin menekan tombol **WA penyewa** secara manual.
- Siapa pun yang memegang kode pesanan bisa melihat detail pesanan tersebut.
