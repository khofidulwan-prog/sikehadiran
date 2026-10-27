// =============================================================
// app.js — Router SPA, Controller Utama, UI Helpers
// Aplikasi Absensi BUMN PWA
// =============================================================

// =============================================================
// STATE MANAGEMENT
// =============================================================
let currentPage = 'login';
const pages = ['login', 'dashboard', 'absen-masuk', 'absen-pulang', 'riwayat', 'pengajuan', 'profil'];

let _clockInterval      = null;
let _deferredPrompt     = null;   // PWA install prompt
let _currentTabPengajuan = 'form'; // tab aktif di halaman pengajuan

const namaHari  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// =============================================================
// 1. navigateTo
// =============================================================
function navigateTo(pageId) {
  if (typeof pageId === 'string' && pageId.startsWith('page-')) {
    pageId = pageId.replace('page-', '');
  }

  if (!pages.includes(pageId)) {
    console.warn(`[App] Halaman "${pageId}" tidak dikenal.`);
    return;
  }

  // Cek autentikasi untuk halaman yang dilindungi
  const protectedPages = ['dashboard', 'absen-masuk', 'absen-pulang', 'riwayat', 'pengajuan', 'profil'];
  if (protectedPages.includes(pageId) && !cekSession()) {
    pageId = 'login';
  }

  // Hide semua page
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('page-active', 'fadeIn');
    }
  });

  // Show target page
  const targetEl = document.getElementById(`page-${pageId}`);
  if (targetEl) {
    targetEl.style.display = 'block';
    // Trigger animasi fadeIn
    requestAnimationFrame(() => {
      targetEl.classList.add('page-active', 'fadeIn');
    });
  }

  // Update bottom nav active state
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.remove('active');
    const target = (item.dataset.page || '').replace('page-', '');
    if (target === pageId) item.classList.add('active');
  });

  // Show/hide bottom nav
  const bottomNav = document.getElementById('bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = (pageId === 'login') ? 'none' : 'flex';
  }

  // Hentikan clock sebelumnya
  stopClock();

  // Panggil init function halaman
  currentPage = pageId;
  switch (pageId) {
    case 'dashboard':  initDashboard();  break;
    case 'absen-masuk':  initAbsenMasuk();  break;
    case 'absen-pulang': initAbsenPulang(); break;
    case 'riwayat':    initRiwayat();    break;
    case 'pengajuan':  initPengajuan();  break;
    case 'profil':     initProfil();     break;
  }
}

// =============================================================
// 2. initApp
// =============================================================
function initApp() {
  // Tampilkan banner demo jika mode demo aktif
  if (isDemoMode()) {
    _tampilkanBannerDemo();
  }

  // Muat data lokasi kantor dari server / admin
  if (typeof apiGetLokasiKantor === 'function') {
    apiGetLokasiKantor().catch(err => console.warn('[App] Gagal load lokasi kantor:', err));
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Terdaftar:', reg.scope))
      .catch(err => console.warn('[SW] Gagal mendaftar:', err));
  }

  // Cek session
  if (cekSession()) {
    navigateTo('dashboard');
  } else {
    navigateTo('login');
  }

  // Event listeners global
  _initGlobalEventListeners();

  // Init auto-logout checker
  initAutoLogout();

  // Capture PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    // Tampilkan tombol install
    const btnInstall = document.getElementById('btn-install-pwa');
    if (btnInstall) btnInstall.style.display = 'inline-flex';
  });

  // Setelah install berhasil
  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    showToast('Aplikasi berhasil diinstall! 🎉', 'success');
    const btnInstall = document.getElementById('btn-install-pwa');
    if (btnInstall) btnInstall.style.display = 'none';
  });
}

