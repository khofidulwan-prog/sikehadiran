// riwayat.js — Modul Riwayat Absensi & Pengajuan Izin

'use strict';

// ============================================================
// MODULE STATE
// ============================================================
let _riwayatData = [];
let _pengajuanData = [];
let _currentBulan = '';
let _currentTahun = '';

// ============================================================
// DEMO DATA FALLBACK
// ============================================================
const DEMO_RIWAYAT = [
  {
    id: 'ABS-001',
    tanggal: '2026-10-20',
    hari: 'Selasa',
    jam_masuk: '07:55',
    jam_pulang: '17:05',
    durasi: '9 jam 10 menit',
    status: 'Hadir',
    mode: 'WFO',
    lat_masuk: -6.200100,
    lng_masuk: 106.816700,
    lokasi_nama: 'Jl. Sudirman, Jakarta',
    keterangan: ''
  },
  {
    id: 'ABS-002',
    tanggal: '2026-10-19',
    hari: 'Senin',
    jam_masuk: '08:22',
    jam_pulang: '17:00',
    durasi: '8 jam 38 menit',
    status: 'Terlambat',
    mode: 'WFO',
    lat_masuk: -6.200100,
    lng_masuk: 106.816700,
    lokasi_nama: 'Jl. Sudirman, Jakarta',
    keterangan: 'Macet'
  },
  {
    id: 'ABS-003',
    tanggal: '2026-10-16',
    hari: 'Jumat',
    jam_masuk: '07:58',
    jam_pulang: '17:02',
    durasi: '9 jam 4 menit',
    status: 'Hadir',
    mode: 'WFH',
    lat_masuk: -6.210000,
    lng_masuk: 106.820000,
    lokasi_nama: 'Rumah',
    keterangan: ''
  },
  {
    id: 'ABS-004',
    tanggal: '2026-10-15',
    hari: 'Kamis',
    jam_masuk: '',
    jam_pulang: '',
    durasi: '',
    status: 'Izin',
    mode: '-',
    lat_masuk: 0,
    lng_masuk: 0,
    lokasi_nama: '',
    keterangan: 'Sakit'
  },
  {
    id: 'ABS-005',
    tanggal: '2026-10-14',
    hari: 'Rabu',
    jam_masuk: '08:00',
    jam_pulang: '17:00',
    durasi: '9 jam',
    status: 'Hadir',
    mode: 'WFO',
    lat_masuk: -6.200100,
    lng_masuk: 106.816700,
    lokasi_nama: 'Jl. Sudirman, Jakarta',
    keterangan: ''
  }
];

const DEMO_PENGAJUAN = [
  {
    id: 'IZN-001',
    jenis_izin: 'Izin Sakit',
    tanggal_mulai: '2026-10-15',
    tanggal_selesai: '2026-10-15',
    jumlah_hari: 1,
    alasan: 'Demam tinggi',
    status: 'Disetujui',
    disetujui_oleh: 'Agus Prasetyo',
    tanggal_pengajuan: '2026-10-14'
  },
  {
    id: 'IZN-002',
    jenis_izin: 'Cuti Tahunan',
    tanggal_mulai: '2026-11-10',
    tanggal_selesai: '2026-11-14',
    jumlah_hari: 5,
    alasan: 'Liburan keluarga',
    status: 'Pending',
    disetujui_oleh: '',
    tanggal_pengajuan: '2026-10-20'
  }
];

// ============================================================
// CONSTANTS
// ============================================================
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_CLASS = {
  'hadir': 'success',
  'terlambat': 'warning',
  'izin': 'info',
  'absen': 'danger'
};

const MODE_ICON = {
  'WFO': 'fa-building',
  'WFH': 'fa-home',
  'Dinas Luar': 'fa-car'
};

const JENIS_IZIN_ICON = {
  'Izin Sakit': 'fa-hospital',
  'Cuti Tahunan': 'fa-umbrella-beach',
  'Cuti Melahirkan': 'fa-baby',
  'Izin Pribadi': 'fa-user-clock',
  'Dinas Luar': 'fa-briefcase',
  'Izin Lainnya': 'fa-file-alt'
};

