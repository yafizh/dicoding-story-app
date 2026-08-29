export default class RegisterPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    this.#view.bindRegister((data) => this.#handleRegister(data));
  }

  #validateInput({ name, email, password }) {
    let isValid = true;
    this.#view.clearFieldErrors();
    this.#view.hideAlert();

    if (!name) {
      this.#view.showFieldError('name', 'Nama tidak boleh kosong');
      isValid = false;
    }

    if (!email) {
      this.#view.showFieldError('email', 'Email tidak boleh kosong');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.#view.showFieldError('email', 'Format email tidak valid');
      isValid = false;
    }

    if (!password) {
      this.#view.showFieldError('password', 'Password tidak boleh kosong');
      isValid = false;
    } else if (password.length < 8) {
      this.#view.showFieldError('password', 'Password minimal harus 8 karakter');
      isValid = false;
    }

    return isValid;
  }

  async #handleRegister({ name, email, password }) {
    if (!this.#validateInput({ name, email, password })) {
      return;
    }

    this.#view.setLoading(true);

    try {
      await this.#model.register({ name, email, password });
      this.#view.showAlert('Registrasi berhasil! Mengalihkan ke halaman login...', 'success');

      setTimeout(() => {
        location.hash = '#/login';
      }, 1200);
    } catch (error) {
      this.#view.showAlert(error.message || 'Gagal melakukan pendaftaran. Silakan coba lagi.', 'error');
    } finally {
      this.#view.setLoading(false);
    }
  }
}
