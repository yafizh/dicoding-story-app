import * as api from '../data/api';
import {
  addOutboxStory,
  getAllOutboxStories,
  deleteOutboxStory,
  updateOutboxStory,
  countOutboxStories,
} from '../data/database';
import { getAuthToken } from './auth';
import { showToast } from './toast';

export const OUTBOX_CHANGED_EVENT = 'story-app:outbox-changed';
export const SAVED_CHANGED_EVENT = 'story-app:saved-changed';

let isSyncing = false;
let isInitialized = false;

export async function notifyOutboxChanged() {
  let pendingCount = 0;

  try {
    pendingCount = await countOutboxStories();
  } catch (error) {
    console.warn('Gagal menghitung antrean offline:', error);
  }

  document.dispatchEvent(
    new CustomEvent(OUTBOX_CHANGED_EVENT, { detail: { pendingCount } })
  );

  updateOutboxBadge(pendingCount);
  return pendingCount;
}

export function notifySavedChanged() {
  document.dispatchEvent(new CustomEvent(SAVED_CHANGED_EVENT));
}

export function updateOutboxBadge(pendingCount) {
  document.querySelectorAll('[data-outbox-badge]').forEach((badge) => {
    if (pendingCount > 0) {
      badge.textContent = pendingCount > 9 ? '9+' : String(pendingCount);
      badge.hidden = false;
      badge.setAttribute('aria-label', `${pendingCount} cerita menunggu sinkronisasi`);
    } else {
      badge.textContent = '';
      badge.hidden = true;
      badge.removeAttribute('aria-label');
    }
  });
}

export async function queueStoryForSync({ description, photo, lat, lon }) {
  const record = await addOutboxStory({ description, photo, lat, lon });
  await notifyOutboxChanged();
  return record;
}

function buildPhotoFile(record) {
  const blob = record.photo;
  const fileName = record.photoName || `story-${record.id}.jpg`;
  const fileType = record.photoType || blob?.type || 'image/jpeg';

  if (typeof File === 'function') {
    try {
      return new File([blob], fileName, { type: fileType });
    } catch (error) {
      console.warn('Gagal membentuk File dari antrean, memakai Blob:', error);
    }
  }

  return blob;
}

export async function syncOutboxStories({ silent = false } = {}) {
  if (isSyncing) {
    return { synced: 0, failed: 0, pending: await countOutboxStories(), skipped: true };
  }

  let queue = [];
  try {
    queue = await getAllOutboxStories();
  } catch (error) {
    console.warn('Gagal membaca antrean offline:', error);
    return { synced: 0, failed: 0, pending: 0, skipped: true };
  }

  if (queue.length === 0) {
    await notifyOutboxChanged();
    if (!silent) showToast('Tidak ada cerita offline yang perlu disinkronkan.', 'info');
    return { synced: 0, failed: 0, pending: 0 };
  }

  if (!navigator.onLine) {
    if (!silent) {
      showToast('Masih offline. Cerita akan dikirim otomatis saat koneksi kembali.', 'info');
    }
    return { synced: 0, failed: 0, pending: queue.length, skipped: true };
  }

  isSyncing = true;
  document.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT, { detail: { syncing: true } }));

  let synced = 0;
  let failed = 0;

  try {
    const token = getAuthToken();

    for (const record of queue) {
      try {
        await api.addStory(
          {
            description: record.description,
            photo: buildPhotoFile(record),
            lat: record.lat,
            lon: record.lon,
          },
          token
        );

        await deleteOutboxStory(record.id);
        synced += 1;
      } catch (error) {
        console.error('Gagal menyinkronkan cerita offline:', error);
        failed += 1;

        try {
          await updateOutboxStory({
            ...record,
            status: 'failed',
            attempts: (record.attempts || 0) + 1,
            lastError: error?.message || 'Gagal mengirim cerita.',
          });
        } catch (updateError) {
          console.warn('Gagal memperbarui status antrean:', updateError);
        }

        if (!navigator.onLine) break;
      }
    }
  } finally {
    isSyncing = false;
  }

  const pending = await notifyOutboxChanged();

  if (synced > 0) {
    showToast(`${synced} cerita offline berhasil disinkronkan ke server.`, 'success');
  }

  if (failed > 0 && !silent) {
    showToast(`${failed} cerita gagal disinkronkan. Silakan coba lagi.`, 'error');
  }

  return { synced, failed, pending };
}

export function initOutboxSync() {
  if (isInitialized) return;
  isInitialized = true;

  window.addEventListener('online', () => {
    setTimeout(() => syncOutboxStories({ silent: true }), 1200);
  });

  notifyOutboxChanged().then((pendingCount) => {
    if (pendingCount > 0 && navigator.onLine) {
      syncOutboxStories({ silent: true });
    }
  });
}

export function isSyncInProgress() {
  return isSyncing;
}
