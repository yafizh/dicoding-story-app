export default class LoginView {
  getTemplate() {
    return `
      <section class="container auth-section">
        <div class="auth-card">
          <div class="auth-header">
            <h1 class="auth-title">Masuk ke Akun Anda</h1>
            <p class="auth-subtitle">Selamat datang kembali! Masuk untuk melihat dan berbagi cerita.</p>
          </div>

          <div id="login-alert" class="alert-container" style="display: none;" role="alert"></div>

          <form id="login-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="email" class="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                class="form-input"
                placeholder="nama@email.com"
                required
                autocomplete="email"
              />
              <span class="form-error" id="email-error"></span>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                class="form-input"
                placeholder="Masukkan kata sandi Anda"
                required
                minlength="8"
                autocomplete="current-password"
              />
              <span class="form-error" id="password-error"></span>
            </div>

            <button type="submit" id="submit-btn" class="btn-primary btn-block">
              <span class="btn-text">Masuk</span>
              <span class="btn-spinner" style="display: none;"></span>
            </button>
          </form>

          <div class="auth-footer">
            <p>Belum punya akun? <a href="#/register" class="auth-link">Daftar sekarang</a></p>
          </div>
        </div>
      </section>
    `;
  }

  getFormElement() {
    return document.querySelector('#login-form');
  }

  getEmailInput() {
    return document.querySelector('#email');
  }

  getPasswordInput() {
    return document.querySelector('#password');
  }

  getSubmitButton() {
    return document.querySelector('#submit-btn');
  }

  getAlertElement() {
    return document.querySelector('#login-alert');
  }

  bindLogin(handler) {
    const form = this.getFormElement();
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const email = this.getEmailInput().value.trim();
      const password = this.getPasswordInput().value;

      handler({ email, password });
    });
  }

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

  clearFieldErrors() {
    ['email', 'password'].forEach((field) => {
      this.showFieldError(field, '');
    });
  }

  showAlert(message, type = 'error') {
    const alertEl = this.getAlertElement();
    if (!alertEl) return;

    alertEl.style.display = 'block';
    alertEl.className = `alert-container alert-${type}`;
    alertEl.textContent = message;
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
    if (btnText) btnText.textContent = isLoading ? 'Memproses...' : 'Masuk';
    if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
  }
}
