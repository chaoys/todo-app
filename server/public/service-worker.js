// 缓存版本号
const CACHE_VERSION = 'v1';
const CACHE_NAME = `todo-cache-${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/register',
  '/todos',
  '/css/bootstrap.min.css',
  '/js/bootstrap.bundle.min.js',
  '/css/bootstrap-icons.css'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('todo-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// 处理请求
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
  } else {
    // 非 GET 请求，如果离线则存储到 IndexedDB
    if (!navigator.onLine) {
      event.respondWith(
        saveOfflineRequest(event.request).then(() => {
          return new Response(JSON.stringify({ status: 'offline', message: '请求已保存，将在网络恢复后同步' }));
        })
      );
    }
  }
});

// 监听在线状态变化
self.addEventListener('online', () => {
  syncOfflineRequests();
});