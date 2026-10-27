// =============================================================
// auth.js — Session management, Login, Logout
// Aplikasi Absensi BUMN PWA
// =============================================================

const SESSION_KEY = 'absensi_bumn_session';
let _autoLogoutInterval = null;

// =============================================================
// 1. simpanSession
// =============================================================
function simpanSession(dataKaryawan) {
  const session = {
    nip:         dataKaryawan.nip,
    nama:        dataKaryawan.nama,
    jabatan:     dataKaryawan.jabatan,
    divisi:      dataKaryawan.divisi,
    departemen:  dataKaryawan.departemen,
    foto_url:    dataKaryawan.foto_url || '',
    role:        dataKaryawan.role || 'karyawan',
    loginAt:     new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// =============================================================
// 2. getSession
// =============================================================
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session || !session.loginAt) return null;

    // Cek expiry: MAX_SESSION_HOURS jam sejak loginAt
    const loginTime = new Date(session.loginAt).getTime();
    const now = Date.now();
    const diffHours = (now - loginTime) / (1000 * 60 * 60);

    if (diffHours > CONFIG.MAX_SESSION_HOURS) {
      hapusSession();
      return null;
    }

    return session;
  } catch (e) {
    hapusSession();
    return null;
  }
}

// =============================================================
// 3. hapusSession
// =============================================================
function hapusSession() {
  localStorage.removeItem(SESSION_KEY);
}

// =============================================================
// 4. cekSession
// =============================================================
function cekSession() {
  return getSession() !== null;
}

// =============================================================
// 5. getSessionNIP
// =============================================================
function getSessionNIP() {
  const session = getSession();
  return session ? session.nip : null;
}

// =============================================================
// 6. handleLogin
// =============================================================
async function handleLogin(event) {
  event.preventDefault();

  const nipInput      = document.getElementById('login-nip') || document.getElementById('input-nip');
  const passwordInput = document.getElementById('login-password') || document.getElementById('input-password');
  const btnLogin      = document.getElementById('btn-login');
  const errorEl       = document.getElementById('login-error');

  if (!nipInput || !passwordInput) return;

  const nip      = nipInput.value.trim();
  const password = passwordInput.value;

  // Validasi input
  if (!nip) {
    _setLoginError(errorEl, 'NIP tidak boleh kosong.');
    nipInput.focus();
    return;
  }
  if (!password) {
    _setLoginError(errorEl, 'Password tidak boleh kosong.');
    passwordInput.focus();
    return;
  }

  // Loading state
  if (errorEl) errorEl.style.display = 'none';
  if (btnLogin) {
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner"></span> Memverifikasi...';
  }

  try {
    let credential = password;
    // Hash password jika bukan demo mode
    if (!isDemoMode()) {
      credential = await hashPassword(password);
    }

    const result = await apiLogin(nip, credential);

    if (result.success) {
      simpanSession(result.data);
      // Redirect ke dashboard
      if (typeof navigateTo === 'function') {
        navigateTo('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
    } else {
      _setLoginError(errorEl, result.pesan || 'Login gagal. Periksa NIP dan password Anda.');
    }
  } catch (err) {
    _setLoginError(errorEl, 'Terjadi kesalahan: ' + err.message);
  } finally {
    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.innerHTML = 'Masuk';
    }
  }
}

// =============================================================
// 7. handleLogout
// =============================================================
function handleLogout() {
  const konfirm = confirm('Apakah Anda yakin ingin keluar?');
  if (!konfirm) return;

  // Hentikan auto-logout interval
  if (_autoLogoutInterval) {
    clearInterval(_autoLogoutInterval);
    _autoLogoutInterval = null;
  }

  hapusSession();

  // Navigasi ke halaman login
  if (typeof navigateTo === 'function') {
    navigateTo('login');
  } else {
    window.location.hash = '#login';
    window.location.reload();
  }

  if (typeof showToast === 'function') {
    showToast('Anda telah berhasil keluar.', 'info');
  }
}

// =============================================================
// 8. togglePassword
// =============================================================
function togglePassword() {
  const passwordInput = document.getElementById('login-password') || document.getElementById('input-password');
  const toggleIcon    = document.getElementById('toggle-password-icon') || document.getElementById('toggle-pw-icon');

  if (!passwordInput) return;

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    if (toggleIcon) {
      toggleIcon.className = 'fas fa-eye-slash';
    }
    passwordInput.setAttribute('aria-label', 'Sembunyikan password');
  } else {
    passwordInput.type = 'password';
    if (toggleIcon) {
      toggleIcon.className = 'fas fa-eye';
    }
    passwordInput.setAttribute('aria-label', 'Tampilkan password');
  }
}

// =============================================================
// 9. initAutoLogout
// =============================================================
function initAutoLogout() {
  // Bersihkan interval yang sudah ada
  if (_autoLogoutInterval) {
    clearInterval(_autoLogoutInterval);
  }

  _autoLogoutInterval = setInterval(() => {
    if (!cekSession()) {
      clearInterval(_autoLogoutInterval);
      _autoLogoutInterval = null;

      // Tampilkan pesan
      if (typeof showToast === 'function') {
        showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'warning');
      } else {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
      }

      // Redirect ke login
      setTimeout(() => {
        if (typeof navigateTo === 'function') {
          navigateTo('login');
        } else {
          window.location.reload();
        }
      }, 1500);
    }
  }, 60 * 1000); // cek setiap 1 menit
}

// =============================================================
// PRIVATE HELPERS
// =============================================================

function _setLoginError(el, pesan) {
  if (!el) {
    alert(pesan);
    return;
  }
  el.textContent = pesan;
  el.style.display = 'block';
  // Animasi shake
  el.classList.remove('shake');
  void el.offsetWidth; // reflow trigger
  el.classList.add('shake');
}
