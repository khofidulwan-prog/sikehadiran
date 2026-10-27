// =============================================================
// absen.js — Logika Absensi Masuk & Pulang
// Aplikasi Absensi BUMN PWA
// =============================================================

// =============================================================
// STATE
// =============================================================
let lokasiMasuk    = null;
let lokasiPulang   = null;
let fotoMasukBase64  = null;
let fotoPulangBase64 = null;
let jamMasukHariIni  = null;

let _jamMasukInterval  = null;
let _jamPulangInterval = null;

// =============================================================
// 1. initAbsenMasuk
// =============================================================
function initAbsenMasuk() {
  // Reset state
  lokasiMasuk     = null;
  fotoMasukBase64 = null;

  // Update jam tiap detik
  _updateJamAbsen('absen-jam-masuk');
  if (_jamMasukInterval) clearInterval(_jamMasukInterval);
  _jamMasukInterval = setInterval(() => _updateJamAbsen('absen-jam-masuk'), 1000);

  // Ambil lokasi otomatis
  ambilLokasi('masuk');

  // Event listener foto
  const fotoInput = document.getElementById('input-foto-masuk') || document.getElementById('foto-masuk');
  if (fotoInput) {
    fotoInput.onchange = handleFotoMasuk;
  }

  // Event listener submit
  const btnSubmit = document.getElementById('btn-submit-masuk');
  if (btnSubmit) {
    btnSubmit.onclick = submitAbsenMasuk;
  }

  // Tombol ambil ulang lokasi
  const btnRefreshLokasi = document.getElementById('btn-refresh-lokasi-masuk');
  if (btnRefreshLokasi) {
    btnRefreshLokasi.onclick = () => ambilLokasi('masuk');
  }
}

// =============================================================
// 2. initAbsenPulang
// =============================================================
function initAbsenPulang() {
  // Reset state
  lokasiPulang     = null;
  fotoPulangBase64 = null;

  // Update jam tiap detik
  _updateJamAbsen('absen-jam-pulang');
  if (_jamPulangInterval) clearInterval(_jamPulangInterval);
  _jamPulangInterval = setInterval(() => {
    _updateJamAbsen('absen-jam-pulang');
    // Update hitung durasi kerja secara realtime
    if (jamMasukHariIni) {
      const now = new Date();
      const jamSekarang = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const durasi = hitungTotalJamKerja(jamMasukHariIni, jamSekarang);
      const durasiEl = document.getElementById('durasi-kerja-sementara');
      if (durasiEl) durasiEl.textContent = formatDurasi(durasi.total_menit);

      // Tampilkan info lembur
      const lemburEl = document.getElementById('info-lembur');
      if (lemburEl) {
        if (durasi.lembur_menit > 0) {
          lemburEl.textContent = `Lembur: ${formatDurasi(durasi.lembur_menit)}`;
          lemburEl.style.display = 'block';
        } else {
          lemburEl.style.display = 'none';
        }
      }
    }
  }, 1000);

  // Tampilkan jam masuk
  if (jamMasukHariIni) {
    const elJamMasuk = document.getElementById('jam-masuk-ref');
    if (elJamMasuk) elJamMasuk.textContent = jamMasukHariIni;
  }

  // Ambil lokasi otomatis
  ambilLokasi('pulang');

  // Event listener foto
  const fotoInput = document.getElementById('input-foto-pulang') || document.getElementById('foto-pulang');
  if (fotoInput) {
    fotoInput.onchange = handleFotoPulang;
  }

  // Event listener submit
  const btnSubmit = document.getElementById('btn-submit-pulang');
  if (btnSubmit) {
    btnSubmit.onclick = submitAbsenPulang;
  }

  // Tombol ambil ulang lokasi
  const btnRefreshLokasi = document.getElementById('btn-refresh-lokasi-pulang');
  if (btnRefreshLokasi) {
    btnRefreshLokasi.onclick = () => ambilLokasi('pulang');
  }
}

