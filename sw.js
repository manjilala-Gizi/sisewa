/* Service worker SiSewa: menyimpan tampilan aplikasi agar cepat dibuka & bisa dipasang di HP.
   Naikkan angka VERSI setiap kali mengunggah perubahan ke GitHub. */
const VERSI = 'sisewa-v4';
const BERKAS = ['./', './index.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(BERKAS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Data (Google Apps Script) dan permintaan non-GET tidak pernah di-cache
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Utamakan jaringan supaya pembaruan langsung terlihat; pakai cache saat offline
  e.respondWith(
    fetch(req)
      .then((res) => {
        const salinan = res.clone();
        caches.open(VERSI).then((c) => c.put(req, salinan));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
