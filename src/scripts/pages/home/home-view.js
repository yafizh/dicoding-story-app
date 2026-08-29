import L from 'leaflet';
import { showFormattedDate } from '../../utils';

export default class HomeView {
  #map = null;
  #markersGroup = null;
  #markersMap = new Map();
  #activeMarkerId = null;

  getTemplate() {
    return `
      <section class="container hero-section" aria-labelledby="hero-title">
        <div class="hero-content">
          <h1 id="hero-title" class="hero-title">Jelajahi Cerita Menarik & Peta Lokasi</h1>
          <p class="hero-description">
            Temukan kisah inspiratif dari berbagai penjuru dengan visualisasi peta interaktif dan sinkronisasi data real-time.
          </p>
          <div class="hero-actions">
            <a href="#/add-story" class="btn-primary hero-btn" aria-label="Tambah Cerita Baru">
              <span>Tambah Cerita Baru</span>
            </a>
          </div>
        </div>
      </section>

      <!-- Map Visualization Section -->
      <section class="container map-section" aria-labelledby="map-heading">
        <header class="section-header map-header">
          <div class="header-titles">
            <h2 id="map-heading" class="section-title">Visualisasi Peta Cerita</h2>
            <p class="section-subtitle">Jelajahi lokasi tempat cerita dibagikan oleh pengguna</p>
          </div>
          <div class="map-stats-badge" id="map-stats" role="status" aria-live="polite">
            <span class="pulse-indicator" aria-hidden="true"></span>
            <span id="map-stats-text">Memuat lokasi peta...</span>
          </div>
        </header>

        <div class="map-card">
          <div id="story-map" class="story-map" role="region" aria-label="Peta Interaktif Lokasi Cerita"></div>
          <div class="map-legend" role="note" aria-label="Keterangan Simbol Peta">
            <div class="legend-item">
              <span class="legend-dot default-dot" aria-hidden="true"></span>
              <span>Lokasi Cerita</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot active-dot" aria-hidden="true"></span>
              <span>Marker Terpilih</span>
            </div>
            <div class="legend-item legend-tip">
              <small>Gunakan kontrol layer di kanan atas peta untuk berganti tampilan tile layer.</small>
            </div>
          </div>
        </div>
      </section>

      <!-- Stories & Filter Section -->
      <section class="container stories-section" aria-labelledby="stories-heading">
        <div class="filter-toolbar">
          <header class="filter-header">
            <h2 id="stories-heading" class="section-title">Daftar Cerita</h2>
            <span class="stories-counter" id="stories-counter" role="status" aria-live="polite">Menampilkan cerita</span>
          </header>

          <div class="filter-controls">
            <!-- Search Input with Accessible Label -->
            <div class="search-box">
              <label for="search-input" class="visually-hidden">Cari cerita berdasarkan nama pengguna atau deskripsi cerita</label>
              <input 
                type="search" 
                id="search-input" 
                name="search"
                class="search-input" 
                placeholder="Cari cerita berdasarkan nama atau deskripsi..." 
                aria-label="Cari cerita berdasarkan nama atau deskripsi"
              />
            </div>
          </div>
        </div>

        <!-- Auth Banner if not logged in -->
        <aside id="auth-banner" class="auth-banner" style="display: none;" aria-label="Pemberitahuan Masuk">
          <div class="auth-banner-content">
            <div>
              <h3>Masuk untuk Akses Cerita Lengkap</h3>
              <p>Beberapa data cerita mungkin memerlukan login akun. Masuk sekarang untuk pengalaman terbaik.</p>
            </div>
          </div>
          <a href="#/login" class="btn-primary" aria-label="Masuk Sekarang ke Akun Anda">Masuk Sekarang</a>
        </aside>

        <!-- Loading State -->
        <div id="stories-loading" class="loading-container" aria-live="polite" role="status">
          <div class="spinner" aria-hidden="true"></div>
          <p>Memuat data cerita dan peta...</p>
        </div>

        <!-- Error State -->
        <div id="stories-error" class="error-container" style="display: none;" role="alert"></div>

        <!-- Empty State -->
        <div id="stories-empty" class="empty-container" style="display: none;" role="status">
          <h3>Tidak Ada Cerita Ditemukan</h3>
          <p id="empty-message">Belum ada cerita yang sesuai dengan filter pencarian Anda.</p>
        </div>

        <!-- Stories Grid -->
        <div id="stories-list" class="stories-grid" style="display: none;" role="feed" aria-label="Daftar Cerita Pengguna"></div>
      </section>
    `;
  }

