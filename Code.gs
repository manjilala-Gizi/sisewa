/**
 * SiSewa — backend Google Apps Script (database: Google Sheet)
 * ============================================================
 * Cara pakai singkat (rinciannya ada di README.md):
 * 1. Buat Google Sheet baru > Ekstensi > Apps Script > tempel seluruh isi berkas ini.
 * 2. Jalankan fungsi `setup` sekali (membuat sheet Fasilitas, Booking, Blokir, Pengaturan).
 * 3. Terapkan > Deployment baru > Aplikasi web > Jalankan sebagai: Saya, Akses: Siapa saja.
 * 4. Salin URL berakhiran /exec ke config.js (API_URL).
 */

const TZ = 'Asia/Makassar';
const SH = { F: 'Fasilitas', B: 'Booking', X: 'Blokir', P: 'Pengaturan' };
const KOLOM = {
  Fasilitas: ['id', 'nama', 'kategori', 'ikon', 'satuan', 'deskripsi', 'kapasitas', 'jam_buka', 'jam_tutup', 'tarif_internal', 'tarif_mitra', 'tarif_umum', 'tambahan', 'aktif'],
  Booking: ['kode', 'dibuat', 'fasilitas_id', 'fasilitas', 'tanggal', 'tanggal_selesai', 'mulai', 'selesai', 'jumlah', 'satuan', 'nama', 'instansi', 'hp', 'kategori_penyewa', 'keperluan', 'tambahan', 'total', 'status', 'catatan'],
  Blokir: ['id', 'fasilitas_id', 'tanggal', 'tanggal_selesai', 'mulai', 'selesai', 'keterangan'],
  Pengaturan: ['kunci', 'nilai']
};
const ANGKA = ['jam_buka', 'jam_tutup', 'tarif_internal', 'tarif_mitra', 'tarif_umum', 'mulai', 'selesai', 'jumlah', 'total'];
const KATEGORI_PENYEWA = ['internal', 'mitra', 'umum'];
const SESI = { pagi: { mulai: 8, selesai: 12, n: 1 }, siang: { mulai: 13, selesai: 17, n: 1 }, penuh: { mulai: 8, selesai: 17, n: 2 } };
const STATUS = ['Menunggu', 'Disetujui', 'Lunas', 'Selesai', 'Ditolak', 'Batal'];
const STATUS_AKTIF = ['Menunggu', 'Disetujui', 'Lunas', 'Selesai']; // status yang menahan jadwal

