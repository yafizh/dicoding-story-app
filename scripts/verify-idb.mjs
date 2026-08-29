/**
 * Verifikasi logika IndexedDB & sinkronisasi offline tanpa browser.
 * Dijalankan dengan fake-indexeddb + shim DOM minimal.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./verify-loader.mjs', pathToFileURL('./scripts/'));

import 'fake-indexeddb/auto';

const log = [];
let failures = 0;
function check(label, ok, extra = '') {
  if (!ok) failures += 1;
  log.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  -> ${extra}` : ''}`);
}

/* --- Shim DOM seperlunya --- */
const listeners = new Map();
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.document = {
  addEventListener(type, fn) {
    listeners.set(type, [...(listeners.get(type) || []), fn]);
  },
  removeEventListener() {},
  dispatchEvent(event) {
    (listeners.get(event.type) || []).forEach((fn) => fn(event));
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ classList: { add() {}, remove() {} }, style: {}, setAttribute() {}, appendChild() {} }),
  body: { appendChild() {} },
};
globalThis.window = { addEventListener() {}, confirm: () => true };
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: false },
  writable: true,
  configurable: true,
});
globalThis.localStorage = {
  store: new Map(),
  getItem(k) { return this.store.get(k) ?? null; },
  setItem(k, v) { this.store.set(k, v); },
  removeItem(k) { this.store.delete(k); },
};
globalThis.requestAnimationFrame = (fn) => fn();
// Sesi login palsu agar sinkronisasi memakai endpoint terautentikasi.
globalThis.localStorage.setItem(
  'STORY_APP_AUTH',
  JSON.stringify({ userId: 'u1', name: 'Tester', token: 'fake-token' })
);

/* --- Mock endpoint API --- */
const posted = [];
let failNextPost = false;
globalThis.fetch = async (url, options = {}) => {
  if (options.method === 'POST' && String(url).includes('/stories')) {
    if (failNextPost) {
      failNextPost = false;
      throw new TypeError('Failed to fetch');
    }
    const form = options.body;
    posted.push({
      url: String(url),
      auth: options.headers?.Authorization || null,
      description: form.get('description'),
      photoName: form.get('photo')?.name,
      photoSize: form.get('photo')?.size,
      lat: form.get('lat'),
      lon: form.get('lon'),
    });
    return { ok: true, json: async () => ({ error: false, message: 'success' }) };
  }
  throw new Error(`fetch tidak terduga: ${url}`);
};

process.env.VITE_BASE_URL = 'https://story-api.dicoding.dev/v1';

const db = await import('../src/scripts/data/database.js');

/* ================= CREATE / READ ================= */
await db.putSavedStory({
  id: 'story-a', name: 'Andi', description: 'Cerita dari Bandung yang seru',
  photoUrl: 'https://example.test/a.jpg', createdAt: '2026-08-20T10:00:00.000Z', lat: -6.9, lon: 107.6,
});
await db.putSavedStory({
  id: 'story-b', name: 'Budi', description: 'Perjalanan ke Bali tanpa koordinat',
  photoUrl: 'https://example.test/b.jpg', createdAt: '2026-08-22T10:00:00.000Z', lat: null, lon: null,
});
await db.putSavedStory({
  id: 'story-c', name: 'Citra', description: 'Sunset di Jogja',
  photoUrl: 'https://example.test/c.jpg', createdAt: '2026-08-25T10:00:00.000Z', lat: '-7.8', lon: '110.4',
});

let saved = await db.getAllSavedStories();
check('CREATE: 3 cerita tersimpan di store saved-stories', saved.length === 3, `n=${saved.length}`);
check('CREATE: koordinat string dinormalkan jadi number',
  saved.find((s) => s.id === 'story-c').lat === -7.8);
check('CREATE: koordinat kosong disimpan sebagai null',
  saved.find((s) => s.id === 'story-b').lat === null);
check('CREATE: setiap record punya stempel savedAt', saved.every((s) => Boolean(s.savedAt)));

check('READ: getSavedStory mengembalikan record tunggal',
  (await db.getSavedStory('story-a'))?.name === 'Andi');
check('READ: getSavedStoryIds mengembalikan Set berisi 3 id',
  (await db.getSavedStoryIds()).size === 3);