// ============================================================
// 1. initRiwayatPage()
// ============================================================
/**
 * Inisialisasi halaman Riwayat Absensi:
 * - Populate dropdown bulan & tahun
 * - Set default ke bulan & tahun saat ini
 * - Pasang event listener filter dan tombol Export PDF
 * - Panggil loadRiwayat()
 */
function initRiwayatPage() {
  const selectBulan = document.getElementById('filter-bulan');
  const selectTahun = document.getElementById('filter-tahun');

  if (!selectBulan || !selectTahun) {
    console.warn('[riwayat.js] Elemen filter bulan/tahun tidak ditemukan.');
    return;
  }

  // Populate dropdown bulan (01–12)
  selectBulan.innerHTML = '';
  NAMA_BULAN.forEach((nama, idx) => {
    const val = String(idx + 1).padStart(2, '0');
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = nama;
    selectBulan.appendChild(opt);
  });

  // Populate dropdown tahun (3 tahun terakhir hingga tahun ini)
  const tahunIni = new Date().getFullYear();
  selectTahun.innerHTML = '';
  for (let t = tahunIni - 2; t <= tahunIni; t++) {
    const opt = document.createElement('option');
    opt.value = String(t);
    opt.textContent = String(t);
    selectTahun.appendChild(opt);
  }

  // Set default ke bulan & tahun saat ini
  const now = new Date();
  selectBulan.value = String(now.getMonth() + 1).padStart(2, '0');
  selectTahun.value = String(now.getFullYear());

  // Event listener filter → reload riwayat
  selectBulan.addEventListener('change', loadRiwayat);
  selectTahun.addEventListener('change', loadRiwayat);

  // Event listener tombol Export PDF
  const btnExport = document.getElementById('btn-export-pdf');
  if (btnExport) {
    btnExport.addEventListener('click', exportPDF);
  }

  // Load data riwayat awal
  loadRiwayat();
}

// ============================================================
// 2. loadRiwayat()
// ============================================================
/**
 * Muat data riwayat absensi dari API atau demo data.
 * Menampilkan skeleton loading selama proses berlangsung.
 */
async function loadRiwayat() {
  const listEl = document.getElementById('list-riwayat');
  if (!listEl) return;

  // Ambil nilai filter
  const selectBulan = document.getElementById('filter-bulan');
  const selectTahun = document.getElementById('filter-tahun');
  _currentBulan = selectBulan ? selectBulan.value : String(new Date().getMonth() + 1).padStart(2, '0');
  _currentTahun = selectTahun ? selectTahun.value : String(new Date().getFullYear());

  // Tampilkan skeleton loading
  listEl.innerHTML = _buildSkeletonLoading(5);

  try {
    let data;

    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
      // Gunakan demo data fallback
      await _simulateDelay(600);
      data = DEMO_RIWAYAT.filter(item => {
        const [tYear, tMonth] = item.tanggal.split('-');
        return tMonth === _currentBulan && tYear === _currentTahun;
      });
    } else {
      // Ambil dari API nyata
      const session = typeof getSession === 'function' ? getSession() : null;
      const nip = session ? session.nip : '';
      data = await apiGetRiwayat(nip, _currentBulan, _currentTahun);
    }

    _riwayatData = data || [];
    renderRiwayatList(_riwayatData);
    updateRiwayatSummary(_riwayatData);

  } catch (err) {
    console.error('[riwayat.js] Gagal memuat riwayat:', err);
    listEl.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
        <p class="text-muted">Gagal memuat data riwayat absensi.<br>Periksa koneksi internet Anda.</p>
        <button class="btn btn-outline-primary btn-sm mt-2" onclick="loadRiwayat()">
          <i class="fas fa-redo me-1"></i>Coba Lagi
        </button>
      </div>
    `;
  }
}

// ============================================================
// 3. renderRiwayatList(dataArray)
// ============================================================
/**
 * Render daftar item riwayat ke elemen #list-riwayat.
 * @param {Array} dataArray - Array objek riwayat absensi
 */
function renderRiwayatList(dataArray) {
  const listEl = document.getElementById('list-riwayat');
  if (!listEl) return;

  if (!dataArray || dataArray.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state text-center py-5">
        <img src="assets/icons/empty-calendar.svg" alt="Tidak ada data"
             style="width:120px;opacity:.6;" onerror="this.style.display='none'">
        <i class="fas fa-calendar-times fa-4x text-muted mb-3" style="display:block;"></i>
        <p class="text-muted fw-semibold">Belum ada data absensi bulan ini</p>
        <small class="text-muted">Pilih bulan lain atau mulai catat kehadiran Anda.</small>
      </div>
    `;
    return;
  }

  listEl.innerHTML = dataArray.map(item => renderRiwayatItem(item)).join('');
}

