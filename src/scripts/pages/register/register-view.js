export default class RegisterView {
  getTemplate() {
    return `
      <section class="container auth-section" aria-labelledby="register-title">
        <div class="auth-card">
          <header class="auth-header">
            <h1 id="register-title" class="auth-title">Daftar Akun Baru</h1>
            <p class="auth-subtitle">Bergabunglah dan bagikan kisah inspiratif Anda.</p>
          </header>

          <div id="register-alert" class="alert-container" style="display: none;" role="alert" aria-live="assertive"></div>

          <form id="register-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="name" class="form-label">Nama Lengkap</label>
              <input
                type="text"
                id="name"
                name="name"
                class="form-input"
                placeholder="Masukkan nama lengkap Anda"
                required
                aria-required="true"
                autocomplete="name"
                aria-describedby="name-error"
              />
              <span class="form-error" id="name-error" role="alert"></span>
            </div>

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
                placeholder="Minimal 8 karakter"
                required
                aria-required="true"
                minlength="8"
                autocomplete="new-password"
                aria-describedby="password-error"
              />
              <span class="form-error" id="password-error" role="alert"></span>
            </div>

            <button type="submit" id="submit-btn" class="btn-primary btn-block" aria-label="Daftar akun baru">
              <span class="btn-text">Daftar Sekarang</span>
              <span class="btn-spinner" style="display: none;" aria-hidden="true"></span>
            </button>
          </form>

          <footer class="auth-footer">
            <p>Sudah punya akun? <a href="#/login" class="auth-link">Masuk di sini</a></p>
          </footer>
        </div>
      </section>
    `;
  }

  getFormElement() {
    return document.querySelector('#register-form');
  }

  getNameInput() {
    return document.querySelector('#name');
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
    return document.querySelector('#register-alert');
  }

  bindRegister(handler) {
    const form = this.getFormElement();
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = this.getNameInput().value.trim();
      const email = this.getEmailInput().value.trim();
      const password = this.getPasswordInput().value;

      handler({ name, email, password });
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
    ['name', 'email', 'password'].forEach((field) => {
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
    if (btnText) btnText.textContent = isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang';
    if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
  }
}
