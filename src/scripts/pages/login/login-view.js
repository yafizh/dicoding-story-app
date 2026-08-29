export default class LoginView {
  getTemplate() {
    return `
      <section class="container auth-section" aria-labelledby="login-title">
        <div class="auth-card">
          <header class="auth-header">
            <h1 id="login-title" class="auth-title">Masuk ke Akun Anda</h1>
            <p class="auth-subtitle">Selamat datang kembali! Masuk untuk melihat dan berbagi cerita.</p>
          </header>

          <div id="login-alert" class="alert-container" style="display: none;" role="alert" aria-live="assertive"></div>

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
                aria-required="true"
                autocomplete="email"
                aria-describedby="email-error"
              />
              <span class="form-error" id="email-error" role="alert"></span>
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
                aria-required="true"
                minlength="8"
                autocomplete="current-password"
                aria-describedby="password-error"
              />
              <span class="form-error" id="password-error" role="alert"></span>
            </div>

            <button type="submit" id="submit-btn" class="btn-primary btn-block" aria-label="Masuk ke akun">
              <span class="btn-text">Masuk</span>
              <span class="btn-spinner" style="display: none;" aria-hidden="true"></span>
            </button>
          </form>

          <footer class="auth-footer">
            <p>Belum punya akun? <a href="#/register" class="auth-link">Daftar sekarang</a></p>
          </footer>
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