  // --- Element Getters ---
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

  getAuthBannerElement() {
    return document.querySelector('#auth-banner');
  }

  getMapStatsElement() {
    return document.querySelector('#map-stats-text');
  }

  getStoriesCounterElement() {
    return document.querySelector('#stories-counter');
  }

  getSearchInputElement() {
    return document.querySelector('#search-input');
  }

  // --- State Display Methods ---
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

  showEmpty(message = 'Belum ada cerita yang tersedia.') {
    const loadingEl = this.getLoadingElement();
    const errorEl = this.getErrorElement();
    const emptyEl = this.getEmptyElement();
    const listEl = this.getStoriesListElement();
    const emptyMsgEl = document.querySelector('#empty-message');

    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';

    if (emptyMsgEl) emptyMsgEl.textContent = message;
    if (emptyEl) emptyEl.style.display = 'block';
  }

  showAuthBanner(show = true) {
    const bannerEl = this.getAuthBannerElement();
    if (bannerEl) {
      bannerEl.style.display = show ? 'flex' : 'none';
    }
  }

  // --- Leaflet Map Management ---
  initMap(onMarkerClick) {
    const mapContainer = document.querySelector('#story-map');
    if (!mapContainer) return;

    // Destroy existing instance if any
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#markersMap.clear();
      this.#activeMarkerId = null;
    }

    // Default center on Indonesia
    const defaultCenter = [-2.548926, 118.0148634];
    const defaultZoom = 5;