// =============================================================
// 3. initDashboard
// =============================================================
async function initDashboard() {
  const session = getSession();
  if (!session) { navigateTo('login'); return; }

  // Isi header
  const elNama    = document.getElementById('dash-nama');
  const elJabatan = document.getElementById('dash-jabatan');
  const elFoto    = document.getElementById('dash-foto');

  if (elNama)    elNama.textContent    = session.nama;
  if (elJabatan) elJabatan.textContent = `${session.jabatan} — ${session.divisi}`;
  if (elFoto && session.foto_url) {
    elFoto.src = session.foto_url;
  }

  // Info kantor dashboard
  const elKantorNama = document.getElementById('info-nama-kantor');
  const elKantorRadius = document.getElementById('info-radius-absen');
  if (elKantorNama) elKantorNama.textContent = CONFIG.KANTOR.nama;
  if (elKantorRadius) elKantorRadius.textContent = `${CONFIG.KANTOR.radius} meter`;

  // Start clock
  startClock();

  // Loading skeleton untuk stat cards
  _tampilkanSkeletonRekap();

  // Ambil status hari ini
  try {
    const statusRes = await apiGetStatusHariIni(session.nip);
    if (statusRes.success) {
      updateStatusAbsenUI(statusRes.data);
    }
  } catch (e) {
    console.warn('[Dashboard] Gagal memuat status:', e);
  }

  // Ambil rekap bulanan
  const now = new Date();
  try {
    const rekapRes = await apiGetRekapBulanan(session.nip, now.getMonth() + 1, now.getFullYear());
    if (rekapRes.success) {
      _updateStatCards(rekapRes.data);
    }
  } catch (e) {
    console.warn('[Dashboard] Gagal memuat rekap:', e);
    _updateStatCards(null);
  }
}

// =============================================================
// 4. initRiwayat
// =============================================================
function initRiwayat() {
  const now = new Date();

  // Set default filter
  const selBulan = document.getElementById('filter-bulan');
  const selTahun = document.getElementById('filter-tahun');

  // Populate dropdown bulan
  if (selBulan) {
    selBulan.innerHTML = namaBulan
      .map((b, i) => `<option value="${i + 1}" ${i === now.getMonth() ? 'selected' : ''}>${b}</option>`)
      .join('');
    selBulan.onchange = loadRiwayat;
  }

  // Populate dropdown tahun (3 tahun terakhir)
  if (selTahun) {
    const tahunIni = now.getFullYear();
    selTahun.innerHTML = [tahunIni, tahunIni - 1, tahunIni - 2]
      .map(t => `<option value="${t}" ${t === tahunIni ? 'selected' : ''}>${t}</option>`)
      .join('');
    selTahun.onchange = loadRiwayat;
  }

  // Tombol filter jika ada
  const btnFilter = document.getElementById('btn-filter-riwayat');
  if (btnFilter) {
    btnFilter.addEventListener('click', loadRiwayat);
  }

  // Tombol export PDF
  const btnExport = document.getElementById('btn-export-pdf');
  if (btnExport) {
    btnExport.addEventListener('click', exportPDF);
  }

  // Load data awal
  loadRiwayat();
}

