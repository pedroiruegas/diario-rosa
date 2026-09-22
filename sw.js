const CACHE = 'diario-rosa-v3';
const ASSETS = ['./', './index.html', './manifest.json', './capitulos.json',
                './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // si capitulos.json aún no existe, no truena la instalación
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

function guardar(req, res){
  if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Archivos de la app: red primero (siempre la versión nueva), caché si no hay internet
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request).then(r => guardar(e.request, r))
      .catch(() => caches.match(e.request)));
    return;
  }

  // Imágenes, fuentes y la librería de Supabase: caché primero. La API de Supabase nunca se cachea.
  if (url.hostname === 'image.tmdb.org' || url.hostname.includes('fonts.g') || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(r => guardar(e.request, r))));
  }
});