// =============================================================
// 3. ambilLokasi
// =============================================================
async function ambilLokasi(tipe) {
  const prefix = tipe === 'masuk' ? 'masuk' : 'pulang';
  const elLat    = document.getElementById(`absen-lat-${prefix}`);
  const elLng    = document.getElementById(`absen-lng-${prefix}`);
  const elNama   = document.getElementById(prefix === 'pulang' ? 'absen-lokasi-nama-pulang' : 'absen-lokasi-nama') || document.getElementById(`lokasi-nama-${prefix}`);
  const elBadge  = document.getElementById(prefix === 'pulang' ? 'absen-radius-status-pulang' : 'absen-radius-status') || document.getElementById(`lokasi-badge-${prefix}`);
  const elStatus = document.getElementById(`lokasi-status-${prefix}`);
  const elKoord  = document.getElementById(`lokasi-koord-${prefix}`);

  if (elStatus) { elStatus.textContent = '📡 Mendeteksi lokasi...'; elStatus.className = 'lokasi-status loading'; }
  if (elNama)   elNama.textContent   = 'Mengambil lokasi...';
  if (elLat)    elLat.textContent    = '...';
  if (elLng)    elLng.textContent    = '...';
  if (elBadge) {
    elBadge.className = 'radius-status radius-loading lokasi-badge';
    elBadge.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memeriksa radius...';
  }

  try {
    let coords;
    if (isDemoMode()) {
      // Demo: gunakan koordinat sekitar kantor (dalam radius)
      await _delay(600);
      coords = {
        lat: CONFIG.KANTOR.lat + (Math.random() * 0.002 - 0.001),
        lng: CONFIG.KANTOR.lng + (Math.random() * 0.002 - 0.001),
        accuracy: 10
      };
    } else {
      coords = await getCurrentLocation();
    }

    const { lat, lng, accuracy } = coords;

    if (elLat)   elLat.textContent   = lat.toFixed(6);
    if (elLng)   elLng.textContent   = lng.toFixed(6);
    if (elKoord) elKoord.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy || 0)}m)`;
    if (elStatus) { elStatus.textContent = '✅ Lokasi terdeteksi'; elStatus.className = 'lokasi-status success'; }

    // Reverse geocode
    reverseGeocode(lat, lng).then(alamat => {
      if (elNama) elNama.textContent = alamat;
    }).catch(() => {
      if (elNama) elNama.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    });

    // Validasi radius
    const validasi = validasiRadius(lat, lng);
    if (elBadge) {
      if (validasi.valid) {
        elBadge.className = 'radius-status radius-in lokasi-badge badge-sukses';
        elBadge.innerHTML = `<i class="fas fa-check-circle"></i> Dalam Radius (${validasi.jarak} m, maks ${validasi.radiusMaks || 500} m)`;
      } else {
        elBadge.className = 'radius-status radius-out lokasi-badge badge-gagal';
        elBadge.innerHTML = `<i class="fas fa-times-circle"></i> Di Luar Radius (${validasi.jarak} m, maks ${validasi.radiusMaks || 500} m)`;
      }
    }

    // Simpan ke state
    const lokasiData = {
      lat,
      lng,
      accuracy: accuracy || 0,
      validRadius: validasi.valid,
      jarak: validasi.jarak,
      lokasiNama: elNama ? elNama.textContent : ''
    };
    if (tipe === 'masuk') {
      lokasiMasuk = lokasiData;
    } else {
      lokasiPulang = lokasiData;
    }

    return lokasiData;
  } catch (err) {
    if (elStatus) { elStatus.textContent = `❌ ${err.message}`; elStatus.className = 'lokasi-status error'; }
    if (elBadge) {
      elBadge.className = 'radius-status radius-out lokasi-badge badge-gagal';
      elBadge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Gagal ambil lokasi: ${err.message}`;
    }
    return null;
  }
}

