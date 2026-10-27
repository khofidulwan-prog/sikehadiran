// =============================================================
// api.js — Konfigurasi, API calls, dan helper functions
// Aplikasi Absensi BUMN PWA
// =============================================================

const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzwtab_BJ2Je8urIU5DCSQbSYClIBCuOZ_yf3Uaa65bo77GRk5dqAxpPVWfOxneq0yz/exec', // deployment Web App publik
  KANTOR: {
    nama: 'Kantor Pusat',
    lat: -2.084051,   // admin isi koordinat kantor
    lng: 105.132580,
    radius: 100       // meter
  },
  JAM_MASUK_STANDAR: '08:00',
  JAM_PULANG_STANDAR: '17:00',
  TOLERANSI_TERLAMBAT: 15, // menit
  MAX_SESSION_HOURS: 8
};

// =============================================================
// DEMO MODE DATA
// =============================================================
const DEMO_USERS = [
  {
    nip: '1999',
    nama: 'Khofid',
    jabatan: 'Direktur',
    divisi: 'Teknik',
    departemen: 'Direksi & Teknik',
    foto_url: '',
    role: 'admin',
    password: '123'
  },
  {
    nip: '198501012010011001',
    nama: 'Budi Santoso',
    jabatan: 'Staff Administrasi',
    divisi: 'SDM',
    departemen: 'Sumber Daya Manusia',
    foto_url: '',
    role: 'karyawan',
    password: 'BUMN2024'
  },
  {
    nip: '199203152015032002',
    nama: 'Siti Rahayu',
    jabatan: 'Analis Keuangan',
    divisi: 'Keuangan',
    departemen: 'Keuangan & Akuntansi',
    foto_url: '',
    role: 'karyawan',
    password: 'BUMN2024'
  },
  {
    nip: '197809202005011003',
    nama: 'Agus Prasetyo',
    jabatan: 'Kepala Seksi',
    divisi: 'Operasional',
    departemen: 'Operasional',
    foto_url: '',
    role: 'admin',
    password: 'BUMN2024'
  }
];

const DEMO_DATA = {
  karyawan: { ...DEMO_USERS[0], loginAt: new Date().toISOString() },
  riwayat: [
    { tanggal: '2026-10-20', hari: 'Selasa', jam_masuk: '07:55', jam_pulang: '17:10', durasi: '9 jam 15 menit', status: 'Hadir', mode: 'WFO' },
    { tanggal: '2026-10-19', hari: 'Senin',  jam_masuk: '08:20', jam_pulang: '17:00', durasi: '8 jam 40 menit', status: 'Terlambat', mode: 'WFO' },
    { tanggal: '2026-10-18', hari: 'Minggu', jam_masuk: '-',     jam_pulang: '-',     durasi: '-',              status: 'Libur',    mode: '-'   },
    { tanggal: '2026-10-17', hari: 'Sabtu',  jam_masuk: '-',     jam_pulang: '-',     durasi: '-',              status: 'Libur',    mode: '-'   },
    { tanggal: '2026-10-16', hari: 'Jumat',  jam_masuk: '07:58', jam_pulang: '17:05', durasi: '9 jam 7 menit',  status: 'Hadir',   mode: 'WFH' }
  ],
  statusHariIni: { sudah_masuk: false, sudah_pulang: false, jam_masuk: null, jam_pulang: null },
  rekap: { hadir: 15, terlambat: 2, absen: 0, izin: 1, total_kerja: '120 jam 30 menit' },
  pengajuan: [
    { id: 'PGJ001', tipe: 'Izin', tanggal_mulai: '2026-10-25', tanggal_selesai: '2026-10-25', alasan: 'Keperluan keluarga', status: 'Pending', created_at: '2026-10-21' }
  ]
};

// =============================================================
// HELPER: Deteksi Demo Mode
// =============================================================
function isDemoMode() {
  return CONFIG.SCRIPT_URL === 'GANTI_DENGAN_URL_GOOGLE_APPS_SCRIPT';
}

// =============================================================
// 1. apiLogin
// =============================================================
async function apiLogin(nip, password) {
  if (isDemoMode()) {
    await _delay(600);
    const cleanNip = String(nip || '').trim();
    const cleanPw = String(password || '').trim();
    const hashDefault = await hashPassword('BUMN2024');

    const foundUser = DEMO_USERS.find(u => u.nip === cleanNip);
    const isPwValid = (cleanPw === 'BUMN2024' || cleanPw.toLowerCase() === hashDefault.toLowerCase());

    if (foundUser && isPwValid) {
      const userData = { ...foundUser, loginAt: new Date().toISOString() };
      DEMO_DATA.karyawan = userData;
      return { success: true, data: userData };
    }

    return {
      success: false,
      pesan: 'NIP atau password salah. [Demo] Akun tersedia: Budi (198501012010011001), Siti (199203152015032002), Agus (197809202005011003) | Password: BUMN2024'
    };
  }

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'login', nip, password_hash: password, password })
    });
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal terhubung ke server: ' + err.message };
  }
}

