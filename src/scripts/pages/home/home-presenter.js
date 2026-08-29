import { getAuthToken, isAuthenticated } from '../../utils/auth';
import { isOffline } from '../../utils/network-status';
import {
  getSavedStoryIds,
  getAllSavedStories,
  putSavedStory,
  deleteSavedStory,
} from '../../data/database';
import { showToast } from '../../utils/toast';
import { notifySavedChanged } from '../../utils/sync-manager';

export default class HomePresenter {
  #view;
  #model;
  #allStories = [];
  #searchQuery = '';
  #activeStoryId = null;
  #savedIds = new Set();
  #isOfflineSource = false;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    this.#setupEventListeners();
    this.#view.initMap(
      (storyId) => this.#handleMarkerClick(storyId),
      (storyId) => this.#handleFocusStoryInList(storyId)
    );

    const isAuth = isAuthenticated();
    if (!isAuth) {
      this.#view.showAuthBanner(true);
    } else {
      this.#view.showAuthBanner(false);
    }

    await this.fetchStories();
  }

  #setupEventListeners() {
    this.#view.bindSearchInput((query) => {
      this.#handleSearch(query);
    });

    this.#view.bindStoryCardClick((storyId, options) => {
      this.#handleStoryCardClick(storyId, options);
    });

    this.#view.bindSaveStoryClick((storyId, isSaved) => {
      this.#handleToggleSave(storyId, isSaved);
    });
  }

  async fetchStories() {
    this.#view.showLoading();
    await this.#loadSavedIds();

    try {
      const token = getAuthToken();
      const stories = await this.#model.getAllStories(token, { location: 1 });

      if (!stories || stories.length === 0) {
        this.#view.showEmpty('Belum ada cerita yang tersedia saat ini.');
        return;
      }

      this.#isOfflineSource = false;
      this.#view.hideOfflineNotice();
      this.#allStories = stories;
      this.#applyFiltersAndRender();
    } catch (error) {
      console.error('HomePresenter fetchStories error:', error);

      const hasFallback = await this.#renderSavedFallback();
      if (hasFallback) return;

      const isAuth = isAuthenticated();

      if (isOffline()) {
        this.#view.showError(
          'Anda sedang offline dan cerita ini belum pernah tersimpan di perangkat. Sambungkan kembali ke internet untuk memuat data terbaru.'
        );
        return;
      }

      if (!isAuth) {
        this.#view.showError(
          'Gagal memuat cerita. Anda perlu login terlebih dahulu untuk mengakses data cerita.'
        );
      } else {
        this.#view.showError(error.message || 'Gagal memuat daftar cerita. Silakan coba lagi nanti.');
      }
    }
  }

  async #loadSavedIds() {
    try {
      this.#savedIds = await getSavedStoryIds();
    } catch (error) {
      console.warn('Gagal membaca daftar cerita tersimpan:', error);
      this.#savedIds = new Set();
    }
  }

  async #renderSavedFallback() {
    try {
      const savedStories = await getAllSavedStories();
      if (savedStories.length === 0) return false;

      this.#isOfflineSource = true;
      this.#allStories = savedStories.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      this.#applyFiltersAndRender();
      this.#view.showOfflineNotice(
        `Menampilkan ${savedStories.length} cerita dari penyimpanan perangkat (IndexedDB) karena data terbaru tidak dapat dimuat.`
      );
      return true;
    } catch (fallbackError) {
      console.warn('Gagal memuat cerita tersimpan sebagai cadangan:', fallbackError);
      return false;
    }
  }

  async #handleToggleSave(storyId, isCurrentlySaved) {
    const story = this.#allStories.find((item) => item.id === storyId);
    if (!story) return;

    try {
      if (isCurrentlySaved) {
        await deleteSavedStory(storyId);
        this.#savedIds.delete(storyId);
        this.#view.updateSaveButtonState(storyId, false, story.name);
        showToast('Cerita dihapus dari penyimpanan perangkat.', 'info');

        if (this.#isOfflineSource) {
          this.#allStories = this.#allStories.filter((item) => item.id !== storyId);
          this.#applyFiltersAndRender();
        }
      } else {
        await putSavedStory(story);
        this.#savedIds.add(storyId);
        this.#view.updateSaveButtonState(storyId, true, story.name);
        showToast('Cerita disimpan dan dapat dibuka saat offline.', 'success');
      }

      notifySavedChanged();
    } catch (error) {
      console.error('Gagal memperbarui cerita tersimpan:', error);
      showToast('Gagal menyimpan cerita ke IndexedDB.', 'error');
    }
  }

  #applyFiltersAndRender() {
    let filtered = [...this.#allStories];

    // Keyword Search Filter
    if (this.#searchQuery.trim() !== '') {
      const query = this.#searchQuery.toLowerCase().trim();
      filtered = filtered.filter((s) => {
        const nameMatch = s.name ? s.name.toLowerCase().includes(query) : false;
        const descMatch = s.description ? s.description.toLowerCase().includes(query) : false;
        return nameMatch || descMatch;
      });
    }

    // Check empty results
    if (filtered.length === 0) {
      this.#view.showEmpty('Tidak ada cerita yang cocok dengan pencarian Anda.');
      this.#view.renderMarkers(
        [],
        null,
        (storyId) => this.#handleMarkerClick(storyId),
        (storyId) => this.#handleFocusStoryInList(storyId)
      );
      return;
    }

    // Render list & markers
    this.#view.showStories(filtered, this.#activeStoryId, this.#allStories.length, this.#savedIds);
    this.#view.renderMarkers(
      filtered,
      this.#activeStoryId,
      (storyId) => this.#handleMarkerClick(storyId),
      (storyId) => this.#handleFocusStoryInList(storyId)
    );
  }

  #handleSearch(query) {
    this.#searchQuery = query;
    this.#applyFiltersAndRender();
  }

  #handleStoryCardClick(storyId, { shouldScrollToMap = false } = {}) {
    this.#activeStoryId = storyId;

    const story = this.#allStories.find((s) => s.id === storyId);
    const hasLocation = story && typeof story.lat === 'number' && typeof story.lon === 'number' && !isNaN(story.lat);

    this.#view.highlightStoryCard(storyId, false);

    if (hasLocation) {
      this.#view.highlightMarker(storyId, { shouldFly: shouldScrollToMap });
      if (shouldScrollToMap) {
        this.#view.scrollToMap();
      }
    }
  }

  #handleMarkerClick(storyId) {
    this.#activeStoryId = storyId;
    this.#view.highlightMarker(storyId, { shouldFly: false });
    this.#view.highlightStoryCard(storyId, false);
  }

  #handleFocusStoryInList(storyId) {
    this.#activeStoryId = storyId;
    this.#view.highlightStoryCard(storyId, true);
  }
}
