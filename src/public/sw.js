const CACHE_VERSION = 'v3';
const SHELL_CACHE = `story-app-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `story-app-assets-${CACHE_VERSION}`;
const API_CACHE = `story-app-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `story-app-images-${CACHE_VERSION}`;

const CONTEXT_CACHE = 'story-app-notification-context';
const CONTEXT_KEY = '/__notification-context__';

const MANAGED_CACHES = [SHELL_CACHE, ASSET_CACHE, API_CACHE, IMAGE_CACHE, CONTEXT_CACHE];

const BUILD_ASSETS = Array.isArray(self.__BUILD_ASSETS__) ? self.__BUILD_ASSETS__ : [];

const IS_PRODUCTION_BUILD = self.__BUILD_MODE__ === 'production';

const BASE_PATH = self.__BASE_PATH__ || new URL('./', self.location.href).pathname;

const withBase = (path = '') => `${BASE_PATH}${String(path).replace(/^\/+/, '')}`;

const SHELL_DOCUMENT = withBase('index.html');

const APP_SHELL = [
  BASE_PATH,
  SHELL_DOCUMENT,
  withBase('manifest.webmanifest'),
  withBase('favicon.png'),
  withBase('images/logo.png'),
  withBase('icons/icon-192.png'),
  withBase('icons/icon-512.png'),
  withBase('icons/maskable-icon-192.png'),
  withBase('icons/maskable-icon-512.png'),
  withBase('icons/apple-touch-icon.png'),
  ...BUILD_ASSETS,
];

const API_BASE_URL = self.__API_BASE_URL__;
const API_ORIGIN = new URL(API_BASE_URL, self.location.origin).origin;
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
const MAP_TILE_HOSTS = [
  'tile.openstreetmap.org',
  'basemaps.cartocdn.com',
  'server.arcgisonline.com',
];

const MAX_IMAGE_ENTRIES = 90;
const MAX_API_ENTRIES = 60;

const DEFAULT_ICON = withBase('icons/icon-192.png');
const DEFAULT_BADGE = withBase('favicon.png');
const DEFAULT_TITLE = 'Story App';
const DEFAULT_BODY = 'Ada pembaruan cerita terbaru untuk Anda.';