// ============================================================
// 4. renderRiwayatItem(item)
// ============================================================
/**
 * Render satu kartu riwayat absensi sebagai string HTML.
 * @param {Object} item - Objek riwayat absensi
 * @returns {string} HTML string kartu riwayat
 */
function renderRiwayatItem(item) {
  const statusKey = (item.status || '').toLowerCase();
  const statusClass = STATUS_CLASS[statusKey] || 'secondary';
  const modeIconClass = MODE_ICON[item.mode] || 'fa-question';

  // Format tanggal dari 'YYYY-MM-DD'
  const [, , tgl] = (item.tanggal || '').split('-');
  const tglNum = tgl ? parseInt(tgl, 10) : '-';

  const jamMasuk = item.jam_masuk || '-';
  const jamPulang = item.jam_pulang || '-';
  const durasi = item.durasi || '-';
  const mode = item.mode && item.mode !== '-' ? item.mode : '-';

  return `
    <div class="riwayat-card status-${statusClass}" onclick="showDetailRiwayat('${item.id}')">
      <div class="riwayat-header">
        <div class="riwayat-date">
          <span class="riwayat-day">${_escHtml(item.hari || '')}</span>
          <span class="riwayat-date-num">${tglNum}</span>
        </div>
        <span class="badge badge-${statusKey}">${_escHtml(item.status || '')}</span>
      </div>
      <div class="riwayat-body">
        <div class="riwayat-time">
          <div class="time-item">
            <i class="fas fa-sign-in-alt"></i>
            <span>${_escHtml(jamMasuk)}</span>
          </div>
          <div class="time-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="time-item">
            <i class="fas fa-sign-out-alt"></i>
            <span>${_escHtml(jamPulang)}</span>
          </div>
        </div>
        <div class="riwayat-meta">
          <span><i class="fas fa-clock"></i> ${_escHtml(durasi)}</span>
          <span><i class="fas ${modeIconClass}"></i> ${_escHtml(mode)}</span>
        </div>
      </div>
    </div>
  `.trim();
}

// ============================================================
// 5. showDetailRiwayat(id)
// ============================================================
/**
 * Tampilkan modal detail untuk satu record riwayat absensi.
 * @param {string} id - ID record absensi (contoh: 'ABS-001')
 */
function showDetailRiwayat(id) {
  const item = _riwayatData.find(d => d.id === id);
  if (!item) {
    console.warn('[riwayat.js] Item tidak ditemukan:', id);
    return;
  }

  const statusKey = (item.status || '').toLowerCase();
  const statusClass = STATUS_CLASS[statusKey] || 'secondary';
  const modeIconClass = MODE_ICON[item.mode] || 'fa-question';

  const lokasiStr = (item.lat_masuk && item.lat_masuk !== 0)
    ? `${item.lat_masuk.toFixed(6)}, ${item.lng_masuk.toFixed(6)}`
    : '-';

  const fotoHtml = item.foto_masuk
    ? `<img src="${_escHtml(item.foto_masuk)}" alt="Foto Masuk"
            class="img-thumbnail mt-1" style="max-width:120px;cursor:pointer;"
            onclick="window.open(this.src)">`
    : '<span class="text-muted">-</span>';

  const modalBody = `
    <div class="detail-riwayat">
      <!-- Header -->
      <div class="detail-header text-center mb-3">
        <h6 class="fw-bold">${_escHtml(item.hari || '')}, ${_formatTanggal(item.tanggal)}</h6>
        <span class="badge badge-${statusKey} fs-6">${_escHtml(item.status || '')}</span>
      </div>
      <!-- Info Grid -->
      <div class="detail-grid">
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-sign-in-alt me-1"></i>Jam Masuk</span>
          <span class="detail-value">${_escHtml(item.jam_masuk || '-')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-sign-out-alt me-1"></i>Jam Pulang</span>
          <span class="detail-value">${_escHtml(item.jam_pulang || '-')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-clock me-1"></i>Durasi Kerja</span>
          <span class="detail-value">${_escHtml(item.durasi || '-')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas ${modeIconClass} me-1"></i>Mode Kehadiran</span>
          <span class="detail-value">${_escHtml(item.mode || '-')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-map-marker-alt me-1"></i>Koordinat</span>
          <span class="detail-value">${_escHtml(lokasiStr)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-map me-1"></i>Lokasi</span>
          <span class="detail-value">${_escHtml(item.lokasi_nama || '-')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-camera me-1"></i>Foto Masuk</span>
          <span class="detail-value">${fotoHtml}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label"><i class="fas fa-sticky-note me-1"></i>Keterangan</span>
          <span class="detail-value">${_escHtml(item.keterangan || '-')}</span>
        </div>
      </div>
    </div>
  `;

  _showModal('Detail Absensi', modalBody);
}

