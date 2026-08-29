import { getAuthToken } from '../../utils/auth';
import { sendStoryContextToServiceWorker } from '../../utils/notification-helper';

export default class StoryDetailPresenter {
  #view;
  #model;

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

    try {
      const token = getAuthToken();
      const story = await this.#model.getStoryDetail(storyId, token);

      if (!story) {
        this.#view.showError('Cerita yang Anda cari tidak ditemukan.');
        return;
      }

      this.#view.showStory(story);

      // Perbarui konteks service worker supaya notifikasi berikutnya
      // dapat menampilkan data cerita ini secara dinamis.
      sendStoryContextToServiceWorker(story);
    } catch (error) {
      console.error('StoryDetailPresenter init error:', error);
      const token = getAuthToken();
      this.#view.showError(
        token
          ? error.message || 'Gagal memuat detail cerita. Silakan coba lagi nanti.'
          : 'Anda perlu masuk terlebih dahulu untuk melihat detail cerita.'
      );
    }
  }
}
