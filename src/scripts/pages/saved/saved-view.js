import { showFormattedDate, escapeHtml, formatFileSize } from '../../utils';

export default class SavedView {
  #objectUrls = [];

  getTemplate() {
    return `
      <section class="container saved-section" aria-labelledby="saved-title">
        <header class="saved-hero">
          <div class="saved-hero-text">
            <h1 id="saved-title" class="section-title">Cerita Tersimpan &amp; Antrean Offline</h1>
            <p class="section-subtitle">
              Cerita di halaman ini tersimpan pada IndexedDB perangkat Anda sehingga tetap dapat
              dibuka meskipun sedang tidak terhubung ke internet.
            </p>
          </div>
          <div class="saved-hero-stats" role="status" aria-live="polite">
            <div class="saved-stat">
              <span class="saved-stat-value" id="saved-total">0</span>
              <span class="saved-stat-label">Cerita Tersimpan</span>
            </div>
            <div class="saved-stat">
              <span class="saved-stat-value" id="outbox-total">0</span>
              <span class="saved-stat-label">Menunggu Sinkron</span>
            </div>
          </div>
        </header>

        <!-- Antrean cerita offline -->
        <section class="outbox-panel" id="outbox-panel" aria-labelledby="outbox-heading">
          <header class="outbox-header">
            <div>
              <h2 id="outbox-heading" class="section-title outbox-title">Antrean Cerita Offline</h2>
              <p class="section-subtitle" id="outbox-subtitle">
                Cerita yang dibuat saat offline akan dikirim otomatis ketika koneksi kembali tersedia.
              </p>
            </div>
            <button
              type="button"
              id="sync-now-button"
              class="btn-primary btn-sync"
              aria-label="Sinkronkan sekarang seluruh cerita pada antrean offline"
            >
              Sinkronkan Sekarang
            </button>
          </header>

          <div id="outbox-list" class="outbox-list"></div>

          <p id="outbox-empty" class="outbox-empty muted-text">
            Tidak ada cerita yang menunggu sinkronisasi. Semua data Anda sudah aman di server.
          </p>
        </section>

        <!-- Toolbar interaktif: pencarian, filter, urutan -->
        <div class="filter-toolbar saved-toolbar">
          <header class="filter-header">
            <h2 class="section-title" id="saved-list-heading">Koleksi Cerita Tersimpan</h2>
            <span class="stories-counter" id="saved-counter" role="status" aria-live="polite">
              Menampilkan 0 cerita
            </span>
          </header>

          <div class="filter-controls saved-filter-controls">
            <div class="search-box">
              <label for="saved-search-input" class="visually-hidden">
                Cari cerita tersimpan berdasarkan nama pengguna atau deskripsi
              </label>
              <input
                type="search"
                id="saved-search-input"
                name="saved-search"
                class="search-input"
                placeholder="Cari cerita tersimpan..."
                aria-label="Cari cerita tersimpan berdasarkan nama atau deskripsi"
              />
            </div>

            <div class="select-box">
              <label for="saved-filter-select" class="visually-hidden">Filter cerita tersimpan</label>
              <select id="saved-filter-select" class="filter-select" aria-label="Filter cerita tersimpan berdasarkan lokasi">
                <option value="all">Semua Cerita</option>
                <option value="with-location">Hanya yang Berlokasi</option>
                <option value="without-location">Tanpa Lokasi</option>
              </select>
            </div>

            <div class="select-box">
              <label for="saved-sort-select" class="visually-hidden">Urutkan cerita tersimpan</label>
              <select id="saved-sort-select" class="filter-select" aria-label="Urutkan cerita tersimpan">
                <option value="saved-desc">Terbaru Disimpan</option>
                <option value="saved-asc">Terlama Disimpan</option>
                <option value="created-desc">Cerita Terbaru</option>
                <option value="created-asc">Cerita Terlama</option>
                <option value="name-asc">Nama A - Z</option>
                <option value="name-desc">Nama Z - A</option>
              </select>
            </div>

            <button
              type="button"
              id="clear-saved-button"
              class="btn-danger-outline"
              aria-label="Hapus seluruh cerita tersimpan dari perangkat"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        <div id="saved-loading" class="loading-container" role="status" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <p>Memuat cerita tersimpan dari perangkat...</p>
        </div>

        <div id="saved-error" class="error-container" style="display: none;" role="alert"></div>

        <div id="saved-empty" class="empty-container" style="display: none;" role="status">
          <h3>Belum Ada Cerita Tersimpan</h3>
          <p id="saved-empty-message">
            Tekan tombol "Simpan" pada kartu cerita di beranda untuk menyimpannya ke perangkat Anda.
          </p>
          <a href="#/" class="btn-primary">Jelajahi Cerita</a>
        </div>

        <div
          id="saved-list"
          class="stories-grid saved-grid"
          style="display: none;"
          role="feed"
          aria-labelledby="saved-list-heading"
        ></div>
      </section>
    `;
  }

