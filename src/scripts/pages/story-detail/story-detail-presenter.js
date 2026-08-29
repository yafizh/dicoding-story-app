import { getAuthToken } from '../../utils/auth';
import { sendStoryContextToServiceWorker } from '../../utils/notification-helper';
import { isOffline } from '../../utils/network-status';
import { getSavedStory, putSavedStory, deleteSavedStory } from '../../data/database';
import { showToast } from '../../utils/toast';
import { notifySavedChanged } from '../../utils/sync-manager';

export default class StoryDetailPresenter {
  #view;
  #model;
  #story = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init(storyId) {
    if (!storyId) {
      this.#view.showError('ID cerita tidak ditemukan pada alamat halaman.');
      return;
    }

    this.#view.showLoading();

    const savedStory = await this.#readSavedStory(storyId);

    try {
      const token = getAuthToken();
      const story = await this.#model.getStoryDetail(storyId, token);

      if (!story) {
        this.#view.showError('Cerita yang Anda cari tidak ditemukan.');
        return;
      }

      this.#renderStory(story, Boolean(savedStory));

      sendStoryContextToServiceWorker(story);
    } catch (error) {
      console.error('StoryDetailPresenter init error:', error);

      if (savedStory) {
        this.#renderStory(savedStory, true);
        this.#view.showOfflineNotice(
          'Cerita ini ditampilkan dari penyimpanan perangkat (IndexedDB) karena data terbaru tidak dapat dimuat.'
        );
        return;
      }

      if (isOffline()) {
        this.#view.showError(
          'Anda sedang offline dan detail cerita ini belum tersimpan di perangkat. Sambungkan kembali ke internet lalu coba lagi.'
        );
        return;
      }

      const token = getAuthToken();
      this.#view.showError(
        token
          ? error.message || 'Gagal memuat detail cerita. Silakan coba lagi nanti.'
          : 'Anda perlu masuk terlebih dahulu untuk melihat detail cerita.'
      );
    }
  }

  #renderStory(story, isSaved) {
    this.#story = story;
    this.#view.showStory(story, { isSaved });
    this.#view.bindSaveClick((currentlySaved) => this.#handleToggleSave(currentlySaved));
  }

  async #readSavedStory(storyId) {
    try {
      return await getSavedStory(storyId);
    } catch (error) {
      console.warn('Gagal membaca cerita tersimpan:', error);
      return null;
    }
  }

  async #handleToggleSave(isCurrentlySaved) {
    if (!this.#story) return;

    try {
      if (isCurrentlySaved) {
        await deleteSavedStory(this.#story.id);
        this.#view.updateSaveState(false);
        showToast('Cerita dihapus dari penyimpanan perangkat.', 'info');
      } else {
        await putSavedStory(this.#story);
        this.#view.updateSaveState(true);
        showToast('Cerita disimpan dan dapat dibuka saat offline.', 'success');
      }

      notifySavedChanged();
    } catch (error) {
      console.error('Gagal memperbarui cerita tersimpan:', error);
      showToast('Gagal menyimpan cerita ke IndexedDB.', 'error');
    }
  }
}