// =============================================================
// 4. handleFotoMasuk
// =============================================================
async function handleFotoMasuk(event) {
  const file = event.target.files[0];
  if (!file) return;

  const previewEl = document.getElementById('preview-foto-masuk') || document.getElementById('foto-masuk-preview');
  const placeholderEl = document.getElementById('foto-placeholder-masuk');
  const statusEl  = document.getElementById('foto-masuk-status');

  if (statusEl) statusEl.textContent = '⏳ Memproses foto...';

  try {
    const base64 = await uploadFoto(file);
    fotoMasukBase64 = base64;

    if (previewEl) {
      previewEl.src     = base64;
      previewEl.style.display = 'block';
    }
    if (placeholderEl) {
      placeholderEl.style.display = 'none';
    }
    if (statusEl) statusEl.textContent = '✅ Foto siap';
  } catch (err) {
    fotoMasukBase64 = null;
    if (statusEl) statusEl.textContent = `❌ ${err.message}`;
    if (typeof showError === 'function') showError(err.message);
  }
}

// =============================================================
// 5. handleFotoPulang
// =============================================================
async function handleFotoPulang(event) {
  const file = event.target.files[0];
  if (!file) return;

  const previewEl = document.getElementById('preview-foto-pulang') || document.getElementById('foto-pulang-preview');
  const placeholderEl = document.getElementById('foto-placeholder-pulang');
  const statusEl  = document.getElementById('foto-pulang-status');

  if (statusEl) statusEl.textContent = '⏳ Memproses foto...';

  try {
    const base64 = await uploadFoto(file);
    fotoPulangBase64 = base64;

    if (previewEl) {
      previewEl.src     = base64;
      previewEl.style.display = 'block';
    }
    if (placeholderEl) {
      placeholderEl.style.display = 'none';
    }
    if (statusEl) statusEl.textContent = '✅ Foto siap';
  } catch (err) {
    fotoPulangBase64 = null;
    if (statusEl) statusEl.textContent = `❌ ${err.message}`;
    if (typeof showError === 'function') showError(err.message);
  }
}

// =============================================================
// 6. submitAbsenMasuk
// =============================================================
function submitAbsenMasuk() {
  // Validasi lokasi
  if (!lokasiMasuk) {
    if (typeof showError === 'function') showError('Lokasi belum terdeteksi. Tunggu atau tekan tombol refresh lokasi.');
    return;
  }

  // Cek radius (WFO wajib dalam radius, WFH dikecualikan)
  const modeAbsen = _getModeAbsen('masuk');
  if (modeAbsen === 'WFO' && !lokasiMasuk.validRadius) {
    const konfirm = confirm(`Anda berada di luar radius kantor (${lokasiMasuk.jarak} m). Tetap lanjutkan absen?`);
    if (!konfirm) return;
  }

  // Validasi foto
  if (!fotoMasukBase64) {
    if (typeof showError === 'function') showError('Foto selfie wajib diambil sebelum absen.');
    return;
  }

  // Tampilkan modal konfirmasi
  const now         = new Date();
  const jamSekarang = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const status      = tentukanStatus(jamSekarang);

  const elKonfirmJam    = document.getElementById('summary-masuk-jam') || document.getElementById('konfirm-masuk-jam');
  const elKonfirmStatus = document.getElementById('konfirm-masuk-status');
  const elKonfirmLokasi = document.getElementById('summary-masuk-lokasi') || document.getElementById('konfirm-masuk-lokasi');
  const elKonfirmMode   = document.getElementById('summary-masuk-mode');
  const elKonfirmFoto   = document.getElementById('summary-masuk-foto');

  if (elKonfirmJam)    elKonfirmJam.textContent    = jamSekarang;
  if (elKonfirmStatus) elKonfirmStatus.textContent  = status;
  if (elKonfirmLokasi) elKonfirmLokasi.textContent  = lokasiMasuk.validRadius ? `Dalam radius (${lokasiMasuk.jarak} m)` : `Di luar radius (${lokasiMasuk.jarak} m)`;
  if (elKonfirmMode)   elKonfirmMode.textContent   = modeAbsen;
  if (elKonfirmFoto)   elKonfirmFoto.textContent   = 'Siap (Selfie) ✓';

  if (typeof showModal === 'function') showModal('modal-konfirmasi-masuk');
}

