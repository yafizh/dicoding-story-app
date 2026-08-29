import { getAuthToken, isAuthenticated } from '../../utils/auth';

export default class HomePresenter {
  #view;
  #model;
  #allStories = [];
  #searchQuery = '';
  #activeStoryId = null;

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
  }

  async fetchStories() {
    this.#view.showLoading();

    try {
      const token = getAuthToken();
      const stories = await this.#model.getAllStories(token, { location: 1 });

      if (!stories || stories.length === 0) {
        this.#view.showEmpty('Belum ada cerita yang tersedia saat ini.');
        return;
      }

      this.#allStories = stories;
      this.#applyFiltersAndRender();
    } catch (error) {
      console.error('HomePresenter fetchStories error:', error);
      const isAuth = isAuthenticated();
      if (!isAuth) {
        this.#view.showError(
          'Gagal memuat cerita. Anda perlu login terlebih dahulu untuk mengakses data cerita.'
        );
      } else {
        this.#view.showError(error.message || 'Gagal memuat daftar cerita. Silakan coba lagi nanti.');
      }
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
    this.#view.showStories(filtered, this.#activeStoryId, this.#allStories.length);
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
