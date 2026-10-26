// Self AI PWA service worker — shell cached network-first; API (POST) and media (storage) always network.
const C="selfai-v2";
self.addEventListener("install",e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./manifest.webmanifest","./icon.png"]).catch(()=>{}))); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",e=>{ const u=new URL(e.request.url); if(e.request.method!=="GET"||u.pathname.includes("/storage/")) return;
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok&&u.origin===location.origin){ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); } return r; }).catch(()=>caches.match(e.request).then(m=>m||caches.match("./")))); });
