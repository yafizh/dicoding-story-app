import { showToast } from '../../utils/toast';
import {
  OUTBOX_CHANGED_EVENT,
  SAVED_CHANGED_EVENT,
  syncOutboxStories,
  notifyOutboxChanged,
} from '../../utils/sync-manager';

export default class SavedPresenter {
  #view;
  #model;
  #savedStories = [];
  #outboxStories = [];
  #searchQuery = '';
  #locationFilter = 'all';
  #sortBy = 'saved-desc';
  #onExternalChange = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    this.#bindViewEvents();
    this.#listenExternalChanges();

    await this.loadSavedStories();
    await this.loadOutbox();
  }

  #bindViewEvents() {
    this.#view.bindSearch((query) => {
      this.#searchQuery = query;
      this.#renderSavedList();
    });

    this.#view.bindFilterChange((value) => {
      this.#locationFilter = value;
      this.#renderSavedList();
    });

    this.#view.bindSortChange((value) => {
      this.#sortBy = value;
      this.#renderSavedList();
    });

    this.#view.bindDeleteStory((storyId) => this.#handleDeleteStory(storyId));
    this.#view.bindClearAll(() => this.#handleClearAll());
    this.#view.bindSyncNow(() => this.#handleSyncNow());
    this.#view.bindDeleteOutbox((outboxId) => this.#handleDeleteOutbox(outboxId));
  }

  #listenExternalChanges() {
    this.#onExternalChange = () => {
      this.loadOutbox();
    };

    document.addEventListener(OUTBOX_CHANGED_EVENT, this.#onExternalChange);
    document.addEventListener(SAVED_CHANGED_EVENT, this.#onExternalChange);
  }

  async loadSavedStories() {
    this.#view.showLoading();

    try {
      this.#savedStories = await this.#model.getAllSavedStories();
      this.#renderSavedList();
    } catch (error) {
      console.error('SavedPresenter loadSavedStories error:', error);
      this.#view.showError(
        'Gagal membaca cerita tersimpan dari IndexedDB. Pastikan browser Anda mengizinkan penyimpanan data situs.'
      );
    }
  }

  async loadOutbox() {
    try {
      this.#outboxStories = await this.#model.getAllOutboxStories();
      this.#view.showOutbox(this.#outboxStories);
      this.#updateStats();
    } catch (error) {
      console.error('SavedPresenter loadOutbox error:', error);
    }
  }

  #updateStats() {
    this.#view.updateStats({
      savedCount: this.#savedStories.length,
      pendingCount: this.#outboxStories.length,
    });
  }

  #getVisibleStories() {
    let result = [...this.#savedStories];

    const query = this.#searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((story) => {
        const name = (story.name || '').toLowerCase();
        const description = (story.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    if (this.#locationFilter === 'with-location') {
      result = result.filter((story) => typeof story.lat === 'number' && typeof story.lon === 'number');
    } else if (this.#locationFilter === 'without-location') {
      result = result.filter((story) => typeof story.lat !== 'number' || typeof story.lon !== 'number');
    }

    const toTime = (value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    switch (this.#sortBy) {
      case 'saved-asc':
        result.sort((a, b) => toTime(a.savedAt) - toTime(b.savedAt));
        break;
      case 'created-desc':
        result.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
        break;
      case 'created-asc':
        result.sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
        break;
      case 'name-asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'));
        break;
      case 'name-desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'id'));
        break;
      case 'saved-desc':
      default:
        result.sort((a, b) => toTime(b.savedAt) - toTime(a.savedAt));
        break;
    }

    return result;
  }

  #renderSavedList() {
    this.#updateStats();

    if (this.#savedStories.length === 0) {
      this.#view.showEmpty(
        'Tekan tombol "Simpan" pada kartu cerita di beranda atau halaman detail untuk menyimpannya ke perangkat Anda.'
      );
      return;
    }

    const visibleStories = this.#getVisibleStories();

    if (visibleStories.length === 0) {
      this.#view.showEmpty('Tidak ada cerita tersimpan yang cocok dengan pencarian atau filter Anda.');
      return;
    }

    this.#view.showSavedStories(visibleStories, this.#savedStories.length);
  }

  async #handleDeleteStory(storyId) {
    if (!storyId) return;

    const story = this.#savedStories.find((item) => item.id === storyId);
    const confirmed = this.#view.confirmAction(
      `Hapus cerita${story ? ` oleh ${story.name}` : ''} dari penyimpanan perangkat?`
    );
    if (!confirmed) return;

    try {
      await this.#model.deleteSavedStory(storyId);
      this.#savedStories = this.#savedStories.filter((item) => item.id !== storyId);
      this.#renderSavedList();
      showToast('Cerita dihapus dari penyimpanan perangkat.', 'success');
    } catch (error) {
      console.error('Gagal menghapus cerita tersimpan:', error);
      showToast('Gagal menghapus cerita dari IndexedDB.', 'error');
    }
  }

  async #handleClearAll() {
    if (this.#savedStories.length === 0) {
      showToast('Belum ada cerita tersimpan yang bisa dihapus.', 'info');
      return;
    }

    const confirmed = this.#view.confirmAction(
      `Hapus seluruh ${this.#savedStories.length} cerita tersimpan dari perangkat ini?`
    );
    if (!confirmed) return;

    try {
      await this.#model.clearSavedStories();
      this.#savedStories = [];
      this.#renderSavedList();
      showToast('Seluruh cerita tersimpan telah dihapus.', 'success');
    } catch (error) {
      console.error('Gagal mengosongkan cerita tersimpan:', error);
      showToast('Gagal menghapus data dari IndexedDB.', 'error');
    }
  }

  async #handleDeleteOutbox(outboxId) {
    if (outboxId === null || outboxId === undefined) return;

    const confirmed = this.#view.confirmAction(
      'Batalkan pengiriman cerita ini? Data yang sudah dibuat akan hilang.'
    );
    if (!confirmed) return;

    try {
      await this.#model.deleteOutboxStory(outboxId);
      await notifyOutboxChanged();
      await this.loadOutbox();
      showToast('Cerita dihapus dari antrean offline.', 'success');
    } catch (error) {
      console.error('Gagal menghapus antrean offline:', error);
      showToast('Gagal menghapus antrean offline.', 'error');
    }
  }

  async #handleSyncNow() {
    if (this.#outboxStories.length === 0) {
      showToast('Tidak ada cerita offline yang perlu disinkronkan.', 'info');
      return;
    }

    this.#view.setSyncButtonBusy(true);

    try {
      await syncOutboxStories();
    } catch (error) {
      console.error('Gagal menyinkronkan antrean offline:', error);
      showToast('Terjadi kesalahan saat sinkronisasi.', 'error');
    } finally {
      this.#view.setSyncButtonBusy(false);
      await this.loadOutbox();
    }
  }

  destroy() {
    if (this.#onExternalChange) {
      document.removeEventListener(OUTBOX_CHANGED_EVENT, this.#onExternalChange);
      document.removeEventListener(SAVED_CHANGED_EVENT, this.#onExternalChange);
      this.#onExternalChange = null;
    }
  }
}
