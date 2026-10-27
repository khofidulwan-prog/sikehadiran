// ============================================================
// SiKehadiran — Service Worker
// Cache Strategy: Network First + Cache Fallback
// Version: 1.0.0
// ============================================================

const CACHE_NAME = 'sikehadiran-v1.0.0';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/api.js',
  './assets/js/auth.js',
  './assets/js/absen.js',
  './assets/js/riwayat.js',
  './assets/js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// URL pattern yang TIDAK boleh di-cache
const BYPASS_CACHE_PATTERNS = [
  /script\.google\.com/,     // Google Apps Script API
  /nominatim\.openstreetmap\.org/, // OpenStreetMap / Nominatim
  /openstreetmap\.org/,
  /googleapis\.com\/maps/
];

// Pattern untuk aset statis (Cache First)
const STATIC_ASSET_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.html$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.svg$/,
  /\.ico$/,
  /\.woff2?$/,
  /fonts\.googleapis\.com/,
  /cdnjs\.cloudflare\.com/
];

// Offline fallback response
const OFFLINE_RESPONSE = JSON.stringify({
  success: false,
  offline: true,
  pesan: 'Tidak ada koneksi internet. Silakan cek koneksi Anda dan coba lagi.'
});

// ============================================================
// INSTALL EVENT — Cache semua aset awal
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Install event — CACHE_NAME:', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Membuka cache dan menyimpan aset...');
        // addAll dengan error handling per URL
        const cachePromises = CACHE_URLS.map((url) => {
          return cache.add(url).then(() => {
            console.log('[SW] Cached:', url);
          }).catch((err) => {
            console.warn('[SW] Gagal cache (diabaikan):', url, err.message);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] Install selesai. Memanggil skipWaiting...');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install error:', err);
      })
  );
});

// ============================================================
// ACTIVATE EVENT — Hapus cache lama, klaim klien
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldName) => {
            console.log('[SW] Menghapus cache lama:', oldName);
            return caches.delete(oldName);
          });
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Cache lama dihapus. Mengklaim semua klien...');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW] Activate selesai. Service worker aktif.');
        // Jadwalkan pengingat absen setelah aktivasi
        scheduleAbsenReminder();
      })
      .catch((err) => {
        console.error('[SW] Activate error:', err);
      })
  );
});

// ============================================================
// FETCH EVENT — Strategi Network First dengan fallback Cache
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Hanya tangani request GET
  if (event.request.method !== 'GET') return;

  // Bypass cache untuk API eksternal (Google Apps Script, Nominatim, dll)
  if (BYPASS_CACHE_PATTERNS.some((pattern) => pattern.test(url))) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(OFFLINE_RESPONSE, {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache First untuk aset statis
  if (STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url))) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // Network First untuk semua request lain (halaman HTML, dll)
  event.respondWith(networkFirstStrategy(event.request));
});

