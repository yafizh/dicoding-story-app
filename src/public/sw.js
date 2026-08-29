const SW_VERSION = 'story-app-sw-v1';
const CONTEXT_CACHE = 'story-app-notification-context';
const CONTEXT_KEY = '/__notification-context__';

const DEFAULT_ICON = '/images/logo.png';
const DEFAULT_BADGE = '/favicon.png';
const DEFAULT_TITLE = 'Story App';
const DEFAULT_BODY = 'Ada pembaruan cerita terbaru untuk Anda.';

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${SW_VERSION}`);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${SW_VERSION}`);
  event.waitUntil(self.clients.claim());
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
  const payload = rawPayload;
  const payloadOptions = payload.options;
  const payloadData = payloadOptions.data || payload.data;
  const context = (await readStoryContext());

  const storyId = payloadData.storyId || payloadData.id || payload.storyId || context.id || null;
  const title = payload.title || payloadOptions.title || DEFAULT_TITLE;
  const body = payloadOptions.body || payload.body || context.description || DEFAULT_BODY;
  const icon = payloadOptions.icon || payload.icon || context.photoUrl || DEFAULT_ICON;
  const image = payloadOptions.image || payload.image || context.photoUrl || undefined;

  const detailUrl = storyId ? `/#/stories/${storyId}` : '/#/';

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

  const targetUrl = new URL(data.url || '/#/', self.location.origin).href;

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
