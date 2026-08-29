export default class AboutView {
  getTemplate() {
    return `
      <section class="container about-section">
        <div class="about-card">
          <div class="about-header">
            <h1 class="about-title">Tentang Aplikasi</h1>
            <p class="about-tagline">Platform berbagi cerita dan momen bermakna</p>
          </div>

          <div class="about-content">
            <div class="about-info-group">
              <h2>Apa itu Story App?</h2>
              <p>
                Aplikasi ini dibangun menggunakan arsitektur Modern JavaScript Single Page Application (SPA),
                menerapkan pola arsitektur <strong>Model-View-Presenter (MVP)</strong>, routing berbasis <strong>Hash Navigation</strong>,
                serta transisi halaman dinamis menggunakan <strong>View Transition API</strong>.
              </p>
            </div>

            <div class="features-grid">
              <div class="feature-item">
                <h3>Single Page Application</h3>
                <p>Navigasi cepat dan responsif tanpa refresh penuh menggunakan Hash Routing.</p>
              </div>

              <div class="feature-item">
                <h3>Arsitektur MVP</h3>
                <p>Pemisahan tanggung jawab yang jelas antara Model (data), View (tampilan), dan Presenter (logika).</p>
              </div>

              <div class="feature-item">
                <h3>View Transitions</h3>
                <p>Animasi perpindahan halaman yang mulus dan interaktif dengan CSS custom transition.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