// ============================================================
// 6. updateRiwayatSummary(dataArray)
// ============================================================
/**
 * Hitung dan update badge summary di atas list riwayat.
 * @param {Array} dataArray - Array objek riwayat absensi
 */
function updateRiwayatSummary(dataArray) {
  const counts = { hadir: 0, terlambat: 0, izin: 0, absen: 0 };

  (dataArray || []).forEach(item => {
    const s = (item.status || '').toLowerCase();
    if (s in counts) counts[s]++;
  });

  // Hadir = Hadir + Terlambat (total kehadiran fisik)
  const elHadir = document.getElementById('summary-hadir');
  const elTerlambat = document.getElementById('summary-terlambat');
  const elAbsen = document.getElementById('summary-absen');
  const elInfo = document.getElementById('summary-info');

  if (elHadir) elHadir.textContent = counts.hadir + counts.terlambat;
  if (elTerlambat) elTerlambat.textContent = counts.terlambat;
  if (elAbsen) elAbsen.textContent = counts.absen;

  // Teks keterangan jumlah hari kerja
  if (elInfo) {
    const totalHari = dataArray ? dataArray.length : 0;
    const namaBulan = NAMA_BULAN[parseInt(_currentBulan, 10) - 1] || '';
    elInfo.textContent = `Menampilkan ${totalHari} hari kerja bulan ${namaBulan} ${_currentTahun}`;
  }
}

// ============================================================
// 7. exportPDF()
// ============================================================
/**
 * Ekspor riwayat absensi ke PDF menggunakan fitur print browser.
 */
function exportPDF() {
  const namaBulan = NAMA_BULAN[parseInt(_currentBulan, 10) - 1] || _currentBulan;
  const session = typeof getSession === 'function' ? getSession() : null;
  const namaKaryawan = session ? session.nama : 'Karyawan';

  const judulAsli = document.title;
  const judulBaru = `Rekap Absensi ${namaKaryawan} - ${namaBulan} ${_currentTahun}`;

  document.body.classList.add('print-mode');
  document.title = judulBaru;

  window.print();

  // Kembalikan ke kondisi semula setelah dialog print ditutup
  // onafterprint adalah event standar yang didukung browser modern
  const handler = () => {
    document.body.classList.remove('print-mode');
    document.title = judulAsli;
    window.removeEventListener('afterprint', handler);
  };
  window.addEventListener('afterprint', handler);

  // Fallback timeout jika onafterprint tidak terpicu
  setTimeout(() => {
    document.body.classList.remove('print-mode');
    document.title = judulAsli;
    window.removeEventListener('afterprint', handler);
  }, 3000);
}

// ============================================================
// 8. initPengajuanPage()
// ============================================================
/**
 * Inisialisasi halaman Pengajuan Izin:
 * - Setup tab "Buat Pengajuan" vs "Riwayat Pengajuan"
 * - Setup form handler dan date picker
 * - Load riwayat pengajuan
 */