// =============================================================
// 7. konfirmasiAbsenMasuk
// =============================================================
async function konfirmasiAbsenMasuk() {
  if (typeof hideModal === 'function')   hideModal('modal-konfirmasi-masuk');
  if (typeof showLoading === 'function') showLoading();

  const session = getSession();
  if (!session) {
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showError === 'function')   showError('Sesi tidak valid. Silakan login kembali.');
    return;
  }

  const now         = new Date();
  const tanggal     = now.toISOString().split('T')[0];
  const hari        = formatHariIndo(tanggal);
  const jam         = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const modeAbsen   = _getModeAbsen('masuk');
  const keteranganEl = document.getElementById('keterangan-masuk');
  const keterangan  = keteranganEl ? keteranganEl.value.trim() : '';
  const lokasiNamaEl = document.getElementById('lokasi-nama-masuk');
  const lokasiNama  = lokasiNamaEl ? lokasiNamaEl.textContent : '';

  const data = {
    nip:          session.nip,
    nama:         session.nama,
    tanggal,
    hari,
    jam,
    mode_wfo_wfh: modeAbsen,
    lat:          lokasiMasuk.lat,
    lng:          lokasiMasuk.lng,
    lokasi_nama:  lokasiNama,
    foto_base64:  fotoMasukBase64,
    keterangan,
    tipe:         'masuk'
  };

  try {
    const result = await apiAbsenMasuk(data);
    if (typeof hideLoading === 'function') hideLoading();

    if (result.success) {
      jamMasukHariIni = jam.substring(0, 5); // simpan HH:MM
      clearInterval(_jamMasukInterval);

      if (typeof showSuccess === 'function') {
        showSuccess('Absen masuk berhasil! ' + (result.pesan || ''));
      }

      // Navigasi ke dashboard setelah 2 detik
      setTimeout(() => {
        if (typeof navigateTo === 'function') navigateTo('dashboard');
      }, 2000);
    } else {
      if (typeof showError === 'function') showError(result.pesan || 'Gagal melakukan absen masuk.');
    }
  } catch (err) {
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showError === 'function')   showError('Terjadi kesalahan: ' + err.message);
  }
}

// =============================================================
// 8. submitAbsenPulang
// =============================================================
function submitAbsenPulang() {
  // Validasi lokasi
  if (!lokasiPulang) {
    if (typeof showError === 'function') showError('Lokasi belum terdeteksi. Tunggu atau tekan tombol refresh lokasi.');
    return;
  }

  const modeAbsen = _getModeAbsen('pulang');
  if (modeAbsen === 'WFO' && !lokasiPulang.validRadius) {
    const konfirm = confirm(`Anda berada di luar radius kantor (${lokasiPulang.jarak} m). Tetap lanjutkan absen pulang?`);
    if (!konfirm) return;
  }

  // Validasi foto
  if (!fotoPulangBase64) {
    if (typeof showError === 'function') showError('Foto selfie wajib diambil sebelum absen pulang.');
    return;
  }

  // Hitung durasi
  const now         = new Date();
  const jamSekarang = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const durasi      = jamMasukHariIni ? hitungTotalJamKerja(jamMasukHariIni, jamSekarang) : null;

  const elKonfirmJam    = document.getElementById('summary-pulang-jam') || document.getElementById('konfirm-pulang-jam');
  const elKonfirmDurasi = document.getElementById('summary-pulang-durasi') || document.getElementById('konfirm-pulang-durasi');
  const elKonfirmLembur = document.getElementById('konfirm-pulang-lembur');
  const elKonfirmLokasi = document.getElementById('summary-pulang-lokasi');
  const elKonfirmMode   = document.getElementById('summary-pulang-mode');

  if (elKonfirmJam)    elKonfirmJam.textContent    = jamSekarang;
  if (elKonfirmDurasi && durasi) elKonfirmDurasi.textContent = formatDurasi(durasi.total_menit);
  if (elKonfirmLembur && durasi) {
    elKonfirmLembur.textContent  = durasi.lembur_menit > 0 ? `Lembur: ${formatDurasi(durasi.lembur_menit)}` : 'Tidak ada lembur';
  }
  if (elKonfirmLokasi) elKonfirmLokasi.textContent = lokasiPulang && lokasiPulang.validRadius ? `Dalam radius (${lokasiPulang.jarak} m)` : `Di luar radius (${lokasiPulang ? lokasiPulang.jarak : 0} m)`;
  if (elKonfirmMode)   elKonfirmMode.textContent   = modeAbsen;

  if (typeof showModal === 'function') showModal('modal-konfirmasi-pulang');
}