check('READ: isStorySaved true/false tepat',
  (await db.isStorySaved('story-a')) === true && (await db.isStorySaved('story-x')) === false);
check('READ: countSavedStories = 3', (await db.countSavedStories()) === 3);

// put ulang tidak menggandakan data (keyPath id)
await db.putSavedStory({ id: 'story-a', name: 'Andi Revisi', description: 'x', photoUrl: '', createdAt: '2026-08-20T10:00:00.000Z' });
saved = await db.getAllSavedStories();
check('UPDATE: menyimpan id yang sama menimpa, bukan menggandakan',
  saved.length === 3 && saved.find((s) => s.id === 'story-a').name === 'Andi Revisi');

/* ================= DELETE ================= */
await db.deleteSavedStory('story-b');
check('DELETE: story-b terhapus', (await db.countSavedStories()) === 2);
await db.clearSavedStories();
check('DELETE: clearSavedStories mengosongkan store', (await db.countSavedStories()) === 0);

/* ================= Interaktivitas presenter ================= */
await db.putSavedStory({ id: 's1', name: 'Andi', description: 'Cerita dari Bandung', photoUrl: '', createdAt: '2026-08-20T10:00:00.000Z', lat: -6.9, lon: 107.6 });
await new Promise((r) => setTimeout(r, 5));
await db.putSavedStory({ id: 's2', name: 'Budi', description: 'Bali tanpa koordinat', photoUrl: '', createdAt: '2026-08-24T10:00:00.000Z' });
await new Promise((r) => setTimeout(r, 5));
await db.putSavedStory({ id: 's3', name: 'Citra', description: 'Sunset di Jogja', photoUrl: '', createdAt: '2026-08-22T10:00:00.000Z', lat: -7.8, lon: 110.4 });

const { default: SavedPresenter } = await import('../src/scripts/pages/saved/saved-presenter.js');

let rendered = [];
const handlers = {};
const stubView = {
  bindSearch: (fn) => (handlers.search = fn),
  bindFilterChange: (fn) => (handlers.filter = fn),
  bindSortChange: (fn) => (handlers.sort = fn),
  bindDeleteStory: (fn) => (handlers.delete = fn),
  bindClearAll: (fn) => (handlers.clearAll = fn),
  bindSyncNow: (fn) => (handlers.sync = fn),
  bindDeleteOutbox: (fn) => (handlers.deleteOutbox = fn),
  showLoading() {},
  showError(m) { rendered = { error: m }; },
  showEmpty(m) { rendered = { empty: m }; },
  showSavedStories(stories) { rendered = stories.map((s) => s.id); },
  showOutbox() {},
  updateStats() {},
  setSyncButtonBusy() {},
  confirmAction: () => true,
};

const presenter = new SavedPresenter({ view: stubView, model: db });
await presenter.init();
check('Presenter: memuat 3 cerita tersimpan', Array.isArray(rendered) && rendered.length === 3, JSON.stringify(rendered));

handlers.sort('name-desc');
check('SORT: nama Z-A', JSON.stringify(rendered) === '["s3","s2","s1"]', JSON.stringify(rendered));
handlers.sort('name-asc');
check('SORT: nama A-Z', JSON.stringify(rendered) === '["s1","s2","s3"]', JSON.stringify(rendered));
handlers.sort('created-desc');
check('SORT: cerita terbaru', JSON.stringify(rendered) === '["s2","s3","s1"]', JSON.stringify(rendered));
handlers.sort('saved-desc');
check('SORT: terbaru disimpan', JSON.stringify(rendered) === '["s3","s2","s1"]', JSON.stringify(rendered));

handlers.search('bandung');
check('SEARCH: cocok pada deskripsi (case-insensitive)', JSON.stringify(rendered) === '["s1"]', JSON.stringify(rendered));
handlers.search('citra');
check('SEARCH: cocok pada nama penulis', JSON.stringify(rendered) === '["s3"]', JSON.stringify(rendered));
handlers.search('tidak-ada-kata-ini');
check('SEARCH: tanpa hasil menampilkan pesan kosong', Boolean(rendered.empty), JSON.stringify(rendered));
handlers.search('');