/* ================= SETUP: jalankan sekali ================= */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(KOLOM).forEach(function (nama) {
    let sh = ss.getSheetByName(nama);
    if (!sh) sh = ss.insertSheet(nama);
    const kol = KOLOM[nama];
    sh.getRange(1, 1, sh.getMaxRows(), kol.length).setNumberFormat('@'); // semua teks, supaya tanggal & nomor HP tidak berubah
    sh.getRange(1, 1, 1, kol.length).setValues([kol]).setFontWeight('bold').setBackground('#ccfbf1');
    sh.setFrozenRows(1);
  });

  const f = ss.getSheetByName(SH.F);
  if (f.getLastRow() < 2) {
    // DATA CONTOH — ganti dengan fasilitas dan tarif resmi
    const contoh = [
      ['LBT1', 'Lapangan Bulu Tangkis A', 'Olahraga', '🏸', 'jam', 'Lapangan indoor, lantai karpet, lampu standar pertandingan.', '4 pemain', 7, 22, 25000, 35000, 50000, 'Sewa raket (2 buah):20000', 'ya'],
      ['LBT2', 'Lapangan Bulu Tangkis B', 'Olahraga', '🏸', 'jam', 'Lapangan indoor, bersebelahan dengan Lapangan A.', '4 pemain', 7, 22, 25000, 35000, 50000, 'Sewa raket (2 buah):20000', 'ya'],
      ['MSC', 'Lapangan Mini Soccer', 'Olahraga', '⚽', 'jam', 'Rumput sintetis, gawang dan jaring, lampu malam.', '2 tim (7 lawan 7)', 7, 22, 150000, 200000, 250000, 'Rompi tim:30000', 'ya'],
      ['AUD', 'Auditorium', 'Gedung', '🏛️', 'sesi', 'Ruang ber-AC untuk seminar, wisuda, pelatihan, dan resepsi.', '500 orang', 8, 17, 1500000, 2000000, 2500000, 'Sound system:500000;LCD proyektor:300000;Petugas kebersihan:200000', 'ya'],
      ['BUS', 'Bus Kampus', 'Kendaraan', '🚌', 'hari', 'Bus ber-AC untuk kunjungan lapangan dan perjalanan rombongan.', '30 kursi', 0, 24, 1500000, 1800000, 2200000, 'Sopir:250000', 'ya'],
      ['MBL', 'Mobil Minibus', 'Kendaraan', '🚐', 'hari', 'Minibus ber-AC untuk perjalanan dinas atau keluarga.', '7 kursi', 0, 24, 400000, 500000, 600000, 'Sopir:150000', 'ya']
    ].map(function (r) { return r.map(String); });
    f.getRange(2, 1, contoh.length, contoh[0].length).setValues(contoh);
  }

  const p = ss.getSheetByName(SH.P);
  if (p.getLastRow() < 2) {
    const awal = [
      ['nama_unit', 'Unit Bisnis Poltekkes Kemenkes Makassar'],
      ['wa_admin', '6281200000000'],
      ['info_rekening', 'Bank ___ No. Rek. ________ a.n. ________'],
      ['catatan_umum', 'Tarif yang tampil masih contoh, belum tarif resmi.'],
      ['admin_password', 'GANTI-SANDI-INI']
    ];
    p.getRange(2, 1, awal.length, 2).setValues(awal);
  }
  try { SpreadsheetApp.getUi().alert('Setup selesai. Ganti admin_password, wa_admin, dan info_rekening di sheet Pengaturan, lalu sesuaikan sheet Fasilitas.'); } catch (e) { Logger.log('Setup selesai.'); }
}