// =============================================================
// 2. apiAbsenMasuk
// =============================================================
async function apiAbsenMasuk(data) {
  if (isDemoMode()) {
    await _delay(1000);
    DEMO_DATA.statusHariIni = {
      sudah_masuk: true,
      sudah_pulang: false,
      jam_masuk: data.jam,
      jam_pulang: null
    };
    return { success: true, pesan: 'Absen masuk berhasil disimpan (Mode Demo).' };
  }

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'absenMasuk', ...data })
    });
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal mengirim data absen masuk: ' + err.message };
  }
}

// =============================================================
// 3. apiAbsenPulang
// =============================================================
async function apiAbsenPulang(data) {
  if (isDemoMode()) {
    await _delay(1000);
    DEMO_DATA.statusHariIni = {
      sudah_masuk: true,
      sudah_pulang: true,
      jam_masuk: DEMO_DATA.statusHariIni.jam_masuk,
      jam_pulang: data.jam
    };
    return { success: true, pesan: 'Absen pulang berhasil disimpan (Mode Demo).' };
  }

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'absenPulang', ...data })
    });
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal mengirim data absen pulang: ' + err.message };
  }
}

// =============================================================
// 4. apiGetRiwayat
// =============================================================
async function apiGetRiwayat(nip, bulan, tahun) {
  if (isDemoMode()) {
    await _delay(600);
    return { success: true, data: DEMO_DATA.riwayat };
  }

  try {
    const url = `${CONFIG.SCRIPT_URL}?action=riwayat&nip=${encodeURIComponent(nip)}&bulan=${bulan}&tahun=${tahun}`;
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal memuat riwayat: ' + err.message };
  }
}

// =============================================================
// 5. apiGetStatusHariIni
// =============================================================
async function apiGetStatusHariIni(nip) {
  if (isDemoMode()) {
    await _delay(400);
    return { success: true, data: DEMO_DATA.statusHariIni };
  }

  try {
    const url = `${CONFIG.SCRIPT_URL}?action=statusHariIni&nip=${encodeURIComponent(nip)}`;
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal memuat status hari ini: ' + err.message };
  }
}

// =============================================================
// 6. apiGetRekapBulanan
// =============================================================
async function apiGetRekapBulanan(nip, bulan, tahun) {
  if (isDemoMode()) {
    await _delay(500);
    return { success: true, data: DEMO_DATA.rekap };
  }

  try {
    const url = `${CONFIG.SCRIPT_URL}?action=rekapBulanan&nip=${encodeURIComponent(nip)}&bulan=${bulan}&tahun=${tahun}`;
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal memuat rekap bulanan: ' + err.message };
  }
}

// =============================================================
// 7. apiKirimPengajuan
// =============================================================
async function apiKirimPengajuan(data) {
  if (isDemoMode()) {
    await _delay(900);
    const newItem = {
      id: 'PGJ' + String(Date.now()).slice(-4),
      ...data,
      status: 'Pending',
      created_at: new Date().toISOString().split('T')[0]
    };
    DEMO_DATA.pengajuan.unshift(newItem);
    return { success: true, pesan: 'Pengajuan berhasil dikirim (Mode Demo).' };
  }

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'kirimPengajuan', ...data })
    });
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal mengirim pengajuan: ' + err.message };
  }
}

// =============================================================
// 8. apiGetPengajuan
// =============================================================
async function apiGetPengajuan(nip) {
  if (isDemoMode()) {
    await _delay(500);
    return { success: true, data: DEMO_DATA.pengajuan };
  }

  try {
    const url = `${CONFIG.SCRIPT_URL}?action=getPengajuan&nip=${encodeURIComponent(nip)}`;
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    return { success: false, pesan: 'Gagal memuat data pengajuan: ' + err.message };
  }
}

// =============================================================
// 8b. apiGetLokasiKantor & daftarLokasiKantor
// =============================================================
let daftarLokasiKantor = [CONFIG.KANTOR];