handlers.filter('without-location');
check('FILTER: hanya tanpa lokasi', JSON.stringify(rendered) === '["s2"]', JSON.stringify(rendered));
handlers.filter('with-location');
check('FILTER: hanya yang berlokasi', rendered.length === 2 && !rendered.includes('s2'), JSON.stringify(rendered));
handlers.filter('all');

handlers.search('jogja');
handlers.filter('without-location');
check('KOMBINASI: search + filter menghasilkan kosong', Boolean(rendered.empty), JSON.stringify(rendered));
handlers.search('');
handlers.filter('all');

await handlers.delete('s2');
check('DELETE via presenter: s2 hilang dari daftar & IndexedDB',
  !rendered.includes('s2') && (await db.getSavedStory('s2')) === null, JSON.stringify(rendered));

/* ================= Sinkronisasi offline -> online ================= */
const sync = await import('../src/scripts/utils/sync-manager.js');

globalThis.navigator.onLine = false;
const photo = new File([new Uint8Array(2048)], 'foto-offline.jpg', { type: 'image/jpeg' });
await sync.queueStoryForSync({ description: 'Cerita dibuat saat offline', photo, lat: -6.2, lon: 106.8 });
await sync.queueStoryForSync({ description: 'Cerita offline kedua', photo, lat: null, lon: null });

let queue = await db.getAllOutboxStories();
check('OFFLINE: 2 cerita masuk antrean outbox-stories', queue.length === 2, `n=${queue.length}`);
check('OFFLINE: foto tersimpan sebagai Blob di IndexedDB', queue[0].photo instanceof Blob, typeof queue[0].photo);
check('OFFLINE: status awal pending', queue.every((r) => r.status === 'pending'));

let result = await sync.syncOutboxStories({ silent: true });
check('OFFLINE: sinkronisasi dilewati selama masih offline',
  result.skipped === true && posted.length === 0, JSON.stringify(result));

globalThis.navigator.onLine = true;
result = await sync.syncOutboxStories({ silent: true });
check('ONLINE: kedua cerita terkirim ke API', result.synced === 2 && posted.length === 2, JSON.stringify(result));
check('ONLINE: memakai endpoint terautentikasi dengan Bearer token',
  posted[0].url.endsWith('/stories') && posted[0].auth === 'Bearer fake-token', JSON.stringify(posted[0]));
check('ONLINE: payload membawa deskripsi & foto yang benar',
  posted[0].description === 'Cerita dibuat saat offline' &&
  posted[0].photoName === 'foto-offline.jpg' &&
  posted[0].photoSize === 2048,
  JSON.stringify(posted[0]));
check('ONLINE: koordinat ikut terkirim', posted[0].lat === '-6.2' && posted[0].lon === '106.8', JSON.stringify(posted[0]));
check('ONLINE: cerita tanpa koordinat tidak mengirim lat/lon',
  posted[1].lat === null && posted[1].lon === null, JSON.stringify(posted[1]));
check('ONLINE: antrean IndexedDB dikosongkan setelah sukses',
  (await db.countOutboxStories()) === 0);

// Kegagalan pengiriman harus menyimpan status failed, bukan menghilangkan data
failNextPost = true;
await sync.queueStoryForSync({ description: 'Cerita yang gagal kirim', photo });
result = await sync.syncOutboxStories({ silent: true });
queue = await db.getAllOutboxStories();
check('GAGAL KIRIM: data tetap ada di antrean & ditandai failed',
  result.failed === 1 && queue.length === 1 && queue[0].status === 'failed', JSON.stringify(result));
check('GAGAL KIRIM: pesan galat dicatat pada record', Boolean(queue[0].lastError), queue[0].lastError);

// Percobaan ulang berhasil
result = await sync.syncOutboxStories({ silent: true });
check('RETRY: percobaan ulang berhasil dan antrean bersih',
  result.synced === 1 && (await db.countOutboxStories()) === 0, JSON.stringify(result));

await db.deleteOutboxStory(999);
check('DELETE outbox: id tidak dikenal tidak melempar galat', true);

console.log(log.join('\n'));
console.log(`\n${log.length - failures}/${log.length} pemeriksaan lolos.`);
process.exit(failures > 0 ? 1 : 0);