// =============================================================
// 9. konfirmasiAbsenPulang
// =============================================================
async function konfirmasiAbsenPulang() {
  if (typeof hideModal === 'function')   hideModal('modal-konfirmasi-pulang');
  if (typeof showLoading === 'function') showLoading();

  const session = getSession();
  if (!session) {
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showError === 'function')   showError('Sesi tidak valid. Silakan login kembali.');
    return;
  }

  const now         = new Date();
  const tanggal     = now.toISOString().split('T')[0];
  const hari        = formatHariIndo(tanggal);
  const jam         = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const jamPulangStr = jam.substring(0, 5);
  const modeAbsen   = _getModeAbsen('pulang');

  const durasi      = jamMasukHariIni ? hitungTotalJamKerja(jamMasukHariIni, jamPulangStr) : { jam: 0, menit: 0, total_menit: 0, lembur_menit: 0 };
  const keteranganEl = document.getElementById('keterangan-pulang');
  const keterangan  = keteranganEl ? keteranganEl.value.trim() : '';
  const lokasiNamaEl = document.getElementById('lokasi-nama-pulang');
  const lokasiNama  = lokasiNamaEl ? lokasiNamaEl.textContent : '';

  const data = {
    nip:           session.nip,
    nama:          session.nama,
    tanggal,
    hari,
    jam,
    mode_wfo_wfh:  modeAbsen,
    lat:           lokasiPulang.lat,
    lng:           lokasiPulang.lng,
    lokasi_nama:   lokasiNama,
    foto_base64:   fotoPulangBase64,
    keterangan,
    jam_masuk_ref: jamMasukHariIni,
    durasi_kerja:  formatDurasi(durasi.total_menit),
    durasi_menit:  durasi.total_menit,
    info_lembur:   durasi.lembur_menit > 0 ? formatDurasi(durasi.lembur_menit) : '-',
    lembur_menit:  durasi.lembur_menit,
    tipe:          'pulang'
  };

  try {
    const result = await apiAbsenPulang(data);
    if (typeof hideLoading === 'function') hideLoading();

    if (result.success) {
      clearInterval(_jamPulangInterval);

      if (typeof showSuccess === 'function') {
        showSuccess('Absen pulang berhasil! ' + (result.pesan || ''));
      }

      setTimeout(() => {
        if (typeof navigateTo === 'function') navigateTo('dashboard');
      }, 2000);
    } else {
      if (typeof showError === 'function') showError(result.pesan || 'Gagal melakukan absen pulang.');
    }
  } catch (err) {
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showError === 'function')   showError('Terjadi kesalahan: ' + err.message);
  }
}

// =============================================================
// 10. hitungTotalJamKerja
// =============================================================
function hitungTotalJamKerja(jamMasuk, jamPulang) {
  if (!jamMasuk || !jamPulang) return { jam: 0, menit: 0, total_menit: 0, lembur_menit: 0 };

  const [hMasuk, mMasuk]   = jamMasuk.split(':').map(Number);
  const [hPulang, mPulang] = jamPulang.split(':').map(Number);

  const totalMasukMenit  = hMasuk * 60 + mMasuk;
  const totalPulangMenit = hPulang * 60 + mPulang;
  const totalMenit       = Math.max(0, totalPulangMenit - totalMasukMenit);

  const jam   = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;

  // Hitung lembur: lebih dari jam pulang standar
  const [hStandar, mStandar] = CONFIG.JAM_PULANG_STANDAR.split(':').map(Number);
  const standarMenit = hStandar * 60 + mStandar;
  const lemburMenit  = Math.max(0, totalPulangMenit - standarMenit);

  return { jam, menit, total_menit: totalMenit, lembur_menit: lemburMenit };
}

