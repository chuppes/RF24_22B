const CACHE_NAME = 'schedule-v2';
const DYNAMIC_CACHE = 'schedule-dynamic-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

self.addEventListener('install', event => {
  console.log('📦 [SW] Установка');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('💾 [SW] Кеширование ресурсов');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('✅ [SW] Активация');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            console.log('🗑️ [SW] Удаление старого кеша:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          fetch(event.request)
            .then(response => {
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(event.request, response);
              });
            })
            .catch(() => {});
          
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) return response;

            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          });
      })
  );
});

self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() ?? '📚 Проверь расписание на сегодня!',
    icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 192 192\'%3E%3Crect width=\'192\' height=\'192\' rx=\'36\' fill=\'%23667eea\'/%3E%3Ctext x=\'96\' y=\'128\' font-family=\'Arial\' font-size=\'104\' text-anchor=\'middle\'%3E📚%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 72 72\'%3E%3Crect width=\'72\' height=\'72\' rx=\'16\' fill=\'%230071e3\'/%3E%3Ctext x=\'36\' y=\'48\' font-family=\'Arial\' font-size=\'40\' text-anchor=\'middle\'%3E📚%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    tag: 'schedule-reminder',
    renotify: true,
    actions: [
      { action: 'open', title: '📖 Открыть' },
      { action: 'close', title: '✖️ Закрыть' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('📚 Расписание РФ24-22Б', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});
