import { getAuthToken } from '../../utils/auth';

export default class AddStoryPresenter {
  #view;
  #model;
  #photoFile = null;
  #description = '';
  #lat = null;
  #lon = null;
  #currentTab = 'upload';

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    this.#setupMap();
    this.#setupViewEvents();
  }

  #setupMap() {
    this.#view.initMap({
      onCoordinatesChange: (lat, lon) => {
        this.#lat = lat;
        this.#lon = lon;
        this.#view.clearFieldError('location');
      },
    });
  }

  #setupViewEvents() {
    this.#view.bindEvents({
      onTabChange: (tab) => this.#handleTabChange(tab),
      onFileSelected: (file) => this.#handleFileSelected(file),
      onStartCamera: () => this.#handleStartCamera(),
      onCaptureCamera: () => this.#handleCaptureCamera(),
      onSwitchCamera: () => this.#handleSwitchCamera(),
      onStopCamera: () => this.#handleStopCamera(),
      onRemovePhoto: () => this.#handleRemovePhoto(),
      onDescriptionInput: (text) => this.#handleDescriptionInput(text),
      onCoordinateInput: (lat, lon) => this.#handleCoordinateInput(lat, lon),
      onCurrentLocationClick: () => this.#handleCurrentLocation(),
      onClearLocationClick: () => this.#handleClearLocation(),
      onSubmit: () => this.#handleSubmit(),
    });
  }

  #handleTabChange(tab) {
    this.#currentTab = tab;
    if (tab === 'upload') {
      // Ensure camera is stopped when leaving camera tab
      this.#view.stopCamera();
    }
  }

  #handleFileSelected(file) {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      this.#view.showFieldError('photo', 'Format berkas tidak valid. Harap pilih gambar JPG, PNG, atau WebP.');
      return;
    }

    // Validate file size (max 1MB)
    const MAX_SIZE = 1024 * 1024; // 1MB in bytes
    if (file.size > MAX_SIZE) {
      this.#view.showFieldError('photo', 'Ukuran gambar melebihi batas 1MB. Silakan pilih foto dengan ukuran lebih kecil.');
      return;
    }

    this.#photoFile = file;
    this.#view.showPhotoPreview(file, 'Berkas Galeri');
  }

  async #handleStartCamera() {
    await this.#view.startCamera();
  }

  async #handleSwitchCamera() {
    await this.#view.switchCamera();
  }

  #handleStopCamera() {
    this.#view.stopCamera();
  }

  async #handleCaptureCamera() {
    try {
      const file = await this.#view.capturePhoto();
      if (!file) {
        this.#view.showFieldError('photo', 'Gagal menangkap foto dari kamera.');
        return;
      }

      // Check size
      const MAX_SIZE = 1024 * 1024;
      if (file.size > MAX_SIZE) {
        this.#view.showFieldError('photo', 'Ukuran foto hasil kamera melebihi 1MB.');
        return;
      }

      this.#photoFile = file;

      // Close live camera stream once photo is captured (Requirement 7)
      this.#view.stopCamera();
      this.#view.showPhotoPreview(file, 'Kamera Langsung');
    } catch (error) {
      console.error('Error capturing photo:', error);
      this.#view.showFieldError('photo', 'Terjadi kesalahan saat mengambil foto dari kamera.');
    }
  }

  #handleRemovePhoto() {
    this.#photoFile = null;
    this.#view.hidePhotoPreview();
    this.#view.stopCamera();
  }

  #handleDescriptionInput(text) {
    this.#description = text;
    this.#view.updateCharCounter(text.length);

    if (text.trim().length > 0) {
      this.#view.clearFieldError('description');
    }
  }

  #handleCoordinateInput(lat, lon) {
    if (lat === '' && lon === '') {
      this.#lat = null;
      this.#lon = null;
      return;
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      this.#view.showFieldError('location', 'Nilai latitude dan longitude harus berupa angka valid');
      return;
    }

    if (latNum < -90 || latNum > 90) {
      this.#view.showFieldError('location', 'Latitude harus berada dalam rentang -90 hingga 90');
      return;
    }

    if (lonNum < -180 || lonNum > 180) {
      this.#view.showFieldError('location', 'Longitude harus berada dalam rentang -180 hingga 180');
      return;
    }

    this.#lat = latNum;
    this.#lon = lonNum;
    this.#view.clearFieldError('location');
    this.#view.updateCoordinatesOnMap(latNum, lonNum);
  }

  #handleCurrentLocation() {
    if (!navigator.geolocation) {
      this.#view.showFieldError('location', 'Geolocation tidak didukung oleh browser Anda');
      return;
    }

    const statusEl = document.querySelector('#location-status-text');
    if (statusEl) statusEl.textContent = 'Mendeteksi posisi GPS...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.#lat = latitude;
        this.#lon = longitude;
        this.#view.clearFieldError('location');
        this.#view.updateCoordinatesOnMap(latitude, longitude, true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMsg = 'Gagal mendeteksi lokasi GPS Anda.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Izin akses lokasi (GPS) ditolak oleh pengguna.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Informasi lokasi tidak tersedia.';
        }
        this.#view.showFieldError('location', errorMsg);
        const statusText = document.querySelector('#location-status-text');
        if (statusText) statusText.textContent = 'Gagal mendeteksi GPS (Klik peta secara manual)';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  #handleClearLocation() {
    this.#lat = null;
    this.#lon = null;
    this.#view.clearLocation();
    this.#view.clearFieldError('location');
  }

  #validateInput() {
    let isValid = true;
    this.#view.clearAllFieldErrors();
    this.#view.hideAlert();

    // 1. Photo validation
    if (!this.#photoFile) {
      this.#view.showFieldError('photo', 'Harap pilih foto cerita dari galeri atau ambil dengan kamera langsung.');
      isValid = false;
    }

    // 2. Description validation
    const trimmedDesc = this.#description.trim();
    if (!trimmedDesc) {
      this.#view.showFieldError('description', 'Deskripsi cerita tidak boleh kosong.');
      isValid = false;
    } else if (trimmedDesc.length < 5) {
      this.#view.showFieldError('description', 'Deskripsi cerita terlalu pendek (minimal 5 karakter).');
      isValid = false;
    }

    // 3. Location validation (optional, but must be valid if provided)
    if (this.#lat !== null && this.#lat !== undefined && this.#lat !== '') {
      const latNum = parseFloat(this.#lat);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        this.#view.showFieldError('location', 'Nilai latitude tidak valid (-90 s/d 90).');
        isValid = false;
      }
    }

    if (this.#lon !== null && this.#lon !== undefined && this.#lon !== '') {
      const lonNum = parseFloat(this.#lon);
      if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
        this.#view.showFieldError('location', 'Nilai longitude tidak valid (-180 s/d 180).');
        isValid = false;
      }
    }

    return isValid;
  }

  async #handleSubmit() {
    if (!this.#validateInput()) {
      this.#view.showAlert('Mohon lengkapi data formulir yang diperlukan dengan benar.', 'error');
      return;
    }

    // Ensure camera stream is stopped before upload
    this.#view.stopCamera();
    this.#view.setLoading(true);

    try {
      const token = getAuthToken();
      const payload = {
        description: this.#description.trim(),
        photo: this.#photoFile,
        lat: this.#lat,
        lon: this.#lon,
      };

      const response = await this.#model.addStory(payload, token);

      this.#view.showAlert(
        response.message || 'Cerita Anda berhasil diterbitkan! Mengalihkan ke beranda...',
        'success'
      );

      // Clean up inputs and state
      this.#photoFile = null;
      this.#description = '';
      this.#lat = null;
      this.#lon = null;

      setTimeout(() => {
        location.hash = '#/';
      }, 1500);
    } catch (error) {
      console.error('Error submitting story:', error);
      this.#view.showAlert(
        error.message || 'Gagal menerbitkan cerita. Periksa koneksi internet Anda dan coba lagi.',
        'error'
      );
    } finally {
      this.#view.setLoading(false);
    }
  }

  destroy() {
    this.#view.destroy();
  }
}