self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION} (${APP_SHELL.length} berkas shell)`);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      await Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((error) => {
            console.warn(`[SW] Gagal precache ${url}:`, error);
          })
        )
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('story-app-') && !MANAGED_CACHES.includes(name))
          .map((name) => {
            console.log(`[SW] Menghapus cache lama: ${name}`);
            return caches.delete(name);
          })
      );

      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }

      await self.clients.claim();
    })()
  );
});

function isCacheableResponse(response) {
  return Boolean(response) && (response.ok || response.type === 'opaque');
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;

    const excess = keys.length - maxEntries;
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
  } catch (error) {
    console.warn(`[SW] Gagal merapikan cache ${cacheName}:`, error);
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return response;
  } catch (error) {
    console.warn('[SW] cacheFirst gagal:', request.url, error);
    throw error;
  }
}

async function networkFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Offline, menyajikan data tersimpan:', request.url);
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone()).then(() => {
          if (maxEntries) trimCache(cacheName, maxEntries);
        });
      }
      return response;
    })
    .catch((error) => {
      if (!cached) console.warn('[SW] staleWhileRevalidate gagal:', request.url, error);
      return null;
    });

  return cached || (await networkFetch) || Response.error();
}

async function findStoryInCachedList(storyId) {
  try {
    const cache = await caches.open(API_CACHE);
    const keys = await cache.keys();
    const listRequests = keys.filter((request) =>
      new URL(request.url).pathname.endsWith('/stories')
    );

    for (const request of listRequests) {
      const cached = await cache.match(request);
      if (!cached) continue;

      const json = await cached.clone().json();
      const found = (json.listStory || []).find((story) => story.id === storyId);
      if (found) return found;
    }
  } catch (error) {
    console.warn('[SW] Gagal membaca daftar cerita dari cache:', error);
  }

  return null;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleStoryDetailRequest(request, storyId) {
  try {
    return await networkFirst(request, API_CACHE, MAX_API_ENTRIES);
  } catch (error) {
    const story = await findStoryInCachedList(storyId);

    if (story) {
      console.log('[SW] Detail cerita disusun dari daftar tersimpan:', storyId);
      return jsonResponse({
        error: false,
        message: 'Detail cerita ditampilkan dari data offline.',
        story,
      });
    }

    return jsonResponse(
      {
        error: true,
        message:
          'Anda sedang offline dan detail cerita ini belum tersimpan di perangkat. Sambungkan kembali ke internet lalu coba lagi.',
      },
      503
    );
  }
}

function buildOfflineFallbackPage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Story App - Offline</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;padding:24px}
  .card{max-width:420px;text-align:center;background:#fff;padding:32px;border-radius:16px;
    box-shadow:0 10px 15px -3px rgba(0,0,0,.08)}
  h1{font-size:1.35rem;margin:0 0 12px}
  p{color:#64748b;margin:0 0 20px}
  a{display:inline-block;padding:10px 18px;border-radius:8px;background:#2563eb;color:#fff;
    text-decoration:none;font-weight:600}
</style></head>
<body><div class="card">
  <h1>Anda sedang offline</h1>
  <p>Story App belum sempat menyimpan halaman ini. Sambungkan kembali ke internet lalu muat ulang halaman.</p>
  <a href="${BASE_PATH}">Coba Lagi</a>
</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
  );
}

async function handleNavigationRequest(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(SHELL_DOCUMENT, preloaded.clone()).catch(() => {});
      return preloaded;
    }

    const response = await fetch(event.request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(SHELL_DOCUMENT, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cache = await caches.open(SHELL_CACHE);
    const cachedShell = (await cache.match(SHELL_DOCUMENT)) || (await cache.match(BASE_PATH));
    return cachedShell || buildOfflineFallbackPage();
  }
}


self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  if (url.pathname.includes('/notifications/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (url.origin === API_ORIGIN) {
    if (url.pathname.startsWith('/images/') || /\.(png|jpe?g|webp|gif)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
      return;
    }

    const detailMatch = url.pathname.match(/\/stories\/([^/]+)$/);
    if (detailMatch) {
      event.respondWith(handleStoryDetailRequest(request, detailMatch[1]));
      return;
    }

    event.respondWith(networkFirst(request, API_CACHE, MAX_API_ENTRIES));
    return;
  }

  // Tile peta Leaflet.
  if (MAP_TILE_HOSTS.some((host) => url.hostname.endsWith(host))) {
    event.respondWith(
      cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES).catch(() => Response.error())
    );
    return;
  }

  // Google Fonts.
  if (FONT_ORIGINS.includes(url.origin)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    const strategy = IS_PRODUCTION_BUILD
      ? staleWhileRevalidate(request, ASSET_CACHE, 120)
      : networkFirst(request, ASSET_CACHE, 120);

    event.respondWith(
      strategy.catch(async () => {
        const shell = await caches.open(SHELL_CACHE);
        return (await shell.match(request)) || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || Response.error();
    })
  );
});

async function saveStoryContext(context) {
  try {
    const cache = await caches.open(CONTEXT_CACHE);
    await cache.put(
      CONTEXT_KEY,
      new Response(JSON.stringify(context), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (error) {
    console.error('[SW] Gagal menyimpan konteks cerita:', error);
  }
}

async function readStoryContext() {
  try {
    const cache = await caches.open(CONTEXT_CACHE);
    const cached = await cache.match(CONTEXT_KEY);
    if (!cached) return null;
    return await cached.json();
  } catch (error) {
    console.error('[SW] Gagal membaca konteks cerita:', error);
    return null;
  }
}

self.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;

  if (message.type === 'STORY_CONTEXT') {
    event.waitUntil(saveStoryContext(message.payload || {}));
  }

  if (message.type === 'CLEAR_STORY_CONTEXT') {
    event.waitUntil(caches.delete(CONTEXT_CACHE));
  }

  if (message.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function parsePushData(pushMessageData) {
  if (!pushMessageData) return {};

  try {
    return pushMessageData.json() || {};
  } catch (error) {
    try {
      return { body: pushMessageData.text() };
    } catch (innerError) {
      console.error('[SW] Payload push tidak dapat dibaca:', innerError);
      return {};
    }
  }
}

async function buildNotification(rawPayload) {
  const payload = rawPayload || {};
  const payloadOptions = payload.options || {};
  const payloadData = payloadOptions.data || payload.data || {};
  const context = (await readStoryContext()) || {};

  const storyId = payloadData.storyId || payloadData.id || payload.storyId || context.id || null;
  const title = payload.title || payloadOptions.title || DEFAULT_TITLE;
  const body = payloadOptions.body || payload.body || context.description || DEFAULT_BODY;
  const icon = payloadOptions.icon || payload.icon || context.photoUrl || DEFAULT_ICON;
  const image = payloadOptions.image || payload.image || context.photoUrl || undefined;

  const detailUrl = storyId ? withBase(`#/stories/${storyId}`) : withBase('#/');

  const actions = [
    { action: 'open-detail', title: storyId ? 'Lihat Detail Cerita' : 'Buka Story App' },
    { action: 'close', title: 'Tutup' },
  ];

  return {
    title,
    options: {
      body,
      icon,
      image,
      badge: DEFAULT_BADGE,
      lang: 'id',
      dir: 'ltr',
      tag: storyId ? `story-${storyId}` : 'story-app-general',
      renotify: true,
      requireInteraction: false,
      vibrate: [120, 60, 120],
      timestamp: payloadOptions.timestamp || undefined,
      data: {
        storyId,
        url: payloadData.url || detailUrl,
        author: context.name || null,
      },
      actions,
    },
  };
}

self.addEventListener('push', (event) => {
  console.log('[SW] Push event diterima');

  event.waitUntil(
    (async () => {
      const payload = parsePushData(event.data);
      const { title, options } = await buildNotification(payload);
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data || {};

  notification.close();

  if (action === 'close') {
    return;
  }

  const targetUrl = new URL(data.url || withBase('#/'), self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          } else {
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          }
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notifikasi ditutup:', event.notification.tag);
});
