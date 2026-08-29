import routes from '../routes/routes';
import { getActiveRoute, getActivePathname } from '../routes/url-parser';
import { isAuthenticated, getAuthUser, clearAuthSession } from '../utils/auth';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a, button').forEach((element) => {
        if (element.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
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
        <li><button type="button" id="logout-button" class="nav-logout-btn">Keluar</button></li>
      `;

      const logoutButton = navList.querySelector('#logout-button');
      if (logoutButton) {
        logoutButton.addEventListener('click', () => {
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
      `;
    }
  }

  #updateActiveNavLink() {
    const currentPath = getActivePathname();
    const navLinks = this.#navigationDrawer.querySelectorAll('a');

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const routePath = href ? href.replace('#', '') || '/' : '';

      if (routePath === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  async renderPage() {
    this.#renderNavigation();

    const url = getActiveRoute();
    const page = routes[url];

    const renderContent = async () => {
      if (!page) {
        this.#content.innerHTML = `
          <section class="container not-found-section">
            <div class="not-found-card">
              <h1>404</h1>
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
