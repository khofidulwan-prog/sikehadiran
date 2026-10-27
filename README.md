# SiKehadiran — Aplikasi Absensi BUMN (PWA)

> Solusi pencatatan kehadiran karyawan berbasis Progressive Web App (PWA) yang ringan, mudah diatur, dan dapat digunakan tanpa instalasi aplikasi native.

---

## Tentang Aplikasi

**SiKehadiran** adalah aplikasi absensi digital untuk karyawan BUMN yang dibangun menggunakan teknologi PWA (Progressive Web App). Aplikasi ini memanfaatkan **Google Sheets** sebagai database dan **Google Apps Script** sebagai backend API — tanpa biaya server, tanpa konfigurasi hosting yang rumit.

Karyawan dapat melakukan absensi langsung dari smartphone Android atau komputer, lengkap dengan validasi lokasi GPS, foto selfie, dan pencatatan mode kerja (WFO/WFH/Dinas Luar).

---

## ✨ Fitur Utama

- 📍 **Validasi Lokasi GPS** — Absensi hanya bisa dilakukan dalam radius yang ditentukan dari kantor
- 🤳 **Foto Selfie** — Wajib foto saat absen masuk sebagai bukti kehadiran
- 🏠 **Multi-Mode Kerja** — Dukungan WFO (Work From Office), WFH (Work From Home), dan Dinas Luar
- 📅 **Riwayat Absensi** — Lihat rekap kehadiran per bulan dengan filter dan badge ringkasan
- 📄 **Export PDF** — Cetak rekap absensi langsung dari browser
- 📝 **Pengajuan Izin & Cuti** — Ajukan izin sakit, cuti tahunan, dan jenis izin lainnya secara digital
- ✅ **Alur Persetujuan** — Status pengajuan (Pending / Disetujui / Ditolak) tercatat di spreadsheet
- 🔔 **Notifikasi Push** — Pengingat absen masuk dan pulang (opsional)
- 📱 **Installable** — Dapat diinstall di launcher Android seperti aplikasi native
- 🌐 **Offline Support** — Tampilan tetap bisa diakses meskipun koneksi terputus (dengan Service Worker)
- 🔒 **Login dengan NIP** — Autentikasi menggunakan NIP dan password karyawan
- 🗂️ **Kelola Data via Google Sheets** — Admin dapat mengelola data karyawan, lokasi, dan jam kerja langsung dari spreadsheet

---

## 📋 Prasyarat

- Akun Google (untuk Google Sheets & Apps Script)
- Browser **Google Chrome** di Android atau Desktop
- Koneksi internet untuk setup awal dan sinkronisasi data
- Repository GitHub atau akun Netlify (untuk hosting)

---

## 🚀 Panduan Setup Lengkap

