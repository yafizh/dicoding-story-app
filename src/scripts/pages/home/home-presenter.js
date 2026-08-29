import { getAuthToken } from '../../utils/auth';

export default class HomePresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    await this.fetchStories();
  }

  async fetchStories() {
    this.#view.showLoading();

    try {
      const token = getAuthToken();
      const stories = await this.#model.getAllStories(token);

      if (!stories || stories.length === 0) {
        this.#view.showEmpty();
        return;
      }

      this.#view.showStories(stories);
    } catch (error) {
      this.#view.showError(error.message || 'Gagal memuat daftar cerita. Silakan coba lagi nanti.');
    }
  }
}
