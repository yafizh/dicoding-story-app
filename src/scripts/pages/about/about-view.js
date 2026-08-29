export default class AboutView {
  getTemplate() {
    return `
      <section class="container about-section" aria-labelledby="about-title">
        <article class="about-card">
          <header class="about-header">
            <h1 id="about-title" class="about-title">Tentang Aplikasi</h1>
            <p class="about-tagline">Platform berbagi cerita dan momen inspiratif berkoordinat peta digital</p>
          </header>

          <div class="about-content">
            <section class="about-info-group" aria-labelledby="about-subheading">
              <h2 id="about-subheading">Apa itu Story App?</h2>
              <p>
                Aplikasi ini dibangun menggunakan arsitektur Modern JavaScript Single Page Application (SPA),
                menerapkan pola arsitektur <strong>Model-View-Presenter (MVP)</strong>, routing berbasis <strong>Hash Navigation</strong>,
                integrasi visual peta interaktif <strong>Leaflet Map</strong>, akses kamera langsung,
                serta transisi halaman dinamis menggunakan <strong>View Transition API</strong>.
              </p>
            </section>

            <section class="features-section" aria-label="Fitur Unggulan">
              <h2 class="visually-hidden">Fitur Utama</h2>
              <div class="features-grid">
                <article class="feature-item">
                  <h3>Single Page Application</h3>
                  <p>Navigasi cepat dan responsif tanpa refresh penuh menggunakan Hash Routing.</p>
                </article>

                <article class="feature-item">
                  <h3>Arsitektur MVP</h3>
                  <p>Pemisahan tanggung jawab yang jelas antara Model (data), View (tampilan), dan Presenter (logika).</p>
                </article>

                <article class="feature-item">
                  <h3>Peta & Aksesibilitas</h3>
                  <p>Visualisasi lokasi interaktif dan kepatuhan standar aksesibilitas keyboard dan pembaca layar.</p>
                </article>
              </div>
            </section>
          </div>
        </article>
      </section>
    `;
  }
}