### Langkah 1: Siapkan Google Sheets

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama: **"DB Absensi Karyawan SiKehadiran"**
3. Salin **Spreadsheet ID** dari URL — bagian antara `/d/` dan `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
4. Sheet-sheet berikut akan dibuat otomatis saat menjalankan fungsi `setupSpreadsheet()`:
   - `Karyawan` — Data master karyawan
   - `Absensi` — Log absensi harian
   - `Pengajuan_Izin` — Riwayat pengajuan izin & cuti
   - `Lokasi_Kantor` — Koordinat dan radius kantor
   - `Jam_Kerja` — Konfigurasi jam masuk, pulang, dan toleransi

---

### Langkah 2: Setup Google Apps Script

1. Di Google Sheets, klik menu **Extensions → Apps Script**
2. Hapus kode default yang ada, lalu paste seluruh isi file `google-apps-script/api.gs`
3. Ganti nilai `SPREADSHEET_ID` pada baris paling atas dengan ID spreadsheet Anda
4. Klik tombol **Save** (💾)
5. Di panel kiri, pilih fungsi **`setupSpreadsheet`** dari dropdown fungsi
6. Klik **Run** → izinkan semua permission yang diminta Google
7. Cek spreadsheet — semua sheet sudah terbuat dengan data dummy awal
8. Klik **Deploy → New Deployment**
9. Isi konfigurasi deployment:
   - **Type:** Web App
   - **Description:** `SiKehadiran API v1`
   - **Execute as:** Me
   - **Who has access:** Anyone
10. Klik **Deploy** → salin **URL deployment** yang diberikan

---

### Langkah 3: Konfigurasi Frontend

1. Buka file `assets/js/api.js`
2. Ganti nilai `SCRIPT_URL` dengan URL deployment dari langkah 2:
   ```javascript
   const SCRIPT_URL = 'https://script.google.com/macros/s/[YOUR_ID]/exec';
   ```
3. Sesuaikan `CONFIG.KANTOR` dengan koordinat kantor Anda:
   ```javascript
   KANTOR: {
     nama: 'Nama Kantor Anda',
     lat: -6.xxxxxx,   // latitude kantor
     lng: 106.xxxxxx,  // longitude kantor
     radius: 500       // radius dalam meter
   }
   ```
4. Untuk mencari koordinat kantor: buka **Google Maps** → klik kanan lokasi kantor → pilih **"What's here?"** atau **salin koordinat**

---

### Langkah 4: Setup Lokasi Kantor via Google Sheets (Admin)

1. Buka sheet **"Lokasi_Kantor"** di spreadsheet
2. Edit baris `LOK-001` atau tambah baris baru sesuai format:

   | ID | Nama_Kantor | Alamat | Lat | Lng | Radius_Meter | Aktif | Keterangan |
   |---|---|---|---|---|---|---|---|
   | LOK-001 | Kantor Pusat | Jl. Sudirman No. 1 | -6.200000 | 106.816700 | 500 | TRUE | Gedung Utama |
   | LOK-002 | Kantor Cabang | Jl. Gatot Subroto | -6.235000 | 106.825000 | 300 | TRUE | Lantai 5 |

3. Hanya lokasi dengan kolom **Aktif = TRUE** yang digunakan untuk validasi absensi
4. Multiple lokasi dapat ditambahkan untuk mendukung kantor cabang

---

### Langkah 5: Hosting di GitHub Pages

1. Buat repository baru di GitHub (visibility: **Public**)
2. Upload semua file project — **kecuali** folder `google-apps-script/`
3. Masuk ke **Settings → Pages**
4. Pilih **Branch: main** → **Folder: / (root)** → klik **Save**
5. URL aplikasi Anda akan menjadi:
   ```
   https://[username].github.io/[repo-name]/
   ```

---

### Langkah 6: Hosting di Netlify (Alternatif)

1. Buka [netlify.com](https://netlify.com) → login dengan akun GitHub
2. Klik **New site from Git** → pilih repository yang sudah diupload
3. Build settings biarkan default (tidak perlu build command)
4. Klik **Deploy site**
5. URL otomatis diberikan (misal: `https://sikehadiran.netlify.app`)
6. Opsional: sambungkan custom domain di **Domain Management**

---

### Langkah 7: Install di Android

1. Buka URL aplikasi di **Chrome Android**
2. Tunggu beberapa detik — akan muncul banner **"Add SiKehadiran to Home Screen"**
3. Klik **"Install"** atau **"Add"**
4. Jika banner tidak muncul secara otomatis:
   - Klik menu titik tiga (⋮) di pojok kanan atas Chrome
   - Pilih **"Add to Home Screen"** atau **"Install App"**
5. Aplikasi akan terinstall di launcher seperti aplikasi native

---

## 👥 Akun Demo (Default)

Akun berikut tersedia setelah menjalankan `setupSpreadsheet()`:

| NIP | Nama | Jabatan | Password |
|-----|------|---------|----------|
| 198501012010011001 | Budi Santoso | Staff Administrasi | BUMN2024 |
| 199203152015032002 | Siti Rahayu | Analis Keuangan | BUMN2024 |
| 197809202005011003 | Agus Prasetyo | Kepala Seksi | BUMN2024 |

> ⚠️ **Penting:** Segera ganti semua password setelah setup produksi!

---

## 🔑 Cara Ubah Password Karyawan