function initPengajuanPage() {
  // Setup tab switching
  const tabs = document.querySelectorAll('[data-tab-pengajuan]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => handleTabPengajuan(tab.dataset.tabPengajuan));
  });

  // Setup date picker (min = hari ini)
  const today = new Date().toISOString().split('T')[0];
  const inputMulai = document.getElementById('izin-tanggal-mulai');
  const inputSelesai = document.getElementById('izin-tanggal-selesai');

  if (inputMulai) {
    inputMulai.setAttribute('min', today);
    inputMulai.addEventListener('change', updateJumlahHari);
  }
  if (inputSelesai) {
    inputSelesai.addEventListener('change', updateJumlahHari);
  }

  // Setup form submit handler
  const formPengajuan = document.getElementById('form-pengajuan');
  if (formPengajuan) {
    formPengajuan.addEventListener('submit', handleFormPengajuan);
  }

  // Update jumlah hari jika jenis izin berubah
  const selectJenis = document.getElementById('izin-jenis');
  if (selectJenis) {
    selectJenis.addEventListener('change', updateJumlahHari);
  }

  // Default tampilkan tab "Buat Pengajuan"
  handleTabPengajuan('buat');

  // Load riwayat pengajuan
  loadPengajuan();
}

// ============================================================
// 9. handleTabPengajuan(tab)
// ============================================================
/**
 * Switch tampilan antara form pengajuan dan list riwayat pengajuan.
 * @param {string} tab - 'buat' | 'riwayat'
 */
function handleTabPengajuan(tab) {
  const panelBuat = document.getElementById('panel-buat-pengajuan');
  const panelRiwayat = document.getElementById('panel-riwayat-pengajuan');
  const tabs = document.querySelectorAll('[data-tab-pengajuan]');

  tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tabPengajuan === tab);
  });

  if (panelBuat) panelBuat.style.display = tab === 'buat' ? 'block' : 'none';
  if (panelRiwayat) panelRiwayat.style.display = tab === 'riwayat' ? 'block' : 'none';
}

// ============================================================
// 10. loadPengajuan()
// ============================================================
/**
 * Muat daftar riwayat pengajuan izin dari API atau demo data.
 */
async function loadPengajuan() {
  const listEl = document.getElementById('list-pengajuan');
  if (!listEl) return;

  listEl.innerHTML = _buildSkeletonLoading(3);

  try {
    let data;
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
      await _simulateDelay(500);
      data = DEMO_PENGAJUAN;
    } else {
      const session = typeof getSession === 'function' ? getSession() : null;
      const nip = session ? session.nip : '';
      data = await apiGetPengajuan(nip);
    }

    _pengajuanData = data || [];

    if (_pengajuanData.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state text-center py-4">
          <i class="fas fa-inbox fa-3x text-muted mb-2"></i>
          <p class="text-muted">Belum ada pengajuan izin.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = _pengajuanData.map(item => renderPengajuanItem(item)).join('');

  } catch (err) {
    console.error('[riwayat.js] Gagal memuat pengajuan:', err);
    listEl.innerHTML = `
      <div class="error-state text-center py-3">
        <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
        <p class="text-muted">Gagal memuat riwayat pengajuan.</p>
        <button class="btn btn-sm btn-outline-primary" onclick="loadPengajuan()">Coba Lagi</button>
      </div>
    `;
  }
}

// ============================================================
// 11. renderPengajuanItem(item)
// ============================================================
/**
 * Render satu kartu pengajuan izin sebagai string HTML.
 * @param {Object} item - Objek pengajuan izin
 * @returns {string} HTML string kartu pengajuan
 */
function renderPengajuanItem(item) {
  const iconClass = JENIS_IZIN_ICON[item.jenis_izin] || 'fa-file-alt';
  const statusClass = _getPengajuanStatusClass(item.status);
  const alasanShort = (item.alasan || '').length > 80
    ? item.alasan.substring(0, 80) + '...'
    : item.alasan;

  const disetujuiHtml = item.disetujui_oleh
    ? `<div class="pengajuan-approver"><i class="fas fa-check-circle text-success me-1"></i>
       Disetujui oleh: <strong>${_escHtml(item.disetujui_oleh)}</strong></div>`
    : '';

  return `
    <div class="pengajuan-card">
      <div class="pengajuan-header">
        <div class="pengajuan-jenis">
          <i class="fas ${iconClass} me-2"></i>
          <strong>${_escHtml(item.jenis_izin)}</strong>
        </div>
        <span class="badge badge-pengajuan-${statusClass}">${_escHtml(item.status)}</span>
      </div>
      <div class="pengajuan-body">
        <div class="pengajuan-tanggal">
          <i class="fas fa-calendar-alt me-1"></i>
          ${_formatTanggal(item.tanggal_mulai)} — ${_formatTanggal(item.tanggal_selesai)}
          <span class="pengajuan-hari">(${item.jumlah_hari} hari)</span>
        </div>
        <div class="pengajuan-alasan text-muted">${_escHtml(alasanShort)}</div>
        ${disetujuiHtml}
        <div class="pengajuan-footer text-muted">
          <small>Diajukan: ${_formatTanggal(item.tanggal_pengajuan)}</small>
        </div>
      </div>
    </div>
  `.trim();
}