async function apiGetLokasiKantor() {
  if (isDemoMode()) {
    return { success: true, data: [CONFIG.KANTOR] };
  }
  try {
    const url = `${CONFIG.SCRIPT_URL}?action=lokasi-kantor`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      daftarLokasiKantor = json.data.map(lok => ({
        nama: lok.nama_kantor,
        lat: parseFloat(lok.lat),
        lng: parseFloat(lok.lng),
        radius: parseFloat(lok.radius_meter) || 500,
        alamat: lok.alamat || ''
      }));
    }
    return json;
  } catch (err) {
    return { success: false, pesan: 'Gagal memuat lokasi kantor: ' + err.message };
  }
}

// =============================================================
// 9. hashPassword — SHA-256 via Web Crypto API
// =============================================================
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexString;
}

// =============================================================
// 10. hitungJarakMeter — Haversine Formula
// =============================================================
function hitungJarakMeter(lat1, lng1, lat2, lng2) {
  const R = 6371000; // radius bumi dalam meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // meter, dibulatkan
}

// =============================================================
// 11. validasiRadius
// =============================================================
function validasiRadius(lat, lng) {
  const lokasiArr = (daftarLokasiKantor && daftarLokasiKantor.length > 0) ? daftarLokasiKantor : [CONFIG.KANTOR];
  let dalamRadius = false;
  let lokasiTerdekat = null;
  let jarakTerdekat = Infinity;

  for (const lok of lokasiArr) {
    const jarak = hitungJarakMeter(lat, lng, lok.lat, lok.lng);
    if (jarak < jarakTerdekat) {
      jarakTerdekat = jarak;
      lokasiTerdekat = lok;
    }
    const maxRadius = lok.radius || 500;
    if (jarak <= maxRadius) {
      dalamRadius = true;
      lokasiTerdekat = lok;
      jarakTerdekat = jarak;
      break;
    }
  }

  const radiusMaks = (lokasiTerdekat && lokasiTerdekat.radius) ? lokasiTerdekat.radius : (CONFIG.KANTOR.radius || 500);
  const namaKantor = lokasiTerdekat ? lokasiTerdekat.nama : CONFIG.KANTOR.nama;

  return {
    valid: dalamRadius,
    jarak: jarakTerdekat,
    namaKantor: namaKantor,
    radiusMaks: radiusMaks,
    pesan: dalamRadius
      ? `Dalam radius ${namaKantor} (${jarakTerdekat} m, maks ${radiusMaks} m)`
      : `Di luar radius ${namaKantor} (${jarakTerdekat} m, maks ${radiusMaks} m)`
  };
}

// =============================================================
// 12. formatDurasi
// =============================================================
function formatDurasi(menitTotal) {
  if (!menitTotal || menitTotal < 0) return '0 menit';
  const jam = Math.floor(menitTotal / 60);
  const menit = menitTotal % 60;
  if (jam === 0) return `${menit} menit`;
  if (menit === 0) return `${jam} jam`;
  return `${jam} jam ${menit} menit`;
}

// =============================================================
// 13. getCurrentLocation
// =============================================================
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung browser ini.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        let pesan = 'Gagal mendapatkan lokasi.';
        switch (err.code) {
          case err.PERMISSION_DENIED:  pesan = 'Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.'; break;
          case err.POSITION_UNAVAILABLE: pesan = 'Informasi lokasi tidak tersedia.'; break;
          case err.TIMEOUT:            pesan = 'Permintaan lokasi timeout. Coba lagi.'; break;
        }
        reject(new Error(pesan));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// =============================================================
// 14. reverseGeocode — Nominatim OpenStreetMap
// =============================================================
async function reverseGeocode(lat, lng) {
  if (isDemoMode()) {
    return 'Jl. Demo Raya No. 1, Jakarta Pusat, DKI Jakarta';
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AbsensiBUMN-PWA/1.0' }
    });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (err) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// =============================================================
// 15. uploadFoto — Convert ke Base64
// =============================================================
function uploadFoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Tidak ada file yang dipilih.'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (JPG, PNG, dll).'));
      return;
    }
    // Batasi ukuran file: maks 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Ukuran foto terlalu besar. Maksimal 5MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // Compress gambar sebelum kirim
      _compressImage(e.target.result, 800, 0.7)
        .then(resolve)
        .catch(() => resolve(e.target.result)); // fallback tanpa kompresi
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });
}

// =============================================================
// PRIVATE HELPERS
// =============================================================

/** Delay untuk simulasi loading di demo mode */
function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Kompres gambar menggunakan Canvas */
function _compressImage(base64Src, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = base64Src;
  });
}
