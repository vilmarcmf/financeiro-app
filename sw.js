// ================================================================
// SERVICE WORKER — Minhas Finanças
// Cache "app shell" para funcionamento offline.
// IMPORTANTE: suba a versão do CACHE_NAME sempre que publicar uma
// mudança em index.html/manifest, senão o iPhone continua servindo
// a versão antiga do cache.
// ================================================================

const CACHE_NAME = 'financas-cache-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Nunca cacheia chamadas para o Google Apps Script (precisa ser sempre rede).
    if (req.url.includes('script.google.com')) {
        event.respondWith(fetch(req).catch(() => new Response(null, { status: 503 })));
        return;
    }

    // Estratégia: network-first para o HTML (pega atualizações), cache-first para o resto.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((resp) => {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    return resp;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((resp) => {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                return resp;
            }).catch(() => cached);
        })
    );
});
