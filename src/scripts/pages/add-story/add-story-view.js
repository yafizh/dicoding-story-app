import L from 'leaflet';

export default class AddStoryView {
  #map = null;
  #marker = null;
  #stream = null;
  #currentFacingMode = 'user';

  getTemplate() {
    return `
      <section class="container add-story-section">
        <div class="add-story-card">
          <div class="form-header">
            <a href="#/" class="back-link" aria-label="Kembali ke Beranda">
              Kembali ke Beranda
            </a>
            <h1 class="form-title">Tambah Cerita Baru</h1>
            <p class="form-subtitle">Bagikan momen, inspirasi, dan lokasi cerita menarik Anda.</p>
          </div>

          <div id="add-story-alert" class="alert-container" style="display: none;" role="alert"></div>

          <form id="add-story-form" class="add-story-form" novalidate>
            <!-- Photo Upload & Camera Stream Section -->
            <div class="form-section">
              <div class="section-label-group">
                <label class="form-section-title">Foto Cerita <span class="required-mark">*</span></label>
                <span class="section-hint">Pilih dari file galeri atau ambil foto langsung dengan kamera</span>
              </div>

              <!-- Media Tabs -->
              <div class="media-tabs" role="tablist">
                <button type="button" class="tab-btn active" id="tab-upload" role="tab" aria-selected="true">
                  Unggah Berkas
                </button>
                <button type="button" class="tab-btn" id="tab-camera" role="tab" aria-selected="false">
                  Kamera Langsung
                </button>
              </div>

              <!-- Tab Content: File Upload -->
              <div class="tab-content" id="tab-content-upload">
                <div class="drop-zone" id="drop-zone">
                  <div class="drop-zone-content">
                    <p class="drop-text">Tarik & letakkan foto di sini, atau</p>
                    <label for="photo-input" class="btn-secondary btn-file-label">
                      Pilih dari Perangkat
                    </label>
                    <input
                      type="file"
                      id="photo-input"
                      name="photo"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      class="file-input-hidden"
                    />
                    <small class="file-hint">Format: JPG, PNG, WebP (Maksimal 1MB)</small>
                  </div>
                </div>
              </div>

              <!-- Tab Content: Live Camera -->
              <div class="tab-content" id="tab-content-camera" style="display: none;">
                <div class="camera-wrapper">
                  <div class="camera-viewport">
                    <video id="camera-video" playsinline autoplay muted class="camera-video"></video>
                    <div id="camera-loading" class="camera-loading" style="display: none;">
                      <div class="spinner"></div>
                      <p>Membuka kamera...</p>
                    </div>
                    <canvas id="camera-canvas" class="camera-canvas" style="display: none;"></canvas>
                  </div>

                  <div class="camera-controls">
                    <button type="button" id="btn-start-camera" class="btn-secondary">
                      Buka Kamera
                    </button>
                    <button type="button" id="btn-capture-photo" class="btn-primary" style="display: none;">
                      Ambil Foto
                    </button>
                    <button type="button" id="btn-switch-camera" class="btn-secondary" style="display: none;" title="Ganti Kamera Depan/Belakang">
                      Ganti Kamera
                    </button>
                    <button type="button" id="btn-stop-camera" class="btn-secondary btn-danger-subtle" style="display: none;">
                      Tutup Kamera
                    </button>
                  </div>
                </div>
              </div>

              <!-- Image Preview Container -->
              <div class="photo-preview-container" id="photo-preview-container" style="display: none;">
                <div class="preview-card">
                  <div class="preview-img-wrapper">
                    <img id="photo-preview-img" src="" alt="Pratinjau Foto Cerita" class="preview-img" />
                  </div>
                  <div class="preview-details">
                    <div class="preview-meta">
                      <span class="preview-badge" id="preview-badge">Foto Terpilih</span>
                      <span class="preview-name" id="preview-name">-</span>
                      <span class="preview-size" id="preview-size">-</span>
                    </div>
                    <button type="button" id="btn-remove-photo" class="btn-secondary btn-remove-photo" title="Hapus foto terpilih">
                      Hapus Foto
                    </button>
                  </div>
                </div>
              </div>

              <span class="form-error" id="photo-error"></span>
            </div>

            <!-- Description Section -->
            <div class="form-section">
              <div class="section-label-group">
                <label for="description" class="form-section-title">Deskripsi Cerita <span class="required-mark">*</span></label>
                <span class="section-hint">Tuliskan cerita atau pengalaman Anda</span>
              </div>
              <div class="textarea-wrapper">
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  class="form-input form-textarea"
                  placeholder="Ceritakan apa yang terjadi, apa yang Anda temukan, atau inspirasi di balik foto ini..."
                  required
                ></textarea>
                <div class="textarea-footer">
                  <span class="form-error" id="description-error"></span>
                  <span class="char-counter" id="char-counter">0 karakter</span>
                </div>
              </div>
            </div>

            <!-- Digital Map Location Section -->
            <div class="form-section">
              <div class="section-label-group">
                <label class="form-section-title">Lokasi Cerita di Peta Digital (Opsional)</label>
                <span class="section-hint">Klik pada peta untuk menyematkan koordinat latitude dan longitude cerita Anda</span>
              </div>

              <div class="map-toolbar">
                <div class="map-toolbar-actions">
                  <button type="button" id="btn-current-location" class="btn-secondary btn-sm">
                    Gunakan Lokasi Saya (GPS)
                  </button>
                  <button type="button" id="btn-clear-location" class="btn-secondary btn-sm" style="display: none;">
                    Hapus Pin Lokasi
                  </button>
                </div>
                <div class="location-status" id="location-status">
                  <span class="status-indicator-dot"></span>
                  <span id="location-status-text">Belum ada lokasi dipilih (Klik peta)</span>
                </div>
              </div>

              <div class="map-picker-card">
                <div id="add-story-map" class="add-story-map" role="region" aria-label="Peta Pemilih Lokasi Cerita"></div>
                <div class="map-picker-hint">
                  <strong>Petunjuk:</strong> Klik di mana saja pada peta atau geser pin marker untuk mengubah posisi koordinat.
                </div>
              </div>

              <!-- Lat/Lon Coordinate Inputs -->
              <div class="coordinates-grid">
                <div class="form-group">
                  <label for="latitude" class="form-label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    id="latitude"
                    name="lat"
                    class="form-input coordinate-input"
                    placeholder="Contoh: -6.2088"
                  />
                </div>
                <div class="form-group">
                  <label for="longitude" class="form-label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    id="longitude"
                    name="lon"
                    class="form-input coordinate-input"
                    placeholder="Contoh: 106.8456"
                  />
                </div>
              </div>
              <span class="form-error" id="location-error"></span>
            </div>

            <!-- Action Buttons -->
            <div class="form-actions">
              <a href="#/" class="btn-secondary btn-cancel">Batal</a>
              <button type="submit" id="submit-btn" class="btn-primary btn-submit">
                <span class="btn-text">Terbitkan Cerita</span>
                <span class="btn-spinner" style="display: none;"></span>
              </button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  // --- Element Getters ---
  getFormElement() {
    return document.querySelector('#add-story-form');
  }

  getPhotoInputElement() {
    return document.querySelector('#photo-input');
  }

  getDescriptionInputElement() {
    return document.querySelector('#description');
  }

  getLatitudeInputElement() {
    return document.querySelector('#latitude');
  }

  getLongitudeInputElement() {
    return document.querySelector('#longitude');
  }

  getSubmitButton() {
    return document.querySelector('#submit-btn');
  }

  getAlertElement() {
    return document.querySelector('#add-story-alert');
  }

  getVideoElement() {
    return document.querySelector('#camera-video');
  }

  getCanvasElement() {
    return document.querySelector('#camera-canvas');
  }

  // --- Leaflet Map Management ---
  initMap({ onCoordinatesChange }) {
    const mapContainer = document.querySelector('#add-story-map');
    if (!mapContainer) return;

    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#marker = null;
    }

    // Default center on Indonesia
    const defaultCenter = [-2.548926, 118.0148634];
    const defaultZoom = 5;

    this.#map = L.map(mapContainer, {
      center: defaultCenter,
      zoom: defaultZoom,
      scrollWheelZoom: true,
    });

    // Tile Layers
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    const cartoPositronLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    });

    const cartoDarkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    });

    const esriSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri',
    });

    osmLayer.addTo(this.#map);

    const baseMaps = {
      'OpenStreetMap': osmLayer,
      'CartoDB Terang': cartoPositronLayer,
      'CartoDB Gelap': cartoDarkLayer,
      'Esri Satelit': esriSatelliteLayer,
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.#map);

    // Click event on map to select coordinates
    this.#map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.updateCoordinatesOnMap(lat, lng);
      if (onCoordinatesChange) {
        onCoordinatesChange(lat, lng);
      }
    });

    // Invalidate size after layout rendering
    setTimeout(() => {
      if (this.#map) {
        this.#map.invalidateSize();
      }
    }, 200);
  }

  updateCoordinatesOnMap(lat, lng, shouldZoom = false) {
    if (!this.#map) return;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) return;

    const latLng = [latNum, lngNum];

    const customIcon = L.divIcon({
      className: 'custom-story-marker active-marker',
      html: `
        <div class="custom-marker-pin active-pin">
          <span class="marker-dot"></span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    if (this.#marker) {
      this.#marker.setLatLng(latLng);
    } else {
      this.#marker = L.marker(latLng, {
        icon: customIcon,
        draggable: true,
      }).addTo(this.#map);

      this.#marker.on('dragend', (event) => {
        const position = event.target.getLatLng();
        this.setCoordinateInputs(position.lat, position.lng);
        this.updateLocationStatus(position.lat, position.lng);
      });
    }

    this.#marker
      .bindPopup(
        `<div class="marker-popup-content">
          <strong>Lokasi Cerita</strong>
          <p>Lat: ${latNum.toFixed(6)}, Lon: ${lngNum.toFixed(6)}</p>
          <small>Geser pin untuk menyesuaikan posisi</small>
        </div>`
      )
      .openPopup();

    if (shouldZoom) {
      this.#map.setView(latLng, Math.max(this.#map.getZoom(), 12), { animate: true });
    }

    this.setCoordinateInputs(latNum, lngNum);
    this.updateLocationStatus(latNum, lngNum);
  }

  clearLocation() {
    if (this.#marker && this.#map) {
      this.#map.removeLayer(this.#marker);
      this.#marker = null;
    }
    const latInput = this.getLatitudeInputElement();
    const lonInput = this.getLongitudeInputElement();
    if (latInput) latInput.value = '';
    if (lonInput) lonInput.value = '';

    const statusEl = document.querySelector('#location-status-text');
    const clearBtn = document.querySelector('#btn-clear-location');
    const statusContainer = document.querySelector('#location-status');

    if (statusEl) statusEl.textContent = 'Belum ada lokasi dipilih (Klik peta)';
    if (clearBtn) clearBtn.style.display = 'none';
    if (statusContainer) statusContainer.classList.remove('has-location');
  }

  setCoordinateInputs(lat, lon) {
    const latInput = this.getLatitudeInputElement();
    const lonInput = this.getLongitudeInputElement();
    if (latInput) latInput.value = lat !== null ? parseFloat(lat).toFixed(6) : '';
    if (lonInput) lonInput.value = lon !== null ? parseFloat(lon).toFixed(6) : '';
  }

  updateLocationStatus(lat, lon) {
    const statusEl = document.querySelector('#location-status-text');
    const clearBtn = document.querySelector('#btn-clear-location');
    const statusContainer = document.querySelector('#location-status');

    if (statusEl) {
      statusEl.textContent = `Lokasi terpilih: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
    }
    if (clearBtn) clearBtn.style.display = 'inline-block';
    if (statusContainer) statusContainer.classList.add('has-location');
  }

  // --- Camera & Media Stream Management ---
  async startCamera() {
    const video = this.getVideoElement();
    const loadingEl = document.querySelector('#camera-loading');
    const btnStart = document.querySelector('#btn-start-camera');
    const btnCapture = document.querySelector('#btn-capture-photo');
    const btnSwitch = document.querySelector('#btn-switch-camera');
    const btnStop = document.querySelector('#btn-stop-camera');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showFieldError('photo', 'Perangkat Anda tidak mendukung fitur akses kamera langsung.');
      return false;
    }

    // Stop existing stream if any
    this.stopCamera();

    if (loadingEl) loadingEl.style.display = 'flex';

    try {
      const constraints = {
        video: {
          facingMode: this.#currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      this.#stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (video) {
        video.srcObject = this.#stream;
        await video.play();
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (btnStart) btnStart.style.display = 'none';
      if (btnCapture) btnCapture.style.display = 'inline-block';
      if (btnSwitch) btnSwitch.style.display = 'inline-block';
      if (btnStop) btnStop.style.display = 'inline-block';

      this.clearFieldError('photo');
      return true;
    } catch (error) {
      console.error('Error starting camera:', error);
      if (loadingEl) loadingEl.style.display = 'none';

      let errorMessage = 'Gagal mengakses kamera.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Izin akses kamera ditolak. Berikan izin di browser Anda untuk menggunakan kamera.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Perangkat kamera tidak ditemukan.';
      }

      this.showFieldError('photo', errorMessage);
      return false;
    }
  }

  switchCamera() {
    this.#currentFacingMode = this.#currentFacingMode === 'user' ? 'environment' : 'user';
    return this.startCamera();
  }

  stopCamera() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.#stream = null;
    }

    const video = this.getVideoElement();
    if (video) {
      video.srcObject = null;
    }

    const btnStart = document.querySelector('#btn-start-camera');
    const btnCapture = document.querySelector('#btn-capture-photo');
    const btnSwitch = document.querySelector('#btn-switch-camera');
    const btnStop = document.querySelector('#btn-stop-camera');

    if (btnStart) btnStart.style.display = 'inline-block';
    if (btnCapture) btnCapture.style.display = 'none';
    if (btnSwitch) btnSwitch.style.display = 'none';
    if (btnStop) btnStop.style.display = 'none';
  }

  capturePhoto() {
    const video = this.getVideoElement();
    const canvas = this.getCanvasElement();

    if (!video || !canvas || !this.#stream) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          resolve(file);
        },
        'image/jpeg',
        0.85
      );
    });
  }

  // --- Preview Management ---
  showPhotoPreview(file, sourceLabel = 'File Terpilih') {
    const previewContainer = document.querySelector('#photo-preview-container');
    const previewImg = document.querySelector('#photo-preview-img');
    const previewName = document.querySelector('#preview-name');
    const previewSize = document.querySelector('#preview-size');
    const previewBadge = document.querySelector('#preview-badge');

    if (!file || !previewContainer || !previewImg) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);

    if (previewName) previewName.textContent = file.name || 'foto_kamera.jpg';
    if (previewSize) {
      const sizeInKB = (file.size / 1024).toFixed(1);
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      previewSize.textContent = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    }
    if (previewBadge) previewBadge.textContent = sourceLabel;

    this.clearFieldError('photo');
  }

  hidePhotoPreview() {
    const previewContainer = document.querySelector('#photo-preview-container');
    const previewImg = document.querySelector('#photo-preview-img');
    const photoInput = this.getPhotoInputElement();

    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (photoInput) photoInput.value = '';
  }

  // --- UI Validation Feedback & Alerts ---
  showFieldError(field, message) {
    const errorEl = document.querySelector(`#${field}-error`);
    const inputEl = document.querySelector(`#${field}`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = message ? 'block' : 'none';
    }
    if (inputEl) {
      if (message) {
        inputEl.classList.add('input-invalid');
      } else {
        inputEl.classList.remove('input-invalid');
      }
    }
  }

  clearFieldError(field) {
    this.showFieldError(field, '');
  }

  clearAllFieldErrors() {
    ['photo', 'description', 'location'].forEach((field) => {
      this.clearFieldError(field);
    });
  }

  showAlert(message, type = 'error') {
    const alertEl = this.getAlertElement();
    if (!alertEl) return;

    alertEl.style.display = 'block';
    alertEl.className = `alert-container alert-${type}`;
    alertEl.innerHTML = `
      <div class="alert-content">
        <span>${message}</span>
      </div>
    `;
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  hideAlert() {
    const alertEl = this.getAlertElement();
    if (alertEl) {
      alertEl.style.display = 'none';
    }
  }

  setLoading(isLoading) {
    const btn = this.getSubmitButton();
    if (!btn) return;

    const btnText = btn.querySelector('.btn-text');
    const btnSpinner = btn.querySelector('.btn-spinner');

    btn.disabled = isLoading;
    if (btnText) btnText.textContent = isLoading ? 'Mengunggah Cerita...' : 'Terbitkan Cerita';
    if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
  }

  updateCharCounter(count) {
    const counterEl = document.querySelector('#char-counter');
    if (counterEl) {
      counterEl.textContent = `${count} karakter`;
    }
  }

  // --- Event Binding ---
  bindEvents({
    onTabChange,
    onFileSelected,
    onStartCamera,
    onCaptureCamera,
    onSwitchCamera,
    onStopCamera,
    onRemovePhoto,
    onDescriptionInput,
    onCoordinateInput,
    onCurrentLocationClick,
    onClearLocationClick,
    onSubmit,
  }) {
    // Tabs
    const tabUpload = document.querySelector('#tab-upload');
    const tabCamera = document.querySelector('#tab-camera');
    const contentUpload = document.querySelector('#tab-content-upload');
    const contentCamera = document.querySelector('#tab-content-camera');

    if (tabUpload && tabCamera) {
      tabUpload.addEventListener('click', () => {
        tabUpload.classList.add('active');
        tabCamera.classList.remove('active');
        tabUpload.setAttribute('aria-selected', 'true');
        tabCamera.setAttribute('aria-selected', 'false');
        if (contentUpload) contentUpload.style.display = 'block';
        if (contentCamera) contentCamera.style.display = 'none';
        if (onTabChange) onTabChange('upload');
      });

      tabCamera.addEventListener('click', () => {
        tabCamera.classList.add('active');
        tabUpload.classList.remove('active');
        tabCamera.setAttribute('aria-selected', 'true');
        tabUpload.setAttribute('aria-selected', 'false');
        if (contentCamera) contentCamera.style.display = 'block';
        if (contentUpload) contentUpload.style.display = 'none';
        if (onTabChange) onTabChange('camera');
      });
    }

    // Drag & Drop
    const dropZone = document.querySelector('#drop-zone');
    const photoInput = this.getPhotoInputElement();

    if (dropZone && photoInput) {
      ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('drag-over');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          if (onFileSelected) onFileSelected(files[0]);
        }
      });

      photoInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file && onFileSelected) {
          onFileSelected(file);
        }
      });
    }

    // Camera Controls
    const btnStartCamera = document.querySelector('#btn-start-camera');
    const btnCapturePhoto = document.querySelector('#btn-capture-photo');
    const btnSwitchCamera = document.querySelector('#btn-switch-camera');
    const btnStopCamera = document.querySelector('#btn-stop-camera');

    if (btnStartCamera) btnStartCamera.addEventListener('click', onStartCamera);
    if (btnCapturePhoto) btnCapturePhoto.addEventListener('click', onCaptureCamera);
    if (btnSwitchCamera) btnSwitchCamera.addEventListener('click', onSwitchCamera);
    if (btnStopCamera) btnStopCamera.addEventListener('click', onStopCamera);

    // Remove photo
    const btnRemovePhoto = document.querySelector('#btn-remove-photo');
    if (btnRemovePhoto) btnRemovePhoto.addEventListener('click', onRemovePhoto);

    // Description input
    const descInput = this.getDescriptionInputElement();
    if (descInput) {
      descInput.addEventListener('input', (e) => {
        if (onDescriptionInput) onDescriptionInput(e.target.value);
      });
    }

    // Coordinate inputs
    const latInput = this.getLatitudeInputElement();
    const lonInput = this.getLongitudeInputElement();
    const handleCoordChange = () => {
      if (onCoordinateInput && latInput && lonInput) {
        onCoordinateInput(latInput.value.trim(), lonInput.value.trim());
      }
    };
    if (latInput) latInput.addEventListener('input', handleCoordChange);
    if (lonInput) lonInput.addEventListener('input', handleCoordChange);

    // Map Toolbar actions
    const btnCurrentLocation = document.querySelector('#btn-current-location');
    const btnClearLocation = document.querySelector('#btn-clear-location');

    if (btnCurrentLocation) btnCurrentLocation.addEventListener('click', onCurrentLocationClick);
    if (btnClearLocation) btnClearLocation.addEventListener('click', onClearLocationClick);

    // Form Submit
    const form = this.getFormElement();
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit();
      });
    }
  }

  // --- Cleanup / Destroy ---
  destroy() {
    // Stop all media streams
    this.stopCamera();

    // Destroy Leaflet Map
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#marker = null;
    }
  }
}