// =============================================================
// 11. tentukanStatus
// =============================================================
function tentukanStatus(jamMasukStr) {
  if (!jamMasukStr) return 'Tidak Diketahui';

  const [hMasuk, mMasuk] = jamMasukStr.split(':').map(Number);
  const [hStandar, mStandar] = CONFIG.JAM_MASUK_STANDAR.split(':').map(Number);

  const menitMasuk   = hMasuk * 60 + mMasuk;
  const menitStandar = hStandar * 60 + mStandar + CONFIG.TOLERANSI_TERLAMBAT;

  return menitMasuk <= menitStandar ? 'Hadir' : 'Terlambat';
}

// =============================================================
// 12. updateStatusAbsenUI
// =============================================================
function updateStatusAbsenUI(statusHariIni) {
  if (!statusHariIni) return;

  const { sudah_masuk, sudah_pulang, jam_masuk, jam_pulang } = statusHariIni;

  // Simpan jam masuk ke state global
  if (jam_masuk) jamMasukHariIni = jam_masuk;

  // Tombol absen masuk
  const btnMasuk = document.getElementById('btn-absen-masuk');
  if (btnMasuk) {
    btnMasuk.disabled = sudah_masuk;
    if (sudah_masuk) {
      btnMasuk.classList.add('btn-disabled');
      btnMasuk.title = 'Sudah absen masuk hari ini';
    } else {
      btnMasuk.classList.remove('btn-disabled');
      btnMasuk.title = 'Absen Masuk';
    }
  }

  // Tombol absen pulang
  const btnPulang = document.getElementById('btn-absen-pulang');
  if (btnPulang) {
    const bisaPulang   = sudah_masuk && !sudah_pulang;
    const sudahPulang  = sudah_masuk && sudah_pulang;
    btnPulang.disabled = !bisaPulang;

    if (sudahPulang) {
      btnPulang.classList.add('btn-disabled');
      btnPulang.title = 'Sudah absen pulang hari ini';
    } else if (bisaPulang) {
      btnPulang.classList.remove('btn-disabled');
      btnPulang.title = 'Absen Pulang';
    } else {
      btnPulang.classList.add('btn-disabled');
      btnPulang.title = 'Belum absen masuk';
    }
  }

  // Tampilkan jam masuk di dashboard
  const elJamMasukDash = document.getElementById('info-jam-masuk') || document.getElementById('dash-jam-masuk');
  if (elJamMasukDash) {
    elJamMasukDash.textContent = jam_masuk ? jam_masuk : '--:--';
  }

  // Tampilkan jam pulang di dashboard
  const elJamPulangDash = document.getElementById('info-jam-pulang') || document.getElementById('dash-jam-pulang');
  if (elJamPulangDash) {
    elJamPulangDash.textContent = jam_pulang ? jam_pulang : '--:--';
  }

  // Badge status hari ini
  const badgeStatus = document.getElementById('dash-status-badge');
  if (badgeStatus) {
    let teks  = 'Belum Absen';
    let kelas = 'badge-warning';

    if (sudah_masuk && !sudah_pulang) {
      const status = tentukanStatus(jam_masuk);
      teks  = status;
      kelas = status === 'Terlambat' ? 'badge-danger' : 'badge-success';
    } else if (sudah_masuk && sudah_pulang) {
      teks  = 'Selesai';
      kelas = 'badge-info';
    }

    badgeStatus.textContent = teks;
    badgeStatus.className   = `badge ${kelas}`;
  }
}

// =============================================================
// PRIVATE HELPERS
// =============================================================

function _updateJamAbsen(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const now = new Date();
  el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function _getModeAbsen(tipe) {
  const radio = document.querySelector(`input[name="mode-${tipe}"]:checked`);
  if (radio) return radio.value;
  const modeId = tipe === 'masuk' ? 'mode-absen-masuk' : 'mode-absen-pulang';
  const el = document.getElementById(modeId);
  return el ? el.value : 'WFO';
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