/* ================= PINTU MASUK WEB APP ================= */
function doGet() { return keluaran({ ok: true, data: 'API SiSewa aktif.' }); }

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const fn = RUTE[req.action];
    if (!fn) throw new Error('Aksi tidak dikenal.');
    return keluaran({ ok: true, data: fn(req) });
  } catch (err) {
    return keluaran({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function keluaran(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

const RUTE = {
  init: function () {
    const c = bacaPengaturan();
    return {
      fasilitas: bacaSheet(SH.F).filter(function (f) { return String(f.aktif).toLowerCase() === 'ya'; }),
      config: { nama_unit: c.nama_unit || '', wa_admin: c.wa_admin || '', info_rekening: c.info_rekening || '', catatan_umum: c.catatan_umum || '' }
    };
  },

  jadwal: function (req) { return jadwalTerisi(String(req.fid || '')); },

  cek: function (req) {
    const kode = String(req.kode || '').trim().toUpperCase();
    const b = bacaSheet(SH.B).filter(function (x) { return x.kode === kode; })[0];
    if (!b) throw new Error('Kode pesanan tidak ditemukan.');
    delete b.hp; // nomor HP tidak ditampilkan di halaman publik
    return b;
  },

  booking: function (req) {
    const x = req.data || {};
    const lock = LockService.getScriptLock();
    lock.waitLock(20000); // cegah dua orang memesan slot yang sama pada detik yang sama
    try {
      const f = bacaSheet(SH.F).filter(function (y) { return y.id === String(x.fasilitas_id) && String(y.aktif).toLowerCase() === 'ya'; })[0];
      if (!f) throw new Error('Fasilitas tidak ditemukan.');
      const r = susunRentang(f, x);
      if (jadwalTerisi(f.id).some(function (j) { return bentrok(j, r); })) throw new Error('Maaf, jadwal itu baru saja terisi. Silakan pilih waktu lain.');

      const diminta = Array.isArray(x.tambahan) ? x.tambahan.map(String) : [];
      const pilih = uraiTambahan(f.tambahan).filter(function (t) { return diminta.indexOf(t.nama) >= 0; });
      // Total SELALU dihitung di server dari tarif di sheet, bukan dari kiriman browser
      const total = (Number(f['tarif_' + x.kategori_penyewa]) || 0) * r.jumlah + pilih.reduce(function (s, t) { return s + t.harga; }, 0);

      const now = new Date();
      const b = {
        kode: 'SW-' + Utilities.formatDate(now, TZ, 'yyMMdd') + '-' + acak(4),
        dibuat: Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm'),
        fasilitas_id: f.id, fasilitas: f.nama,
        tanggal: r.tanggal, tanggal_selesai: r.tanggal_selesai, mulai: r.mulai, selesai: r.selesai, jumlah: r.jumlah, satuan: f.satuan,
        nama: bersih(x.nama, 80), instansi: bersih(x.instansi, 100), hp: hpKe62(x.hp),
        kategori_penyewa: x.kategori_penyewa, keperluan: bersih(x.keperluan, 250),
        tambahan: pilih.map(function (t) { return t.nama; }).join(', '),
        total: total, status: 'Menunggu', catatan: ''
      };
      tulisBaris(SH.B, b);
      const hasil = JSON.parse(JSON.stringify(b)); delete hasil.hp;
      return hasil;
    } finally { lock.releaseLock(); }
  },

  adminList: function (req) {
    cekAdmin(req);
    return { booking: bacaSheet(SH.B).reverse(), blokir: bacaSheet(SH.X) };
  },

  adminStatus: function (req) {
    cekAdmin(req);
    if (STATUS.indexOf(req.status) < 0) throw new Error('Status tidak valid.');
    const sh = lembar(SH.B), kol = KOLOM.Booking;
    const kode = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
    for (let i = 1; i < kode.length; i++) {
      if (String(kode[i][0]) === String(req.kode)) {
        sh.getRange(i + 1, kol.indexOf('status') + 1).setValue(req.status);
        if (req.catatan != null) sh.getRange(i + 1, kol.indexOf('catatan') + 1).setNumberFormat('@').setValue(bersih(req.catatan, 250));
        return true;
      }
    }
    throw new Error('Pesanan tidak ditemukan.');
  },

  adminBlokir: function (req) {
    cekAdmin(req);
    const x = req.data || {}, re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(x.tanggal || '')) throw new Error('Tanggal tidak valid.');
    const akhir = re.test(x.tanggal_selesai || '') ? x.tanggal_selesai : x.tanggal;
    const m = Number(x.mulai), s = Number(x.selesai);
    if (akhir < x.tanggal || !(m >= 0 && s <= 24 && s > m)) throw new Error('Rentang waktu tidak valid.');
    tulisBaris(SH.X, { id: 'BL-' + acak(6), fasilitas_id: bersih(x.fasilitas_id, 20), tanggal: x.tanggal, tanggal_selesai: akhir, mulai: m, selesai: s, keterangan: bersih(x.keterangan, 120) });
    return true;
  },

  adminHapusBlokir: function (req) {
    cekAdmin(req);
    const sh = lembar(SH.X);
    const id = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
    for (let i = 1; i < id.length; i++) if (String(id[i][0]) === String(req.id)) { sh.deleteRow(i + 1); return true; }
    throw new Error('Data blokir tidak ditemukan.');
  }
};

/* ================= ATURAN PEMESANAN ================= */
function susunRentang(f, x) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(x.tanggal || '')) throw new Error('Tanggal belum dipilih.');
  if (x.tanggal < hariIni()) throw new Error('Tanggal sudah lewat.');
  if (KATEGORI_PENYEWA.indexOf(x.kategori_penyewa) < 0) throw new Error('Kategori penyewa belum dipilih.');
  if (!bersih(x.nama, 80)) throw new Error('Nama penyewa wajib diisi.');
  if (hpKe62(x.hp).length < 10) throw new Error('Nomor WhatsApp tidak valid.');

  if (f.satuan === 'jam') {
    const m = Number(x.mulai), s = Number(x.selesai);
    if (m !== Math.floor(m) || s !== Math.floor(s) || m < f.jam_buka || s > f.jam_tutup || s <= m) throw new Error('Jam sewa tidak valid.');
    return { tanggal: x.tanggal, tanggal_selesai: x.tanggal, mulai: m, selesai: s, jumlah: s - m };
  }
  if (f.satuan === 'sesi') {
    const ss = SESI[x.sesi];
    if (!ss) throw new Error('Sesi belum dipilih.');
    return { tanggal: x.tanggal, tanggal_selesai: x.tanggal, mulai: ss.mulai, selesai: ss.selesai, jumlah: ss.n };
  }
  const akhir = re.test(x.tanggal_selesai || '') ? x.tanggal_selesai : x.tanggal;
  if (akhir < x.tanggal) throw new Error('Tanggal selesai lebih awal dari tanggal mulai.');
  const n = Math.round((new Date(akhir + 'T00:00:00Z') - new Date(x.tanggal + 'T00:00:00Z')) / 86400000) + 1;
  if (n > 30) throw new Error('Maksimal sewa 30 hari per pesanan.');
  return { tanggal: x.tanggal, tanggal_selesai: akhir, mulai: 0, selesai: 24, jumlah: n };
}

function jadwalTerisi(fid) {
  const t = hariIni(), out = [];
  bacaSheet(SH.B).forEach(function (b) {
    if (b.fasilitas_id === fid && STATUS_AKTIF.indexOf(b.status) >= 0 && b.tanggal_selesai >= t)
      out.push({ tanggal: b.tanggal, tanggal_selesai: b.tanggal_selesai, mulai: b.mulai, selesai: b.selesai, jenis: 'pesanan' });
  });
  bacaSheet(SH.X).forEach(function (x) {
    if ((x.fasilitas_id === fid || x.fasilitas_id === 'SEMUA') && x.tanggal_selesai >= t)
      out.push({ tanggal: x.tanggal, tanggal_selesai: x.tanggal_selesai, mulai: x.mulai, selesai: x.selesai, jenis: 'blokir', keterangan: x.keterangan });
  });
  return out;
}

function bentrok(a, b) {
  return a.tanggal <= b.tanggal_selesai && b.tanggal <= a.tanggal_selesai && Number(a.mulai) < Number(b.selesai) && Number(b.mulai) < Number(a.selesai);
}

function uraiTambahan(teks) {
  return String(teks || '').split(';').map(function (s) { return s.trim(); }).filter(String).map(function (s) {
    const i = s.lastIndexOf(':');
    return i < 0 ? { nama: s, harga: 0 } : { nama: s.slice(0, i).trim(), harga: Number(s.slice(i + 1)) || 0 };
  });
}

/* ================= BANTUAN ================= */
function lembar(nama) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
  if (!sh) throw new Error('Sheet "' + nama + '" belum ada. Jalankan fungsi setup terlebih dahulu.');
  return sh;
}

