const DATABASE_NAME = 'story-app-database';
const DATABASE_VERSION = 1;

export const SAVED_STORE = 'saved-stories';
export const OUTBOX_STORE = 'outbox-stories';

let databasePromise = null;

export function isIndexedDbSupported() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      reject(new Error('IndexedDB tidak didukung oleh browser ini.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(SAVED_STORE)) {
        const savedStore = database.createObjectStore(SAVED_STORE, { keyPath: 'id' });
        savedStore.createIndex('savedAt', 'savedAt', { unique: false });
        savedStore.createIndex('name', 'name', { unique: false });
      }

      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outboxStore = database.createObjectStore(OUTBOX_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        outboxStore.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };

    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error('Gagal membuka basis data IndexedDB.'));
    };

    request.onblocked = () => {
      console.warn('[IDB] Pembukaan basis data tertunda oleh tab lain.');
    };
  });

  return databasePromise;
}

async function runTransaction(storeName, mode, executor) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let result;
    let settled = false;

    try {
      const request = executor(store);

      if (request && typeof request === 'object' && 'onsuccess' in request) {
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => {
          settled = true;
          reject(request.error || new Error('Operasi IndexedDB gagal.'));
        };
      } else {
        result = request;
      }
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      if (!settled) resolve(result);
    };

    transaction.onerror = () => {
      if (!settled) reject(transaction.error || new Error('Transaksi IndexedDB gagal.'));
    };

    transaction.onabort = () => {
      if (!settled) reject(transaction.error || new Error('Transaksi IndexedDB dibatalkan.'));
    };
  });
}

function normalizeCoordinate(value) {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : null;
}

export async function putSavedStory(story) {
  if (!story || !story.id) {
    throw new Error('Cerita tidak valid untuk disimpan.');
  }

  const record = {
    id: story.id,
    name: story.name || 'Anonim',
    description: story.description || '',
    photoUrl: story.photoUrl || '',
    createdAt: story.createdAt || new Date().toISOString(),
    lat: normalizeCoordinate(story.lat),
    lon: normalizeCoordinate(story.lon),
    savedAt: new Date().toISOString(),
  };

  await runTransaction(SAVED_STORE, 'readwrite', (store) => store.put(record));
  return record;
}

export async function getAllSavedStories() {
  const stories = await runTransaction(SAVED_STORE, 'readonly', (store) => store.getAll());
  return Array.isArray(stories) ? stories : [];
}

export async function getSavedStory(id) {
  if (!id) return null;
  const story = await runTransaction(SAVED_STORE, 'readonly', (store) => store.get(id));
  return story || null;
}

export async function getSavedStoryIds() {
  const keys = await runTransaction(SAVED_STORE, 'readonly', (store) => store.getAllKeys());
  return new Set(Array.isArray(keys) ? keys : []);
}

export async function isStorySaved(id) {
  return Boolean(await getSavedStory(id));
}

export async function deleteSavedStory(id) {
  if (!id) return false;
  await runTransaction(SAVED_STORE, 'readwrite', (store) => store.delete(id));
  return true;
}

export async function clearSavedStories() {
  await runTransaction(SAVED_STORE, 'readwrite', (store) => store.clear());
  return true;
}

export async function countSavedStories() {
  const total = await runTransaction(SAVED_STORE, 'readonly', (store) => store.count());
  return total || 0;
}

export async function addOutboxStory({ description, photo, lat, lon }) {
  if (!photo) {
    throw new Error('Foto cerita wajib disertakan.');
  }

  const record = {
    description: description || '',
    photo,
    photoName: photo.name || `story-${Date.now()}.jpg`,
    photoType: photo.type || 'image/jpeg',
    photoSize: photo.size || 0,
    lat: normalizeCoordinate(lat),
    lon: normalizeCoordinate(lon),
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
    lastError: null,
  };

  const id = await runTransaction(OUTBOX_STORE, 'readwrite', (store) => store.add(record));
  return { ...record, id };
}

export async function getAllOutboxStories() {
  const records = await runTransaction(OUTBOX_STORE, 'readonly', (store) => store.getAll());
  const list = Array.isArray(records) ? records : [];
  return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function getOutboxStory(id) {
  if (id === undefined || id === null) return null;
  const record = await runTransaction(OUTBOX_STORE, 'readonly', (store) => store.get(Number(id)));
  return record || null;
}

export async function updateOutboxStory(record) {
  if (!record || record.id === undefined) {
    throw new Error('Data antrean tidak valid.');
  }
  await runTransaction(OUTBOX_STORE, 'readwrite', (store) => store.put(record));
  return record;
}

export async function deleteOutboxStory(id) {
  if (id === undefined || id === null) return false;
  await runTransaction(OUTBOX_STORE, 'readwrite', (store) => store.delete(Number(id)));
  return true;
}

export async function countOutboxStories() {
  const total = await runTransaction(OUTBOX_STORE, 'readonly', (store) => store.count());
  return total || 0;
}