    this.#map = L.map(mapContainer, {
      center: defaultCenter,
      zoom: defaultZoom,
      scrollWheelZoom: true,
    });

    // OpenStreetMap Layer
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    // CartoDB Positron (Light)
    const cartoPositronLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    });

    // CartoDB Dark Matter (Dark Mode)
    const cartoDarkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    });

    // Esri World Imagery (Satelit)
    const esriSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
    });

    // Add default tile layer
    osmLayer.addTo(this.#map);

    // Layer Control with multiple tile layer options (Requirement 6)
    const baseMaps = {
      'OpenStreetMap': osmLayer,
      'CartoDB Positron (Terang)': cartoPositronLayer,
      'CartoDB Dark (Gelap)': cartoDarkLayer,
      'Esri Satelit': esriSatelliteLayer,
    };

    L.control.layers(baseMaps, null, { position: 'topright', collapsed: false }).addTo(this.#map);

    // Layer group for story markers
    this.#markersGroup = L.featureGroup().addTo(this.#map);

    // Ensure map tiles render properly when container sizes
    setTimeout(() => {
      if (this.#map) {
        this.#map.invalidateSize();
      }
    }, 250);
  }

  #createCustomIcon(isActive = false) {
    if (isActive) {
      return L.divIcon({
        className: 'custom-map-marker active-marker',
        html: `
          <div class="marker-wrapper active-pin-wrapper">
            <div class="marker-pulse-ring"></div>
            <div class="marker-pin active-pin">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/>
                <circle cx="12" cy="9" r="2.8" fill="#ffffff"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 44],
        popupAnchor: [0, -42],
      });
    }

    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="marker-wrapper">
          <div class="marker-pin default-pin">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/>
              <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 36],
      popupAnchor: [0, -34],
    });
  }

  renderMarkers(stories, activeStoryId, onMarkerClick, onFocusCard) {
    if (!this.#map || !this.#markersGroup) return;

    this.#markersGroup.clearLayers();
    this.#markersMap.clear();

    const storiesWithLocation = stories.filter(
      (s) => typeof s.lat === 'number' && typeof s.lon === 'number' && !isNaN(s.lat) && !isNaN(s.lon)
    );

    const statsEl = this.getMapStatsElement();
    if (statsEl) {
      statsEl.textContent = `${storiesWithLocation.length} Cerita di Peta`;
    }

    if (storiesWithLocation.length === 0) {
      return;
    }

    storiesWithLocation.forEach((story) => {
      const isActive = story.id === activeStoryId;
      const marker = L.marker([story.lat, story.lon], {
        icon: this.#createCustomIcon(isActive),
        title: story.name,
      });

      const formattedDate = story.createdAt ? showFormattedDate(story.createdAt, 'id-ID') : '';
      const truncatedDesc = story.description
        ? story.description.length > 90
          ? `${story.description.substring(0, 90)}...`
          : story.description
        : '';

      const popupContent = `
        <article class="map-popup-card" aria-label="Detail Cerita di Peta oleh ${story.name}">
          <figure class="map-popup-img-wrapper">
            <img 
              src="${story.photoUrl}" 
              alt="Foto dokumentasi cerita oleh ${story.name}" 
              class="map-popup-img"
              loading="lazy"
              onerror="this.onerror=null;this.src='https://placehold.co/300x200?text=Gambar+Tidak+Tersedia';"
            />
            <figcaption class="visually-hidden">Foto cerita oleh ${story.name}</figcaption>
          </figure>
          <div class="map-popup-info">
            <h4 class="map-popup-author">${story.name}</h4>
            ${formattedDate ? `<time class="map-popup-date" datetime="${story.createdAt}">${formattedDate}</time>` : ''}
            <span class="map-popup-coords">Lat: ${story.lat.toFixed(4)}, Lon: ${story.lon.toFixed(4)}</span>
            <p class="map-popup-desc">${truncatedDesc}</p>
            <a href="#/stories/${story.id}" class="map-popup-detail-link" aria-label="Lihat detail cerita oleh ${story.name}">Lihat Detail</a>
          </div>
        </article>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, minWidth: 220, className: 'custom-leaflet-popup' });

      // Marker click handler
      marker.on('click', () => {
        if (typeof onMarkerClick === 'function') {
          onMarkerClick(story.id);
        }
      });

      marker.addTo(this.#markersGroup);
      this.#markersMap.set(story.id, marker);
    });

    // Auto fit map bounds if we have markers and not specifically focusing a story
    if (!activeStoryId && storiesWithLocation.length > 0) {
      try {
        const bounds = this.#markersGroup.getBounds();
        if (bounds.isValid()) {
          this.#map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch (err) {
        console.warn('Could not fit map bounds:', err);
      }
    } else if (activeStoryId && this.#markersMap.has(activeStoryId)) {
      this.highlightMarker(activeStoryId);
    }
  }

  highlightMarker(storyId, { shouldFly = false } = {}) {
    if (!this.#map) return;

    // Reset previous active marker if exists
    if (this.#activeMarkerId && this.#markersMap.has(this.#activeMarkerId)) {
      const prevMarker = this.#markersMap.get(this.#activeMarkerId);
      prevMarker.setIcon(this.#createCustomIcon(false));
      prevMarker.setZIndexOffset(0);
    }

    this.#activeMarkerId = storyId;

    if (storyId && this.#markersMap.has(storyId)) {
      const activeMarker = this.#markersMap.get(storyId);
      activeMarker.setIcon(this.#createCustomIcon(true));
      activeMarker.setZIndexOffset(1000);

      if (shouldFly) {
        const latLng = activeMarker.getLatLng();
        const currentZoom = this.#map.getZoom();
        const targetZoom = Math.max(currentZoom, 12);

        this.#map.flyTo(latLng, targetZoom, {
          duration: 0.8,
          easeLinearity: 0.25,
        });

        setTimeout(() => {
          activeMarker.openPopup();
        }, 350);
      } else {
        activeMarker.openPopup();
      }
    }
  }

  // --- Story Cards List ---
  showStories(stories, activeStoryId = null, totalCount = 0) {
    const loadingEl = this.getLoadingElement();
    const errorEl = this.getErrorElement();
    const emptyEl = this.getEmptyElement();
    const listEl = this.getStoriesListElement();
    const counterEl = this.getStoriesCounterElement();

    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    if (counterEl) {
      const withLoc = stories.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number' && !isNaN(s.lat)).length;
      counterEl.textContent = `Menampilkan ${stories.length} dari ${totalCount || stories.length} cerita (${withLoc} dengan lokasi)`;
    }

    if (listEl) {
      listEl.style.display = 'grid';
      listEl.innerHTML = stories
        .map((story) => this._renderStoryItem(story, story.id === activeStoryId))
        .join('');
    }
  }

  _renderStoryItem(story, isActive = false) {
    const formattedDate = story.createdAt ? showFormattedDate(story.createdAt, 'id-ID') : '';
    const hasLocation = typeof story.lat === 'number' && typeof story.lon === 'number' && !isNaN(story.lat) && !isNaN(story.lon);
    const shortDesc = story.description ? story.description.substring(0, 60) : '';

    return `
      <article 
        class="story-card ${isActive ? 'active-story-card' : ''}" 
        id="story-card-${story.id}" 
        data-story-id="${story.id}" 
        tabindex="0"
        role="article"
        aria-label="Cerita oleh ${story.name}"
        aria-selected="${isActive ? 'true' : 'false'}"
      >
        <figure class="story-image-container">
          <img 
            src="${story.photoUrl}" 
            alt="Foto cerita oleh ${story.name}${shortDesc ? ': ' + shortDesc : ''}" 
            class="story-image"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=Gambar+Tidak+Tersedia';"
          />
          <figcaption class="visually-hidden">Foto cerita oleh ${story.name}</figcaption>
        </figure>

        <div class="story-body">
          <header class="story-header">
            <h3 class="story-author">${story.name}</h3>
            ${formattedDate ? `<time class="story-date" datetime="${story.createdAt}">${formattedDate}</time>` : ''}
          </header>

          <p class="story-description">${story.description || 'Tidak ada deskripsi.'}</p>

          <a href="#/stories/${story.id}" class="btn-detail-link" aria-label="Lihat detail cerita oleh ${story.name}">
            Lihat Detail Cerita
          </a>

          <div class="story-footer">
            ${hasLocation
        ? `
                  <div class="story-coords-text">
                    <span>Lat: ${story.lat.toFixed(3)}, Lon: ${story.lon.toFixed(3)}</span>
                  </div>
                  <button type="button" class="btn-locate-map" data-story-id="${story.id}" aria-label="Lihat lokasi cerita ${story.name} di peta">
                    <span>Lihat di Peta</span>
                  </button>
                `
        : `
                  <div class="story-coords-text muted-text">
                    <span>Koordinat lokasi tidak dicantumkan</span>
                  </div>
                `
      }
          </div>
        </div>
      </article>
    `;
  }

  highlightStoryCard(storyId, shouldScroll = true) {
    // Remove active class from all cards
    document.querySelectorAll('.story-card').forEach((card) => {
      card.classList.remove('active-story-card');
      card.setAttribute('aria-selected', 'false');
    });

    if (!storyId) return;

    const targetCard = document.querySelector(`#story-card-${storyId}`);
    if (targetCard) {
      targetCard.classList.add('active-story-card');
      targetCard.setAttribute('aria-selected', 'true');

      if (shouldScroll) {
        targetCard.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }

  scrollToMap() {
    const mapSection = document.querySelector('.map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- Event Binding Methods ---
  bindSearchInput(onSearch) {
    const searchInput = this.getSearchInputElement();
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value;
        debounceTimer = setTimeout(() => {
          onSearch(query);
        }, 250);
      });
    }
  }

  bindStoryCardClick(onStoryClick) {
    const listEl = this.getStoriesListElement();
    if (!listEl) return;

    listEl.addEventListener('click', (event) => {
      if (event.target.closest('.btn-detail-link')) return;

      const locateBtn = event.target.closest('.btn-locate-map');
      const card = event.target.closest('.story-card');

      if (locateBtn) {
        event.stopPropagation();
        const storyId = locateBtn.getAttribute('data-story-id');
        if (storyId) onStoryClick(storyId, { shouldScrollToMap: true });
        return;
      }

      if (card) {
        const storyId = card.getAttribute('data-story-id');
        if (storyId) onStoryClick(storyId, { shouldScrollToMap: false });
      }
    });

    // Keyboard navigation (Enter / Space on story card)
    listEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.target.closest('.btn-detail-link')) return;

        const card = event.target.closest('.story-card');
        if (card) {
          event.preventDefault();
          const storyId = card.getAttribute('data-story-id');
          if (storyId) onStoryClick(storyId, { shouldScrollToMap: false });
        }
      }
    });
  }

  destroy() {
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#markersMap.clear();
      this.#activeMarkerId = null;
    }
  }
}

