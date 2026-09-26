// Service worker: lưu sẵn file game để mở được khi mất mạng. API bạn bè (/api) luôn đi mạng.
// Trang chính: lấy mạng trước (để nhận bản mới), mất mạng thì dùng bản đã lưu.
// Hình, script có mã băm: dùng bản đã lưu ngay, cập nhật ngầm.
const CACHE = 'nha-thang-phong-v2';
const MAX_ENTRIES = 400;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(k);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put('/', copy));
      return res;
    }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    const fresh = fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone()).then(() => trim(c));
      return res;
    }).catch(() => hit);
    return hit ?? fresh;
  }));
});
