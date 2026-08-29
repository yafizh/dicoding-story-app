import { showFormattedDate } from '../../utils';

export default class HomeView {
  getTemplate() {
    return `
      <section class="container hero-section">
        <div class="hero-content">
          <h1 class="hero-title">Jelajahi Cerita Menarik</h1>
          <p class="hero-description">Temukan berbagai momen dan kisah inspiratif dari seluruh penjuru dunia yang dibagikan oleh komunitas.</p>
        </div>
      </section>

      <section class="container stories-section">
        <div class="section-header">
          <h2 class="section-title">Daftar Cerita Terbaru</h2>
        </div>

        <div id="stories-loading" class="loading-container" aria-live="polite">
          <div class="spinner"></div>
          <p>Memuat cerita...</p>
        </div>

        <div id="stories-error" class="error-container" style="display: none;" role="alert"></div>

        <div id="stories-empty" class="empty-container" style="display: none;">
          <p>Belum ada cerita yang tersedia saat ini.</p>
        </div>

        <div id="stories-list" class="stories-grid" style="display: none;"></div>
      </section>
    `;
  }

  getLoadingElement() {
    return document.querySelector('#stories-loading');
  }

  getErrorElement() {
    return document.querySelector('#stories-error');
  }

  getEmptyElement() {
    return document.querySelector('#stories-empty');
  }

  getStoriesListElement() {
    return document.querySelector('#stories-list');
  }

  showLoading() {
    const loadingEl = this.getLoadingElement();
    const errorEl = this.getErrorElement();
    const emptyEl = this.getEmptyElement();
    const listEl = this.getStoriesListElement();

    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) errorEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';
  }

  showError(message) {
    const loadingEl = this.getLoadingElement();
    const errorEl = this.getErrorElement();
    const emptyEl = this.getEmptyElement();
    const listEl = this.getStoriesListElement();

    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';

    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.innerHTML = `
        <div class="error-box">
          <p class="error-message">${message || 'Terjadi kesalahan saat memuat data.'}</p>
        </div>
      `;
    }
  }

  showEmpty() {
    const loadingEl = this.getLoadingElement();
    const errorEl = this.getErrorElement();
    const emptyEl = this.getEmptyElement();
    const listEl = this.getStoriesListElement();

    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';

    if (emptyEl) {
      emptyEl.style.display = 'block';
    }
  }

  showStories(stories) {
    const loadingEl = this.getLoadingElement();
    const errorEl = this.getErrorElement();
    const emptyEl = this.getEmptyElement();
    const listEl = this.getStoriesListElement();

    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    if (listEl) {
      listEl.style.display = 'grid';
      listEl.innerHTML = stories
        .map((story) => this._renderStoryItem(story))
        .join('');
    }
  }

  _renderStoryItem(story) {
    const formattedDate = story.createdAt ? showFormattedDate(story.createdAt, 'id-ID') : '';

    return `
      <article class="story-card" tabindex="0">
        <div class="story-image-container">
          <img 
            src="${story.photoUrl}" 
            alt="Foto oleh ${story.name}" 
            class="story-image"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=Gambar+Tidak+Tersedia';"
          />
        </div>
        <div class="story-body">
          <div class="story-header">
            <h3 class="story-author">${story.name}</h3>
            ${formattedDate ? `<time class="story-date">${formattedDate}</time>` : ''}
          </div>
          <p class="story-description">${story.description}</p>
        </div>
      </article>
    `;
  }
}