// ============================================================
// 12. handleFormPengajuan(event)
// ============================================================
/**
 * Handle submit form pengajuan izin:
 * validasi → konfirmasi modal → kirim API → reset → refresh.
 * @param {Event} event - Submit event
 */
async function handleFormPengajuan(event) {
  event.preventDefault();

  const validasi = validasiFormPengajuan();
  if (!validasi.valid) {
    _tampilkanErrorValidasi(validasi.errors);
    return;
  }

  const jenis = document.getElementById('izin-jenis').value;
  const mulai = document.getElementById('izin-tanggal-mulai').value;
  const selesai = document.getElementById('izin-tanggal-selesai').value;
  const alasan = document.getElementById('izin-alasan').value.trim();

  const excludeWeekend = jenis === 'Cuti Tahunan';
  const { total_hari, hari_kerja } = hitungJumlahHari(mulai, selesai, excludeWeekend);
  const jumlahHariTampil = excludeWeekend ? hari_kerja : total_hari;

  // Tampilkan konfirmasi modal
  const confirmed = await _showKonfirmasiModal({
    jenis,
    mulai,
    selesai,
    jumlahHari: jumlahHariTampil,
    alasan
  });

  if (!confirmed) return;

  // Tampilkan loading pada tombol submit
  const btnSubmit = document.getElementById('btn-submit-pengajuan');
  const textAsli = btnSubmit ? btnSubmit.innerHTML : '';
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Mengirim...';
  }

  try {
    const session = typeof getSession === 'function' ? getSession() : null;
    const nip = session ? session.nip : '';

    const payload = {
      nip,
      jenis_izin: jenis,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      jumlah_hari: jumlahHariTampil,
      alasan
    };

    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
      await _simulateDelay(800);
      console.log('[DEMO] Pengajuan dikirim:', payload);
    } else {
      await apiKirimPengajuan(payload);
    }

    // Reset form
    const formPengajuan = document.getElementById('form-pengajuan');
    if (formPengajuan) formPengajuan.reset();

    // Tampilkan notifikasi sukses
    _showToast('Pengajuan izin berhasil dikirim!', 'success');

    // Switch ke tab riwayat dan refresh
    handleTabPengajuan('riwayat');
    await loadPengajuan();

  } catch (err) {
    console.error('[riwayat.js] Gagal mengirim pengajuan:', err);
    _showToast('Gagal mengirim pengajuan. Coba lagi.', 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = textAsli;
    }
  }
}

// ============================================================
// 13. hitungJumlahHari(mulai, selesai, excludeWeekend)
// ============================================================
/**
 * Hitung total hari kalender dan hari kerja antara dua tanggal.
 * @param {string} mulai - Tanggal mulai 'YYYY-MM-DD'
 * @param {string} selesai - Tanggal selesai 'YYYY-MM-DD'
 * @param {boolean} excludeWeekend - Jika true, hanya hitung Senin–Jumat
 * @returns {{ total_hari: number, hari_kerja: number }}
 */
