import { showToast } from './toast';

export function initNetworkStatus() {
  const banner = document.querySelector('#offline-banner');

  const render = () => {
    const isOffline = !navigator.onLine;

    document.body.classList.toggle('is-offline', isOffline);

    if (banner) {
      banner.hidden = !isOffline;
      if (isOffline) {
        banner.removeAttribute('hidden');
      } else {
        banner.setAttribute('hidden', '');
      }
    }
  };

  window.addEventListener('offline', () => {
    render();
    showToast('Koneksi terputus. Story App beralih ke data offline.', 'info');
  });

  window.addEventListener('online', () => {
    render();
    showToast('Koneksi kembali tersambung.', 'success');
  });

  render();
}

export function isOffline() {
  return !navigator.onLine;
}