**Metode 1 — Melalui Google Sheets:**
1. Buka spreadsheet → sheet **"Karyawan"**
2. Temukan baris karyawan yang ingin diubah passwordnya
3. Hash password baru menggunakan tools online SHA-256, misalnya: [SHA256 Online](https://emn178.github.io/online-tools/sha256.html)
4. Paste hasil hash ke kolom **Password_Hash**

**Metode 2 — Melalui Apps Script:**
1. Buka Apps Script editor
2. Jalankan fungsi:
   ```javascript
   hashText('password_baru_anda');
   ```
3. Salin output dari log, paste ke kolom Password_Hash di sheet Karyawan

---

## ⚙️ Konfigurasi Fitur

### Validasi Radius Lokasi

- Koordinat dan radius kantor diatur di sheet **"Lokasi_Kantor"**
- Default radius: **500 meter**
- Mode **WFH** tidak memerlukan validasi radius GPS
- Admin dapat menambahkan multiple lokasi kantor (untuk kantor cabang)

### Jam Kerja & Toleransi Keterlambatan

- Default jam masuk: **08:00**
- Default jam pulang: **17:00**
- Toleransi terlambat: **15 menit** (masuk sebelum 08:15 = status Hadir)
- Semua konfigurasi dapat diubah di sheet **"Jam_Kerja"**

---

## 🗂️ Struktur File

```
absensi-bumn-pwa/
├── index.html                  # Aplikasi SPA utama
├── manifest.json               # PWA manifest (nama, ikon, warna tema)
├── sw.js                       # Service Worker (cache & offline support)
├── README.md                   # Dokumentasi ini
├── assets/
│   ├── css/
│   │   └── style.css           # Stylesheet tema BUMN (merah-putih)
│   ├── js/
│   │   ├── api.js              # API client & konfigurasi koneksi
│   │   ├── auth.js             # Autentikasi & manajemen session
│   │   ├── absen.js            # Logika absen masuk & pulang
│   │   ├── riwayat.js          # Riwayat absensi & pengajuan izin
│   │   └── app.js              # Controller utama & client-side routing
│   └── icons/                  # Ikon PWA berbagai ukuran (192x192, 512x512, dll.)
└── google-apps-script/
    └── api.gs                  # Backend Google Apps Script (doGet, doPost, setup)
```

---

## 👤 Cara Tambah Karyawan Baru

1. Buka spreadsheet Google Sheets → sheet **"Karyawan"**
2. Tambah baris baru di bawah data terakhir dengan format:

   | NIP | Nama | Jabatan | Divisi | Departemen | Password_Hash | Role | Foto_URL |
   |---|---|---|---|---|---|---|---|
   | 200001012025011001 | Nama Karyawan | Staff | IT | Teknologi | `[hash SHA-256]` | karyawan | _(kosong)_ |

3. Hash password menggunakan fungsi `hashText('password')` di Apps Script
4. Kolom **Role**: isi `karyawan` untuk staf biasa, `admin` untuk administrator

---

## 🛠️ Troubleshooting

**Q: Absen gagal meskipun sudah berada di dalam kantor**
> Cek koordinat di sheet **Lokasi_Kantor**. Pastikan koordinat tepat dan radius mencukupi (disarankan minimal 200–500 m). GPS smartphone kadang memiliki akurasi terbatas di dalam gedung.

**Q: Login gagal terus**
> Pastikan NIP diisi tanpa spasi dan password bersifat case-sensitive. Periksa kolom `Password_Hash` di sheet Karyawan — pastikan formatnya hash SHA-256 (64 karakter hex).

**Q: API error "Script function not found"**
> Pastikan fungsi `doGet` dan `doPost` ada di Apps Script. Lakukan **New Deployment** (bukan edit deployment lama) setiap kali ada perubahan kode.

**Q: Foto selfie tidak bisa diambil**
> Pastikan aplikasi diakses via **HTTPS**. Kamera hanya bisa diakses dari konteks aman. Localhost tidak mendukung.

**Q: Notifikasi push tidak muncul**
> Izinkan notifikasi di Chrome: buka **Pengaturan Situs → Notifikasi** → pastikan domain aplikasi diizinkan.

**Q: Tidak bisa install di Android**
> Pastikan menggunakan **Chrome** (bukan browser lain), URL sudah **HTTPS**, dan file `manifest.json` sudah dikonfigurasi dengan benar (termasuk ikon PWA).

**Q: Data tidak tersimpan ke spreadsheet**
> Cek URL deployment di `api.js`. Jika baru deploy ulang Apps Script, URL deployment akan berubah — perbarui di `SCRIPT_URL`.

---

## 📄 Lisensi

**MIT License** — Bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan apapun, termasuk komersial.

---

## 🤝 Kontribusi

Pull request dan laporan bug sangat diterima! Silakan buka _issue_ di repository GitHub untuk melaporkan masalah atau mengusulkan fitur baru.

---

*Dibuat dengan ❤️ untuk kemudahan absensi karyawan BUMN Indonesia*