function bacaSheet(nama) {
  const sh = lembar(nama), kol = KOLOM[nama];
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, kol.length).getValues()
    .filter(function (r) { return String(r[0]).trim() !== ''; })
    .map(function (r) {
      const o = {};
      kol.forEach(function (k, i) {
        let v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, TZ, 'yyyy-MM-dd'); // jaga-jaga bila sel berubah jadi tanggal
        o[k] = ANGKA.indexOf(k) >= 0 ? (Number(v) || 0) : String(v).trim();
      });
      return o;
    });
}

function tulisBaris(nama, obj) {
  const sh = lembar(nama), kol = KOLOM[nama];
  const baris = kol.map(function (k) { return obj[k] == null ? '' : String(obj[k]); });
  sh.getRange(sh.getLastRow() + 1, 1, 1, kol.length).setNumberFormat('@').setValues([baris]);
}

function bacaPengaturan() {
  const o = {};
  bacaSheet(SH.P).forEach(function (r) { o[r.kunci] = r.nilai; });
  return o;
}

function cekAdmin(req) {
  const sandi = String(bacaPengaturan().admin_password || '');
  if (!sandi || String(req.pass || '') !== sandi) throw new Error('Sandi admin salah.');
}

function hariIni() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

/** Rapikan teks kiriman pengguna: batasi panjang dan buang awalan yang bisa dibaca Sheet sebagai rumus. */
function bersih(v, maks) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/^[\s=+\-@]+/, '').trim().slice(0, maks);
}

function hpKe62(hp) {
  let d = String(hp || '').replace(/\D/g, '');
  if (d.indexOf('0') === 0) d = '62' + d.slice(1); else if (d.indexOf('8') === 0) d = '62' + d;
  return d.slice(0, 15);
}

function acak(n) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