// ============================================================
// Cache First Strategy
// ============================================================
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache di background
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse);
          });
        }
      }).catch(() => {});
      return cachedResponse;
    }

    // Tidak ada cache — ambil dari network
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedFallback = await caches.match(request);
    if (cachedFallback) return cachedFallback;

    // Offline fallback
    if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
      const offlinePage = await caches.match('/index.html');
      if (offlinePage) return offlinePage;
    }

    return new Response(OFFLINE_RESPONSE, {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// Network First Strategy
// ============================================================
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Simpan ke cache jika berhasil
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (err) {
    // Network gagal — coba dari cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Offline — melayani dari cache:', request.url);
      return cachedResponse;
    }

    // Tidak ada cache — fallback offline
    if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
      const offlinePage = await caches.match('/index.html');
      if (offlinePage) return offlinePage;
    }

    return new Response(OFFLINE_RESPONSE, {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// SYNC EVENT — Background Sync untuk Absen Offline
// ============================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event — tag:', event.tag);

  if (event.tag === 'sync-absen-masuk') {
    event.waitUntil(sendPendingAbsen('masuk'));
  } else if (event.tag === 'sync-absen-pulang') {
    event.waitUntil(sendPendingAbsen('pulang'));
  } else if (event.tag === 'sync-pengajuan') {
    event.waitUntil(sendPendingAbsen('pengajuan'));
  }
});

// ============================================================
// sendPendingAbsen — Kirim Data Absen yang Tertunda
// ============================================================
async function sendPendingAbsen(tipe) {
  console.log('[SW] Mengirim pending absen:', tipe);

  try {
    const storeName = tipe === 'masuk' ? 'queue-masuk' :
                      tipe === 'pulang' ? 'queue-pulang' : 'queue-pengajuan';
    const pendingData = await getQueue(storeName);

    if (!pendingData || pendingData.length === 0) {
      console.log('[SW] Tidak ada pending data untuk:', tipe);
      return;
    }

    for (const item of pendingData) {
      try {
        const apiUrl = item.apiUrl;
        const payload = { ...item.payload, action: tipe === 'masuk' ? 'absen-masuk' : tipe === 'pulang' ? 'absen-pulang' : 'pengajuan' };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('[SW] Sync berhasil untuk item:', item.id);
            await deleteFromQueue(storeName, item.id);

            // Notifikasi berhasil
            await self.registration.showNotification('SiKehadiran — Absen Tersimpan', {
              body: `Absen ${tipe} berhasil disinkronisasi (data offline).`,
              icon: '/assets/icons/icon-192.png',
              badge: '/assets/icons/icon-72.png',
              tag: 'sync-success-' + tipe,
              requireInteraction: false
            });
          }
        }
      } catch (itemErr) {
        console.error('[SW] Gagal sync item:', item.id, itemErr.message);
      }
    }
  } catch (err) {
    console.error('[SW] sendPendingAbsen error:', err.message);
    throw err; // Re-throw agar sync bisa dicoba lagi
  }
}

// ============================================================
// PUSH EVENT — Push Notification dari Server
// ============================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push event diterima');

  let data = {
    title: 'SiKehadiran',
    body: 'Ada notifikasi baru.',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    tag: 'sikehadiran-push',
    requireInteraction: false,
    actions: []
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    console.warn('[SW] Gagal parse push data:', err.message);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/assets/icons/icon-192.png',
      badge: data.badge || '/assets/icons/icon-72.png',
      tag: data.tag || 'sikehadiran-push',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.url ? { url: data.url } : {}
    })
  );
});

// ============================================================
// NOTIFICATIONCLICK EVENT — Klik Notifikasi
// ============================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notifikasi diklik — action:', event.action);
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  let finalUrl = self.location.origin + targetUrl;

  // Handle action buttons
  if (event.action === 'absen-masuk') {
    finalUrl = self.location.origin + '/?page=absen-masuk';
  } else if (event.action === 'absen-pulang') {
    finalUrl = self.location.origin + '/?page=absen-pulang';
  } else if (event.action === 'lihat-riwayat') {
    finalUrl = self.location.origin + '/?page=riwayat';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Cari tab yang sudah terbuka
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(finalUrl);
            return client.focus();
          }
        }
        // Tidak ada tab terbuka — buka baru
        if (clients.openWindow) {
          return clients.openWindow(finalUrl);
        }
      })
  );
});

// ============================================================
// MESSAGE EVENT — Pesan dari halaman utama
// ============================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message diterima:', event.data);

  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] SKIP_WAITING diterima, memanggil skipWaiting...');
      self.skipWaiting();
      break;

    case 'SCHEDULE_NOTIFICATION':
      const { jam, menit, judul, pesan } = event.data.payload || {};
      if (jam !== undefined && menit !== undefined) {
        scheduleCustomNotification(jam, menit, judul || 'SiKehadiran', pesan || 'Waktunya absen!');
      }
      break;

    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache dihapus sesuai permintaan.');
      });
      break;

    case 'GET_VERSION':
      event.source.postMessage({ type: 'SW_VERSION', version: CACHE_NAME });
      break;

    default:
      console.warn('[SW] Message tidak dikenal:', event.data.type);
  }
});