// =============================================================
// 5. loadRiwayat
// =============================================================
async function loadRiwayat() {
  const session = getSession();
  if (!session) return;

  const selBulan = document.getElementById('filter-bulan');
  const selTahun = document.getElementById('filter-tahun');
  const now      = new Date();
  const bulan    = selBulan ? parseInt(selBulan.value) : now.getMonth() + 1;
  const tahun    = selTahun ? parseInt(selTahun.value) : now.getFullYear();

  const container = document.getElementById('list-riwayat') || document.getElementById('riwayat-list');
  const emptyEl   = document.getElementById('riwayat-empty');
  if (container) container.innerHTML = '<p class="loading-text">⏳ Memuat riwayat...</p>';
  if (emptyEl)   emptyEl.style.display = 'none';

  try {
    const res = await apiGetRiwayat(session.nip, bulan, tahun);

    if (!res.success) {
      if (container) container.innerHTML = `<p class="error-text">❌ ${res.pesan}</p>`;
      return;
    }

    const data = res.data || [];

    // Hitung ringkasan
    const ringkasan = { hadir: 0, terlambat: 0, absen: 0, izin: 0 };
    data.forEach(item => {
      const st = (item.status || '').toLowerCase();
      if (st === 'hadir')          ringkasan.hadir++;
      else if (st === 'terlambat') ringkasan.terlambat++;
      else if (st === 'absen')     ringkasan.absen++;
      else if (st === 'izin')      ringkasan.izin++;
    });

    // Update ringkasan UI
    _updateRingkasanRiwayat(ringkasan);

    // Render list
    if (!data.length) {
      if (container) container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (container) {
      container.innerHTML = data.map(renderItemRiwayat).join('');
    }

  } catch (e) {
    if (container) container.innerHTML = '<p class="error-text">❌ Gagal memuat data riwayat.</p>';
  }
}

// =============================================================
// 6. renderItemRiwayat
// =============================================================
function renderItemRiwayat(item) {
  const status     = item.status || 'Tidak Diketahui';
  const statusLower = status.toLowerCase().replace(' ', '-');
  const mode       = item.mode || '-';
  const durasi     = item.durasi || '-';
  const jamMasuk   = item.jam_masuk || '-';
  const jamPulang  = item.jam_pulang || '-';
  const tanggal    = formatTanggalIndo(item.tanggal);
  const hari       = item.hari || formatHariIndo(item.tanggal);

  return `
    <div class="riwayat-item status-${statusLower}">
      <div class="riwayat-date">
        <span class="riwayat-hari">${hari}</span>
        <span class="riwayat-tanggal">${tanggal}</span>
      </div>
      <div class="riwayat-times">
        <span class="time-item">
          <span class="time-label">Masuk</span>
          <span class="time-value">${jamMasuk}</span>
        </span>
        <span class="time-separator">→</span>
        <span class="time-item">
          <span class="time-label">Pulang</span>
          <span class="time-value">${jamPulang}</span>
        </span>
      </div>
      <div class="riwayat-bottom">
        <div class="riwayat-duration">⏱ ${durasi}</div>
        <div class="riwayat-badges">
          <span class="badge badge-${statusLower}">${status}</span>
          ${mode !== '-' ? `<span class="badge-mode">${mode}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// =============================================================
// 7. exportPDF
// =============================================================
function exportPDF() {
  // Tandai body untuk print CSS
  document.body.classList.add('printing');

  // Ubah judul dokumen sementara
  const judulAsli   = document.title;
  const session     = getSession();
  const selBulan    = document.getElementById('filter-bulan');
  const selTahun    = document.getElementById('filter-tahun');
  const bulan       = selBulan ? namaBulan[parseInt(selBulan.value) - 1] : '';
  const tahun       = selTahun ? selTahun.value : '';
  const nama        = session ? session.nama : 'Karyawan';

  document.title = `Riwayat Absensi ${nama} — ${bulan} ${tahun}`;

  window.print();

  // Kembalikan state setelah print dialog
  window.onafterprint = () => {
    document.body.classList.remove('printing');
    document.title = judulAsli;
    window.onafterprint = null;
  };
  // Fallback untuk browser yang tidak support onafterprint
  setTimeout(() => {
    document.body.classList.remove('printing');
    document.title = judulAsli;
  }, 3000);
}

// =============================================================
// 8. initPengajuan
// =============================================================
function initPengajuan() {
  // Setup tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;
      _switchTabPengajuan(tabTarget);
    });
  });

  // Setup form handler
  const formPengajuan = document.getElementById('form-pengajuan');
  if (formPengajuan) {
    formPengajuan.addEventListener('submit', (e) => {
      e.preventDefault();
      submitPengajuan();
    });
  }

  // Hitung jumlah hari otomatis
  const tglMulai  = document.getElementById('pengajuan-tgl-mulai');
  const tglSelesai = document.getElementById('pengajuan-tgl-selesai');
  if (tglMulai && tglSelesai) {
    const hitungHari = () => {
      if (tglMulai.value && tglSelesai.value) {
        const diff = hitungJumlahHari(tglMulai.value, tglSelesai.value);
        const elJumlah = document.getElementById('pengajuan-jumlah-hari');
        if (elJumlah) elJumlah.textContent = diff >= 0 ? `${diff} hari` : 'Tanggal tidak valid';
      }
    };
    tglMulai.addEventListener('change', hitungHari);
    tglSelesai.addEventListener('change', hitungHari);
  }

  // Load list pengajuan existing
  loadPengajuan();
}