function hitungJumlahHari(mulai, selesai, excludeWeekend = false) {
  const tMulai = new Date(mulai + 'T00:00:00');
  const tSelesai = new Date(selesai + 'T00:00:00');

  if (isNaN(tMulai) || isNaN(tSelesai) || tMulai > tSelesai) {
    return { total_hari: 0, hari_kerja: 0 };
  }

  let total_hari = 0;
  let hari_kerja = 0;
  const cursor = new Date(tMulai);

  while (cursor <= tSelesai) {
    total_hari++;
    const dayOfWeek = cursor.getDay(); // 0=Minggu, 6=Sabtu
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      hari_kerja++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { total_hari, hari_kerja };
}

// ============================================================
// 14. updateJumlahHari()
// ============================================================
/**
 * Event handler untuk date picker — update teks "Jumlah: X hari" secara real-time.
 */
function updateJumlahHari() {
  const inputMulai = document.getElementById('izin-tanggal-mulai');
  const inputSelesai = document.getElementById('izin-tanggal-selesai');
  const selectJenis = document.getElementById('izin-jenis');
  const elJumlah = document.getElementById('izin-jumlah-hari-info');

  if (!inputMulai || !inputSelesai) return;

  const mulai = inputMulai.value;
  const selesai = inputSelesai.value;

  // Pastikan tanggal selesai >= tanggal mulai
  if (mulai && inputSelesai) {
    inputSelesai.setAttribute('min', mulai);
    if (selesai && selesai < mulai) {
      inputSelesai.value = mulai;
    }
  }

  if (!mulai || !selesai) {
    if (elJumlah) elJumlah.textContent = '';
    return;
  }

  const jenis = selectJenis ? selectJenis.value : '';
  const excludeWeekend = jenis === 'Cuti Tahunan';
  const { total_hari, hari_kerja } = hitungJumlahHari(mulai, selesai, excludeWeekend);

  const jumlahTampil = excludeWeekend ? hari_kerja : total_hari;
  const satuanLabel = excludeWeekend ? 'hari kerja' : 'hari kalender';

  if (elJumlah) {
    elJumlah.textContent = jumlahTampil > 0
      ? `Jumlah: ${jumlahTampil} ${satuanLabel}`
      : 'Tanggal tidak valid';
  }
}

// ============================================================
// 15. validasiFormPengajuan()
// ============================================================
/**
 * Validasi semua field form pengajuan izin.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validasiFormPengajuan() {
  const errors = [];

  const jenis = (document.getElementById('izin-jenis') || {}).value || '';
  const mulai = (document.getElementById('izin-tanggal-mulai') || {}).value || '';
  const selesai = (document.getElementById('izin-tanggal-selesai') || {}).value || '';
  const alasan = ((document.getElementById('izin-alasan') || {}).value || '').trim();

  if (!jenis) {
    errors.push('Jenis izin harus dipilih.');
  }
  if (!mulai) {
    errors.push('Tanggal mulai harus diisi.');
  }
  if (!selesai) {
    errors.push('Tanggal selesai harus diisi.');
  }
  if (mulai && selesai && selesai < mulai) {
    errors.push('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  }
  if (alasan.length < 10) {
    errors.push('Alasan minimal 10 karakter.');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// HELPER FUNCTIONS (PRIVATE)
// ============================================================

/**
 * Escape HTML untuk mencegah XSS.
 * @param {string} str
 * @returns {string}
 */
function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format tanggal dari 'YYYY-MM-DD' ke 'DD Bulan YYYY'.
 * @param {string} tanggal
 * @returns {string}
 */
function _formatTanggal(tanggal) {
  if (!tanggal) return '-';
  const [yr, mo, dy] = tanggal.split('-');
  const namaBulan = NAMA_BULAN[parseInt(mo, 10) - 1] || mo;
  return `${parseInt(dy, 10)} ${namaBulan} ${yr}`;
}

/**
 * Build skeleton loading HTML.
 * @param {number} count - Jumlah skeleton item
 * @returns {string}
 */
function _buildSkeletonLoading(count) {
  const skeleton = `
    <div class="skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
  `;
  return Array(count).fill(skeleton).join('');
}

/**
 * Delay promise untuk simulasi async di DEMO_MODE.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function _simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tampilkan modal generik.
 * @param {string} title - Judul modal
 * @param {string} bodyHtml - Konten HTML modal
 */
function _showModal(title, bodyHtml) {
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modal = document.getElementById('modal-detail');

  if (modalTitle) modalTitle.textContent = title;
  if (modalBody) modalBody.innerHTML = bodyHtml;

  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }

  // Tutup modal ketika klik backdrop
  if (modal && !modal._listenerAttached) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) _tutupModal();
    });
    modal._listenerAttached = true;
  }
}

