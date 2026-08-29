import L from 'leaflet';
import { showFormattedDate } from '../../utils';

export default class StoryDetailView {
  #map = null;
  #marker = null;

  getTemplate() {
    return `
      <section class="container story-detail-section" aria-labelledby="story-detail-title">
        <a href="#/" class="back-link" aria-label="Kembali ke Beranda">Kembali ke Beranda</a>

        <h1 id="story-detail-title" class="visually-hidden">Detail Cerita</h1>

        <div id="detail-loading" class="loading-container" role="status" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <p>Memuat detail cerita...</p>
        </div>

        <div id="detail-error" class="error-container" style="display: none;" role="alert"></div>

        <article id="detail-content" class="story-detail-card" style="display: none;"></article>
      </section>
    `;
  }

  showLoading() {
    const loadingEl = document.querySelector('#detail-loading');
    const errorEl = document.querySelector('#detail-error');
    const contentEl = document.querySelector('#detail-content');

    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) errorEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
  }

  showError(message) {
    const loadingEl = document.querySelector('#detail-loading');
    const errorEl = document.querySelector('#detail-error');
    const contentEl = document.querySelector('#detail-content');

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';

    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.innerHTML = `
        <div class="error-box">
          <p class="error-message">${message || 'Terjadi kesalahan saat memuat detail cerita.'}</p>
          <a href="#/" class="btn-primary">Kembali ke Beranda</a>
        </div>
      `;
    }
  }

  showStory(story, { isSaved = false } = {}) {
    const loadingEl = document.querySelector('#detail-loading');
    const errorEl = document.querySelector('#detail-error');
    const contentEl = document.querySelector('#detail-content');

    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (!contentEl) return;

    const formattedDate = story.createdAt ? showFormattedDate(story.createdAt, 'id-ID') : '';
    const hasLocation =
      typeof story.lat === 'number' &&
      typeof story.lon === 'number' &&
      !isNaN(story.lat) &&
      !isNaN(story.lon);

    contentEl.style.display = 'block';
    contentEl.setAttribute('aria-label', `Detail cerita oleh ${story.name}`);
    contentEl.innerHTML = `
      <figure class="detail-image-wrapper">
        <img
          src="${story.photoUrl}"
          alt="Foto dokumentasi cerita oleh ${story.name}"
          class="detail-image"
          onerror="this.onerror=null;this.src='https://placehold.co/900x600?text=Gambar+Tidak+Tersedia';"
        />
        <figcaption class="visually-hidden">Foto cerita oleh ${story.name}</figcaption>
      </figure>

      <div class="detail-body">
        <header class="detail-header">
          <div class="detail-header-text">
            <h2 class="detail-author">${story.name}</h2>
            ${formattedDate ? `<time class="detail-date" datetime="${story.createdAt}">${formattedDate}</time>` : ''}
          </div>
          <button
            type="button"
            id="detail-save-button"
            class="btn-save-story btn-save-story--detail ${isSaved ? 'is-saved' : ''}"
            aria-pressed="${isSaved ? 'true' : 'false'}"
            aria-label="${isSaved ? 'Hapus cerita ini dari penyimpanan perangkat' : 'Simpan cerita ini ke perangkat'}"
          >
            <span class="save-icon" aria-hidden="true">${isSaved ? '&#9733;' : '&#9734;'}</span>
            <span class="save-label">${isSaved ? 'Tersimpan' : 'Simpan Cerita'}</span>
          </button>
        </header>

        <p class="detail-description">${story.description || 'Tidak ada deskripsi.'}</p>

        ${
          hasLocation
            ? `
              <section class="detail-location" aria-labelledby="detail-location-title">
                <h3 id="detail-location-title" class="detail-section-title">Lokasi Cerita</h3>
                <p class="detail-coords">Lat: ${story.lat.toFixed(5)}, Lon: ${story.lon.toFixed(5)}</p>
                <div id="detail-map" class="detail-map" role="region" aria-label="Peta lokasi cerita oleh ${story.name}"></div>
              </section>
            `
            : `<p class="detail-coords muted-text">Cerita ini tidak mencantumkan koordinat lokasi.</p>`
        }
      </div>
    `;

    if (hasLocation) {
      this.renderMap(story);
    }
  }

  renderMap(story) {
    const mapContainer = document.querySelector('#detail-map');
    if (!mapContainer) return;

    this.destroy();

    this.#map = L.map(mapContainer, {
      center: [story.lat, story.lon],
      zoom: 13,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#marker = L.marker([story.lat, story.lon], { title: story.name }).addTo(this.#map);
    this.#marker.bindPopup(`<strong>${story.name}</strong>`);

    setTimeout(() => {
      if (this.#map) this.#map.invalidateSize();
    }, 250);
  }

  bindSaveClick(handler) {
    const button = document.querySelector('#detail-save-button');
    if (!button) return;

    button.addEventListener('click', () => {
      handler(button.getAttribute('aria-pressed') === 'true');
    });
  }

  updateSaveState(isSaved) {
    const button = document.querySelector('#detail-save-button');
    if (!button) return;

    button.classList.toggle('is-saved', isSaved);
    button.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    button.setAttribute(
      'aria-label',
      isSaved ? 'Hapus cerita ini dari penyimpanan perangkat' : 'Simpan cerita ini ke perangkat'
    );

    const icon = button.querySelector('.save-icon');
    const label = button.querySelector('.save-label');
    if (icon) icon.innerHTML = isSaved ? '&#9733;' : '&#9734;';
    if (label) label.textContent = isSaved ? 'Tersimpan' : 'Simpan Cerita';
  }

  showOfflineNotice(message) {
    const contentEl = document.querySelector('#detail-content');
    if (!contentEl) return;

    const notice = document.createElement('p');
    notice.className = 'offline-source-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    contentEl.prepend(notice);
  }

  destroy() {
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#marker = null;
    }
  }
}