// =============================================================
// 9. submitPengajuan
// =============================================================
async function submitPengajuan() {
  const session = getSession();
  if (!session) return;

  // Ambil nilai form
  const tipe      = document.getElementById('pengajuan-tipe')?.value || '';
  const tglMulai  = document.getElementById('pengajuan-tgl-mulai')?.value || '';
  const tglSelesai = document.getElementById('pengajuan-tgl-selesai')?.value || '';
  const alasan    = document.getElementById('pengajuan-alasan')?.value.trim() || '';

  // Validasi
  if (!tipe)     { showError('Pilih jenis pengajuan.'); return; }
  if (!tglMulai) { showError('Isi tanggal mulai.'); return; }
  if (!tglSelesai) { showError('Isi tanggal selesai.'); return; }
  if (tglSelesai < tglMulai) { showError('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return; }
  if (!alasan)   { showError('Isi alasan pengajuan.'); return; }

  const jumlahHari = hitungJumlahHari(tglMulai, tglSelesai);

  showLoading();

  const data = {
    nip:            session.nip,
    nama:           session.nama,
    tipe,
    tanggal_mulai:  tglMulai,
    tanggal_selesai: tglSelesai,
    jumlah_hari:    jumlahHari,
    alasan,
    created_at:     new Date().toISOString().split('T')[0]
  };

  try {
    const res = await apiKirimPengajuan(data);
    hideLoading();

    if (res.success) {
      showSuccess(res.pesan || 'Pengajuan berhasil dikirim!');
      // Reset form
      document.getElementById('form-pengajuan')?.reset();
      const elJumlah = document.getElementById('pengajuan-jumlah-hari');
      if (elJumlah) elJumlah.textContent = '-';
      // Switch ke tab list
      _switchTabPengajuan('list');
      loadPengajuan();
    } else {
      showError(res.pesan || 'Gagal mengirim pengajuan.');
    }
  } catch (e) {
    hideLoading();
    showError('Terjadi kesalahan: ' + e.message);
  }
}

// =============================================================
// 10. loadPengajuan (helper untuk initPengajuan)
// =============================================================
async function loadPengajuan() {
  const session = getSession();
  if (!session) return;

  const container = document.getElementById('list-pengajuan') || document.getElementById('pengajuan-list');
  const emptyEl   = document.getElementById('pengajuan-empty');
  if (container) container.innerHTML = '<p class="loading-text">⏳ Memuat data pengajuan...</p>';
  if (emptyEl)   emptyEl.style.display = 'none';

  try {
    const res = await apiGetPengajuan(session.nip);
    if (!res.success) {
      if (container) container.innerHTML = `<p class="error-text">❌ ${res.pesan}</p>`;
      return;
    }
    const data = res.data || [];
    if (!data.length) {
      if (container) container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (container) container.innerHTML = data.map(renderPengajuanItem).join('');
  } catch (e) {
    if (container) container.innerHTML = '<p class="error-text">❌ Gagal memuat pengajuan.</p>';
  }
}

// =============================================================
// 11. renderPengajuanItem
// =============================================================
function renderPengajuanItem(item) {
  const statusLower = (item.status || 'pending').toLowerCase();
  const statusIcon  = { pending: '⏳', disetujui: '✅', ditolak: '❌' }[statusLower] || '❓';
  const tglMulai   = formatTanggalIndo(item.tanggal_mulai);
  const tglSelesai = formatTanggalIndo(item.tanggal_selesai);
  const sameDate   = item.tanggal_mulai === item.tanggal_selesai;

  return `
    <div class="pengajuan-item status-${statusLower}">
      <div class="pengajuan-header">
        <span class="pengajuan-tipe">${item.tipe}</span>
        <span class="badge badge-${statusLower}">${statusIcon} ${item.status}</span>
      </div>
      <div class="pengajuan-tanggal">
        📅 ${sameDate ? tglMulai : `${tglMulai} — ${tglSelesai}`}
        ${item.jumlah_hari ? `(${item.jumlah_hari} hari)` : ''}
      </div>
      <div class="pengajuan-alasan">💬 ${item.alasan}</div>
      <div class="pengajuan-footer">
        <small>Diajukan: ${formatTanggalIndo(item.created_at)}</small>
        ${item.id ? `<small class="pengajuan-id">#${item.id}</small>` : ''}
      </div>
    </div>
  `;
}

// =============================================================
// 12. initProfil
// =============================================================
function initProfil() {
  const session = getSession();
  if (!session) return;

  // Isi data profil
  const fields = {
    'profil-nama':       session.nama,
    'profil-nip':        session.nip,
    'profil-jabatan':    session.jabatan,
    'profil-divisi':     session.divisi,
    'profil-departemen': session.departemen,
    'profil-role':       session.role
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '-';
  });

  // Foto profil
  const fotoEl = document.getElementById('profil-foto');
  if (fotoEl && session.foto_url) fotoEl.src = session.foto_url;

  // Hitung masa kerja dari NIP (mengandung tahun lahir / tahun masuk)
  const masaKerjaEl = document.getElementById('profil-masa-kerja');
  if (masaKerjaEl) {
    const tahunMasuk = _hitungTahunMasukDariNIP(session.nip);
    if (tahunMasuk) {
      const tahunSkrg = new Date().getFullYear();
      const lamaTahun = tahunSkrg - tahunMasuk;
      masaKerjaEl.textContent = lamaTahun >= 0 ? `${lamaTahun} tahun` : '-';
    } else {
      masaKerjaEl.textContent = '-';
    }
  }

  // Info kantor
  const kantorNamaEl   = document.getElementById('profil-nama-kantor') || document.getElementById('profil-kantor-nama');
  const kantorRadiusEl = document.getElementById('profil-radius') || document.getElementById('profil-kantor-radius');
  const jamMasukEl     = document.getElementById('profil-jam-masuk');
  const jamPulangEl    = document.getElementById('profil-jam-pulang');
  const emailEl        = document.getElementById('profil-email');
  const telpEl         = document.getElementById('profil-telepon');
  const statusPegEl    = document.getElementById('profil-status-kepegawaian');

  if (kantorNamaEl)   kantorNamaEl.textContent   = CONFIG.KANTOR.nama;
  if (kantorRadiusEl) kantorRadiusEl.textContent = `${CONFIG.KANTOR.radius} meter`;
  if (jamMasukEl)     jamMasukEl.textContent     = `${CONFIG.JAM_MASUK_STANDAR} WIB`;
  if (jamPulangEl)    jamPulangEl.textContent    = `${CONFIG.JAM_PULANG_STANDAR} WIB`;
  if (emailEl && (!emailEl.textContent || emailEl.textContent === '—')) {
    emailEl.textContent = `${(session.nama || 'user').toLowerCase().replace(/\s+/g, '.')}@bumn.go.id`;
  }
  if (telpEl && (!telpEl.textContent || telpEl.textContent === '—')) {
    telpEl.textContent = '0812-3456-7890';
  }
  if (statusPegEl) {
    statusPegEl.textContent = 'Karyawan Tetap (BUMN)';
  }

  // Tombol logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.onclick = handleLogout;
  }

  // Tombol install PWA
  const btnInstall = document.getElementById('btn-install-pwa');
  if (btnInstall) {
    btnInstall.style.display = _deferredPrompt ? 'inline-flex' : 'none';
    btnInstall.onclick = _handleInstallPWA;
  }
}

// =============================================================
// 13. Helper UI Functions
// =============================================================

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('show', 'modal-active');
  document.body.style.overflow = 'hidden';
}

function hideModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('show', 'modal-active');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function showLoading(pesan = 'Memproses...') {
  const el = document.getElementById('modal-loading') || document.getElementById('loading-overlay');
  const txt = document.getElementById('loading-text');
  if (txt) txt.textContent = pesan;
  if (el) {
    el.classList.add('show', 'modal-active');
    el.style.display = 'flex';
  }
}

function hideLoading() {
  const el = document.getElementById('modal-loading') || document.getElementById('loading-overlay');
  if (el) {
    el.classList.remove('show', 'modal-active');
    el.style.display = 'none';
  }
}

function showSuccess(pesan) {
  const msgEl = document.getElementById('success-message');
  if (msgEl) {
    msgEl.textContent = pesan;
    showModal('modal-success');
  } else {
    showToast(pesan, 'success');
  }
}

function showError(pesan) {
  const msgEl = document.getElementById('error-message');
  if (msgEl) {
    msgEl.textContent = pesan;
    showModal('modal-error');
  } else {
    showToast(pesan, 'error');
  }
}

function showToast(pesan, tipe = 'info') {
  const container = document.getElementById('toast-container') || _buatToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipe}`;

  const ikon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[tipe] || 'ℹ️';
  toast.innerHTML = `<span class="toast-icon">${ikon}</span><span class="toast-msg">${pesan}</span>`;

  container.appendChild(toast);

  // Animasi masuk
  requestAnimationFrame(() => toast.classList.add('toast-show'));

  // Hapus setelah 3 detik
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
  }, 3000);
}

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${namaBulan[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

function formatHariIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return namaHari[d.getDay()];
  } catch (e) {
    return '-';
  }
}

function hitungJumlahHari(tglMulaiStr, tglSelesaiStr) {
  const d1 = new Date(tglMulaiStr + 'T00:00:00');
  const d2 = new Date(tglSelesaiStr + 'T00:00:00');
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff + 1; // inklusif
}

// =============================================================
// 14. Bottom Nav Event Listeners
// =============================================================
function _initBottomNav() {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      let pageId = item.dataset.page || '';
      pageId = pageId.replace('page-', '');
      if (pageId) navigateTo(pageId);
    });
  });
}