/**
 * Tutup modal detail.
 */
function _tutupModal() {
  const modal = document.getElementById('modal-detail');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Tampilkan modal konfirmasi pengajuan (Promise-based).
 * @param {Object} data - Data pengajuan untuk ditampilkan di konfirmasi
 * @returns {Promise<boolean>}
 */
function _showKonfirmasiModal(data) {
  return new Promise(resolve => {
    const body = `
      <p>Pastikan data berikut sudah benar sebelum mengirim pengajuan:</p>
      <ul>
        <li><strong>Jenis:</strong> ${_escHtml(data.jenis)}</li>
        <li><strong>Tanggal:</strong> ${_formatTanggal(data.mulai)} — ${_formatTanggal(data.selesai)}</li>
        <li><strong>Jumlah Hari:</strong> ${data.jumlahHari} hari</li>
        <li><strong>Alasan:</strong> ${_escHtml(data.alasan)}</li>
      </ul>
    `;

    const modalEl = document.getElementById('modal-konfirmasi');
    const modalBody = document.getElementById('modal-konfirmasi-body');
    const btnYa = document.getElementById('btn-konfirmasi-ya');
    const btnTidak = document.getElementById('btn-konfirmasi-tidak');

    if (!modalEl) {
      // Fallback ke confirm() bawaan browser
      resolve(window.confirm('Kirim pengajuan izin ini?'));
      return;
    }

    if (modalBody) modalBody.innerHTML = body;
    modalEl.style.display = 'flex';

    const handleYa = () => {
      modalEl.style.display = 'none';
      cleanup();
      resolve(true);
    };
    const handleTidak = () => {
      modalEl.style.display = 'none';
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      if (btnYa) btnYa.removeEventListener('click', handleYa);
      if (btnTidak) btnTidak.removeEventListener('click', handleTidak);
    };

    if (btnYa) btnYa.addEventListener('click', handleYa);
    if (btnTidak) btnTidak.addEventListener('click', handleTidak);
  });
}

/**
 * Tampilkan daftar error validasi di dalam form.
 * @param {string[]} errors
 */
function _tampilkanErrorValidasi(errors) {
  const elError = document.getElementById('form-pengajuan-errors');
  if (!elError) {
    alert(errors.join('\n'));
    return;
  }
  elError.innerHTML = `
    <ul class="mb-0 ps-3">
      ${errors.map(e => `<li>${_escHtml(e)}</li>`).join('')}
    </ul>
  `;
  elError.style.display = 'block';
  elError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Tampilkan toast/notifikasi singkat.
 * @param {string} pesan
 * @param {'success'|'error'|'info'} tipe
 */
function _showToast(pesan, tipe = 'info') {
  // Gunakan fungsi global showToast jika tersedia (dari app.js)
  if (typeof showToast === 'function') {
    showToast(pesan, tipe);
    return;
  }
  // Fallback sederhana
  const toast = document.createElement('div');
  toast.className = `toast-notif toast-${tipe}`;
  toast.textContent = pesan;
  toast.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${tipe === 'success' ? '#28a745' : tipe === 'error' ? '#dc3545' : '#007bff'};
    color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;
    font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Tentukan CSS class badge berdasarkan status pengajuan.
 * @param {string} status
 * @returns {string}
 */
function _getPengajuanStatusClass(status) {
  const map = {
    'Disetujui': 'success',
    'Pending': 'warning',
    'Ditolak': 'danger',
    'Dibatalkan': 'secondary'
  };
  return map[status] || 'secondary';
}

// ============================================================
// GLOBAL EXPOSE (untuk onclick di HTML)
// ============================================================
window.initRiwayatPage = initRiwayatPage;
window.loadRiwayat = loadRiwayat;
window.showDetailRiwayat = showDetailRiwayat;
window.exportPDF = exportPDF;
window.initPengajuanPage = initPengajuanPage;
window.handleTabPengajuan = handleTabPengajuan;
window.loadPengajuan = loadPengajuan;
window.handleFormPengajuan = handleFormPengajuan;
window.updateJumlahHari = updateJumlahHari;
window.tutupModal = _tutupModal;
