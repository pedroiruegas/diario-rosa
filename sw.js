const CACHE = 'diario-rosa-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // La API de TMDB nunca se cachea: siempre datos frescos
  if (url.hostname === 'api.themoviedb.org') return;

  // Imágenes de TMDB y fuentes: caché primero, se guardan al verlas
  if (url.hostname === 'image.tmdb.org' || url.hostname.includes('fonts.g')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
      return res;
    })));
    return;
  }

  // Archivos de la app: caché primero, red si falta
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
