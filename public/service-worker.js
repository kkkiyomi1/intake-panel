/* v1.0: simple app-shell caching */
const CACHE_NAME = 'intake-panel-v1';
const APP_SHELL = [
  '/',               // Vercel 会把根路径指向 index.html
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png'
];

// 安装：预缓存应用壳
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求策略：静态资源用“缓存优先，网络回源”；其余走网络
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET
  if (request.method !== 'GET') return;

  // 仅对同源静态资源做缓存优先
  const isSameOrigin = url.origin === self.location.origin;
  const isStatic = isSameOrigin && (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest')
  );

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((resp) => {
          // 动态加入缓存（克隆）
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return resp;
        })
      )
    );
  }
  // 其它请求（如 Firestore）直接放行（Firestore 自己有离线缓存能力）
});