// ============================================================
// scheduleAbsenReminder — Jadwal Pengingat Absen Otomatis
// ============================================================
function scheduleAbsenReminder() {
  scheduleCustomNotification(7, 30, 'SiKehadiran — Pengingat Absen Masuk', 'Jangan lupa absen masuk hari ini! ☀️', [
    { action: 'absen-masuk', title: 'Absen Sekarang' }
  ]);

  scheduleCustomNotification(16, 50, 'SiKehadiran — Pengingat Absen Pulang', 'Segera lakukan absen pulang sebelum pukul 17:00. 🏠', [
    { action: 'absen-pulang', title: 'Absen Pulang' }
  ]);

  console.log('[SW] Pengingat absen dijadwalkan: 07:30 (masuk) & 16:50 (pulang).');
}

// ============================================================
// scheduleCustomNotification — Set Notifikasi pada Jam Tertentu
// ============================================================
function scheduleCustomNotification(targetJam, targetMenit, judul, pesanNotif, actions) {
  const sekarang = new Date();
  const targetWaktu = new Date();
  targetWaktu.setHours(targetJam, targetMenit, 0, 0);

  // Jika waktu target sudah lewat hari ini, jadwalkan besok
  if (targetWaktu <= sekarang) {
    targetWaktu.setDate(targetWaktu.getDate() + 1);
  }

  const delayMs = targetWaktu.getTime() - sekarang.getTime();
  console.log(`[SW] Notifikasi dijadwalkan dalam ${Math.round(delayMs / 60000)} menit: "${judul}"`);

  // Simpan timeout ID di self agar tidak hilang
  const timeoutKey = `reminder_${targetJam}_${targetMenit}`;
  if (self[timeoutKey]) {
    clearTimeout(self[timeoutKey]);
  }

  self[timeoutKey] = setTimeout(async () => {
    try {
      // Cek apakah notifikasi diizinkan (hanya tampil jika window tidak fokus)
      await self.registration.showNotification(judul, {
        body: pesanNotif,
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-72.png',
        tag: `reminder-${targetJam}${targetMenit}`,
        requireInteraction: true,
        actions: actions || [
          { action: 'absen-masuk', title: 'Absen Masuk' },
          { action: 'lihat-riwayat', title: 'Lihat Riwayat' }
        ]
      });

      // Jadwal ulang untuk besok
      scheduleCustomNotification(targetJam, targetMenit, judul, pesanNotif, actions);
    } catch (err) {
      console.error('[SW] Gagal tampilkan notifikasi terjadwal:', err.message);
    }
  }, delayMs);
}

// ============================================================
// IndexedDB Helpers — Offline Queue
// ============================================================

const DB_NAME = 'sikehadiran-offline';
const DB_VERSION = 1;
const STORES = ['queue-masuk', 'queue-pulang', 'queue-pengajuan'];

/**
 * openDB — Buka / buat IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          console.log('[SW] IndexedDB store dibuat:', storeName);
        }
      });
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[SW] IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * saveToQueue — Simpan data absen ke IndexedDB queue
 * @param {string} store - Nama object store
 * @param {object} data - Data yang akan disimpan
 */
async function saveToQueue(store, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      const item = {
        ...data,
        savedAt: new Date().toISOString()
      };
      const request = objectStore.add(item);

      request.onsuccess = () => {
        console.log('[SW] Data disimpan ke queue:', store, request.result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[SW] saveToQueue error:', err.message);
    throw err;
  }
}

/**
 * getQueue — Ambil semua data dari IndexedDB queue
 * @param {string} store - Nama object store
 * @returns {Promise<Array>}
 */
async function getQueue(store) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const objectStore = tx.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[SW] getQueue error:', err.message);
    return [];
  }
}

/**
 * deleteFromQueue — Hapus item tertentu dari IndexedDB queue
 * @param {string} store - Nama object store
 * @param {number|string} id - ID item yang akan dihapus
 */
async function deleteFromQueue(store, id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log('[SW] Item dihapus dari queue:', store, id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[SW] deleteFromQueue error:', err.message);
  }
}

/**
 * clearQueue — Hapus semua data dari IndexedDB queue
 * @param {string} store - Nama object store
 */
async function clearQueue(store) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('[SW] Queue dikosongkan:', store);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[SW] clearQueue error:', err.message);
  }
}

console.log('[SW] Service Worker SiKehadiran v1.0.0 dimuat. Cache:', CACHE_NAME);