  showLoading() {
    this.#toggle('#saved-loading', 'flex');
    this.#toggle('#saved-error', 'none');
    this.#toggle('#saved-empty', 'none');
    this.#toggle('#saved-list', 'none');
  }

  showError(message) {
    this.#toggle('#saved-loading', 'none');
    this.#toggle('#saved-empty', 'none');
    this.#toggle('#saved-list', 'none');

    const errorEl = document.querySelector('#saved-error');
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.innerHTML = `
        <div class="error-box">
          <p class="error-message">${escapeHtml(message || 'Gagal memuat data dari IndexedDB.')}</p>
        </div>
      `;
    }
  }

  showEmpty(message) {
    this.#toggle('#saved-loading', 'none');
    this.#toggle('#saved-error', 'none');
    this.#toggle('#saved-list', 'none');
    this.#toggle('#saved-empty', 'block');

    const messageEl = document.querySelector('#saved-empty-message');
    if (messageEl && message) messageEl.textContent = message;
  }

  #toggle(selector, display) {
    const element = document.querySelector(selector);
    if (element) element.style.display = display;
  }

  showSavedStories(stories, totalCount) {
    this.#toggle('#saved-loading', 'none');
    this.#toggle('#saved-error', 'none');
    this.#toggle('#saved-empty', 'none');

    const counterEl = document.querySelector('#saved-counter');
    if (counterEl) {
      counterEl.textContent = `Menampilkan ${stories.length} dari ${totalCount} cerita tersimpan`;
    }

    const listEl = document.querySelector('#saved-list');
    if (!listEl) return;

    listEl.style.display = 'grid';
    listEl.innerHTML = stories.map((story) => this.#renderSavedCard(story)).join('');
  }

  #renderSavedCard(story) {
    const createdDate = story.createdAt ? showFormattedDate(story.createdAt, 'id-ID') : '';
    const savedDate = story.savedAt ? showFormattedDate(story.savedAt, 'id-ID') : '';
    const hasLocation = typeof story.lat === 'number' && typeof story.lon === 'number';
    const name = escapeHtml(story.name);

    return `
      <article class="story-card saved-card" data-story-id="${escapeHtml(story.id)}" aria-label="Cerita tersimpan oleh ${name}">
        <figure class="story-image-container">
          <img
            src="${escapeHtml(story.photoUrl)}"
            alt="Foto cerita oleh ${name}"
            class="story-image"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=Gambar+Tidak+Tersedia';"
          />
          <figcaption class="visually-hidden">Foto cerita oleh ${name}</figcaption>
        </figure>

        <div class="story-body">
          <header class="story-header">
            <h3 class="story-author">${name}</h3>
            ${createdDate ? `<time class="story-date" datetime="${escapeHtml(story.createdAt)}">${createdDate}</time>` : ''}
          </header>

          <p class="story-description">${escapeHtml(story.description) || 'Tidak ada deskripsi.'}</p>

          <p class="saved-meta muted-text">
            ${hasLocation
              ? `Lat: ${story.lat.toFixed(3)}, Lon: ${story.lon.toFixed(3)}`
              : 'Koordinat lokasi tidak dicantumkan'}
            ${savedDate ? ` &middot; Disimpan ${savedDate}` : ''}
          </p>

          <div class="saved-card-actions">
            <a href="#/stories/${encodeURIComponent(story.id)}" class="btn-detail-link" aria-label="Lihat detail cerita oleh ${name}">
              Lihat Detail
            </a>
            <button
              type="button"
              class="btn-delete-saved"
              data-delete-id="${escapeHtml(story.id)}"
              aria-label="Hapus cerita oleh ${name} dari penyimpanan perangkat"
            >
              Hapus
            </button>
          </div>
        </div>
      </article>
    `;
  }

  showOutbox(records, { isSyncing = false } = {}) {
    this.#revokeObjectUrls();

    const listEl = document.querySelector('#outbox-list');
    const emptyEl = document.querySelector('#outbox-empty');
    const panelEl = document.querySelector('#outbox-panel');
    const syncButton = document.querySelector('#sync-now-button');

    if (panelEl) panelEl.classList.toggle('has-pending', records.length > 0);

    if (syncButton) {
      syncButton.disabled = records.length === 0 || isSyncing;
      syncButton.textContent = isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang';
    }

    if (emptyEl) emptyEl.style.display = records.length === 0 ? 'block' : 'none';
    if (!listEl) return;

    if (records.length === 0) {
      listEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = records.map((record) => this.#renderOutboxItem(record)).join('');
  }

  #renderOutboxItem(record) {
    const createdDate = record.createdAt
      ? showFormattedDate(record.createdAt, 'id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    let previewUrl = '';
    if (record.photo instanceof Blob) {
      previewUrl = URL.createObjectURL(record.photo);
      this.#objectUrls.push(previewUrl);
    }

    const hasLocation = typeof record.lat === 'number' && typeof record.lon === 'number';
    const isFailed = record.status === 'failed';

    return `
      <article class="outbox-item ${isFailed ? 'is-failed' : ''}" data-outbox-id="${record.id}">
        ${previewUrl
          ? `<img src="${previewUrl}" alt="Pratinjau foto cerita yang menunggu sinkronisasi" class="outbox-thumb" />`
          : '<div class="outbox-thumb outbox-thumb--empty" aria-hidden="true"></div>'}

        <div class="outbox-info">
          <p class="outbox-desc">${escapeHtml(record.description) || 'Tanpa deskripsi.'}</p>
          <p class="outbox-meta muted-text">
            ${createdDate ? `Dibuat ${createdDate}` : ''}
            ${record.photoSize ? ` &middot; ${formatFileSize(record.photoSize)}` : ''}
            ${hasLocation ? ` &middot; Lat ${record.lat.toFixed(3)}, Lon ${record.lon.toFixed(3)}` : ' &middot; Tanpa lokasi'}
          </p>
          <p class="outbox-status">
            <span class="outbox-badge ${isFailed ? 'outbox-badge--failed' : 'outbox-badge--pending'}">
              ${isFailed ? 'Gagal Dikirim' : 'Menunggu Koneksi'}
            </span>
            ${isFailed && record.lastError ? `<span class="outbox-error">${escapeHtml(record.lastError)}</span>` : ''}
          </p>
        </div>

        <button
          type="button"
          class="btn-delete-outbox"
          data-outbox-delete="${record.id}"
          aria-label="Batalkan dan hapus cerita ini dari antrean offline"
        >
          Batalkan
        </button>
      </article>
    `;
  }

  updateStats({ savedCount = 0, pendingCount = 0 } = {}) {
    const savedEl = document.querySelector('#saved-total');
    const outboxEl = document.querySelector('#outbox-total');

    if (savedEl) savedEl.textContent = String(savedCount);
    if (outboxEl) outboxEl.textContent = String(pendingCount);
  }

  setSyncButtonBusy(isBusy) {
    const syncButton = document.querySelector('#sync-now-button');
    if (!syncButton) return;

    syncButton.disabled = isBusy;
    syncButton.textContent = isBusy ? 'Menyinkronkan...' : 'Sinkronkan Sekarang';
  }

  bindSearch(handler) {
    const input = document.querySelector('#saved-search-input');
    if (!input) return;

    let debounceTimer = null;
    input.addEventListener('input', (event) => {
      const { value } = event.target;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handler(value), 250);
    });
  }

  bindFilterChange(handler) {
    const select = document.querySelector('#saved-filter-select');
    if (select) select.addEventListener('change', (event) => handler(event.target.value));
  }

  bindSortChange(handler) {
    const select = document.querySelector('#saved-sort-select');
    if (select) select.addEventListener('change', (event) => handler(event.target.value));
  }

  bindDeleteStory(handler) {
    const listEl = document.querySelector('#saved-list');
    if (!listEl) return;

    listEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-delete-id]');
      if (!button) return;

      event.preventDefault();
      handler(button.getAttribute('data-delete-id'));
    });
  }

  bindClearAll(handler) {
    const button = document.querySelector('#clear-saved-button');
    if (button) button.addEventListener('click', () => handler());
  }

  bindSyncNow(handler) {
    const button = document.querySelector('#sync-now-button');
    if (button) button.addEventListener('click', () => handler());
  }

  bindDeleteOutbox(handler) {
    const listEl = document.querySelector('#outbox-list');
    if (!listEl) return;

    listEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-outbox-delete]');
      if (!button) return;

      event.preventDefault();
      handler(button.getAttribute('data-outbox-delete'));
    });
  }

  confirmAction(message) {
    return window.confirm(message);
  }

  #revokeObjectUrls() {
    this.#objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.#objectUrls = [];
  }

  destroy() {
    this.#revokeObjectUrls();
  }
}
