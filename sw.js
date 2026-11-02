// Ao publicar uma nova versão, mude o número abaixo (muv-v3, muv-v4, ...).
const CACHE = "muv-v2";
const FILES = ["./", "index.html", "manifest.webmanifest", "exceljs.min.js", "modelo.xlsx", "icon-192.png", "icon-512.png", "icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Página: tenta a rede (até 3 s) para apanhar atualizações; sem rede usa a cópia guardada.
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match("index.html").then(r => { if (!done && r) { done = true; resolve(r); } });
      const t = setTimeout(fallback, 3000);
      fetch(req).then(resp => {
        clearTimeout(t);
        if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); }
        if (!done) { done = true; resolve(resp); }
      }).catch(() => { clearTimeout(t); fallback().then(() => { if (!done) { done = true; resolve(Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(resp => {
    if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return resp;
  })));
});
