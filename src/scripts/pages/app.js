import routes from '../routes/routes';
import { getActiveRoute, getActivePathname } from '../routes/url-parser';
import { isAuthenticated, getAuthUser, clearAuthSession } from '../utils/auth';
import {
  isPushSupported,
  isNotificationDenied,
  isCurrentPushSubscriptionAvailable,
  subscribePush,
  unsubscribePush,
} from '../utils/notification-helper';
import { showToast } from '../utils/toast';
import { syncInstallButtons } from '../utils/install-prompt';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #skipLink = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#skipLink = document.querySelector('.skip-link');

    this.#setupSkipLink();
    this.#setupDrawer();
  }

  #setupSkipLink() {
    if (!this.#skipLink || !this.#content) return;

    this.#skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.#content.focus();
      this.#content.scrollIntoView({ behavior: 'smooth' });
    });
  }

  #setupDrawer() {
    const closeDrawer = () => {
      this.#navigationDrawer.classList.remove('open');
      this.#drawerButton.setAttribute('aria-expanded', 'false');
    };

    const toggleDrawer = () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    this.#drawerButton.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleDrawer();
    });

    // Close on click outside or clicking on any drawer item
    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        closeDrawer();
      }

      this.#navigationDrawer.querySelectorAll('a, button').forEach((element) => {
        if (element.contains(event.target)) {
          closeDrawer();
        }
      });
    });

    // Close drawer when pressing Escape key (Keyboard accessibility)
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#navigationDrawer.classList.contains('open')) {
        closeDrawer();
        this.#drawerButton.focus();
      }
    });
  }

  #renderNavigation() {
    const isAuth = isAuthenticated();
    const user = getAuthUser();
    const navList = this.#navigationDrawer.querySelector('#nav-list');
    if (!navList) return;

    if (isAuth) {
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/about">About</a></li>
        <li><span class="user-greeting">${user?.name || 'User'}</span></li>
        ${isPushSupported()
          ? `<li>
              <button
                type="button"
                id="push-toggle-button"
                class="nav-push-btn"
                aria-pressed="false"
                aria-label="Aktifkan langganan push notification"
              >
                <span class="push-toggle-indicator" aria-hidden="true"></span>
                <span id="push-toggle-text">Notifikasi</span>
              </button>
            </li>`
          : ''}
        ${this.#renderInstallItem()}
        <li><button type="button" id="logout-button" class="nav-logout-btn" aria-label="Keluar dari akun">Keluar</button></li>
      `;

      this.#setupPushToggle();
      syncInstallButtons();

      const logoutButton = navList.querySelector('#logout-button');
      if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
          try {
            await unsubscribePush();
          } catch (error) {
            console.warn('Gagal melepas langganan push saat keluar:', error);
          }

          clearAuthSession();
          location.hash = '#/login';
        });
      }
    } else {
      navList.innerHTML = `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/about">About</a></li>
        <li><a href="#/register">Daftar</a></li>
        <li><a href="#/login">Masuk</a></li>
        ${this.#renderInstallItem()}
      `;

      syncInstallButtons();
    }
  }

  #renderInstallItem() {
    return `
      <li class="nav-install-item" hidden>
        <button
          type="button"
          class="install-button install-button--nav"
          hidden
          aria-label="Instal Story App ke perangkat Anda"
        >
          Instal Aplikasi
        </button>
      </li>
    `;
  }

  async #setupPushToggle() {
    const button = document.querySelector('#push-toggle-button');
    if (!button) return;

    await this.#renderPushToggleState(button);

    button.addEventListener('click', async () => {
      const isSubscribed = button.getAttribute('aria-pressed') === 'true';

      this.#setPushToggleBusy(button, true);

      const result = isSubscribed ? await unsubscribePush() : await subscribePush();

      showToast(result.message, result.ok ? 'success' : 'error');

      this.#setPushToggleBusy(button, false);
      await this.#renderPushToggleState(button);
    });
  }

  #setPushToggleBusy(button, isBusy) {
    const label = button.querySelector('#push-toggle-text');
    button.disabled = isBusy;
    button.classList.toggle('is-busy', isBusy);
    if (isBusy && label) {
      label.textContent = 'Memproses...';
    }
  }

  async #renderPushToggleState(button) {
    const label = button.querySelector('#push-toggle-text');
    const isSubscribed = await isCurrentPushSubscriptionAvailable();

    button.setAttribute('aria-pressed', isSubscribed ? 'true' : 'false');
    button.classList.toggle('is-subscribed', isSubscribed);

    if (label) {
      label.textContent = isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi';
    }

    if (isNotificationDenied() && !isSubscribed) {
      button.title = 'Izin notifikasi diblokir. Ubah pengaturan situs pada browser Anda.';
    } else {
      button.title = isSubscribed
        ? 'Klik untuk berhenti berlangganan push notification'
        : 'Klik untuk berlangganan push notification';
    }

    button.setAttribute(
      'aria-label',
      isSubscribed
        ? 'Nonaktifkan langganan push notification'
        : 'Aktifkan langganan push notification'
    );
  }

  #updateActiveNavLink() {
    const currentPath = getActivePathname();
    const navLinks = this.#navigationDrawer.querySelectorAll('a');

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const routePath = href ? href.replace('#', '') || '/' : '';

      if (routePath === currentPath) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  #currentPage = null;

  async renderPage() {
    // Cleanup previous page resources (e.g. active camera streams, map instances)
    if (this.#currentPage && typeof this.#currentPage.destroy === 'function') {
      try {
        this.#currentPage.destroy();
      } catch (e) {
        console.warn('Error during page cleanup:', e);
      }
      this.#currentPage = null;
    }

    this.#renderNavigation();

    const url = getActiveRoute();
    const page = routes[url];
    this.#currentPage = page || null;

    const renderContent = async () => {
      if (!page) {
        this.#content.innerHTML = `
          <section class="container not-found-section" aria-labelledby="not-found-title">
            <div class="not-found-card">
              <h1 id="not-found-title">404</h1>
              <h2>Halaman Tidak Ditemukan</h2>
              <p>Maaf, halaman yang Anda tuju tidak dapat ditemukan.</p>
              <a href="#/" class="btn-primary">Kembali ke Beranda</a>
            </div>
          </section>
        `;
        return;
      }

      this.#content.innerHTML = await page.render();
      await page.afterRender();
    };

    // View Transition API support with fallback
    if (document.startViewTransition) {
      const transition = document.startViewTransition(async () => {
        await renderContent();
      });
      await transition.finished;
    } else {
      await renderContent();
    }

    this.#updateActiveNavLink();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export default App;
