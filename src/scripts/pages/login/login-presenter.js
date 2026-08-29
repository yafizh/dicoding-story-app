import { setAuthSession } from '../../utils/auth';

export default class LoginPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async init() {
    this.#view.bindLogin((data) => this.#handleLogin(data));
  }

  #validateInput({ email, password }) {
    let isValid = true;
    this.#view.clearFieldErrors();
    this.#view.hideAlert();

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
    }

    return isValid;
  }

  async #handleLogin({ email, password }) {
    if (!this.#validateInput({ email, password })) {
      return;
    }

    this.#view.setLoading(true);

    try {
      const loginResult = await this.#model.login({ email, password });
      setAuthSession(loginResult);

      this.#view.showAlert('Login berhasil! Mengalihkan ke beranda...', 'success');

      setTimeout(() => {
        location.hash = '#/';
      }, 1000);
    } catch (error) {
      this.#view.showAlert(error.message || 'Login gagal. Periksa kembali email dan password Anda.', 'error');
    } finally {
      this.#view.setLoading(false);
    }
  }
}