// =============================================================
// 15. Clock Functions
// =============================================================
function startClock() {
  _updateClock();
  if (_clockInterval) clearInterval(_clockInterval);
  _clockInterval = setInterval(_updateClock, 1000);
}

function stopClock() {
  if (_clockInterval) {
    clearInterval(_clockInterval);
    _clockInterval = null;
  }
}

function _updateClock() {
  const now    = new Date();
  const jam    = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const tanggal = `${namaHari[now.getDay()]}, ${now.getDate()} ${namaBulan[now.getMonth()]} ${now.getFullYear()}`;

  const elJam    = document.getElementById('dash-jam');
  const elTanggal = document.getElementById('dash-tanggal');

  if (elJam)    elJam.textContent    = jam;
  if (elTanggal) elTanggal.textContent = tanggal;
}

// =============================================================
// 16. PWA Install Prompt
// =============================================================
async function _handleInstallPWA() {
  if (!_deferredPrompt) {
    showToast('Aplikasi sudah terinstall atau browser tidak mendukung.', 'info');
    return;
  }
  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('Instalasi berhasil! 🎉', 'success');
  } else {
    showToast('Instalasi dibatalkan.', 'info');
  }
  _deferredPrompt = null;
}

// =============================================================
// 17. Demo Mode Banner
// =============================================================
function _tampilkanBannerDemo() {
  const existing = document.getElementById('demo-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'demo-banner';
  banner.innerHTML = `
    <span>⚠️ Mode Demo — Hubungkan ke Google Sheets untuk data real</span>
    <button onclick="this.parentElement.style.display='none'" aria-label="Tutup">✕</button>
  `;
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #f59e0b; color: #1a1a1a; padding: 8px 16px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.85rem; font-weight: 600; gap: 8px;
  `;
  document.body.prepend(banner);

  // Tambahkan margin top ke body agar konten tidak tertutup
  document.body.style.paddingTop = (document.body.style.paddingTop
    ? parseInt(document.body.style.paddingTop) + 40
    : 40) + 'px';
}

// =============================================================
// PRIVATE HELPERS
// =============================================================

function _initGlobalEventListeners() {
  // Bottom nav
  _initBottomNav();

  // Form login
  const formLogin = document.getElementById('form-login');
  if (formLogin) formLogin.addEventListener('submit', handleLogin);

  // Quick fill akun demo
  document.querySelectorAll('.btn-demo-fill').forEach(btn => {
    btn.addEventListener('click', () => {
      const nipInput = document.getElementById('input-nip') || document.getElementById('login-nip');
      const pwInput = document.getElementById('input-password') || document.getElementById('login-password');
      if (nipInput) nipInput.value = btn.dataset.nip;
      if (pwInput) pwInput.value = 'BUMN2024';
    });
  });

  // Toggle password
  const toggleBtn = document.getElementById('btn-toggle-password') || document.getElementById('toggle-pw');
  if (toggleBtn) toggleBtn.addEventListener('click', togglePassword);

  // Dashboard buttons -> Navigasi
  const btnMasuk = document.getElementById('btn-absen-masuk');
  if (btnMasuk) btnMasuk.addEventListener('click', () => navigateTo('absen-masuk'));

  const btnPulang = document.getElementById('btn-absen-pulang');
  if (btnPulang) btnPulang.addEventListener('click', () => navigateTo('absen-pulang'));

  const btnMenuIzin = document.getElementById('btn-menu-izin');
  if (btnMenuIzin) btnMenuIzin.addEventListener('click', () => navigateTo('pengajuan'));

  const btnMenuLembur = document.getElementById('btn-menu-lembur');
  if (btnMenuLembur) btnMenuLembur.addEventListener('click', () => navigateTo('pengajuan'));

  const btnMenuCuti = document.getElementById('btn-menu-cuti');
  if (btnMenuCuti) btnMenuCuti.addEventListener('click', () => navigateTo('pengajuan'));

  // Tombol Kembali (Back)
  const btnBackMasuk = document.getElementById('btn-back-masuk');
  if (btnBackMasuk) btnBackMasuk.addEventListener('click', () => navigateTo('dashboard'));

  const btnBackPulang = document.getElementById('btn-back-pulang');
  if (btnBackPulang) btnBackPulang.addEventListener('click', () => navigateTo('dashboard'));

  // Tombol Logout
  const btnLogoutHeader = document.getElementById('btn-logout-header');
  if (btnLogoutHeader) btnLogoutHeader.addEventListener('click', handleLogout);

  const btnLogoutProfil = document.getElementById('btn-logout-profil');
  if (btnLogoutProfil) btnLogoutProfil.addEventListener('click', handleLogout);

  // Konfirmasi absen masuk
  const btnKonfirmasiMasuk = document.getElementById('btn-konfirmasi-masuk') || document.getElementById('btn-confirm-masuk');
  if (btnKonfirmasiMasuk) btnKonfirmasiMasuk.addEventListener('click', konfirmasiAbsenMasuk);

  // Konfirmasi absen pulang
  const btnKonfirmasiPulang = document.getElementById('btn-konfirmasi-pulang') || document.getElementById('btn-confirm-pulang');
  if (btnKonfirmasiPulang) btnKonfirmasiPulang.addEventListener('click', konfirmasiAbsenPulang);

  // Tombol Batal Modal Konfirmasi
  const btnCancelMasuk = document.getElementById('btn-cancel-masuk');
  if (btnCancelMasuk) btnCancelMasuk.addEventListener('click', () => hideModal('modal-konfirmasi-masuk'));

  const btnCancelPulang = document.getElementById('btn-cancel-pulang');
  if (btnCancelPulang) btnCancelPulang.addEventListener('click', () => hideModal('modal-konfirmasi-pulang'));

  // Modal feedback close
  const btnCloseSuccess = document.getElementById('btn-close-success');
  if (btnCloseSuccess) btnCloseSuccess.addEventListener('click', () => hideModal('modal-success'));

  const btnCloseError = document.getElementById('btn-close-error');
  if (btnCloseError) btnCloseError.addEventListener('click', () => hideModal('modal-error'));

  // Tutup modal saat klik backdrop / modal luar
  document.querySelectorAll('.modal, .modal-backdrop').forEach(modalEl => {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        hideModal(modalEl.id);
      }
    });
  });

  // Tombol batal modal umum
  document.querySelectorAll('.btn-modal-batal, .btn-modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal || (btn.closest('.modal') ? btn.closest('.modal').id : '');
      if (modalId) hideModal(modalId);
    });
  });

  // Ubah Password modal
  const btnUbahPw = document.getElementById('btn-ubah-password');
  if (btnUbahPw) btnUbahPw.addEventListener('click', () => showModal('modal-ubah-password'));

  const btnCancelUbahPw = document.getElementById('btn-cancel-ubah-pw');
  if (btnCancelUbahPw) btnCancelUbahPw.addEventListener('click', () => hideModal('modal-ubah-password'));

  const formUbahPw = document.getElementById('form-ubah-password');
  if (formUbahPw) {
    formUbahPw.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwBaru = document.getElementById('pw-baru');
      const pwKonfirm = document.getElementById('pw-konfirmasi');
      if (pwBaru && pwKonfirm && pwBaru.value !== pwKonfirm.value) {
        const err = document.getElementById('ubah-pw-error');
        if (err) {
          err.textContent = 'Konfirmasi password tidak cocok.';
          err.style.display = 'block';
        }
        return;
      }
      hideModal('modal-ubah-password');
      showSuccess('Password berhasil diperbarui.');
    });
  }

  // Export PDF
  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      if (typeof exportPDF === 'function') exportPDF();
    });
  }

  // Pengajuan tabs
  const tabBuat = document.getElementById('tab-buat');
  const tabStatus = document.getElementById('tab-status');
  const contentBuat = document.getElementById('tab-content-buat');
  const contentStatus = document.getElementById('tab-content-status');

  if (tabBuat && tabStatus) {
    tabBuat.addEventListener('click', () => {
      tabBuat.classList.add('tab-active');
      tabStatus.classList.remove('tab-active');
      if (contentBuat) contentBuat.classList.add('tab-content-active');
      if (contentStatus) contentStatus.classList.remove('tab-content-active');
    });
    tabStatus.addEventListener('click', () => {
      tabStatus.classList.add('tab-active');
      tabBuat.classList.remove('tab-active');
      if (contentStatus) contentStatus.classList.add('tab-content-active');
      if (contentBuat) contentBuat.classList.remove('tab-content-active');
      if (typeof loadPengajuan === 'function') loadPengajuan();
    });
  }

  // Pengajuan hitung hari
  const tglMulai = document.getElementById('tanggal-mulai');
  const tglSelesai = document.getElementById('tanggal-selesai');
  const wrapJumlah = document.getElementById('jumlah-hari-wrap');
  const txtJumlah = document.getElementById('jumlah-hari');

  function updateDurasiHari() {
    if (tglMulai && tglSelesai && tglMulai.value && tglSelesai.value) {
      const d1 = new Date(tglMulai.value);
      const d2 = new Date(tglSelesai.value);
      const diffMs = d2 - d1;
      if (diffMs >= 0) {
        const diffHari = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        if (txtJumlah) txtJumlah.textContent = diffHari;
        if (wrapJumlah) wrapJumlah.style.display = 'flex';
      }
    }
  }
  if (tglMulai) tglMulai.addEventListener('change', updateDurasiHari);
  if (tglSelesai) tglSelesai.addEventListener('change', updateDurasiHari);

  // File lampiran info
  const fileInput = document.getElementById('input-lampiran');
  const fileInfo = document.getElementById('lampiran-nama');
  if (fileInput && fileInfo) {
    fileInput.addEventListener('change', (e) => {
      fileInfo.textContent = e.target.files[0] ? e.target.files[0].name : 'Belum ada file dipilih';
    });
  }

  // Submit pengajuan
  const btnKirimPengajuan = document.getElementById('btn-submit-pengajuan');
  if (btnKirimPengajuan) {
    btnKirimPengajuan.addEventListener('click', async (e) => {
      e.preventDefault();
      const jenisEl = document.getElementById('jenis-pengajuan');
      const alasanEl = document.getElementById('alasan-pengajuan');
      if (!jenisEl || !jenisEl.value) {
        showError('Pilih jenis pengajuan terlebih dahulu.');
        return;
      }
      if (!tglMulai || !tglMulai.value || !tglSelesai || !tglSelesai.value) {
        showError('Isi tanggal mulai dan tanggal selesai.');
        return;
      }
      if (!alasanEl || !alasanEl.value.trim()) {
        showError('Isi alasan pengajuan.');
        return;
      }

      showLoading('Mengirim pengajuan...');
      try {
        const session = getSession();
        const data = {
          nip: session ? session.nip : '',
          tipe: jenisEl.options[jenisEl.selectedIndex].text,
          tanggal_mulai: tglMulai.value,
          tanggal_selesai: tglSelesai.value,
          alasan: alasanEl.value.trim()
        };
        const res = await apiKirimPengajuan(data);
        hideLoading();
        if (res.success) {
          showSuccess(res.pesan || 'Pengajuan berhasil dikirim!');
          if (alasanEl) alasanEl.value = '';
          if (tabStatus) tabStatus.click();
        } else {
          showError(res.pesan || 'Gagal mengirim pengajuan.');
        }
      } catch (err) {
        hideLoading();
        showError('Terjadi kesalahan: ' + err.message);
      }
    });
  }
}

function _updateStatCards(rekap) {
  const elHadir    = document.getElementById('stat-hadir');
  const elTerlambat = document.getElementById('stat-terlambat');
  const elAbsen    = document.getElementById('stat-absen');
  const elIzin     = document.getElementById('stat-izin');

  if (!rekap) {
    if (elHadir)    elHadir.textContent    = '-';
    if (elTerlambat) elTerlambat.textContent = '-';
    if (elAbsen)    elAbsen.textContent    = '-';
    if (elIzin)     elIzin.textContent     = '-';
    return;
  }

  if (elHadir)    elHadir.textContent    = rekap.hadir     ?? 0;
  if (elTerlambat) elTerlambat.textContent = rekap.terlambat ?? 0;
  if (elAbsen)    elAbsen.textContent    = rekap.absen     ?? 0;
  if (elIzin)     elIzin.textContent     = rekap.izin      ?? 0;

  // Hapus skeleton
  document.querySelectorAll('.stat-card.skeleton').forEach(el => el.classList.remove('skeleton'));
}

function _tampilkanSkeletonRekap() {
  document.querySelectorAll('.stat-card').forEach(el => el.classList.add('skeleton'));
  const statEls = ['stat-hadir', 'stat-terlambat', 'stat-absen', 'stat-izin'];
  statEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });
}

function _updateRingkasanRiwayat(ringkasan) {
  const map = {
    'ringkasan-hadir':     ringkasan.hadir,
    'ringkasan-terlambat': ringkasan.terlambat,
    'ringkasan-absen':     ringkasan.absen,
    'ringkasan-izin':      ringkasan.izin
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

function _switchTabPengajuan(tab) {
  _currentTabPengajuan = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = content.dataset.tab === tab ? 'block' : 'none';
  });
}

function _buatToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 99999;
    display: flex; flex-direction: column; gap: 8px;
    max-width: calc(100vw - 32px);
  `;
  document.body.appendChild(container);
  return container;
}

function _hitungTahunMasukDariNIP(nip) {
  // Format NIP BUMN: YYYYMMDDTahunMasukNomorUrut
  // Contoh: 198501012010011001 → tahun masuk 2010
  if (!nip || nip.length < 18) return null;
  const tahunMasuk = parseInt(nip.substring(8, 12));
  return isNaN(tahunMasuk) ? null : tahunMasuk;
}

// =============================================================
// ENTRY POINT
// =============================================================
document.addEventListener('DOMContentLoaded', initApp);
